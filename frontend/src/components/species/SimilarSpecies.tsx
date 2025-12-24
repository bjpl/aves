import React from 'react';
import { Link } from 'react-router-dom';
import { LazyImage } from '../ui/LazyImage';
import { useSimilarSpecies } from '../../hooks/useSpecies';

interface SimilarSpeciesProps {
  speciesId: string;
  className?: string;
}

export const SimilarSpecies: React.FC<SimilarSpeciesProps> = ({ speciesId, className = '' }) => {
  const { data: similarSpecies = [], isLoading } = useSimilarSpecies(speciesId);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Similar Species</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
              <div className="h-4 bg-gray-200 rounded mb-1" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!similarSpecies.length) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">🦅</span>
        Similar Species
      </h2>
      <p className="text-gray-600 mb-6">
        You might also be interested in these related birds
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {similarSpecies.map((species) => (
          <Link
            key={species.id}
            to={`/species/${species.id}`}
            state={{ species }}
            className="group block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          >
            {/* Image */}
            <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
              {species.primaryImageUrl ? (
                <LazyImage
                  src={species.primaryImageUrl}
                  alt={species.spanishName}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50">
                  🦅
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-3">
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {species.spanishName}
              </h3>
              <p className="text-sm text-gray-600 mb-1">{species.englishName}</p>
              <p className="text-xs text-gray-500 italic truncate">{species.scientificName}</p>

              {/* Taxonomy Badge */}
              <div className="mt-2">
                <span className="inline-block text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                  {species.familyName}
                </span>
              </div>

              {/* Annotation Count */}
              {species.annotationCount !== undefined && species.annotationCount > 0 && (
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  {species.annotationCount} terms
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarSpecies;
