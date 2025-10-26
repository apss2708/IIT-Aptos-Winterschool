import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import logging
from typing import Dict, List, Tuple
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RewardOptimizer:
    def __init__(self):
        self.model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.feature_names = [
            'player_level', 'total_play_time', 'treasures_found',
            'success_rate', 'loyalty_days', 'social_engagement'
        ]
        
    def prepare_training_data(self, player_data: List[Dict]) -> Tuple[np.array, np.array]:
        """Prepare training data for reward optimization"""
        features = []
        targets = []
        
        for player in player_data:
            feature_vector = self._extract_features(player)
            target = self._extract_target(player)
            
            if feature_vector and target is not None:
                features.append(feature_vector)
                targets.append(target)
        
        return np.array(features), np.array(targets)
    
    def _extract_features(self, player: Dict) -> List[float]:
        """Extract features for reward prediction"""
        try:
            return [
                player.get('level', 1),
                player.get('total_play_time', 3600) / 3600,  # Hours
                player.get('treasures_found', 0),
                player.get('success_rate', 0.5),
                player.get('loyalty_days', 1) / 30,  # Months
                player.get('social_engagement', 0)  # 0-1 scale
            ]
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return []
    
    def _extract_target(self, player: Dict) -> float:
        """Extract target reward multiplier"""
        try:
            # Calculate optimal reward multiplier based on engagement and performance
            base_multiplier = 1.0
            
            # Level bonus
            level_bonus = player.get('level', 1) * 0.05
            
            # Success rate bonus
            success_bonus = max(0, (player.get('success_rate', 0.5) - 0.5) * 0.5)
            
            # Loyalty bonus
            loyalty_bonus = min(0.3, player.get('loyalty_days', 1) / 100)
            
            # Social engagement bonus
            social_bonus = player.get('social_engagement', 0) * 0.2
            
            optimal_multiplier = base_multiplier + level_bonus + success_bonus + loyalty_bonus + social_bonus
            
            return max(0.5, min(2.0, optimal_multiplier))
            
        except Exception as e:
            logger.error(f"Error extracting target: {e}")
            return None
    
    def train(self, player_data: List[Dict], test_size: float = 0.2) -> Dict:
        """Train the reward optimization model"""
        logger.info("Preparing reward optimization training data...")
        X, y = self.prepare_training_data(player_data)
        
        if len(X) == 0:
            logger.warning("No training data available")
            return {"status": "no_data"}
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        logger.info(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples")
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        # Make predictions
        y_pred = self.model.predict(X_test)
        
        # Calculate errors
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Training completed - R² Score: {r2:.4f}, MAE: {mae:.4f}")
        
        return {
            "status": "success",
            "train_score": float(train_score),
            "test_score": float(test_score),
            "mae": float(mae),
            "r2_score": float(r2),
            "feature_importance": dict(zip(self.feature_names, self.model.feature_importances_))
        }
    
    def predict_reward_multiplier(self, player_data: Dict) -> float:
        """Predict optimal reward multiplier for player"""
        features = self._extract_features(player_data)
        if not features:
            return 1.0  # Default multiplier
        
        prediction = self.model.predict([features])[0]
        return max(0.5, min(2.0, prediction))
    
    def calculate_dynamic_reward(self, base_reward: float, player_data: Dict) -> float:
        """Calculate dynamic reward based on player profile"""
        multiplier = self.predict_reward_multiplier(player_data)
        return base_reward * multiplier
    
    def save_model(self, model_path: str):
        """Save trained model"""
        joblib.dump(self.model, model_path)
        logger.info(f"Model saved to {model_path}")
    
    def load_model(self, model_path: str):
        """Load trained model"""
        self.model = joblib.load(model_path)
        logger.info("Model loaded successfully")

def main():
    # Generate sample training data
    sample_data = []
    for i in range(1000):
        player = {
            'level': np.random.randint(1, 11),
            'total_play_time': np.random.uniform(3600, 360000),  # 1-100 hours
            'treasures_found': np.random.randint(0, 50),
            'success_rate': np.random.uniform(0.3, 0.9),
            'loyalty_days': np.random.randint(1, 365),
            'social_engagement': np.random.uniform(0, 1)
        }
        sample_data.append(player)
    
    # Train model
    optimizer = RewardOptimizer()
    results = optimizer.train(sample_data)
    
    print("Training results:", json.dumps(results, indent=2))
    
    # Save model
    optimizer.save_model('reward_optimizer.pkl')
    
    # Test prediction
    test_player = {
        'level': 7,
        'total_play_time': 72000,  # 20 hours
        'treasures_found': 25,
        'success_rate': 0.8,
        'loyalty_days': 90,
        'social_engagement': 0.7
    }
    
    multiplier = optimizer.predict_reward_multiplier(test_player)
    base_reward = 1000
    dynamic_reward = optimizer.calculate_dynamic_reward(base_reward, test_player)
    
    print(f"Predicted multiplier: {multiplier:.2f}x")
    print(f"Base reward: {base_reward}, Dynamic reward: {dynamic_reward:.0f}")

if __name__ == "__main__":
    main()