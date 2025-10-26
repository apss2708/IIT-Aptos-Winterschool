from fastapi import FastAPI
from .models.conversation_engine import ConversationEngine
from .models.npc_manager import NPCManager
from .utils.config import Config

app = FastAPI()
config = Config()
conversation_engine = ConversationEngine(config.get('openai_api_key'))
npc_manager = NPCManager()

@app.get("/")
async def root():
    return {"status": "NPC Guardian Service Running"}

@app.post("/conversation/{npc_id}")
async def converse_with_npc(npc_id: str, message: str, context: dict):
    response = await conversation_engine.generate_response(message, context)
    return {"npc_id": npc_id, "response": response}