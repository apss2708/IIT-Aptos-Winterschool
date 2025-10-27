#[test]
fun test_mint_nft() {
    let admin = @0x123;
    let treasure_id = 1;
    let hunt_id = 1;
    let metadata = "https://example.com/metadata.json";

    // Test minting NFT
    nft_manager::mint_treasure_nft(admin, hunt_id, treasure_id, metadata);

    // Verify NFT was created
    assert!(exists<nft_manager::TreasureNFT>(admin), 1);
}