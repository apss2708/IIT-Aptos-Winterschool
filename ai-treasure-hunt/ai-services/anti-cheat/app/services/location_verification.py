import logging
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import math
import hashlib

logger = logging.getLogger(__name__)

class LocationVerificationService:
    def __init__(self):
        self.verification_methods = {
            'gps': self._verify_gps_location,
            'wifi': self._verify_wifi_fingerprint,
            'cell': self._verify_cell_towers,
            'bluetooth': self._verify_bluetooth_beacons,
            'ip': self._verify_ip_geolocation
        }
        
    def comprehensive_location_verification(self, location_data: Dict) -> Dict:
        """Comprehensive location verification using multiple methods"""
        
        verification_results = {}
        overall_confidence = 0.0
        method_weights = {
            'gps': 0.4,
            'wifi': 0.25,
            'cell': 0.2,
            'bluetooth': 0.1,
            'ip': 0.05
        }
        
        # Run all verification methods
        for method_name, method_func in self.verification_methods.items():
            try:
                result = method_func(location_data)
                verification_results[method_name] = result
                
                # Calculate weighted confidence
                method_confidence = result.get('confidence', 0.0)
                overall_confidence += method_confidence * method_weights[method_name]
                
            except Exception as e:
                logger.error(f"Location verification method {method_name} failed: {str(e)}")
                verification_results[method_name] = {
                    'verified': False,
                    'confidence': 0.0,
                    'error': str(e)
                }
        
        # Determine overall verification status
        is_verified = overall_confidence >= 0.7
        risk_factors = self._identify_location_risk_factors(verification_results)
        
        return {
            'verified': is_verified,
            'overall_confidence': overall_confidence,
            'verification_methods': verification_results,
            'risk_factors': risk_factors,
            'recommendations': self._generate_verification_recommendations(verification_results),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _verify_gps_location(self, location_data: Dict) -> Dict:
        """Verify GPS location data"""
        
        gps_data = location_data.get('gps', {})
        confidence = 0.0
        issues = []
        
        # Check GPS accuracy
        accuracy = gps_data.get('accuracy', 0)
        if accuracy < 10:
            confidence += 0.4
        elif accuracy < 50:
            confidence += 0.3
        elif accuracy < 100:
            confidence += 0.2
        else:
            issues.append(f"Poor GPS accuracy: {accuracy}m")
            confidence += 0.1
        
        # Check satellite count
        satellite_count = gps_data.get('satellite_count', 0)
        if satellite_count >= 10:
            confidence += 0.3
        elif satellite_count >= 5:
            confidence += 0.2
        else:
            issues.append(f"Low satellite count: {satellite_count}")
            confidence += 0.1
        
        # Check signal strength
        signal_strength = gps_data.get('signal_strength', -1)
        if signal_strength > -80:
            confidence += 0.2
        elif signal_strength > -100:
            confidence += 0.1
        else:
            issues.append(f"Weak GPS signal: {signal_strength}dBm")
        
        # Check for mock location providers
        is_mock = gps_data.get('is_mock_provider', False)
        if is_mock:
            issues.append("Mock location provider detected")
            confidence *= 0.1  # Severe penalty for mock providers
        
        # Check altitude consistency
        if self._check_altitude_consistency(gps_data):
            confidence += 0.1
        
        return {
            'verified': confidence >= 0.6,
            'confidence': min(1.0, confidence),
            'issues': issues,
            'accuracy_meters': accuracy,
            'satellite_count': satellite_count,
            'signal_strength': signal_strength
        }
    
    def _verify_wifi_fingerprint(self, location_data: Dict) -> Dict:
        """Verify location using WiFi fingerprinting"""
        
        wifi_data = location_data.get('wifi', {})
        networks = wifi_data.get('networks', [])
        confidence = 0.0
        issues = []
        
        if not networks:
            return {
                'verified': False,
                'confidence': 0.0,
                'issues': ['No WiFi networks detected'],
                'network_count': 0
            }
        
        # Analyze WiFi networks
        network_count = len(networks)
        if network_count >= 5:
            confidence += 0.4
        elif network_count >= 3:
            confidence += 0.3
        elif network_count >= 1:
            confidence += 0.2
        else:
            confidence += 0.1
        
        # Check signal strength consistency
        signal_strengths = [net.get('signal_strength', -100) for net in networks]
        avg_signal = sum(signal_strengths) / len(signal_strengths)
        
        if avg_signal > -60:
            confidence += 0.3
        elif avg_signal > -70:
            confidence += 0.2
        elif avg_signal > -80:
            confidence += 0.1
        
        # Check for known networks
        known_networks = self._identify_known_networks(networks)
        if known_networks:
            confidence += 0.2
            issues.append(f"Found {len(known_networks)} known networks")
        
        # Check network stability
        if self._check_network_stability(wifi_data):
            confidence += 0.1
        
        return {
            'verified': confidence >= 0.5,
            'confidence': min(1.0, confidence),
            'issues': issues,
            'network_count': network_count,
            'known_networks': len(known_networks),
            'avg_signal_strength': avg_signal
        }
    
    def _verify_cell_towers(self, location_data: Dict) -> Dict:
        """Verify location using cell tower triangulation"""
        
        cell_data = location_data.get('cell', {})
        towers = cell_data.get('towers', [])
        confidence = 0.0
        issues = []
        
        if not towers:
            return {
                'verified': False,
                'confidence': 0.0,
                'issues': ['No cell towers detected'],
                'tower_count': 0
            }
        
        # Analyze cell towers
        tower_count = len(towers)
        if tower_count >= 3:
            confidence += 0.5
        elif tower_count >= 2:
            confidence += 0.3
        else:
            confidence += 0.1
        
        # Check signal strengths
        for tower in towers:
            signal_strength = tower.get('signal_strength', -100)
            if signal_strength > -80:
                confidence += 0.1
            elif signal_strength > -90:
                confidence += 0.05
        
        # Check tower consistency
        if self._check_tower_consistency(towers):
            confidence += 0.2
        
        # Cap confidence
        confidence = min(0.8, confidence)
        
        return {
            'verified': confidence >= 0.4,
            'confidence': confidence,
            'issues': issues,
            'tower_count': tower_count
        }
    
    def _verify_bluetooth_beacons(self, location_data: Dict) -> Dict:
        """Verify location using Bluetooth beacons"""
        
        bluetooth_data = location_data.get('bluetooth', {})
        devices = bluetooth_data.get('devices', [])
        confidence = 0.0
        
        if not devices:
            return {
                'verified': False,
                'confidence': 0.0,
                'issues': ['No Bluetooth devices detected'],
                'device_count': 0
            }
        
        # Simple Bluetooth verification
        device_count = len(devices)
        if device_count >= 3:
            confidence = 0.6
        elif device_count >= 2:
            confidence = 0.4
        else:
            confidence = 0.2
        
        return {
            'verified': confidence >= 0.4,
            'confidence': confidence,
            'issues': [],
            'device_count': device_count
        }
    
    def _verify_ip_geolocation(self, location_data: Dict) -> Dict:
        """Verify location using IP geolocation"""
        
        ip_data = location_data.get('ip', {})
        confidence = 0.0
        issues = []
        
        ip_address = ip_data.get('address', '')
        if not ip_address:
            return {
                'verified': False,
                'confidence': 0.0,
                'issues': ['No IP address provided']
            }
        
        # Check if IP is from VPN or proxy
        is_vpn = ip_data.get('is_vpn', False)
        is_proxy = ip_data.get('is_proxy', False)
        
        if is_vpn or is_proxy:
            issues.append("VPN or proxy detected")
            confidence = 0.1
        else:
            confidence = 0.5
        
        # Compare with GPS location (if available)
        gps_data = location_data.get('gps', {})
        if gps_data:
            ip_lat = ip_data.get('latitude')
            ip_lon = ip_data.get('longitude')
            gps_lat = gps_data.get('latitude')
            gps_lon = gps_data.get('longitude')
            
            if ip_lat and ip_lon and gps_lat and gps_lon:
                distance = self._calculate_distance(
                    {'lat': ip_lat, 'lon': ip_lon},
                    {'lat': gps_lat, 'lon': gps_lon}
                )
                
                if distance < 50000:  # Within 50km
                    confidence += 0.3
                else:
                    issues.append(f"IP location mismatch: {distance:.0f}m")
                    confidence *= 0.5
        
        return {
            'verified': confidence >= 0.4,
            'confidence': min(1.0, confidence),
            'issues': issues,
            'ip_address': ip_address,
            'is_vpn': is_vpn,
            'is_proxy': is_proxy
        }
    
    def _check_altitude_consistency(self, gps_data: Dict) -> bool:
        """Check if altitude data is consistent"""
        altitude = gps_data.get('altitude')
        if not altitude:
            return False
        
        # Check for reasonable altitude (not in space, not underwater)
        return -100 <= altitude <= 9000  # -100m to 9000m
    
    def _identify_known_networks(self, networks: List[Dict]) -> List[str]:
        """Identify known/registered WiFi networks"""
        known_networks = []
        known_ssids = ['HomeNetwork', 'OfficeWiFi', 'PublicWiFi']  # Example known networks
        
        for network in networks:
            ssid = network.get('ssid', '')
            if ssid in known_ssids:
                known_networks.append(ssid)
        
        return known_networks
    
    def _check_network_stability(self, wifi_data: Dict) -> bool:
        """Check if WiFi network connections are stable"""
        # This would analyze connection history
        # For now, return True as placeholder
        return True
    
    def _check_tower_consistency(self, towers: List[Dict]) -> bool:
        """Check if cell tower data is consistent"""
        if len(towers) < 2:
            return False
        
        # Check if towers are from same provider and area
        providers = set(tower.get('provider', '') for tower in towers)
        return len(providers) <= 2  # Allow 1-2 providers max
    
    def _calculate_distance(self, loc1: Dict, loc2: Dict) -> float:
        """Calculate distance between two points in meters using Haversine formula"""
        lat1, lon1 = math.radians(loc1['lat']), math.radians(loc1['lon'])
        lat2, lon2 = math.radians(loc2['lat']), math.radians(loc2['lon'])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return 6371000 * c  # Earth radius in meters
    
    def _identify_location_risk_factors(self, verification_results: Dict) -> List[str]:
        """Identify risk factors in location verification"""
        risk_factors = []
        
        # Check GPS issues
        gps_result = verification_results.get('gps', {})
        if gps_result.get('confidence', 0) < 0.3:
            risk_factors.append('low_gps_confidence')
        
        gps_issues = gps_result.get('issues', [])
        if any('mock' in issue.lower() for issue in gps_issues):
            risk_factors.append('mock_location_detected')
        
        # Check WiFi issues
        wifi_result = verification_results.get('wifi', {})
        if wifi_result.get('network_count', 0) == 0:
            risk_factors.append('no_wifi_networks')
        
        # Check IP issues
        ip_result = verification_results.get('ip', {})
        if ip_result.get('is_vpn', False):
            risk_factors.append('vpn_usage')
        if ip_result.get('is_proxy', False):
            risk_factors.append('proxy_usage')
        
        return risk_factors
    
    def _generate_verification_recommendations(self, verification_results: Dict) -> List[str]:
        """Generate recommendations to improve location verification"""
        recommendations = []
        
        gps_result = verification_results.get('gps', {})
        wifi_result = verification_results.get('wifi', {})
        ip_result = verification_results.get('ip', {})
        
        if gps_result.get('confidence', 0) < 0.6:
            recommendations.append("Improve GPS signal by moving to open area")
        
        if wifi_result.get('network_count', 0) < 3:
            recommendations.append("Connect to more WiFi networks for better accuracy")
        
        if ip_result.get('is_vpn', False):
            recommendations.append("Disable VPN for more accurate location verification")
        
        if not recommendations:
            recommendations.append("Location verification is strong")
        
        return recommendations
    
    def verify_movement_patterns(self, location_history: List[Dict]) -> Dict:
        """Verify movement patterns for natural behavior"""
        
        if len(location_history) < 3:
            return {
                'natural_movement': True,
                'confidence': 0.5,
                'issues': ['Insufficient movement data']
            }
        
        issues = []
        natural_score = 1.0
        
        # Check for teleportation
        for i in range(1, len(location_history)):
            prev = location_history[i-1]
            curr = location_history[i]
            
            distance = self._calculate_distance(prev, curr)
            time_diff = curr.get('timestamp', 0) - prev.get('timestamp', 0)
            
            if time_diff > 0:
                speed = distance / time_diff  # m/s
                if speed > 50:  # 180 km/h - suspicious speed
                    issues.append(f"Unnatural movement speed: {speed:.1f}m/s")
                    natural_score *= 0.5
        
        # Check for perfect straight lines (bot-like movement)
        if self._check_straight_line_movement(location_history):
            issues.append("Suspiciously straight movement pattern")
            natural_score *= 0.7
        
        # Check for repetitive patterns
        if self._check_repetitive_patterns(location_history):
            issues.append("Repetitive movement patterns detected")
            natural_score *= 0.8
        
        return {
            'natural_movement': natural_score >= 0.6,
            'confidence': natural_score,
            'issues': issues,
            'data_points': len(location_history)
        }
    
    def _check_straight_line_movement(self, locations: List[Dict]) -> bool:
        """Check for unnaturally straight movement patterns"""
        if len(locations) < 4:
            return False
        
        # Calculate bearing changes between consecutive points
        bearings = []
        for i in range(1, len(locations)):
            bearing = self._calculate_bearing(locations[i-1], locations[i])
            bearings.append(bearing)
        
        # Check for minimal bearing variation (straight line)
        bearing_variance = self._calculate_variance(bearings)
        return bearing_variance < 10  # Very low variance = straight line
    
    def _check_repetitive_patterns(self, locations: List[Dict]) -> bool:
        """Check for repetitive movement patterns"""
        if len(locations) < 6:
            return False
        
        # Simple check for repeated sequences
        # In production, use more sophisticated pattern recognition
        coordinates = [(loc['lat'], loc['lon']) for loc in locations]
        
        # Check for duplicate coordinates
        unique_coords = set(coordinates)
        duplicate_ratio = 1 - (len(unique_coords) / len(coordinates))
        
        return duplicate_ratio > 0.3  # More than 30% duplicates
    
    def _calculate_bearing(self, point1: Dict, point2: Dict) -> float:
        """Calculate bearing between two points"""
        lat1, lon1 = math.radians(point1['lat']), math.radians(point1['lon'])
        lat2, lon2 = math.radians(point2['lat']), math.radians(point2['lon'])
        
        dlon = lon2 - lon1
        
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        
        bearing = math.atan2(x, y)
        return math.degrees(bearing) % 360
    
    def _calculate_variance(self, values: List[float]) -> float:
        """Calculate variance of a list of values"""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        return sum((x - mean) ** 2 for x in values) / len(values)
    