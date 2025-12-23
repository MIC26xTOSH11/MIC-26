"""
Azure AI Content Safety integration for harm and manipulation detection.
Provides enterprise-grade content moderation and safety signals.
"""
from __future__ import annotations

import logging
from typing import Optional, Dict, Any, List

try:
    from azure.ai.contentsafety import ContentSafetyClient
    from azure.ai.contentsafety.models import AnalyzeTextOptions, TextCategory
    from azure.core.credentials import AzureKeyCredential
    AZURE_CONTENT_SAFETY_AVAILABLE = True
except ImportError:
    AZURE_CONTENT_SAFETY_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(
        "Azure Content Safety library not installed. "
        "Install with: pip install azure-ai-contentsafety"
    )

from ..config import get_settings

logger = logging.getLogger(__name__)


class AzureContentSafetyClient:
    """
    Azure AI Content Safety client for detecting harmful content.
    
    Analyzes content across multiple harm categories:
    - Hate: Discriminatory or hateful content
    - SelfHarm: Content promoting self-injury
    - Sexual: Sexually explicit content
    - Violence: Violent or graphic content
    
    Returns severity scores (0-6 scale) for each category.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.available = AZURE_CONTENT_SAFETY_AVAILABLE and self.settings.azure_content_safety_enabled
        self.client: Optional[ContentSafetyClient] = None
        
        if not AZURE_CONTENT_SAFETY_AVAILABLE and self.settings.azure_content_safety_enabled:
            logger.error(
                "Azure Content Safety is enabled in config but the library is not installed. "
                "Run: pip install azure-ai-contentsafety"
            )
            return
        
        if self.available:
            try:
                # Initialize Content Safety client
                self.client = ContentSafetyClient(
                    endpoint=self.settings.azure_content_safety_endpoint,
                    credential=AzureKeyCredential(self.settings.azure_content_safety_key)
                )
                logger.info("Azure Content Safety client initialized successfully")
            except Exception as e:
                logger.warning(f"Azure Content Safety client initialization failed: {e}")
                self.available = False

    def analyze_content(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Analyze content for harm signals across multiple categories.
        
        Args:
            text: Content to analyze (max 10,000 characters)
        
        Returns:
            Dictionary with:
            - harm_score: float 0.0-1.0 (normalized composite harm level)
            - category_scores: dict of individual category scores
            - severity_level: str categorical assessment
            - flagged_categories: list of categories exceeding thresholds
            - raw_response: full API response for debugging
        """
        if not self.available or not self.client:
            logger.warning("Azure Content Safety client not available")
            return None
        
        # Truncate if necessary (Azure limit is 10k characters)
        if len(text) > 10000:
            text = text[:10000]
            logger.debug("Text truncated to 10,000 characters for Content Safety analysis")
        
        try:
            # Prepare request
            request = AnalyzeTextOptions(text=text)
            
            # Call Azure Content Safety API
            response = self.client.analyze_text(request)
            
            # Extract category results
            category_scores = {}
            max_severity = 0
            flagged_categories = []
            
            if hasattr(response, 'categories_analysis'):
                for result in response.categories_analysis:
                    category_name = result.category.lower()
                    severity = result.severity
                    
                    # Normalize severity (0-6 scale) to 0-1
                    normalized_score = severity / 6.0
                    category_scores[category_name] = {
                        "severity": severity,
                        "score": normalized_score
                    }
                    
                    # Track maximum severity
                    max_severity = max(max_severity, severity)
                    
                    # Flag if severity >= 2 (moderate or higher)
                    if severity >= 2:
                        flagged_categories.append(category_name)
            
            # Calculate composite harm score (weighted average with emphasis on max)
            if category_scores:
                avg_score = sum(cat["score"] for cat in category_scores.values()) / len(category_scores)
                max_score = max(cat["score"] for cat in category_scores.values())
                # Weighted: 60% max severity, 40% average
                harm_score = (0.6 * max_score) + (0.4 * avg_score)
            else:
                harm_score = 0.0
            
            # Determine severity level
            if max_severity >= 4:
                severity_level = "critical"
            elif max_severity >= 2:
                severity_level = "high"
            elif max_severity >= 1:
                severity_level = "medium"
            else:
                severity_level = "low"
            
            result = {
                "harm_score": harm_score,
                "category_scores": category_scores,
                "severity_level": severity_level,
                "flagged_categories": flagged_categories,
                "max_severity": max_severity,
                "raw_response": {
                    "categories_analysis": [
                        {
                            "category": r.category,
                            "severity": r.severity
                        }
                        for r in response.categories_analysis
                    ] if hasattr(response, 'categories_analysis') else []
                }
            }
            
            logger.info(
                f"Azure Content Safety analysis: harm_score={harm_score:.2%}, "
                f"severity={severity_level}, flagged={len(flagged_categories)} categories"
            )
            
            return result
            
        except Exception as e:
            logger.warning(f"Azure Content Safety analysis failed: {e}")
            return None

    def check_blocklist(self, text: str, blocklist_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Check if content matches custom blocklists (if configured).
        
        Args:
            text: Content to check
            blocklist_name: Optional specific blocklist to check
        
        Returns:
            Dictionary with blocklist match information
        """
        if not self.available or not self.client:
            return None
        
        # This would require blocklist setup in Azure portal
        # Placeholder for future implementation
        logger.debug("Blocklist checking not yet implemented")
        return None

    def analyze_image(self, image_data: bytes) -> Optional[Dict[str, Any]]:
        """
        Analyze image content for harmful material.
        
        Args:
            image_data: Binary image data (JPEG, PNG, etc.)
        
        Returns:
            Similar structure to analyze_content for images
        """
        if not self.available or not self.client:
            return None
        
        try:
            # Note: Image analysis uses different API endpoint
            # Would require AnalyzeImageOptions
            logger.debug("Image analysis not yet fully implemented")
            return None
            
        except Exception as e:
            logger.warning(f"Azure Content Safety image analysis failed: {e}")
            return None

    def get_harm_summary(self, analysis_result: Dict[str, Any]) -> str:
        """
        Generate human-readable summary of harm analysis.
        
        Args:
            analysis_result: Result from analyze_content
        
        Returns:
            Formatted summary string
        """
        if not analysis_result:
            return "No harm analysis available."
        
        harm_score = analysis_result.get("harm_score", 0.0)
        severity = analysis_result.get("severity_level", "low")
        flagged = analysis_result.get("flagged_categories", [])
        
        if not flagged:
            return f"Content Safety: {severity} risk, no harmful content detected."
        
        flagged_str = ", ".join(flagged)
        return (
            f"Content Safety: {severity} risk ({harm_score:.0%}). "
            f"Flagged categories: {flagged_str}."
        )

    def calculate_risk_boost(self, analysis_result: Optional[Dict[str, Any]]) -> float:
        """
        Calculate risk boost factor based on Content Safety analysis.
        
        Args:
            analysis_result: Result from analyze_content
        
        Returns:
            Multiplicative boost factor (1.0 = no boost, higher = more risk)
        """
        if not analysis_result:
            return 1.0
        
        harm_score = analysis_result.get("harm_score", 0.0)
        max_severity = analysis_result.get("max_severity", 0)
        
        # Calculate boost based on severity
        if max_severity >= 4:
            # Critical severity: strong boost
            boost = 1.0 + (harm_score * 0.5)  # Up to 1.5x boost
        elif max_severity >= 2:
            # High severity: moderate boost
            boost = 1.0 + (harm_score * 0.3)  # Up to 1.3x boost
        else:
            # Low/medium: minimal boost
            boost = 1.0 + (harm_score * 0.1)  # Up to 1.1x boost
        
        return min(boost, 1.5)  # Cap at 1.5x


# Convenience function for quick checks
def quick_safety_check(text: str) -> bool:
    """
    Quick safety check - returns True if content appears safe.
    
    Args:
        text: Content to check
    
    Returns:
        True if safe, False if harmful content detected
    """
    client = AzureContentSafetyClient()
    if not client.available:
        # If client unavailable, default to safe (fail open)
        return True
    
    result = client.analyze_content(text)
    if not result:
        return True
    
    # Consider unsafe if any category is severity >= 2
    max_severity = result.get("max_severity", 0)
    return max_severity < 2
