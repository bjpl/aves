import React, { useState, useEffect, useRef } from 'react';
import { VocabularyDisclosure, DisclosureLevel } from '../../../../shared/types/vocabulary.types';
import { Annotation } from '../../../../shared/types/annotation.types';
import { PronunciationPlayer } from './PronunciationPlayer';
import { ProgressIndicator } from './ProgressIndicator';

interface DisclosurePopoverProps {
  annotation: Annotation;
  disclosure: VocabularyDisclosure;
  position: { x: number; y: number };
  onClose: () => void;
  onLevelChange: (level: DisclosureLevel) => void;
}

export const DisclosurePopover: React.FC<DisclosurePopoverProps> = ({
  annotation,
  disclosure,
  position,
  onClose,
  onLevelChange
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleExpand = () => {
    const newLevel = Math.min(disclosure.level + 1, 4) as DisclosureLevel;
    onLevelChange(newLevel);
    setIsExpanded(true);
  };

  const getLevelContent = () => {
    switch (disclosure.level) {
      case 0:
        return null;

      case 1:
        return (
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">
              {disclosure.spanish}
            </h3>
            {disclosure.hint && (
              <p className="text-sm text-gray-500 italic">{disclosure.hint}</p>
            )}
            <button
              onClick={handleExpand}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Click to reveal more →
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {disclosure.spanish}
              </h3>
              {disclosure.pronunciation && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">
                    [{disclosure.pronunciation}]
                  </span>
                  {disclosure.audioUrl && (
                    <PronunciationPlayer audioUrl={disclosure.audioUrl} />
                  )}
                </div>
              )}
            </div>
            <div className="border-t pt-2">
              <p className="text-sm text-gray-600">English:</p>
              <p className="font-medium">{disclosure.english}</p>
            </div>
            <button
              onClick={handleExpand}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Learn more →
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {disclosure.spanish}
              </h3>
              {disclosure.pronunciation && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">
                    [{disclosure.pronunciation}]
                  </span>
                  {disclosure.audioUrl && (
                    <PronunciationPlayer audioUrl={disclosure.audioUrl} />
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-2">
              <p className="text-sm text-gray-600">English:</p>
              <p className="font-medium">{disclosure.english}</p>
            </div>

            {disclosure.etymology && (
              <div className="border-t pt-2">
                <p className="text-sm text-gray-600">Etymology:</p>
                <p className="text-sm">{disclosure.etymology}</p>
              </div>
            )}

            {disclosure.mnemonic && (
              <div className="bg-yellow-50 p-2 rounded">
                <p className="text-sm text-gray-600">Memory tip:</p>
                <p className="text-sm font-medium">{disclosure.mnemonic}</p>
              </div>
            )}

            {disclosure.relatedTerms && disclosure.relatedTerms.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-sm text-gray-600 mb-1">Related terms:</p>
                <div className="space-y-1">
                  {disclosure.relatedTerms.slice(0, 3).map((term, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{term.term}</span>
                      <span className="text-gray-500 ml-1">({term.relationship})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleExpand}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              See examples →
            </button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {disclosure.spanish}
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Mastered
                </span>
              </h3>
              {disclosure.pronunciation && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">
                    [{disclosure.pronunciation}]
                  </span>
                  {disclosure.audioUrl && (
                    <PronunciationPlayer audioUrl={disclosure.audioUrl} />
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-2">
              <p className="text-sm text-gray-600">English:</p>
              <p className="font-medium">{disclosure.english}</p>
            </div>

            {disclosure.etymology && (
              <div className="border-t pt-2">
                <p className="text-sm text-gray-600">Etymology:</p>
                <p className="text-sm">{disclosure.etymology}</p>
              </div>
            )}

            {disclosure.usageExamples && disclosure.usageExamples.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-sm text-gray-600 mb-1">Examples:</p>
                <ul className="space-y-1">
                  {disclosure.usageExamples.map((example, idx) => (
                    <li key={idx} className="text-sm italic">
                      "{example}"
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {disclosure.commonPhrases && disclosure.commonPhrases.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-sm text-gray-600 mb-1">Common phrases:</p>
                <div className="space-y-2">
                  {disclosure.commonPhrases.map((phrase, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded">
                      <p className="text-sm font-medium">{phrase.spanish}</p>
                      <p className="text-xs text-gray-600">{phrase.english}</p>
                      <p className="text-xs text-gray-500 italic">
                        Literal: {phrase.literal}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        );

      default:
        return null;
    }
  };

  if (disclosure.level === 0) return null;

  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 1000,
  };

  return (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className={`
        bg-white rounded-lg shadow-xl border border-gray-200
        p-4 min-w-[280px] max-w-[400px]
        transform transition-all duration-200
        ${disclosure.level === 1 ? 'animate-fadeIn' : ''}
      `}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="Close"
      >
        ×
      </button>

      {getLevelContent()}

      <div className="mt-3 pt-3 border-t">
        <ProgressIndicator currentLevel={disclosure.level} />
      </div>
    </div>
  );
};