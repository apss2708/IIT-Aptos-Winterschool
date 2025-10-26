import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import logging
from typing import Dict, List, Tuple
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DifficultyPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.feature_names = [
            'player_level', 'success_rate', 'avg_solving_time', 
            'hint_usage_rate', 'play_frequency', 'session_length'
        ]
        
    def prepare_training_data(self, player_data: List[Dict]) -> Tuple[np.array, np.array]:
        """Prepare training data from player behavior"""
        features = []
        targets = []
        
        for player in player_data:
            # Extract features
            feature_vector = self._extract_features(player)
            # Extract target (optimal difficulty)
            target = self._extract_target(player)
            
            if feature_vector and target is not None:
                features.append(feature_vector)
                targets.append(target)
        
        return np.array(features), np.array(targets)
    
    def _extract_features(self, player: Dict) -> List[float]:
        """Extract feature vector from player data"""
        try:
            return [
                player.get('level', 1),
                player.get('success_rate', 0.5),
                player.get('avg_solving_time', 180) / 300,  # Normalize
                player.get('hint_usage_rate', 0.3),
                player.get('play_frequency', 0.5),
                player.get('session_length', 900) / 1800,  # Normalize
            ]
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return []
    
    def _extract_target(self, player: Dict) -> float:
        """Extract target difficulty from player data"""
        # This would be based on player's actual performance and preferences
        try:
            # Calculate optimal difficulty based on performance
            success_rate = player.get('success_rate', 0.5)
            solving_time = player.get('avg_solving_time', 180)
            
            # Base difficulty on success rate (higher success = harder puzzles)
            base_difficulty = success_rate
            
            # Adjust based on solving time (faster solving = harder puzzles)
            time_factor = min(1.0, solving_time / 600)  # Normalize to 10 minutes
            difficulty_adjustment = (1 - time_factor) * 0.3
            
            optimal_difficulty = base_difficulty + difficulty_adjustment
            
            return max(0.1, min(0.9, optimal_difficulty))
            
        except Exception as e:
            logger.error(f"Error extracting target: {e}")
            return None
    
    def train(self, player_data: List[Dict], test_size: float = 0.2) -> Dict:
        """Train the difficulty prediction model"""
        logger.info("Preparing training data...")
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
        mse = mean_squared_error(y_test, y_pred)
        
        logger.info(f"Training completed - Train Score: {train_score:.4f}, Test Score: {test_score:.4f}")
        logger.info(f"MAE: {mae:.4f}, MSE: {mse:.4f}")
        
        return {
            "status": "success",
            "train_score": float(train_score),
            "test_score": float(test_score),
            "mae": float(mae),
            "mse": float(mse),
            "feature_importance": dict(zip(self.feature_names, self.model.feature_importances_))
        }
    
    def predict_difficulty(self, player_data: Dict) -> float:
        """Predict optimal difficulty for a player"""
        features = self._extract_features(player_data)
        if not features:
            return 0.5  # Default medium difficulty
        
        prediction = self.model.predict([features])[0]
        return max(0.1, min(0.9, prediction))
    
    def save_model(self, model_path: str):
        """Save trained model"""
        joblib.dump(self.model, model_path)
        logger.info(f"Model saved to {model_path}")
    
    def load_model(self, model_path: str):
        """Load trained model"""
        self.model = joblib.load(model_path)
        logger.info("Model loaded successfully")

# Example usage and training
def main():
    # Generate sample training data
    sample_data = []
    for i in range(1000):
        player = {
            'level': np.random.randint(1, 11),
            'success_rate': np.random.uniform(0.3, 0.9),
            'avg_solving_time': np.random.uniform(60, 600),
            'hint_usage_rate': np.random.uniform(0.1, 0.8),
            'play_frequency': np.random.uniform(0.1, 1.0),
            'session_length': np.random.uniform(300, 3600),
        }
        sample_data.append(player)
    
    # Train model
    predictor = DifficultyPredictor()
    results = predictor.train(sample_data)
    
    print("Training results:", json.dumps(results, indent=2))
    
    # Save model
    predictor.save_model('difficulty_predictor.pkl')
    
    # Test prediction
    test_player = {
        'level': 5,
        'success_rate': 0.7,
        'avg_solving_time': 240,
        'hint_usage_rate': 0.2,
        'play_frequency': 0.5,
        'session_length': 1200
    }
    
    predicted_difficulty = predictor.predict_difficulty(test_player)
    print(f"Predicted difficulty for test player: {predicted_difficulty:.2f}")

if __name__ == "__main__":
    main()
    