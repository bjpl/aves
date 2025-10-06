/**
 * Enhanced Rejection Modal
 *
 * CONCEPT: Structured rejection with categorized reasons
 * WHY: Collect actionable feedback for improving AI annotation quality
 * PATTERN: Multi-step modal with category selection and notes
 */

import React, { useState } from 'react';
import { REJECTION_CATEGORIES, RejectionCategoryValue } from '../../constants/annotationQuality';

interface EnhancedRejectModalProps {
  annotationLabel: string;
  onReject: (category: RejectionCategoryValue, notes: string) => void;
  onCancel: () => void;
}

export const EnhancedRejectModal: React.FC<EnhancedRejectModalProps> = ({
  annotationLabel,
  onReject,
  onCancel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<RejectionCategoryValue | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (selectedCategory) {
      onReject(selectedCategory, notes);
    }
  };

  // Group categories by category type
  const categoriesByType = {
    technical: Object.values(REJECTION_CATEGORIES).filter(c => c.category === 'technical'),
    identification: Object.values(REJECTION_CATEGORIES).filter(c => c.category === 'identification'),
    pedagogical: Object.values(REJECTION_CATEGORIES).filter(c => c.category === 'pedagogical'),
    positioning: Object.values(REJECTION_CATEGORIES).filter(c => c.category === 'positioning'),
    other: Object.values(REJECTION_CATEGORIES).filter(c => c.category === 'other'),
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
          <h3 className="text-xl font-bold">Reject Annotation: {annotationLabel}</h3>
          <p className="text-sm text-red-100 mt-1">
            Select the primary issue with this annotation
          </p>
        </div>

        {/* Category Selection */}
        <div className="p-6 space-y-6">
          {/* Technical Issues */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🔧</span> Technical Issues
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoriesByType.technical.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as RejectionCategoryValue)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedCategory === cat.value
                      ? 'border-red-500 bg-red-50 shadow-md'
                      : `border-gray-200 hover:border-red-300 hover:bg-red-50 ${getSeverityColor(cat.severity)}`
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Identification Issues */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🤖</span> AI Identification Issues
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoriesByType.identification.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as RejectionCategoryValue)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedCategory === cat.value
                      ? 'border-red-500 bg-red-50 shadow-md'
                      : `border-gray-200 hover:border-red-300 hover:bg-red-50 ${getSeverityColor(cat.severity)}`
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Educational/Pedagogical Issues */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🎓</span> Educational Quality Issues
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoriesByType.pedagogical.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as RejectionCategoryValue)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedCategory === cat.value
                      ? 'border-red-500 bg-red-50 shadow-md'
                      : `border-gray-200 hover:border-red-300 hover:bg-red-50 ${getSeverityColor(cat.severity)}`
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Positioning Issues */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🎯</span> Positioning Issues
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoriesByType.positioning.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as RejectionCategoryValue)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedCategory === cat.value
                      ? 'border-red-500 bg-red-50 shadow-md'
                      : `border-gray-200 hover:border-red-300 hover:bg-red-50 ${getSeverityColor(cat.severity)}`
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Other */}
          {categoriesByType.other.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value as RejectionCategoryValue)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedCategory === cat.value
                  ? 'border-red-500 bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50 bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{cat.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{cat.description}</div>
                </div>
              </div>
            </button>
          ))}

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context or details about this rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 h-24 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex gap-3 border-t">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCategory}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
          >
            {selectedCategory ? '✕ Confirm Rejection' : 'Select a Category'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedRejectModal;
