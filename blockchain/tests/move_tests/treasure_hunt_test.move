module treasure_hunt::treasure_hunt_tests {
    use std::signer;
    use treasure_hunt::treasure_hunt;
    use treasure_hunt::location_verifier;

    const TEST_ADMIN: address = @0x123;
    const TEST_PLAYER: address = @0x456;

    #[test]
    fun test_initialize_treasure_hunt() {
        let admin = account::create_account_for_test(TEST_ADMIN);
        
        treasure_hunt::initialize(&admin);
        
        // Verify initialization
        assert!(exists<treasure_hunt::GlobalConfig>(TEST_ADMIN), 1);
    }

    #[test]
    fun test_register_player() {
        let admin = account::create_account_for_test(TEST_ADMIN);
        let player = account::create_account_for_test(TEST_PLAYER);
        
        treasure_hunt::initialize(&admin);
        treasure_hunt::register_player(&player);
        
        assert!(exists<treasure_hunt::PlayerStats>(TEST_PLAYER), 1);
    }

    #[test]
    fun test_create_treasure_hunt() {
        let admin = account::create_account_for_test(TEST_ADMIN);
        
        treasure_hunt::initialize(&admin);
        treasure_hunt::create_treasure_hunt(
            &admin,
            b"Test Hunt",
            b"Test Description",
            1000000,
            true
        );
        
        assert!(exists<treasure_hunt::TreasureHunt>(TEST_ADMIN), 1);
    }

    #[test]
    fun test_add_treasure_to_hunt() {
        let admin = account::create_account_for_test(TEST_ADMIN);
        
        treasure_hunt::initialize(&admin);
        treasure_hunt::create_treasure_hunt(
            &admin,
            b"Test Hunt",
            b"Test Description",
            1000000,
            true
        );
        
        let location_hash = vector::empty<u8>();
        vector::push_back(&mut location_hash, 1);
        vector::push_back(&mut location_hash, 2);
        vector::push_back(&mut location_hash, 3);
        
        treasure_hunt::add_treasure_to_hunt(
            &admin,
            1,
            location_hash,
            100000,
            b"https://example.com/metadata.json",
            50,
            true
        );
        
        // Verify treasure was added
        let hunt = treasure_hunt::borrow_global<TreasureHunt>(TEST_ADMIN);
        assert!(vector::length(&hunt.treasures) == 1, 1);
    }

    #[test]
    fun test_location_verification() {
        let player = account::create_account_for_test(TEST_PLAYER);
        
        let location_data = vector::empty<u8>();
        vector::push_back(&mut location_data, 1);
        vector::push_back(&mut location_data, 2);
        
        let proof = vector::empty<u8>();
        vector::push_back(&mut proof, 1);
        vector::push_back(&mut proof, 2);
        
        let verified = location_verifier::verify_location(TEST_PLAYER, location_data, proof);
        assert!(verified, 1);
    }

    #[test]
    fun test_create_location_hash() {
        let lat = vector::empty<u8>();
        vector::push_back(&mut lat, 1);
        
        let lon = vector::empty<u8>();
        vector::push_back(&mut lon, 2);
        
        let salt = vector::empty<u8>();
        vector::push_back(&mut salt, 3);
        
        let hash = location_verifier::create_location_hash(lat, lon, salt);
        assert!(vector::length(&hash) > 0, 1);
    }
}