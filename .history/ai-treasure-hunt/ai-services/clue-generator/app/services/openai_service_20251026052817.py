import openai
import os
import logging
from typing import Dict, List, Optional
import json
import asyncio

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.available_models = {
            "creative": "gpt-4",
            "logical": "gpt-4",
            "fast": "gpt-3.5-turbo"
        }
        
    async def generate_text(self, prompt: str, model_type: str = "creative", **kwargs) -> str:
        """Generate text using OpenAI models"""
        try:
            model = self.available_models.get(model_type, "gpt-4")
            
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=kwargs.get('temperature', 0.7),
                    max_tokens=kwargs.get('max_tokens', 150),
                    top_p=kwargs.get('top_p', 0.9)
                )
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise
    
    async def generate_structured_data(self, prompt: str, schema: Dict) -> Dict:
        """Generate structured data using OpenAI"""
        try:
            structured_prompt = f"""
            {prompt}
            
            Return the response as a JSON object with this structure:
            {json.dumps(schema, indent=2)}
            
            Only return the JSON, no other text.
            """
            
            response = await self.generate_text(
                structured_prompt, 
                model_type="logical",
                temperature=0.3
            )
            
            # Clean response and parse JSON
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]
                
            return json.loads(response)
            
        except Exception as e:
            logger.error(f"Structured data generation failed: {str(e)}")
            return {}
    
    async def generate_multiple_variants(self, prompt: str, num_variants: int = 3) -> List[str]:
        """Generate multiple variants of the same prompt"""
        tasks = []
        for i in range(num_variants):
            # Slightly vary temperature for different variants
            temp_variation = 0.7 + (i * 0.1)
            task = self.generate_text(
                prompt, 
                temperature=min(0.9, temp_variation)
            )
            tasks.append(task)
        
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def analyze_sentiment(self, text: str) -> Dict:
        """Analyze sentiment of text"""
        prompt = f"""
        Analyze the sentiment and tone of this text:
        "{text}"
        
        Return JSON with:
        - sentiment: positive/negative/neutral
        - confidence: 0-1
        - tone: descriptive words (e.g., mysterious, exciting, challenging)
        - engagement_level: low/medium/high
        """
        
        schema = {
            "sentiment": "string",
            "confidence": "float",
            "tone": "string",
            "engagement_level": "string"
        }
        
        return await self.generate_structured_data(prompt, schema)
    
    async def evaluate_clue_quality(self, clue: str, context: Dict) -> Dict:
        """Evaluate the quality of a generated clue"""
        prompt = f"""
        Evaluate this treasure hunt clue:
        "{clue}"
        
        Context:
        - Player Level: {context.get('player_level', 1)}
        - Difficulty: {context.get('difficulty', 'medium')}
        - Theme: {context.get('theme', 'adventure')}
        
        Evaluate based on:
        1. Clarity and understandability
        2. Engagement and excitement
        3. Difficulty appropriateness
        4. Thematic consistency
        5. Exploration encouragement
        
        Return JSON with scores (1-10) for each category and overall feedback.
        """
        
        schema = {
            "clarity_score": "integer",
            "engagement_score": "integer", 
            "difficulty_score": "integer",
            "thematic_score": "integer",
            "exploration_score": "integer",
            "overall_score": "integer",
            "feedback": "string",
            "improvement_suggestions": "array"
        }
        
        return await self.generate_structured_data(prompt, schema)