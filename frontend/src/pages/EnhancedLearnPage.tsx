import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Learning Progress</span>
              <span>{Math.round(progress)}% ({discoveredTerms.size} / {birdLearningData.length * 3} terms)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bird Selection Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm">
            {birdLearningData.map(bird => (
              <button
                key={bird.id}
                onClick={() => {
                  setSelectedBird(bird);
                  setSelectedAnnotation(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedBird.id === bird.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="block text-xs opacity-75">{bird.name}</span>
                <span>{bird.spanishName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Learning Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Image */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="relative">
                <img
                  src={selectedBird.imageUrl}
                  alt={selectedBird.name}
                  className="w-full rounded-lg"
                />

                {/* Annotation Hotspots */}
                {selectedBird.annotations.map(annotation => (
                  <div
                    key={annotation.id}
                    className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                    onMouseEnter={() => setHoveredAnnotation(annotation.id)}
                    onMouseLeave={() => setHoveredAnnotation(null)}
                    onClick={() => handleAnnotationClick(annotation)}
                  >
                    {/* Pulsing dot */}
                    <div className={`relative ${discoveredTerms.has(annotation.id) ? '' : 'animate-pulse'}`}>
                      <div className={`w-8 h-8 rounded-full border-3 ${
                        discoveredTerms.has(annotation.id)
                          ? 'bg-green-500 border-green-600'
                          : 'bg-blue-500 border-blue-600'
                      } opacity-75`} />
                      {discoveredTerms.has(annotation.id) && (
                        <svg className="absolute inset-0 w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {/* Hover tooltip */}
                    {hoveredAnnotation === annotation.id && (
                      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg whitespace-nowrap z-10">
                        <div className="text-sm font-bold">{annotation.term}</div>
                        <div className="text-xs opacity-90">{annotation.english}</div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                          <div className="border-8 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

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
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Vocabulary Details</h2>

              {selectedAnnotation ? (
                <div className="space-y-4">
                  {/* Spanish Term */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedAnnotation.term}
                    </h3>
                    <p className="text-sm text-gray-500 italic mt-1">
                      {selectedAnnotation.pronunciation}
                    </p>
                  </div>

                  {/* English Translation */}
                  <div>
                    <p className="text-sm text-gray-600">English:</p>
                    <p className="text-lg font-medium">{selectedAnnotation.english}</p>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-sm text-gray-600">Description:</p>
                    <p className="text-sm text-gray-700">{selectedAnnotation.description}</p>
                  </div>

                  {/* Practice Button */}
                  <Link
                    to="/practice"
                    className="block w-full text-center bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Practice This Term
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <p>Click on a highlighted area to see details</p>
                </div>
              )}

              {/* Discovered Terms List */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Terms for {selectedBird.spanishName}:</h3>
                <div className="space-y-2">
                  {selectedBird.annotations.map(ann => (
                    <div
                      key={ann.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        discoveredTerms.has(ann.id)
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span className="text-sm">{ann.term}</span>
                      {discoveredTerms.has(ann.id) && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
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