module.exports = {
    // Difficulty levels
    DIFFICULTY: {
        EASY: 25,
        MEDIUM: 50,
        HARD: 75,
        EXPERT: 100
    },

    // Trust score thresholds
    TRUST_SCORE: {
        LOW: 40,
        MEDIUM: 60,
        HIGH: 80,
        EXCELLENT: 90
    },

    // Reward multipliers based on trust score
    REWARD_MULTIPLIERS: {
        LOW: 0.5,
        MEDIUM: 0.8,
        HIGH: 1.0,
        EXCELLENT: 1.2
    },

    // AI integration flags
    AI_FEATURES: {
        DYNAMIC_CLUES: "dynamic_clues",
        BEHAVIOR_ANALYSIS: "behavior_analysis",
        NPC_INTERACTION: "npc_interaction",
        ADAPTIVE_DIFFICULTY: "adaptive_difficulty"
    },

    // Error messages
    ERRORS: {
        INSUFFICIENT_TRUST: "Insufficient trust score to claim treasure",
        LOCATION_MISMATCH: "Location verification failed",
        TREASURE_CLAIMED: "Treasure already claimed",
        HUNT_INACTIVE: "Treasure hunt is not active"
    },

    // Event types
    EVENT_TYPES: {
        HUNT_CREATED: "treasure_hunt_created",
        TREASURE_ADDED: "treasure_added",
        TREASURE_CLAIMED: "treasure_claimed",
        PLAYER_REGISTERED: "player_registered",
        TRUST_UPDATED: "trust_updated"
    }
};