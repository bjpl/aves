// CONCEPT: Preview modal showing how annotations will appear to students
// WHY: Allow admins to see the student experience before publishing annotations
// PATTERN: Modal with tabs for Learn and Practice views, rendering actual components

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ContextualFill } from '../exercises/ContextualFill';
import { VisualIdentification } from '../exercises/VisualIdentification';
import { ContextualFillExercise, Exercise } from '../../../../shared/types/exercise.types';

interface Annotation {
  id: string;
  imageUrl: string;
  spanishTerm: string;
  englishTerm: string;
  type: string;
  species: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: 'rectangle' | 'polygon';
  };
  pronunciation?: string;
  difficultyLevel?: number;
}

interface AnnotationPreviewModalProps {
  annotation: Annotation;
  onClose: () => void;
}

export const AnnotationPreviewModal: React.FC<AnnotationPreviewModalProps> = ({
  annotation,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'learn' | 'fill-blank' | 'multiple-choice'>('learn');
  const [exerciseDisabled, setExerciseDisabled] = useState(false);

  // Generate sample fill-in-the-blank exercise
  const sampleFillBlankExercise: ContextualFillExercise = {
    id: 'preview-fill-blank',
    type: 'contextual_fill',
    difficultyLevel: annotation.difficultyLevel || 1,
    prompt: `Complete the sentence with the correct term for "${annotation.englishTerm}"`,
    instructions: 'Fill in the blank with the correct Spanish term',
    sentence: `El ${annotation.species.toLowerCase()} tiene ___ muy distintivo.`,
    correctAnswer: annotation.spanishTerm,
    options: [
      annotation.spanishTerm,
      'el pico', // Generic alternatives
      'las plumas',
      'las alas'
    ].slice(0, 4), // Ensure we have 4 unique options
    imageUrl: annotation.imageUrl,
    metadata: {
      annotationId: annotation.id,
      pronunciation: annotation.pronunciation,
    }
  };

  // Generate sample multiple-choice exercise
  const sampleMultipleChoiceExercise: Exercise = {
    id: 'preview-multiple-choice',
    type: 'visual_identification',
    difficultyLevel: annotation.difficultyLevel || 1,
    prompt: annotation.spanishTerm,
    imageUrl: annotation.imageUrl,
    correctAnswer: annotation.type,
    metadata: {
      annotationId: annotation.id,
      pronunciation: annotation.pronunciation,
      bird: annotation.species.toLowerCase(),
      targetPart: annotation.type,
      tip: `The ${annotation.englishTerm} is a key feature of the ${annotation.species}.`
    }
  };

  const handleExerciseAnswer = (_answer: string) => {
    setExerciseDisabled(true);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Preview as Student"
      size="xl"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">
            Preview Mode
          </h3>
          <p className="text-sm text-blue-700">
            This shows exactly how students will see this annotation in different contexts.
            The annotation is <strong>not yet published</strong>.
          </p>
        </div>

        {/* Annotation Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <span className="text-xs font-medium text-gray-600">Spanish Term:</span>
            <p className="text-sm font-semibold text-gray-900">{annotation.spanishTerm}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-600">English Term:</span>
            <p className="text-sm font-semibold text-gray-900">{annotation.englishTerm}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-600">Type:</span>
            <p className="text-sm font-semibold text-gray-900">{annotation.type}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-600">Species:</span>
            <p className="text-sm font-semibold text-gray-900">{annotation.species}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4" aria-label="Preview Tabs">
            {['learn', 'fill-blank', 'multiple-choice'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab as 'learn' | 'fill-blank' | 'multiple-choice');
                  setExerciseDisabled(false);
                }}
                className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'learn' && 'Learn Page View'}
                {tab === 'fill-blank' && 'Fill-in-the-Blank'}
                {tab === 'multiple-choice' && 'Visual ID'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'learn' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Learn Page - Interactive Image</h3>
              <p className="text-sm text-gray-600 mb-4">
                Students will click on the highlighted area to discover this term.
              </p>

              <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                <div className="relative bg-gray-900">
                  <div className="relative w-full overflow-hidden" style={{ paddingTop: '75%' }}>
                    {/* Bird Image */}
                    <img
                      src={annotation.imageUrl}
                      alt={annotation.englishTerm}
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-contain"
                    />

                    {/* Bounding Box with Term Label (Learn Page Style) */}
                    {annotation.boundingBox && (() => {
                      const x = Math.max(0, Math.min(1, annotation.boundingBox.x));
                      const y = Math.max(0, Math.min(1, annotation.boundingBox.y));
                      const width = Math.min(annotation.boundingBox.width, 1 - x);
                      const height = Math.min(annotation.boundingBox.height, 1 - y);

                      return (
                        <div
                          className="absolute border-4 border-yellow-400 bg-yellow-400 bg-opacity-10 pointer-events-none animate-pulse"
                          style={{
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            width: `${width * 100}%`,
                            height: `${height * 100}%`,
                            boxShadow: 'inset 0 0 0 2px rgba(250, 204, 21, 0.6), 0 0 20px rgba(250, 204, 21, 0.4)',
                          }}
                        >
                          {/* Hoverable area indicator */}
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-md text-sm font-bold shadow-lg whitespace-nowrap">
                            {annotation.spanishTerm}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Term Info Card (appears after clicking) */}
              <div className="bg-white border-2 border-green-500 rounded-lg p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900">{annotation.spanishTerm}</h4>
                    <p className="text-sm text-gray-600">{annotation.englishTerm}</p>
                    {annotation.pronunciation && (
                      <p className="text-sm text-gray-500 italic mt-1">{annotation.pronunciation}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fill-blank' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Practice - Fill in the Blank</h3>
              <p className="text-sm text-gray-600 mb-4">
                Sample exercise showing how this annotation appears in practice mode.
              </p>

              <div className="border-2 border-gray-200 rounded-lg p-6 bg-white">
                <ContextualFill
                  exercise={sampleFillBlankExercise}
                  onAnswer={handleExerciseAnswer}
                  disabled={exerciseDisabled}
                />
              </div>
            </div>
          )}

          {activeTab === 'multiple-choice' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Practice - Visual Identification</h3>
              <p className="text-sm text-gray-600 mb-4">
                Sample exercise showing interactive visual identification.
              </p>

              <div className="border-2 border-gray-200 rounded-lg p-6 bg-white">
                <VisualIdentification
                  exercise={sampleMultipleChoiceExercise}
                  onAnswer={handleExerciseAnswer}
                  disabled={exerciseDisabled}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Switch between tabs to see all student views
          </div>
          <Button variant="primary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
};
