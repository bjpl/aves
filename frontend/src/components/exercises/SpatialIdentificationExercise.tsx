// CONCEPT: Identify bird anatomy parts on annotated images
// WHY: Connects Spanish vocabulary with visual bird anatomy
// PATTERN: Click-on-image exercise with hotspots

import React, { useState, useCallback } from 'react';
import { audioService } from '../../services/audioService';
import type { ExerciseResultCallback } from '../../types';

interface AnatomyPoint {
  id: string;
  spanish: string;
  english: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  pronunciation?: string;
}

interface SpatialIdentificationExerciseProps {
  imageUrl: string;
  imageAlt: string;
  targetPoint: AnatomyPoint;
  allPoints: AnatomyPoint[];
  onComplete: ExerciseResultCallback;
}

export const SpatialIdentificationExercise: React.FC<SpatialIdentificationExerciseProps> = ({
  imageUrl,
  imageAlt,
  targetPoint,
  allPoints,
  onComplete,
}) => {
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showAllPoints, setShowAllPoints] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [startTime] = useState(Date.now());

  // Calculate distance between two points (percentage-based)
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Handle image click
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (showResult) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setClickPosition({ x, y });

    // Check if click is near target (within 10% radius)
    const distance = calculateDistance(x, y, targetPoint.x, targetPoint.y);
    const correct = distance <= 10; // 10% tolerance

    setIsCorrect(correct);
    setShowResult(true);

    // Play pronunciation feedback
    if (correct) {
      audioService.speakTerm(targetPoint.spanish, targetPoint.pronunciation);
    }

    const timeTaken = Date.now() - startTime;
    onComplete({
      exerciseId: 'spatial-identification-' + Date.now(),
      exerciseType: 'spatial_identification',
      correct,
      score: correct ? 1 : 0,
      timeTaken,
      hintsUsed: showAllPoints ? 1 : 0,
      metadata: {
        clickDistance: distance,
      },
    });
  }, [showResult, targetPoint, showAllPoints, startTime, onComplete]);

  // Play target term pronunciation
  const playTargetTerm = useCallback(async () => {
    try {
      await audioService.speakTerm(targetPoint.spanish, targetPoint.pronunciation);
    } catch {
      // Silently handle TTS errors
    }
  }, [targetPoint]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">
          ¿Dónde está...?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Click on the bird to identify the body part
        </p>
      </div>

      {/* Target Term */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">
          Find:
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={playTargetTerm}
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md"
            aria-label="Play pronunciation"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
              <path d="M14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10a7.971 7.971 0 00-2.343-5.657 1 1 0 010-1.414z"/>
            </svg>
          </button>
          <div>
            <p className="text-2xl font-bold text-blue-700">{targetPoint.spanish}</p>
            <p className="text-sm text-gray-600">({targetPoint.english})</p>
          </div>
        </div>
      </div>

      {/* Interactive Image */}
      <div
        className="relative rounded-xl overflow-hidden shadow-lg cursor-crosshair bg-gray-100"
        onClick={handleImageClick}
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          className={`w-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&h=600&fit=crop&q=80';
          }}
        />

        {/* Loading placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="animate-pulse text-gray-400">Loading image...</div>
          </div>
        )}

        {/* Click indicator */}
        {clickPosition && (
          <div
            className={`absolute w-8 h-8 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
              isCorrect
                ? 'bg-green-500 ring-4 ring-green-300'
                : 'bg-red-500 ring-4 ring-red-300'
            }`}
            style={{ left: `${clickPosition.x}%`, top: `${clickPosition.y}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-white">
              {isCorrect ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Correct location marker (shown after wrong answer) */}
        {showResult && !isCorrect && (
          <div
            className="absolute w-8 h-8 rounded-full transform -translate-x-1/2 -translate-y-1/2 bg-green-500 ring-4 ring-green-300 animate-pulse"
            style={{ left: `${targetPoint.x}%`, top: `${targetPoint.y}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        )}

        {/* Show all points toggle (for learning mode) */}
        {showAllPoints && allPoints.map(point => (
          <div
            key={point.id}
            className="absolute w-4 h-4 rounded-full bg-blue-500 bg-opacity-50 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={`${point.spanish} (${point.english})`}
          />
        ))}
      </div>

      {/* Show All Points Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowAllPoints(!showAllPoints)}
          className="text-sm text-blue-600 hover:text-blue-700 underline"
        >
          {showAllPoints ? 'Hide all labels' : 'Show all labels (hint)'}
        </button>
      </div>

      {/* Result Feedback */}
      {showResult && (
        <div className={`p-4 rounded-xl ${
          isCorrect
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            {isCorrect ? (
              <>
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-lg font-semibold text-green-700">¡Correcto!</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <span className="text-lg font-semibold text-red-700">Not quite</span>
              </>
            )}
          </div>
          <p className={`text-center ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            <strong>{targetPoint.spanish}</strong> = {targetPoint.english}
          </p>
        </div>
      )}
    </div>
  );
};

export default SpatialIdentificationExercise;
