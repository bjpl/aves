// CONCEPT: Build Spanish sentences about birds from word tiles
// WHY: Develops grammar and sentence structure with bird vocabulary
// PATTERN: Drag/tap words to construct complete sentences

import React, { useState, useCallback } from 'react';
import { audioService } from '../../services/audioService';
import type { ExerciseResultCallback } from '../../types';

interface SentenceBuildingExerciseProps {
  targetSentence: string;
  englishTranslation: string;
  words: string[]; // Shuffled words
  hint?: string;
  onComplete: ExerciseResultCallback;
}

export const SentenceBuildingExercise: React.FC<SentenceBuildingExerciseProps> = ({
  targetSentence,
  englishTranslation,
  words,
  hint,
  onComplete,
}) => {
  const [availableWords, setAvailableWords] = useState<string[]>(words);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [startTime] = useState(Date.now());

  // Add word to sentence
  const handleWordSelect = useCallback((word: string, index: number) => {
    if (showResult) return;

    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);
    setSelectedWords([...selectedWords, word]);
  }, [availableWords, selectedWords, showResult]);

  // Remove word from sentence
  const handleWordRemove = useCallback((word: string, index: number) => {
    if (showResult) return;

    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, word]);
  }, [availableWords, selectedWords, showResult]);

  // Check answer
  const handleCheck = useCallback(async () => {
    const builtSentence = selectedWords.join(' ');
    const correct = builtSentence.toLowerCase().trim() === targetSentence.toLowerCase().trim();

    const currentAttempt = attempts + 1;
    setAttempts(currentAttempt);
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      // Play the correct sentence
      try {
        await audioService.speakSentence(targetSentence);
      } catch {
        // Silently handle TTS errors
      }

      const timeTaken = Date.now() - startTime;
      onComplete({
        exerciseId: 'sentence-building-' + Date.now(),
        exerciseType: 'sentence_building',
        correct: true,
        score: 1,
        timeTaken,
        attemptsCount: currentAttempt,
        hintsUsed: showHint ? 1 : 0,
        metadata: {
          correctSequence: true,
        },
      });
    }
  }, [selectedWords, targetSentence, attempts, showHint, startTime, onComplete]);

  // Try again
  const handleTryAgain = useCallback(() => {
    if (attempts >= 3) {
      // After 3 attempts, show the answer and mark as complete
      const timeTaken = Date.now() - startTime;
      onComplete({
        exerciseId: 'sentence-building-' + Date.now(),
        exerciseType: 'sentence_building',
        correct: false,
        score: 0,
        timeTaken,
        attemptsCount: attempts,
        hintsUsed: showHint ? 1 : 0,
        metadata: {
          correctSequence: false,
        },
      });
      return;
    }

    setShowResult(false);
    setIsCorrect(false);
    // Don't reset the sentence, let them fix it
  }, [attempts, showHint, startTime, onComplete]);

  // Play sentence audio
  const playSentence = useCallback(async () => {
    try {
      await audioService.speakSentence(targetSentence);
    } catch {
      // Silently handle TTS errors
    }
  }, [targetSentence]);

  // Reset all
  const handleReset = useCallback(() => {
    setAvailableWords(words);
    setSelectedWords([]);
    setShowResult(false);
    setIsCorrect(false);
  }, [words]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">
          Construye la oración
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Arrange the words to build the correct Spanish sentence
        </p>
      </div>

      {/* English Prompt */}
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">
          Translate to Spanish:
        </p>
        <p className="text-lg font-medium text-gray-800">
          "{englishTranslation}"
        </p>
        {hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-blue-600 hover:text-blue-700 mt-2 underline"
          >
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        {showHint && hint && (
          <p className="text-sm text-blue-600 mt-2 italic">{hint}</p>
        )}
      </div>

      {/* Sentence Construction Area */}
      <div className="min-h-[80px] p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-wrap gap-2 items-center">
        {selectedWords.length === 0 ? (
          <p className="text-gray-400 italic w-full text-center">
            Tap words below to build your sentence
          </p>
        ) : (
          selectedWords.map((word, index) => (
            <button
              key={`selected-${index}`}
              onClick={() => handleWordRemove(word, index)}
              disabled={showResult}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                showResult
                  ? isCorrect
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer shadow-sm'
              }`}
            >
              {word}
            </button>
          ))
        )}
      </div>

      {/* Available Words */}
      <div className="p-4 bg-gray-100 rounded-xl">
        <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
          {availableWords.length === 0 ? (
            <p className="text-gray-400 italic">All words used</p>
          ) : (
            availableWords.map((word, index) => (
              <button
                key={`available-${index}`}
                onClick={() => handleWordSelect(word, index)}
                disabled={showResult}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer shadow-sm"
              >
                {word}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!showResult && selectedWords.length > 0 && (
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleCheck}
            disabled={selectedWords.length === 0}
            className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors shadow-md"
          >
            Check Answer
          </button>
        </div>
      )}

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

          {isCorrect ? (
            <div className="text-center">
              <p className="text-green-700 font-medium">{targetSentence}</p>
              <button
                onClick={playSentence}
                className="mt-2 text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mx-auto"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
                </svg>
                Listen to pronunciation
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-red-600 mb-3">
                {attempts < 3 ? `Attempt ${attempts}/3 - Try again!` : 'The correct sentence is:'}
              </p>
              {attempts >= 3 && (
                <p className="text-red-700 font-medium">{targetSentence}</p>
              )}
              {attempts < 3 && (
                <button
                  onClick={handleTryAgain}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SentenceBuildingExercise;
