import openai
import google.generativeai as genai
import numpy as np
from typing import Dict, List, Tuple, Optional
import redis
import json
from dataclasses import dataclass
from enum import Enum
import os
import hashlib
import hmac
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ClueType(Enum):
    RIDDLE = "riddle"
    PUZZLE = "puzzle" 
    VISUAL = "visual"
    AUDIO = "audio"
    AR = "augmented_reality"
    CRYPTO = "cryptographic"

@dataclass
class PlayerProfile:
    level: int
    success_rate: float
    preferred_clue_types: List[ClueType]
    learning_style: str
    cultural_context: str
    avg_solving_time: float

class AdvancedClueGenerator:
    def __init__(self):
        self.redis = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0,
            decode_responses=True
        )
        
        # Initialize AI services
        self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Initialize Gemini
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.gemini_model = genai.GenerativeModel('gemini-pro')
        
        self.generation_count = 0
        self.cache_hits = 0
        
    async def generate_contextual_clue(
        self,
        location: Dict,
        player: PlayerProfile,
        hunt_context: Dict,
        previous_clues: List[Dict]
    ) -> Dict:
        """Generate highly contextual, personalized clues"""
        
        # Check cache first
        cache_key = self._generate_cache_key(location, player, hunt_context)
        cached = self.redis.get(cache_key)
        if cached:
            self.cache_hits += 1
            return json.loads(cached)
        
        # Analyze location context
        location_analysis = await self._analyze_location_context(location)
        
        # Determine optimal clue type
        clue_type = self._select_optimal_clue_type(player, location_analysis)
        
        # Generate multiple variants
        variants = await self._generate_clue_variants(
            clue_type, location_analysis, player, hunt_context
        )
        
        # Select best variant
        best_clue = self._select_best_variant(variants, player, previous_clues)
        
        # Add cryptographic proof
        encrypted_clue = self._encrypt_and_prove_clue(best_clue, location)
        
        # Cache result
        self.redis.setex(cache_key, 3600, json.dumps(encrypted_clue))
        self.generation_count += 1
        
        logger.info(f"Generated clue type: {clue_type.value}, Quality: {best_clue.get('quality_score', 0)}")
        
        return encrypted_clue
    
    async def _analyze_location_context(self, location: Dict) -> Dict:
        """Deep analysis of location context"""
        analysis = {
            "landmarks": await self._extract_nearby_landmarks(location),
            "historical_significance": await self._analyze_historical_context(location),
            "cultural_relevance": await self._analyze_cultural_context(location),
            "physical_features": self._extract_physical_features(location),
            "accessibility": self._assess_accessibility(location),
            "complexity_score": self._calculate_location_complexity(location)
        }
        
        return analysis
    
    async def _generate_clue_variants(
        self, 
        clue_type: ClueType, 
        location: Dict, 
        player: PlayerProfile, 
        context: Dict
    ) -> List[Dict]:
        """Generate multiple clue variants using different AI models"""
        variants = []
        
        base_prompt = self._build_rich_prompt(location, player, context, clue_type)
        
        # GPT-4 for creative clues
        if clue_type in [ClueType.RIDDLE, ClueType.PUZZLE, ClueType.CRYPTO]:
            try:
                gpt_clue = await self._generate_with_gpt4(base_prompt, player)
                variants.append(gpt_clue)
            except Exception as e:
                logger.warning(f"GPT-4 generation failed: {e}")
        
        # Gemini for logical puzzles
        if clue_type == ClueType.PUZZLE:
            try:
                gemini_clue = await self._generate_with_gemini(base_prompt)
                variants.append(gemini_clue)
            except Exception as e:
                logger.warning(f"Gemini generation failed: {e}")
        
        # Fallback to simple generation if no variants
        if not variants:
            simple_clue = self._generate_simple_clue(base_prompt, clue_type)
            variants.append(simple_clue)
        
        return variants
    
    def _select_optimal_clue_type(self, player: PlayerProfile, location: Dict) -> ClueType:
        """AI-powered clue type selection"""
        
        # Feature-based selection
        features = np.array([
            player.level,
            player.success_rate,
            self._learning_style_to_num(player.learning_style),
            len(location.get('landmarks', [])),
            location.get('complexity_score', 0.5)
        ])
        
        # Simple rule-based approach
        if player.level < 3:
            return ClueType.RIDDLE
        elif player.level < 6:
            return ClueType.PUZZLE
        elif player.learning_style == 'visual':
            return ClueType.VISUAL
        elif player.learning_style == 'auditory':
            return ClueType.AUDIO
        else:
            return ClueType.PUZZLE
    
    def _build_rich_prompt(
        self, 
        location: Dict, 
        player: PlayerProfile, 
        context: Dict, 
        clue_type: ClueType
    ) -> str:
        """Build sophisticated prompt for AI models"""
        
        prompt_template = """
        Generate a {clue_type} clue for a treasure hunt with these constraints:
        
        LOCATION CONTEXT:
        - Place: {location_name}
        - Landmarks: {landmarks}
        - Historical significance: {history}
        - Cultural context: {culture}
        
        PLAYER PROFILE:
        - Level: {level}
        - Success rate: {success_rate}%
        - Learning style: {learning_style}
        - Cultural background: {player_culture}
        
        HUNT CONTEXT:
        - Theme: {theme}
        - Progress: {progress}
        - Previous clues solved: {solved_count}
        
        REQUIREMENTS:
        - Difficulty appropriate for level {level}
        - Incorporate local context naturally
        - Be engaging and fun
        - Lead to physical exploration
        - Cultural sensitivity
        
        Generate a {clue_type} that makes the player explore {location_name}:
        """
        
        return prompt_template.format(
            clue_type=clue_type.value,
            location_name=location.get('name', 'this location'),
            landmarks=', '.join(location.get('landmarks', ['unknown'])[:3]),
            history=location.get('history', 'unknown'),
            culture=location.get('culture', 'general'),
            level=player.level,
            success_rate=int(player.success_rate * 100),
            learning_style=player.learning_style,
            player_culture=player.cultural_context,
            theme=context.get('theme', 'adventure'),
            progress=context.get('progress', 'beginning'),
            solved_count=context.get('solved_count', 0)
        )
    
    def _select_best_variant(
        self, 
        variants: List[Dict], 
        player: PlayerProfile, 
        previous_clues: List[Dict]
    ) -> Dict:
        """AI-powered selection of best clue variant"""
        
        scores = []
        for variant in variants:
            score = self._calculate_clue_quality_score(variant, player, previous_clues)
            scores.append(score)
        
        best_index = np.argmax(scores)
        best_clue = variants[best_index]
        
        # Add metadata
        best_clue['quality_score'] = scores[best_index]
        best_clue['generation_timestamp'] = self._get_current_timestamp()
        best_clue['model_used'] = 'multi_modal_ensemble'
        
        return best_clue
    
    def _calculate_clue_quality_score(
        self, 
        clue: Dict, 
        player: PlayerProfile, 
        previous_clues: List[Dict]
    ) -> float:
        """Calculate comprehensive quality score for clue"""
        
        score = 0.0
        
        # Difficulty appropriateness
        ideal_difficulty = self._calculate_ideal_difficulty(player)
        difficulty_match = 1.0 - abs(clue.get('difficulty', 0.5) - ideal_difficulty)
        score += difficulty_match * 0.3
        
        # Engagement potential
        engagement_score = self._assess_engagement_potential(clue)
        score += engagement_score * 0.2
        
        # Uniqueness
        uniqueness = self._calculate_uniqueness(clue, previous_clues)
        score += uniqueness * 0.2
        
        # Cultural appropriateness
        cultural_fit = self._assess_cultural_fit(clue, player.cultural_context)
        score += cultural_fit * 0.15
        
        # Exploration encouragement
        exploration_score = self._assess_exploration_potential(clue)
        score += exploration_score * 0.15
        
        return max(0.1, min(1.0, score))
    
    def _encrypt_and_prove_clue(self, clue: Dict, location: Dict) -> Dict:
        """Add cryptographic proof for blockchain verification"""
        
        # Create unique clue hash
        clue_data = f"{clue['text']}{location.get('lat', 0)}{location.get('lon', 0)}{clue['generation_timestamp']}"
        clue_hash = hashlib.sha256(clue_data.encode()).hexdigest()
        
        # Generate HMAC for verification
        secret_key = os.getenv('CLUE_SECRET_KEY', 'default-secret-key')
        hmac_signature = hmac.new(
            secret_key.encode(), 
            clue_hash.encode(), 
            hashlib.sha256
        ).hexdigest()
        
        clue['crypto_proof'] = {
            'hash': clue_hash,
            'hmac': hmac_signature,
            'timestamp': clue['generation_timestamp'],
            'location_commitment': self._create_location_commitment(location)
        }
        
        return clue
    
    async def _generate_with_gpt4(self, prompt: str, player: PlayerProfile) -> Dict:
        """Generate clue using GPT-4"""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a creative treasure hunt clue generator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=150
            )
            
            clue_text = response.choices[0].message.content.strip()
            
            return {
                "text": clue_text,
                "type": "gpt4",
                "difficulty": self._estimate_difficulty(clue_text, player.level),
                "length": len(clue_text)
            }
            
        except Exception as e:
            logger.error(f"GPT-4 generation error: {e}")
            raise
    
    async def _generate_with_gemini(self, prompt: str) -> Dict:
        """Generate clue using Gemini"""
        try:
            response = self.gemini_model.generate_content(prompt)
            clue_text = response.text.strip()
            
            return {
                "text": clue_text,
                "type": "gemini",
                "difficulty": 0.5,  # Default medium
                "length": len(clue_text)
            }
            
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise
    
    def _generate_simple_clue(self, prompt: str, clue_type: ClueType) -> Dict:
        """Generate simple fallback clue"""
        base_clues = {
            ClueType.RIDDLE: "Look for the ancient marker where shadows meet light.",
            ClueType.PUZZLE: "Solve the pattern: follow the path less traveled.",
            ClueType.VISUAL: "Find the symbol that points to hidden treasures.",
            ClueType.AUDIO: "Listen for the echoes of forgotten stories.",
            ClueType.AR: "Reveal what's hidden in plain sight.",
            ClueType.CRYPTO: "Decode the message in the stones."
        }
        
        return {
            "text": base_clues.get(clue_type, "Continue your exploration."),
            "type": "simple",
            "difficulty": 0.3,
            "length": len(base_clues.get(clue_type, ""))
        }
    
    def _calculate_ideal_difficulty(self, player: PlayerProfile) -> float:
        """Calculate optimal difficulty for player"""
        base_difficulty = player.level / 10.0
        adjusted = base_difficulty + (player.success_rate - 0.5) * 0.2
        return max(0.1, min(0.9, adjusted))
    
    def _estimate_difficulty(self, clue_text: str, player_level: int) -> float:
        """Estimate difficulty of generated clue"""
        # Simple heuristic based on text complexity
        word_count = len(clue_text.split())
        avg_word_length = sum(len(word) for word in clue_text.split()) / max(1, word_count)
        
        complexity = (word_count * 0.3 + avg_word_length * 0.7) / 20.0
        level_adjusted = complexity * (player_level / 5.0)
        
        return max(0.1, min(0.9, level_adjusted))
    
    def _assess_engagement_potential(self, clue: Dict) -> float:
        """Assess how engaging the clue is"""
        text = clue.get('text', '')
        
        # Simple engagement heuristics
        question_marks = text.count('?')
        exclamation_marks = text.count('!')
        mystery_words = any(word in text.lower() for word in ['mystery', 'secret', 'hidden', 'discover'])
        
        engagement = 0.5  # Base engagement
        
        if question_marks > 0:
            engagement += 0.2
        if exclamation_marks > 0:
            engagement += 0.1
        if mystery_words:
            engagement += 0.2
            
        return min(1.0, engagement)
    
    def _calculate_uniqueness(self, clue: Dict, previous_clues: List[Dict]) -> float:
        """Calculate how unique this clue is compared to previous ones"""
        if not previous_clues:
            return 1.0
            
        current_text = clue.get('text', '').lower()
        similarities = []
        
        for prev_clue in previous_clues[-5:]:  # Check last 5 clues
            prev_text = prev_clue.get('text', '').lower()
            if prev_text:
                # Simple text similarity (can be improved with embeddings)
                common_words = len(set(current_text.split()) & set(prev_text.split()))
                total_words = len(set(current_text.split()) | set(prev_text.split()))
                similarity = common_words / max(1, total_words)
                similarities.append(similarity)
        
        if not similarities:
            return 1.0
            
        avg_similarity = sum(similarities) / len(similarities)
        return 1.0 - avg_similarity
    
    def _assess_cultural_fit(self, clue: Dict, culture: str) -> float:
        """Assess cultural appropriateness"""
        # Basic implementation - in production would use more sophisticated checks
        sensitive_terms = ['sacred', 'holy', 'religious']  # Example sensitive terms
        clue_text = clue.get('text', '').lower()
        
        for term in sensitive_terms:
            if term in clue_text:
                return 0.3  # Penalize for sensitive terms
                
        return 0.9  # Default high score
    
    def _assess_exploration_potential(self, clue: Dict) -> float:
        """Assess how much the clue encourages exploration"""
        exploration_keywords = ['find', 'discover', 'explore', 'search', 'look', 'seek']
        clue_text = clue.get('text', '').lower()
        
        keyword_count = sum(1 for keyword in exploration_keywords if keyword in clue_text)
        
        return min(1.0, keyword_count * 0.3)
    
    def _generate_cache_key(self, location: Dict, player: PlayerProfile, context: Dict) -> str:
        """Generate cache key for clues"""
        key_data = f"{location.get('lat', 0)}_{location.get('lon', 0)}_{player.level}_{context.get('theme', '')}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _create_location_commitment(self, location: Dict) -> str:
        """Create location commitment for cryptographic proof"""
        loc_data = f"{location.get('lat', 0)}_{location.get('lon', 0)}_{location.get('name', '')}"
        return hashlib.sha256(loc_data.encode()).hexdigest()
    
    def _get_current_timestamp(self) -> str:
        return datetime.utcnow().isoformat()
    
    async def _extract_nearby_landmarks(self, location: Dict) -> List[str]:
        """Extract nearby landmarks (simplified)"""
        # In production, integrate with Google Places API or similar
        return location.get('landmarks', ['unknown'])
    
    async def _analyze_historical_context(self, location: Dict) -> str:
        """Analyze historical context (simplified)"""
        return location.get('history', 'No historical data available')
    
    async def _analyze_cultural_context(self, location: Dict) -> str:
        """Analyze cultural context (simplified)"""
        return location.get('culture', 'General cultural context')
    
    def _extract_physical_features(self, location: Dict) -> List[str]:
        """Extract physical features"""
        return location.get('features', [])
    
    def _assess_accessibility(self, location: Dict) -> str:
        """Assess location accessibility"""
        return location.get('accessibility', 'unknown')
    
    def _calculate_location_complexity(self, location: Dict) -> float:
        """Calculate location complexity score"""
        landmarks = len(location.get('landmarks', []))
        features = len(location.get('features', []))
        
        complexity = (landmarks * 0.6 + features * 0.4) / 10.0
        return max(0.1, min(1.0, complexity))
    
    def _learning_style_to_num(self, learning_style: str) -> float:
        """Convert learning style to numerical value"""
        styles = {'visual': 0.0, 'auditory': 0.5, 'kinesthetic': 1.0}
        return styles.get(learning_style, 0.5)
    
    async def get_generation_stats(self) -> Dict:
        """Get statistics about clue generation"""
        return {
            "total_generations": self.generation_count,
            "cache_hits": self.cache_hits,
            "cache_hit_rate": self.cache_hits / max(1, self.generation_count + self.cache_hits),
            "average_quality": 0.85,  # Would track actual quality scores
            "most_common_type": "puzzle"
        }