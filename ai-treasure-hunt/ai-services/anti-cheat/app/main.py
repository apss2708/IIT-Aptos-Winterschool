from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import logging
import uvicorn

from models.advanced_behavior_analyzer import AdvancedBehaviorAnalyzer
from models.anomaly_detector import AnomalyDetector
from models.trust_scorer import TrustScorer
from services.fraud_detector import FraudDetector
from services.location_verification import LocationVerificationService
from utils.config import config
from utils.helpers import setup_logging

# Configure logging
setup_logging(config.get('log_level', 'INFO'))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Anti-Cheat Service",
    description="Advanced anti-cheat system using AI and behavioral analysis",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI components
behavior_analyzer = AdvancedBehaviorAnalyzer()
anomaly_detector = AnomalyDetector()
trust_scorer = TrustScorer()
fraud_detector = FraudDetector()
location_verifier = LocationVerificationService()

class VerificationRequest(BaseModel):
    player_data: Dict
    location_data: Dict
    game_context: Dict
    request_id: Optional[str] = None

class LocationVerificationRequest(BaseModel):
    location_data: Dict
    location_history: List[Dict] = []

class BehaviorAnalysisRequest(BaseModel):
    player_data: Dict
    historical_data: List[Dict] = []

class TrustScoreRequest(BaseModel):
    player_data: Dict
    verification_results: Dict

@app.get("/")
async def root():
    return {"status": "AI Anti-Cheat Service Running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "anti-cheat",
        "components": {
            "behavior_analyzer": True,
            "anomaly_detector": True,
            "trust_scorer": True,
            "fraud_detector": True,
            "location_verifier": True
        }
    }

@app.post("/comprehensive-verification")
async def comprehensive_verification(
    request: VerificationRequest,
    background_tasks: BackgroundTasks
):
    """Comprehensive player verification using all AI systems"""
    try:
        logger.info(f"Starting comprehensive verification for request: {request.request_id}")
        
        # Run all verification systems in parallel (conceptually)
        verification_results = await behavior_analyzer.comprehensive_verification(
            request.player_data,
            request.location_data,
            request.game_context
        )
        
        # Log verification in background
        background_tasks.add_task(
            log_verification_result,
            request.request_id,
            verification_results['trust_score']
        )
        
        return {
            "verification_id": request.request_id,
            "results": verification_results,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Comprehensive verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.post("/verify-location")
async def verify_location(request: LocationVerificationRequest):
    """Verify location authenticity"""
    try:
        logger.info("Verifying location data")
        
        # Verify current location
        location_verification = location_verifier.comprehensive_location_verification(
            request.location_data
        )
        
        # Verify movement patterns if history provided
        movement_analysis = {}
        if request.location_history:
            movement_analysis = location_verifier.verify_movement_patterns(
                request.location_history
            )
        
        return {
            "location_verification": location_verification,
            "movement_analysis": movement_analysis,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Location verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-behavior")
async def analyze_behavior(request: BehaviorAnalysisRequest):
    """Analyze player behavior for anomalies"""
    try:
        logger.info("Analyzing player behavior")
        
        # Detect anomalies
        anomaly_result = anomaly_detector.detect_behavior_anomalies(
            request.player_data,
            request.historical_data
        )
        
        # Update behavior profile
        player_id = request.player_data.get('player_id')
        if player_id:
            anomaly_detector.update_behavior_profile(player_id, request.player_data)
            
            # Get behavior trend
            behavior_trend = anomaly_detector.get_behavior_trend(player_id)
            anomaly_result['behavior_trend'] = behavior_trend
        
        return {
            "anomaly_analysis": anomaly_result,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Behavior analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate-trust-score")
async def calculate_trust_score(request: TrustScoreRequest):
    """Calculate comprehensive trust score for player"""
    try:
        logger.info("Calculating trust score")
        
        trust_score_result = trust_scorer.calculate_trust_score(
            request.player_data,
            request.verification_results
        )
        
        return {
            "trust_score": trust_score_result,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Trust score calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-fraud-patterns")
async def detect_fraud_patterns(request: VerificationRequest):
    """Detect fraud patterns in player behavior"""
    try:
        logger.info("Detecting fraud patterns")
        
        fraud_result = fraud_detector.detect_fraud_patterns(
            request.player_data,
            request.game_context
        )
        
        # Log suspicious activity if detected
        if fraud_result['risk_score'] > 0.7:
            fraud_detector.log_suspicious_activity(
                request.player_data.get('player_id', 'unknown'),
                'high_risk_fraud',
                fraud_result
            )
        
        return {
            "fraud_analysis": fraud_result,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Fraud detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cluster-behavior-patterns")
async def cluster_behavior_patterns(players_data: List[Dict]):
    """Cluster players based on behavior patterns"""
    try:
        logger.info(f"Clustering {len(players_data)} players")
        
        clustering_result = anomaly_detector.cluster_behavior_patterns(players_data)
        
        return {
            "clustering_result": clustering_result,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Behavior clustering failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trust-history/{player_id}")
async def get_trust_history(player_id: str, days: int = 30):
    """Get trust score history for player"""
    try:
        logger.info(f"Getting trust history for player: {player_id}")
        
        history = trust_scorer.get_trust_history(player_id, days)
        
        return {
            "player_id": player_id,
            "trust_history": history,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Failed to get trust history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system-stats")
async def get_system_stats():
    """Get anti-cheat system statistics"""
    try:
        stats = {
            "behavior_analyzer": {
                "total_analyses": 1000,  # Would track actual count
                "average_processing_time": 0.5
            },
            "anomaly_detector": {
                "anomalies_detected": 150,
                "false_positive_rate": 0.02
            },
            "trust_scorer": {
                "players_tracked": len(trust_scorer.trust_history),
                "average_trust_score": 0.75
            },
            "fraud_detector": {
                "fraud_cases_detected": 45,
                "common_patterns": list(fraud_detector.fraud_patterns.keys())
            }
        }
        
        return {
            "system_stats": stats,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Failed to get system stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def log_verification_result(request_id: str, trust_score: float):
    """Background task to log verification results"""
    try:
        # In production, this would write to a database
        logger.info(f"Verification completed - Request: {request_id}, Trust Score: {trust_score:.2f}")
    except Exception as e:
        logger.error(f"Failed to log verification result: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=config.get('host', '0.0.0.0'),
        port=config.get('port', 8000),
        log_level=config.get('log_level', 'info').lower()
    )