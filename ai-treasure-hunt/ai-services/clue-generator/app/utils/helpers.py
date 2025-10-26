import hashlib
import hmac
import json
import logging
from typing import Any, Dict, List
from datetime import datetime, timedelta
import random
import string

logger = logging.getLogger(__name__)

class HelperFunctions:
    """Utility functions for AI services"""
    
    @staticmethod
    def generate_id(prefix: str = "", length: int = 16) -> str:
        """Generate a unique ID"""
        chars = string.ascii_letters + string.digits
        random_part = ''.join(random.choice(chars) for _ in range(length))
        
        if prefix:
            return f"{prefix}_{random_part}"
        return random_part
    
    @staticmethod
    def calculate_hash(data: Any) -> str:
        """Calculate SHA256 hash of data"""
        if isinstance(data, (dict, list)):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    @staticmethod
    def create_hmac_signature(data: str, secret_key: str) -> str:
        """Create HMAC signature for data verification"""
        return hmac.new(
            secret_key.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
    
    @staticmethod
    def verify_hmac_signature(data: str, signature: str, secret_key: str) -> bool:
        """Verify HMAC signature"""
        expected_signature = HelperFunctions.create_hmac_signature(data, secret_key)
        return hmac.compare_digest(expected_signature, signature)
    
    @staticmethod
    def normalize_text(text: str, max_length: int = None) -> str:
        """Normalize text by cleaning and truncating if needed"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Truncate if max_length specified
        if max_length and len(text) > max_length:
            text = text[:max_length-3] + "..."
        
        return text
    
    @staticmethod
    def calculate_levenshtein_distance(str1: str, str2: str) -> int:
        """Calculate Levenshtein distance between two strings"""
        if len(str1) < len(str2):
            return HelperFunctions.calculate_levenshtein_distance(str2, str1)
        
        if len(str2) == 0:
            return len(str1)
        
        previous_row = range(len(str2) + 1)
        for i, c1 in enumerate(str1):
            current_row = [i + 1]
            for j, c2 in enumerate(str2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    @staticmethod
    def safe_json_parse(json_str: str, default: Any = None) -> Any:
        """Safely parse JSON string"""
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Failed to parse JSON: {json_str}")
            return default
    
    @staticmethod
    def format_timestamp(timestamp: datetime = None) -> str:
        """Format timestamp as ISO string"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        return timestamp.isoformat()
    
    @staticmethod
    def parse_timestamp(timestamp_str: str) -> datetime:
        """Parse ISO timestamp string"""
        try:
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except ValueError:
            logger.warning(f"Invalid timestamp format: {timestamp_str}")
            return datetime.utcnow()
    
    @staticmethod
    def is_timestamp_recent(timestamp_str: str, max_age_minutes: int = 5) -> bool:
        """Check if timestamp is recent"""
        try:
            timestamp = HelperFunctions.parse_timestamp(timestamp_str)
            now = datetime.utcnow()
            age = now - timestamp
            return age <= timedelta(minutes=max_age_minutes)
        except Exception:
            return False
    
    @staticmethod
    def chunk_list(lst: List, chunk_size: int) -> List[List]:
        """Split list into chunks"""
        return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]
    
    @staticmethod
    def weighted_random_choice(choices: List, weights: List[float]) -> Any:
        """Make weighted random choice"""
        if len(choices) != len(weights):
            raise ValueError("Choices and weights must have same length")
        
        total = sum(weights)
        r = random.uniform(0, total)
        current = 0
        
        for i, weight in enumerate(weights):
            current += weight
            if r <= current:
                return choices[i]
        
        return choices[-1]  # Fallback
    
    @staticmethod
    def calculate_similarity_score(text1: str, text2: str) -> float:
        """Calculate similarity score between two texts (0-1)"""
        # Simple implementation using Levenshtein distance
        if not text1 or not text2:
            return 0.0
        
        max_len = max(len(text1), len(text2))
        if max_len == 0:
            return 1.0
        
        distance = HelperFunctions.calculate_levenshtein_distance(text1, text2)
        return 1.0 - (distance / max_len)
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Basic email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        import re
        # Remove invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255-len(ext)] + ext
        return filename

# Common utility functions
def setup_logging(level: str = "INFO"):
    """Setup basic logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

def retry_on_exception(max_retries: int = 3, delay: float = 1.0):
    """Decorator for retrying functions on exception"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
                    time.sleep(delay * (2 ** attempt))  # Exponential backoff
            return None
        return wrapper
    return decorator
