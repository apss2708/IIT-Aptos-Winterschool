// Response type definitions for API responses

// Base response format
class BaseResponse {
    constructor(success, data = null, error = null, metadata = {}) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.metadata = {
            timestamp: new Date().toISOString(),
            ...metadata
        };
    }

    static success(data, metadata = {}) {
        return new BaseResponse(true, data, null, metadata);
    }

    static error(error, metadata = {}) {
        return new BaseResponse(false, null, error, metadata);
    }
}

// Specific response types
class TransactionResponse extends BaseResponse {
    constructor(success, data, error, metadata = {}) {
        super(success, data, error, metadata);
    }

    static fromTransactionResult(txnResult, metadata = {}) {
        return new TransactionResponse(
            txnResult.success,
            {
                hash: txnResult.hash,
                version: txnResult.version,
                timestamp: txnResult.timestamp,
                changes: txnResult.changes
            },
            null,
            metadata
        );
    }
}

class PlayerResponse extends BaseResponse {
    constructor(success, data, error, metadata = {}) {
        super(success, data, error, metadata);
    }

    static fromPlayerStats(stats, metadata = {}) {
        return new PlayerResponse(true, {
            address: stats.player,
            treasures_found: stats.total_treasures_found,
            rewards_earned: stats.total_rewards_earned,
            trust_score: stats.trust_score,
            joined_at: stats.joined_at,
            last_activity: stats.last_activity
        }, null, metadata);
    }
}

class TreasureHuntResponse extends BaseResponse {
    constructor(success, data, error, metadata = {}) {
        super(success, data, error, metadata);
    }

    static fromHuntData(hunt, metadata = {}) {
        return new TreasureHuntResponse(true, {
            id: hunt.id,
            creator: hunt.creator,
            title: hunt.title,
            description: hunt.description,
            total_treasures: hunt.total_treasures,
            claimed_treasures: hunt.claimed_treasures,
            total_reward_pool: hunt.total_reward_pool,
            remaining_rewards: hunt.remaining_rewards,
            is_active: hunt.is_active,
            created_at: hunt.created_at,
            participant_count: hunt.participant_count,
            ai_integration: hunt.ai_integration
        }, null, metadata);
    }
}

class AIAnalysisResponse extends BaseResponse {
    constructor(success, data, error, metadata = {}) {
        super(success, data, error, metadata);
    }

    static fromAIAnalysis(analysis, metadata = {}) {
        return new AIAnalysisResponse(true, {
            trust_score: analysis.trust_score,
            risk_factors: analysis.risk_factors,
            recommendations: analysis.recommendations,
            verification_level: analysis.verification_level,
            detailed_analysis: analysis.detailed_analysis
        }, null, metadata);
    }
}

class ErrorResponse extends BaseResponse {
    constructor(error, metadata = {}) {
        super(false, null, error, metadata);
    }

    static validationError(message, details = {}) {
        return new ErrorResponse({
            code: 'VALIDATION_ERROR',
            message,
            details
        });
    }

    static transactionError(message, txnHash = null) {
        return new ErrorResponse({
            code: 'TRANSACTION_ERROR',
            message,
            txn_hash: txnHash
        });
    }

    static networkError(message) {
        return new ErrorResponse({
            code: 'NETWORK_ERROR',
            message
        });
    }

    static aiServiceError(message, service = 'unknown') {
        return new ErrorResponse({
            code: 'AI_SERVICE_ERROR',
            message,
            service
        });
    }
}

// Pagination response
class PaginatedResponse extends BaseResponse {
    constructor(success, data, error, metadata = {}) {
        super(success, data, error, metadata);
    }

    static fromPaginatedData(data, page, pageSize, totalCount, metadata = {}) {
        return new PaginatedResponse(true, data, null, {
            ...metadata,
            pagination: {
                page,
                page_size: pageSize,
                total_count: totalCount,
                total_pages: Math.ceil(totalCount / pageSize),
                has_next: page * pageSize < totalCount,
                has_prev: page > 1
            }
        });
    }
}

// Batch operation response
class BatchResponse extends BaseResponse {
    constructor(success, data, error, metadata = {}) {
        super(success, data, error, metadata);
    }

    static fromBatchResults(results, metadata = {}) {
        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
        
        return new BatchResponse(
            failed.length === 0,
            {
                successful,
                failed,
                total: results.length,
                success_count: successful.length,
                failure_count: failed.length
            },
            failed.length > 0 ? 'Some operations failed' : null,
            metadata
        );
    }
}

module.exports = {
    BaseResponse,
    TransactionResponse,
    PlayerResponse,
    TreasureHuntResponse,
    AIAnalysisResponse,
    ErrorResponse,
    PaginatedResponse,
    BatchResponse
};
