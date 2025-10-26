const TreasureHuntClient = require("../interactions/create_hunt");

async function setupTestData() {
    const client = new TreasureHuntClient("testnet");
    
    // Create test accounts
    const admin = new AptosAccount();
    const player1 = new AptosAccount();
    const player2 = new AptosAccount();

    // Fund accounts (assuming testnet)
    // ... funding code ...

    // Initialize players
    await client.initializePlayer(player1);
    await client.initializePlayer(player2);

    // Create a treasure hunt
    const huntTx = await client.createTreasureHunt(
        admin,
        "Ancient Ruins Adventure",
        "Discover hidden treasures in ancient ruins",
        "1000000",
        true
    );

    console.log("Test data setup complete");
}

setupTestData().catch(console.error);