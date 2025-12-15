/**
 * LessonView Component
 *
 * Displays a single lesson with interactive annotation hotspots.
 * Features:
 * - Bird image with bounding box annotations
 * - Progressive disclosure (hover to highlight, click for details)
 * - Spanish/English terms with pronunciation
 * - User feedback buttons ("I know this" / "Still learning")
 * - Progress tracking through lesson
 */

import React, { useState, useCallback } from 'react';
import { LearningContent } from '../../hooks/useLearnContent';
import { AudioPlayer } from '../audio/AudioPlayer';

interface LessonViewProps {
  content: LearningContent[];
  onTermDiscovered?: (termId: string) => void;
  onLessonComplete?: () => void;
}

interface TermState {
  discovered: boolean;
  mastered: boolean;
}

export const LessonView: React.FC<LessonViewProps> = ({
  content,
  onTermDiscovered,
  onLessonComplete
}) => {
  const [termStates, setTermStates] = useState<Record<string, TermState>>({});
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<LearningContent | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get the main image URL (all content should be from same image)
  const imageUrl = content[0]?.imageUrl;
  const speciesName = content[0]?.speciesName;

  // Calculate progress
  const discoveredCount = Object.values(termStates).filter(s => s.discovered).length;
  const masteredCount = Object.values(termStates).filter(s => s.mastered).length;
  const totalCount = content.length;
  const progressPercent = totalCount > 0 ? (discoveredCount / totalCount) * 100 : 0;

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: LearningContent) => {
    setSelectedAnnotation(annotation);

    // Mark as discovered if first time
    if (!termStates[annotation.id]?.discovered) {
      setTermStates(prev => ({
        ...prev,
        [annotation.id]: { discovered: true, mastered: false }
      }));
      onTermDiscovered?.(annotation.id);
    }
  }, [termStates, onTermDiscovered]);

  // Handle "I know this" button
  const handleKnowTerm = useCallback(() => {
    if (!selectedAnnotation) return;

    setTermStates(prev => ({
      ...prev,
      [selectedAnnotation.id]: { discovered: true, mastered: true }
    }));

    // Move to next undiscovered term or close panel
    const nextTerm = content.find(item =>
      item.id !== selectedAnnotation.id && !termStates[item.id]?.discovered
    );

    if (nextTerm) {
      setSelectedAnnotation(nextTerm);
      setTermStates(prev => ({
        ...prev,
        [nextTerm.id]: { discovered: true, mastered: false }
      }));
      onTermDiscovered?.(nextTerm.id);
    } else {
      setSelectedAnnotation(null);
      // Check if lesson complete
      const allMastered = content.every(item =>
        termStates[item.id]?.mastered || item.id === selectedAnnotation.id
      );
      if (allMastered) {
        onLessonComplete?.();
      }
    }
  }, [selectedAnnotation, content, termStates, onTermDiscovered, onLessonComplete]);

  // Handle "Still learning" button
  const handleStillLearning = useCallback(() => {
    if (!selectedAnnotation) return;

    // Move to next term
    const currentIndex = content.findIndex(item => item.id === selectedAnnotation.id);
    const nextIndex = (currentIndex + 1) % content.length;
    const nextTerm = content[nextIndex];

    setSelectedAnnotation(nextTerm);

    if (!termStates[nextTerm.id]?.discovered) {
      setTermStates(prev => ({
        ...prev,
        [nextTerm.id]: { discovered: true, mastered: false }
      }));
      onTermDiscovered?.(nextTerm.id);
    }
  }, [selectedAnnotation, content, termStates, onTermDiscovered]);

  // Get annotation type color
  const getTypeColor = (type: LearningContent['type']) => {
    switch (type) {
      case 'anatomical': return 'bg-blue-500 border-blue-600';
      case 'behavioral': return 'bg-purple-500 border-purple-600';
      case 'color': return 'bg-yellow-500 border-yellow-600';
      case 'pattern': return 'bg-pink-500 border-pink-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  // Get annotation type label
  const getTypeLabel = (type: LearningContent['type']) => {
    switch (type) {
      case 'anatomical': return 'Anatomía';
      case 'behavioral': return 'Comportamiento';
      case 'color': return 'Color';
      case 'pattern': return 'Patrón';
      default: return type;
    }
  };

  if (!imageUrl || content.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No lesson content available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left side: Image with annotations */}
      <div className="flex-1">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {speciesName || 'Bird Anatomy Lesson'}
            </h3>
            <span className="text-sm text-gray-600">
              {discoveredCount} / {totalCount} discovered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{masteredCount} mastered</span>
            <span>{Math.round(progressPercent)}% complete</span>
          </div>
        </div>

        {/* Interactive image */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={speciesName || 'Bird'}
            className={`w-full h-auto transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              // Use a real bird image as fallback for better UX
              e.currentTarget.onerror = null; // Prevent infinite loop
              e.currentTarget.src = 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&h=600&fit=crop&q=80';
            }}
          />

          {/* Loading skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}

          {/* Annotation hotspots with bounding boxes */}
          {imageLoaded && content.map((annotation) => {
            const isDiscovered = termStates[annotation.id]?.discovered;
            const isMastered = termStates[annotation.id]?.mastered;
            const isHovered = hoveredAnnotation === annotation.id;
            const isSelected = selectedAnnotation?.id === annotation.id;

            // Handle both bounding box formats:
            // New format: { topLeft: {x, y}, width, height }
            // Old format: { x, y, width, height }
            const box = annotation.boundingBox;
            const boxX = box.topLeft?.x ?? (box as any).x ?? 0;
            const boxY = box.topLeft?.y ?? (box as any).y ?? 0;
            const boxWidth = box.width ?? 10;
            const boxHeight = box.height ?? 10;

            // Skip invalid bounding boxes
            if (boxWidth <= 0 || boxHeight <= 0) return null;

            // Convert normalized (0-1) to percentage (0-100) if needed
            const left = boxX <= 1 ? boxX * 100 : boxX;
            const top = boxY <= 1 ? boxY * 100 : boxY;
            const width = boxWidth <= 1 ? boxWidth * 100 : boxWidth;
            const height = boxHeight <= 1 ? boxHeight * 100 : boxHeight;

            return (
              <div
                key={annotation.id}
                className="absolute cursor-pointer transition-all duration-200"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
                onMouseEnter={() => setHoveredAnnotation(annotation.id)}
                onMouseLeave={() => setHoveredAnnotation(null)}
                onClick={() => handleAnnotationClick(annotation)}
              >
                {/* Bounding box highlight */}
                <div
                  className={`absolute inset-0 border-3 rounded transition-all duration-200 ${
                    isSelected
                      ? 'border-green-500 bg-green-500/20'
                      : isHovered
                      ? 'border-yellow-400 bg-yellow-400/20'
                      : isMastered
                      ? 'border-green-500/50 bg-green-500/10'
                      : isDiscovered
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-white/70 bg-white/10'
                  } ${!isMastered && !isDiscovered ? 'animate-pulse' : ''}`}
                />

                {/* Center dot indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isMastered
                        ? 'bg-green-500 border-green-600'
                        : isDiscovered
                        ? getTypeColor(annotation.type)
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {isMastered && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Hover tooltip */}
                {isHovered && !isSelected && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                      <div className="text-sm font-bold">{annotation.spanishTerm}</div>
                      <div className="text-xs opacity-90">{annotation.englishTerm}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                        <div className="border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Legend:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-600" />
              <span>Anatomical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-purple-600" />
              <span>Behavioral</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-yellow-600" />
              <span>Color</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-pink-500 border-2 border-pink-600" />
              <span>Pattern</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Details panel */}
      <div className="w-full lg:w-96">
        <div className="sticky top-4">
          {selectedAnnotation ? (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-500">
              {/* Type badge */}
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${
                  getTypeColor(selectedAnnotation.type).split(' ')[0]
                }`}>
                  {getTypeLabel(selectedAnnotation.type)}
                </span>
              </div>

              {/* Spanish term */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Español
                </label>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">
                  {selectedAnnotation.spanishTerm}
                </h3>
              </div>

              {/* Pronunciation with Audio */}
              {selectedAnnotation.pronunciation && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Pronunciation
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <AudioPlayer
                      text={selectedAnnotation.spanishTerm}
                      type="pronunciation"
                      size="medium"
                    />
                    <p className="text-lg text-blue-900 font-mono">
                      {selectedAnnotation.pronunciation}
                    </p>
                  </div>
                </div>
              )}

              {/* Audio button even without pronunciation text */}
              {!selectedAnnotation.pronunciation && (
                <div className="mb-4">
                  <AudioPlayer
                    text={selectedAnnotation.spanishTerm}
                    type="pronunciation"
                    size="medium"
                  />
                </div>
              )}

              {/* English translation */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  English
                </label>
                <p className="text-xl text-gray-700 mt-1">
                  {selectedAnnotation.englishTerm}
                </p>
              </div>

              {/* Difficulty indicator */}
              <div className="mb-6 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Difficulty:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`w-6 h-2 rounded ${
                        level <= selectedAnnotation.difficultyLevel
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleKnowTerm}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  I know this
                </button>

                <button
                  onClick={handleStillLearning}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Still learning
                </button>

                <button
                  onClick={() => setSelectedAnnotation(null)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>

              {/* Progress indicator */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Term {content.findIndex(c => c.id === selectedAnnotation.id) + 1} of {totalCount}</span>
                  <span className="font-semibold">
                    {termStates[selectedAnnotation.id]?.mastered ? 'Mastered' : 'Learning'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-300">
              <div className="text-center">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Click on a highlighted area
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Explore the bird's anatomy by clicking on the colored regions
                </p>
                <div className="text-xs text-gray-500">
                  <p className="mb-1">Hover to see quick info</p>
                  <p>Click to learn more</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
