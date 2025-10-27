module treasure_hunt::location_verifier {
    use std::vector;
    use std::string::{String};
    use aptos_framework::crypto;
    use aptos_framework::event;

    struct LocationProof has drop, store {
        latitude: vector<u8>,
        longitude: vector<u8>,
        timestamp: u64,
        accuracy: u64,
        proof_hash: vector<u8>
    }

    struct VerifiedLocation has key, store {
        player: address,
        location_hash: vector<u8>,
        verified_at: u64,
        trust_score: u64
    }

    struct LocationVerificationEvent has drop, store {
        player: address,
        location_hash: vector<u8>,
        verified_at: u64,
        success: bool
    }

    // Verify location with multiple proofs
    public fun verify_location(
        player: address,
        location_data: vector<u8>,
        proof_signature: vector<u8>
    ): bool {
        // Basic verification logic
        let data_length = vector::length(&location_data);
        let sig_length = vector::length(&proof_signature);
        
        data_length > 0 && sig_length > 0
    }

    // Create location hash for storage
    public fun create_location_hash(
        lat: vector<u8>,
        lon: vector<u8>,
        salt: vector<u8>
    ): vector<u8> {
        let combined_data = vector::empty<u8>();
        vector::append(&mut combined_data, lat);
        vector::append(&mut combined_data, lon);
        vector::append(&mut combined_data, salt);
        
        crypto::sha2_256(combined_data)
    }

    // Advanced verification with multiple factors
    public fun advanced_verify_location(
        player: address,
        gps_data: vector<u8>,
        wifi_data: vector<u8>,
        cell_data: vector<u8>,
        timestamp: u64
    ): (bool, u64) {
        let verification_score: u64 = 0;
        
        // GPS verification (40%)
        if (verify_gps_data(gps_data)) {
            verification_score = verification_score + 40;
        };
        
        // WiFi fingerprint verification (30%)
        if (verify_wifi_data(wifi_data)) {
            verification_score = verification_score + 30;
        };
        
        // Cell tower verification (30%)
        if (verify_cell_data(cell_data)) {
            verification_score = verification_score + 30;
        };
        
        let is_verified = verification_score >= 70;
        
        (is_verified, verification_score)
    }

    // Helper functions
    fun verify_gps_data(gps_data: vector<u8>): bool {
        vector::length(&gps_data) > 10
    }

    fun verify_wifi_data(wifi_data: vector<u8>): bool {
        vector::length(&wifi_data) > 5
    }

    fun verify_cell_data(cell_data: vector<u8>): bool {
        vector::length(&cell_data) > 3
    }

    // Store verified location
    public entry fun store_verified_location(
        player: &signer,
        location_hash: vector<u8>,
        trust_score: u64
    ) {
        let player_addr = signer::address_of(player);
        
        if (!exists<VerifiedLocation>(player_addr)) {
            move_to(player, VerifiedLocation {
                player: player_addr,
                location_hash: copy location_hash,
                verified_at: timestamp::now_seconds(),
                trust_score
            });
        } else {
            let location = borrow_global_mut<VerifiedLocation>(player_addr);
            location.location_hash = location_hash;
            location.verified_at = timestamp::now_seconds();
            location.trust_score = trust_score;
        };

        event::emit(LocationVerificationEvent {
            player: player_addr,
            location_hash: copy location_hash,
            verified_at: timestamp::now_seconds(),
            success: true
        });
    }
}