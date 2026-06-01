import json
import re
from datetime import datetime
from typing import List, Dict, Any, TypedDict
from sqlalchemy.orm import Session
from fastapi import HTTPException
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.models.portfolio_review import PortfolioReview
from app.models.user_profile import UserProfile
from app.models.watchlist_item import WatchlistItem
from app.models.holding import Holding
from app.models.user import User
from app.models.transaction import Transaction
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.services.holdings_service import holdings_service
from app.services.market_data_service import market_data_service
from app.services.news_service import news_service
from app.analytics.risk_score import calculate_portfolio_health
from app.analytics.exposure import get_market_cap_bucket

# LangGraph State definition
class ReviewState(TypedDict):
    db: Session
    user_id: int
    profile: Dict[str, Any]
    holdings: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    news: List[Dict[str, Any]]
    condensed_signals: str
    watchlist: List[Dict[str, Any]]
    draft_insights: Dict[str, Any]
    final_report: Dict[str, Any]

class InsightsEngine:
    def __init__(self):
        self.flash_lite_model = None
        self.flash_model = None
        self.pro_model = None
        self._init_models()

    def _init_models(self):
        """
        Initialize Google Vertex AI Chat models using the updated langchain-google-genai library, 
        explicitly configured to target the Vertex engine parameters.
        Low level tasks map to gemini-2.5-flash. High level strategist reasoning maps to gemini-3.5-flash.
        """
        try:
            from langchain_google_vertexai import ChatVertexAI
            
            # Flash tier for classifications and low-level parsing
            self.flash_lite_model = ChatVertexAI(
                model_name="gemini-2.5-flash-lite",
                project=settings.VERTEX_PROJECT_ID,
                location=settings.VERTEX_LOCATION,
                temperature=0.2,
                max_output_tokens=4096
            )
            self.flash_model = ChatVertexAI(
                model_name="gemini-2.5-flash",
                project=settings.VERTEX_PROJECT_ID,
                location=settings.VERTEX_LOCATION,
                temperature=0.2,
                max_output_tokens=4096
            )
            
            # High level strategist reasoning using 3.5 Flash as requested
            self.pro_model = ChatVertexAI(
                model_name="gemini-2.5-pro",
                project=settings.VERTEX_PROJECT_ID,
                location=settings.VERTEX_LOCATION,
                temperature=0.1,
                max_output_tokens=4096
            )
            print("Successfully initialized Vertex AI")
            print(f"Initializing with project={settings.VERTEX_PROJECT_ID}, location={settings.VERTEX_LOCATION}")
        except Exception as e:
            raise RuntimeError(
                f"Vertex AI model initialization failed: {e}"
            ) from e
    
    def _extract_text(self, result) -> str:
        """
        Safely extract text from model responses regardless of model tier.
        """
        try:
            content = getattr(result, "content", result)
            if isinstance(content, list):
                return "".join(
                    block.get("text", "")
                    for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                ).strip()
            if isinstance(content, dict):
                return content.get("text", str(content)).strip()
            return str(content).strip()
        except Exception:
            return ""

    def _clean_and_parse_json(self, raw_text: str) -> Any:
        """
        Safely clean and deserialize JSON content from the raw text, 
        stripping markdown code blocks (```json ... ```) if present.
        """
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\n|```$", "", cleaned, flags=re.MULTILINE).strip()
        return json.loads(cleaned)


    # LangGraph Node 1: Gather Portfolio and Context Data
    def gather_data(self, state: ReviewState) -> Dict[str, Any]:
        db = state["db"]
        user_id = state["user_id"]
        
        # 1. Fetch User Profile
        profile_obj = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        profile_data = {
            "risk_appetite": profile_obj.risk_appetite if profile_obj else "MODERATE",
            "time_horizon": profile_obj.time_horizon if profile_obj else "MEDIUM_TERM",
            "investment_goal": profile_obj.investment_goal if profile_obj else "WEALTH_ACCUMULATION",
            "preferred_sectors": profile_obj.preferred_sectors if (profile_obj and profile_obj.preferred_sectors) else [],
            "avoid_sectors": profile_obj.avoid_sectors if (profile_obj and profile_obj.avoid_sectors) else []
        }
        
        # 2. Fetch Holdings & Metrics
        holdings_res = holdings_service.calculate_holdings(db, user_id)
        holdings_data = []
        for h in holdings_res.holdings:
            sector = market_data_service.get_sector(h.symbol)
            mkt_cap = market_data_service.get_market_cap(h.symbol)
            cap_bucket = get_market_cap_bucket(h.symbol, mkt_cap)
            
            holdings_data.append({
                "symbol": h.symbol,
                "company_name": h.company_name,
                "quantity": h.quantity,
                "market_value": round(h.market_value, 2) if h.market_value else 0.0,
                "allocation_percent": round(h.allocation_percent, 2) if h.allocation_percent else 0.0,
                "sector": sector,
                "market_cap_bucket": cap_bucket
            })
            
        health_data = calculate_portfolio_health(db, user_id)
        metrics_data = {
            "total_value": round(holdings_res.summary.total_value, 2) if holdings_res.summary.total_value else 0.0,
            "total_cost": round(holdings_res.summary.total_cost, 2) if holdings_res.summary.total_cost else 0.0,
            "risk_score": round(health_data.get("risk_score", 5.0), 2),
            "diversification_score": round(health_data.get("diversification_score", 50.0), 2),
            "warnings": health_data.get("warnings", [])
        }
        
        # 3. Fetch Watchlist
        watchlist_obj = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).all()
        watchlist_data = []
        for w in watchlist_obj:
            sector = market_data_service.get_sector(w.symbol)
            mkt_cap = market_data_service.get_market_cap(w.symbol)
            cap_bucket = get_market_cap_bucket(w.symbol, mkt_cap)
            watchlist_data.append({
                "symbol": w.symbol,
                "company_name": w.company_name or w.symbol,
                "watch_reason": w.watch_reason,
                "sector": sector,
                "market_cap_bucket": cap_bucket
            })
            
        # 4. Fetch News Context
        symbols_map = {h["symbol"]: h["company_name"] for h in holdings_data}
        for w in watchlist_data:
            symbols_map[w["symbol"]] = w["company_name"]
            
        bulk_news = news_service.fetch_news_bulk(symbols_map)
        news_data = []
        for symbol, articles in bulk_news.items():
            for art in articles:
                news_data.append({
                    "symbol": symbol,
                    "title": art["title"],
                    "link": art["link"],
                    "source": art["source"],
                    "published_at": art["published_at"]
                })
                
        condensed_signals = self.news_filter({
            "news": news_data
        })

        return {
            "profile": profile_data,
            "holdings": holdings_data,
            "metrics": metrics_data,
            "watchlist": watchlist_data,
            "news": news_data,
            "condensed_signals": condensed_signals,
        }
    def news_filter(self, state: ReviewState) -> str:
        news = state["news"]
        
        recent_news = sorted(news, key=lambda x: x["published_at"] or "", reverse=True)[:6]
        
        # Upstream news pre-filtering using the cheaper flash_model
        condensed_signals = ""
        if recent_news:
            flash_lite_prompt = f"""
            You are NiveshIQ's AI Market Intelligence Parser. Convert this raw news feed into a highly compact, numbered list of market/macro signals.
            For each article, output EXACTLY one line. Keep it short. Include the ticker/symbol or company name.
            
            Example format:
            [1] Ticker: HDFCBANK.NS - Governance questions raised, stock fell 3% today.
            [2] Ticker: RELIANCE.NS - Trading ex-dividend this week with high expectations.
            
            RAW NEWS ARTICLES:
            {json.dumps(recent_news, indent=2)}
            
            Return ONLY the numbered list. No extra explanations, headers, or markdown formatting.
            """
            try:
                flash_lite_result = self.flash_lite_model.invoke(flash_lite_prompt)
                print("FLASH LITE TOKEN USAGE:", getattr(flash_lite_result, "response_metadata", {}).get("usage_metadata"))
                condensed_signals = self._extract_text(flash_lite_result)
                print("--- FLASH CONDENSED NEWS ---")
                print(condensed_signals)
                print("----------------------------")
                return condensed_signals
            except Exception as e:
                print(f"Flash model news pre-filtering failed: {e}")
                # Fallback to serializing raw news (with links stripped to save tokens)
                condensed_signals = "\n".join(
                    f"[{i+1}] Ticker: {art['symbol']} - {art['title']} (Source: {art['source']})"
                    for i, art in enumerate(recent_news)
                )
        else:
            condensed_signals = "No recent news signals or macro indicators available."
        return condensed_signals

    def generate_insights(self, state: ReviewState) -> Dict[str, Any]:
        profile = state["profile"]
        holdings = state["holdings"]
        metrics = state["metrics"]
        watchlist = state["watchlist"]
        condensed_signals = state["condensed_signals"]
        
        prompt = f"""
        You are NiveshIQ, a premium AI Portfolio Strategist. Review this user's investment portfolio and watchlist to draft a comprehensive report.
        
        USER PROFILE:
        - Risk Appetite: {profile["risk_appetite"]}
        - Time Horizon: {profile["time_horizon"]}
        - Investment Goal: {profile["investment_goal"]}
        - Preferred Sectors: {profile["preferred_sectors"]}
        - Avoided Sectors: {profile["avoid_sectors"]}
        - Portfolio Value: {metrics["total_value"]}
        
        ACTIVE ASSETS:
        {json.dumps(holdings, indent=2)}
        
        WATCHLIST CANDIDATES:
        {json.dumps(watchlist, indent=2)}
        
        RECENT SIGNALS & NEWS:
        {condensed_signals}
        
        Write a structural, explainable review in strict JSON format. 
        You MUST provide:
        - "risk_summary": A detailed analysis of their major risk parameters (like high single-asset concentration or tech overexposure).
        - "diversification_summary": A review of their sector diversity.
        - "rebalancing_ideas": Specific advice to buy/sell sectors or restructure. Fields: "sector", "action" (ADD/TRIM), "explanation", "target_change_percent".
        - "potential_stock_picks": Suggested stock picks based on the market situation and user profile. Fields: "symbol", "company_name", "compatibility" (EXCELLENT/GOOD/NEUTRAL/AVOID), "reasoning", "score" (out of 10).
        - "warnings": A list of warning objects with fields "symbol", "warning_level" (YELLOW for medium warning / RED for strong warning), and "message".
        - "market_impact": Analysis of potential impact on the portfolio based on current market trends and news sentiment (e.g., "Your portfolio could reach -5% returns in next few weeks if global tension remains same" or "your portfolio could give stable returns in long run but zero returns over the year").
        
        IMPORTANT: In the texts, insert citation numbers [1], [2], etc., corresponding to the indices of the signals/news items they refer to.
        
        Format output strictly as raw JSON matching this structure without any markdown blocks:
        {{
          "risk_summary": "Detailed risk summary text.",
          "diversification_summary": "Detailed sector diversification text.",
          "rebalancing_ideas": [
            {{
              "sector": "Sector Name",
              "action": "ADD/TRIM",
              "explanation": "Explanation text.",
              "target_change_percent": -5
            }}
          ],
          "potential_stock_picks": [
            {{
              "symbol": "TCS",
              "company_name": "Tata Consultancy Services",
              "compatibility": "EXCELLENT",
              "reasoning": "Reasoning text.",
              "score": 9
            }}
          ],
          "warnings": [
            {{
              "symbol": "Ticker/PORTFOLIO",
              "warning_level": "RED/YELLOW",
              "message": "Warning text."
            }}
          ],
          "market_impact": "Detailed market impact text."
        }}
        """
        
        try:
            result = self.flash_lite_model.invoke(prompt)
            print("FLASH LITE MODEL TOKEN USAGE:", getattr(result, "response_metadata", {}).get("usage_metadata"))
            raw_text = self._extract_text(result)
            data = self._clean_and_parse_json(raw_text)
            return {"draft_insights": data}
        except Exception as e:
            print(f"Vertex AI strategic generation failed: {e}")
            raise Exception("We are facing some difficulties please try again later") from e


    # LangGraph Node 3: Safety Guardrail Node
    def safety_guardrail(self, state: ReviewState) -> Dict[str, Any]:
        draft = state["draft_insights"]
        
        def soften_text(text: str) -> str:
            if not text:
                return ""
            t = text
            t = re.sub(r"\bbuy\b", "consider accumulating", t, flags=re.IGNORECASE)
            t = re.sub(r"\bsell\b", "consider trimming/rebalancing", t, flags=re.IGNORECASE)
            t = re.sub(r"\bmust invest\b", "could review allocations for", t, flags=re.IGNORECASE)
            return t
            
        draft["risk_summary"] = soften_text(draft.get("risk_summary", ""))
        draft["diversification_summary"] = soften_text(draft.get("diversification_summary", ""))
        draft["market_impact"] = soften_text(draft.get("market_impact", ""))
        
        for w in draft.get("warnings", []):
            w["message"] = soften_text(w.get("message", ""))
            
        for r in draft.get("rebalancing_ideas", []):
            r["explanation"] = soften_text(r.get("explanation", ""))
            
        for p in draft.get("potential_stock_picks", []):
            p["reasoning"] = soften_text(p.get("reasoning", ""))
            
        draft["disclaimers"] = "Educational analysis only: Not SEBI-registered financial advice. All investments carry risk."
        
        return {"draft_insights": draft}

    # LangGraph Node 4: Save & Assemble Report
    def assemble_report(self, state: ReviewState) -> Dict[str, Any]:
        db = state["db"]
        user_id = state["user_id"]
        draft = state["draft_insights"]
        metrics = state["metrics"]
        holdings = state["holdings"]
        news = state["news"]
        
        evidence = {
            "holdings": holdings,
            "references": sorted(news, key=lambda x: x["published_at"], reverse=True)[:6]
        }
        
        db.query(PortfolioReview).filter(PortfolioReview.user_id == user_id).delete()
        
        db_review = PortfolioReview(
            user_id=user_id,
            risk_summary=draft.get("risk_summary", "Review under compile."),
            diversification_summary=draft.get("diversification_summary", "Review under compile."),
            rebalancing_ideas=draft.get("rebalancing_ideas", []),
            potential_stock_picks=draft.get("potential_stock_picks", []),
            warnings=draft.get("warnings", []),
            market_impact=draft.get("market_impact", "Market impact analysis pending."),
            evidence=evidence,
            disclaimers=draft.get("disclaimers", "")
        )
        
        db.add(db_review)
        db.commit()
        db.refresh(db_review)
        
        try:
            if db_review.created_at.tzinfo is not None:
                created_at_str = db_review.created_at.isoformat()
            else:
                created_at_str = db_review.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"
        except Exception:
            created_at_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

        report = {
            "id": db_review.id,
            "user_id": db_review.user_id,
            "created_at": created_at_str,
            "risk_summary": db_review.risk_summary,
            "diversification_summary": db_review.diversification_summary,
            "rebalancing_ideas": db_review.rebalancing_ideas,
            "potential_stock_picks": db_review.potential_stock_picks,
            "warnings": db_review.warnings,
            "market_impact": db_review.market_impact,
            "evidence": db_review.evidence,
            "disclaimers": db_review.disclaimers
        }
        return {"final_report": report}

    def generate_review(self, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Orchestrate the portfolio review generation using a modern LangGraph workflow.
        """
        workflow = StateGraph(ReviewState)
        
        workflow.add_node("gather_data", self.gather_data)
        workflow.add_node("generate_insights", self.generate_insights)
        workflow.add_node("safety_guardrail", self.safety_guardrail)
        workflow.add_node("assemble_report", self.assemble_report)
        
        workflow.add_edge(START, "gather_data")
        workflow.add_edge("gather_data", "generate_insights")
        workflow.add_edge("generate_insights", "safety_guardrail")
        workflow.add_edge("safety_guardrail", "assemble_report")
        workflow.add_edge("assemble_report", END)
        
        graph = workflow.compile()
        
        initial_state = {
            "db": db,
            "user_id": user_id,
            "profile": {},
            "holdings": [],
            "metrics": {},
            "news": [],
            "watchlist": [],
            "draft_insights": {},
            "final_report": {}
        }
        
        result = graph.invoke(initial_state)
        return result["final_report"]

    def generate_watchlist_recommendations(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """
        Analyze watchlist assets based on geocoded news sentiment, history, and profile.
        Uses gemini-3.5-flash for high level strategist suggestions.
        """
        # Fetch risk profile
        profile_obj = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        profile_data = {
            "risk_appetite": profile_obj.risk_appetite if profile_obj else "MODERATE",
            "time_horizon": profile_obj.time_horizon if profile_obj else "MEDIUM_TERM",
            "investment_goal": profile_obj.investment_goal if profile_obj else "WEALTH_ACCUMULATION"
        }
        
        # Fetch watchlist items
        watchlist_obj = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).all()
        if not watchlist_obj:
            return []
            
        holdings_res = holdings_service.calculate_holdings(db, user_id)
        sector_alloc = {}
        for h in holdings_res.holdings:
            sec = market_data_service.get_sector(h.symbol)
            sector_alloc[sec] = sector_alloc.get(sec, 0.0) + h.allocation_percent
            
        watchlist_data = []
        for w in watchlist_obj:
            price = market_data_service.get_price(w.symbol)
            sector = market_data_service.get_sector(w.symbol)
            mkt_cap = market_data_service.get_market_cap(w.symbol)
            cap_bucket = get_market_cap_bucket(w.symbol, mkt_cap)
            
            watchlist_data.append({
                "symbol": w.symbol,
                "company_name": w.company_name or w.symbol,
                "current_price": price,
                "sector": sector,
                "market_cap_bucket": cap_bucket,
                "watch_reason": w.watch_reason
            })
            
        symbols_map = {w["symbol"]: w["company_name"] for w in watchlist_data}
        bulk_news = news_service.fetch_news_bulk(symbols_map)
        
        news_list = []
        for symbol, articles in bulk_news.items():
            for art in articles[:3]:
                news_list.append({
                    "symbol": symbol,
                    "title": art["title"],
                    "source": art["source"],
                    "published_at": art.get("published_at")
                })
        
        condensed_signals = self.news_filter({
            "news": news_list
        })
                
            
        prompt = f"""
        You are NiveshIQ, a premium AI Portfolio Strategist specializing in Indian equities, ETFs, and long-term portfolio construction.

        Analyze the user's risk profile, current sector allocations, watchlist assets, and recent news signals to determine how suitable each watchlist asset is for the user.

        USER PROFILE:
        {json.dumps(profile_data, indent=2)}

        PORTFOLIO SECTOR ALLOCATIONS:
        {json.dumps(sector_alloc, indent=2)}

        WATCHLIST CANDIDATES:
        {json.dumps(watchlist_data, indent=2)}

        NEWS SIGNALS:
        {json.dumps(condensed_signals, indent=2)}

        TASK:

        For EACH watchlist asset:

        1. Evaluate recent performance trends (if available).
        2. Analyze market sentiment using the supplied news signals.
        3. Consider macroeconomic and sector-specific factors.
        4. Check whether adding the asset would improve or worsen portfolio diversification.
        5. Evaluate compatibility with the user's:

        * Risk tolerance
        * Investment horizon
        * Existing sector exposures
        * Portfolio concentration

        Generate a detailed recommendation of 40-50 words.

        The recommendation must:

        * Explain WHY the asset is attractive or unattractive.
        * Mention relevant news signals using citations [1], [2], etc. corresponding to NEWS SIGNALS indices.
        * Explain diversification impact.
        * Explain risk considerations.
        * End with a clear portfolio action view.

        Compatibility labels:

        * EXCELLENT = Strong fit for profile and diversification needs.
        * GOOD = Positive fit with manageable risks.
        * NEUTRAL = Mixed outlook or limited portfolio benefit.
        * AVOID = Poor fit, excessive risk, or negative outlook.

        Example recommendation:

        "GOLDBEES has declined 8.17% over the last three months amid a stronger US dollar and changing import duty expectations [2]. However, ongoing geopolitical uncertainty and inflation concerns continue to support demand for gold as a defensive asset [1]. For this investor, GOLDBEES can improve portfolio diversification because the current allocation is heavily tilted toward equities. While short-term returns may remain volatile, gold can provide downside protection during periods of market stress. Recommendation: Maintain a moderate allocation as a portfolio hedge."

        Return ONLY valid JSON.

        Schema:

        [
        {{
        "symbol": "TCS",
        "recommendation": "Detailed recommendation text with citations.",
        "compatibility": "EXCELLENT"
        }}
        ]

        Do not return markdown.
        Do not return explanations outside JSON.
        Do not return additional fields.
        """

        
        try:
            result = self.flash_lite_model.invoke(prompt)
            print("FLASH LITE MODEL TOKEN USAGE:", getattr(result, "response_metadata", {}).get("usage_metadata"))
            raw_text = self._extract_text(result)
            data = self._clean_and_parse_json(raw_text)
            
            # Soften recommendations for SEBI compliance
            for item in data:
                t = item.get("recommendation", "")
                t = re.sub(r"\bbuy\b", "consider accumulating", t, flags=re.IGNORECASE)
                t = re.sub(r"\bsell\b", "consider trimming/rebalancing", t, flags=re.IGNORECASE)
                item["recommendation"] = t
                
            return data
        except Exception as e:
            print(f"Vertex AI watchlist recommendations failed: {e}")
            raise HTTPException(
                status_code=500,
                detail="We are facing some difficulties please try again later"
            )

    def _plan_context(self, query: str, portfolio_stub: Dict[str, Any]) -> Dict[str, Any]:
        """
        Uses a cheap Gemini 2.5 flash_lite model to decide what context
        is needed for this query and how much to include.
        """
        planner_prompt = f"""
        You are NiveshIQ's Finance Context Planner.

        Your job is to decide what dynamic context the system should fetch BEFORE answering the user's question.

        You must analyze the USER QUESTION and the PORTFOLIO_STUB and output a JSON plan describing:
        - primary_topic: one of ["PORTFOLIO", "STOCK", "WATCHLIST", "MARKET_SENTIMENT", "MACRO_ECONOMY", "POLICY_SEBI_RBI", "TRADING_CONCEPT", "GENERAL_FINANCE"]
        - needs_portfolio_context: boolean
        - needs_market_snapshot: boolean
        - needs_macro_snapshot: boolean
        - needs_policy_docs: boolean
        - needs_news: boolean
        - relevant_symbols: list of tickers (if question is about specific stocks; else empty)
        - max_holdings: integer (how many top holdings to include if portfolio is needed)
        - max_news_per_symbol: integer (0-3 for news density)

        USER QUESTION:
        \"\"\"{query}\"\"\"


        PORTFOLIO_STUB:
        {json.dumps(portfolio_stub, indent=2)}

        Rules:
        - If the user mentions "my portfolio", "my holdings", "my allocation", etc., needs_portfolio_context is almost always true.
        - If the user mentions "current market", "market scenario", "market sentiment", today's or recent dates, set needs_market_snapshot true.
        - If the user mentions inflation, repo rate, RBI, interest rates, GDP, macro, set needs_macro_snapshot true.
        - If the user asks about SEBI, RBI circulars, regulations, rules, set needs_policy_docs true.
        - If the user mentions specific stock symbols or company names, include them in relevant_symbols.
        - Keep max_holdings small (3-8) to preserve tokens.
        - Return ONLY valid JSON. No markdown, no commentary.

        Output JSON schema example:
        {{
        "primary_topic": "MARKET_SENTIMENT",
        "needs_portfolio_context": true,
        "needs_market_snapshot": true,
        "needs_macro_snapshot": false,
        "needs_policy_docs": false,
        "needs_news": true,
        "relevant_symbols": ["RELIANCE", "HDFCBANK"],
        "max_holdings": 5,
        "max_news_per_symbol": 2
        }}
        """

        result = self.flash_lite_model.invoke(planner_prompt)
        raw = self._extract_text(result)
        plan = self._clean_and_parse_json(raw)
        return plan

    def ask_copilot(self, db: Session, user_id: int, query: str) -> Dict[str, Any]:
        # 0. Build a cheap portfolio stub for the planner
        holdings_res = holdings_service.calculate_holdings(db, user_id)
        health_data = calculate_portfolio_health(db, user_id)

        top_holdings_stub = []
        for h in sorted(holdings_res.holdings, key=lambda x: x.allocation_percent, reverse=True)[:5]:
            top_holdings_stub.append(
                {
                    "symbol": h.symbol,
                    "allocation_percent": round(h.allocation_percent, 2),
                }
            )

        portfolio_stub = {
            "total_value": round(holdings_res.summary.total_value, 2),
            "risk_score": round(health_data.get("risk_score", 5.0), 2),
            "top_holdings": top_holdings_stub,
        }

        # 1. Let 2.5-flash plan context
        try:
            plan = self._plan_context(query, portfolio_stub)
        except Exception as e:
            print(f"Context planner failed: {e}")
            # Safe default plan
            plan = {
                "primary_topic": "GENERAL_FINANCE",
                "needs_portfolio_context": True,
                "needs_market_snapshot": False,
                "needs_macro_snapshot": False,
                "needs_policy_docs": False,
                "needs_news": False,
                "relevant_symbols": [],
                "max_holdings": 5,
                "max_news_per_symbol": 1,
            }

        # 2. Assemble context based on plan
        context: Dict[str, Any] = {"plan": plan}

        # Profile (cheap, always ok to include)
        profile_obj = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        profile_data = {
            "risk_appetite": profile_obj.risk_appetite if profile_obj else "MODERATE",
            "time_horizon": profile_obj.time_horizon if profile_obj else "MEDIUM_TERM",
            "investment_goal": profile_obj.investment_goal if profile_obj else "WEALTH_ACCUMULATION",
        }
        context["profile"] = profile_data

        # Portfolio context
        if plan.get("needs_portfolio_context"):
            max_holdings = max(1, int(plan.get("max_holdings", 5)))
            holdings_data: List[Dict[str, Any]] = []
            sorted_holdings = sorted(
                holdings_res.holdings,
                key=lambda x: x.allocation_percent,
                reverse=True,
            )
            for h in sorted_holdings[:max_holdings]:
                sector = market_data_service.get_sector(h.symbol)
                holdings_data.append(
                    {
                        "symbol": h.symbol,
                        "company_name": h.company_name,
                        "allocation_percent": round(h.allocation_percent, 2),
                        "market_value": round(h.market_value, 2),
                        "sector": sector,
                    }
                )

            metrics_data = {
                "total_value": round(holdings_res.summary.total_value, 2),
                "risk_score": portfolio_stub["risk_score"],
                "diversification_score": round(
                    health_data.get("diversification_score", 50.0), 2
                ),
                "warnings": health_data.get("warnings", []),
            }
            context["holdings"] = holdings_data
            context["metrics"] = metrics_data

        # Market snapshot (you can wire this to your data sources later)
        if plan.get("needs_market_snapshot"):
            # TODO: implement real snapshot: indices, sectors, etc.
            context["market_snapshot"] = {
                "note": "Placeholder snapshot. Wire to live NIFTY/SENSEX/sector data.",
            }

        # Macro snapshot
        if plan.get("needs_macro_snapshot"):
            context["macro_snapshot"] = {
                "note": "Placeholder macro snapshot. Inject RBI repo, CPI, GDP trends, etc.",
            }

        # Policy docs
        if plan.get("needs_policy_docs"):
            context["policy_notes"] = {
                "note": "Placeholder policy notes. Connect SEBI/RBI circular retrieval here.",
            }

        # News
        news_signals = ""
        if plan.get("needs_news"):
            # Choose symbols: from plan, or fallback to top holdings
            symbols = plan.get("relevant_symbols") or [h["symbol"] for h in top_holdings_stub]
            symbols_map = {s: s for s in symbols}
            bulk_news = news_service.fetch_news_bulk(symbols_map)

            max_news_per_symbol = max(0, int(plan.get("max_news_per_symbol", 2)))
            news_list = []
            for symbol, articles in bulk_news.items():
                for art in articles[:max_news_per_symbol]:
                    news_list.append(
                        {
                            "symbol": symbol,
                            "title": art["title"],
                            "source": art["source"],
                        }
                    )
            if news_list:
                news_signals = self.news_filter({"news": news_list})

        # 3. Final strategist call (2.5-flash / 3.1-pro)
        prompt = f"""
        You are NiveshIQ, a premium AI Finance Copilot and expert financial intelligence assistant
        specializing in Indian equities, ETFs, mutual funds, and long-term portfolios.

        You are an educational tool, NOT a SEBI-registered investment adviser.
        Use soft, risk-aware language: avoid absolute commands like "buy", "sell", "sure-shot", "guaranteed".
        Prefer phrases like "consider accumulating", "could review allocations", "may be suitable", "might not align with your risk profile".

        USER QUESTION:
        \"\"\"{query}\"\"\"

        CONTEXT PLAN:
        {json.dumps(plan, indent=2)}

        DYNAMIC CONTEXT:
        {json.dumps(context, indent=2)}

        NEWS / MARKET SENTIMENT SIGNALS:
        {news_signals if news_signals else "None"}

        TASK:
        Answer the user's question using the context and plan.

        You MUST provide this JSON (no markdown):

        {{
        "answer": "Grounded answer text.",
        "evidence": ["Evidence point 1", "Evidence point 2"],
        "caveat": "Safety caveat text.",
        "next_steps": ["Suggested step 1", "Suggested step 2"]
        }}

        Guidelines:
        - If the question combines market scenario AND portfolio impact, answer both parts explicitly:
        1) Current / recent market scenario (based on CONTEXT and NEWS)
        2) How such a scenario typically affects a portfolio like this one (based on profile + holdings + metrics)
        3) Key risks and uncertainty.
        - If some context is missing (e.g., no live market data), clearly state that and fall back to general patterns.
        - Never return an empty or purely generic response.
        """

        try:
            result = self.flash_model.invoke(prompt)
            raw_text = self._extract_text(result)
            data = self._clean_and_parse_json(raw_text)

            def soften_text(text: str) -> str:
                if not text:
                    return ""
                t = text
                t = re.sub(r"\bbuy\b", "consider accumulating", t, flags=re.IGNORECASE)
                t = re.sub(r"\bsell\b", "consider trimming/rebalancing", t, flags=re.IGNORECASE)
                t = re.sub(
                    r"\bmust invest\b",
                    "could review allocations for",
                    t,
                    flags=re.IGNORECASE,
                )
                t = re.sub(r"\bguaranteed\b", "not guaranteed", t, flags=re.IGNORECASE)
                return t

            data["answer"] = soften_text(data.get("answer", ""))
            steps = data.get("next_steps", [])
            data["next_steps"] = [soften_text(step) for step in steps]

            if not data.get("caveat"):
                data["caveat"] = (
                    "This response is for educational purposes only and does not constitute "
                    "personalized investment advice. Please consult a SEBI-registered "
                    "investment adviser before making decisions."
                )

            return data

        except Exception as e:
            print(f"Copilot strategist call failed: {e}")
            raise Exception("We are facing some difficulties please try again later") from e

insights_engine = InsightsEngine()