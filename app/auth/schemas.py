"""
Authentication schemas for request/response models
"""
from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Username")
    password: str = Field(..., min_length=1, description="Password")


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username (3-50 characters)")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    role: str = Field(..., description="User role: 'individual' or 'enterprise'")


class LoginResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    username: str = Field(..., description="Username")
    role: str = Field(..., description="User role (individual/enterprise)")


class SignupResponse(BaseModel):
    message: str = Field(..., description="Success message")
    username: str = Field(..., description="Created username")
    role: str = Field(..., description="User role")


class UserInfo(BaseModel):
    username: str = Field(..., description="Username")
    role: str = Field(..., description="User role")
    permissions: list[str] = Field(default_factory=list, description="User permissions")

