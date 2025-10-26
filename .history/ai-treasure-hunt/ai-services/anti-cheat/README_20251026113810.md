# AI Anti-Cheat Service

Advanced anti-cheat system for the Treasure Hunt platform using AI and machine learning to detect cheating patterns and ensure fair play.

## Features

- **Behavioral Analysis**: Detect anomalies in player behavior patterns
- **Location Verification**: Multi-source location verification and spoofing detection
- **Trust Scoring**: Comprehensive trust scoring system for players
- **Fraud Detection**: Pattern-based fraud and cheating detection
- **Movement Analysis**: Natural movement pattern verification

## API Endpoints

### POST `/comprehensive-verification`
Comprehensive player verification using all AI systems.

### POST `/verify-location`
Verify location authenticity using multiple data sources.

### POST `/analyze-behavior`
Analyze player behavior for anomalies and suspicious patterns.

### POST `/calculate-trust-score`
Calculate comprehensive trust score for player.

### POST `/detect-fraud-patterns`
Detect fraud patterns in player behavior.

### GET `/trust-history/{player_id}`
Get trust score history for a player.

### GET `/system-stats`
Get anti-cheat system statistics.

## Configuration

Environment variables:

- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `LOG_LEVEL`: Logging level (default: INFO)
- `HOST`: Service host (default: 0.0.0.0)
- `PORT`: Service port (default: 8000)

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn main:app --reload --host 0.0.0.0 --port 8000
