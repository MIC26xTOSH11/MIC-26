"""
Azure OpenAI client for semantic risk assessment and reasoning.
Replaces Ollama as the primary semantic scorer for Microsoft Imagine Cup 2026.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Optional, Dict, Any

try:
    from openai import AzureOpenAI
    AZURE_OPENAI_AVAILABLE = True
except ImportError:
    AZURE_OPENAI_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Azure OpenAI library not installed. Install with: pip install openai")

from ..config import get_settings

logger = logging.getLogger(__name__)


class AzureOpenAIClient:
    """
    Azure OpenAI wrapper for qualitative risk scoring and semantic analysis.
    Uses GPT-4.1 or GPT-4o-mini for enterprise-grade disinformation detection.
    Provides reasoning capabilities superior to local models.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.available = AZURE_OPENAI_AVAILABLE and self.settings.azure_openai_enabled
        self.client: Optional[AzureOpenAI] = None
        
        if not AZURE_OPENAI_AVAILABLE and self.settings.azure_openai_enabled:
            logger.error(
                "Azure OpenAI is enabled in config but the library is not installed. "
                "Run: pip install openai"
            )
            return
        
        if self.available:
            try:
                # Initialize Azure OpenAI client
                self.client = AzureOpenAI(
                    api_key=self.settings.azure_openai_key,
                    api_version=self.settings.azure_openai_api_version,
                    azure_endpoint=self.settings.azure_openai_endpoint
                )
                logger.info(
                    f"Azure OpenAI client initialized successfully with deployment: "
                    f"{self.settings.azure_openai_deployment_name}"
                )
            except Exception as e:
                logger.warning(f"Azure OpenAI client initialization failed: {e}")
                self.available = False

    def risk_assessment(self, text: str, context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Analyze text for disinformation risk using Azure OpenAI GPT-4.
        
        Args:
            text: Content to analyze
            context: Optional metadata context (platform, region, etc.)
        
        Returns:
            Dictionary with:
            - risk_score: float between 0.0 and 1.0
            - reasoning: str explaining the assessment
            - risk_factors: list of identified risk indicators
            - confidence: float indicating model confidence
        """
        if not self.available or not self.client:
            logger.warning("Azure OpenAI client not available")
            return None
        
        # Truncate/sample text if too long (GPT-4 context window consideration)
        limit = self.settings.azure_openai_max_chars
        if len(text) <= limit:
            snippet = text
        else:
            # Take beginning and end to preserve context
            head = text[: limit // 2]
            tail = text[-(limit // 2) :]
            snippet = f"{head}\n\n[... content truncated ...]\n\n{tail}"
        
        # Build prompt with context
        prompt = self._build_prompt(snippet, context)
        
        try:
            # Call Azure OpenAI with structured output preference
            response = self.client.chat.completions.create(
                model=self.settings.azure_openai_deployment_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert counter-disinformation analyst with deep knowledge of "
                            "information operations, manipulation tactics, and content authenticity assessment. "
                            "Provide precise, evidence-based risk assessments with clear reasoning."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower temperature for consistent, analytical responses
                max_tokens=800,   # Sufficient for detailed analysis
                response_format={"type": "json_object"}  # Request JSON response
            )
            
            if not response.choices:
                logger.warning("Azure OpenAI returned empty response")
                return None
            
            output = response.choices[0].message.content.strip()
            logger.debug(f"Azure OpenAI raw response (first 300 chars): {output[:300]}")
            
            # Parse the response
            result = self._parse_response(output)
            
            if result:
                logger.info(
                    f"Azure OpenAI risk assessment: {result['risk_score']:.2%} "
                    f"(confidence: {result.get('confidence', 0):.2%}, "
                    f"model: {self.settings.azure_openai_deployment_name})"
                )
            
            return result
            
        except Exception as e:
            logger.warning(f"Azure OpenAI risk assessment failed: {e}")
            return None

    def _build_prompt(self, snippet: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Construct a detailed prompt for risk assessment with optional context."""
        context_info = ""
        if context:
            platform = context.get("platform", "unknown")
            region = context.get("region", "unknown")
            source = context.get("source", "unknown")
            context_info = f"\n\nContext:\n- Platform: {platform}\n- Region: {region}\n- Source: {source}"
        
        return f"""Analyze the following content for disinformation and manipulation risks. Assess:

1. **Misinformation & False Claims**: Factual accuracy, verifiability
2. **Manipulation Tactics**: Emotional manipulation, urgency, fear-mongering, outrage
3. **Coordinated Influence**: Signs of coordinated campaigns, bot-like patterns
4. **Malicious Intent**: Phishing, scams, propaganda, radicalization
5. **Narrative Authenticity**: Consistency, credibility, source reliability
{context_info}

Content to analyze:
```
{snippet}
```

Respond with a JSON object in this exact format:
{{
  "risk_score": 0.0,
  "confidence": 0.0,
  "reasoning": "Detailed explanation of the assessment",
  "risk_factors": ["factor1", "factor2", "factor3"],
  "severity": "low|medium|high|critical"
}}

Where:
- risk_score: float 0.0-1.0 (0=no risk, 1=critical risk)
- confidence: float 0.0-1.0 (how certain you are)
- reasoning: clear, evidence-based explanation (2-3 sentences)
- risk_factors: list of specific indicators found (max 5)
- severity: categorical assessment

JSON response:"""

    def _parse_response(self, output: str) -> Optional[Dict[str, Any]]:
        """Extract structured data from Azure OpenAI response."""
        try:
            # Try direct JSON parsing
            data = json.loads(output)
            
            # Validate and extract fields
            risk_score = float(data.get("risk_score", 0.0))
            confidence = float(data.get("confidence", 0.8))  # Default high confidence
            reasoning = data.get("reasoning", "No reasoning provided")
            risk_factors = data.get("risk_factors", [])
            severity = data.get("severity", "low")
            
            # Ensure risk_score is in valid range
            risk_score = max(0.0, min(1.0, risk_score))
            confidence = max(0.0, min(1.0, confidence))
            
            return {
                "risk_score": risk_score,
                "confidence": confidence,
                "reasoning": reasoning,
                "risk_factors": risk_factors if isinstance(risk_factors, list) else [],
                "severity": severity
            }
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse Azure OpenAI response as JSON")
            
            # Fallback: Try to extract risk score with regex
            match = re.search(r'"?risk_score"?\s*:\s*([0-9]*\.?[0-9]+)', output, re.IGNORECASE)
            if match:
                try:
                    risk_score = float(match.group(1))
                    risk_score = max(0.0, min(1.0, risk_score))
                    
                    # Try to extract reasoning
                    reasoning_match = re.search(
                        r'"?reasoning"?\s*:\s*"([^"]+)"',
                        output,
                        re.IGNORECASE
                    )
                    reasoning = reasoning_match.group(1) if reasoning_match else "Parsed from fallback"
                    
                    return {
                        "risk_score": risk_score,
                        "confidence": 0.7,  # Lower confidence for fallback parsing
                        "reasoning": reasoning,
                        "risk_factors": [],
                        "severity": "medium"
                    }
                except (ValueError, TypeError):
                    pass
        
        except Exception as e:
            logger.error(f"Error parsing Azure OpenAI response: {e}")
        
        return None

    def batch_risk_assessment(self, texts: list[str]) -> list[Optional[Dict[str, Any]]]:
        """
        Perform risk assessment on multiple texts.
        For future optimization with batch API endpoints.
        """
        results = []
        for text in texts:
            result = self.risk_assessment(text)
            results.append(result)
        return results
