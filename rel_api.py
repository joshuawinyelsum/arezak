@router.post("/{goal_id}/release")
def api_release_goal(
    goal_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser,
    x_idempotency_key: Annotated[str | None, Header()] = None
):
    # Determine the account ID from the goal's contribution. 
    # For Phase 2C-1, we assume goals are tied to accounts through contributions.
    # To keep the API simple, we'll fetch the goal's account_id from its first contribution,
    # or just assume the user passes it. The prompt says:
    # "Do not let the client arbitrarily redirect released funds to another account... The release should operate against the account that actually contains the goal's locked funds."
    # Let's find the account_id from GoalContribution.
    
    from app.models.goal_contribution import GoalContribution
    contrib = db.query(GoalContribution).filter_by(goal_id=goal_id).first()
    if not contrib:
        raise HTTPException(status_code=400, detail="Goal has no contributions to release to.")
        
    try:
        from app.services.goal_service import release_goal
        tx = release_goal(
            db=db,
            user_id=current_user.id,
            account_id=contrib.account_id,
            goal_id=goal_id,
            idempotency_key=x_idempotency_key
        )
        db.commit()
        
        goal = db.query(Goal).filter_by(id=goal_id).first()
        account = db.query(Account).filter_by(id=contrib.account_id).first()
        
        return {
            "message": "Release successful", 
            "transaction_id": tx.id,
            "goal_status": goal.status,
            "released_amount": tx.amount,
            "remaining_locked_amount": goal.locked_amount,
            "account_available_balance": account.available_balance,
            "account_locked_balance": account.locked_balance
        }
    except ConstraintViolationException as e:
        db.rollback()
        status = 400
        if "NOT_FOUND" in e.decision.code or "DENIED" in e.decision.code or "NOT_OWNED" in e.decision.code:
            status = 404
        raise HTTPException(status_code=status, detail={"code": e.decision.code, "message": e.decision.message})
    except Exception as e:
        db.rollback()
        raise e
