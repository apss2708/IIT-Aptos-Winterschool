import os
import logging
from typing import Dict, Any
import json

class Config:
    """Configuration management for AI services"""
    
    def __init__(self):
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from environment and defaults"""
        config = {
            # API Keys
            "openai_api_key": os.getenv('OPENAI_API_KEY', ''),
            "gemini_api_key": os.getenv('GEMINI_API_KEY', ''),
            
            # Service Configuration
            "redis_host": os.getenv('REDIS_HOST', 'localhost'),
            "redis_port": int(os.getenv('REDIS_PORT', 6379)),
            "redis_db": int(os.getenv('REDIS_DB', 0)),
            
            # AI Model Settings
            "default_openai_model": os.getenv('DEFAULT_OPENAI_MODEL', 'gpt-4'),
            "default_gemini_model": os.getenv('DEFAULT_GEMINI_MODEL', 'gemini-pro'),
            "max_tokens": int(os.getenv('MAX_TOKENS', 150)),
            "temperature": float(os.getenv('TEMPERATURE', 0.7)),
            
            # Clue Generation Settings
            "max_clue_length": int(os.getenv('MAX_CLUE_LENGTH', 200)),
            "min_clue_quality": float(os.getenv('MIN_CLUE_QUALITY', 0.6)),
            "cache_ttl": int(os.getenv('CACHE_TTL', 3600)),
            
            # Security
            "clue_secret_key": os.getenv('CLUE_SECRET_KEY', 'default-secret-key'),
            "jwt_secret": os.getenv('JWT_SECRET', 'default-jwt-secret'),
            
            # Logging
            "log_level": os.getenv('LOG_LEVEL', 'INFO'),
            "log_format": os.getenv('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'),
            
            # Performance
            "max_workers": int(os.getenv('MAX_WORKERS', 10)),
            "request_timeout": int(os.getenv('REQUEST_TIMEOUT', 30)),
            "rate_limit_per_minute": int(os.getenv('RATE_LIMIT_PER_MINUTE', 60)),
        }
        
        return config
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        return self.config.get(key, default)
    
    def set(self, key: str, value: Any):
        """Set configuration value"""
        self.config[key] = value
    
    def validate(self) -> bool:
        """Validate required configuration"""
        required_keys = [
            'openai_api_key',
            'gemini_api_key',
            'clue_secret_key'
        ]
        
        for key in required_keys:
            if not self.get(key):
                logging.warning(f"Required configuration missing: {key}")
                return False
        
        return True
    
    def get_service_config(self, service_name: str) -> Dict[str, Any]:
        """Get service-specific configuration"""
        base_config = {
            'redis_host': self.get('redis_host'),
            'redis_port': self.get('redis_port'),
            'log_level': self.get('log_level'),
            'max_workers': self.get('max_workers')
        }
        
        service_configs = {
            'clue_generator': {
                **base_config,
                'max_clue_length': self.get('max_clue_length'),
                'cache_ttl': self.get('cache_ttl')
            },
            'anti_cheat': {
                **base_config,
                'min_trust_score': 0.6,
                'max_analysis_time': 10
            },
            'npc_guardian': {
                **base_config,
                'max_conversation_history': 20,
                'response_timeout': 5
            }
        }
        
        return service_configs.get(service_name, base_config)

# Global configuration instance
config = Config()