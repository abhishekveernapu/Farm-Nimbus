import json
import os
import hashlib
import logging
from typing import Dict, Optional
from pathlib import Path

from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)


class TranslationService:
    """Dynamic translation service using deep-translator (Google Translate).

    Loads en.json as the single source-of-truth and translates to other
    languages on-the-fly.  Results are cached to disk (JSON files) so
    translations survive server restarts and are near-instant after the
    first time.
    """

    # Language code → Google Translate language code
    SUPPORTED_LANGUAGES = {
        'en': 'en',
        'hi': 'hi',
        'te': 'te',
        'ta': 'ta',
        'kn': 'kn',
        'ml': 'ml',
    }

    def __init__(self, translations_dir: Optional[str] = None):
        if translations_dir is None:
            translations_dir = os.path.join(os.path.dirname(__file__), 'translations')
        self.translations_dir = Path(translations_dir)
        self.cache_dir = self.translations_dir / 'cache'
        self.cache_dir.mkdir(exist_ok=True)

        # Load English as master source-of-truth
        self.english: dict = self._load_english()
        self._english_hash: str = self._hash_dict(self.english)

        # In-memory cache: lang → translated dict
        self._cache: Dict[str, dict] = {'en': self.english}

        # Pre-load any existing disk caches into memory at startup
        self._load_all_disk_caches()

        logger.info(
            f"TranslationService initialized with {len(self.SUPPORTED_LANGUAGES)} languages "
            f"({len(self._cache)} pre-cached from disk)"
        )

    # ------------------------------------------------------------------ #
    #  Internal helpers
    # ------------------------------------------------------------------ #

    def _load_english(self) -> dict:
        """Load en.json – the master translation file."""
        filepath = self.translations_dir / 'en.json'
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info("Loaded English master translations")
            return data
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load en.json: {e}")
            return {}

    @staticmethod
    def _hash_dict(d: dict) -> str:
        """Create a short hash of a dict to detect when en.json changes."""
        raw = json.dumps(d, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(raw.encode('utf-8')).hexdigest()[:12]

    def _disk_cache_path(self, lang: str) -> Path:
        """Path to the disk cache file for a language."""
        return self.cache_dir / f"{lang}_{self._english_hash}.json"

    def _save_to_disk(self, lang: str, data: dict) -> None:
        """Persist a translated dict to disk."""
        try:
            path = self._disk_cache_path(lang)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"Saved translation cache to disk: {path.name}")
        except Exception as e:
            logger.warning(f"Failed to save disk cache for '{lang}': {e}")

    def _load_from_disk(self, lang: str) -> Optional[dict]:
        """Load a translated dict from disk cache (if it exists and matches current en.json)."""
        path = self._disk_cache_path(lang)
        if not path.exists():
            return None
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"Loaded translation from disk cache: {path.name}")
            return data
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Corrupt disk cache for '{lang}': {e}")
            return None

    def _load_all_disk_caches(self) -> None:
        """At startup, load all valid disk caches into memory."""
        for lang in self.SUPPORTED_LANGUAGES:
            if lang == 'en' or lang in self._cache:
                continue
            cached = self._load_from_disk(lang)
            if cached:
                self._cache[lang] = cached

    def _translate_value(self, text: str, target_lang: str) -> str:
        """Translate a single string, returning original on failure."""
        if not text or not text.strip():
            return text
        try:
            translated = GoogleTranslator(source='en', target=target_lang).translate(text)
            return translated if translated else text
        except Exception as e:
            logger.warning(f"Translation failed for '{text[:40]}…' → {target_lang}: {e}")
            return text

    def _translate_dict(self, data: dict, target_lang: str) -> dict:
        """Recursively translate all string values in a dict."""
        result = {}
        for key, value in data.items():
            if isinstance(value, dict):
                result[key] = self._translate_dict(value, target_lang)
            elif isinstance(value, str):
                result[key] = self._translate_value(value, target_lang)
            else:
                result[key] = value
        return result

    def _get_translated(self, lang: str) -> dict:
        """Get (or build + cache) the full translated dict for a language."""
        # 1. Check in-memory cache (instant)
        if lang in self._cache:
            return self._cache[lang]

        google_code = self.SUPPORTED_LANGUAGES.get(lang)
        if not google_code:
            logger.warning(f"Unsupported language '{lang}', falling back to English")
            return self.english

        # 2. Check disk cache (fast — file read)
        cached = self._load_from_disk(lang)
        if cached:
            self._cache[lang] = cached
            return cached

        # 3. Translate via API (slow — only happens once per language)
        logger.info(f"Translating UI strings to '{lang}' (one-time — will be cached to disk)…")
        try:
            translated = self._translate_dict(self.english, google_code)
            self._cache[lang] = translated
            self._save_to_disk(lang, translated)
            logger.info(f"Translation to '{lang}' complete and cached (memory + disk)")
            return translated
        except Exception as e:
            logger.error(f"Bulk translation to '{lang}' failed: {e}. Returning English.")
            return self.english

    # ------------------------------------------------------------------ #
    #  Public API  (same interface as before — server.py needs no changes)
    # ------------------------------------------------------------------ #

    def get_all(self, lang: str) -> dict:
        """Get all translations for a language, falling back to English."""
        return self._get_translated(lang)

    def get_key(self, lang: str, key: str) -> str:
        """Get a specific translation by dot-notation key."""
        data = self._get_translated(lang)
        keys = key.split('.')
        value = data
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                # Fallback to English
                value = self.english
                for fk in keys:
                    if isinstance(value, dict) and fk in value:
                        value = value[fk]
                    else:
                        return key  # Return key as-is if not found
                return value if isinstance(value, str) else key
        return value if isinstance(value, str) else key

    def get_supported_languages(self) -> list:
        """Return list of supported language codes."""
        return list(self.SUPPORTED_LANGUAGES.keys())
