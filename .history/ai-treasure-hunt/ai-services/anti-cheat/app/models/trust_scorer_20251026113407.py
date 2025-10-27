import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class TrustScorer:
    def __init__(self):
        self.trust_weights = {
            'behavior_consistency': 0.25,
            'location_verification': 0.20,
            'historical_performance': 0.20,
            'social_behavior': 0.15,
            'device_reputation': 0.10,
            'temporal_patterns': 0.10
        }
        
        self.trust_history = {}
        self.decay_factor = 0.95  # Trust score decay per day
        
    def calculate_trust_score(self, player_data: Dict, verification_results: Dict) -> Dict:
        """Calculate comprehensive trust score for player"""
        
        component_scores = {}
        
        # Calculate individual component scores
        component_scores['behavior_consistency'] = self._calculate_behavior_consistency(player_data)
        component_scores['location_verification'] = self._calculate_location_trust(verification_results)
        component_scores['historical_performance'] = self._calculate_historical_performance(player_data)
        component_scores['social_behavior'] = self._calculate_social_behavior(player_data)
        component_scores['device_reputation'] = self._calculate_device_reputation(player_data)
        component_scores['temporal_patterns'] = self._calculate_temporal_consistency(player_data)
        
        # Calculate weighted trust score
        trust_score = 0.0
        for component, weight in self.trust_weights.items():
            trust_score += component_scores[component] * weight
        
        # Apply time-based decay
        trust_score = self._apply_trust_decay(player_data.get('player_id'), trust_score)
        
        # Determine trust level
        trust_level = self._determine_trust_level(trust_score)
        
        return {
            'trust_score': max(0.0, min(1.0, trust_score)),
            'trust_level': trust_level,
            'component_scores': component_scores,
            'confidence': self._calculate_confidence(component_scores),
            'recommendations': self._generate_trust_recommendations(component_scores)
        }
    
    def _calculate_behavior_consistency(self, player_data: Dict) -> float:
        """Calculate behavior consistency score"""
        
        consistency_indicators = []
        
        # Solving time consistency
        solving_times = player_data.get('solving_times', [])
        if len(solving_times) > 2:
            times_array = np.array(solving_times)
            time_consistency = 1.0 - (np.std(times_array) / np.mean(times_array) if np.mean(times_array) > 0 else 1.0)
            consistency_indicators.append(max(0.0, time_consistency))
        
        # Success pattern consistency
        success_pattern = player_data.get('success_pattern', [])
        if success_pattern:
            unique_sequences = len(set(success_pattern))
            sequence_consistency = 1.0 - (unique_sequences / len(success_pattern))
            consistency_indicators.append(sequence_consistency)
        
        # Movement pattern consistency
        movement_consistency = player_data.get('movement_consistency', 0.7)
        consistency_indicators.append(movement_consistency)
        
        return np.mean(consistency_indicators) if consistency_indicators else 0.5
    
    def _calculate_location_trust(self, verification_results: Dict) -> float:
        """Calculate location verification trust score"""
        
        location_analysis = verification_results.get('location', {})
        
        trust_factors = []
        
        # GPS trust
        trust_factors.append(location_analysis.get('gps_trust', 0.5))
        
        # Movement plausibility
        trust_factors.append(location_analysis.get('movement_plausibility', 0.5))
        
        # Spoofing indicators penalty
        spoofing_indicators = location_analysis.get('spoofing_indicators', [])
        spoofing_penalty = 1.0 - (len(spoofing_indicators) * 0.2)
        trust_factors.append(max(0.1, spoofing_penalty))
        
        return np.mean(trust_factors)
    
    def _calculate_historical_performance(self, player_data: Dict) -> float:
        """Calculate historical performance score"""
        
        performance_indicators = []
        
        # Success rate
        success_rate = player_data.get('success_rate', 0.5)
        performance_indicators.append(success_rate)
        
        # Longevity bonus
        account_age_days = player_data.get('account_age_days', 1)
        longevity_bonus = min(0.3, account_age_days / 100)  # Cap at 0.3 for 100+ days
        performance_indicators.append(0.7 + longevity_bonus)
        
        # Achievement density
        achievements = player_data.get('achievements', 0)
        play_time = player_data.get('total_play_time', 1)
        achievement_density = min(1.0, achievements / (play_time / 3600))  # Achievements per hour
        performance_indicators.append(achievement_density)
        
        return np.mean(performance_indicators)
    
    def _calculate_social_behavior(self, player_data: Dict) -> float:
        """Calculate social behavior score"""
        
        social_indicators = []
        
        # Collaboration score
        collaboration = player_data.get('collaboration_score', 0.5)
        social_indicators.append(collaboration)
        
        # Communication quality
        communication = player_data.get('communication_quality', 0.5)
        social_indicators.append(communication)
        
        # Report history (negative factor)
        reports_received = player_data.get('reports_received', 0)
        reports_penalty = 1.0 - min(0.5, reports_received * 0.1)
        social_indicators.append(reports_penalty)
        
        # Positive feedback
        positive_feedback = player_data.get('positive_feedback', 0)
        feedback_bonus = min(0.2, positive_feedback * 0.05)
        social_indicators.append(0.8 + feedback_bonus)
        
        return np.mean(social_indicators)
    
    def _calculate_device_reputation(self, player_data: Dict) -> float:
        """Calculate device reputation score"""
        
        device_indicators = []
        
        # Device consistency
        device_consistency = player_data.get('device_consistency', 0.8)
        device_indicators.append(device_consistency)
        
        # Connection stability
        connection_stability = player_data.get('connection_stability', 0.7)
        device_indicators.append(connection_stability)
        
        # Location consistency
        location_consistency = player_data.get('location_consistency', 0.6)
        device_indicators.append(location_consistency)
        
        return np.mean(device_indicators)
    
    def _calculate_temporal_consistency(self, player_data: Dict) -> float:
        """Calculate temporal pattern consistency"""
        
        temporal_indicators = []
        
        # Play time consistency
        usual_playing_hours = player_data.get('usual_playing_hours', True)
        temporal_indicators.append(0.9 if usual_playing_hours else 0.5)
        
        # Session length consistency
        session_consistency = player_data.get('session_length_consistency', 0.7)
        temporal_indicators.append(session_consistency)
        
        # Play frequency consistency
        frequency_consistency = player_data.get('play_frequency_consistency', 0.6)
        temporal_indicators.append(frequency_consistency)
        
        return np.mean(temporal_indicators)
    
    def _apply_trust_decay(self, player_id: str, current_score: float) -> float:
        """Apply time-based trust decay"""
        
        if not player_id:
            return current_score
        
        now = datetime.utcnow()
        
        if player_id in self.trust_history:
            last_update = self.trust_history[player_id]['timestamp']
            days_passed = (now - last_update).days
            
            # Apply decay for each day passed
            decayed_score = current_score * (self.decay_factor ** days_passed)
            
            # Update history
            self.trust_history[player_id] = {
                'timestamp': now,
                'score': decayed_score
            }
            
            return decayed_score
        else:
            # First time scoring this player
            self.trust_history[player_id] = {
                'timestamp': now,
                'score': current_score
            }
            return current_score
    
    def _determine_trust_level(self, trust_score: float) -> str:
        """Determine trust level based on score"""
        
        if trust_score >= 0.9:
            return 'excellent'
        elif trust_score >= 0.8:
            return 'high'
        elif trust_score >= 0.7:
            return 'good'
        elif trust_score >= 0.6:
            return 'fair'
        elif trust_score >= 0.4:
            return 'low'
        else:
            return 'restricted'
    
    def _calculate_confidence(self, component_scores: Dict) -> float:
        """Calculate confidence in trust score"""
        
        # Confidence is based on how consistent the component scores are
        scores = list(component_scores.values())
        
        if len(scores) < 2:
            return 0.5
        
        variance = np.var(scores)
        consistency = 1.0 - min(1.0, variance * 5)  # Scale variance to 0-1
        
        # Also consider number of data points (simplified)
        data_sufficiency = min(1.0, len(scores) / 6)  # 6 is max components
        
        return (consistency + data_sufficiency) / 2
    
    def _generate_trust_recommendations(self, component_scores: Dict) -> List[str]:
        """Generate recommendations to improve trust score"""
        
        recommendations = []
        
        if component_scores.get('behavior_consistency', 0) < 0.7:
            recommendations.append("Improve behavior consistency")
        
        if component_scores.get('location_verification', 0) < 0.6:
            recommendations.append("Verify location accuracy")
        
        if component_scores.get('social_behavior', 0) < 0.5:
            recommendations.append("Engage in positive social interactions")
        
        if component_scores.get('device_reputation', 0) < 0.6:
            recommendations.append("Maintain consistent device usage")
        
        return recommendations
    
    def get_trust_history(self, player_id: str, days: int = 30) -> List[Dict]:
        """Get trust score history for player"""
        
        if player_id not in self.trust_history:
            return []
        
        # In a real implementation, this would query a database
        # For now, return mock historical data
        history = []
        base_score = self.trust_history[player_id]['score']
        
        for i in range(days):
            date = datetime.utcnow() - timedelta(days=i)
            # Simulate some variation in historical scores
            variation = np.random.normal(0, 0.05)
            score = max(0.1, min(1.0, base_score + variation))
            
            history.append({
                'date': date.isoformat(),
                'trust_score': score,
                'trust_level': self._determine_trust_level(score)
            })
        
        return sorted(history, key=lambda x: x['date'])
    