import React from 'react';
import { ExerciseContainer } from '../components/exercises/ExerciseContainer';
import { Annotation } from '../../../shared/types/annotation.types';

// Sample annotations for exercises - in production from API
const sampleAnnotations: Annotation[] = [
  {
    id: '1',
    imageId: 'img1',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'pico',
    englishTerm: 'beak',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    imageId: 'img2',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'ala',
    englishTerm: 'wing',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    imageId: 'img3',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'color',
    spanishTerm: 'plumas',
    englishTerm: 'feathers',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    imageId: 'img4',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'cola',
    englishTerm: 'tail',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const PracticePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Practice Exercises
        </h1>
        <p className="text-gray-600 mb-8">
          Test your Spanish bird vocabulary knowledge
        </p>

        <ExerciseContainer
          annotations={sampleAnnotations}
          onComplete={(progress) => {
            console.log('Session complete:', progress);
          }}
        />
      </div>
    </div>
  );
};