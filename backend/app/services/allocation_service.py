from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid
import math

from app.models.allocation_rule import AllocationRule
from app.models.category import Category
from app.models.account import Account

def calculate_allocations(amount: int, rules: list[AllocationRule]) -> dict[uuid.UUID, int]:
    """
    Calculates deterministic splits. Uses the largest remainder method 
    or simply distributes the remaining pesewas to the highest priority rule to avoid losing pennies.
    """
    
    if amount == 0:
        return {rule.category_id: 0 for rule in rules if rule.is_active}

    active_rules = sorted([r for r in rules if r.is_active], key=lambda x: -x.priority)
    
    allocations = {}
    total_allocated = 0
    
    for rule in active_rules:
        allocated = math.floor((amount * rule.percentage) / 100)
        allocations[rule.category_id] = allocated
        total_allocated += allocated
        
    remainder = amount - total_allocated
    
    # Give remainder to the highest priority rule
    if remainder > 0 and active_rules:
        allocations[active_rules[0].category_id] += remainder
        
    return allocations

