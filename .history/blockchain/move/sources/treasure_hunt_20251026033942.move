module treasure_hunt::treasure_hunt {
    use std::signer;
    use std::vector;
    use std::string::{String};
    use aptos_framework::event;
    use aptos_framework::object::{Object};
    use aptos_framework::aptos_token::{Token};
    
    // Error codes
    const E_NOT_CREATOR: u64 = 1;
    const E_TREASURE_NOT_FOUND: u64 = 2;
    const E_TREASURE_ALREADY_CLAIMED: u64 = 3;
    const E_INVALID_LOCATION: u64 = 4;
    const E_INSUFFICIENT_REWARDS: u64 = 5;
    const E_HUNT_NOT_ACTIVE: u64 = 6;
    const E_INSUFFICIENT_BALANCE: u64 = 7;

    struct Treasure has key, store {
        id: u64,
        hunt_id: u64,
        creator: address,
        location_hash: vector<u8>,
        reward_amount: u64,
        claimed: bool,
        claimed_by: address,
        metadata_uri: String,
        created_at: u64,
        claimed_at: u64,
        difficulty_level: u64,
        ai_enhanced: bool
    }

    struct TreasureHunt has key {
        id: u64,
        creator: address,
        title: String,
        description: String,
        total_treasures: u64,
        claimed_treasures: u64,
        total_reward_pool: u64,
        remaining_rewards: u64,
        is_active: bool,
        created_at: u64,
        treasures: vector<u64>,
        participant_count: u64,
        ai_integration: bool
    }

    struct PlayerStats has key {
        player: address,
        total_treasures_found: u64,
        total_rewards_earned: u64,
        trust_score: u64,
        joined_at: u64,
        last_activity: u64
    }

    struct GlobalConfig has key {
        admin: address,
        treasure_count: u64,
        hunt_count: u64,
        fee_percentage: u64,
        total_players: u64,
        total_rewards_distributed: u64
    }

    // Events
    struct TreasureHuntCreated has drop, store {
        hunt_id: u64,
        creator: address,
        title: String,
        total_treasures: u64,
        ai_integration: bool
    }

    struct TreasureAdded has drop, store {
        hunt_id: u64,
        treasure_id: u64,
        location_hash: vector<u8>,
        reward_amount: u64,
        difficulty_level: u64
    }

    struct TreasureClaimed has drop, store {
        hunt_id: u64,
        treasure_id: u64,
        claimer: address,
        reward_amount: u64,
        claimed_at: u64,
        trust_score: u64
    }

    struct PlayerRegistered has drop, store {
        player: address,
        registered_at: u64
    }

    // Initialization
    public entry fun initialize(admin: &signer) {
        assert!(signer::address_of(admin) == @treasure_hunt, 0);
        
        move_to(admin, GlobalConfig {
            admin: signer::address_of(admin),
            treasure_count: 0,
            hunt_count: 0,
            fee_percentage: 2, // 2% platform fee
            total_players: 0,
            total_rewards_distributed: 0
        });
    }

    // Register player
    public entry fun register_player(player: &signer) acquires GlobalConfig, PlayerStats {
        let player_addr = signer::address_of(player);
        
        if (!exists<PlayerStats>(player_addr)) {
            move_to(player, PlayerStats {
                player: player_addr,
                total_treasures_found: 0,
                total_rewards_earned: 0,
                trust_score: 100, // Start with 100 trust
                joined_at: timestamp::now_seconds(),
                last_activity: timestamp::now_seconds()
            });

            let global_config = borrow_global_mut<GlobalConfig>(@treasure_hunt);
            global_config.total_players = global_config.total_players + 1;

            event::emit(PlayerRegistered {
                player: player_addr,
                registered_at: timestamp::now_seconds()
            });
        };
    }

    // Create a new treasure hunt
    public entry fun create_treasure_hunt(
        creator: &signer,
        title: String,
        description: String,
        total_reward_pool: u64,
        ai_integration: bool
    ) acquires GlobalConfig {
        let global_config = borrow_global_mut<GlobalConfig>(@treasure_hunt);
        let hunt_id = global_config.hunt_count + 1;
        
        move_to(creator, TreasureHunt {
            id: hunt_id,
            creator: signer::address_of(creator),
            title,
            description,
            total_treasures: 0,
            claimed_treasures: 0,
            total_reward_pool,
            remaining_rewards: total_reward_pool,
            is_active: true,
            created_at: timestamp::now_seconds(),
            treasures: vector::empty(),
            participant_count: 0,
            ai_integration
        });

        global_config.hunt_count = hunt_id;
        
        event::emit(TreasureHuntCreated {
            hunt_id,
            creator: signer::address_of(creator),
            title: copy title,
            total_treasures: 0,
            ai_integration
        });
    }

    // Add treasure to hunt
    public entry fun add_treasure_to_hunt(
        creator: &signer,
        hunt_id: u64,
        location_hash: vector<u8>,
        reward_amount: u64,
        metadata_uri: String,
        difficulty_level: u64,
        ai_enhanced: bool
    ) acquires GlobalConfig, TreasureHunt {
        let creator_addr = signer::address_of(creator);
        let hunt = borrow_global_mut<TreasureHunt>(creator_addr);
        
        assert!(hunt.id == hunt_id, E_HUNT_NOT_FOUND);
        assert!(hunt.creator == creator_addr, E_NOT_CREATOR);
        assert!(hunt.remaining_rewards >= reward_amount, E_INSUFFICIENT_REWARDS);
        
        let global_config = borrow_global_mut<GlobalConfig>(@treasure_hunt);
        let treasure_id = global_config.treasure_count + 1;

        move_to(creator, Treasure {
            id: treasure_id,
            hunt_id,
            creator: creator_addr,
            location_hash,
            reward_amount,
            claimed: false,
            claimed_by: @0x0,
            metadata_uri,
            created_at: timestamp::now_seconds(),
            claimed_at: 0,
            difficulty_level,
            ai_enhanced
        });

        hunt.total_treasures = hunt.total_treasures + 1;
        hunt.remaining_rewards = hunt.remaining_rewards - reward_amount;
        vector::push_back(&mut hunt.treasures, treasure_id);
        
        global_config.treasure_count = treasure_id;

        event::emit(TreasureAdded {
            hunt_id,
            treasure_id,
            location_hash: copy location_hash,
            reward_amount,
            difficulty_level
        });
    }

    // Claim treasure with location proof
    public entry fun claim_treasure(
        claimer: &signer,
        treasure_id: u64,
        location_proof: vector<u8>,
        trust_score: u64
    ) acquires GlobalConfig, Treasure, TreasureHunt, PlayerStats {
        let claimer_addr = signer::address_of(claimer);
        
        // Ensure player is registered
        register_player(claimer);
        
        let treasure = borrow_global_mut<Treasure>(claimer_addr);
        
        assert!(treasure.id == treasure_id, E_TREASURE_NOT_FOUND);
        assert!(!treasure.claimed, E_TREASURE_ALREADY_CLAIMED);
        
        // Verify location proof
        assert!(verify_location_proof(treasure.location_hash, location_proof), E_INVALID_LOCATION);

        // Mark treasure as claimed
        treasure.claimed = true;
        treasure.claimed_by = claimer_addr;
        treasure.claimed_at = timestamp::now_seconds();

        // Update hunt stats
        let hunt = borrow_global_mut<TreasureHunt>(treasure.creator);
        hunt.claimed_treasures = hunt.claimed_treasures + 1;
        hunt.participant_count = hunt.participant_count + 1;

        // Update player stats
        let player_stats = borrow_global_mut<PlayerStats>(claimer_addr);
        player_stats.total_treasures_found = player_stats.total_treasures_found + 1;
        player_stats.total_rewards_earned = player_stats.total_rewards_earned + treasure.reward_amount;
        player_stats.trust_score = trust_score;
        player_stats.last_activity = timestamp::now_seconds();

        // Update global stats
        let global_config = borrow_global_mut<GlobalConfig>(@treasure_hunt);
        global_config.total_rewards_distributed = global_config.total_rewards_distributed + treasure.reward_amount;

        event::emit(TreasureClaimed {
            hunt_id: treasure.hunt_id,
            treasure_id,
            claimer: claimer_addr,
            reward_amount: treasure.reward_amount,
            claimed_at: treasure.claimed_at,
            trust_score
        });
    }

    // Update player trust score (called by AI anti-cheat system)
    public entry fun update_trust_score(
        admin: &signer,
        player: address,
        new_trust_score: u64
    ) acquires PlayerStats {
        assert!(signer::address_of(admin) == @treasure_hunt, E_NOT_CREATOR);
        
        if (exists<PlayerStats>(player)) {
            let player_stats = borrow_global_mut<PlayerStats>(player);
            player_stats.trust_score = new_trust_score;
            player_stats.last_activity = timestamp::now_seconds();
        };
    }

    // Helper function to verify location proof
    fun verify_location_proof(stored_hash: vector<u8>, proof: vector<u8>): bool {
        // In production, this would use proper cryptographic verification
        // For now, simple length-based check
        vector::length(&stored_hash) == vector::length(&proof)
    }

    // Get player statistics
    public fun get_player_stats(player: address): &PlayerStats {
        borrow_global<PlayerStats>(player)
    }

    // Get treasure details
    public fun get_treasure_details(treasure_id: u64): &Treasure {
        // Implementation would depend on how treasures are stored
        abort 0
    }
}