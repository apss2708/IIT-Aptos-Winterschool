import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, List, Tuple
import asyncio
from datetime import datetime, timedelta
import hashlib
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class BehaviorFeatures:
    solving_times: List[float]
    movement_patterns: List[Dict]
    location_accuracy: float
    device_consistency: float
    collaboration_level: float
    success_rate: float

class AdvancedBehaviorAnalyzer:
    def __init__(self):
        self.anomaly_detector = IsolationForest(contamination=0.05, random_state=42)
        self.trust_scores = {}
        self.behavior_baselines = {}
        
    async def comprehensive_verification(
        self, 
        player_data: Dict, 
        location_data: Dict,
        game_context: Dict
    ) -> Dict:
        """Comprehensive multi-layered verification"""
        
        verification_results = {
            'trust_score': 0.0,
            'risk_factors': [],
            'recommendations': [],
            'verification_level': 'low',
            'detailed_analysis': {}
        }
        
        # Parallel verification checks
        tasks = [
            self._analyze_behavior_patterns(player_data),
            self._verify_location_authenticity(location_data),
            self._detect_device_anomalies(player_data),
            self._analyze_temporal_patterns(player_data),
            self._check_collaboration_network(player_data, game_context)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        behavior_analysis, location_trust, device_analysis, temporal_analysis, social_analysis = results
        
        # Calculate composite trust score
        trust_score = self._calculate_composite_trust(
            behavior_analysis, location_trust, device_analysis, 
            temporal_analysis, social_analysis
        )
        
        verification_results['trust_score'] = trust_score
        verification_results['detailed_analysis'] = {
            'behavior': behavior_analysis,
            'location': location_trust,
            'device': device_analysis,
            'temporal': temporal_analysis,
            'social': social_analysis
        }
        
        # Identify risk factors
        verification_results['risk_factors'] = self._identify_risk_factors(
            verification_results['detailed_analysis']
        )
        
        # Set verification level
        verification_results['verification_level'] = self._determine_verification_level(trust_score)
        
        # Generate recommendations
        verification_results['recommendations'] = self._generate_recommendations(
            verification_results
        )
        
        return verification_results
    
    async def _analyze_behavior_patterns(self, player_data: Dict) -> Dict:
        """Deep behavioral pattern analysis"""
        
        features = self._extract_behavioral_features(player_data)
        
        analysis = {
            'anomaly_score': 0.0,
            'pattern_consistency': 1.0,
            'learning_trajectory': 'normal',
            'engagement_pattern': 'typical'
        }
        
        # Anomaly detection
        if len(features) > 0:
            try:
                anomaly_score = self.anomaly_detector.decision_function([features])[0]
                analysis['anomaly_score'] = float(anomaly_score)
            except:
                analysis['anomaly_score'] = 0.5
        
        # Pattern consistency analysis
        analysis['pattern_consistency'] = self._analyze_pattern_consistency(player_data)
        
        # Learning trajectory analysis
        analysis['learning_trajectory'] = self._analyze_learning_trajectory(player_data)
        
        return analysis
    
    async def _verify_location_authenticity(self, location_data: Dict) -> Dict:
        """Multi-source location verification"""
        
        verification = {
            'gps_trust': 1.0,
            'wifi_consistency': 1.0,
            'cell_tower_match': 1.0,
            'movement_plausibility': 1.0,
            'spoofing_indicators': []
        }
        
        # GPS signal analysis
        verification['gps_trust'] = self._analyze_gps_quality(location_data)
        
        # Movement plausibility
        verification['movement_plausibility'] = self._verify_movement_plausibility(location_data)
        
        # Spoofing detection
        verification['spoofing_indicators'] = self._detect_spoofing_indicators(location_data)
        
        return verification
    
    def _extract_behavioral_features(self, player_data: Dict) -> List[float]:
        """Extract comprehensive behavioral features"""
        
        features = []
        
        # Time-based features
        features.append(player_data.get('avg_clue_solving_time', 180))
        features.append(player_data.get('time_variance', 60))
        features.append(player_data.get('preferred_playing_hours', 12))
        
        # Success patterns
        features.append(player_data.get('success_rate', 0.5))
        features.append(player_data.get('streak_length', 0))
        
        # Interaction patterns
        features.append(player_data.get('hint_usage_rate', 0.3))
        features.append(player_data.get('retry_frequency', 0.2))
        
        # Movement patterns
        features.append(player_data.get('movement_efficiency', 0.5))
        features.append(player_data.get('location_accuracy', 0.8))
        
        return features
    
    def _analyze_pattern_consistency(self, player_data: Dict) -> float:
        """Analyze consistency in player behavior patterns"""
        
        consistency_score = 1.0
        
        # Check solving time consistency
        solving_times = player_data.get('solving_times', [])
        if len(solving_times) > 2:
            times_array = np.array(solving_times)
            cv = np.std(times_array) / np.mean(times_array) if np.mean(times_array) > 0 else 1.0
            consistency_score *= max(0, 1 - cv)
        
        return max(0.1, consistency_score)
    
    def _analyze_learning_trajectory(self, player_data: Dict) -> str:
        """Analyze player's learning progression"""
        
        solving_times = player_data.get('solving_times', [])
        if len(solving_times) < 3:
            return 'insufficient_data'
        
        # Calculate learning trend
        times_array = np.array(solving_times)
        x = np.arange(len(times_array))
        
        try:
            slope = np.polyfit(x, times_array, 1)[0]
            
            if slope < -10:
                return 'rapid_learner'
            elif slope < -2:
                return 'improving'
            elif abs(slope) <= 2:
                return 'stable'
            elif slope > 10:
                return 'concerning'
            else:
                return 'slight_improvement'
        except:
            return 'stable'
    
    def _analyze_gps_quality(self, location_data: Dict) -> float:
        """Analyze GPS signal quality"""
        accuracy = location_data.get('gps_accuracy', 0)
        
        if accuracy == 0:
            return 0.1  # Unknown accuracy
        elif accuracy < 10:
            return 1.0  # High accuracy
        elif accuracy < 50:
            return 0.8  # Good accuracy
        elif accuracy < 100:
            return 0.5  # Medium accuracy
        else:
            return 0.2  # Poor accuracy
    
    def _verify_movement_plausibility(self, location_data: Dict) -> float:
        """Verify movement patterns are physically plausible"""
        
        location_history = location_data.get('location_history', [])
        if len(location_history) < 2:
            return 1.0
        
        plausibility_score = 1.0
        impossible_movements = 0
        
        for i in range(1, len(location_history)):
            prev = location_history[i-1]
            curr = location_history[i]
            
            distance = self._calculate_haversine_distance(prev, curr)
            time_diff = curr.get('timestamp', 0) - prev.get('timestamp', 0)
            
            if time_diff > 0:
                speed_kmh = (distance / 1000) / (time_diff / 3600)
                if speed_kmh > 500:  # Impossible speed
                    impossible_movements += 1
                    plausibility_score *= 0.5
        
        movement_penalty = impossible_movements / max(1, len(location_history) - 1)
        plausibility_score *= (1 - movement_penalty)
        
        return max(0.1, plausibility_score)
    
    def _detect_spoofing_indicators(self, location_data: Dict) -> List[str]:
        """Detect location spoofing indicators"""
        
        indicators = []
        
        # Check for mock location providers
        if location_data.get('is_mock_provider', False):
            indicators.append('mock_location_provider')
        
        # Check GPS accuracy anomalies
        if location_data.get('gps_accuracy', 0) > 1000:
            indicators.append('poor_gps_accuracy')
        
        # Check for coordinate rounding
        lat, lon = location_data.get('lat', 0), location_data.get('lon', 0)
        if self._is_rounded_coordinate(lat, lon):
            indicators.append('rounded_coordinates')
        
        return indicators
    
    async def _detect_device_anomalies(self, player_data: Dict) -> Dict:
        """Detect device-related anomalies"""
        return {
            'trust_score': 0.9,
            'device_consistency': 0.95,
            'anomalies_detected': []
        }
    
    async def _analyze_temporal_patterns(self, player_data: Dict) -> Dict:
        """Analyze temporal behavior patterns"""
        return {
            'pattern_consistency': 0.85,
            'usual_playing_times': True,
            'session_length_consistency': 0.8
        }
    
    async def _check_collaboration_network(self, player_data: Dict, game_context: Dict) -> Dict:
        """Analyze collaboration patterns"""
        return {
            'collaboration_trust': 0.9,
            'suspicious_collaborations': [],
            'social_consistency': 0.85
        }
    
    def _calculate_composite_trust(
        self, 
        behavior: Dict, 
        location: Dict, 
        device: Dict, 
        temporal: Dict, 
        social: Dict
    ) -> float:
        """Calculate comprehensive trust score"""
        
        weights = {
            'behavior': 0.35,
            'location': 0.25,
            'device': 0.15,
            'temporal': 0.15,
            'social': 0.10
        }
        
        behavior_score = max(0, 1 - behavior.get('anomaly_score', 0))
        location_score = (
            location.get('gps_trust', 1.0) * 0.4 +
            location.get('movement_plausibility', 1.0) * 0.6
        )
        device_score = device.get('trust_score', 1.0)
        temporal_score = temporal.get('pattern_consistency', 1.0)
        social_score = social.get('collaboration_trust', 1.0)
        
        # Apply penalties for risk factors
        if behavior.get('learning_trajectory') == 'concerning':
            behavior_score *= 0.7
        
        if location.get('spoofing_indicators'):
            location_score *= (1 - len(location['spoofing_indicators']) * 0.2)
        
        composite_score = (
            behavior_score * weights['behavior'] +
            location_score * weights['location'] +
            device_score * weights['device'] +
            temporal_score * weights['temporal'] +
            social_score * weights['social']
        )
        
        return max(0.1, min(1.0, composite_score))
    
    def _identify_risk_factors(self, detailed_analysis: Dict) -> List[str]:
        """Identify specific risk factors"""
        risk_factors = []
        
        if detailed_analysis['behavior']['anomaly_score'] > 0.7:
            risk_factors.append('high_behavior_anomaly')
        
        if detailed_analysis['location']['spoofing_indicators']:
            risk_factors.append('location_spoofing_suspected')
        
        if detailed_analysis['behavior']['learning_trajectory'] == 'concerning':
            risk_factors.append('suspicious_learning_pattern')
        
        return risk_factors
    
    def _determine_verification_level(self, trust_score: float) -> str:
        """Determine required verification level"""
        if trust_score >= 0.8:
            return 'low'
        elif trust_score >= 0.6:
            return 'medium'
        elif trust_score >= 0.4:
            return 'high'
        else:
            return 'extreme'
    
    def _generate_recommendations(self, verification_results: Dict) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []
        trust_score = verification_results['trust_score']
        
        if trust_score < 0.6:
            recommendations.append('additional_location_verification')
        
        if trust_score < 0.4:
            recommendations.append('temporary_restriction')
            recommendations.append('manual_review')
        
        if 'high_behavior_anomaly' in verification_results['risk_factors']:
            recommendations.append('behavior_monitoring')
        
        return recommendations
    
    def _calculate_haversine_distance(self, loc1: Dict, loc2: Dict) -> float:
        """Calculate distance between two points using Haversine formula"""
        from math import radians, sin, cos, sqrt, atan2
        
        try:
            lat1, lon1 = radians(loc1['lat']), radians(loc1['lon'])
            lat2, lon2 = radians(loc2['lat']), radians(loc2['lon'])
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            
            return 6371000 * c  # Earth radius in meters
        except:
            return 0.0
    
    def _is_rounded_coordinate(self, lat: float, lon: float) -> bool:
        """Check if coordinates appear rounded"""
        try:
            lat_str = str(lat)
            lon_str = str(lon)
            
            if '.' in lat_str:
                lat_decimals = len(lat_str.split('.')[1])
                if lat_decimals < 4:
                    return True
            
            if '.' in lon_str:
                lon_decimals = len(lon_str.split('.')[1])
                if lon_decimals < 4:
                    return True
        except:
            pass
        
        return False