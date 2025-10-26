from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "World Builder Service Running"}

@app.post("/generate-location")
async def generate_location(theme: str, difficulty: str):
    # This would generate a location description and challenges
    return {
        "location": "Ancient ruins hidden in the jungle",
        "challenges": ["Find the hidden entrance", "Solve the stone puzzle"],
        "difficulty": difficulty
    }