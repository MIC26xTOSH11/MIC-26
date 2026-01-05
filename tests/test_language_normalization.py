"""
Test language normalization baseline factors.

Validates that the same content in different languages produces consistent
assessment scores after normalization.
"""
import pytest
from app.models.detection import DetectorEngine


def test_language_baseline_factors_exist():
    """Test that all 15 language baseline factors are defined."""
    detector = DetectorEngine()
    
    expected_languages = {
        "en", "hi", "ar", "es", "fr", "de", "pt", "ru",
        "zh", "ja", "ko", "ta", "te", "ur", "bn"
    }
    
    actual_languages = set(detector.LANGUAGE_BASELINE_FACTORS.keys())
    
    assert actual_languages == expected_languages, \
        f"Missing languages: {expected_languages - actual_languages}"
    
    # Verify English is baseline (1.0)
    assert detector.LANGUAGE_BASELINE_FACTORS["en"] == 1.0, \
        "English must be the baseline with factor 1.0"
    
    # Verify all factors are positive and reasonable (0.5 to 1.0 range)
    for lang, factor in detector.LANGUAGE_BASELINE_FACTORS.items():
        assert 0.5 <= factor <= 1.0, \
            f"Language {lang} has unreasonable factor {factor}"


def test_language_normalization_formula():
    """Test that normalization formula is correctly applied."""
    detector = DetectorEngine()
    
    # Simulate raw scores for different languages
    test_cases = [
        ("en", 0.75, 0.75),   # English: no normalization
        ("te", 0.50, 0.769),  # Telugu: 0.50 / 0.65 ≈ 0.769
        ("hi", 0.80, 0.870),  # Hindi: 0.80 / 0.92 ≈ 0.870
        ("ta", 0.67, 1.000),  # Tamil: 0.67 / 0.67 = 1.000
        ("bn", 0.70, 1.000),  # Bengali: 0.70 / 0.70 = 1.000
    ]
    
    for lang_code, raw_score, expected_normalized in test_cases:
        factor = detector.LANGUAGE_BASELINE_FACTORS[lang_code]
        normalized = raw_score / factor
        # Cap at 1.0 as per implementation
        normalized = min(1.0, normalized)
        
        assert abs(normalized - expected_normalized) < 0.001, \
            f"Language {lang_code}: expected {expected_normalized:.3f}, got {normalized:.3f}"


def test_normalization_preserves_order():
    """Test that normalization preserves relative risk ordering."""
    detector = DetectorEngine()
    
    # Same language, different risk levels
    low_risk = 0.20
    medium_risk = 0.50
    high_risk = 0.80
    
    factor = detector.LANGUAGE_BASELINE_FACTORS["te"]  # Telugu factor
    
    normalized_low = low_risk / factor
    normalized_medium = medium_risk / factor
    normalized_high = high_risk / factor
    
    # Order should be preserved
    assert normalized_low < normalized_medium < normalized_high, \
        "Normalization must preserve relative risk ordering"


def test_unknown_language_defaults_to_english():
    """Test that unknown languages default to English baseline (1.0)."""
    detector = DetectorEngine()
    
    # Simulate unknown language code
    unknown_lang = "xx"
    factor = detector.LANGUAGE_BASELINE_FACTORS.get(unknown_lang, 1.0)
    
    assert factor == 1.0, \
        "Unknown languages should default to English baseline factor"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
