module treasure_hunt::nft_manager {
    use std::signer;
    use std::string::{String};
    use aptos_framework::object;
    use aptos_framework::aptos_token;

    struct TreasureNFT has key {
        nft: Object<aptos_token::Token>,
        treasure_id: u64,
        hunt_id: u64,
        metadata: String,
        created_at: u64
    }

    public entry fun mint_treasure_nft(
        creator: &signer,
        hunt_id: u64,
        treasure_id: u64,
        metadata: String
    ) {
        let nft = aptos_token::mint_token(
            creator,
            string::utf8(b"Treasure Hunt NFT"),
            string::utf8(b"An NFT representing a treasure in the hunt"),
            1,
            metadata,
            signer::address_of(creator),
            1,
            0,
            string::utf8(b"https://treasure-hunt.com/"),
            vector<bool>[true, true, true]
        );

        move_to(creator, TreasureNFT {
            nft,
            treasure_id,
            hunt_id,
            metadata,
            created_at: timestamp::now_seconds()
        });
    }
}