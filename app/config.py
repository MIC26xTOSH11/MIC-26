from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Ignore extra fields from .env file
    )
    app_name: str = "LLM MalignOps Shield"
    environment: str = Field("dev", env="APP_ENV")
    secret_key: str = Field("super-secret-key", env="APP_SECRET")
    database_url: str = Field("sqlite:///./data/app.db", env="DATABASE_URL")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"])
    sharing_allowed_regions: List[str] = Field(
        default_factory=lambda: ["USA", "EU", "IN", "AUS"]
    )
    watermark_secret: str = Field("default-watermark-seed", env="WATERMARK_SEED")
    # Hugging Face AI Detection
    hf_model_name: str = Field("disabled", env="HF_MODEL_NAME")
    hf_tokenizer_name: str = Field("disabled", env="HF_TOKENIZER_NAME")
    hf_device: int = Field(-1, env="HF_DEVICE")  # -1 CPU, >=0 GPU id
    hf_score_threshold: float = Field(0.6, env="HF_SCORE_THRESHOLD")
    
    # Ollama Configuration (DEPRECATED - keeping for backward compatibility)
    ollama_model: str = Field("llama3.2:3b", env="OLLAMA_MODEL")  # Lightweight and efficient
    ollama_enabled: bool = Field(False, env="OLLAMA_ENABLED")  # Disabled by default (using Azure OpenAI)
    ollama_host: str = Field("http://localhost:11434", env="OLLAMA_HOST")
    ollama_timeout: int = Field(30, env="OLLAMA_TIMEOUT")
    ollama_prompt_chars: int = Field(2000, env="OLLAMA_PROMPT_CHARS")
    ollama_timeout_ceiling: int = Field(90, env="OLLAMA_TIMEOUT_CEILING")
    
    # Azure OpenAI Configuration (Primary Semantic Scorer - Microsoft Imagine Cup 2026)
    azure_openai_endpoint: str = Field("", env="AZURE_OPENAI_ENDPOINT")
    azure_openai_key: str = Field("", env="AZURE_OPENAI_KEY")
    azure_openai_deployment_name: str = Field("gpt-4", env="AZURE_OPENAI_DEPLOYMENT_NAME")
    azure_openai_api_version: str = Field("2024-02-15-preview", env="AZURE_OPENAI_API_VERSION")
    azure_openai_enabled: bool = Field(True, env="AZURE_OPENAI_ENABLED")  # Enable by default
    azure_openai_max_chars: int = Field(8000, env="AZURE_OPENAI_MAX_CHARS")  # Context window consideration
    
    # Azure AI Content Safety Configuration (Harm Detection)
    azure_content_safety_endpoint: str = Field("", env="AZURE_CONTENT_SAFETY_ENDPOINT")
    azure_content_safety_key: str = Field("", env="AZURE_CONTENT_SAFETY_KEY")
    azure_content_safety_enabled: bool = Field(True, env="AZURE_CONTENT_SAFETY_ENABLED")
    
    # Azure AI Language Configuration (Multi-language Support)
    # Supports: English, Hindi, Arabic, Spanish, French, German, Portuguese,
    # Russian, Chinese, Japanese, Korean, Tamil, Telugu, Urdu, Bengali
    azure_language_endpoint: str = Field("", env="AZURE_LANGUAGE_ENDPOINT")
    azure_language_key: str = Field("", env="AZURE_LANGUAGE_KEY")
    azure_language_enabled: bool = Field(True, env="AZURE_LANGUAGE_ENABLED")
    
    # Blockchain, sharing, and image analysis features removed - focusing on text disinformation MVP
    # federated_encryption_key, federated_nodes, node_url removed
    # sightengine_api_user, sightengine_api_secret removed


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
