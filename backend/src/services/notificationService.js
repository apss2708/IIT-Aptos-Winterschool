const axios = require('axios');
const logger = require('../config/logger');

class NotificationService {
  constructor() {
    this.webhookUrls = new Map();
  }

  // Register webhook for real-time updates
  registerWebhook(sessionId, webhookUrl) {
    this.webhookUrls.set(sessionId, webhookUrl);
    logger.info(`Webhook registered for session ${sessionId}: ${webhookUrl}`);
  }

  // Unregister webhook
  unregisterWebhook(sessionId) {
    this.webhookUrls.delete(sessionId);
    logger.info(`Webhook unregistered for session ${sessionId}`);
  }

  // Send notification via webhook
  async sendWebhookNotification(sessionId, payload) {
    try {
      const webhookUrl = this.webhookUrls.get(sessionId);
      if (!webhookUrl) {
        logger.warn(`No webhook registered for session ${sessionId}`);
        return false;
      }

      const response = await axios.post(webhookUrl, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      logger.info(`Webhook notification sent to ${webhookUrl}`);
      return response.status === 200;
    } catch (error) {
      logger.error('Webhook notification error:', error.message);
      return false;
    }
  }

  // Send Socket.io notification
  sendSocketNotification(io, room, event, data) {
    try {
      io.to(room).emit(event, data);
      logger.info(`Socket notification sent to room ${room}: ${event}`);
    } catch (error) {
      logger.error('Socket notification error:', error);
    }
  }

  // Treasure found notification
  async notifyTreasureFound(sessionId, io, treasureData, userData) {
    const payload = {
      type: 'TREASURE_FOUND',
      sessionId,
      treasure: {
        id: treasureData._id,
        name: treasureData.name,
        points: treasureData.points,
        order: treasureData.order,
      },
      user: {
        walletAddress: userData.walletAddress,
        totalPoints: userData.totalPoints,
      },
      timestamp: new Date().toISOString(),
    };

    // Send via webhook
    await this.sendWebhookNotification(sessionId, payload);

    // Send via socket
    this.sendSocketNotification(io, `quest_${treasureData.questId}`, 'treasure_found', payload);

    return payload;
  }

  // Quest completed notification
  async notifyQuestCompleted(sessionId, io, questData, userData, finalScore) {
    const payload = {
      type: 'QUEST_COMPLETED',
      sessionId,
      quest: {
        id: questData._id,
        title: questData.title,
        difficulty: questData.difficulty,
      },
      user: {
        walletAddress: userData.walletAddress,
        username: userData.username,
      },
      score: finalScore,
      rewards: questData.rewards,
      timestamp: new Date().toISOString(),
    };

    // Send via webhook
    await this.sendWebhookNotification(sessionId, payload);

    // Send via socket
    this.sendSocketNotification(io, `quest_${questData._id}`, 'quest_completed', payload);

    return payload;
  }

  // New quest available notification
  async notifyNewQuestAvailable(io, questData, nearbyUsers = []) {
    const payload = {
      type: 'NEW_QUEST_AVAILABLE',
      quest: {
        id: questData._id,
        title: questData.title,
        description: questData.description,
        difficulty: questData.difficulty,
        estimatedTime: questData.estimatedTime,
        startLocation: questData.startLocation,
      },
      timestamp: new Date().toISOString(),
    };

    // Notify all users in the area
    nearbyUsers.forEach(userWallet => {
      this.sendSocketNotification(io, `user_${userWallet}`, 'new_quest', payload);
    });

    // Broadcast to general channel
    this.sendSocketNotification(io, 'quests_updates', 'new_quest', payload);

    return payload;
  }

  // Reward claimed notification
  async notifyRewardClaimed(sessionId, io, rewardData, userData) {
    const payload = {
      type: 'REWARD_CLAIMED',
      sessionId,
      reward: {
        type: rewardData.type,
        amount: rewardData.amount,
        nftMetadata: rewardData.nftMetadata,
      },
      user: {
        walletAddress: userData.walletAddress,
        username: userData.username,
      },
      transactionHash: rewardData.transactionHash,
      timestamp: new Date().toISOString(),
    };

    // Send via webhook
    await this.sendWebhookNotification(sessionId, payload);

    // Send via socket
    this.sendSocketNotification(io, `user_${userData.walletAddress}`, 'reward_claimed', payload);

    return payload;
  }

  // Leaderboard update notification
  async notifyLeaderboardUpdate(io, leaderboardData) {
    const payload = {
      type: 'LEADERBOARD_UPDATED',
      leaderboard: leaderboardData.slice(0, 10), // Top 10
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all connected clients
    this.sendSocketNotification(io, 'leaderboard', 'update', payload);

    return payload;
  }

  // Error notification
  async notifyError(sessionId, io, errorData, userData = null) {
    const payload = {
      type: 'ERROR',
      sessionId,
      error: {
        code: errorData.code,
        message: errorData.message,
        details: errorData.details,
      },
      user: userData ? {
        walletAddress: userData.walletAddress,
        username: userData.username,
      } : null,
      timestamp: new Date().toISOString(),
    };

    // Send via webhook
    await this.sendWebhookNotification(sessionId, payload);

    // Send via socket to specific user if available
    if (userData) {
      this.sendSocketNotification(io, `user_${userData.walletAddress}`, 'error', payload);
    }

    return payload;
  }

  // Proximity alert notification
  async notifyProximityAlert(sessionId, io, treasureData, distance, userData) {
    const payload = {
      type: 'PROXIMITY_ALERT',
      sessionId,
      treasure: {
        id: treasureData._id,
        name: treasureData.name,
        distance: Math.round(distance),
      },
      user: {
        walletAddress: userData.walletAddress,
      },
      timestamp: new Date().toISOString(),
    };

    // Send via webhook
    await this.sendWebhookNotification(sessionId, payload);

    // Send via socket
    this.sendSocketNotification(io, `user_${userData.walletAddress}`, 'proximity_alert', payload);

    return payload;
  }
}

module.exports = new NotificationService();