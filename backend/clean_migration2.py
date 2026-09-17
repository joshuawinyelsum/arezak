import re

with open('migrations/versions/8a7d5911a384_add_goal_phase_2c_1_fields.py', 'r') as f:
    content = f.read()

upgrade_body = '''def upgrade() -> None:
    op.add_column('goal_contributions', sa.Column('account_id', sa.UUID(), nullable=True))
    op.add_column('goal_contributions', sa.Column('user_id', sa.UUID(), nullable=True))
    op.add_column('goal_contributions', sa.Column('currency', sa.String(length=3), nullable=True))
    op.add_column('goal_contributions', sa.Column('reference', sa.String(length=255), nullable=True))
    
    op.execute("UPDATE goal_contributions SET currency = 'GHS'")
    with op.batch_alter_table('goal_contributions', schema=None) as batch_op:
        batch_op.alter_column('currency', nullable=False)
        batch_op.create_index(batch_op.f('ix_goal_contributions_account_id'), ['account_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_goal_contributions_reference'), ['reference'], unique=True)
        batch_op.create_index(batch_op.f('ix_goal_contributions_user_id'), ['user_id'], unique=False)
        batch_op.create_foreign_key('fk_goal_contributions_account_id', 'accounts', ['account_id'], ['id'])
        batch_op.create_foreign_key('fk_goal_contributions_user_id', 'users', ['user_id'], ['id'])
    
    op.add_column('goals', sa.Column('locked_amount', sa.Integer(), nullable=True))
    op.add_column('goals', sa.Column('currency', sa.String(length=3), nullable=True))
    op.execute("UPDATE goals SET locked_amount = 0, currency = 'GHS'")
    with op.batch_alter_table('goals', schema=None) as batch_op:
        batch_op.alter_column('locked_amount', nullable=False)
        batch_op.alter_column('currency', nullable=False)
'''
upgrade_match = re.search(r'def upgrade\(\) -> None:.*?(?=def downgrade\(\) -> None:)', content, re.DOTALL)
content = content.replace(upgrade_match.group(0), upgrade_body)

with open('migrations/versions/8a7d5911a384_add_goal_phase_2c_1_fields.py', 'w') as f:
    f.write(content)

