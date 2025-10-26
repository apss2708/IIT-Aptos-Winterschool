from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import logging
from models.advanced_clue_generator import AdvancedClueGenerator, PlayerProfile
from models.puzzle_engine import PuzzleEngine
from models.narrative_builder import NarrativeBuilder
import asyncio
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Clue Generator", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI components
clue_generator = AdvancedClueGenerator()
puzzle_engine = PuzzleEngine()
narrative_builder = NarrativeBuilder()

class ClueRequest(BaseModel):
    hunt_theme: str
    difficulty: str
    player_level: int
    location_data: Dict
    previous_clues: List[Dict] = []
    player_profile: Optional[Dict] = None

class PuzzleRequest(BaseModel):
    puzzle_type: str
    complexity: str
    theme: str
    location_context: Dict

class NarrativeRequest(BaseModel):
    hunt_id: str
    player_profile: Dict
    story_elements: List[str]

@app.get("/")
async def root():
    return {"status": "AI Clue Generator Service Running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "clue-generator"}

@app.post("/generate-clue")
async def generate_clue(request: ClueRequest, background_tasks: BackgroundTasks):
    try:
        logger.info(f"Generating clue for theme: {request.hunt_theme}")
        
        # Create player profile
        player_profile = PlayerProfile(
            level=request.player_level,
            success_rate=request.player_profile.get('success_rate', 0.5) if request.player_profile else 0.5,
            preferred_clue_types=request.player_profile.get('preferred_clue_types', []) if request.player_profile else [],
            learning_style=request.player_profile.get('learning_style', 'visual') if request.player_profile else 'visual',
            cultural_context=request.player_profile.get('cultural_context', 'neutral') if request.player_profile else 'neutral',
            avg_solving_time=request.player_profile.get('avg_solving_time', 180) if request.player_profile else 180
        )
        
        # Generate clue
        clue = await clue_generator.generate_contextual_clue(
            location=request.location_data,
            player=player_profile,
            hunt_context={
                'theme': request.hunt_theme,
                'difficulty': request.difficulty,
                'previous_clues': request.previous_clues
            },
            previous_clues=request.previous_clues
        )
        
        # Log generation in background
        background_tasks.add_task(
            log_clue_generation,
            request.hunt_theme,
            request.player_level,
            clue.get('quality_score', 0)
        )
        
        return {
            "clue": clue,
            "status": "success",
            "generation_id": clue.get('crypto_proof', {}).get('hash', '')
        }
        
    except Exception as e:
        logger.error(f"Clue generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Clue generation failed: {str(e)}")

@app.post("/generate-puzzle")
async def generate_puzzle(request: PuzzleRequest):
    try:
        logger.info(f"Generating {request.puzzle_type} puzzle")
        
        puzzle = await puzzle_engine.create_puzzle(
            puzzle_type=request.puzzle_type,
            complexity=request.complexity,
            theme=request.theme,
            location_context=request.location_context
        )
        
        return {
            "puzzle": puzzle,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Puzzle generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/build-narrative")
async def build_narrative(request: NarrativeRequest):
    try:
        logger.info(f"Building narrative for hunt: {request.hunt_id}")
        
        narrative = await narrative_builder.create_storyline(
            hunt_id=request.hunt_id,
            player_profile=request.player_profile,
            story_elements=request.story_elements
        )
        
        return {
            "narrative": narrative,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Narrative building failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/clue-stats")
async def get_clue_stats():
    """Get statistics about clue generation"""
    try:
        stats = await clue_generator.get_generation_stats()
        return {"stats": stats, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def log_clue_generation(theme: str, player_level: int, quality_score: float):
    """Background task to log clue generation"""
    try:
        # In production, this would write to a database
        logger.info(f"Clue generated - Theme: {theme}, Level: {player_level}, Quality: {quality_score}")
    except Exception as e:
        logger.error(f"Failed to log clue generation: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)