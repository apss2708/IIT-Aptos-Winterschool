import os

class Config:
    def __init__(self):
        self.config = {
            'openai_api_key': os.getenv('OPENAI_API_KEY', ''),
            'redis_host': os.getenv('REDIS_HOST', 'localhost'),
            'redis_port': int(os.getenv('REDIS_PORT', 6379)),
            'log_level': os.getenv('LOG_LEVEL', 'INFO')
        }
    
    def get(self, key: str, default=None):
        return self.config.get(key, default)