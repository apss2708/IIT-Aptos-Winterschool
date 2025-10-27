module treasure_hunt::dynamic_nft {
    use std::signer;
    use std::string::{String};
    use aptos_framework::object;
    use aptos_framework::aptos_token;
    use aptos_framework::property_map;

    // Dynamic NFT with AI-enhanced properties
    struct DynamicNFT has key {
        token: Object<aptos_token::Token>,
        treasure_id: u64,
        hunt_id: u64,
        base_metadata: String,
        dynamic_properties: property_map::PropertyMap,
        ai_enhancements: vector<String>,
        created_at: u64,
        last_updated: u64,
        upgrade_count: u64
    }

    struct NFTCollection has key {
        collection: Object<aptos_token::Collection>,
        hunt_id: u64,
        total_minted: u64,
        max_supply: u64
    }

    // Events
    struct NFTCreated has drop, store {
        nft_id: Object<aptos_token::Token>,
        treasure_id: u64,
        hunt_id: u64,
        owner: address
    }

    struct NFTUpdated has drop, store {
        nft_id: Object<aptos_token::Token>,
        property_name: String,
        new_value: vector<u8>,
        updated_by: address
    }

    struct AIEnhancementApplied has drop, store {
        nft_id: Object<aptos_token::Token>,
        enhancement_type: String,
        applied_at: u64
    }

    // Initialize NFT collection for treasure hunt
    public entry fun initialize_collection(
        creator: &signer,
        hunt_id: u64,
        collection_name: String,
        description: String,
        max_supply: u64
    ) {
        let collection_object = aptos_token::create_collection(
            creator,
            collection_name,
            description,
            string::utf8(b"https://treasure-hunt.com/metadata/"),
            max_supply,
            vector<bool>[true, true, true] // mutability configuration
        );

        move_to(creator, NFTCollection {
            collection: collection_object,
            hunt_id,
            total_minted: 0,
            max_supply
        });
    }

    // Mint dynamic NFT for treasure
    public entry fun mint_dynamic_nft(
        creator: &signer,
        hunt_id: u64,
        treasure_id: u64,
        metadata_uri: String,
        initial_properties: vector<String>
    ) acquires NFTCollection {
        let collection = borrow_global_mut<NFTCollection>(signer::address_of(creator));
        assert!(collection.hunt_id == hunt_id, 1);
        assert!(collection.total_minted < collection.max_supply, 2);

        // Create NFT using Aptos Token standard
        let token_object = aptos_token::mint_token(
            creator,
            string::utf8(b"Treasure NFT"),
            string::utf8(b"AI-Enhanced Treasure Hunt NFT"),
            1, // maximum per address
            metadata_uri,
            signer::address_of(creator),
            collection.max_supply,
            50000, // 5% royalty
            string::utf8(b"https://treasure-hunt.com/"),
            vector<bool>[true, true, true] // mutability
        );

        // Create property map for dynamic properties
        let property_map = property_map::new();
        initialize_properties(&mut property_map, initial_properties);

        let dynamic_nft = DynamicNFT {
            token: token_object,
            treasure_id,
            hunt_id,
            base_metadata: metadata_uri,
            dynamic_properties: property_map,
            ai_enhancements: vector::empty(),
            created_at: timestamp::now_seconds(),
            last_updated: timestamp::now_seconds(),
            upgrade_count: 0
        };

        move_to(creator, dynamic_nft);
        collection.total_minted = collection.total_minted + 1;

        event::emit(NFTCreated {
            nft_id: token_object,
            treasure_id,
            hunt_id,
            owner: signer::address_of(creator)
        });
    }

    // Update NFT property dynamically
    public entry fun update_nft_property(
        owner: &signer,
        property_name: String,
        property_value: vector<u8>
    ) acquires DynamicNFT {
        let nft = borrow_global_mut<DynamicNFT>(signer::address_of(owner));
        
        property_map::add(&mut nft.dynamic_properties, property_name, property_value);
        nft.last_updated = timestamp::now_seconds();

        event::emit(NFTUpdated {
            nft_id: nft.token,
            property_name: copy property_name,
            new_value: property_value,
            updated_by: signer::address_of(owner)
        });
    }

    // Apply AI enhancement to NFT
    public entry fun apply_ai_enhancement(
        owner: &signer,
        enhancement_type: String,
        enhancement_data: vector<u8>
    ) acquires DynamicNFT {
        let nft = borrow_global_mut<DynamicNFT>(signer::address_of(owner));
        
        // Add AI enhancement
        vector::push_back(&mut nft.ai_enhancements, enhancement_type);
        
        // Update properties with AI data
        property_map::add(&mut nft.dynamic_properties, enhancement_type, enhancement_data);
        
        nft.upgrade_count = nft.upgrade_count + 1;
        nft.last_updated = timestamp::now_seconds();

        event::emit(AIEnhancementApplied {
            nft_id: nft.token,
            enhancement_type: copy enhancement_type,
            applied_at: timestamp::now_seconds()
        });
    }

    // Get NFT dynamic properties
    public fun get_nft_properties(owner: address): &property_map::PropertyMap acquires DynamicNFT {
        let nft = borrow_global<DynamicNFT>(owner);
        &nft.dynamic_properties
    }

    // Transfer NFT to new owner
    public entry fun transfer_nft(
        current_owner: &signer,
        new_owner: address
    ) acquires DynamicNFT {
        let owner_addr = signer::address_of(current_owner);
        let nft = borrow_global<DynamicNFT>(owner_addr);
        
        // Transfer using Aptos Token standard
        object::transfer(current_owner, nft.token, new_owner);
    }

    // Helper function to initialize properties
    fun initialize_properties(property_map: &mut property_map::PropertyMap, properties: vector<String>) {
        let i = 0;
        while (i < vector::length(&properties)) {
            let property = vector::borrow(&properties, i);
            property_map::add(property_map, copy property, b"initial_value");
            i = i + 1;
        };
    }

    // Get NFT statistics
    public fun get_nft_stats(owner: address): (u64, u64, u64) acquires DynamicNFT {
        let nft = borrow_global<DynamicNFT>(owner);
        (
            nft.upgrade_count,
            property_map::length(&nft.dynamic_properties),
            vector::length(&nft.ai_enhancements)
        )
    }
}
