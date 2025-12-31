"""
Role-based access control middleware
JWT token validation and permission checking
"""
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .jwt_handler import decode_access_token, get_token_from_header
from .users import has_permission, get_user_permissions
from ..config import get_settings


security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Extract and validate JWT token from request
    Returns user info from token payload
    """
    settings = get_settings()
    
    token = None
    
    # Try to get token from Authorization header
    if credentials:
        token = credentials.credentials
    else:
        # Fallback: check Authorization header manually
        auth_header = request.headers.get("Authorization")
        token = get_token_from_header(auth_header)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    
    # Extract user info from token
    username = payload.get("sub")
    role = payload.get("role")
    
    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    return {
        "username": username,
        "role": role,
        "permissions": get_user_permissions(role),
    }


async def role_protection(request: Request, required_permission: str) -> str:
    """
    Legacy compatibility wrapper
    Validates JWT and checks for required permission
    """
    # Manually extract token from request
    auth_header = request.headers.get("Authorization")
    token = get_token_from_header(auth_header)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    
    # Extract user info from token
    username = payload.get("sub")
    role = payload.get("role")
    
    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    user = {
        "username": username,
        "role": role,
        "permissions": get_user_permissions(role),
    }
    
    if required_permission not in user["permissions"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{required_permission}' required"
        )
    
    return user["username"]


def require_permission(permission: str):
    """
    Dependency factory for permission-based route protection
    Usage: @app.get("/endpoint", dependencies=[Depends(require_permission("upload_content"))])
    """
    async def permission_checker(user: dict = Depends(get_current_user)) -> dict:
        if permission not in user["permissions"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return user
    
    return permission_checker


def require_role(role: str):
    """
    Dependency factory for role-based route protection
    Usage: @app.get("/endpoint", dependencies=[Depends(require_role("enterprise"))])
    """
    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return user
    
    return role_checker

