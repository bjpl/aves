import React from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { Species } from '../../../shared/types/species.types';
import { LazyImage } from '../components/ui/LazyImage';

export const SpeciesDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Get species from navigation state or fetch if needed
  const species = location.state?.species as Species | undefined;

  if (!species) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🦅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Species Not Found</h2>
          <p className="text-gray-600 mb-4">
            Unable to load species details. Please go back and try again.
          </p>
          <Link
            to="/species"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Species Browser
          </Link>
        </div>
      </div>
    );
  }

  const getConservationInfo = (status?: string) => {
    const info: Record<string, { color: string; label: string; description: string }> = {
      'LC': { color: 'bg-green-100 text-green-800', label: 'Least Concern', description: 'Population is stable and widespread' },
      'NT': { color: 'bg-yellow-100 text-yellow-800', label: 'Near Threatened', description: 'May become threatened in the near future' },
      'VU': { color: 'bg-orange-100 text-orange-800', label: 'Vulnerable', description: 'High risk of endangerment in the wild' },
      'EN': { color: 'bg-red-100 text-red-800', label: 'Endangered', description: 'Very high risk of extinction' },
      'CR': { color: 'bg-red-200 text-red-900', label: 'Critically Endangered', description: 'Extremely high risk of extinction' },
    };
    return info[status || ''] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown', description: '' };
  };

  const conservationInfo = getConservationInfo(species.conservationStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/species')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Species Browser
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="md:flex">
            {/* Image Section */}
            <div className="md:w-1/2">
              <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 relative">
                {species.primaryImageUrl ? (
                  <LazyImage
                    src={species.primaryImageUrl}
                    alt={species.spanishName}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-50">
                    🦅
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="md:w-1/2 p-8">
              {/* Names */}
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {species.spanishName}
                </h1>
                <p className="text-2xl text-gray-600 mb-1">{species.englishName}</p>
                <p className="text-lg text-gray-500 italic">{species.scientificName}</p>
              </div>

              {/* Bilingual Descriptions */}
              {(species.descriptionSpanish || species.descriptionEnglish) && (
                <div className="mb-6 space-y-4">
                  {species.descriptionSpanish && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                        <span className="mr-2">🇪🇸</span> Descripcion en Espanol
                      </h3>
                      <p className="text-gray-700">{species.descriptionSpanish}</p>
                    </div>
                  )}
                  {species.descriptionEnglish && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                        <span className="mr-2">🇬🇧</span> English Description
                      </h3>
                      <p className="text-gray-700">{species.descriptionEnglish}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Taxonomy */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Taxonomy
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Order</p>
                    <p className="font-medium">{species.orderName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Family</p>
                    <p className="font-medium">{species.familyName}</p>
                  </div>
                </div>
              </div>

              {/* Conservation Status */}
              {species.conservationStatus && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Conservation Status
                  </h3>
                  <div className={`inline-flex items-center px-4 py-2 rounded-full ${conservationInfo.color}`}>
                    <span className="font-semibold">{species.conservationStatus}</span>
                    <span className="mx-2">-</span>
                    <span>{conservationInfo.label}</span>
                  </div>
                  {conservationInfo.description && (
                    <p className="text-sm text-gray-600 mt-2">{conservationInfo.description}</p>
                  )}
                </div>
              )}

              {/* Colors */}
              {species.primaryColors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Primary Colors
                  </h3>
                  <div className="flex gap-2">
                    {species.primaryColors.map(color => (
                      <div
                        key={color}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Habitats */}
              {species.habitats.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Habitats
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {species.habitats.map(habitat => (
                      <span
                        key={habitat}
                        className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                      >
                        {habitat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Annotations Available */}
              {species.annotationCount !== undefined && species.annotationCount > 0 && (
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-800">
                        {species.annotationCount} Learning Annotations Available
                      </p>
                      <p className="text-sm text-blue-600">
                        Interactive vocabulary points to explore
                      </p>
                    </div>
                    <Link
                      to="/learn"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Learning
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeciesDetailPage;
