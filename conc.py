def test_concurrency():
    from tests.conftest import engine, TestingSessionLocal
    import threading
    import uuid
    from app.models.user import User
    from app.models.account import Account
    from app.services.transaction_service import process_income, process_expense
    from app.rules.decision import ConstraintViolationException
    import os
    if os.environ.get("DB_DIALECT") == "sqlite":
        pytest.skip("Concurrency test skipped on SQLite")
        
    setup_session = TestingSessionLocal()
    uid = uuid.uuid4()
    user = User(email=f"conc_{uid}@example.com", name="Conc User", password_hash="hashed")
    setup_session.add(user)
    setup_session.commit()
    
    account = Account(user_id=user.id, name="Conc Main", type="MAIN", currency="GHS")
    setup_session.add(account)
    setup_session.commit()
    
    process_income(setup_session, user.id, account.id, 2000, "GHS", f"init_conc_{uid}")
    setup_session.commit()
    
    user_id = user.id
    account_id = account.id
    setup_session.close()
    
    results = []
    
    def worker():
        session = TestingSessionLocal()
        try:
            process_expense(session, user_id, account_id, 1500, "GHS", str(uuid.uuid4()))
            session.commit()
            results.append("SUCCESS")
        except ConstraintViolationException as e:
            session.rollback()
            results.append(e.decision.code.name)
        except Exception as e:
            session.rollback()
            results.append("ERROR")
        finally:
            session.close()
            
    t1 = threading.Thread(target=worker)
    t2 = threading.Thread(target=worker)
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    assert "SUCCESS" in results
    assert "INSUFFICIENT_AVAILABLE_FUNDS" in results
    
    verify_session = TestingSessionLocal()
    account_after = verify_session.query(Account).get(account_id)
    assert account_after.available_balance == 500
    verify_session.close()
