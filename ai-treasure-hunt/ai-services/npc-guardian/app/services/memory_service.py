class MemoryService:
    def __init__(self):
        self.memories = {}
    
    def store_memory(self, npc_id: str, memory: str):
        if npc_id not in self.memories:
            self.memories[npc_id] = []
        
        self.memories[npc_id].append({
            'memory': memory,
            'timestamp': datetime.utcnow()
        })
    
    def get_memories(self, npc_id: str, limit: int = 5) -> List[str]:
        if npc_id not in self.memories:
            return []
        
        memories = self.memories[npc_id][-limit:]
        return [mem['memory'] for mem in memories]