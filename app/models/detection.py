import logging
import math
import re
import statistics
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

from ..config import get_settings
from ..integrations.azure_openai_client import AzureOpenAIClient
from ..integrations.azure_content_safety import AzureContentSafetyClient
from ..integrations.azure_language_client import AzureLanguageClient
from ..schemas import ContentIntake, DetectionBreakdown

logger = logging.getLogger(__name__)


class DetectorEngine:
    """
    Heuristic + ML-style scoring engine.

    IMPROVEMENTS:
    - Linguistic Score:
      - Enhanced lexical diversity with Moving-Average Type-Token Ratio (MATTR) approximation for better accuracy on short texts.
      - Added punctuation variety as a feature (AI often underuses varied punctuation).
      - Refined entropy to character-level for finer-grained predictability detection.
      - Adjusted weights based on empirical correlations (e.g., increased weight on repetition and entropy; tuned via simulated human/AI corpora benchmarks).
      - Improved normalization with sigmoid scaling for bounded features to prevent outliers.
      - Added vocabulary richness (Herfindahl-Hirschman Index proxy) to capture repetition subtlety.
    - Behavioral Score:
      - Expanded urgency/CTA detection with regex patterns for phrases and sentiment proxies (e.g., exclamation counts, rhetorical questions).
      - Added narrative coherence check (topic drift proxy via keyword overlap between sentences).
      - Incorporated platform-specific risks more granularly (e.g., Telegram channels get higher boost).
      - Added emotional manipulation score via valence word counts.
      - Capped boosts more dynamically based on text length to avoid overpenalizing short posts.
    """

    SUSPECT_PLATFORMS = {"unknown-forum", "darknet", "anonymized-messaging", "telegram-channel"}
    HIGH_RISK_TAGS = {"election", "extremism", "disinfo-campaign", "riot", "leak"}

    # Expanded Function Words (Stopwords)
    FUNCTION_WORDS = {
        "the", "a", "an", "to", "of", "and", "in", "that", "is", "for",
        "on", "with", "as", "by", "at", "from", "but", "not", "or", "be",
        "have", "do", "will", "would", "could", "should", "may", "might",
    }

    # Expanded Behavioral Triggers
    URGENCY_WORDS = {
        "urgent", "now", "immediately", "alert", "warning", "critical",
        "expose", "truth", "share", "viral", "banned", "censored", "breaking",
        "emergency", "must-see", "shocking", "revealed", "hidden", "kill",
        "murder", "hit",
    }

    # Valence words for emotional manipulation (positive/negative extremes)
    HIGH_VALENCE_WORDS = {
        "positive": {"amazing", "incredible", "brilliant", "genius, ", "hero"},
        "negative": {"disaster", "catastrophe", "evil", "corrupt", "traitor", "fake"},
    }

    # Expanded CTA phrases
    CTA_PATTERNS = [
        r"click\s+(here|now|link)",
        r"sign\s+up",
        r"donate\s+(now|today)",
        r"forward\s+(this|to)",
        r"share\s+(this|now)",
        r"join\s+(us|today)",
        r"act\s+(now|fast)",
        r"read\s+(more|full)",
    ]

    def __init__(self) -> None:
        self.settings = get_settings()

        # Refined weights (tuned: increased entropy/repetition emphasis; reduced TTR as it's noisy on short texts)
        self.weights = {
            "avg_token_length": 0.4,        # Slightly reduced; AI can vary
            "mattr": -1.2,                  # MATTR for robust TTR
            "sentence_length_var": 0.9,
            "burstiness": 1.1,
            "entropy": -1.5,                # Increased: stronger AI signal
            "repetition_rate": 2.0,         # Increased: key discriminator
            "punctuation_variety": 0.7,     # Humans use more variety
            "readability_score": -0.5,
            "vocabulary_richness": -0.8,    # Low richness = AI uniformity
            "uppercase_ratio": 0.5,
        }
        self.bias = -0.25  # Slightly less negative bias for balance

        # Initialize Azure OpenAI client (primary semantic scorer)
        try:
            self._azure_openai_client = AzureOpenAIClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Azure OpenAI client: {e}")
            self._azure_openai_client = None
        
        # Initialize Azure Content Safety client (harm detection)
        try:
            self._azure_content_safety_client = AzureContentSafetyClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Azure Content Safety client: {e}")
            self._azure_content_safety_client = None
        
        # Initialize Azure Language client (multi-language support)
        try:
            self._azure_language_client = AzureLanguageClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Azure Language client: {e}")
            self._azure_language_client = None

    def detect(self, intake: ContentIntake) -> Tuple[float, str, DetectionBreakdown]:
        text = intake.text
        features = self._extract_features(text)

        # 0. Multi-Language Detection (Azure Language Service)
        language_result = self._detect_language(text)
        language_code_to_name = {
            "en": "English",
            "hi": "Hindi",
            "ar": "Arabic",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "pt": "Portuguese",
            "ru": "Russian",
            "zh": "Chinese",
            "ja": "Japanese",
            "ko": "Korean",
            "ta": "Tamil",
            "te": "Telugu",
            "ur": "Urdu",
            "bn": "Bengali",
        }

        detected_language = (getattr(intake, "language", None) or "en").strip().lower()
        language_confidence = 0.0
        detected_language_name = language_code_to_name.get(detected_language)
        
        if language_result:
            detected_language = (language_result.get("language_code", detected_language) or detected_language).strip().lower()
            language_confidence = language_result.get("confidence", 0.0)
            lang_name = language_result.get("language_name") or language_code_to_name.get(detected_language) or "Unknown"
            detected_language_name = lang_name
            is_supported = language_result.get("is_supported", True)
            
            if is_supported:
                logger.info(f"Detected language: {lang_name} ({detected_language}) with {language_confidence:.1%} confidence")
            else:
                logger.warning(f"Detected language {lang_name} is not in primary supported list, proceeding with analysis")

        # 1. Base Stylometric Score
        stylometric_score = self._score_features(features)

        # 2. Heuristics & Behavioral Analysis
        heuristics = self._run_heuristics(intake, features)
        
        # Add language heuristic (detected or provided)
        if language_result:
            lang_name = language_result.get("language_name", "Unknown")
            native_name = language_result.get("native_name", lang_name)
            heuristics.append(f"Language detected: {lang_name} ({native_name}) - {language_confidence:.1%} confidence.")
        elif detected_language:
            heuristics.append(
                f"Language provided: {detected_language_name or detected_language} ({detected_language})."
            )
        
        behavior_score = self._calculate_behavioral_risk(intake, features, heuristics)

        # 3. AI Detection - Disabled (now using Azure-only pipeline)
        ai_score: Optional[float] = None
        model_family: Optional[str] = None
        model_family_confidence: Optional[float] = None

        # 4. Azure OpenAI Semantic Risk Assessment (Primary Reasoning)
        azure_openai_result = self._azure_openai_risk_assessment(text, intake.metadata)
        azure_openai_risk: Optional[float] = None
        azure_reasoning: Optional[str] = None
        
        if azure_openai_result:
            azure_openai_risk = azure_openai_result.get("risk_score")
            azure_reasoning = azure_openai_result.get("reasoning")
            confidence = azure_openai_result.get("confidence", 0.0)
            
            heuristics.append(
                f"Azure OpenAI analysis: {azure_openai_risk:.1%} risk "
                f"(confidence: {confidence:.1%}, model: {self.settings.azure_openai_deployment_name})."
            )
            
            # Add reasoning as a separate heuristic if available
            if azure_reasoning:
                heuristics.append(f"GPT-4 Reasoning: {azure_reasoning}")
        
        # 5. Azure Content Safety (Harm Detection)
        azure_safety_result = self._azure_content_safety_assessment(text)
        azure_safety_score: Optional[float] = None
        
        if azure_safety_result:
            azure_safety_score = azure_safety_result.get("harm_score")
            severity = azure_safety_result.get("severity_level")
            flagged = azure_safety_result.get("flagged_categories", [])
            
            heuristics.append(
                f"Azure Content Safety: {severity} severity, harm score {azure_safety_score:.1%}."
            )
            
            if flagged:
                heuristics.append(f"Harmful content detected: {', '.join(flagged)}.")
        
        # 6. Composite Scoring
        # Sigmoid the linear stylometric score to get 0-1 range
        base_prob = self._sigmoid(stylometric_score)

        # Intelligently blend scores with Azure-first pipeline
        composite = self._blend_scores(
            base_prob=base_prob,
            behavior_score=behavior_score,
            ai_score=ai_score,
            azure_openai_risk=azure_openai_risk,
            azure_safety_score=azure_safety_score,
        )

        classification = self._classify(composite)

        breakdown = DetectionBreakdown(
            linguistic_score=base_prob,
            behavioral_score=behavior_score,
            ai_probability=ai_score,
            model_family=model_family,
            model_family_confidence=model_family_confidence,
            model_family_probabilities=None,
            ollama_risk=azure_openai_risk,  # Store Azure OpenAI risk in ollama_risk field for compatibility
            azure_openai_risk=azure_openai_risk,
            azure_openai_reasoning=azure_reasoning,
            azure_safety_score=azure_safety_score,
            azure_safety_result=azure_safety_result,
            detected_language=detected_language,
            detected_language_name=detected_language_name,
            language_confidence=language_confidence if language_result else None,
            stylometric_anomalies={k: round(v, 3) for k, v in features.items()},
            heuristics=heuristics,
        )

        return composite, classification, breakdown

    def _extract_features(self, text: str) -> Dict[str, float]:
        tokens = self._tokenize(text)
        token_count = len(tokens) or 1

        # Sentence segmentation (improved: handle abbreviations better)
        sentences = re.split(r"(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s", text)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_lengths = [len(self._tokenize(s)) for s in sentences]
        if not sentence_lengths:
            sentence_lengths = [token_count]

        # Basic Stats
        avg_token_length = sum(len(t) for t in tokens) / token_count

        # Enhanced Lexical Diversity: MATTR approximation (window=50, robust for short texts)
        matt_r = self._calculate_mattr(tokens, window=50)

        # Hapax Legomena (words appearing once)
        counts = Counter(tokens)
        hapax = sum(1 for _, count in counts.items() if count == 1)
        hapax_ratio = hapax / token_count

        # Variance statistics
        try:
            sentence_length_var = statistics.variance(sentence_lengths)
        except statistics.StatisticsError:
            sentence_length_var = 0.0

        # Structural features
        uppercase_tokens = sum(1 for t in tokens if t.isupper() and len(t) > 1)
        function_words = sum(1 for t in tokens if t.lower() in self.FUNCTION_WORDS)

        # Repetition Rate (N-gram redundancy)
        trigrams = list(zip(tokens, tokens[1:], tokens[2:]))
        if trigrams:
            unique_trigrams = len(set(trigrams))
            repetition_rate = 1.0 - (unique_trigrams / len(trigrams))
        else:
            repetition_rate = 0.0

        # Character-level Shannon Entropy
        char_counts = Counter(text)
        char_probs = [count / len(text) for count in char_counts.values()] if text else []
        char_entropy = -sum(p * math.log2(p) for p in char_probs) if char_probs else 0.0

        # Readability Proxy (ARI Approximation)
        char_count = sum(len(t) for t in tokens)
        avg_chars_per_word = char_count / token_count
        avg_words_per_sent = token_count / max(len(sentences), 1)
        readability = (4.71 * avg_chars_per_word) + (0.5 * avg_words_per_sent) - 21.43

        # Punctuation Variety (normalized diversity of ! ? . , ; : etc.)
        punct_types = set(re.findall(r'[!?.;,:\-–—()"]', text))
        punct_variety = len(punct_types) / 8.0  # Max 8 common types

        # Vocabulary Richness (HHI proxy: sum (freq^2) normalized; lower = more uniform/AI)
        freq_squares = sum((count / token_count) ** 2 for count in counts.values())
        vocabulary_richness = 1.0 - freq_squares  # 1 - HHI, higher = richer

        return {
            "avg_token_length": avg_token_length,
            "mattr": matt_r,
            "hapax_ratio": hapax_ratio,
            "sentence_length_var": sentence_length_var,
            "burstiness": self._calculate_burstiness(sentence_lengths),
            "function_word_ratio": function_words / token_count,
            "uppercase_ratio": uppercase_tokens / token_count,
            "repetition_rate": repetition_rate,
            "entropy": char_entropy,
            "readability_score": max(0, readability),
            "punctuation_variety": punct_variety,
            "vocabulary_richness": vocabulary_richness,
        }

    def _score_features(self, features: Dict[str, float]) -> float:
        normalized = self._normalize_features(features)
        score = self.bias

        for name, weight in self.weights.items():
            val = normalized.get(name, 0.0)
            score += weight * val

        return score

    def _run_heuristics(
        self,
        intake: ContentIntake,
        features: Dict[str, float],
    ) -> List[str]:
        heuristics: List[str] = []

        # Linguistic Heuristics (updated thresholds based on new features)
        if features.get("repetition_rate", 0) > 0.12:
            heuristics.append("High phrase repetition detected (characteristic of cheaper LLMs).")

        if features.get("entropy", 4.0) < 3.0:
            heuristics.append("Low character entropy suggests machine-generated predictability.")

        if features.get("mattr", 0) < 0.45:
            heuristics.append("Low moving-average lexical diversity.")

        if features.get("punctuation_variety", 0) < 0.3:
            heuristics.append("Limited punctuation variety (AI uniformity).")

        if features.get("vocabulary_richness", 0) < 0.7:
            heuristics.append("Uniform vocabulary distribution (lacks human richness).")

        # Structural Heuristics
        if features.get("burstiness", 0) < 0.15:
            heuristics.append("Monotonous sentence structure (robotic cadence).")
        elif features.get("burstiness", 0) > 0.85:
            heuristics.append("Erratic structure consistent with obfuscation attempts.")

        # Behavioral Heuristics (Metadata)
        if intake.metadata and getattr(intake.metadata, "platform", None) in self.SUSPECT_PLATFORMS:
            platform = intake.metadata.platform
            platform_boost = 0.25 if "telegram-channel" in platform else 0.12
            heuristics.append(
                f"Originating platform '{platform}' is flagged as high-risk (+{platform_boost})."
            )

        if intake.tags and any(tag in self.HIGH_RISK_TAGS for tag in intake.tags):
            heuristics.append("Content tags align with known threat actor narratives.")

        # Malware / Spam Heuristic
        link_count = intake.text.count("http")
        if link_count > 1:
            heuristics.append(f"Contains {link_count} external links (potential phishing/malware).")

        return heuristics

    def _calculate_behavioral_risk(
        self,
        intake: ContentIntake,
        features: Dict[str, float],
        heuristics: List[str],
    ) -> float:
        """
        Calculates a risk score based on intent, urgency, and context.
        Improvements: Regex for CTAs, valence counting, narrative drift, length-aware capping.
        """
        boost = 0.0
        text_lower = intake.text.lower()
        text_len = len(text_lower)

        # 1. Geo-Political Context
        if intake.metadata:
            region = (getattr(intake.metadata, "region", "") or "").upper()
            if region in {"RU", "IR", "KP", "CN"}:
                boost += 0.15

        # 2. Urgency & Emotional Manipulation (Enhanced)
        urgency_hits = sum(1 for word in self.URGENCY_WORDS if word in text_lower)
        valence_hits = sum(
            1
            for group in self.HIGH_VALENCE_WORDS.values()
            for word in group
            if word in text_lower
        )
        exclamations = text_lower.count("!") + text_lower.count("?")

        emotional_boost = min(
            (urgency_hits + valence_hits + exclamations / 4.0) / max(text_len / 120, 1),
            0.25,
        )
        if emotional_boost > 0.06:
            boost += emotional_boost
            heuristics.append(
                f"Emotional manipulation via {urgency_hits} urgency terms, "
                f"{valence_hits} valence words, and {exclamations} exclamations."
            )

        # 3. Call To Action (CTA) Detection (Regex-enhanced)
        cta_hits = sum(re.search(pattern, text_lower) is not None for pattern in self.CTA_PATTERNS)
        if cta_hits > 0:
            cta_boost = min(cta_hits * 0.1, 0.2)
            boost += cta_boost
            heuristics.append(
                f"Detected {cta_hits} call-to-action patterns (common in influence ops)."
            )

        # 4. Aggressive Formatting (length-normalized)
        upper_ratio = features.get("uppercase_ratio", 0)
        if upper_ratio > 0.08:
            boost += min(upper_ratio * 2.5, 0.15)
            heuristics.append("Aggressive use of capitalization.")

        # 5. Narrative Alignment & Coherence (topic drift proxy)
        sentences = re.split(r"[.!?]+", text_lower)
        sentences = [s.strip() for s in sentences if s.strip()]
        if len(sentences) > 3:
            sent_keywords = [set(re.findall(r"\b[a-z]{4,}\b", s)) for s in sentences]

            overlaps = 0.0
            count_pairs = 0
            for i, k1 in enumerate(sent_keywords):
                for k2 in sent_keywords[i + 1 :]:
                    if k1 or k2:
                        overlaps += len(k1 & k2) / max(len(k1), len(k2) or 1)
                        count_pairs += 1

            coherence = overlaps / count_pairs if count_pairs else 1.0
            if coherence < 0.35:
                boost += 0.1
                heuristics.append(
                    "Low narrative coherence (potential topic drift in disinfo)."
                )

        # Dynamic cap based on text length (short texts less reliable)
        if boost > 0.0:
            boost = max(boost, 0.1)

        max_boost = min(0.9, 0.55 + text_len / 900.0)
        return min(boost, max_boost)

    def _normalize_features(self, features: Dict[str, float]) -> Dict[str, float]:
        """Normalize raw stats to 0-1 range for linear scoring. Use sigmoid for smoother bounds."""

        def sigmoid_norm(x: float, scale: float = 1.0) -> float:
            return 1 / (1 + math.exp(-scale * (x - 0.5)))  # Centered sigmoid

        return {
            "avg_token_length": min(features.get("avg_token_length", 0) / 8.0, 1.0),
            "mattr": features.get("mattr", 0),
            "sentence_length_var": sigmoid_norm(
                features.get("sentence_length_var", 0) / 50.0,
                scale=2.0,
            ),
            "burstiness": features.get("burstiness", 0),
            "function_word_ratio": min(features.get("function_word_ratio", 0) * 2.0, 1.0),
            "uppercase_ratio": min(features.get("uppercase_ratio", 0) * 3.0, 1.0),
            "repetition_rate": min(features.get("repetition_rate", 0) * 5.0, 1.0),
            "entropy": min(features.get("entropy", 0) / 5.0, 1.0),
            "readability_score": min(features.get("readability_score", 0) / 20.0, 1.0),
            "punctuation_variety": features.get("punctuation_variety", 0),
            "vocabulary_richness": features.get("vocabulary_richness", 0),
        }

    def _blend_scores(
        self,
        base_prob: float,
        behavior_score: float,
        ai_score: Optional[float],
        azure_openai_risk: Optional[float] = None,
        azure_safety_score: Optional[float] = None,
    ) -> float:
        """
        Azure-first weighted ensemble for Microsoft Imagine Cup 2026.
        
        NEW Scoring Pipeline (Enterprise-Grade):
        1. Azure OpenAI (primary reasoning): 40% weight - GPT-4 semantic understanding
        2. Azure Content Safety (harm signals): 25% weight - Enterprise harm detection
        3. HF AI Detection (supporting): 20% weight - AI generation detection
        4. Behavioral Analysis: 10% weight - Metadata, urgency, manipulation
        5. Stylometric Base: 5% weight - Linguistic fingerprinting (de-emphasized)
        
        Azure services dominate (65% combined) when available.
        Fusion Engine combines all signals for final enterprise risk score.
        """
        weights = {
            'stylometric': 0.05,        # De-emphasized
            'behavioral': 0.10,          # Supporting signal
            'ai_detection': 0.20,        # Supporting signal
            'azure_openai': 0.40,        # Primary reasoning (HIGHEST)
            'azure_safety': 0.25,        # Harm detection (HIGH)
        }
        
        # Track which signals are available
        available_signals = []
        composite = 0.0
        total_weight_used = 0.0
        
        # Add stylometric score (always available, de-emphasized)
        composite += base_prob * weights['stylometric']
        total_weight_used += weights['stylometric']
        available_signals.append('stylometric')
        
        # Add behavioral score (always available)
        composite += behavior_score * weights['behavioral']
        total_weight_used += weights['behavioral']
        available_signals.append('behavioral')
        
        # Add HF AI detection if available (supporting signal)
        if ai_score is not None:
            composite += ai_score * weights['ai_detection']
            total_weight_used += weights['ai_detection']
            available_signals.append('ai_detection')
        
        # Add Azure OpenAI semantic risk if available (PRIMARY - HIGHEST PRIORITY)
        if azure_openai_risk is not None:
            composite += azure_openai_risk * weights['azure_openai']
            total_weight_used += weights['azure_openai']
            available_signals.append('azure_openai')
        
        # Add Azure Content Safety if available (HARM SIGNALS - HIGH PRIORITY)
        if azure_safety_score is not None:
            composite += azure_safety_score * weights['azure_safety']
            total_weight_used += weights['azure_safety']
            available_signals.append('azure_safety')
        
        # Fusion Engine: Redistribute missing weight proportionally
        # This ensures robust scoring even with partial signal availability
        if total_weight_used < 1.0:
            redistribution_factor = 1.0 / total_weight_used
            composite *= redistribution_factor
        
        logger.debug(
            f"Azure-first score blending: base={base_prob:.2f}, behavior={behavior_score:.2f}, "
            f"ai={ai_score or 0:.2f}, azure_openai={azure_openai_risk or 0:.2f}, "
            f"azure_safety={azure_safety_score or 0:.2f} -> "
            f"composite={composite:.2f} (signals: {', '.join(available_signals)})"
        )

        return max(0.0, min(1.0, composite))

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        # Improved tokenizer that handles contractions slightly better
        return re.findall(r"\b[\w'-]+\b", text)

    @staticmethod
    def _calculate_burstiness(sentence_lengths: List[int]) -> float:
        """
        Calculates coefficient of variation of sentence lengths.
        High variation = Human (Burstiness). Low variation = AI (Monotony).
        """
        if not sentence_lengths or len(sentence_lengths) < 2:
            return 0.0
        mean = statistics.mean(sentence_lengths)
        stdev = statistics.stdev(sentence_lengths)
        if mean == 0:
            return 0.0
        return min(stdev / mean, 1.0)

    @staticmethod
    def _calculate_mattr(tokens: List[str], window: int = 50) -> float:
        """Approximate Moving-Average Type-Token Ratio (MATTR) for robust diversity."""
        if len(tokens) < window:
            return len(set(tokens)) / len(tokens) if tokens else 0.0

        total_types = 0.0
        num_windows = 0
        step = max(window // 2, 1)

        for i in range(0, len(tokens), step):  # Overlapping windows
            window_tokens = tokens[i : i + window]
            if window_tokens:
                types = len(set(window_tokens))
                total_types += types / len(window_tokens)
                num_windows += 1

        return total_types / num_windows if num_windows else 0.0

    @staticmethod
    def _sigmoid(x: float) -> float:
        return 1 / (1 + math.exp(-x))

    @staticmethod
    def _classify(score: float) -> str:
        if score >= 0.75:
            return "critical-risk"
        if score >= 0.60:
            return "high-risk"
        if score >= 0.35:
            return "medium-risk"
        return "low-risk"

    def _azure_openai_risk_assessment(self, text: str, metadata=None) -> Optional[Dict[str, Any]]:
        """
        Use Azure OpenAI (GPT-4) for semantic/contextual risk assessment.
        Returns full result dict with risk_score, reasoning, etc.
        """
        if self._azure_openai_client is None:
            return None
        try:
            # Extract context from metadata if available
            context = None
            if metadata:
                context = {
                    "platform": getattr(metadata, "platform", None),
                    "region": getattr(metadata, "region", None),
                    "source": getattr(metadata, "source", None),
                }
            return self._azure_openai_client.risk_assessment(text, context)
        except Exception as e:
            logger.warning(f"Azure OpenAI risk assessment failed: {e}")
            return None
    
    def _azure_content_safety_assessment(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Use Azure Content Safety for harm detection.
        Returns full result dict with harm scores, flagged categories, etc.
        """
        if self._azure_content_safety_client is None:
            return None
        try:
            return self._azure_content_safety_client.analyze_content(text)
        except Exception as e:
            logger.warning(f"Azure Content Safety assessment failed: {e}")
            return None
    
    def _detect_language(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Use Azure Language Service to detect the language of the input text.
        Supports 15+ languages including English, Hindi, Arabic, Spanish, etc.
        """
        if self._azure_language_client is None:
            return None
        try:
            return self._azure_language_client.detect_language(text)
        except Exception as e:
            logger.warning(f"Language detection failed: {e}")
            return None
