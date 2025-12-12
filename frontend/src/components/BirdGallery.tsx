import React, { useState } from 'react';
import { useBirds } from '../hooks/useCMS';
import { CMSService, Bird } from '../services/cms.service';
import { ChevronRight, Search } from 'lucide-react';

// PATTERN: Component Composition with CMS Data
// WHY: Modular UI components that consume CMS content
// CONCEPT: Separation between presentation and data fetching

interface BirdGalleryProps {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
}

interface BirdsResponse {
  data: Bird[];
  meta?: unknown;
}

export const BirdGallery: React.FC<BirdGalleryProps> = ({ difficulty, limit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty);

  const { data, isLoading, error } = useBirds({
    filters: selectedDifficulty ? { difficulty: selectedDifficulty } : undefined,
    populate: ['images', 'sounds'],
    pagination: limit ? { pageSize: limit } : undefined,
    sort: ['spanishName:asc']
  }) as { data: BirdsResponse | undefined; isLoading: boolean; error: Error | null };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading birds. Please try again later.</p>
      </div>
    );
  }

  const birds = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search birds by name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDifficulty(undefined)}
            className={`px-4 py-2 rounded-lg ${
              !selectedDifficulty ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All
          </button>
          {['beginner', 'intermediate', 'advanced'].map((level) => (
            <button
              key={level}
              onClick={() => setSelectedDifficulty(level as any)}
              className={`px-4 py-2 rounded-lg capitalize ${
                selectedDifficulty === level ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Birds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {birds
          .filter((bird: Bird) =>
            !searchTerm ||
            bird.attributes.spanishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bird.attributes.englishName.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((bird: Bird) => (
            <BirdCard key={bird.id} bird={bird} />
          ))}
      </div>

      {birds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No birds found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

// Bird Card Component
const BirdCard: React.FC<{ bird: Bird }> = ({ bird }) => {
  const imageUrl = bird.attributes.images?.data?.[0]?.attributes.url;
  const fullImageUrl = imageUrl ? CMSService.getMediaUrl(imageUrl) : '/placeholder-bird.jpg';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-w-16 aspect-h-12 bg-gray-200">
        <img
          src={fullImageUrl}
          alt={bird.attributes.spanishName}
          className="w-full h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-bird.jpg';
          }}
        />
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{bird.attributes.spanishName}</h3>
        <p className="text-sm text-gray-600 italic">{bird.attributes.englishName}</p>
        <p className="text-xs text-gray-500 mt-1">{bird.attributes.scientificName}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className={`px-2 py-1 text-xs rounded-full ${
            bird.attributes.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
            bird.attributes.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {bird.attributes.difficulty}
          </span>

          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
};