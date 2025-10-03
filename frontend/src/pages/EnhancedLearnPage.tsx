import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressSection } from '../components/learn/ProgressSection';
import { BirdSelector } from '../components/learn/BirdSelector';
import { InteractiveBirdImage } from '../components/learn/InteractiveBirdImage';
import { VocabularyPanel } from '../components/learn/VocabularyPanel';

// Rich bird learning data with multiple images and annotations
const birdLearningData = [
  {
    id: 'flamingo',
    name: 'Greater Flamingo',
    spanishName: 'Flamenco Común',
    imageUrl: 'https://images.unsplash.com/photo-1535821265819-8e7ff3c30737?w=800',
    annotations: [
      {
        id: 'f1',
        term: 'el pico curvado',
        english: 'curved beak',
        pronunciation: 'el PEE-koh koor-VAH-doh',
        x: 35, y: 25, // Position percentages
        description: 'Specialized for filter feeding'
      },
      {
        id: 'f2',
        term: 'las patas largas',
        english: 'long legs',
        pronunciation: 'lahs PAH-tahs LAHR-gahs',
        x: 45, y: 70,
        description: 'For wading in shallow water'
      },
      {
        id: 'f3',
        term: 'las plumas rosadas',
        english: 'pink feathers',
        pronunciation: 'lahs PLOO-mahs roh-SAH-dahs',
        x: 50, y: 45,
        description: 'Color comes from their diet'
      }
    ]
  },
  {
    id: 'eagle',
    name: 'Golden Eagle',
    spanishName: 'Águila Real',
    imageUrl: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800',
    annotations: [
      {
        id: 'e1',
        term: 'las garras afiladas',
        english: 'sharp talons',
        pronunciation: 'lahs GAH-rrahs ah-fee-LAH-dahs',
        x: 50, y: 75,
        description: 'Powerful for catching prey'
      },
      {
        id: 'e2',
        term: 'los ojos penetrantes',
        english: 'piercing eyes',
        pronunciation: 'lohs OH-hohs peh-neh-TRAHN-tehs',
        x: 40, y: 30,
        description: 'Incredible vision for hunting'
      },
      {
        id: 'e3',
        term: 'las alas extendidas',
        english: 'spread wings',
        pronunciation: 'lahs AH-lahs eks-tehn-DEE-dahs',
        x: 65, y: 50,
        description: 'Wingspan up to 2.3 meters'
      }
    ]
  },
  {
    id: 'hummingbird',
    name: 'Ruby-throated Hummingbird',
    spanishName: 'Colibrí Garganta de Rubí',
    imageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800',
    annotations: [
      {
        id: 'h1',
        term: 'el pico largo',
        english: 'long beak',
        pronunciation: 'el PEE-koh LAHR-goh',
        x: 25, y: 40,
        description: 'Perfect for reaching nectar'
      },
      {
        id: 'h2',
        term: 'las alas rápidas',
        english: 'rapid wings',
        pronunciation: 'lahs AH-lahs RAH-pee-dahs',
        x: 55, y: 45,
        description: 'Beat 80 times per second'
      },
      {
        id: 'h3',
        term: 'la garganta roja',
        english: 'red throat',
        pronunciation: 'lah gahr-GAHN-tah ROH-hah',
        x: 35, y: 35,
        description: 'Males have iridescent red throat'
      }
    ]
  },
  {
    id: 'peacock',
    name: 'Indian Peafowl',
    spanishName: 'Pavo Real',
    imageUrl: 'https://images.unsplash.com/photo-1512990641230-7e91cc31d0dc?w=800',
    annotations: [
      {
        id: 'p1',
        term: 'la cola desplegada',
        english: 'displayed tail',
        pronunciation: 'lah KOH-lah dehs-pleh-GAH-dah',
        x: 60, y: 50,
        description: 'Courtship display with eye spots'
      },
      {
        id: 'p2',
        term: 'la cresta azul',
        english: 'blue crest',
        pronunciation: 'lah KREHS-tah ah-SOOL',
        x: 30, y: 25,
        description: 'Crown of feathers on head'
      },
      {
        id: 'p3',
        term: 'el cuello iridiscente',
        english: 'iridescent neck',
        pronunciation: 'el KWEH-yoh ee-ree-dee-SEHN-teh',
        x: 35, y: 35,
        description: 'Shimmers with blue and green'
      }
    ]
  },
  {
    id: 'owl',
    name: 'Great Horned Owl',
    spanishName: 'Búho Cornudo',
    imageUrl: 'https://images.unsplash.com/photo-1557401751-376608588678?w=800',
    annotations: [
      {
        id: 'o1',
        term: 'los cuernos de plumas',
        english: 'feather horns',
        pronunciation: 'lohs KWEHR-nohs deh PLOO-mahs',
        x: 45, y: 20,
        description: 'Not real horns, just feather tufts'
      },
      {
        id: 'o2',
        term: 'los ojos grandes',
        english: 'large eyes',
        pronunciation: 'lohs OH-hohs GRAHN-dehs',
        x: 45, y: 35,
        description: 'Excellent night vision'
      },
      {
        id: 'o3',
        term: 'las garras fuertes',
        english: 'strong talons',
        pronunciation: 'lahs GAH-rrahs FWEHR-tehs',
        x: 45, y: 80,
        description: 'Grip strength of 300 PSI'
      }
    ]
  }
];

export const EnhancedLearnPage: React.FC = () => {
  const [selectedBird, setSelectedBird] = useState(birdLearningData[0]);
  const [discoveredTerms, setDiscoveredTerms] = useState<Set<string>>(new Set());
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);

  const handleAnnotationClick = (annotation: any) => {
    setSelectedAnnotation(annotation);
    setDiscoveredTerms(prev => new Set([...prev, annotation.id]));
  };

  const progress = (discoveredTerms.size / (birdLearningData.length * 3)) * 100;

  const handleBirdSelect = (bird: typeof birdLearningData[0]) => {
    setSelectedBird(bird);
    setSelectedAnnotation(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Interactive Bird Learning
          </h1>
          <p className="text-lg text-gray-600">
            Click on the highlighted areas to learn Spanish bird vocabulary
          </p>

          <ProgressSection
            progress={progress}
            discoveredCount={discoveredTerms.size}
            totalCount={birdLearningData.length * 3}
          />
        </div>

        <BirdSelector
          birds={birdLearningData}
          selectedBird={selectedBird}
          onBirdSelect={handleBirdSelect}
        />

        {/* Main Learning Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Image */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <InteractiveBirdImage
                imageUrl={selectedBird.imageUrl}
                altText={selectedBird.name}
                annotations={selectedBird.annotations}
                discoveredTerms={discoveredTerms}
                hoveredAnnotation={hoveredAnnotation}
                onAnnotationHover={setHoveredAnnotation}
                onAnnotationClick={handleAnnotationClick}
              />

              {/* Bird Info */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-bold text-gray-900">{selectedBird.spanishName}</h3>
                <p className="text-gray-600">{selectedBird.name}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Click the blue dots to discover vocabulary!
                </p>
              </div>
            </div>
          </div>

          {/* Vocabulary Details Panel */}
          <div className="lg:col-span-1">
            <VocabularyPanel
              selectedAnnotation={selectedAnnotation}
              birdAnnotations={selectedBird.annotations}
              birdName={selectedBird.spanishName}
              discoveredTerms={discoveredTerms}
            />
          </div>
        </div>

        {/* Achievement Banner */}
        {discoveredTerms.size > 0 && discoveredTerms.size % 5 === 0 && (
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg shadow-xl p-4 max-w-sm animate-bounce">
            <p className="font-bold text-lg mb-1">🎉 Milestone Reached!</p>
            <p className="text-sm">You've discovered {discoveredTerms.size} terms!</p>
            <Link
              to="/practice"
              className="inline-block mt-2 bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-blue-50 transition-colors"
            >
              Practice Now →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};