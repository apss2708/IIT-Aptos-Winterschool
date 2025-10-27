// Move type definitions and utilities

const MOVEMENT_TYPES = {
    // Basic types
    ADDRESS: "address",
    BOOL: "bool",
    U8: "u8",
    U64: "u64",
    U128: "u128",
    VECTOR: "vector",
    STRING: "string",

    // Custom types
    TREASURE_HUNT: "0x1::treasure_hunt::TreasureHunt",
    TREASURE: "0x1::treasure_hunt::Treasure",
    PLAYER_STATS: "0x1::treasure_hunt::PlayerStats",
    GLOBAL_CONFIG: "0x1::treasure_hunt::GlobalConfig"
};

// Type conversion utilities
class TypeConverter {
    // Convert JavaScript value to Move-compatible value
    static toMoveValue(value, type) {
        switch (type) {
            case MOVEMENT_TYPES.ADDRESS:
                return this.normalizeAddress(value);
            case MOVEMENT_TYPES.U64:
            case MOVEMENT_TYPES.U128:
                return value.toString();
            case MOVEMENT_TYPES.VECTOR:
                if (typeof value === 'string') {
                    return Array.from(Buffer.from(value, 'hex'));
                }
                return value;
            case MOVEMENT_TYPES.BOOL:
                return Boolean(value);
            default:
                return value;
        }
    }

    // Convert Move value to JavaScript value
    static fromMoveValue(value, type) {
        switch (type) {
            case MOVEMENT_TYPES.ADDRESS:
                return value.toString();
            case MOVEMENT_TYPES.U64:
            case MOVEMENT_TYPES.U128:
                return BigInt(value);
            case MOVEMENT_TYPES.VECTOR:
                if (Array.isArray(value)) {
                    return Buffer.from(value).toString('hex');
                }
                return value;
            case MOVEMENT_TYPES.BOOL:
                return Boolean(value);
            default:
                return value;
        }
    }

    // Normalize address format
    static normalizeAddress(address) {
        if (address.startsWith('0x')) {
            return address;
        }
        return `0x${address}`;
    }

    // Validate type compatibility
    static validateType(value, expectedType) {
        try {
            this.toMoveValue(value, expectedType);
            return true;
        } catch {
            return false;
        }
    }
}

// BCS (Binary Canonical Serialization) utilities
class BCSUtils {
    static serializeAddress(address) {
        const normalized = TypeConverter.normalizeAddress(address);
        // Remove 0x prefix and convert to bytes
        const hex = normalized.startsWith('0x') ? normalized.slice(2) : normalized;
        return Array.from(Buffer.from(hex, 'hex'));
    }

    static serializeU64(value) {
        // Simple serialization for u64
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value));
        return Array.from(buffer);
    }

    static serializeString(str) {
        return Array.from(Buffer.from(str, 'utf8'));
    }

    static serializeVector(data, elementSerializer) {
        const length = this.serializeU64(data.length);
        const elements = data.map(elementSerializer);
        return [...length, ...elements.flat()];
    }

    static deserializeAddress(bytes) {
        return `0x${Buffer.from(bytes).toString('hex')}`;
    }

    static deserializeU64(bytes) {
        return Buffer.from(bytes).readBigUInt64LE();
    }

    static deserializeString(bytes) {
        return Buffer.from(bytes).toString('utf8');
    }
}

// Resource type helpers
class ResourceHelpers {
    static getResourceType(moduleAddress, moduleName, structName) {
        return `${moduleAddress}::${moduleName}::${structName}`;
    }

    static parseResourceType(resourceType) {
        const parts = resourceType.split('::');
        if (parts.length !== 3) {
            throw new Error(`Invalid resource type: ${resourceType}`);
        }
        return {
            address: parts[0],
            module: parts[1],
            struct: parts[2]
        };
    }

    static isTreasureHuntResource(resourceType) {
        return resourceType.includes('::treasure_hunt::');
    }
}

module.exports = {
    MOVEMENT_TYPES,
    TypeConverter,
    BCSUtils,
    ResourceHelpers
};
