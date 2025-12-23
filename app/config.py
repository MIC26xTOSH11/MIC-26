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
    
    # Federated Blockchain Configuration
    federated_encryption_key: str = Field("LULSnIHlBjTSfWDfqVl0kTV9qXUFN0EpGbynAB_34TM=", env="BLOCK_ENCRYPTION_KEY")
    federated_nodes: str = Field("http://localhost:8000,http://localhost:8001,http://localhost:8002,http://localhost:8003,http://localhost:8004", env="FEDERATED_NODES")
    
    # Sightengine Image Detection API
    sightengine_api_user: str = Field("907314243", env="SIGHTENGINE_API_USER")
    sightengine_api_secret: str = Field("B6S8o9JwQg9B3pv5ppo8BgLNA2gyweh3", env="SIGHTENGINE_API_SECRET")
    node_url: str = Field("http://localhost:8000", env="NODE_URL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
