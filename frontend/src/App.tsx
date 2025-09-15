import React, { useState, useEffect } from 'react';
import { AnnotationCanvas } from './components/annotation/AnnotationCanvas';
import { DisclosurePopover } from './components/vocabulary/DisclosurePopover';
import { Annotation } from '../../shared/types/annotation.types';
import { VocabularyDisclosure, DisclosureLevel } from '../../shared/types/vocabulary.types';
import { useDisclosure } from './hooks/useDisclosure';
import './App.css';

function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  // Sample data for demonstration
  useEffect(() => {
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

    setAnnotations(sampleAnnotations);
  }, []);

  const handleAnnotationHover = (annotation: Annotation | null) => {
    if (annotation) {
      console.log('Hovering:', annotation.spanishTerm);
    }
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🦅 Aves - Visual Spanish Bird Learning
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Interactive Bird Image</h2>
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
              <h2 className="text-xl font-semibold mb-4">Vocabulary Details</h2>
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
                  <div>
                    <p className="text-sm text-gray-600">Type:</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${selectedAnnotation.type === 'anatomical' ? 'bg-blue-100 text-blue-800' : ''}
                      ${selectedAnnotation.type === 'behavioral' ? 'bg-green-100 text-green-800' : ''}
                      ${selectedAnnotation.type === 'color' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${selectedAnnotation.type === 'pattern' ? 'bg-purple-100 text-purple-800' : ''}
                    `}>
                      {selectedAnnotation.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Difficulty:</p>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-lg ${
                            i < selectedAnnotation.difficultyLevel
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  Hover over or click on highlighted areas in the image to learn vocabulary.
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
              <h2 className="text-xl font-semibold mb-4">Learning Progress</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Anatomical Terms</span>
                    <span>2/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Colors & Patterns</span>
                    <span>1/8</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '12.5%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Behaviors</span>
                    <span>0/5</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;