import logging
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import hashlib
import json

logger = logging.getLogger(__name__)

class FraudDetector:
    def __init__(self):
        self.fraud_patterns = self._load_fraud_patterns()
        self.suspicious_activities = {}
        
    def _load_fraud_patterns(self) -> Dict:
        """Load known fraud patterns"""
        return {
            'location_spoofing': {
                'indicators': ['mock_location_provider', 'poor_gps_accuracy', 'impossible_movements'],
                'risk_score': 0.8,
                'mitigation': 'require_additional_verification'
            },
            'multiple_accounts': {
                'indicators': ['same_device_multiple_accounts', 'similar_behavior_patterns', 'coordinated_actions'],
                'risk_score': 0.7,
                'mitigation': 'investigate_relationships'
            },
            'automation_detection': {
                'indicators': ['unnatural_timing', 'perfect_precision', 'consistent_success'],
                'risk_score': 0.9,
                'mitigation': 'challenge_response_test'
            },
            'collaborative_cheating': {
                'indicators': ['information_sharing', 'coordinated_movements', 'rapid_succession_solves'],
                'risk_score': 0.6,
                'mitigation': 'monitor_social_graph'
            }
        }
    
    def detect_fraud_patterns(self, player_data: Dict, game_context: Dict) -> Dict:
        """Detect potential fraud patterns"""
        
        detected_patterns = []
        risk_score = 0.0
        evidence = {}
        
        # Check for location spoofing
        location_fraud = self._detect_location_fraud(player_data)
        if location_fraud['detected']:
            detected_patterns.append('location_spoofing')
            risk_score = max(risk_score, self.fraud_patterns['location_spoofing']['risk_score'])
            evidence['location'] = location_fraud['evidence']
        
        # Check for multiple accounts
        multi_account = self._detect_multiple_accounts(player_data, game_context)
        if multi_account['detected']:
            detected_patterns.append('multiple_accounts')
            risk_score = max(risk_score, self.fraud_patterns['multiple_accounts']['risk_score'])
            evidence['multi_account'] = multi_account['evidence']
        
        # Check for automation
        automation = self._detect_automation(player_data)
        if automation['detected']:
            detected_patterns.append('automation_detection')
            risk_score = max(risk_score, self.fraud_patterns['automation_detection']['risk_score'])
            evidence['automation'] = automation['evidence']
        
        # Check for collaborative cheating
        collaboration_fraud = self._detect_collaborative_cheating(player_data, game_context)
        if collaboration_fraud['detected']:
            detected_patterns.append('collaborative_cheating')
            risk_score = max(risk_score, self.fraud_patterns['collaborative_cheating']['risk_score'])
            evidence['collaboration'] = collaboration_fraud['evidence']
        
        return {
            'detected_patterns': detected_patterns,
            'risk_score': risk_score,
            'evidence': evidence,
            'recommendations': self._generate_fraud_recommendations(detected_patterns),
            'confidence': self._calculate_fraud_confidence(evidence)
        }
    
    def _detect_location_fraud(self, player_data: Dict) -> Dict:
        """Detect location spoofing and fraud"""
        
        evidence = []
        detected = False
        
        location_data = player_data.get('location_data', {})
        
        # Check for mock location providers
        if location_data.get('is_mock_provider', False):
            evidence.append("Mock location provider detected")
            detected = True
        
        # Check GPS accuracy
        gps_accuracy = location_data.get('gps_accuracy', 0)
        if gps_accuracy > 1000:  # Very poor accuracy
            evidence.append(f"Poor GPS accuracy: {gps_accuracy}m")
            detected = True
        
        # Check for impossible movements
        if self._check_impossible_movements(location_data):
            evidence.append("Impossible movement patterns detected")
            detected = True
        
        # Check coordinate rounding
        if self._check_coordinate_rounding(location_data):
            evidence.append("Suspicious coordinate rounding detected")
            detected = True
        
        return {
            'detected': detected,
            'evidence': evidence,
            'risk_level': 'high' if detected else 'low'
        }
    
    def _detect_multiple_accounts(self, player_data: Dict, game_context: Dict) -> Dict:
        """Detect potential multiple account usage"""
        
        evidence = []
        detected = False
        
        device_fingerprint = player_data.get('device_fingerprint', '')
        ip_address = player_data.get('ip_address', '')
        
        # Check for same device with different accounts
        if device_fingerprint in self.suspicious_activities:
            account_count = self.suspicious_activities[device_fingerprint].get('account_count', 0)
            if account_count > 2:
                evidence.append(f"Same device used for {account_count} accounts")
                detected = True
        
        # Check for similar behavior patterns across accounts
        similar_players = game_context.get('similar_players', [])
        if len(similar_players) > 3:
            evidence.append(f"Similar behavior patterns with {len(similar_players)} other players")
            detected = True
        
        # Check IP address patterns
        ip_players = game_context.get('players_per_ip', {}).get(ip_address, 0)
        if ip_players > 5:
            evidence.append(f"Multiple players ({ip_players}) from same IP address")
            detected = True
        
        return {
            'detected': detected,
            'evidence': evidence,
            'risk_level': 'medium' if detected else 'low'
        }
    
    def _detect_automation(self, player_data: Dict) -> Dict:
        """Detect bot-like automation"""
        
        evidence = []
        detected = False
        
        # Check for unnatural timing
        solving_times = player_data.get('solving_times', [])
        if solving_times:
            avg_time = sum(solving_times) / len(solving_times)
            if avg_time < 30:  # Less than 30 seconds average
                evidence.append(f"Unnaturally fast solving: {avg_time:.1f}s average")
                detected = True
            
            # Check for consistent timing (bot-like)
            if len(solving_times) > 5:
                std_dev = self._calculate_std_dev(solving_times)
                if std_dev < 5:  # Very consistent timing
                    evidence.append(f"Suspiciously consistent timing: {std_dev:.1f}s std dev")
                    detected = True
        
        # Check for perfect precision
        success_rate = player_data.get('success_rate', 0.5)
        if success_rate > 0.95:
            evidence.append(f"Unnaturally high success rate: {success_rate:.1%}")
            detected = True
        
        # Check movement precision
        movement_efficiency = player_data.get('movement_efficiency', 0.5)
        if movement_efficiency > 0.98:
            evidence.append(f"Perfect movement efficiency: {movement_efficiency:.1%}")
            detected = True
        
        return {
            'detected': detected,
            'evidence': evidence,
            'risk_level': 'high' if detected else 'low'
        }
    
    def _detect_collaborative_cheating(self, player_data: Dict, game_context: Dict) -> Dict:
        """Detect collaborative cheating patterns"""
        
        evidence = []
        detected = False
        
        social_connections = player_data.get('social_connections', [])
        
        # Check for information sharing patterns
        if self._check_information_sharing(player_data, game_context):
            evidence.append("Suspicious information sharing detected")
            detected = True
        
        # Check for coordinated movements
        coordinated_movements = game_context.get('coordinated_movements', [])
        if player_data.get('player_id') in coordinated_movements:
            evidence.append("Coordinated movement patterns detected")
            detected = True
        
        # Check for rapid succession solves
        if self._check_rapid_succession_solves(player_data, game_context):
            evidence.append("Rapid succession puzzle solving detected")
            detected = True
        
        return {
            'detected': detected,
            'evidence': evidence,
            'risk_level': 'medium' if detected else 'low'
        }
    
    def _check_impossible_movements(self, location_data: Dict) -> bool:
        """Check for physically impossible movements"""
        
        location_history = location_data.get('location_history', [])
        if len(location_history) < 2:
            return False
        
        for i in range(1, len(location_history)):
            prev = location_history[i-1]
            curr = location_history[i]
            
            distance = self._calculate_distance(prev, curr)
            time_diff = curr.get('timestamp', 0) - prev.get('timestamp', 0)
            
            if time_diff > 0:
                speed_kmh = (distance / 1000) / (time_diff / 3600)
                if speed_kmh > 500:  # Impossible speed
                    return True
        
        return False
    
    def _check_coordinate_rounding(self, location_data: Dict) -> bool:
        """Check for suspicious coordinate rounding"""
        
        locations = location_data.get('locations', [])
        if not locations:
            return False
        
        rounded_count = 0
        for location in locations:
            lat = location.get('lat', 0)
            lon = location.get('lon', 0)
            
            if self._is_rounded_coordinate(lat, lon):
                rounded_count += 1
        
        # If more than 50% of coordinates are rounded, suspicious
        return (rounded_count / len(locations)) > 0.5
    
    def _check_information_sharing(self, player_data: Dict, game_context: Dict) -> bool:
        """Check for suspicious information sharing patterns"""
        
        # This would analyze communication patterns and solution timing
        # For now, use a simplified check
        communication_frequency = player_data.get('communication_frequency', 0)
        similar_solutions = game_context.get('similar_solutions', 0)
        
        return communication_frequency > 10 and similar_solutions > 5
    
    def _check_rapid_succession_solves(self, player_data: Dict, game_context: Dict) -> bool:
        """Check for rapid succession puzzle solving"""
        
        solve_times = player_data.get('recent_solve_times', [])
        if len(solve_times) < 3:
            return False
        
        # Check if solves are happening in suspiciously rapid succession
        time_differences = []
        for i in range(1, len(solve_times)):
            time_differences.append(solve_times[i] - solve_times[i-1])
        
        avg_time_diff = sum(time_differences) / len(time_differences)
        return avg_time_diff < 60  # Less than 1 minute between solves
    
    def _calculate_distance(self, loc1: Dict, loc2: Dict) -> float:
        """Calculate distance between two locations in meters"""
        # Simplified calculation - in production, use Haversine formula
        lat_diff = abs(loc1['lat'] - loc2['lat'])
        lon_diff = abs(loc1['lon'] - loc2['lon'])
        return (lat_diff + lon_diff) * 111000  # Rough conversion to meters
    
    def _is_rounded_coordinate(self, lat: float, lon: float) -> bool:
        """Check if coordinates appear rounded"""
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
        
        return False
    
    def _calculate_std_dev(self, values: List[float]) -> float:
        """Calculate standard deviation"""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance ** 0.5
    
    def _generate_fraud_recommendations(self, patterns: List[str]) -> List[str]:
        """Generate fraud mitigation recommendations"""
        
        recommendations = []
        
        for pattern in patterns:
            mitigation = self.fraud_patterns.get(pattern, {}).get('mitigation', 'monitor_behavior')
            recommendations.append(f"{pattern}: {mitigation}")
        
        if not recommendations:
            recommendations.append("No immediate action required")
        
        return recommendations
    
    def _calculate_fraud_confidence(self, evidence: Dict) -> float:
        """Calculate confidence in fraud detection"""
        
        total_evidence = 0
        for category, items in evidence.items():
            total_evidence += len(items)
        
        # More evidence = higher confidence
        confidence = min(1.0, total_evidence / 10)
        
        return confidence
    
    def log_suspicious_activity(self, player_id: str, activity_type: str, details: Dict):
        """Log suspicious activity for analysis"""
        
        activity_hash = hashlib.md5(
            f"{player_id}_{activity_type}_{json.dumps(details)}".encode()
        ).hexdigest()
        
        self.suspicious_activities[activity_hash] = {
            'player_id': player_id,
            'activity_type': activity_type,
            'details': details,
            'timestamp': datetime.utcnow().isoformat(),
            'reviewed': False
        }