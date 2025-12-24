import React, { useState, useEffect } from 'react';
import { Species } from '../../../../shared/types/species.types';
import { unsplashService } from '../../services/unsplashService';
import { promptGenerator } from '../../services/promptGenerator';
import axios from 'axios';
import { error as logError } from '../../utils/logger';
import { useToast, ToastContainer } from '../admin/image-management';

interface ImageImporterProps {
  species: Species[];
}

export const ImageImporter: React.FC<ImageImporterProps> = ({ species }) => {
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<Record<string, string>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [stats, setStats] = useState<any>(null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/images/stats');
      setStats(response.data);
    } catch (err) {
      logError('Failed to fetch stats', err as Error);
    }
  };

  const handleSpeciesSelect = (species: Species) => {
    setSelectedSpecies(species);
    setSearchResults([]);

    // Generate prompt automatically
    const prompt = promptGenerator.generateMidjourneyPrompt(species);
    setGeneratedPrompt(prompt);
  };

  const searchImages = async () => {
    if (!selectedSpecies) return;

    setLoading(true);
    try {
      const queries = promptGenerator.generateSearchQueries(selectedSpecies);
      const allResults: any[] = [];

      for (const query of queries.slice(0, 2)) { // Limit to 2 queries to save API calls
        const results = await unsplashService.searchPhotos(query, 1, 5);

        // Filter for relevance
        const relevantResults = results.results.filter(photo =>
          unsplashService.isRelevantPhoto(photo, selectedSpecies.englishName)
        );

        allResults.push(...relevantResults);

        if (allResults.length >= 3) break;
      }

      setSearchResults(allResults.slice(0, 5));
    } catch (error) {
      logError('Search failed:', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const importImage = async (photo: any) => {
    try {
      setImportStatus({ ...importStatus, [photo.id]: 'importing' });

      await axios.post('/api/images/import', {
        speciesId: selectedSpecies?.id,
        imageUrl: photo.urls.regular,
        sourceType: 'unsplash',
        sourceId: photo.id,
        photographer: {
          name: photo.user.name,
          url: photo.user.links.html
        }
      });

      // Track download with Unsplash
      await unsplashService.downloadPhoto(photo);

      setImportStatus({ ...importStatus, [photo.id]: 'success' });
      fetchStats();
    } catch (error: unknown) {
      logError('Import failed:', error instanceof Error ? error : new Error(String(error)));
      setImportStatus({ ...importStatus, [photo.id]: 'error' });
    }
  };

  const generatePrompts = async () => {
    try {
      const response = await axios.post('/api/images/generate-prompts');
      addToast('success', `Generated ${response.data.generated} prompts for species missing images`);
      fetchStats();
    } catch (err) {
      logError('Failed to generate prompts', err as Error);
      addToast('error', 'Failed to generate prompts');
    }
  };

  const rateLimitStatus = unsplashService.getRateLimitStatus();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Image Sourcing Pipeline</h2>

      {/* Stats Dashboard */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="font-semibold mb-3">Coverage Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">
                {stats.species_with_images}/{stats.total_species}
              </p>
              <p className="text-sm text-gray-600">Species with images</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_images}</p>
              <p className="text-sm text-gray-600">Total images</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending_prompts}</p>
              <p className="text-sm text-gray-600">Pending prompts</p>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limit Warning */}
      {rateLimitStatus.isLimited && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="font-semibold">Rate Limit Warning</p>
          <p className="text-sm">
            Only {rateLimitStatus.remaining} Unsplash requests remaining.
            Resets at {rateLimitStatus.resetTime?.toLocaleTimeString()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Species Selector */}
        <div>
          <h3 className="font-semibold mb-3">Select Species</h3>
          <div className="bg-white rounded-lg shadow-md p-4 max-h-96 overflow-y-auto">
            {species.map(s => (
              <button
                key={s.id}
                onClick={() => handleSpeciesSelect(s)}
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${
                  selectedSpecies?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <p className="font-medium">{s.englishName}</p>
                <p className="text-sm text-gray-600">{s.scientificName}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        <div>
          {selectedSpecies && (
            <>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">
                  Images for {selectedSpecies.englishName}
                </h3>
                <button
                  onClick={searchImages}
                  disabled={loading || rateLimitStatus.remaining < 1}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? 'Searching...' : 'Search Unsplash'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
                  {searchResults.map(photo => (
                    <div key={photo.id} className="flex gap-4">
                      <img
                        src={photo.urls.thumb}
                        alt={photo.alt_description}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {photo.description || photo.alt_description || 'No description'}
                        </p>
                        <p className="text-xs text-gray-600">
                          By {photo.user.name}
                        </p>
                        <button
                          onClick={() => importImage(photo)}
                          disabled={importStatus[photo.id] === 'importing'}
                          className={`mt-2 px-3 py-1 text-sm rounded ${
                            importStatus[photo.id] === 'success'
                              ? 'bg-green-500 text-white'
                              : importStatus[photo.id] === 'error'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {importStatus[photo.id] === 'importing' ? 'Importing...' :
                           importStatus[photo.id] === 'success' ? 'Imported' :
                           importStatus[photo.id] === 'error' ? 'Failed' :
                           'Import'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Generated Prompt */}
              {searchResults.length === 0 && generatedPrompt && (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h4 className="font-semibold mb-2">Generated Midjourney Prompt</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded font-mono">
                    {generatedPrompt}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Use this prompt when Unsplash doesn't have suitable images
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Batch Actions */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={generatePrompts}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Generate All Missing Prompts
        </button>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};