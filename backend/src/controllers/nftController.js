const User = require('../models/User');
const Quest = require('../models/Quest');
const blockchainService = require('../services/blockchainService');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');

// @desc    Get user's NFT collection
// @route   GET /api/nft/collection
// @access  Private
const getNFTCollection = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('nftCollection.questId', 'title description difficulty')
      .select('nftCollection walletAddress');

    // Get on-chain NFTs (simulated for now)
    const onChainNFTs = await blockchainService.getNFTCollection(req.user.walletAddress, 'treasure-hunt');

    // Combine on-chain and off-chain NFTs
    const combinedCollection = [
      ...user.nftCollection.map(nft => ({
        ...nft.toObject(),
        source: 'off-chain',
        verified: true,
      })),
      ...onChainNFTs.map(nft => ({
        ...nft,
        source: 'on-chain',
        verified: true,
      })),
    ];

    res.status(200).json({
      success: true,
      data: {
        walletAddress: req.user.walletAddress,
        collection: combinedCollection,
        stats: {
          total: combinedCollection.length,
          offChain: user.nftCollection.length,
          onChain: onChainNFTs.length,
        },
      },
    });
  } catch (error) {
    logger.error('Get NFT collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching NFT collection',
    });
  }
};

// @desc    Mint NFT reward
// @route   POST /api/nft/mint
// @access  Private
const mintNFT = async (req, res) => {
  try {
    const { questId, metadata } = req.body;

    // Verify quest completion
    const user = await User.findById(req.user._id);
    const completedQuest = user.completedQuests.find(
      quest => quest.questId.toString() === questId
    );

    if (!completedQuest) {
      return res.status(400).json({
        success: false,
        message: 'Quest not completed or not found',
      });
    }

    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: 'Quest not found',
      });
    }

    // Use provided metadata or quest reward metadata
    const nftMetadata = metadata || quest.rewards.nftMetadata;
    
    if (!nftMetadata) {
      return res.status(400).json({
        success: false,
        message: 'No NFT metadata available for this quest',
      });
    }

    // Add quest-specific attributes
    const enhancedMetadata = {
      ...nftMetadata,
      attributes: [
        ...(nftMetadata.attributes || []),
        {
          trait_type: 'Quest',
          value: quest.title,
        },
        {
          trait_type: 'Difficulty',
          value: quest.difficulty,
        },
        {
          trait_type: 'Completion Date',
          value: new Date().toISOString().split('T')[0],
        },
        {
          trait_type: 'Treasure Hunter',
          value: req.user.username,
        },
      ],
    };

    // Mint NFT on blockchain (simulated)
    const mintResult = await blockchainService.mintNFTReward(
      quest.creator, // Contract deployer
      req.user.walletAddress,
      enhancedMetadata
    );

    // Store NFT in user's collection
    const nftRecord = {
      tokenId: mintResult.transactionHash,
      metadata: enhancedMetadata,
      acquiredAt: new Date(),
      questId: quest._id,
      transactionHash: mintResult.transactionHash,
    };

    user.nftCollection.push(nftRecord);
    await user.save();

    // Send notification
    await notificationService.notifyRewardClaimed(
      `mint_${Date.now()}`,
      req.io,
      {
        type: 'nft',
        nftMetadata: enhancedMetadata,
        transactionHash: mintResult.transactionHash,
      },
      user
    );

    logger.info(`NFT minted for user ${req.user.walletAddress}: ${mintResult.transactionHash}`);

    res.status(200).json({
      success: true,
      message: 'NFT minted successfully',
      data: {
        nft: nftRecord,
        transaction: mintResult,
      },
    });
  } catch (error) {
    logger.error('Mint NFT error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while minting NFT',
    });
  }
};

// @desc    Transfer NFT
// @route   POST /api/nft/transfer
// @access  Private
const transferNFT = async (req, res) => {
  try {
    const { tokenId, recipientAddress } = req.body;

    if (!tokenId || !recipientAddress) {
      return res.status(400).json({
        success: false,
        message: 'Token ID and recipient address are required',
      });
    }

    // Check if user owns the NFT
    const user = await User.findById(req.user._id);
    const nftIndex = user.nftCollection.findIndex(
      nft => nft.tokenId === tokenId
    );

    if (nftIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'NFT not found in your collection',
      });
    }

    const nft = user.nftCollection[nftIndex];

    // Simulate blockchain transfer
    const transferResult = await blockchainService.transferTokenReward(
      req.user.walletAddress,
      recipientAddress,
      1 // Assuming 1 NFT token
    );

    // Remove NFT from sender's collection
    user.nftCollection.splice(nftIndex, 1);
    await user.save();

    // Add NFT to recipient's collection (in a real app, this would be handled by blockchain events)
    const recipient = await User.findOne({ walletAddress: recipientAddress.toLowerCase() });
    if (recipient) {
      recipient.nftCollection.push({
        ...nft.toObject(),
        acquiredAt: new Date(),
        previousOwner: req.user.walletAddress,
      });
      await recipient.save();
    }

    logger.info(`NFT transferred from ${req.user.walletAddress} to ${recipientAddress}`);

    res.status(200).json({
      success: true,
      message: 'NFT transferred successfully',
      data: {
        transaction: transferResult,
        nft: {
          tokenId,
          recipient: recipientAddress,
        },
      },
    });
  } catch (error) {
    logger.error('Transfer NFT error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while transferring NFT',
    });
  }
};

// @desc    Get NFT metadata
// @route   GET /api/nft/metadata/:tokenId
// @access  Public
const getNFTMetadata = async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Try to find NFT in database first
    const userWithNFT = await User.findOne({
      'nftCollection.tokenId': tokenId,
    }).select('nftCollection walletAddress');

    if (userWithNFT) {
      const nft = userWithNFT.nftCollection.find(n => n.tokenId === tokenId);
      
      return res.status(200).json({
        success: true,
        data: {
          tokenId,
          metadata: nft.metadata,
          owner: userWithNFT.walletAddress,
          source: 'off-chain',
        },
      });
    }

    // If not found in database, try blockchain (simulated)
    // In a real implementation, you'd query the blockchain
    const simulatedMetadata = {
      name: `Treasure Hunt NFT #${tokenId.substr(-6)}`,
      description: 'A commemorative NFT earned through treasure hunting adventures',
      image: 'https://example.com/placeholder-nft.jpg',
      attributes: [
        {
          trait_type: 'Status',
          value: 'On-chain',
        },
      ],
    };

    res.status(200).json({
      success: true,
      data: {
        tokenId,
        metadata: simulatedMetadata,
        owner: 'Unknown (on-chain)',
        source: 'on-chain',
      },
    });
  } catch (error) {
    logger.error('Get NFT metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching NFT metadata',
    });
  }
};

// @desc    Verify NFT ownership
// @route   GET /api/nft/verify-ownership/:tokenId
// @access  Private
const verifyOwnership = async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Check off-chain ownership
    const user = await User.findOne({
      _id: req.user._id,
      'nftCollection.tokenId': tokenId,
    });

    if (user) {
      return res.status(200).json({
        success: true,
        data: {
          tokenId,
          owned: true,
          source: 'off-chain',
          verified: true,
        },
      });
    }

    // Check on-chain ownership (simulated)
    const onChainNFTs = await blockchainService.getNFTCollection(req.user.walletAddress, 'treasure-hunt');
    const onChainOwnership = onChainNFTs.some(nft => nft.tokenId === tokenId);

    res.status(200).json({
      success: true,
      data: {
        tokenId,
        owned: onChainOwnership,
        source: onChainOwnership ? 'on-chain' : 'none',
        verified: onChainOwnership,
      },
    });
  } catch (error) {
    logger.error('Verify NFT ownership error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying NFT ownership',
    });
  }
};

// @desc    Get NFT leaderboard
// @route   GET /api/nft/leaderboard
// @access  Public
const getNFTLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get users with most NFTs
    const users = await User.aggregate([
      {
        $project: {
          walletAddress: 1,
          username: 1,
          nftCount: { $size: '$nftCollection' },
          totalPoints: 1,
          level: 1,
        },
      },
      {
        $sort: { nftCount: -1, totalPoints: -1 },
      },
      {
        $limit: parseInt(limit),
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        leaderboard: users.map((user, index) => ({
          rank: index + 1,
          walletAddress: user.walletAddress,
          username: user.username,
          nftCount: user.nftCount,
          totalPoints: user.totalPoints,
          level: user.level,
        })),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get NFT leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching NFT leaderboard',
    });
  }
};

module.exports = {
  getNFTCollection,
  mintNFT,
  transferNFT,
  getNFTMetadata,
  verifyOwnership,
  getNFTLeaderboard,
};