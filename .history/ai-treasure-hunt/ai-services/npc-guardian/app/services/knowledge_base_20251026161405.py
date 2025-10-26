class KnowledgeBase:
    def __init__(self):
        self.knowledge = {}
    
    def add_knowledge(self, domain: str, facts: List[str]):
        if domain not in self.knowledge:
            self.knowledge[domain] = []
        
        self.knowledge[domain].extend(facts)
    
    def get_knowledge(self, domain: str) -> List[str]:
        return self.knowledge.get(domain, [])
    
    def search_knowledge(self, query: str) -> List[str]:
        results = []
        for domain, facts in self.knowledge.items():
            for fact in facts:
                if query.lower() in fact.lower():
                    results.append(fact)
        return results