import tensorflow as tf
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import Dict, List, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PersonalizationModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'player_level', 'success_rate', 'avg_solving_time', 'hint_usage_rate',
            'exploration_thoroughness', 'preferred_difficulty', 'play_frequency',
            'session_length', 'collaboration_level', 'achievement_focus'
        ]
    
    def create_model(self, input_dim: int) -> tf.keras.Model:
        """Create neural network model for personalization"""
        
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(64, activation='relu', input_shape=(input_dim,)),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(16, activation='relu'),
            tf.keras.layers.Dense(3, activation='sigmoid')  # [difficulty, engagement, reward_preference]
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def prepare_data(self, player_data: List[Dict]) -> tuple:
        """Prepare training data from player behavior"""
        
        features = []
        targets = []
        
        for player in player_data:
            feature_vector = self._extract_features(player)
            target_vector = self._extract_targets(player)
            
            if feature_vector and target_vector:
                features.append(feature_vector)
                targets.append(target_vector)
        
        return np.array(features), np.array(targets)
    
    def _extract_features(self, player: Dict) -> List[float]:
        """Extract features from player data"""
        try:
            features = [
                player.get('level', 1),
                player.get('success_rate', 0.5),
                player.get('avg_solving_time', 180) / 300,  # Normalize
                player.get('hint_usage_rate', 0.3),
                player.get('exploration_thoroughness', 0.5),
                player.get('preferred_difficulty', 0.5),
                player.get('play_frequency', 0.3),
                player.get('session_length', 900) / 3600,  # Normalize to hours
                player.get('collaboration_level', 0.2),
                player.get('achievement_focus', 0.5)
            ]
            return features
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return []
    
    def _extract_targets(self, player: Dict) -> List[float]:
        """Extract target values from player data"""
        try:
            # These would be based on player's actual preferences and performance
            return [
                player.get('optimal_difficulty', 0.5),
                player.get('engagement_level', 0.7),
                player.get('reward_preference', 0.6)
            ]
        except Exception as e:
            logger.error(f"Error extracting targets: {e}")
            return []
    
    def train(self, player_data: List[Dict], epochs: int = 100) -> Dict:
        """Train the personalization model"""
        
        logger.info("Preparing training data...")
        X, y = self.prepare_data(player_data)
        
        if len(X) == 0:
            logger.warning("No training data available")
            return {"status": "no_data"}
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Create and train model
        self.model = self.create_model(X_train.shape[1])
        
        logger.info("Training model...")
        history = self.model.fit(
            X_train_scaled, y_train,
            epochs=epochs,
            batch_size=32,
            validation_data=(X_test_scaled, y_test),
            verbose=1
        )
        
        # Evaluate model
        test_loss, test_mae = self.model.evaluate(X_test_scaled, y_test, verbose=0)
        
        logger.info(f"Training completed. Test MAE: {test_mae:.4f}")
        
        return {
            "status": "success",
            "test_loss": test_loss,
            "test_mae": test_mae,
            "training_samples": len(X_train),
            "test_samples": len(X_test)
        }
    
    def predict(self, player_data: Dict) -> Dict[str, float]:
        """Predict personalization for a player"""
        
        if self.model is None:
            logger.warning("Model not trained, returning defaults")
            return self._get_default_predictions()
        
        features = self._extract_features(player_data)
        if not features:
            return self._get_default_predictions()
        
        # Scale features and predict
        features_scaled = self.scaler.transform([features])
        predictions = self.model.predict(features_scaled, verbose=0)[0]
        
        return {
            "optimal_difficulty": float(predictions[0]),
            "engagement_factor": float(predictions[1]),
            "reward_multiplier": float(predictions[2])
        }
    
    def _get_default_predictions(self) -> Dict[str, float]:
        """Get default predictions when model is unavailable"""
        return {
            "optimal_difficulty": 0.5,
            "engagement_factor": 0.7,
            "reward_multiplier": 1.0
        }
    
    def save_model(self, model_path: str, scaler_path: str):
        """Save trained model and scaler"""
        if self.model:
            self.model.save(model_path)
            joblib.dump(self.scaler, scaler_path)
            logger.info(f"Model saved to {model_path}")
    
    def load_model(self, model_path: str, scaler_path: str):
        """Load trained model and scaler"""
        self.model = tf.keras.models.load_model(model_path)
        self.scaler = joblib.load(scaler_path)
        logger.info("Model loaded successfully")

# Example training script
def main():
    # Generate sample data for demonstration
    sample_data = []
    for i in range(1000):
        player = {
            'level': np.random.randint(1, 11),
            'success_rate': np.random.uniform(0.3, 0.9),
            'avg_solving_time': np.random.uniform(60, 600),
            'hint_usage_rate': np.random.uniform(0.1, 0.8),
            'exploration_thoroughness': np.random.uniform(0.2, 0.9),
            'preferred_difficulty': np.random.uniform(0.3, 0.8),
            'play_frequency': np.random.uniform(0.1, 1.0),
            'session_length': np.random.uniform(300, 3600),
            'collaboration_level': np.random.uniform(0.0, 0.5),
            'achievement_focus': np.random.uniform(0.3, 0.9),
            'optimal_difficulty': np.random.uniform(0.4, 0.8),
            'engagement_level': np.random.uniform(0.5, 0.9),
            'reward_preference': np.random.uniform(0.4, 0.8)
        }
        sample_data.append(player)
    
    # Train model
    model = PersonalizationModel()
    results = model.train(sample_data, epochs=50)
    
    print("Training results:", results)
    
    # Save model
    model.save_model('personalization_model.h5', 'scaler.pkl')
    
    # Test prediction
    test_player = {
        'level': 5,
        'success_rate': 0.7,
        'avg_solving_time': 240,
        'hint_usage_rate': 0.2,
        'exploration_thoroughness': 0.8,
        'preferred_difficulty': 0.6,
        'play_frequency': 0.5,
        'session_length': 1200,
        'collaboration_level': 0.3,
        'achievement_focus': 0.7
    }
    
    prediction = model.predict(test_player)
    print("Prediction for test player:", prediction)

if __name__ == "__main__":
    main()