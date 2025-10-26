import logging
from typing import Dict, List, Any
import json

logger = logging.getLogger(__name__)

class PromptEngine:
    def __init__(self):
        self.templates = self._load_templates()
        self.prompt_history = []
        
    def _load_templates(self) -> Dict[str, str]:
        """Load prompt templates"""
        return {
            "clue_generation": """
            Create a {clue_type} clue for a treasure hunt with these specifications:
            
            THEME: {theme}
            DIFFICULTY: {difficulty}
            PLAYER LEVEL: {player_level}
            LOCATION: {location_name}
            
            CONTEXT:
            {location_context}
            
            PLAYER PROFILE:
            - Success Rate: {success_rate}%
            - Learning Style: {learning_style}
            - Cultural Background: {cultural_context}
            
            REQUIREMENTS:
            1. Make it engaging and fun
            2. Encourage physical exploration
            3. Be culturally sensitive
            4. Match the difficulty level
            5. Incorporate local elements naturally
            
            PREVIOUS CLUES:
            {previous_clues}
            
            Generate a creative and immersive clue:
            """,
            
            "puzzle_creation": """
            Design a {puzzle_type} puzzle for a treasure hunt.
            
            PARAMETERS:
            - Complexity: {complexity}
            - Theme: {theme}
            - Location: {location_context}
            
            PUZZLE REQUIREMENTS:
            - Must be solvable within 5-15 minutes
            - Should involve some physical exploration
            - Can include riddles, patterns, or logical reasoning
            - Should tell a small part of the overall story
            
            Create an engaging puzzle:
            """,
            
            "narrative_development": """
            Develop a narrative segment for a treasure hunt.
            
            STORY CONTEXT:
            - Overall Theme: {theme}
            - Current Chapter: {chapter}
            - Player Progress: {progress}%
            - Previous Events: {previous_events}
            
            CHARACTERS:
            {characters}
            
            REQUIREMENTS:
            - Advance the main storyline
            - Introduce new mysteries or revelations
            - Develop character relationships
            - Set up future plot points
            - Maintain consistent tone and style
            
            Write the next narrative segment:
            """,
            
            "difficulty_adjustment": """
            Analyze this game scenario and suggest difficulty adjustments:
            
            PLAYER PERFORMANCE:
            - Current Level: {player_level}
            - Success Rate: {success_rate}%
            - Average Solving Time: {solving_time} seconds
            - Recent Performance: {recent_trend}
            
            CURRENT DIFFICULTY: {current_difficulty}
            GAME CONTEXT: {game_context}
            
            Suggest appropriate difficulty adjustments to maintain engagement while providing challenge.
            """
        }
    
    def build_clue_prompt(
        self,
        theme: str,
        difficulty: str,
        location_context: str,
        story_progression: str,
        previous_clues: List[Dict],
        player_profile: Dict
    ) -> str:
        """Build comprehensive clue generation prompt"""
        
        template = self.templates["clue_generation"]
        
        # Format previous clues
        previous_clues_text = self._format_previous_clues(previous_clues)
        
        # Determine clue type based on player profile and context
        clue_type = self._determine_clue_type(player_profile, difficulty)
        
        prompt = template.format(
            clue_type=clue_type,
            theme=theme,
            difficulty=difficulty,
            player_level=player_profile.get('level', 1),
            location_name=location_context.get('name', 'unknown location'),
            location_context=self._build_location_context(location_context),
            success_rate=int(player_profile.get('success_rate', 0.5) * 100),
            learning_style=player_profile.get('learning_style', 'visual'),
            cultural_context=player_profile.get('cultural_context', 'neutral'),
            previous_clues=previous_clues_text
        )
        
        self._log_prompt("clue_generation", prompt)
        return prompt
    
    def build_puzzle_prompt(
        self,
        puzzle_type: str,
        complexity: str,
        theme: str,
        location_context: Dict
    ) -> str:
        """Build puzzle generation prompt"""
        
        template = self.templates["puzzle_creation"]
        
        prompt = template.format(
            puzzle_type=puzzle_type,
            complexity=complexity,
            theme=theme,
            location_context=self._build_location_context(location_context)
        )
        
        self._log_prompt("puzzle_creation", prompt)
        return prompt
    
    def build_narrative_prompt(
        self,
        hunt_id: str,
        player_profile: Dict,
        story_elements: List[str]
    ) -> str:
        """Build narrative development prompt"""
        
        template = self.templates["narrative_development"]
        
        prompt = template.format(
            theme=story_elements[0] if story_elements else 'adventure',
            chapter=player_profile.get('progress_chapter', 1),
            progress=int(player_profile.get('completion_rate', 0) * 100),
            previous_events=self._format_previous_events(story_elements),
            characters=self._build_character_descriptions(player_profile)
        )
        
        self._log_prompt("narrative_development", prompt)
        return prompt
    
    def _build_location_context(self, location: Dict) -> str:
        """Build rich location context description"""
        context_parts = []
        
        if location.get('name'):
            context_parts.append(f"Location: {location['name']}")
        
        if location.get('landmarks'):
            context_parts.append(f"Nearby landmarks: {', '.join(location['landmarks'][:3])}")
        
        if location.get('history'):
            context_parts.append(f"Historical significance: {location['history'][:200]}...")
        
        if location.get('features'):
            context_parts.append(f"Notable features: {', '.join(location['features'][:3])}")
        
        return "\n".join(context_parts)
    
    def _format_previous_clues(self, previous_clues: List[Dict]) -> str:
        """Format previous clues for context"""
        if not previous_clues:
            return "No previous clues in this hunt."
        
        formatted = []
        for i, clue in enumerate(previous_clues[-3:], 1):  # Last 3 clues
            clue_text = clue.get('text', 'Unknown clue')
            formatted.append(f"Clue {i}: {clue_text}")
        
        return "\n".join(formatted)
    
    def _format_previous_events(self, story_elements: List[str]) -> str:
        """Format previous story events"""
        if not story_elements:
            return "This is the beginning of the adventure."
        
        return ", ".join(story_elements[-5:])  # Last 5 events
    
    def _build_character_descriptions(self, player_profile: Dict) -> str:
        """Build character descriptions based on player profile"""
        characters = [
            f"Player Character: {player_profile.get('archetype', 'Adventurer')} - {player_profile.get('description', 'Brave explorer')}"
        ]
        
        # Add NPC characters based on player progress
        progress = player_profile.get('completion_rate', 0)
        if progress < 0.3:
            characters.append("Mentor NPC: Wise guide who provides hints and guidance")
        elif progress < 0.7:
            characters.append("Companion NPC: Loyal friend who accompanies the player")
        else:
            characters.append("Final Boss NPC: Challenging opponent for the climax")
        
        return "\n".join(characters)
    
    def _determine_clue_type(self, player_profile: Dict, difficulty: str) -> str:
        """Determine optimal clue type based on player and context"""
        learning_style = player_profile.get('learning_style', 'visual')
        level = player_profile.get('level', 1)
        
        clue_types = {
            'visual': ['observation', 'visual pattern', 'symbol recognition'],
            'auditory': ['rhyming riddle', 'sound-based', 'verbal puzzle'],
            'kinesthetic': ['physical challenge', 'movement-based', 'interaction required']
        }
        
        base_types = clue_types.get(learning_style, ['riddle', 'puzzle'])
        
        # Adjust based on difficulty
        if difficulty == 'easy':
            return base_types[0]
        elif difficulty == 'hard':
            return base_types[-1] if len(base_types) > 1 else base_types[0]
        else:
            return base_types[len(base_types) // 2]
    
    def _log_prompt(self, prompt_type: str, prompt: str):
        """Log prompt for analytics and improvement"""
        log_entry = {
            "type": prompt_type,
            "timestamp": self._get_current_timestamp(),
            "length": len(prompt),
            "first_100_chars": prompt[:100] + "..." if len(prompt) > 100 else prompt
        }
        
        self.prompt_history.append(log_entry)
        
        # Keep only last 100 entries
        if len(self.prompt_history) > 100:
            self.prompt_history = self.prompt_history[-100:]
    
    def _get_current_timestamp(self) -> str:
        from datetime import datetime
        return datetime.utcnow().isoformat()
    
    def get_prompt_stats(self) -> Dict:
        """Get statistics about prompt usage"""
        if not self.prompt_history:
            return {}
        
        types_count = {}
        for entry in self.prompt_history:
            type_name = entry['type']
            types_count[type_name] = types_count.get(type_name, 0) + 1
        
        return {
            "total_prompts": len(self.prompt_history),
            "types_distribution": types_count,
            "average_length": sum(e['length'] for e in self.prompt_history) / len(self.prompt_history)
        }