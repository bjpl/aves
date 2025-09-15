import React, { useState } from 'react';
import { AnnotationCanvas } from '../components/annotation/AnnotationCanvas';
// import { DisclosurePopover } from '../components/vocabulary/DisclosurePopover';
import { Annotation } from '../../../shared/types/annotation.types';
// import { VocabularyDisclosure, DisclosureLevel } from '../../../shared/types/vocabulary.types';
// import { useDisclosure } from '../hooks/useDisclosure';

// Sample data - in production this would come from API
const sampleAnnotations: Annotation[] = [
  {
    id: '1',
    imageId: 'sample-1',
    boundingBox: {
      topLeft: { x: 150, y: 100 },
      bottomRight: { x: 250, y: 150 },
      width: 100,
      height: 50
    },
    type: 'anatomical',
    spanishTerm: 'pico',
    englishTerm: 'beak',
    pronunciation: 'PEE-koh',
    difficultyLevel: 1,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    imageId: 'sample-1',
    boundingBox: {
      topLeft: { x: 200, y: 150 },
      bottomRight: { x: 280, y: 200 },
      width: 80,
      height: 50
    },
    type: 'color',
    spanishTerm: 'plumas rojas',
    englishTerm: 'red feathers',
    pronunciation: 'PLOO-mahs ROH-hahs',
    difficultyLevel: 2,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const LearnPage: React.FC = () => {
  const [annotations] = useState<Annotation[]>(sampleAnnotations);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [showPopover, setShowPopover] = useState(false);

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setShowPopover(true);
    // Position popover near the annotation
    setPopoverPosition({ x: 300, y: 200 });
  };

  const handleAnnotationHover = (annotation: Annotation | null) => {
    if (annotation && !showPopover) {
      console.log('Hovering:', annotation.spanishTerm);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Interactive Learning
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-semibold mb-4">
                Click on highlighted areas to learn vocabulary
              </h2>
              <AnnotationCanvas
                imageUrl="https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800"
                annotations={annotations}
                onAnnotationHover={handleAnnotationHover}
                onAnnotationClick={handleAnnotationClick}
                interactive={true}
                showLabels={false}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Vocabulary</h2>
              {selectedAnnotation ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedAnnotation.spanishTerm}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedAnnotation.pronunciation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">English:</p>
                    <p className="text-base font-medium">
                      {selectedAnnotation.englishTerm}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  Select an annotation to see details
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
              <h2 className="text-xl font-semibold mb-4">Progress</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Terms Discovered</span>
                    <span>2/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};