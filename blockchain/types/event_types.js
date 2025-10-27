// Event type definitions for Treasure Hunt

const EVENT_TYPES = {
    // Treasure Hunt Events
    TREASURE_HUNT_CREATED: "treasure_hunt_created",
    TREASURE_ADDED: "treasure_added",
    TREASURE_CLAIMED: "treasure_claimed",
    PLAYER_REGISTERED: "player_registered",
    TRUST_SCORE_UPDATED: "trust_score_updated",

    // AI Events
    AI_CLUE_GENERATED: "ai_clue_generated",
    AI_DIFFICULTY_ADJUSTED: "ai_difficulty_adjusted",
    AI_PLAYER_INSIGHT: "ai_player_insight",
    AI_ORACLE_REQUESTED: "ai_oracle_requested",
    AI_ORACLE_RESPONDED: "ai_oracle_responded",

    // Location Events
    LOCATION_VERIFIED: "location_verified",
    LOCATION_PROOF_SUBMITTED: "location_proof_submitted",

    // NFT Events
    NFT_MINTED: "nft_minted",
    NFT_TRANSFERRED: "nft_transferred",
    NFT_METADATA_UPDATED: "nft_metadata_updated"
};

// Event data schemas
const EVENT_SCHEMAS = {
    [EVENT_TYPES.TREASURE_HUNT_CREATED]: {
        hunt_id: "u64",
        creator: "address",
        title: "string",
        total_treasures: "u64",
        ai_integration: "boolean"
    },

    [EVENT_TYPES.TREASURE_CLAIMED]: {
        hunt_id: "u64",
        treasure_id: "u64",
        claimer: "address",
        reward_amount: "u64",
        claimed_at: "u64",
        trust_score: "u64"
    },

    [EVENT_TYPES.AI_CLUE_GENERATED]: {
        hunt_id: "u64",
        treasure_id: "u64",
        clue_hash: "vector<u8>",
        ai_model: "string",
        generated_at: "u64"
    },

    [EVENT_TYPES.AI_ORACLE_REQUESTED]: {
        request_id: "u64",
        treasure_id: "u64",
        player: "address",
        input_data: "vector<u8>",
        location_hash: "vector<u8>",
        timestamp: "u64"
    }
};

// Event filter utilities
class EventFilters {
    static filterByType(events, eventType) {
        return events.filter(event => event.type === eventType);
    }

    static filterByPlayer(events, playerAddress) {
        return events.filter(event => 
            event.data.player === playerAddress || 
            event.data.claimer === playerAddress ||
            event.data.creator === playerAddress
        );
    }

    static filterByHunt(events, huntId) {
        return events.filter(event => event.data.hunt_id === huntId);
    }

    static filterByTimeRange(events, startTime, endTime) {
        return events.filter(event => {
            const eventTime = event.data.timestamp || event.data.claimed_at || event.data.generated_at;
            return eventTime >= startTime && eventTime <= endTime;
        });
    }
}

// Event parser
class EventParser {
    static parseEventData(event, eventType) {
        const schema = EVENT_SCHEMAS[eventType];
        if (!schema) {
            return event.data;
        }

        const parsed = {};
        for (const [key, type] of Object.entries(schema)) {
            if (event.data[key] !== undefined) {
                parsed[key] = this.convertType(event.data[key], type);
            }
        }
        return parsed;
    }

    static convertType(value, type) {
        switch (type) {
            case 'u64':
                return BigInt(value);
            case 'address':
                return value.toString();
            case 'vector<u8>':
                return Buffer.from(value).toString('hex');
            default:
                return value;
        }
    }
}

module.exports = {
    EVENT_TYPES,
    EVENT_SCHEMAS,
    EventFilters,
    EventParser
};