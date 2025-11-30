import React from 'react';
import { Species } from '../../../../shared/types/species.types';
import { LazyImage } from '../ui/LazyImage';

interface SpeciesCardProps {
  species: Species;
  onClick?: (species: Species) => void;
  viewMode?: 'grid' | 'list';
}

export const SpeciesCard: React.FC<SpeciesCardProps> = React.memo(({
  species,
  onClick,
  viewMode = 'grid'
}) => {
  const getConservationColor = (status?: string) => {
    switch (status) {
      case 'LC': return 'bg-green-100 text-green-800';
      case 'NT': return 'bg-yellow-100 text-yellow-800';
      case 'VU': return 'bg-orange-100 text-orange-800';
      case 'EN': return 'bg-red-100 text-red-800';
      case 'CR': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSizeIcon = (size?: string) => {
    switch (size) {
      case 'small': return '🐦';
      case 'medium': return '🦅';
      case 'large': return '🦢';
      default: return '🦜';
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onClick?.(species)}
        className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      >
        {species.primaryImageUrl ? (
          <LazyImage
            src={species.primaryImageUrl}
            alt={species.spanishName}
            className="w-16 h-16 rounded-lg"
            blurAmount={10}
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
            {getSizeIcon(species.sizeCategory)}
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{species.spanishName}</h3>
          <p className="text-sm text-gray-600">{species.englishName}</p>
          <p className="text-xs text-gray-500 italic">{species.scientificName}</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">{species.familyName}</p>
          {species.conservationStatus && (
            <span className={`text-xs px-2 py-1 rounded-full ${getConservationColor(species.conservationStatus)}`}>
              {species.conservationStatus}
            </span>
          )}
        </div>

        <div className="flex gap-1">
          {Array.isArray(species.habitats) && species.habitats.slice(0, 2).map(habitat => (
            <span key={habitat} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
              {habitat}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(species)}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
    >
      <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 relative">
        {species.primaryImageUrl ? (
          <LazyImage
            src={species.primaryImageUrl}
            alt={species.spanishName}
            className="w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50">
            {getSizeIcon(species.sizeCategory)}
          </div>
        )}
        {species.conservationStatus && (
          <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${getConservationColor(species.conservationStatus)}`}>
            {species.conservationStatus}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
          {species.spanishName}
        </h3>
        <p className="text-sm text-gray-600">{species.englishName}</p>
        <p className="text-xs text-gray-500 italic mt-1">{species.scientificName}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {Array.isArray(species.primaryColors) && species.primaryColors.slice(0, 3).map(color => (
              <span
                key={color}
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {species.familyName}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {Array.isArray(species.habitats) && species.habitats.slice(0, 2).map(habitat => (
            <span key={habitat} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
              {habitat}
            </span>
          ))}
        </div>

        {/* Bilingual Description Preview */}
        {(species.descriptionSpanish || species.descriptionEnglish) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-600 line-clamp-2">
              {species.descriptionSpanish || species.descriptionEnglish}
            </p>
          </div>
        )}

        {species.annotationCount !== undefined && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {species.annotationCount} annotations available
            </p>
          </div>
        )}
      </div>
    </div>
  );
});