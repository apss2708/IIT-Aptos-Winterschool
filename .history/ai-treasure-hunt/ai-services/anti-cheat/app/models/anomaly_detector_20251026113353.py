import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from typing import Dict, List, Tuple
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AnomalyDetector:
    def __init__(self):
        self.anomaly_model = IsolationForest(contamination=0.1, random_state=42)
        self.clustering_model = DBSCAN(eps=0.5, min_samples=5)
        self.behavior_profiles = {}
        
    def detect_behavior_anomalies(self, player_data: Dict, historical_data: List[Dict]) -> Dict:
        """Detect anomalies in player behavior"""
        
        # Extract features for anomaly detection
        features = self._extract_anomaly_features(player_data, historical_data)
        
        if len(features) == 0:
            return {
                'anomaly_score': 0.0,
                'is_anomaly': False,
                'confidence': 0.0,
                'anomaly_type': 'insufficient_data'
            }
        
        # Calculate anomaly score
        try:
            anomaly_score = self.anomaly_model.decision_function([features])[0]
            is_anomaly = self.anomaly_model.predict([features])[0] == -1
            
            # Normalize score to 0-1 range
            normalized_score = (anomaly_score + 0.5) / 1.0
            
            # Determine anomaly type
            anomaly_type = self._classify_anomaly_type(features, player_data)
            
            return {
                'anomaly_score': float(normalized_score),
                'is_anomaly': bool(is_anomaly),
                'confidence': float(abs(anomaly_score)),
                'anomaly_type': anomaly_type,
                'risk_level': self._assess_risk_level(normalized_score, anomaly_type)
            }
            
        except Exception as e:
            logger.error(f"Anomaly detection failed: {str(e)}")
            return {
                'anomaly_score': 0.5,
                'is_anomaly': False,
                'confidence': 0.0,
                'anomaly_type': 'detection_failed'
            }
    
    def _extract_anomaly_features(self, player_data: Dict, historical_data: List[Dict]) -> List[float]:
        """Extract features for anomaly detection"""
        
        features = []
        
        # Time-based features
        features.append(player_data.get('avg_solving_time', 180))
        features.append(player_data.get('time_variance', 60))
        features.append(player_data.get('session_duration_avg', 1200))
        
        # Success pattern features
        features.append(player_data.get('success_rate', 0.5))
        features.append(player_data.get('streak_consistency', 0.5))
        features.append(player_data.get('failure_recovery_time', 300))
        
        # Movement features
        features.append(player_data.get('movement_efficiency', 0.5))
        features.append(player_data.get('location_accuracy_avg', 0.8))
        features.append(player_data.get('unusual_movements', 0))
        
        # Interaction features
        features.append(player_data.get('hint_usage_rate', 0.3))
        features.append(player_data.get('retry_frequency', 0.2))
        features.append(player_data.get('exploration_thoroughness', 0.6))
        
        # Device and technical features
        features.append(player_data.get('device_consistency', 1.0))
        features.append(player_data.get('connection_stability', 0.9))
        
        return features
    
    def _classify_anomaly_type(self, features: List[float], player_data: Dict) -> str:
        """Classify the type of anomaly detected"""
        
        # Analyze feature patterns to determine anomaly type
        solving_time = features[0]
        success_rate = features[3]
        movement_efficiency = features[6]
        hint_usage = features[9]
        
        if solving_time < 30 and success_rate > 0.9:
            return 'unnatural_speed'
        elif movement_efficiency > 0.95 and success_rate > 0.95:
            return 'perfect_movement'
        elif hint_usage < 0.1 and success_rate > 0.9:
            return 'low_hint_high_success'
        elif solving_time < 20:
            return 'extremely_fast_solving'
        else:
            return 'behavioral_shift'
    
    def _assess_risk_level(self, anomaly_score: float, anomaly_type: str) -> str:
        """Assess the risk level of the anomaly"""
        
        risk_factors = {
            'unnatural_speed': 0.8,
            'perfect_movement': 0.9,
            'low_hint_high_success': 0.7,
            'extremely_fast_solving': 0.85,
            'behavioral_shift': 0.5
        }
        
        base_risk = anomaly_score
        type_multiplier = risk_factors.get(anomaly_type, 0.5)
        
        weighted_risk = base_risk * type_multiplier
        
        if weighted_risk > 0.8:
            return 'high'
        elif weighted_risk > 0.6:
            return 'medium'
        elif weighted_risk > 0.4:
            return 'low'
        else:
            return 'minimal'
    
    def cluster_behavior_patterns(self, players_data: List[Dict]) -> Dict:
        """Cluster players based on behavior patterns"""
        
        if len(players_data) < 10:
            return {'clusters': [], 'outliers': []}
        
        # Extract behavior vectors for all players
        behavior_vectors = []
        valid_players = []
        
        for player_data in players_data:
            features = self._extract_anomaly_features(player_data, [])
            if len(features) > 0:
                behavior_vectors.append(features)
                valid_players.append(player_data.get('player_id', 'unknown'))
        
        if len(behavior_vectors) < 5:
            return {'clusters': [], 'outliers': []}
        
        try:
            # Perform clustering
            clusters = self.clustering_model.fit_predict(behavior_vectors)
            
            # Analyze clusters
            cluster_analysis = {}
            outliers = []
            
            for i, cluster_id in enumerate(clusters):
                player_id = valid_players[i]
                if cluster_id == -1:
                    outliers.append(player_id)
                else:
                    if cluster_id not in cluster_analysis:
                        cluster_analysis[cluster_id] = {
                            'player_count': 0,
                            'players': [],
                            'centroid': behavior_vectors[i]
                        }
                    cluster_analysis[cluster_id]['player_count'] += 1
                    cluster_analysis[cluster_id]['players'].append(player_id)
            
            return {
                'clusters': cluster_analysis,
                'outliers': outliers,
                'total_clusters': len(set(clusters)) - (1 if -1 in clusters else 0),
                'outlier_count': len(outliers)
            }
            
        except Exception as e:
            logger.error(f"Clustering failed: {str(e)}")
            return {'clusters': [], 'outliers': []}
    
    def update_behavior_profile(self, player_id: str, player_data: Dict):
        """Update player's behavior profile"""
        
        if player_id not in self.behavior_profiles:
            self.behavior_profiles[player_id] = {
                'created_at': datetime.utcnow(),
                'update_count': 0,
                'behavior_history': []
            }
        
        profile = self.behavior_profiles[player_id]
        profile['update_count'] += 1
        
        # Store current behavior snapshot
        behavior_snapshot = {
            'timestamp': datetime.utcnow(),
            'features': self._extract_anomaly_features(player_data, []),
            'anomaly_score': self.detect_behavior_anomalies(player_data, [])['anomaly_score']
        }
        
        profile['behavior_history'].append(behavior_snapshot)
        
        # Keep only last 100 snapshots
        if len(profile['behavior_history']) > 100:
            profile['behavior_history'] = profile['behavior_history'][-100:]
    
    def get_behavior_trend(self, player_id: str) -> Dict:
        """Get behavior trend analysis for player"""
        
        if player_id not in self.behavior_profiles:
            return {'trend': 'unknown', 'confidence': 0.0}
        
        profile = self.behavior_profiles[player_id]
        history = profile['behavior_history']
        
        if len(history) < 5:
            return {'trend': 'insufficient_data', 'confidence': 0.0}
        
        # Calculate trend from recent behavior
        recent_scores = [entry['anomaly_score'] for entry in history[-10:]]
        
        if len(recent_scores) < 3:
            return {'trend': 'stable', 'confidence': 0.5}
        
        # Simple trend calculation
        first_half = np.mean(recent_scores[:len(recent_scores)//2])
        second_half = np.mean(recent_scores[len(recent_scores)//2:])
        
        trend_difference = second_half - first_half
        
        if abs(trend_difference) < 0.1:
            trend = 'stable'
            confidence = 0.7
        elif trend_difference > 0.2:
            trend = 'increasing_risk'
            confidence = min(0.9, abs(trend_difference))
        elif trend_difference < -0.2:
            trend = 'improving_behavior'
            confidence = min(0.9, abs(trend_difference))
        else:
            trend = 'slight_change'
            confidence = 0.5
        
        return {
            'trend': trend,
            'confidence': float(confidence),
            'trend_magnitude': float(abs(trend_difference)),
            'data_points': len(recent_scores)
        }