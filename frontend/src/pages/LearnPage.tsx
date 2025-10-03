// CONCEPT: Enhanced learn page with seamless flow and audio integration
// WHY: Creates an immersive learning experience that adapts to all devices
// PATTERN: Progressive disclosure with immediate practice opportunities

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveAnnotationCanvas } from '../components/annotation/ResponsiveAnnotationCanvas';
import { AudioPlayer } from '../components/audio/AudioPlayer';
import { Annotation } from '../types';
import { useAnnotations } from '../hooks/useAnnotations';
import { useProgress } from '../hooks/useProgress';
import { useMobileDetect } from '../hooks/useMobileDetect';

export const LearnPage: React.FC = () => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [discoveredTerms, setDiscoveredTerms] = useState<Set<string>>(new Set());
  const [showPracticePrompt, setShowPracticePrompt] = useState(false);

  const { annotations, loading } = useAnnotations();
  const { progress, recordTermDiscovery, getStats } = useProgress();
  const { isMobile } = useMobileDetect();
  const stats = useMemo(() => getStats(), [getStats]);

  // Track discovered terms
  useEffect(() => {
    if (progress?.termsDiscovered) {
      setDiscoveredTerms(new Set(progress.termsDiscovered));
    }
  }, [progress]);

  // Show practice prompt after discovering 5 new terms
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (discoveredTerms.size > 0 && discoveredTerms.size % 5 === 0) {
      setShowPracticePrompt(true);
      timeoutId = setTimeout(() => setShowPracticePrompt(false), 5000);
    }

    // Cleanup timeout
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [discoveredTerms.size]);

  const handleAnnotationDiscover = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);

    if (annotation.spanishTerm && !discoveredTerms.has(annotation.spanishTerm)) {
      const newDiscovered = new Set(discoveredTerms);
      newDiscovered.add(annotation.spanishTerm);
      setDiscoveredTerms(newDiscovered);
      recordTermDiscovery(annotation.spanishTerm);
    }
  }, [discoveredTerms, recordTermDiscovery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading learning materials...</div>
      </div>
    );
  }

  const discoveryProgress = useMemo(() =>
    Math.round((discoveredTerms.size / annotations.length) * 100),
    [discoveredTerms.size, annotations.length]
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-50 to-blue-50 ${isMobile ? 'pb-20' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with progress */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Interactive Learning
              </h1>
              <p className="text-gray-600">
                {isMobile ? 'Tap' : 'Click'} on highlighted areas to discover vocabulary
              </p>
            </div>

            {/* Progress badges */}
            <div className="flex gap-3 mt-4 md:mt-0">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                <span className="text-sm text-gray-500">Discovered</span>
                <span className="ml-2 font-bold text-green-600">
                  {discoveredTerms.size}
                </span>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                <span className="text-sm text-gray-500">Total</span>
                <span className="ml-2 font-bold text-blue-600">
                  {annotations.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main learning area */}
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6`}>
          {/* Image with annotations */}
          <div className={`${isMobile ? '' : 'lg:col-span-2'}`}>
            <div className="bg-white rounded-lg shadow-lg p-4">
              <ResponsiveAnnotationCanvas
                imageUrl="https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200"
                annotations={annotations}
                onAnnotationDiscover={handleAnnotationDiscover}
                showLabels={false}
              />

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Discovery Progress</span>
                  <span>{discoveryProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${discoveryProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vocabulary panel */}
          <div className={`${isMobile ? '' : 'lg:col-span-1'}`}>
            {/* Current term details */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
              <h2 className="text-xl font-semibold mb-4">Vocabulary Details</h2>

              {selectedAnnotation ? (
                <div className="space-y-4">
                  {/* Spanish term with audio */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {selectedAnnotation.spanishTerm}
                      </h3>
                      <AudioPlayer
                        text={selectedAnnotation.spanishTerm}
                        type="pronunciation"
                        size="medium"
                      />
                    </div>
                    <p className="text-sm text-gray-500 italic mt-1">
                      {selectedAnnotation.pronunciation}
                    </p>
                  </div>

                  {/* English translation */}
                  <div>
                    <p className="text-sm text-gray-600">English:</p>
                    <p className="text-lg font-medium">
                      {selectedAnnotation.englishTerm}
                    </p>
                  </div>

                  {/* Etymology if available */}
                  {selectedAnnotation.etymology && (
                    <div>
                      <p className="text-sm text-gray-600">Etymology:</p>
                      <p className="text-sm text-gray-700">
                        {selectedAnnotation.etymology}
                      </p>
                    </div>
                  )}

                  {/* Example sentence */}
                  {selectedAnnotation.exampleSentence && (
                    <div>
                      <p className="text-sm text-gray-600">Example:</p>
                      <p className="text-sm text-gray-700 italic">
                        "{selectedAnnotation.exampleSentence}"
                      </p>
                    </div>
                  )}

                  {/* Difficulty indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Difficulty:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(level => (
                        <div
                          key={level}
                          className={`w-2 h-2 rounded-full ${
                            level <= (selectedAnnotation.difficultyLevel || 1)
                              ? 'bg-yellow-400'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  Select an annotation to see details
                </p>
              )}
            </div>

            {/* Discovered terms list */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Discovered Terms ({discoveredTerms.size})
              </h2>
              <div className="max-h-48 overflow-y-auto">
                {discoveredTerms.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(discoveredTerms).map(term => (
                      <div
                        key={term}
                        className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-700">{term}</span>
                        <AudioPlayer
                          text={term}
                          type="pronunciation"
                          size="small"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Start exploring to discover terms
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Practice prompt */}
        {showPracticePrompt && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white rounded-lg shadow-xl p-4 max-w-sm animate-pulse">
            <p className="font-semibold mb-2">Great progress! 🎉</p>
            <p className="text-sm mb-3">
              You've discovered {discoveredTerms.size} terms. Ready to practice?
            </p>
            <Link
              to="/practice"
              className="inline-block bg-white text-green-600 px-4 py-2 rounded font-semibold hover:bg-green-50 transition-colors"
            >
              Practice Now
            </Link>
          </div>
        )}

        {/* Mobile bottom navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
            <div className="flex justify-around py-2">
              <Link
                to="/"
                className="flex flex-col items-center p-2 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs mt-1">Home</span>
              </Link>
              <div className="flex flex-col items-center p-2 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-xs mt-1">Learn</span>
              </div>
              <Link
                to="/practice"
                className="flex flex-col items-center p-2 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="text-xs mt-1">Practice</span>
              </Link>
              <Link
                to="/species"
                className="flex flex-col items-center p-2 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-xs mt-1">Species</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};