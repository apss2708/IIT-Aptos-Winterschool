const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');

class AIQuestGeneratorService {
  constructor() {
    this.openaiApiKey = config.ai.openaiApiKey;
    this.baseURL = 'https://api.openai.com/v1';
  }

  // Generate quest using AI
  async generateQuest(parameters) {
    try {
      const {
        theme = 'adventure',
        difficulty = 'medium',
        location,
        numberOfTreasures = 5,
        estimatedTime = 60,
        customInstructions = ''
      } = parameters;

      if (!this.openaiApiKey) {
        return this.generateFallbackQuest(parameters);
      }

      const prompt = this.buildQuestPrompt({
        theme,
        difficulty,
        location,
        numberOfTreasures,
        estimatedTime,
        customInstructions
      });

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a creative quest designer for a location-based treasure hunt game. Create engaging, immersive quests with clear clues and interesting locations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const generatedContent = response.data.choices[0].message.content;
      return this.parseGeneratedQuest(generatedContent, parameters);

    } catch (error) {
      logger.error('AI quest generation error:', error);
      return this.generateFallbackQuest(parameters);
    }
  }

  // Build prompt for AI
  buildQuestPrompt(parameters) {
    const { theme, difficulty, location, numberOfTreasures, estimatedTime, customInstructions } = parameters;

    return `
Create a ${difficulty} difficulty treasure hunt quest with the following specifications:

THEME: ${theme}
LOCATION: ${location?.name || 'Urban area'}
NUMBER OF TREASURES: ${numberOfTreasures}
ESTIMATED COMPLETION TIME: ${estimatedTime} minutes
CUSTOM INSTRUCTIONS: ${customInstructions || 'None'}

Please provide the quest in the following JSON format:

{
  "title": "Creative quest title",
  "description": "Engaging quest description that sets the story",
  "difficulty": "${difficulty}",
  "estimatedTime": ${estimatedTime},
  "treasures": [
    {
      "name": "Treasure name",
      "description": "Description of what this treasure represents",
      "clue": "Creative and engaging clue that leads to the next location",
      "verificationType": "gps",
      "points": 10
    }
  ],
  "storyline": "Overall storyline that connects all treasures",
  "tags": ["tag1", "tag2", "tag3"]
}

Make the clues creative but solvable. For GPS-based treasures, ensure the clues reference real-world locations or landmarks that would be appropriate for the theme and location.
    `.trim();
  }

  // Parse AI-generated content
  parseGeneratedQuest(content, parameters) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const questData = JSON.parse(jsonMatch[0]);
        return this.enrichQuestWithLocations(questData, parameters);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (error) {
      logger.warn('Failed to parse AI-generated quest, using fallback:', error);
      return this.generateFallbackQuest(parameters);
    }
  }

  // Add location data to AI-generated quest
  enrichQuestWithLocations(questData, parameters) {
    const { location, numberOfTreasures } = parameters;
    
    if (!questData.treasures || !Array.isArray(questData.treasures)) {
      questData.treasures = [];
    }

    // Generate locations around the starting point
    questData.treasures = questData.treasures.map((treasure, index) => {
      const distance = this.calculateTreasureDistance(index, numberOfTreasures);
      const angle = (index / numberOfTreasures) * 2 * Math.PI;
      
      return {
        ...treasure,
        location: this.generateLocation(location, distance, angle),
        radius: this.getRadiusForDifficulty(parameters.difficulty),
        order: index + 1
      };
    });

    questData.startLocation = location;
    questData.radius = this.calculateQuestRadius(numberOfTreasures);

    return questData;
  }

  // Fallback quest generator
  generateFallbackQuest(parameters) {
    const { theme, difficulty, location, numberOfTreasures = 5 } = parameters;
    
    const themes = {
      adventure: {
        title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Expedition`,
        description: `Embark on an exciting ${theme} adventure to discover hidden treasures!`,
        treasures: [
          { name: 'Ancient Map', clue: 'Start your journey where knowledge is stored' },
          { name: 'Explorer\'s Compass', clue: 'Find direction where paths cross' },
          { name: 'Hidden Key', clue: 'Seek the oldest guardian of this place' },
          { name: 'Treasure Chest', clue: 'Your final reward awaits at the heart of the adventure' }
        ]
      },
      historical: {
        title: 'Historical Discovery Tour',
        description: 'Uncover the secrets of the past in this historical treasure hunt',
        treasures: [
          { name: 'Historical Document', clue: 'Where records of the past are kept' },
          { name: 'Time Capsule', clue: 'Find the marker of significant events' },
          { name: 'Ancient Artifact', clue: 'Look for the oldest structure around' }
        ]
      },
      nature: {
        title: 'Nature Explorer Quest',
        description: 'Connect with nature while hunting for ecological treasures',
        treasures: [
          { name: 'Seed of Life', clue: 'Where green things begin their journey' },
          { name: 'Water Source', clue: 'Find the life-giving element' },
          { name: 'Mountain View', clue: 'Seek the highest natural point' }
        ]
      }
    };

    const themeData = themes[theme] || themes.adventure;
    const treasures = themeData.treasures.slice(0, numberOfTreasures);

    return {
      title: themeData.title,
      description: themeData.description,
      difficulty,
      estimatedTime: parameters.estimatedTime || 60,
      treasures: treasures.map((treasure, index) => ({
        name: treasure.name,
        description: `A ${treasure.name.toLowerCase()} waiting to be discovered`,
        clue: treasure.clue,
        verificationType: 'gps',
        points: this.getPointsForDifficulty(difficulty),
        location: this.generateLocation(location, index * 100 + 50, (index / numberOfTreasures) * 2 * Math.PI),
        radius: this.getRadiusForDifficulty(difficulty),
        order: index + 1
      })),
      startLocation: location,
      radius: this.calculateQuestRadius(numberOfTreasures),
      tags: [theme, difficulty, 'generated']
    };
  }

  // Helper methods
  calculateTreasureDistance(index, total) {
    const baseDistance = 100; // meters
    return baseDistance + (index * 50);
  }

  calculateQuestRadius(treasureCount) {
    return treasureCount * 75; // meters
  }

  getRadiusForDifficulty(difficulty) {
    const radii = {
      easy: 75,
      medium: 50,
      hard: 25,
      expert: 15
    };
    return radii[difficulty] || 50;
  }

  getPointsForDifficulty(difficulty) {
    const points = {
      easy: 10,
      medium: 20,
      hard: 35,
      expert: 50
    };
    return points[difficulty] || 20;
  }

  generateLocation(center, distance, angle) {
    const earthRadius = 6371000; // meters
    const lat = center.latitude * Math.PI / 180;
    const lng = center.longitude * Math.PI / 180;

    const newLat = Math.asin(
      Math.sin(lat) * Math.cos(distance / earthRadius) +
      Math.cos(lat) * Math.sin(distance / earthRadius) * Math.cos(angle)
    );

    const newLng = lng + Math.atan2(
      Math.sin(angle) * Math.sin(distance / earthRadius) * Math.cos(lat),
      Math.cos(distance / earthRadius) - Math.sin(lat) * Math.sin(newLat)
    );

    return {
      latitude: newLat * 180 / Math.PI,
      longitude: newLng * 180 / Math.PI,
      name: 'Generated Location'
    };
  }
}

module.exports = new AIQuestGeneratorService();