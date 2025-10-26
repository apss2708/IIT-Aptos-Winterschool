import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

class PatternAnalyzer:
    def __init__(self):
        self.cheating_patterns = self._load_cheating_patterns()
        self.player_patterns = defaultdict(lambda: defaultdict(list))
        self.global_patterns = defaultdict(list)
        
    def _load_cheating_patterns(self) -> Dict:
        """Load known cheating patterns and their signatures"""
        return {
            'speed_hacking': {
                'threshold': 0.8,
                'indicators': ['avg_solving_time < 30', 'success_rate > 0.95'],
                'weight': 0.9,
                'description': 'Solving clues unrealistically fast'
            },
            'location_spoofing': {
                'threshold': 0.7,
                'indicators': ['impossible_movements', 'gps_inconsistencies'],
                'weight': 0.8,
                'description': 'Fake location data'
            },
            'multiple_accounts': {
                'threshold': 0.6,
                'indicators': ['same_device_id', 'similar_behavior'],
                'weight': 0.7,
                'description': 'Multiple accounts from same user'
            },
            'automation_detection': {
                'threshold': 0.75,
                'indicators': ['consistent_timing', 'perfect_precision'],
                'weight': 0.85,
                'description': 'Bot-like behavior patterns'
            },
            'collaborative_cheating': {
                'threshold': 0.65,
                'indicators': ['information_sharing', 'coordinated_solves'],
                'weight': 0.6,
                'description': 'Group cheating patterns'
            }
        }
    
    def analyze_behavior_patterns(self, player_data: Dict, game_context: Dict) -> Dict:
        """Analyze player behavior for cheating patterns"""
        
        pattern_scores = {}
        detected_patterns = []
        evidence = {}
        
        # Analyze each cheating pattern
        for pattern_name, pattern_config in self.cheating_patterns.items():
            score, pattern_evidence = self._analyze_single_pattern(
                pattern_name, player_data, game_context
            )
            
            pattern_scores[pattern_name] = score
            if score >= pattern_config['threshold']:
                detected_patterns.append(pattern_name)
                evidence[pattern_name] = pattern_evidence
            
            # Update player pattern history
            self._update_pattern_history(player_data.get('player_id'), pattern_name, score)
        
        # Calculate overall risk score
        overall_risk = self._calculate_overall_risk(pattern_scores)
        
        # Update global patterns
        self._update_global_patterns(detected_patterns)
        
        return {
            'overall_risk_score': overall_risk,
            'detected_patterns': detected_patterns,
            'pattern_scores': pattern_scores,
            'evidence': evidence,
            'recommendations': self._generate_pattern_recommendations(detected_patterns),
            'confidence': self._calculate_analysis_confidence(player_data)
        }
    
    def _analyze_single_pattern(self, pattern_name: str, player_data: Dict, context: Dict) -> Tuple[float, List[str]]:
        """Analyze a single cheating pattern"""
        
        if pattern_name == 'speed_hacking':
            return self._analyze_speed_hacking(player_data, context)
        elif pattern_name == 'location_spoofing':
            return self._analyze_location_spoofing(player_data, context)
        elif pattern_name == 'multiple_accounts':
            return self._analyze_multiple_accounts(player_data, context)
        elif pattern_name == 'automation_detection':
            return self._analyze_automation(player_data, context)
        elif pattern_name == 'collaborative_cheating':
            return self._analyze_collaborative_cheating(player_data, context)
        else:
            return 0.0, []
    
    def _analyze_speed_hacking(self, player_data: Dict, context: Dict) -> Tuple[float, List[str]]:
        """Analyze for unrealistically fast solving"""
        
        evidence = []
        score = 0.0
        
        solving_times = player_data.get('solving_times', [])
        success_rate = player_data.get('success_rate', 0.5)
        
        if solving_times:
            avg_solving_time = np.mean(solving_times)
            
            # Check for extremely fast solving
            if avg_solving_time < 20:  # Less than 20 seconds average
                score += 0.8
                evidence.append(f"Extremely fast average solving time: {avg_solving_time:.1f}s")
            elif avg_solving_time < 40:
                score += 0.5
                evidence.append(f"Very fast average solving time: {avg_solving_time:.1f}s")
        
        # Check for perfect success with fast times
        if success_rate > 0.95 and len(solving_times) > 5:
            score += 0.3
            evidence.append(f"Perfect success rate with fast solving: {success_rate:.1%}")
        
        return min(1.0, score), evidence
    
    def _analyze_location_spoofing(self, player_data: Dict, context: Dict) -> Tuple[float, List[str]]:
        """Analyze for location spoofing patterns"""
        
        evidence = []
        score = 0.0
        
        location_data = player_data.get('location_data', {})
        movement_history = location_data.get('movement_history', [])
        
        # Check for impossible movements
        impossible_movements = self._detect_impossible_movements(movement_history)
        if impossible_movements:
            score += 0.6
            evidence.append(f"Detected {impossible_movements} impossible movements")
        
        # Check GPS inconsistencies
        gps_issues = location_data.get('gps_issues', [])
        if gps_issues:
            score += 0.4
            evidence.append(f"GPS inconsistencies: {', '.join(gps_issues)}")
        
        # Check for mock location providers
        if location_data.get('is_mock_provider', False):
            score += 0.8
            evidence.append("Mock location provider detected")
        
        return min(1.0, score), evidence
    
    def _analyze_multiple_accounts(self, player_data: Dict, context: Dict) -> Tuple[float, List[str]]:
        """Analyze for multiple account usage"""
        
        evidence = []
        score = 0.0
        
        device_fingerprint = player_data.get('device_fingerprint')
        ip_address = player_data.get('ip_address')
        
        # Check device fingerprint across accounts
        similar_devices = context.get('similar_devices', [])
        if device_fingerprint in similar_devices:
            score += 0.5
            evidence.append(f"Device used for {len(similar_devices)} accounts")
        
        # Check IP address patterns
        ip_accounts = context.get('accounts_per_ip', {}).get(ip_address, 0)
        if ip_accounts > 3:
            score += 0.4
            evidence.append(f"Multiple accounts ({ip_accounts}) from same IP")
        
        # Check behavioral similarity
        behavioral_similarity = self._calculate_behavioral_similarity(player_data, context)
        if behavioral_similarity > 0.8:
            score += 0.3
            evidence.append(f"High behavioral similarity with other accounts: {behavioral_similarity:.1%}")
        
        return min(1.0, score), evidence
    
    def _analyze_automation(self, player_data: Dict, context: Dict) -> Tuple[float, List[str]]:
        """Analyze for bot-like automation"""
        
        evidence = []
        score = 0.0
        
        solving_times = player_data.get('solving_times', [])
        interaction_patterns = player_data.get('interaction_patterns', {})
        
        # Check for consistent timing (bot signature)
        if len(solving_times) > 5:
            timing_consistency = self._calculate_timing_consistency(solving_times)
            if timing_consistency > 0.9:
                score += 0.7
                evidence.append(f"Suspicious timing consistency: {timing_consistency:.1%}")
        
        # Check for perfect precision
        movement_efficiency = player_data.get('movement_efficiency', 0)
        if movement_efficiency > 0.98:
            score += 0.6
            evidence.append(f"Perfect movement efficiency: {movement_efficiency:.1%}")
        
        # Check interaction patterns
        if self._has_mechanical_patterns(interaction_patterns):
            score += 0.5
            evidence.append("Mechanical interaction patterns detected")
        
        return min(1.0, score), evidence
    
    def _analyze_collaborative_cheating(self, player_data: Dict, context: Dict) -> Tuple[float, List[str]]:
        """Analyze for collaborative cheating patterns"""
        
        evidence = []
        score = 0.0
        
        social_connections = player_data.get('social_connections', [])
        communication_patterns = player_data.get('communication_patterns', {})
        
        # Check for information sharing
        if self._detect_information_sharing(communication_patterns):
            score += 0.5
            evidence.append("Suspicious information sharing patterns")
        
        # Check for coordinated solving
        coordinated_actions = context.get('coordinated_actions', [])
        if player_data.get('player_id') in coordinated_actions:
            score += 0.4
            evidence.append("Coordinated solving with other players")
        
        # Check social network density
        if len(social_connections) > 10:
            network_density = self._calculate_network_density(social_connections)
            if network_density > 0.8:
                score += 0.3
                evidence.append(f"High-density social network: {network_density:.1%}")
        
        return min(1.0, score), evidence
    
    def _detect_impossible_movements(self, movement_history: List[Dict]) -> int:
        """Detect physically impossible movements"""
        
        impossible_count = 0
        
        for i in range(1, len(movement_history)):
            prev = movement_history[i-1]
            curr = movement_history[i]
            
            distance = self._calculate_distance(prev, curr)
            time_diff = curr.get('timestamp', 0) - prev.get('timestamp', 0)
            
            if time_diff > 0:
                speed = distance / time_diff  # m/s
                if speed > 100:  # 360 km/h - impossible for walking
                    impossible_count += 1
        
        return impossible_count
    
    def _calculate_behavioral_similarity(self, player_data: Dict, context: Dict) -> float:
        """Calculate behavioral similarity with other accounts"""
        
        # This would compare with known accounts from same device/IP
        # For now, return a mock value
        similar_players = context.get('similar_players', [])
        if not similar_players:
            return 0.0
        
        # Simple similarity calculation
        return min(0.9, len(similar_players) * 0.1)
    
    def _calculate_timing_consistency(self, solving_times: List[float]) -> float:
        """Calculate consistency in timing patterns"""
        
        if len(solving_times) < 2:
            return 0.0
        
        # Calculate coefficient of variation (lower = more consistent)
        times_array = np.array(solving_times)
        mean_time = np.mean(times_array)
        std_dev = np.std(times_array)
        
        if mean_time == 0:
            return 0.0
        
        cv = std_dev / mean_time
        # Convert to consistency score (1 - CV)
        return max(0.0, 1 - cv)
    
    def _has_mechanical_patterns(self, interaction_patterns: Dict) -> bool:
        """Check for mechanical/robotic interaction patterns"""
        
        # Check for perfect regularity in interactions
        click_intervals = interaction_patterns.get('click_intervals', [])
        if len(click_intervals) > 3:
            interval_std = np.std(click_intervals)
            if interval_std < 0.1:  # Very consistent intervals
                return True
        
        # Check for lack of human variance
        movement_patterns = interaction_patterns.get('movement_patterns', {})
        if movement_patterns.get('perfect_linearity', False):
            return True
        
        return False
    
    def _detect_information_sharing(self, communication_patterns: Dict) -> bool:
        """Detect suspicious information sharing"""
        
        message_frequency = communication_patterns.get('message_frequency', 0)
        solution_sharing = communication_patterns.get('solution_sharing', 0)
        
        # High frequency of messages around solution times
        if message_frequency > 10 and solution_sharing > 5:
            return True
        
        return False
    
    def _calculate_network_density(self, social_connections: List[str]) -> float:
        """Calculate social network density"""
        
        if len(social_connections) < 2:
            return 0.0
        
        # Simple density calculation
        max_possible_connections = len(social_connections) * (len(social_connections) - 1) / 2
        # For now, assume some connections exist
        actual_connections = min(max_possible_connections, len(social_connections) * 2)
        
        return actual_connections / max_possible_connections if max_possible_connections > 0 else 0.0
    
    def _calculate_distance(self, loc1: Dict, loc2: Dict) -> float:
        """Calculate distance between two points"""
        
        # Simplified calculation
        lat_diff = abs(loc1.get('lat', 0) - loc2.get('lat', 0))
        lon_diff = abs(loc1.get('lon', 0) - loc2.get('lon', 0))
        
        return (lat_diff + lon_diff) * 111000  # Rough conversion to meters
    
    def _calculate_overall_risk(self, pattern_scores: Dict) -> float:
        """Calculate overall risk score from pattern scores"""
        
        if not pattern_scores:
            return 0.0
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for pattern_name, score in pattern_scores.items():
            weight = self.cheating_patterns.get(pattern_name, {}).get('weight', 0.5)
            weighted_sum += score * weight
            total_weight += weight
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    def _generate_pattern_recommendations(self, detected_patterns: List[str]) -> List[str]:
        """Generate recommendations based on detected patterns"""
        
        recommendations = []
        
        for pattern in detected_patterns:
            if pattern == 'speed_hacking':
                recommendations.append("Monitor solving times and implement rate limiting")
            elif pattern == 'location_spoofing':
                recommendations.append("Require additional location verification")
            elif pattern == 'multiple_accounts':
                recommendations.append("Investigate device and IP patterns")
            elif pattern == 'automation_detection':
                recommendations.append("Implement CAPTCHA or behavioral challenges")
            elif pattern == 'collaborative_cheating':
                recommendations.append("Monitor social interactions and solution sharing")
        
        if not recommendations:
            recommendations.append("No immediate action required")
        
        return recommendations
    
    def _calculate_analysis_confidence(self, player_data: Dict) -> float:
        """Calculate confidence in pattern analysis"""
        
        # Confidence based on data quantity and quality
        data_points = len(player_data.get('solving_times', []))
        location_points = len(player_data.get('location_data', {}).get('movement_history', []))
        
        data_sufficiency = min(1.0, (data_points + location_points) / 20)
        
        return data_sufficiency
    
    def _update_pattern_history(self, player_id: str, pattern_name: str, score: float):
        """Update player's pattern history"""
        
        if not player_id:
            return
        
        self.player_patterns[player_id][pattern_name].append({
            'score': score,
            'timestamp': datetime.utcnow()
        })
        
        # Keep only last 100 records per pattern
        if len(self.player_patterns[player_id][pattern_name]) > 100:
            self.player_patterns[player_id][pattern_name] = self.player_patterns[player_id][pattern_name][-100:]
    
    def _update_global_patterns(self, detected_patterns: List[str]):
        """Update global pattern statistics"""
        
        for pattern in detected_patterns:
            self.global_patterns[pattern].append(datetime.utcnow())
            
            # Keep only last 1000 records
            if len(self.global_patterns[pattern]) > 1000:
                self.global_patterns[pattern] = self.global_patterns[pattern][-1000:]
    
    def get_pattern_statistics(self) -> Dict:
        """Get statistics about detected patterns"""
        
        stats = {}
        
        for pattern_name, timestamps in self.global_patterns.items():
            if timestamps:
                recent_count = len([ts for ts in timestamps 
                                  if datetime.utcnow() - ts < timedelta(hours=24)])
                stats[pattern_name] = {
                    'total_detections': len(timestamps),
                    'recent_detections_24h': recent_count,
                    'detection_rate': recent_count / 24.0  # per hour
                }
        
        return stats