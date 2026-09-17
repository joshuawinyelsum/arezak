def release_goal(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    goal_id: uuid.UUID,
    idempotency_key: str | None = None
) -> Transaction:
    # 1. Idempotency Check (Fast path)
    if idempotency_key:
        # Check if a release transaction already exists for this idempotency key
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id, type="GOAL_RELEASE").first()
        if existing_tx:
            return existing_tx

    # 2. Constraint Engine Evaluation (Will lock account and goal, verify states)
    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type="GOAL_RELEASE",
        amount_pesewas=0, # Will be set by GoalReleaseConstraint based on database state
        currency="GHS", # Will be validated against Goal and Account
        account_id=account_id,
        goal_id=goal_id
    )
    
    # We load the account to get its currency for the context
    account = db.query(Account).filter_by(id=account_id).first()
    if account:
        context.currency = account.currency

    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)
        
    # 3. Double-Checked Locking for Idempotency
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id, type="GOAL_RELEASE").first()
        if existing_tx:
            return existing_tx
            
    account = context.account
    goal = context.goal
    amount_pesewas = context.amount_pesewas # Extracted authoritatively by the constraint
    
    # 4. Atomic Mutation
    # Decrease locked, increase available
    account.locked_balance -= amount_pesewas
    account.available_balance += amount_pesewas
    
    # Clear goal locked, set status to RELEASED
    goal.locked_amount = 0
    goal.status = "RELEASED"
    
    # Create main transaction representing the release
    transaction = Transaction(
        user_id=user_id,
        account_id=account_id,
        amount=amount_pesewas,
        currency=goal.currency,
        type="GOAL_RELEASE",
        status="COMPLETED",
        reference=idempotency_key,
        description=f"Released funds from goal: {goal.name}"
    )
    db.add(transaction)
    db.flush()
    
    # Create ledger entry (INTERNAL_TRANSFER or similar, representing unlocking)
    # We use 'CREDIT' to available pool conceptually? But wait, the user says:
    # "The record must clearly identify: goal release... internal transfer/reclassification..."
    ledger_entry = LedgerEntry(
        account_id=account_id,
        transaction_id=transaction.id,
        amount=amount_pesewas,
        currency=goal.currency,
        entry_type="TRANSFER_IN", # Available balance increased
        description="Goal funds unlocked and made available"
    )
    db.add(ledger_entry)
    
    return transaction
