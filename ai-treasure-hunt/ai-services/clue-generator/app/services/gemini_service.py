import google.generativeai as genai
import os
import logging
from typing import Dict, List, Optional
import json
import asyncio

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.warning("Gemini API key not found")
            return
            
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        self.available = True
        
    async def generate_content(self, prompt: str, **kwargs) -> str:
        """Generate content using Gemini"""
        if not self.available:
            raise Exception("Gemini service not available")
            
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=kwargs.get('temperature', 0.7),
                        top_p=kwargs.get('top_p', 0.8),
                        top_k=kwargs.get('top_k', 40),
                        max_output_tokens=kwargs.get('max_tokens', 150),
                    )
                )
            )
            
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            self.available = False
            raise
    
    async def generate_logical_puzzle(self, theme: str, difficulty: str) -> Dict:
        """Generate logical puzzles using Gemini"""
        prompt = f"""
        Create a logical puzzle for a treasure hunt with these parameters:
        - Theme: {theme}
        - Difficulty: {difficulty}
        
        The puzzle should be:
        - Logically sound and solvable
        - Thematically appropriate
        - Engaging and challenging
        - Suitable for outdoor exploration
        
        Return the puzzle and its solution in a structured format.
        """
        
        try:
            response = await self.generate_content(prompt, temperature=0.3)
            
            # Parse the response into structured data
            puzzle_data = {
                "puzzle": response,
                "type": "logical",
                "difficulty": difficulty,
                "solution_hints": []  # Would be extracted from response
            }
            
            return puzzle_data
            
        except Exception as e:
            logger.error(f"Puzzle generation failed: {str(e)}")
            return {}
    
    async def generate_mathematical_challenge(self, complexity: str) -> Dict:
        """Generate mathematical challenges"""
        prompt = f"""
        Create a mathematical challenge for a treasure hunt with {complexity} complexity.
        
        The challenge should involve:
        - Basic arithmetic or geometry
        - Pattern recognition
        - Logical reasoning
        - Real-world application
        
        Make it fun and engaging, not just a math problem.
        """
        
        try:
            response = await self.generate_content(prompt, temperature=0.4)
            
            return {
                "challenge": response,
                "type": "mathematical",
                "complexity": complexity,
                "requires_calculation": True
            }
            
        except Exception as e:
            logger.error(f"Math challenge generation failed: {str(e)}")
            return {}