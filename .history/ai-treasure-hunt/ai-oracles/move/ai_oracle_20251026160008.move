module treasure_hunt::ai_oracle {
    use std::signer;
    use std::vector;
    use std::string::{String};
    use aptos_framework::event;
    use aptos_framework::crypto;

    // AI Oracle management
    struct AIOracle has key {
        admin: address,
        authorized_oracles: vector<address>,
        request_count: u64,
        active_requests: vector<u64>,
        last_heartbeat: u64
    }

    struct OracleRequest has store, drop {
        request_id: u64,
        request_type: u8, // 1=Clue, 2=Verification, 3=Reward, 4=Analysis
        requester: address,
        input_data: vector<u8>,
        status: u8, // 1=Pending, 2=Processing, 3=Completed, 4=Failed
        created_at: u64,
        completed_at: u64,
        result_data: vector<u8>
    }

    struct OracleResponse has store, drop {
        request_id: u64,
        oracle_address: address,
        result_data: vector<u8>,
        confidence_score: u64,
        processing_time: u64,
        signature: vector<u8>
    }

    // Events
    struct OracleRequestCreated has drop, store {
        request_id: u64,
        request_type: u8,
        requester: address,
        created_at: u64
    }

    struct OracleResponseSubmitted has drop, store {
        request_id: u64,
        oracle_address: address,
        confidence_score: u64,
        processing_time: u64
    }

    struct OracleAuthorized has drop, store {
        oracle_address: address,
        authorized_by: address,
        timestamp: u64
    }

    // Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_REQUEST_NOT_FOUND: u64 = 3;
    const E_INVALID_SIGNATURE: u64 = 4;

    // Initialize AI Oracle system
    public entry fun initialize_ai_oracle(admin: &signer) {
        assert!(signer::address_of(admin) == @treasure_hunt, E_NOT_ADMIN);
        
        move_to(admin, AIOracle {
            admin: signer::address_of(admin),
            authorized_oracles: vector::empty(),
            request_count: 0,
            active_requests: vector::empty(),
            last_heartbeat: timestamp::now_seconds()
        });
    }

    // Create AI processing request
    public entry fun create_ai_request(
        requester: &signer,
        request_type: u8,
        input_data: vector<u8>
    ) acquires AIOracle {
        let oracle = borrow_global_mut<AIOracle>(@treasure_hunt);
        let request_id = oracle.request_count + 1;

        // Create request (would be stored in a table in production)
        let request = OracleRequest {
            request_id,
            request_type,
            requester: signer::address_of(requester),
            input_data,
            status: 1, // Pending
            created_at: timestamp::now_seconds(),
            completed_at: 0,
            result_data: vector::empty()
        };

        // Add to active requests
        vector::push_back(&mut oracle.active_requests, request_id);
        oracle.request_count = request_id;
        oracle.last_heartbeat = timestamp::now_seconds();

        event::emit(OracleRequestCreated {
            request_id,
            request_type,
            requester: signer::address_of(requester),
            created_at: timestamp::now_seconds()
        });
    }

    // Submit AI response (authorized oracles only)
    public entry fun submit_ai_response(
        oracle: &signer,
        request_id: u64,
        result_data: vector<u8>,
        confidence_score: u64
    ) acquires AIOracle {
        assert!(is_authorized_oracle(signer::address_of(oracle)), E_NOT_AUTHORIZED);

        let oracle_addr = signer::address_of(oracle);
        let processing_time = timestamp::now_seconds(); // Would calculate actual processing time

        // Verify and process response
        let signature = create_response_signature(request_id, result_data, oracle_addr);
        
        // Update oracle state
        let oracle_global = borrow_global_mut<AIOracle>(@treasure_hunt);
        oracle_global.last_heartbeat = timestamp::now_seconds();

        // Remove from active requests
        remove_from_active_requests(oracle_global, request_id);

        event::emit(OracleResponseSubmitted {
            request_id,
            oracle_address: oracle_addr,
            confidence_score,
            processing_time
        });
    }

    // Add new oracle address
    public entry fun authorize_oracle(
        admin: &signer,
        oracle_address: address
    ) acquires AIOracle {
        assert!(signer::address_of(admin) == @treasure_hunt, E_NOT_ADMIN);
        
        let oracle = borrow_global_mut<AIOracle>(@treasure_hunt);
        
        if (!vector::contains(&oracle.authorized_oracles, &oracle_address)) {
            vector::push_back(&mut oracle.authorized_oracles, oracle_address);
            
            event::emit(OracleAuthorized {
                oracle_address,
                authorized_by: signer::address_of(admin),
                timestamp: timestamp::now_seconds()
            });
        };
    }

    // Remove oracle authorization
    public entry fun revoke_oracle(
        admin: &signer,
        oracle_address: address
    ) acquires AIOracle {
        assert!(signer::address_of(admin) == @treasure_hunt, E_NOT_ADMIN);
        
        let oracle = borrow_global_mut<AIOracle>(@treasure_hunt);
        
        let i = 0;
        while (i < vector::length(&oracle.authorized_oracles)) {
            if (*vector::borrow(&oracle.authorized_oracles, i) == oracle_address) {
                vector::remove(&mut oracle.authorized_oracles, i);
                break;
            };
            i = i + 1;
        };
    }

    // Heartbeat from oracle
    public entry fun oracle_heartbeat(oracle: &signer) acquires AIOracle {
        assert!(is_authorized_oracle(signer::address_of(oracle)), E_NOT_AUTHORIZED);
        
        let oracle_global = borrow_global_mut<AIOracle>(@treasure_hunt);
        oracle_global.last_heartbeat = timestamp::now_seconds();
    }

    // Helper functions
    fun is_authorized_oracle(addr: address): bool {
        let oracle = borrow_global<AIOracle>(@treasure_hunt);
        vector::contains(&oracle.authorized_oracles, &addr)
    }

    fun create_response_signature(
        request_id: u64,
        result_data: vector<u8>,
        oracle_addr: address
    ): vector<u8> {
        // Create signature for response verification
        // In production, this would use proper cryptographic signing
        let signature_data = vector::empty<u8>();
        vector::append(&mut signature_data, bcs::to_bytes(&request_id));
        vector::append(&mut signature_data, result_data);
        vector::append(&mut signature_data, bcs::to_bytes(&oracle_addr));
        
        crypto::sha2_256(signature_data)
    }

    fun remove_from_active_requests(oracle: &mut AIOracle, request_id: u64) {
        let i = 0;
        while (i < vector::length(&oracle.active_requests)) {
            if (*vector::borrow(&oracle.active_requests, i) == request_id) {
                vector::remove(&mut oracle.active_requests, i);
                break;
            };
            i = i + 1;
        };
    }

    // Get oracle statistics
    public fun get_oracle_stats(): (u64, u64, u64) acquires AIOracle {
        let oracle = borrow_global<AIOracle>(@treasure_hunt);
        (
            oracle.request_count,
            vector::length(&oracle.authorized_oracles),
            vector::length(&oracle.active_requests)
        )
    }
}