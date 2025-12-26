"""
Azure AI Language integration for multi-language support.
Provides language detection and optional translation for 15+ languages.
Supports: English, Hindi, Arabic, Spanish, French, German, Portuguese, 
Russian, Chinese, Japanese, Korean, Tamil, Telugu, Urdu, Bengali.
"""
from __future__ import annotations

import logging
from typing import Optional, Dict, Any, List

try:
    from azure.ai.textanalytics import TextAnalyticsClient
    from azure.core.credentials import AzureKeyCredential
    AZURE_LANGUAGE_AVAILABLE = True
except ImportError:
    AZURE_LANGUAGE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(
        "Azure AI Text Analytics library not installed. "
        "Install with: pip install azure-ai-textanalytics"
    )

from ..config import get_settings

logger = logging.getLogger(__name__)


# Supported languages with their ISO 639-1 codes and display names
SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English"},
    "hi": {"name": "Hindi", "native": "हिन्दी"},
    "ar": {"name": "Arabic", "native": "العربية"},
    "es": {"name": "Spanish", "native": "Español"},
    "fr": {"name": "French", "native": "Français"},
    "de": {"name": "German", "native": "Deutsch"},
    "pt": {"name": "Portuguese", "native": "Português"},
    "ru": {"name": "Russian", "native": "Русский"},
    "zh": {"name": "Chinese", "native": "中文"},
    "ja": {"name": "Japanese", "native": "日本語"},
    "ko": {"name": "Korean", "native": "한국어"},
    "ta": {"name": "Tamil", "native": "தமிழ்"},
    "te": {"name": "Telugu", "native": "తెలుగు"},
    "ur": {"name": "Urdu", "native": "اردو"},
    "bn": {"name": "Bengali", "native": "বাংলা"},
}


class AzureLanguageClient:
    """
    Azure AI Language client for multi-language processing.
    
    Features:
    - Language detection for 15+ languages
    - Sentiment analysis (per-language)
    - Key phrase extraction
    - Named entity recognition
    
    Enables TattvaDrishti to analyze disinformation in multiple languages
    without requiring translation preprocessing.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.available = AZURE_LANGUAGE_AVAILABLE and self.settings.azure_language_enabled
        self.client: Optional[TextAnalyticsClient] = None
        
        if not AZURE_LANGUAGE_AVAILABLE and self.settings.azure_language_enabled:
            logger.error(
                "Azure Language is enabled in config but the library is not installed. "
                "Run: pip install azure-ai-textanalytics"
            )
            return
        
        if self.available:
            try:
                # Initialize Text Analytics client
                self.client = TextAnalyticsClient(
                    endpoint=self.settings.azure_language_endpoint,
                    credential=AzureKeyCredential(self.settings.azure_language_key)
                )
                logger.info("Azure Language client initialized successfully")
            except Exception as e:
                logger.warning(f"Azure Language client initialization failed: {e}")
                self.available = False

    def detect_language(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Detect the language of the input text.
        
        Args:
            text: Content to analyze (will be truncated to 5120 chars)
        
        Returns:
            Dictionary with:
            - language_code: ISO 639-1 language code (e.g., 'en', 'hi')
            - language_name: Full language name
            - confidence: Detection confidence (0.0-1.0)
            - is_supported: Whether language is in our supported list
            - native_name: Native script name of the language
        """
        if not self.available or not self.client:
            logger.warning("Azure Language client not available")
            return None
        
        # Truncate if necessary (Azure limit is 5120 characters for language detection)
        if len(text) > 5120:
            text = text[:5120]
        
        try:
            # Call Azure Language Detection API
            response = self.client.detect_language(documents=[text])
            
            if not response or not response[0]:
                return None
            
            result = response[0]
            
            if result.is_error:
                logger.warning(f"Language detection error: {result.error}")
                return None
            
            primary_lang = result.primary_language
            lang_code = primary_lang.iso6391_name
            
            # Check if language is in our supported list
            is_supported = lang_code in SUPPORTED_LANGUAGES
            lang_info = SUPPORTED_LANGUAGES.get(lang_code, {})
            
            detection_result = {
                "language_code": lang_code,
                "language_name": primary_lang.name,
                "confidence": primary_lang.confidence_score,
                "is_supported": is_supported,
                "native_name": lang_info.get("native", primary_lang.name),
            }
            
            logger.info(
                f"Language detected: {primary_lang.name} ({lang_code}) "
                f"with {primary_lang.confidence_score:.1%} confidence"
            )
            
            return detection_result
            
        except Exception as e:
            logger.warning(f"Language detection failed: {e}")
            return None

    def analyze_sentiment(self, text: str, language: str = "en") -> Optional[Dict[str, Any]]:
        """
        Analyze sentiment of the text (supports multilingual input).
        
        Args:
            text: Content to analyze
            language: ISO 639-1 language code
        
        Returns:
            Dictionary with:
            - sentiment: 'positive', 'negative', 'neutral', or 'mixed'
            - confidence_scores: dict with positive, neutral, negative scores
            - sentences: list of per-sentence sentiment analysis
        """
        if not self.available or not self.client:
            return None
        
        # Truncate if necessary
        if len(text) > 5120:
            text = text[:5120]
        
        try:
            response = self.client.analyze_sentiment(
                documents=[{"id": "1", "text": text, "language": language}]
            )
            
            if not response or not response[0]:
                return None
            
            result = response[0]
            
            if result.is_error:
                logger.warning(f"Sentiment analysis error: {result.error}")
                return None
            
            sentiment_result = {
                "sentiment": result.sentiment,
                "confidence_scores": {
                    "positive": result.confidence_scores.positive,
                    "neutral": result.confidence_scores.neutral,
                    "negative": result.confidence_scores.negative,
                },
                "sentences": [
                    {
                        "text": s.text[:100] + "..." if len(s.text) > 100 else s.text,
                        "sentiment": s.sentiment,
                        "confidence": {
                            "positive": s.confidence_scores.positive,
                            "neutral": s.confidence_scores.neutral,
                            "negative": s.confidence_scores.negative,
                        }
                    }
                    for s in result.sentences[:5]  # Limit to first 5 sentences
                ]
            }
            
            return sentiment_result
            
        except Exception as e:
            logger.warning(f"Sentiment analysis failed: {e}")
            return None

    def extract_key_phrases(self, text: str, language: str = "en") -> Optional[List[str]]:
        """
        Extract key phrases from the text.
        
        Args:
            text: Content to analyze
            language: ISO 639-1 language code
        
        Returns:
            List of key phrases (max 20)
        """
        if not self.available or not self.client:
            return None
        
        if len(text) > 5120:
            text = text[:5120]
        
        try:
            response = self.client.extract_key_phrases(
                documents=[{"id": "1", "text": text, "language": language}]
            )
            
            if not response or not response[0]:
                return None
            
            result = response[0]
            
            if result.is_error:
                logger.warning(f"Key phrase extraction error: {result.error}")
                return None
            
            return result.key_phrases[:20]  # Limit to top 20
            
        except Exception as e:
            logger.warning(f"Key phrase extraction failed: {e}")
            return None

    def recognize_entities(self, text: str, language: str = "en") -> Optional[List[Dict[str, Any]]]:
        """
        Recognize named entities in the text.
        
        Args:
            text: Content to analyze
            language: ISO 639-1 language code
        
        Returns:
            List of entities with text, category, subcategory, confidence
        """
        if not self.available or not self.client:
            return None
        
        if len(text) > 5120:
            text = text[:5120]
        
        try:
            response = self.client.recognize_entities(
                documents=[{"id": "1", "text": text, "language": language}]
            )
            
            if not response or not response[0]:
                return None
            
            result = response[0]
            
            if result.is_error:
                logger.warning(f"Entity recognition error: {result.error}")
                return None
            
            entities = [
                {
                    "text": entity.text,
                    "category": entity.category,
                    "subcategory": entity.subcategory,
                    "confidence": entity.confidence_score,
                }
                for entity in result.entities[:30]  # Limit to top 30
            ]
            
            return entities
            
        except Exception as e:
            logger.warning(f"Entity recognition failed: {e}")
            return None

    def full_analysis(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Perform comprehensive language analysis:
        1. Detect language
        2. Analyze sentiment (in detected language)
        3. Extract key phrases
        4. Recognize entities
        
        Args:
            text: Content to analyze
        
        Returns:
            Complete analysis result with all features
        """
        if not self.available or not self.client:
            return None
        
        result = {}
        
        # Step 1: Detect language
        lang_result = self.detect_language(text)
        if lang_result:
            result["language"] = lang_result
            detected_lang = lang_result.get("language_code", "en")
        else:
            detected_lang = "en"
            result["language"] = {"language_code": "en", "confidence": 0.0}
        
        # Step 2: Sentiment analysis (in detected language)
        sentiment = self.analyze_sentiment(text, detected_lang)
        if sentiment:
            result["sentiment"] = sentiment
        
        # Step 3: Key phrase extraction
        key_phrases = self.extract_key_phrases(text, detected_lang)
        if key_phrases:
            result["key_phrases"] = key_phrases
        
        # Step 4: Entity recognition
        entities = self.recognize_entities(text, detected_lang)
        if entities:
            result["entities"] = entities
        
        return result if result else None


def get_supported_languages() -> Dict[str, Dict[str, str]]:
    """Return the list of supported languages with their info."""
    return SUPPORTED_LANGUAGES.copy()
