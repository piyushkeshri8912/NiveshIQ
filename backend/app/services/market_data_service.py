import yfinance as yf
from datetime import datetime, timedelta, timezone
import threading
import time
from app.db.session import SessionLocal
from app.models.market_price import MarketPrice

class MarketDataService:
    def __init__(self):
        self._price_cache = {}  # symbol -> {"price": float, "timestamp": datetime} (5 min cache)
        self._sector_cache = {} # symbol -> {"sector": str, "timestamp": datetime} (7 day cache)
        self._cap_cache = {}    # symbol -> {"cap": float, "timestamp": datetime} (1 day cache)
        self._name_cache = {}   # symbol -> {"name": str, "timestamp": datetime} (7 day cache)
        self._lock = threading.Lock()
        
        # Start background LTP scheduler thread (IST timezone UTC+5:30)
        self._scheduler = MarketPriceScheduler(self)
        self._scheduler.start()

    def _save_price_to_db(self, symbol: str, price: float):
        symbol = symbol.upper().strip()
        db = SessionLocal()
        try:
            market_price = db.query(MarketPrice).filter(MarketPrice.symbol == symbol).first()
            if market_price:
                market_price.price = price
                market_price.updated_at = datetime.utcnow()
            else:
                market_price = MarketPrice(symbol=symbol, price=price, updated_at=datetime.utcnow())
                db.add(market_price)
            db.commit()
        except Exception as e:
            print(f"Error saving price to DB for {symbol}: {e}")
            db.rollback()
        finally:
            db.close()

    def _fetch_ticker_data(self, symbol: str):
        symbol = symbol.upper().strip()
        now = datetime.now()
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}
            
            # 1. Price
            price = None
            try:
                price = ticker.fast_info.get("lastPrice")
            except Exception:
                pass
            if price is None:
                price = info.get("regularMarketPrice") or info.get("currentPrice")
            if price is None:
                history = ticker.history(period="1d")
                if not history.empty:
                    price = history["Close"].iloc[-1]
            if price is None or price <= 0:
                price = 100.0
                
            # 2. Sector
            sector = info.get("sector") or "Other"
            
            # 3. Market Cap
            market_cap = info.get("marketCap")
            if market_cap is None:
                try:
                    market_cap = ticker.fast_info.get("marketCap")
                except Exception:
                    pass
            if market_cap is None or market_cap <= 0:
                market_cap = 1000000000.0  # 1B default fallback
                
            # 4. Company Name
            name = info.get("longName") or info.get("shortName") or symbol

            with self._lock:
                self._price_cache[symbol] = {"price": float(price), "timestamp": now}
                self._sector_cache[symbol] = {"sector": sector, "timestamp": now}
                self._cap_cache[symbol] = {"cap": float(market_cap), "timestamp": now}
                self._name_cache[symbol] = {"name": name, "timestamp": now}
                
            # Save to DB
            self._save_price_to_db(symbol, float(price))
            
        except Exception as e:
            print(f"Error fetching yfinance metadata for {symbol}: {e}")
            # Ensure fallback values are cached on failure to prevent repeated blockages
            with self._lock:
                if symbol not in self._price_cache:
                    self._price_cache[symbol] = {"price": 100.0, "timestamp": now}
                if symbol not in self._sector_cache:
                    self._sector_cache[symbol] = {"sector": "Other", "timestamp": now}
                if symbol not in self._cap_cache:
                    self._cap_cache[symbol] = {"cap": 1000000000.0, "timestamp": now}
                if symbol not in self._name_cache:
                    self._name_cache[symbol] = {"name": symbol, "timestamp": now}

    def get_price(self, symbol: str) -> float:
        symbol = symbol.upper().strip()
        now = datetime.now()
        
        # 1. Check memory cache first (5-minute TTL)
        with self._lock:
            cached = self._price_cache.get(symbol)
            if cached and (now - cached["timestamp"]) < timedelta(minutes=5):
                return cached["price"]
                
        # 2. Check Database next
        db = SessionLocal()
        db_price = None
        try:
            market_price = db.query(MarketPrice).filter(MarketPrice.symbol == symbol).first()
            if market_price:
                db_price = market_price.price
                # Populate memory cache
                with self._lock:
                    self._price_cache[symbol] = {"price": db_price, "timestamp": now}
        except Exception as e:
            print(f"Error reading LTP from DB for {symbol}: {e}")
        finally:
            db.close()
            
        if db_price is not None:
            return db_price
            
        # 3. Fallback to yfinance lazy-load
        self._fetch_ticker_data(symbol)
        with self._lock:
            return self._price_cache[symbol]["price"]
            
    def get_sector(self, symbol: str) -> str:
        symbol = symbol.upper().strip()
        now = datetime.now()
        with self._lock:
            cached = self._sector_cache.get(symbol)
            if cached and (now - cached["timestamp"]) < timedelta(days=7):
                return cached["sector"]
        self._fetch_ticker_data(symbol)
        with self._lock:
            return self._sector_cache[symbol]["sector"]

    def get_market_cap(self, symbol: str) -> float:
        symbol = symbol.upper().strip()
        now = datetime.now()
        with self._lock:
            cached = self._cap_cache.get(symbol)
            if cached and (now - cached["timestamp"]) < timedelta(days=1):
                return cached["cap"]
        self._fetch_ticker_data(symbol)
        with self._lock:
            return self._cap_cache[symbol]["cap"]

    def get_company_name(self, symbol: str) -> str:
        symbol = symbol.upper().strip()
        now = datetime.now()
        with self._lock:
            cached = self._name_cache.get(symbol)
            if cached and (now - cached["timestamp"]) < timedelta(days=7):
                return cached["name"]
        self._fetch_ticker_data(symbol)
        with self._lock:
            return self._name_cache[symbol]["name"]

    def get_prices_bulk(self, symbols: list) -> dict:
        now = datetime.now()
        missing = []
        result = {}
        
        with self._lock:
            for s in symbols:
                s = s.upper().strip()
                cached = self._price_cache.get(s)
                if cached and (now - cached["timestamp"]) < timedelta(minutes=5):
                    result[s] = cached["price"]
                else:
                    missing.append(s)

        if missing:
            # 1. Look up missing symbols in DB in bulk
            db = SessionLocal()
            db_prices = {}
            try:
                db_rows = db.query(MarketPrice).filter(MarketPrice.symbol.in_(missing)).all()
                for row in db_rows:
                    db_prices[row.symbol] = row.price
            except Exception as e:
                print(f"Error bulk reading LTP from DB: {e}")
            finally:
                db.close()

            # For symbols found in DB, put in result and in-memory cache
            still_missing = []
            for s in missing:
                if s in db_prices:
                    result[s] = db_prices[s]
                    with self._lock:
                        self._price_cache[s] = {"price": db_prices[s], "timestamp": now}
                else:
                    still_missing.append(s)

            # 2. For any still missing, download from yfinance
            if still_missing:
                try:
                    if len(still_missing) == 1:
                        result[still_missing[0]] = self.get_price(still_missing[0])
                    else:
                        tickers_str = " ".join(still_missing)
                        data = yf.download(tickers=tickers_str, period="1d", group_by="ticker", progress=False)
                        
                        db_updates = {}
                        for s in still_missing:
                            s = s.upper().strip()
                            price = None
                            try:
                                ticker_data = data[s] if len(still_missing) > 1 else data
                                if not ticker_data.empty:
                                    if "Close" in ticker_data:
                                        price = ticker_data["Close"].dropna().iloc[-1]
                            except Exception:
                                pass
                            
                            if price is None or price <= 0:
                                price = self.get_price(s)
                            else:
                                price = float(price)
                                # Prepopulate price cache
                                with self._lock:
                                    self._price_cache[s] = {"price": price, "timestamp": now}
                                db_updates[s] = price
                            result[s] = price
                        
                        # Save the newly bulk-downloaded prices to DB
                        if db_updates:
                            db = SessionLocal()
                            try:
                                for s, p in db_updates.items():
                                    market_price = db.query(MarketPrice).filter(MarketPrice.symbol == s).first()
                                    if market_price:
                                        market_price.price = p
                                        market_price.updated_at = datetime.utcnow()
                                    else:
                                        market_price = MarketPrice(symbol=s, price=p, updated_at=datetime.utcnow())
                                        db.add(market_price)
                                db.commit()
                            except Exception as e:
                                print(f"Error bulk saving prices to DB: {e}")
                                db.rollback()
                            finally:
                                db.close()
                except Exception as e:
                    print(f"Bulk download error: {e}. Falling back to single fetch.")
                    for s in still_missing:
                        result[s] = self.get_price(s)
                        
        return result

    def get_historical_prices_bulk(self, symbols: list, start_date: datetime, end_date: datetime) -> dict:
        """
        Download historical daily closing prices for multiple symbols in bulk.
        Returns a dict: {symbol: {date_str: price_float}}
        """
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = (end_date + timedelta(days=1)).strftime("%Y-%m-%d")
        
        symbols = [s.upper().strip() for s in symbols]
        result = {s: {} for s in symbols}
        
        if not symbols:
            return result
            
        try:
            tickers_str = " ".join(symbols)
            data = yf.download(tickers=tickers_str, start=start_str, end=end_str, interval="1d", group_by="ticker", progress=False)
            
            for s in symbols:
                try:
                    ticker_data = data[s] if len(symbols) > 1 else data
                    if not ticker_data.empty:
                        # Extract Close prices
                        close_series = ticker_data["Close"].dropna()
                        for date, val in close_series.items():
                            date_str = date.strftime("%Y-%m-%d")
                            result[s][date_str] = float(val)
                except Exception as e:
                    print(f"Error extracting history for {s}: {e}")
        except Exception as e:
            print(f"Historical bulk download failed: {e}")
            
        return result

    def update_all_prices_in_db(self):
        from app.models.holding import Holding
        from app.models.watchlist_item import WatchlistItem
        
        db = SessionLocal()
        try:
            holding_symbols = [r[0] for r in db.query(Holding.symbol).distinct().all()]
            watchlist_symbols = [r[0] for r in db.query(WatchlistItem.symbol).distinct().all()]
            db_symbols = [r[0] for r in db.query(MarketPrice.symbol).distinct().all()]
            
            all_symbols = list(set(s.upper().strip() for s in (holding_symbols + watchlist_symbols + db_symbols) if s))
            if not all_symbols:
                print("No symbols found in Holdings, Watchlist, or MarketPrices to update.")
                return
                
            print(f"Updating LTP for {len(all_symbols)} active symbols in DB...")
            
            prices = {}
            # Bulk download from yfinance
            try:
                if len(all_symbols) == 1:
                    symbol = all_symbols[0]
                    ticker = yf.Ticker(symbol)
                    price = None
                    try:
                        price = ticker.fast_info.get("lastPrice")
                    except Exception:
                        pass
                    if price is None:
                        info = ticker.info or {}
                        price = info.get("regularMarketPrice") or info.get("currentPrice")
                    if price is None:
                        history = ticker.history(period="1d")
                        if not history.empty:
                            price = history["Close"].iloc[-1]
                    if price is not None and price > 0:
                        prices[symbol] = float(price)
                else:
                    tickers_str = " ".join(all_symbols)
                    data = yf.download(tickers=tickers_str, period="1d", group_by="ticker", progress=False)
                    
                    for s in all_symbols:
                        price = None
                        try:
                            ticker_data = data[s] if len(all_symbols) > 1 else data
                            if not ticker_data.empty:
                                if "Close" in ticker_data:
                                    price = ticker_data["Close"].dropna().iloc[-1]
                        except Exception:
                            pass
                        
                        if price is not None and price > 0:
                            prices[s] = float(price)
            except Exception as e:
                print(f"Error bulk downloading in scheduler: {e}")
                
            # Try single fetches for any failed ones
            for s in all_symbols:
                if s not in prices:
                    try:
                        ticker = yf.Ticker(s)
                        price = None
                        try:
                            price = ticker.fast_info.get("lastPrice")
                        except Exception:
                            pass
                        if price is None:
                            info = ticker.info or {}
                            price = info.get("regularMarketPrice") or info.get("currentPrice")
                        if price is None:
                            history = ticker.history(period="1d")
                            if not history.empty:
                                price = history["Close"].iloc[-1]
                        if price is not None and price > 0:
                            prices[s] = float(price)
                    except Exception as e:
                        print(f"Failed fallback fetch for {s} in scheduler: {e}")
                        
            # Save all successfully fetched prices to the DB
            now = datetime.utcnow()
            for s, price in prices.items():
                market_price = db.query(MarketPrice).filter(MarketPrice.symbol == s).first()
                if market_price:
                    market_price.price = price
                    market_price.updated_at = now
                else:
                    market_price = MarketPrice(symbol=s, price=price, updated_at=now)
                    db.add(market_price)
                
                # Update memory cache
                with self._lock:
                    self._price_cache[s] = {"price": price, "timestamp": datetime.now()}
            
            db.commit()
            print(f"Successfully updated LTP for {len(prices)} symbols in database.")
        except Exception as e:
            print(f"Error running update_all_prices_in_db: {e}")
            db.rollback()
        finally:
            db.close()


class MarketPriceScheduler(threading.Thread):
    def __init__(self, service):
        super().__init__(daemon=True, name="LtpSchedulerThread")
        self.service = service
        self.stop_event = threading.Event()
        
    def run(self):
        # Timezone for IST is UTC+5:30
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        
        # Track last run hour/date to prevent multiple executions within the same hour
        last_run = None
        
        # Let startup finish
        time.sleep(10)
        
        while not self.stop_event.is_set():
            try:
                now_ist = datetime.now(timezone.utc).astimezone(ist_tz)
                current_date_hour = (now_ist.date(), now_ist.hour)
                
                # Check for 8:00 AM and 4:00 PM IST
                if now_ist.hour in (8, 16) and current_date_hour != last_run:
                    print(f"[{datetime.now()}] LTP Scheduler triggering daily refresh at hour {now_ist.hour} IST.")
                    self.service.update_all_prices_in_db()
                    last_run = current_date_hour
                    print(f"[{datetime.now()}] LTP Scheduler refresh completed successfully.")
            except Exception as e:
                print(f"Error in LTP Scheduler background thread: {e}")
                
            # Wake up every 10 seconds to check time
            self.stop_event.wait(10)


market_data_service = MarketDataService()
