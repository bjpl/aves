import React from 'react';
import { Link } from 'react-router-dom';

interface Annotation {
  id: string;
  term: string;
  english: string;
  pronunciation: string;
  description: string;
}

interface VocabularyPanelProps {
  selectedAnnotation: Annotation | null;
  birdAnnotations: Annotation[];
  birdName: string;
  discoveredTerms: Set<string>;
}

export const VocabularyPanel: React.FC<VocabularyPanelProps> = ({
  selectedAnnotation,
  birdAnnotations,
  birdName,
  discoveredTerms
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
      <h2 className="text-xl font-semibold mb-4">Vocabulary Details</h2>

      {selectedAnnotation ? (
        <div className="space-y-4">
          {/* Spanish Term */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {selectedAnnotation.term}
            </h3>
            <p className="text-sm text-gray-500 italic mt-1">
              {selectedAnnotation.pronunciation}
            </p>
          </div>

          {/* English Translation */}
          <div>
            <p className="text-sm text-gray-600">English:</p>
            <p className="text-lg font-medium">{selectedAnnotation.english}</p>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-gray-600">Description:</p>
            <p className="text-sm text-gray-700">{selectedAnnotation.description}</p>
          </div>

          {/* Practice Button */}
          <Link
            to="/practice"
            className="block w-full text-center bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            Practice This Term
          </Link>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p>Click on a highlighted area to see details</p>
        </div>
      )}

      {/* Discovered Terms List */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="font-semibold mb-3">Terms for {birdName}:</h3>
        <div className="space-y-2">
          {birdAnnotations.map(ann => (
            <div
              key={ann.id}
              className={`flex items-center justify-between p-2 rounded ${
                discoveredTerms.has(ann.id)
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="text-sm">{ann.term}</span>
              {discoveredTerms.has(ann.id) && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
