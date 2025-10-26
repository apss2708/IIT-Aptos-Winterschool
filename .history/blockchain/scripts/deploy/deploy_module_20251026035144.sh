#!/bin/bash

# Deploy Treasure Hunt Move module
echo "🚀 Deploying AI-Enhanced Treasure Hunt module..."

# Set environment
NETWORK=${1:-testnet}
MODULE_ADDRESS=${2:-"0x123"}

if [ "$NETWORK" = "testnet" ]; then
    NODE_URL="https://fullnode.testnet.aptoslabs.com"
    FAUCET_URL="https://faucet.testnet.aptoslabs.com"
elif [ "$NETWORK" = "local" ]; then
    NODE_URL="http://localhost:8080"
    FAUCET_URL="http://localhost:8081"
elif [ "$NETWORK" = "mainnet" ]; then
    NODE_URL="https://fullnode.mainnet.aptoslabs.com"
    FAUCET_URL=""
else
    echo "❌ Invalid network: $NETWORK"
    echo "Usage: $0 [testnet|local|mainnet] [module_address]"
    exit 1
fi

echo "📡 Network: $NETWORK"
echo "🔗 Node URL: $NODE_URL"
echo "🏠 Module Address: $MODULE_ADDRESS"

# Check if Aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Please install it first."
    echo "Visit: https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli"
    exit 1
fi

# Compile Move module
echo "🔨 Compiling Move modules..."
cd ../move
aptos move compile --package-dir . --named-addresses treasure_hunt=$MODULE_ADDRESS

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

# Publish module
echo "📦 Publishing module to $NETWORK..."
aptos move publish \
    --package-dir . \
    --named-addresses treasure_hunt=$MODULE_ADDRESS \
    --url $NODE_URL \
    --assume-yes

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo "📝 Module published at address: $MODULE_ADDRESS"
    
    # Initialize module
    echo "🔧 Initializing module..."
    aptos move run \
        --function-id ${MODULE_ADDRESS}::treasure_hunt::initialize \
        --url $NODE_URL \
        --assume-yes
        
    echo "🎉 AI-Enhanced Treasure Hunt is ready!"
else
    echo "❌ Deployment failed"
    exit 1
fi