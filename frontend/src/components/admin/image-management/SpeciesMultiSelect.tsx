/**
 * Species Multi-Select Component
 */

import React, { useState } from 'react';
import { Species } from '../../../types';
import { Badge } from '../../ui/Badge';

interface SpeciesMultiSelectProps {
  species: Species[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export const SpeciesMultiSelect: React.FC<SpeciesMultiSelectProps> = ({
  species,
  selected,
  onChange,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredSpecies = species.filter(
    (s) =>
      s.englishName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.spanishName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.scientificName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSpecies = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(filteredSpecies.map((s) => s.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative">
      <div
        className={`border rounded-lg p-3 cursor-pointer ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-blue-500'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-700">
            {selected.length === 0
              ? 'Select species...'
              : `${selected.length} species selected`}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selected.slice(0, 5).map((id) => {
              const sp = species.find((s) => s.id === id);
              return (
                <Badge key={id} variant="primary" size="sm">
                  {sp?.englishName || id}
                </Badge>
              );
            })}
            {selected.length > 5 && (
              <Badge variant="default" size="sm">
                +{selected.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search species..."
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="p-2 border-b flex gap-2">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={(e) => {
                e.stopPropagation();
                selectAll();
              }}
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
            >
              Clear All
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filteredSpecies.map((sp) => (
              <label
                key={sp.id}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(sp.id)}
                  onChange={() => toggleSpecies(sp.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-3">
                  <span className="font-medium">{sp.englishName}</span>
                  <span className="text-gray-500 text-sm ml-2">{sp.scientificName}</span>
                </span>
              </label>
            ))}
            {filteredSpecies.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-500">No species found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
