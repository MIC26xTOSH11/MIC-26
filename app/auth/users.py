"""
User management without database
Uses environment variables for credentials (Vercel/Azure friendly)
"""
import os
import hashlib
from typing import Optional, Dict, List
from enum import Enum


class UserRole(str, Enum):
    INDIVIDUAL = "individual"
    ENTERPRISE = "enterprise"


# Role-based permissions mapping
ROLE_PERMISSIONS = {
    UserRole.INDIVIDUAL: [
        "view_dashboard",
        "upload_content",
        "view_analytics",
    ],
    UserRole.ENTERPRISE: [
        "view_dashboard",
        "upload_content",
        "view_analytics",
        "view_superuser",
        "manage_submissions",
        "export_data",
        "view_detailed_reports",
    ],
}


def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(plain_password) == hashed_password


def get_users_from_env() -> Dict[str, Dict[str, str]]:
    """
    Load users from environment variables
    Format: USER_<username>=<password>:<role>
    Example: USER_admin=password123:enterprise
             USER_analyst=pass456:individual
    """
    users = {}
    
    # Check for environment variables starting with USER_
    for key, value in os.environ.items():
        if key.startswith("USER_"):
            username = key[5:].lower()  # Remove 'USER_' prefix
            try:
                password, role = value.split(":")
                if role in [r.value for r in UserRole]:
                    users[username] = {
                        "username": username,
                        "password": password,
                        "role": role,
                    }
            except ValueError:
                continue
    
    # Default demo users if no environment variables set
    if not users:
        users = {
            "admin": {
                "username": "admin",
                "password": "admin123",
                "role": UserRole.ENTERPRISE.value,
            },
            "analyst": {
                "username": "analyst",
                "password": "analyst123",
                "role": UserRole.INDIVIDUAL.value,
            },
        }
    
    return users


def authenticate_user(username: str, password: str, db=None) -> Optional[Dict[str, str]]:
    """
    Authenticate user with username and password.
    Checks both environment variables and database (if provided).
    """
    # First, check environment variables (for backwards compatibility)
    users = get_users_from_env()
    user = users.get(username.lower())
    
    if user and user["password"] == password:
        # Update last login if db provided
        if db:
            try:
                db.update_last_login(username)
            except:
                pass
        return {
            "username": user["username"],
            "role": user["role"],
        }
    
    # If not in env vars, check database
    if db:
        db_user = db.get_user_by_username(username)
        if db_user and verify_password(password, db_user["password_hash"]):
            # Update last login
            try:
                db.update_last_login(username)
            except:
                pass
            return {
                "username": db_user["username"],
                "role": db_user["role"],
            }
    
    return None


def create_user(username: str, password: str, role: str, db) -> tuple[bool, str]:
    """
    Create a new user account in the database.
    Returns (success: bool, message: str)
    """
    # Validate role
    if role not in [r.value for r in UserRole]:
        return False, f"Invalid role. Must be 'individual' or 'enterprise'."
    
    # Validate username
    username = username.lower().strip()
    if len(username) < 3:
        return False, "Username must be at least 3 characters long."
    
    if not username.isalnum() and '_' not in username:
        return False, "Username can only contain letters, numbers, and underscores."
    
    # Validate password
    if len(password) < 6:
        return False, "Password must be at least 6 characters long."
    
    # Check if user already exists in env vars
    env_users = get_users_from_env()
    if username in env_users:
        return False, "Username already exists."
    
    # Hash password and create user
    password_hash = hash_password(password)
    success = db.create_user(username, password_hash, role)
    
    if success:
        return True, "Account created successfully."
    else:
        return False, "Username already exists."


def get_user_permissions(role: str) -> List[str]:
    """Get permissions for a given role"""
    try:
        user_role = UserRole(role)
        return ROLE_PERMISSIONS.get(user_role, [])
    except ValueError:
        return []


def has_permission(role: str, permission: str) -> bool:
    """Check if role has specific permission"""
    permissions = get_user_permissions(role)
    return permission in permissions
