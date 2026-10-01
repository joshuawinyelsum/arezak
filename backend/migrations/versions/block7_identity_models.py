"""block7_identity_models

Revision ID: block7_identity_models
Revises: e82b47c1a9d4
Create Date: 2026-10-01 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'block7_identity_models'
down_revision = 'e82b47c1a9d4'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add new fields to users table
    op.add_column('users', sa.Column('first_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('profile_photo_url', sa.String(length=1024), nullable=True))
    
    # Backfill first_name and last_name from name
    op.execute("UPDATE users SET first_name = name, last_name = ''")
    
    op.alter_column('users', 'first_name', existing_type=sa.String(length=255), nullable=False)
    op.alter_column('users', 'last_name', existing_type=sa.String(length=255), nullable=False)
    op.drop_column('users', 'name')
    
    # password_hash becomes nullable
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=True)

    # Provider identities
    op.create_table('provider_identities',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('provider', sa.String(length=50), nullable=False),
    sa.Column('provider_user_id', sa.String(length=255), nullable=False),
    sa.Column('provider_email', sa.String(length=255), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider', 'provider_user_id', name='uq_provider_user_id'),
    sa.UniqueConstraint('user_id', 'provider', name='uq_user_provider')
    )
    op.create_index(op.f('ix_provider_identities_provider'), 'provider_identities', ['provider'], unique=False)
    op.create_index(op.f('ix_provider_identities_provider_user_id'), 'provider_identities', ['provider_user_id'], unique=False)
    op.create_index(op.f('ix_provider_identities_user_id'), 'provider_identities', ['user_id'], unique=False)

    # Phone verification attempts
    op.create_table('phone_verification_attempts',
    sa.Column('phone_number', sa.String(length=20), nullable=False),
    sa.Column('otp_hash', sa.String(length=255), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('verified', sa.Boolean(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_phone_verification_attempts_phone_number'), 'phone_verification_attempts', ['phone_number'], unique=False)


def downgrade() -> None:
    # Drop new tables
    op.drop_table('phone_verification_attempts')
    op.drop_table('provider_identities')
    
    # Re-add name column
    op.add_column('users', sa.Column('name', sa.String(length=255), nullable=True))
    op.execute("UPDATE users SET name = first_name || ' ' || last_name")
    op.alter_column('users', 'name', existing_type=sa.String(length=255), nullable=False)
    
    # Drop new fields
    op.drop_column('users', 'profile_photo_url')
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
    
    # Make password_hash non-nullable again
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=False)
