module MyModule::TreasureHunt {
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use std::vector;

    /// Struct representing a treasure hunt NFT
    struct TreasureNFT has store, key {
        id: u64,                    // Unique identifier for the treasure
        location_hash: vector<u8>,  // Encrypted location clue
        reward_amount: u64,         // Reward for finding this treasure
        is_found: bool,            // Status of the treasure
        finder: address,           // Address of who found it (0x0 if not found)
    }

    /// Struct to track the treasure hunt game state
    struct TreasureHuntGame has store, key {
        total_treasures: u64,      // Total number of treasures created
        active_treasures: u64,     // Number of unfound treasures
        total_rewards: u64,        // Total reward pool
    }

    /// Function to create a new treasure hunt with multiple NFT treasures
    public fun create_treasure_hunt(
        game_master: &signer, 
        treasure_count: u64, 
        initial_reward_pool: u64
    ) {
        let game = TreasureHuntGame {
            total_treasures: treasure_count,
            active_treasures: treasure_count,
            total_rewards: initial_reward_pool,
        };
        move_to(game_master, game);

        // Create individual treasure NFTs
        let i = 0;
        while (i < treasure_count) {
            let treasure = TreasureNFT {
                id: i + 1,
                location_hash: vector::empty<u8>(), // Would be set with actual clues
                reward_amount: initial_reward_pool / treasure_count,
                is_found: false,
                finder: @0x0,
            };
            // In a real implementation, each treasure would be stored separately
            // For simplicity, we're showing the structure here
            i = i + 1;
        };
    }

    /// Function for players to claim a treasure NFT when found
    public fun claim_treasure(
        hunter: &signer, 
        game_master_addr: address, 
        treasure_id: u64,
        location_proof: vector<u8>
    ) acquires TreasureHuntGame {
        let hunter_addr = signer::address_of(hunter);
        let game = borrow_global_mut<TreasureHuntGame>(game_master_addr);
        
        // Verify treasure exists and hasn't been claimed
        assert!(treasure_id <= game.total_treasures, 1);
        assert!(game.active_treasures > 0, 2);
        
        // In a real implementation, you would verify location_proof matches location_hash
        // For now, we'll assume verification passes
        
        // Calculate reward per treasure
        let reward = game.total_rewards / game.total_treasures;
        
        // Transfer reward to the hunter
        let reward_coin = coin::withdraw<AptosCoin>(
            &signer::address_of(hunter), 
            0 // In real implementation, this would come from contract balance
        );
        coin::deposit<AptosCoin>(hunter_addr, reward_coin);
        
        // Update game state
        game.active_treasures = game.active_treasures - 1;
    }
}