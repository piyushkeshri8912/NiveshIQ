import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.transaction import Transaction
from app.models.holding import Holding
from app.services.holdings_service import holdings_service

class TestCostBasis(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for test isolates
        self.engine = create_engine("sqlite:///:memory:")
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Seed a test user
        self.user = User(id=1, email="test@test.com")
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_weighted_average_cost(self):
        # 1. Buy 10 INFY at 1400
        tx1 = Transaction(
            user_id=1,
            symbol="INFY.NS",
            transaction_type="BUY",
            quantity=10.0,
            price=1400.0,
            fees=0.0
        )
        self.db.add(tx1)
        self.db.commit()

        res = holdings_service.calculate_holdings(self.db, 1)
        self.assertEqual(len(res.holdings), 1)
        self.assertEqual(res.holdings[0].quantity, 10.0)
        self.assertEqual(res.holdings[0].average_buy_price, 1400.0)
        self.assertEqual(res.summary.total_realized_pnl, 0.0)

        # 2. Buy 10 more INFY at 1500
        tx2 = Transaction(
            user_id=1,
            symbol="INFY.NS",
            transaction_type="BUY",
            quantity=10.0,
            price=1500.0,
            fees=0.0
        )
        self.db.add(tx2)
        self.db.commit()

        res = holdings_service.calculate_holdings(self.db, 1)
        self.assertEqual(res.holdings[0].quantity, 20.0)
        self.assertEqual(res.holdings[0].average_buy_price, 1450.0)  # (10*1400 + 10*1500)/20 = 1450

        # 3. Sell 5 INFY at 1600
        tx3 = Transaction(
            user_id=1,
            symbol="INFY.NS",
            transaction_type="SELL",
            quantity=5.0,
            price=1600.0,
            fees=0.0
        )
        self.db.add(tx3)
        self.db.commit()

        res = holdings_service.calculate_holdings(self.db, 1)
        self.assertEqual(res.holdings[0].quantity, 15.0)
        self.assertEqual(res.holdings[0].average_buy_price, 1450.0)  # Average price stays 1450
        # Realized gain is 5 * (1600 - 1450) = 750
        self.assertEqual(res.summary.total_realized_pnl, 750.0)

if __name__ == "__main__":
    unittest.main()
