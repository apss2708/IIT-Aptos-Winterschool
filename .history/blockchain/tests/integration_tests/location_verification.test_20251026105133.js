const { AptosClient, AptosAccount, FaucetClient } = require("aptos");
const { getNetworkConfig } = require("../../config/network_config");
const TreasureHuntClient = require("../../scripts/interactions/create_hunt");

describe("Location Verification Integration Tests", () => {
    let client;
    let treasureHuntClient;
    let admin;
    let player;

    beforeAll(async () => {
        const networkConfig = getNetworkConfig("testnet");
        client = new AptosClient(networkConfig.nodeUrl);
        treasureHuntClient = new TreasureHuntClient("testnet");

        // Create test accounts
        admin = new AptosAccount();
        player = new AptosAccount();

        // Fund accounts
        const faucetClient = new FaucetClient(networkConfig.nodeUrl, networkConfig.faucetUrl);
        await faucetClient.fundAccount(admin.address(), 100000000);
        await faucetClient.fundAccount(player.address(), 100000000);
    });

    it("should verify location and claim treasure", async () => {
        // Initialize player
        await treasureHuntClient.initializePlayer(player);

        // Create a treasure hunt
        const huntTx = await treasureHuntClient.createTreasureHunt(
            admin,
            "Location Test Hunt",
            "Testing location verification",
            "1000000",
            true
        );
        expect(huntTx).toBeDefined();

        // Add a treasure with a location hash
        const locationHash = "a1b2c3d4e5f6";
        const metadataUri = "https://example.com/treasure1.json";
        const addTx = await treasureHuntClient.addTreasure(
            admin,
            1,
            locationHash,
            "100000",
            metadataUri,
            50,
            true
        );
        expect(addTx).toBeDefined();

        // Claim treasure with location proof
        const locationProof = "a1b2c3d4e5f6"; // In reality, this would be a valid proof
        const trustScore = 85;
        const claimTx = await treasureHuntClient.claimTreasure(
            player,
            1,
            locationProof,
            trustScore
        );
        expect(claimTx).toBeDefined();

        // Verify player stats updated
        const stats = await treasureHuntClient.getPlayerStats(player.address());
        expect(stats.total_treasures_found).toBe(1);
    });

    it("should fail with invalid location proof", async () => {
        // Attempt to claim with invalid proof
        const invalidProof = "invalid_proof";

        await expect(
            treasureHuntClient.claimTreasure(player, 1, invalidProof, 85)
        ).rejects.toThrow();
    });

    it("should update trust score via AI", async () => {
        const newTrustScore = 75;
        const updateTx = await treasureHuntClient.updateTrustScore(
            admin,
            player.address(),
            newTrustScore
        );
        expect(updateTx).toBeDefined();

        // Verify trust score was updated
        const stats = await treasureHuntClient.getPlayerStats(player.address());
        expect(stats.trust_score).toBe(newTrustScore);
    });

    it("should handle multiple treasure claims", async () => {
        // Add multiple treasures
        for (let i = 2; i <= 5; i++) {
            await treasureHuntClient.addTreasure(
                admin,
                1, // hunt_id
                `location_hash_${i}`,
                "50000",
                `https://example.com/treasure${i}.json`,
                50,
                true
            );
        }

        // Claim multiple treasures
        const claimPromises = [];
        for (let i = 2; i <= 5; i++) {
            claimPromises.push(
                treasureHuntClient.claimTreasure(
                    player,
                    i,
                    `location_hash_${i}`,
                    85
                )
            );
        }

        const results = await Promise.allSettled(claimPromises);
        const successfulClaims = results.filter(r => r.status === 'fulfilled').length;
        
        expect(successfulClaims).toBeGreaterThan(0);
    });
});