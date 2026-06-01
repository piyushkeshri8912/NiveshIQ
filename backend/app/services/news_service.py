import feedparser
import threading
import urllib.parse
from datetime import datetime, timedelta
import re
import html
from typing import List, Dict, Any

class NewsService:
    def __init__(self):
        self._news_cache = {}  # symbol -> {"items": List[dict], "timestamp": datetime}
        self._lock = threading.Lock()

    def clean_company_name(self, name: str, symbol: str) -> str:
        """
        Cleans corporate suffixes from company names to construct broader,
        more relevant search queries.
        """
        if not name or name.upper() == symbol.upper():
            return symbol.split(".")[0]

        # Convert HTML entities if present
        clean = html.unescape(name)
        
        # Remove standard legal/corporate designations (case-insensitive)
        suffixes = [
            r"\bLTD\b\.?", r"\bLIMITED\b", r"\bCORP\b\.?", r"\bCORPORATION\b",
            r"\bINC\b\.?", r"\bINCORPORATED\b", r"\bPLC\b\.?", r"\bCO\b\.?",
            r"\bCOMPANY\b", r"\bSA\b", r"\bAG\b", r"\bSE\b", r"\bIND\b\.?",
            r"\bINDUSTRIES\b"
        ]
        
        for suffix in suffixes:
            clean = re.sub(suffix, "", clean, flags=re.IGNORECASE)

        # Remove ticker/suffix if it slipped into name
        clean = re.sub(r"\b" + re.escape(symbol.split(".")[0]) + r"\b", "", clean, flags=re.IGNORECASE)
        
        # Strip trailing special symbols and excess spaces
        clean = re.sub(r"[,.\-&()\[\]]+", " ", clean)
        clean = " ".join(clean.split())
        
        # If cleaning wiped it out or made it too short, fallback
        if len(clean) < 3:
            return symbol.split(".")[0]
            
        return clean

    def _parse_pubdate(self, entry: Any) -> datetime:
        """
        Parse RSS publication date into datetime object.
        """
        try:
            if "published_parsed" in entry and entry.published_parsed:
                return datetime(*entry.published_parsed[:6])
        except Exception:
            pass
        return datetime.utcnow()

    def fetch_news_for_symbol(self, symbol: str, company_name: str) -> List[Dict[str, Any]]:
        """
        Fetch and parse real-time headlines for a symbol from Google News RSS.
        Implements title suffix trimming, deduplication, and thread-safe caching (1-hour TTL).
        """
        symbol = symbol.upper().strip()
        now = datetime.utcnow()

        # Check Cache first (1-hour cache)
        with self._lock:
            cached = self._news_cache.get(symbol)
            if cached and (now - cached["timestamp"]) < timedelta(hours=1):
                return cached["items"]

        cleaned_name = self.clean_company_name(company_name, symbol)
        
        # Generate search query search string
        # Target exact name query OR the raw symbol
        query = f'"{cleaned_name}" OR "{symbol.split(".")[0]}"'
        
        # Geolocation configuration: Indian endpoints vs Global endpoints
        is_indian = symbol.endswith(".NS") or symbol.endswith(".BO")
        if is_indian:
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
        else:
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-US&gl=US&ceid=US:en"

        items = []
        try:
            feed = feedparser.parse(url)
            entries = feed.entries or []

            seen_titles = set()
            for entry in entries:
                title = entry.get("title", "")
                if not title:
                    continue

                # 1. Clean Publisher Suffixes (e.g. "- Economic Times")
                # Split from right to trim standard source suffix
                cleaned_title = title
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    cleaned_title = parts[0]
                elif " | " in title:
                    parts = title.rsplit(" | ", 1)
                    cleaned_title = parts[0]

                # 2. Textual deduplication using keyword overlap & normalize strings
                norm_title = re.sub(r"\W+", " ", cleaned_title.lower()).strip()
                words = set(norm_title.split())
                
                # Check overlaps with already seen headlines
                is_duplicate = False
                for seen in seen_titles:
                    seen_words = set(seen.split())
                    if not words or not seen_words:
                        continue
                    overlap = len(words.intersection(seen_words)) / max(len(words), len(seen_words))
                    if overlap > 0.7:  # 70% threshold overlap
                        is_duplicate = True
                        break

                if is_duplicate:
                    continue

                seen_titles.add(norm_title)

                # Resolve publisher name
                source = "Unknown Source"
                if "source" in entry and entry.source:
                    source = entry.source.get("title", "Unknown Source")
                elif " - " in title:
                    source = title.rsplit(" - ", 1)[-1]
                elif " | " in title:
                    source = title.rsplit(" | ", 1)[-1]

                pub_datetime = self._parse_pubdate(entry)

                items.append({
                    "title": cleaned_title,
                    "link": entry.get("link", ""),
                    "source": source,
                    "published_at": pub_datetime.isoformat() + "Z"
                })

                # Limit to top 5 highly relevant articles per ticker to avoid noise
                if len(items) >= 5:
                    break

        except Exception as e:
            print(f"Error fetching RSS news for {symbol}: {e}")

        # Cache results
        with self._lock:
            self._news_cache[symbol] = {
                "items": items,
                "timestamp": now
            }
            return items

    def fetch_news_bulk(self, symbols_map: Dict[str, str]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch news for a map of symbol -> company_name.
        Returns a dict mapping symbol -> list of news items.
        """
        results = {}
        # Fetch sequentially (cached reads are instant, others make small RSS HTTP downloads)
        for sym, name in symbols_map.items():
            results[sym] = self.fetch_news_for_symbol(sym, name)
        return results

    def get_why_matters_label(
        self, 
        symbol: str, 
        sector: str, 
        cap_bucket: str, 
        holding_qty: float, 
        watch_reason: str = None
    ) -> str:
        """
        Generates context-aware explanations of why a news asset matters to the user's portfolio.
        """
        if holding_qty > 0:
            return f"Active holding ({cap_bucket.capitalize()} Cap) in the {sector} sector. Keep track of earnings, growth trends, and contract cycles."
        elif watch_reason:
            return f"Watched candidate under review in the {sector} sector. Tracking reason: '{watch_reason}'."
        else:
            return f"Watched candidate in the {sector} sector. Monitored for potential diversification benefits."

news_service = NewsService()
