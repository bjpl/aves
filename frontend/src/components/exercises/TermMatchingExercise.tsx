// CONCEPT: Drag-and-drop term matching exercise
// WHY: Connects Spanish bird terms with English translations interactively
// PATTERN: React DnD with touch support for matching pairs

import React, { useState, useCallback } from 'react';
import { audioService } from '../../services/audioService';

interface MatchPair {
  id: string;
  spanish: string;
  english: string;
  pronunciation?: string;
}

interface TermMatchingExerciseProps {
  pairs: MatchPair[];
  onComplete: (score: number, total: number) => void;
  showFeedback?: boolean;
}

export const TermMatchingExercise: React.FC<TermMatchingExerciseProps> = ({
  pairs,
  onComplete,
  showFeedback = true,
}) => {
  // Shuffle terms for display
  const [spanishTerms] = useState(() =>
    [...pairs].sort(() => Math.random() - 0.5)
  );
  const [englishTerms] = useState(() =>
    [...pairs].sort(() => Math.random() - 0.5)
  );

  const [selectedSpanish, setSelectedSpanish] = useState<string | null>(null);
  const [matches, setMatches] = useState<Map<string, string>>(new Map());
  const [correctMatches, setCorrectMatches] = useState<Set<string>>(new Set());
  const [incorrectAttempts, setIncorrectAttempts] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  // Play pronunciation when Spanish term selected
  const handleSpanishSelect = useCallback(async (pair: MatchPair) => {
    if (correctMatches.has(pair.id)) return;

    setSelectedSpanish(pair.id);
    setIncorrectAttempts(new Set());

    // Speak the Spanish term
    try {
      await audioService.speakTerm(pair.spanish, pair.pronunciation);
    } catch {
      // Silently handle TTS errors
    }
  }, [correctMatches]);

  // Check match when English term selected
  const handleEnglishSelect = useCallback((pair: MatchPair) => {
    if (!selectedSpanish || correctMatches.has(pair.id)) return;

    const spanishPair = pairs.find(p => p.id === selectedSpanish);
    if (!spanishPair) return;

    if (spanishPair.id === pair.id) {
      // Correct match!
      const newMatches = new Map(matches);
      newMatches.set(spanishPair.id, pair.id);
      setMatches(newMatches);

      const newCorrect = new Set(correctMatches);
      newCorrect.add(pair.id);
      setCorrectMatches(newCorrect);

      // Check if complete
      if (newCorrect.size === pairs.length) {
        setIsComplete(true);
        const score = pairs.length - incorrectAttempts.size;
        onComplete(Math.max(0, score), pairs.length);
      }
    } else {
      // Incorrect
      const newIncorrect = new Set(incorrectAttempts);
      newIncorrect.add(`${selectedSpanish}-${pair.id}`);
      setIncorrectAttempts(newIncorrect);
    }

    setSelectedSpanish(null);
  }, [selectedSpanish, pairs, matches, correctMatches, incorrectAttempts, onComplete]);

  const getSpanishButtonClass = (pair: MatchPair) => {
    const base = 'w-full p-3 rounded-lg font-medium transition-all duration-200 text-left flex items-center gap-2';

    if (correctMatches.has(pair.id)) {
      return `${base} bg-green-100 border-2 border-green-400 text-green-800 cursor-default`;
    }
    if (selectedSpanish === pair.id) {
      return `${base} bg-blue-500 text-white border-2 border-blue-600 shadow-lg scale-105`;
    }
    return `${base} bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer`;
  };

  const getEnglishButtonClass = (pair: MatchPair) => {
    const base = 'w-full p-3 rounded-lg font-medium transition-all duration-200 text-left';

    if (correctMatches.has(pair.id)) {
      return `${base} bg-green-100 border-2 border-green-400 text-green-800 cursor-default`;
    }
    if (!selectedSpanish) {
      return `${base} bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed`;
    }
    return `${base} bg-white border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">
          Empareja los términos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Match the Spanish bird terms with their English translations
        </p>
        <p className="text-xs text-blue-600 mt-2">
          Tap a Spanish term to hear its pronunciation
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            style={{ width: `${(correctMatches.size / pairs.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600">
          {correctMatches.size}/{pairs.length}
        </span>
      </div>

      {/* Matching Area */}
      <div className="grid grid-cols-2 gap-4">
        {/* Spanish Column */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-blue-700 text-center mb-3">
            Español
          </h4>
          {spanishTerms.map(pair => (
            <button
              key={`es-${pair.id}`}
              onClick={() => handleSpanishSelect(pair)}
              disabled={correctMatches.has(pair.id)}
              className={getSpanishButtonClass(pair)}
            >
              {/* Speaker icon */}
              <svg
                className="w-4 h-4 flex-shrink-0 opacity-60"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
                <path d="M14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10a7.971 7.971 0 00-2.343-5.657 1 1 0 010-1.414z"/>
              </svg>
              <span>{pair.spanish}</span>
              {correctMatches.has(pair.id) && (
                <svg className="w-5 h-5 text-green-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* English Column */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-purple-700 text-center mb-3">
            English
          </h4>
          {englishTerms.map(pair => (
            <button
              key={`en-${pair.id}`}
              onClick={() => handleEnglishSelect(pair)}
              disabled={correctMatches.has(pair.id) || !selectedSpanish}
              className={getEnglishButtonClass(pair)}
            >
              <span>{pair.english}</span>
              {correctMatches.has(pair.id) && (
                <svg className="w-5 h-5 text-green-600 ml-auto inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions when active */}
      {selectedSpanish && !isComplete && showFeedback && (
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            Now tap the matching English translation →
          </p>
        </div>
      )}

      {/* Completion Message */}
      {isComplete && showFeedback && (
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span className="text-lg font-semibold">¡Excelente!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            All {pairs.length} terms matched correctly!
          </p>
        </div>
      )}
    </div>
  );
};

export default TermMatchingExercise;
