module treasure_hunt::reward_pool {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin;

    struct RewardPool has key {
        total_funds: u64,
        distributed_funds: u64,
        pending_rewards: vector<u64>,
        owner: address
    }

    struct PendingReward has store, drop {
        player: address,
        amount: u64,
        treasure_id: u64,
        timestamp: u64
    }

    // Initialize reward pool
    public entry fun initialize_reward_pool(owner: &signer, initial_funds: u64) {
        let owner_addr = signer::address_of(owner);
        
        move_to(owner, RewardPool {
            total_funds: initial_funds,
            distributed_funds: 0,
            pending_rewards: vector::empty(),
            owner: owner_addr
        });
    }

    // Add funds to reward pool
    public entry fun add_funds(owner: &signer, amount: u64) acquires RewardPool {
        let owner_addr = signer::address_of(owner);
        let pool = borrow_global_mut<RewardPool>(owner_addr);
        
        pool.total_funds = pool.total_funds + amount;
    }

    // Create pending reward
    public entry fun create_pending_reward(
        owner: &signer,
        player: address,
        amount: u64,
        treasure_id: u64
    ) acquires RewardPool {
        let owner_addr = signer::address_of(owner);
        let pool = borrow_global_mut<RewardPool>(owner_addr);
        
        assert!(pool.total_funds >= pool.distributed_funds + amount, 100);
        
        let pending_reward = PendingReward {
            player,
            amount,
            treasure_id,
            timestamp: timestamp::now_seconds()
        };
        
        vector::push_back(&mut pool.pending_rewards, pending_reward);
    }

    // Distribute reward to player
    public entry fun distribute_reward(
        owner: &signer,
        player: address,
        treasure_id: u64
    ) acquires RewardPool {
        let owner_addr = signer::address_of(owner);
        let pool = borrow_global_mut<RewardPool>(owner_addr);
        
        let i = 0;
        let reward_amount: u64 = 0;
        let found = false;
        
        while (i < vector::length(&pool.pending_rewards)) {
            let reward = vector::borrow(&pool.pending_rewards, i);
            if (reward.player == player && reward.treasure_id == treasure_id) {
                reward_amount = reward.amount;
                found = true;
                break;
            };
            i = i + 1;
        };
        
        assert!(found, 101);
        assert!(pool.total_funds >= pool.distributed_funds + reward_amount, 102);
        
        // Update pool statistics
        pool.distributed_funds = pool.distributed_funds + reward_amount;
        
        // Remove the pending reward
        vector::remove(&mut pool.pending_rewards, i);
    }

    // Get pool statistics
    public fun get_pool_stats(owner: address): (u64, u64) acquires RewardPool {
        let pool = borrow_global<RewardPool>(owner);
        (pool.total_funds, pool.distributed_funds)
    }

    // Calculate available funds
    public fun get_available_funds(owner: address): u64 acquires RewardPool {
        let pool = borrow_global<RewardPool>(owner);
        pool.total_funds - pool.distributed_funds
    }
}