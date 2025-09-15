import React from 'react';
import { SpeciesFilter, SizeCategory } from '../../../../shared/types/species.types';

interface SpeciesFiltersProps {
  filters: SpeciesFilter;
  onFilterChange: (filters: SpeciesFilter) => void;
  availableFilters: {
    orders: string[];
    families: string[];
    habitats: string[];
    colors: string[];
  };
}

export const SpeciesFilters: React.FC<SpeciesFiltersProps> = ({
  filters,
  onFilterChange,
  availableFilters
}) => {
  const handleFilterChange = (key: keyof SpeciesFilter, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search
        </label>
        <input
          type="text"
          value={filters.searchTerm || ''}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          placeholder="Spanish or English name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Taxonomic Order */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Order
        </label>
        <select
          value={filters.orderName || ''}
          onChange={(e) => handleFilterChange('orderName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Orders</option>
          {availableFilters.orders.map(order => (
            <option key={order} value={order}>{order}</option>
          ))}
        </select>
      </div>

      {/* Family */}
      {filters.orderName && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Family
          </label>
          <select
            value={filters.familyName || ''}
            onChange={(e) => handleFilterChange('familyName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Families</option>
            {availableFilters.families.map(family => (
              <option key={family} value={family}>{family}</option>
            ))}
          </select>
        </div>
      )}

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Size
        </label>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as SizeCategory[]).map(size => (
            <button
              key={size}
              onClick={() => handleFilterChange('sizeCategory', filters.sizeCategory === size ? null : size)}
              className={`flex-1 px-3 py-2 rounded-md border text-sm capitalize transition-colors ${
                filters.sizeCategory === size
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Habitat */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Habitat
        </label>
        <select
          value={filters.habitat || ''}
          onChange={(e) => handleFilterChange('habitat', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Habitats</option>
          {availableFilters.habitats.map(habitat => (
            <option key={habitat} value={habitat}>{habitat}</option>
          ))}
        </select>
      </div>

      {/* Primary Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Primary Color
        </label>
        <div className="grid grid-cols-4 gap-2">
          {availableFilters.colors.map(color => (
            <button
              key={color}
              onClick={() => handleFilterChange('primaryColor', filters.primaryColor === color ? null : color)}
              className={`w-full h-8 rounded border-2 transition-all ${
                filters.primaryColor === color
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
};