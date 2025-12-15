import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProgressSection } from '../components/learn/ProgressSection';
import { BirdSelector } from '../components/learn/BirdSelector';
import { InteractiveBirdImage } from '../components/learn/InteractiveBirdImage';
import { VocabularyPanel } from '../components/learn/VocabularyPanel';
import { LearningPathSelector } from '../components/learn/LearningPathSelector';
import { ReviewScheduleCard } from '../components/srs/ReviewScheduleCard';
import { useLearnContent, useLearningModules, LearningModule } from '../hooks/useLearnContent';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';

// Fallback bird learning data for when API is unavailable
const fallbackBirdLearningData = [
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
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleIdFromUrl = searchParams.get('moduleId') || undefined;

  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>(moduleIdFromUrl);
  const [selectedBirdIndex, setSelectedBirdIndex] = useState(0);
  const [discoveredTerms, setDiscoveredTerms] = useState<Set<string>>(new Set());
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);

  // Fetch content with optional module filter
  // Request up to 500 annotations to ensure we get all content
  const { data: apiContent = [], isLoading, error } = useLearnContent({
    moduleId: selectedModuleId,
    limit: 500
  });

  const { data: modules = [] } = useLearningModules();
  const {
    markDiscovered,
    dueCount,
    upcomingReviews,
    nextReviewDate,
    isLoading: srsLoading
  } = useSpacedRepetition();

  // Transform API content into bird learning format
  const birdLearningData = useMemo(() => {
    if (!apiContent.length) return fallbackBirdLearningData;

    // Group content by imageUrl
    const contentByImage = apiContent.reduce((acc, item) => {
      if (!acc[item.imageUrl]) {
        acc[item.imageUrl] = {
          id: item.imageId,
          name: item.speciesName || 'Bird Species',
          spanishName: item.speciesName || 'Ave',
          imageUrl: item.imageUrl,
          annotations: []
        };
      }

      // Transform LearningContent to annotation format
      // Handle two bounding box formats:
      // - New format: { topLeft: {x,y}, bottomRight: {x,y}, width, height }
      // - Old format: { x, y, width, height }
      // Convert normalized coords (0-1) to percentages (0-100) for UI display
      if (!item.boundingBox || typeof item.boundingBox.width !== 'number' || typeof item.boundingBox.height !== 'number') {
        return acc;
      }

      // Extract coordinates based on format
      let startX: number, startY: number;
      if (item.boundingBox.topLeft && typeof item.boundingBox.topLeft.x === 'number') {
        // New nested format
        startX = item.boundingBox.topLeft.x;
        startY = item.boundingBox.topLeft.y;
      } else if (typeof item.boundingBox.x === 'number') {
        // Old flat format
        startX = item.boundingBox.x;
        startY = item.boundingBox.y;
      } else {
        // No valid coordinates
        return acc;
      }

      const centerX = (startX + (item.boundingBox.width / 2)) * 100;
      const centerY = (startY + (item.boundingBox.height / 2)) * 100;

      acc[item.imageUrl].annotations.push({
        id: item.id,
        term: item.spanishTerm,
        english: item.englishTerm,
        pronunciation: item.pronunciation || '',
        x: centerX, // Center of bounding box, as percentage
        y: centerY,
        description: `${item.type} feature`
      });

      return acc;
    }, {} as Record<string, any>);

    return Object.values(contentByImage);
  }, [apiContent]);

  const selectedBird = birdLearningData[selectedBirdIndex] || fallbackBirdLearningData[0];

  // Sync URL params with selected module
  useEffect(() => {
    if (selectedModuleId) {
      setSearchParams({ moduleId: selectedModuleId });
    } else {
      setSearchParams({});
    }
  }, [selectedModuleId, setSearchParams]);

  const handleAnnotationClick = async (annotation: any) => {
    setSelectedAnnotation(annotation);
    setDiscoveredTerms(prev => new Set([...prev, annotation.id]));

    // Track discovered term in SRS if user is authenticated
    try {
      await markDiscovered(annotation.id);
    } catch (err) {
      // Silently fail if not authenticated or network error
      console.log('Could not track discovered term:', err);
    }
  };

  const totalTerms = birdLearningData.reduce((sum, bird) => sum + bird.annotations.length, 0);
  const progress = totalTerms > 0 ? (discoveredTerms.size / totalTerms) * 100 : 0;

  const handleBirdSelect = (bird: typeof birdLearningData[0]) => {
    const index = birdLearningData.findIndex(b => b.id === bird.id);
    setSelectedBirdIndex(index >= 0 ? index : 0);
    setSelectedAnnotation(null);
  };

  const handleModuleSelect = (module: LearningModule) => {
    setSelectedModuleId(module.id);
    setSelectedBirdIndex(0);
    setDiscoveredTerms(new Set());
    setSelectedAnnotation(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !birdLearningData.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Content</h2>
            <p className="text-gray-600 mb-4">We couldn't load the learning content. Please try again later.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            totalCount={totalTerms}
          />

          {/* Review Schedule Section */}
          <div className="mt-6">
            <ReviewScheduleCard
              dueCount={dueCount}
              upcomingReviews={upcomingReviews}
              nextReviewDate={nextReviewDate}
              isLoading={srsLoading}
            />
          </div>
        </div>

        {/* Learning Path Selector */}
        {modules.length > 0 && (
          <div className="mb-6">
            <LearningPathSelector
              selectedModuleId={selectedModuleId}
              onModuleSelect={handleModuleSelect}
              userProgress={{}}
            />
          </div>
        )}

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