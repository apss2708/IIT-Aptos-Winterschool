const { AptosAccount } = require("aptos");
const TreasureHuntClient = require("../../scripts/interactions/create_hunt");

describe("Treasure Hunt Integration Tests", () => {
    let client;
    let admin;
    let player;

    beforeAll(() => {
        client = new TreasureHuntClient("testnet");
        admin = new AptosAccount();
        player = new AptosAccount();
    });

    it("should create a treasure hunt", async () => {
        const tx = await client.createTreasureHunt(
            admin,
            "Test Hunt",
            "Test Description",
            "1000000",
            true
        );

        expect(tx).toBeDefined();
    });

    it("should register a player", async () => {
        const tx = await client.initializePlayer(player);
        expect(tx).toBeDefined();
    });
});