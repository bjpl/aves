import React from 'react';
import { ExerciseContainer } from '../components/exercises/ExerciseContainer';
import { Annotation } from '../../../shared/types/annotation.types';

// Rich educational content following pedagogical best practices
const sampleAnnotations: Annotation[] = [
  // BEGINNER LEVEL - Recognition & Basic Vocabulary
  {
    id: '1',
    imageId: 'flamingo',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'el pico',
    englishTerm: 'beak',
    pronunciation: 'el PEE-koh',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    imageId: 'flamingo',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'las patas',
    englishTerm: 'legs',
    pronunciation: 'lahs PAH-tahs',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    imageId: 'sparrow',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'las alas',
    englishTerm: 'wings',
    pronunciation: 'lahs AH-lahs',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    imageId: 'eagle',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'los ojos',
    englishTerm: 'eyes',
    pronunciation: 'lohs OH-hohs',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    imageId: 'stork',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'habitat',
    spanishTerm: 'el nido',
    englishTerm: 'nest',
    pronunciation: 'el NEE-doh',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // INTERMEDIATE LEVEL - Descriptive & Contextual
  {
    id: '6',
    imageId: 'flamingo',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'color',
    spanishTerm: 'las plumas rosadas',
    englishTerm: 'pink feathers',
    pronunciation: 'lahs PLOO-mahs roh-SAH-dahs',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '7',
    imageId: 'eagle',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'las garras',
    englishTerm: 'talons',
    pronunciation: 'lahs GAH-rrahs',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '8',
    imageId: 'stork',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'el cuello largo',
    englishTerm: 'long neck',
    pronunciation: 'el KWEH-yoh LAHR-goh',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '9',
    imageId: 'cardinal',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'anatomical',
    spanishTerm: 'la cresta roja',
    englishTerm: 'red crest',
    pronunciation: 'lah KREHS-tah ROH-hah',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '10',
    imageId: 'owl',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'behavior',
    spanishTerm: 'caza de noche',
    englishTerm: 'hunts at night',
    pronunciation: 'KAH-sah deh NOH-cheh',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // ADVANCED LEVEL - Complex Phrases & Cultural
  {
    id: '11',
    imageId: 'peacock',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'behavior',
    spanishTerm: 'hacer la rueda',
    englishTerm: 'display tail feathers',
    pronunciation: 'ah-SEHR lah RWEH-dah',
    difficultyLevel: 3,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '12',
    imageId: 'migratory',
    boundingBox: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 }, width: 100, height: 100 },
    type: 'behavior',
    spanishTerm: 'migrar al sur',
    englishTerm: 'migrate south',
    pronunciation: 'mee-GRAHR ahl soor',
    difficultyLevel: 3,
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