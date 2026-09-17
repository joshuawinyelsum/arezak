# Database and Domain Model

## Entities

### User
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `name`: String
- `password_hash`: String
- `currency`: String (Default 'GHS')
- `timezone`: String
- `created_at`: DateTime
- `updated_at`: DateTime

### Account
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `name`: String
- `type`: String (e.g., 'MAIN', 'MOBILE_MONEY', 'CASH')
- `created_at`: DateTime
- `updated_at`: DateTime

### Category
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `name`: String
- `description`: String
- `is_active`: Boolean
- `is_locked`: Boolean
- `spending_limit`: Integer (Pesewas) - Optional
- `priority`: Integer
- `created_at`: DateTime
- `updated_at`: DateTime

### AllocationRule
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `category_id`: UUID (Foreign Key)
- `percentage`: Integer (0-100)
- `priority`: Integer
- `is_active`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

### Goal
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `name`: String
- `description`: String
- `target_amount`: Integer (Pesewas)
- `status`: String ('ACTIVE', 'COMPLETED', 'CANCELLED')
- `lock_enabled`: Boolean
- `lock_type`: String ('TARGET_REACHED', 'DATE_REACHED', 'BOTH')
- `unlock_date`: DateTime - Optional
- `deadline`: DateTime - Optional
- `created_at`: DateTime
- `updated_at`: DateTime

### GoalContribution
- `id`: UUID (Primary Key)
- `goal_id`: UUID (Foreign Key)
- `transaction_id`: UUID (Foreign Key)
- `amount`: Integer (Pesewas)
- `created_at`: DateTime

### Debt
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `name`: String
- `original_amount`: Integer (Pesewas)
- `due_date`: DateTime - Optional
- `priority`: Integer
- `status`: String ('ACTIVE', 'COMPLETED')
- `notes`: String
- `created_at`: DateTime
- `updated_at`: DateTime

### DebtPayment
- `id`: UUID (Primary Key)
- `debt_id`: UUID (Foreign Key)
- `transaction_id`: UUID (Foreign Key)
- `amount`: Integer (Pesewas)
- `created_at`: DateTime

### Obligation
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `category_id`: UUID (Foreign Key)
- `name`: String
- `amount`: Integer (Pesewas)
- `frequency`: String ('ONCE', 'WEEKLY', 'MONTHLY', 'YEARLY')
- `next_due_date`: DateTime
- `priority`: Integer
- `status`: String ('ACTIVE', 'COMPLETED', 'CANCELLED')
- `notes`: String
- `created_at`: DateTime
- `updated_at`: DateTime

### Transaction
The immutable ledger of financial movements.
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `account_id`: UUID (Foreign Key)
- `type`: String ('INCOME', 'EXPENSE', 'TRANSFER', 'ALLOCATION', 'GOAL_CONTRIBUTION', 'DEBT_PAYMENT', 'ADJUSTMENT', 'GOAL_OVERRIDE')
- `amount`: Integer (Pesewas, can be positive or negative depending on context, or use absolute with type indicating direction. Best practice: absolute amount, source/destination determine direction).
- `source_id`: UUID (Optional, e.g., source category or account)
- `destination_id`: UUID (Optional, e.g., destination category, goal, debt)
- `status`: String ('PENDING', 'COMPLETED', 'FAILED')
- `reference`: String (Idempotency key)
- `description`: String
- `date`: DateTime
- `created_at`: DateTime

### AuditLog
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `entity_type`: String (e.g., 'GOAL', 'TRANSACTION')
- `entity_id`: UUID
- `event_type`: String ('CREATED', 'UPDATED', 'DELETED', 'LOCKED', 'UNLOCKED', 'OVERRIDE_REQUESTED')
- `before_state`: JSONB
- `after_state`: JSONB
- `reason`: String
- `created_at`: DateTime

### Notification
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `type`: String ('GOAL_PROGRESS', 'GOAL_COMPLETED', 'LOW_BALANCE', 'OBLIGATION_DUE')
- `title`: String
- `message`: String
- `is_read`: Boolean
- `created_at`: DateTime

