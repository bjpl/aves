// CONCEPT: Sort bird terms into grammatical/semantic categories
// WHY: Teaches Spanish grammar patterns and bird taxonomy simultaneously
// PATTERN: Drag items into categorized containers

import React, { useState, useCallback } from 'react';
import { audioService } from '../../services/audioService';
import type { ExerciseResultCallback } from '../../types';

interface SortableItem {
  id: string;
  spanish: string;
  english: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind color class
}

interface CategorySortingExerciseProps {
  categories: Category[];
  items: SortableItem[];
  onComplete: ExerciseResultCallback;
}

export const CategorySortingExercise: React.FC<CategorySortingExerciseProps> = ({
  categories,
  items,
  onComplete,
}) => {
  // Shuffle items for display
  const [unsortedItems, setUnsortedItems] = useState<SortableItem[]>(() =>
    [...items].sort(() => Math.random() - 0.5)
  );
  const [sortedItems, setSortedItems] = useState<Map<string, SortableItem[]>>(
    new Map(categories.map(c => [c.id, []]))
  );
  const [selectedItem, setSelectedItem] = useState<SortableItem | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Map<string, boolean>>(new Map());
  const [startTime] = useState(Date.now());

  // Select an item to sort
  const handleItemSelect = useCallback(async (item: SortableItem) => {
    if (showResults) return;

    setSelectedItem(item);

    // Speak the term
    try {
      await audioService.speakTerm(item.spanish);
    } catch {
      // Silently handle TTS errors
    }
  }, [showResults]);

  // Place item in category
  const handleCategorySelect = useCallback((categoryId: string) => {
    if (!selectedItem || showResults) return;

    // Remove from unsorted
    setUnsortedItems(prev => prev.filter(i => i.id !== selectedItem.id));

    // Add to category
    setSortedItems(prev => {
      const newMap = new Map(prev);
      const categoryItems = newMap.get(categoryId) || [];
      newMap.set(categoryId, [...categoryItems, selectedItem]);
      return newMap;
    });

    setSelectedItem(null);
  }, [selectedItem, showResults]);

  // Remove item from category (put back in unsorted)
  const handleItemRemove = useCallback((item: SortableItem, categoryId: string) => {
    if (showResults) return;

    setSortedItems(prev => {
      const newMap = new Map(prev);
      const categoryItems = newMap.get(categoryId) || [];
      newMap.set(categoryId, categoryItems.filter(i => i.id !== item.id));
      return newMap;
    });

    setUnsortedItems(prev => [...prev, item]);
  }, [showResults]);

  // Check all answers
  const handleCheck = useCallback(() => {
    const newResults = new Map<string, boolean>();
    let correctCount = 0;

    sortedItems.forEach((categoryItems, categoryId) => {
      categoryItems.forEach(item => {
        const isCorrect = item.categoryId === categoryId;
        newResults.set(item.id, isCorrect);
        if (isCorrect) correctCount++;
      });
    });

    setResults(newResults);
    setShowResults(true);

    const timeTaken = Date.now() - startTime;
    const totalCount = items.length;
    const score = totalCount > 0 ? correctCount / totalCount : 0;

    onComplete({
      exerciseId: 'category-sorting-' + Date.now(),
      exerciseType: 'category_sorting',
      correct: score >= 0.7,
      score,
      timeTaken,
      metadata: {
        categoriesCorrect: correctCount,
        totalCategories: totalCount,
      },
    });
  }, [sortedItems, items.length, startTime, onComplete]);

  // Get category color classes
  const getCategoryColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
      green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
      pink: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
    };

    const scheme = colors[color] || colors.blue;

    if (isSelected) {
      return `${scheme.bg} border-2 ${scheme.border} ring-2 ring-${color}-200`;
    }
    return `${scheme.bg} border-2 ${scheme.border} hover:ring-2 hover:ring-${color}-200`;
  };

  const allSorted = unsortedItems.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">
          Clasifica los términos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Sort the Spanish bird terms into the correct categories
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
            style={{ width: `${((items.length - unsortedItems.length) / items.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600">
          {items.length - unsortedItems.length}/{items.length}
        </span>
      </div>

      {/* Unsorted Items */}
      {unsortedItems.length > 0 && (
        <div className="p-4 bg-gray-100 rounded-xl">
          <p className="text-sm font-medium text-gray-600 mb-3 text-center">
            Tap a term, then tap a category to sort it
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {unsortedItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleItemSelect(item)}
                disabled={showResults}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedItem?.id === item.id
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 opacity-60" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
                  </svg>
                  <span>{item.spanish}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Item Indicator */}
      {selectedItem && !showResults && (
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>{selectedItem.spanish}</strong> ({selectedItem.english}) → Select a category below
          </p>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(category => {
          const categoryItems = sortedItems.get(category.id) || [];

          return (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              disabled={!selectedItem || showResults}
              className={`p-4 rounded-xl transition-all min-h-[120px] text-left ${getCategoryColorClasses(
                category.color,
                selectedItem !== null
              )} ${!selectedItem ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className={`font-semibold ${getCategoryColorClasses(category.color, false).split(' ').find(c => c.startsWith('text-'))}`}>
                  {category.name}
                </h4>
                <span className="text-xs text-gray-500">({categoryItems.length})</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{category.description}</p>

              {/* Sorted Items in Category */}
              <div className="flex flex-wrap gap-1">
                {categoryItems.map(item => (
                  <span
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemRemove(item, category.id);
                    }}
                    className={`px-2 py-1 rounded text-sm cursor-pointer transition-all ${
                      showResults
                        ? results.get(item.id)
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {item.spanish}
                    {showResults && (
                      results.get(item.id) ? (
                        <span className="ml-1">✓</span>
                      ) : (
                        <span className="ml-1">✗</span>
                      )
                    )}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Check Button */}
      {allSorted && !showResults && (
        <div className="text-center">
          <button
            onClick={handleCheck}
            className="px-8 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors shadow-lg"
          >
            Check Answers
          </button>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className={`p-4 rounded-xl text-center ${
          [...results.values()].every(v => v)
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          {[...results.values()].every(v => v) ? (
            <>
              <p className="text-lg font-semibold text-green-700">¡Perfecto!</p>
              <p className="text-sm text-green-600 mt-1">
                All {items.length} terms sorted correctly!
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-yellow-700">Good effort!</p>
              <p className="text-sm text-yellow-600 mt-1">
                {[...results.values()].filter(v => v).length} of {items.length} correct
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySortingExercise;
