import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Species, SpeciesFilter } from '../../../../shared/types/species.types';
import { SpeciesCard } from './SpeciesCard';
import { SpeciesFilters } from './SpeciesFilters';
import { useSpecies } from '../../hooks/useSpecies';
import { debug } from '../../utils/logger';

export const SpeciesBrowser: React.FC = () => {
  const { species, loading, error, fetchSpecies } = useSpecies();
  const [filters, setFilters] = useState<SpeciesFilter>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchSpecies();
  }, []);

  // Apply filters to species list
  const filteredSpecies = useMemo(() => {
    let result = [...species];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(s =>
        s.spanishName.toLowerCase().includes(term) ||
        s.englishName.toLowerCase().includes(term) ||
        s.scientificName.toLowerCase().includes(term)
      );
    }

    if (filters.orderName) {
      result = result.filter(s => s.orderName === filters.orderName);
    }

    if (filters.familyName) {
      result = result.filter(s => s.familyName === filters.familyName);
    }

    if (filters.sizeCategory) {
      result = result.filter(s => s.sizeCategory === filters.sizeCategory);
    }

    if (filters.habitat) {
      result = result.filter(s => s.habitats.includes(filters.habitat as string));
    }

    if (filters.primaryColor) {
      result = result.filter(s => s.primaryColors.includes(filters.primaryColor as string));
    }

    return result;
  }, [species, filters]);

  // Extract available filter options from data
  const availableFilters = useMemo(() => {
    const orders = [...new Set(species.map(s => s.orderName))].sort();
    const families = filters.orderName
      ? [...new Set(species.filter(s => s.orderName === filters.orderName).map(s => s.familyName))].sort()
      : [...new Set(species.map(s => s.familyName))].sort();
    const habitats = [...new Set(species.flatMap(s => s.habitats))].sort();
    const colors = [...new Set(species.flatMap(s => s.primaryColors))].sort();

    return { orders, families, habitats, colors };
  }, [species, filters.orderName]);

  const handleSpeciesClick = useCallback((species: Species) => {
    // Navigate to species detail page
    debug('Selected species:', species);
  }, []);

  const handleFilterChange = useCallback((newFilters: SpeciesFilter) => {
    setFilters(newFilters);
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading species...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading species: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Species Browser</h1>
        <p className="text-gray-600">
          Explore {species.length} bird species with Spanish vocabulary
        </p>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-64 flex-shrink-0">
          <SpeciesFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            availableFilters={availableFilters}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Controls Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredSpecies.length} of {species.length} species
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="Grid view"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="List view"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Species Grid/List */}
          {filteredSpecies.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No species found matching your filters.</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }>
              {filteredSpecies.map(species => (
                <SpeciesCard
                  key={species.id}
                  species={species}
                  onClick={handleSpeciesClick}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};