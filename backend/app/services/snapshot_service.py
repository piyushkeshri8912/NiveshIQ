import yfinance as yf
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.models.transaction import Transaction
from app.services.market_data_service import market_data_service

class SnapshotService:
    def rebuild_snapshots(self, db: Session, user_id: int, from_date: datetime):
        """
        Walk chronologically from the earliest transaction date to today.
        Simulate the portfolio holdings on every single day.
        Recompute value and cost basis based on historical bulk prices.
        Persist snapshots starting from from_date to PostgreSQL.
        """
        # 1. Fetch all transactions for this user chronologically (ascending)
        transactions = (
            db.query(Transaction)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.executed_at.asc())
            .all()
        )
        
        # 2. If no transactions, delete all snapshots and active holdings, then exit
        if not transactions:
            db.query(PortfolioSnapshot).filter(PortfolioSnapshot.user_id == user_id).delete()
            from app.models.holding import Holding
            db.query(Holding).filter(Holding.user_id == user_id).delete()
            db.commit()
            return
            
        # 3. Determine true start date and clean stale database entries
        start_date = min(t.executed_at for t in transactions)
        start_datetime = datetime.combine(start_date.date(), datetime.min.time())
        from_datetime = datetime.combine(from_date.date(), datetime.min.time())
        end_datetime = datetime.combine(datetime.utcnow().date(), datetime.min.time())
        
        # Delete stale records in PostgreSQL >= from_datetime to refresh them
        db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.user_id == user_id,
            PortfolioSnapshot.captured_at >= from_datetime
        ).delete()
        db.commit()
        
        # 4. Fetch bulk historical daily closing prices for all Symbols
        symbols = list(set(t.symbol for t in transactions))
        historical_prices = market_data_service.get_historical_prices_bulk(symbols, start_datetime, end_datetime)
        
        # 5. Chronological holdings forward simulation
        holdings = {}  # symbol -> {"qty": float, "cost": float}
        last_known_prices = {}
        
        current_date = start_datetime
        while current_date <= end_datetime:
            # Process all transactions executed on this day
            txs_on_date = [t for t in transactions if t.executed_at.date() == current_date.date()]
            for tx in txs_on_date:
                symbol = tx.symbol.upper().strip()
                if tx.transaction_type == "BUY":
                    h = holdings.get(symbol, {"qty": 0.0, "cost": 0.0})
                    new_qty = h["qty"] + float(tx.quantity)
                    new_cost = h["cost"] + (float(tx.quantity) * float(tx.price)) + float(tx.fees or 0.0)
                    holdings[symbol] = {"qty": new_qty, "cost": new_cost}
                elif tx.transaction_type == "SELL":
                    h = holdings.get(symbol)
                    if h:
                        new_qty = max(0.0, h["qty"] - float(tx.quantity))
                        if h["qty"] > 0:
                            cost_per_share = h["cost"] / h["qty"]
                            new_cost = max(0.0, h["cost"] - (float(tx.quantity) * cost_per_share))
                        else:
                            new_cost = 0.0
                            
                        if new_qty == 0:
                            holdings.pop(symbol, None)
                        else:
                            holdings[symbol] = {"qty": new_qty, "cost": new_cost}
            
            # If current_date is >= from_datetime, save snapshot to database
            if current_date.date() >= from_datetime.date():
                total_value = 0.0
                total_cost = 0.0
                date_str = current_date.strftime("%Y-%m-%d")
                
                # Fetch holding details at current_date
                active_assets = []
                for symbol, h in holdings.items():
                    price = historical_prices.get(symbol, {}).get(date_str)
                    if price is not None:
                        last_known_prices[symbol] = price
                    else:
                        price = last_known_prices.get(symbol)
                        
                    if price is None:
                        price = h["cost"] / h["qty"] if h["qty"] > 0 else 100.0
                        
                    val = h["qty"] * price
                    total_value += val
                    total_cost += h["cost"]
                    
                    if h["qty"] > 0:
                        active_assets.append({
                            "symbol": symbol,
                            "qty": h["qty"],
                            "value": val,
                            "cost": h["cost"]
                        })
                
                # Calculate basic diversification and risk scores dynamically
                diversification_score = 50.0
                risk_score = 5.0
                
                if total_value > 0:
                    # Sector allocations
                    sector_vals = {}
                    for asset in active_assets:
                        sec = market_data_service.get_sector(asset["symbol"])
                        sector_vals[sec] = sector_vals.get(sec, 0.0) + asset["value"]
                        
                    sector_hhi = sum((v / total_value * 100.0) ** 2 for v in sector_vals.values())
                    diversification_score = max(0.0, min(100.0, 100.0 - (sector_hhi / 100.0)))
                    
                    # Asset HHI
                    asset_hhi = sum((a["value"] / total_value * 100.0) ** 2 for a in active_assets)
                    asset_hhi_factor = (asset_hhi / 10000.0) * 4.0
                    sector_hhi_factor = (sector_hhi / 10000.0) * 3.0
                    risk_score = max(1.0, min(10.0, 1.0 + asset_hhi_factor + sector_hhi_factor))
                
                # Write to database (re-populating the snapshot)
                snapshot = PortfolioSnapshot(
                    user_id=user_id,
                    captured_at=current_date,
                    total_value=float(total_value),
                    total_cost=float(total_cost),
                    risk_score=float(risk_score),
                    diversification_score=float(diversification_score)
                )
                db.add(snapshot)
                
            current_date += timedelta(days=1)
            
        db.commit()
        
        # Synchronize current active positions to holdings table in PostgreSQL
        self.sync_holdings_to_db(db, user_id)

    def sync_holdings_to_db(self, db: Session, user_id: int):
        """
        Derive current active holdings from transaction ledger
        and synchronize them to the holdings PostgreSQL table.
        """
        from app.models.holding import Holding
        from app.services.holdings_service import holdings_service
        
        # Calculate derived holdings
        res = holdings_service.calculate_holdings(db, user_id)
        
        # Delete existing holdings for user
        db.query(Holding).filter(Holding.user_id == user_id).delete()
        
        # Insert active positions
        for h in res.holdings:
            db_holding = Holding(
                user_id=user_id,
                symbol=h.symbol,
                quantity=float(h.quantity),
                average_buy_price=float(h.average_buy_price)
            )
            db.add(db_holding)
            
        db.commit()

snapshot_service = SnapshotService()
