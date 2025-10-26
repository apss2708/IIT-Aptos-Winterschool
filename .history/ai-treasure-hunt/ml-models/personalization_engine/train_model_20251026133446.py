import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import logging
from typing import Dict, List, Tuple
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BehaviorAnalysisModel:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.feature_names = [
            'solving_time_std', 'success_rate', 'movement_efficiency',
            'hint_usage', 'session_consistency', 'device_changes',
            'location_accuracy', 'social_interactions', 'play_frequency'
        ]
        
    def prepare_training_data(self, player_data: List[Dict], labels: List[int]) -> Tuple[np.array, np.array]:
        """Prepare training data for behavior classification"""
        
        features = []
        valid_labels = []
        
        for i, player in enumerate(player_data):
            feature_vector = self._extract_features(player)
            if feature_vector and i < len(labels):
                features.append(feature_vector)
                valid_labels.append(labels[i])
        
        return np.array(features), np.array(valid_labels)
    
    def _extract_features(self, player: Dict) -> List[float]:
        """Extract behavior features from player data"""
        try:
            return [
                player.get('solving_time_std', 60),
                player.get('success_rate', 0.5),
                player.get('movement_efficiency', 0.5),
                player.get('hint_usage_rate', 0.3),
                player.get('session_consistency', 0.6),
                player.get('device_changes', 0),
                player.get('location_accuracy_avg', 0.7),
                player.get('social_interaction_count', 0) / 10,  # Normalize
                player.get('play_frequency', 0.5)
            ]
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return []
    
    def train(self, player_data: List[Dict], labels: List[int], test_size: float = 0.2) -> Dict:
        """Train the behavior analysis model"""
        
        logger.info("Preparing behavior analysis training data...")
        X, y = self.prepare_training_data(player_data, labels)
        
        if len(X) == 0:
            logger.warning("No training data available")
            return {"status": "no_data"}
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        logger.info(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples")
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        # Make predictions
        y_pred = self.model.predict(X_test)
        
        # Generate classification report
        class_report = classification_report(y_test, y_pred, output_dict=True)
        conf_matrix = confusion_matrix(y_test, y_pred).tolist()
        
        logger.info(f"Training completed - Train Score: {train_score:.4f}, Test Score: {test_score:.4f}")
        
        return {
            "status": "success",
            "train_score": float(train_score),
            "test_score": float(test_score),
            "classification_report": class_report,
            "confusion_matrix": conf_matrix,
            "feature_importance": dict(zip(self.feature_names, self.model.feature_importances_))
        }
    
    def predict_behavior_risk(self, player_data: Dict) -> Dict:
        """Predict behavior risk level for player"""
        
        features = self._extract_features(player_data)
        if not features:
            return {
                "risk_level": "unknown",
                "confidence": 0.0,
                "probability": 0.5
            }
        
        # Get prediction probabilities
        probabilities = self.model.predict_proba([features])[0]
        prediction = self.model.predict([features])[0]
        
        risk_levels = {0: "low", 1: "medium", 2: "high"}
        risk_level = risk_levels.get(prediction, "unknown")
        
        return {
            "risk_level": risk_level,
            "confidence": float(max(probabilities)),
            "probability": float(probabilities[2] if len(probabilities) > 2 else 0.5),
            "feature_contributions": self._analyze_feature_contributions(features)
        }
    
    def _analyze_feature_contributions(self, features: List[float]) -> Dict:
        """Analyze how each feature contributes to the prediction"""
        
        contributions = {}
        for i, feature_name in enumerate(self.feature_names):
            if i < len(features):
                contributions[feature_name] = {
                    "value": features[i],
                    "importance": self.model.feature_importances_[i] if i < len(self.model.feature_importances_) else 0
                }
        
        return contributions
    
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
    sample_labels = []
    
    for i in range(1000):
        # Generate normal players (label 0)
        if i < 700:
            player = {
                'solving_time_std': np.random.uniform(30, 120),
                'success_rate': np.random.uniform(0.4, 0.8),
                'movement_efficiency': np.random.uniform(0.3, 0.7),
                'hint_usage_rate': np.random.uniform(0.2, 0.6),
                'session_consistency': np.random.uniform(0.5, 0.9),
                'device_changes': np.random.randint(0, 3),
                'location_accuracy_avg': np.random.uniform(0.6, 0.95),
                'social_interaction_count': np.random.randint(0, 20),
                'play_frequency': np.random.uniform(0.3, 0.8)
            }
            sample_data.append(player)
            sample_labels.append(0)
        
        # Generate suspicious players (label 1)
        elif i < 900:
            player = {
                'solving_time_std': np.random.uniform(5, 30),
                'success_rate': np.random.uniform(0.8, 1.0),
                'movement_efficiency': np.random.uniform(0.8, 1.0),
                'hint_usage_rate': np.random.uniform(0.0, 0.2),
                'session_consistency': np.random.uniform(0.9, 1.0),
                'device_changes': np.random.randint(3, 10),
                'location_accuracy_avg': np.random.uniform(0.95, 1.0),
                'social_interaction_count': np.random.randint(0, 5),
                'play_frequency': np.random.uniform(0.8, 1.0)
            }
            sample_data.append(player)
            sample_labels.append(1)
        
        # Generate cheating players (label 2)
        else:
            player = {
                'solving_time_std': np.random.uniform(1, 10),
                'success_rate': 1.0,
                'movement_efficiency': 1.0,
                'hint_usage_rate': 0.0,
                'session_consistency': 1.0,
                'device_changes': np.random.randint(5, 15),
                'location_accuracy_avg': 1.0,
                'social_interaction_count': 0,
                'play_frequency': 1.0
            }
            sample_data.append(player)
            sample_labels.append(2)
    
    # Train model
    model = BehaviorAnalysisModel()
    results = model.train(sample_data, sample_labels)
    
    print("Training results:", json.dumps(results, indent=2))
    
    # Save model
    model.save_model('behavior_analysis_model.pkl')
    
    # Test prediction
    test_player = {
        'solving_time_std': 10,
        'success_rate': 0.95,
        'movement_efficiency': 0.98,
        'hint_usage_rate': 0.05,
        'session_consistency': 0.99,
        'device_changes': 8,
        'location_accuracy_avg': 0.99,
        'social_interaction_count': 2,
        'play_frequency': 0.95
    }
    
    prediction = model.predict_behavior_risk(test_player)
    print("Prediction for test player:", json.dumps(prediction, indent=2))

if __name__ == "__main__":
    main()