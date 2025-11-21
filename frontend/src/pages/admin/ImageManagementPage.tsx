/**
 * Image Management Admin Page
 *
 * CONCEPT: Admin interface for batch image collection and AI annotation
 * WHY: Streamline the process of collecting bird images and generating annotations
 * PATTERN: Multi-panel dashboard with job tracking and real-time progress
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useSpecies } from '../../hooks/useSpecies';
import { Card, CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Alert } from '../../components/ui/Alert';
import { api as axios } from '../../config/axios';
import { error as logError } from '../../utils/logger';
import { Species } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface ImageStats {
  totalImages: number;
  pendingAnnotation: number;
  annotated: number;
  failed: number;
  bySpecies: Record<string, number>;
}

interface QuotaStatus {
  unsplash: {
    remaining: number;
    limit: number;
    resetTime: string | null;
  };
  anthropic: {
    remaining: number;
    limit: number;
    resetTime: string | null;
  };
}

interface CollectionJob {
  id: string;
  type: 'collection' | 'annotation';
  status: 'pending' | 'running' | 'completed' | 'failed';
  speciesIds: string[];
  imagesPerSpecies?: number;
  progress: number;
  total: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  results?: {
    collected?: number;
    annotated?: number;
    failed?: number;
  };
}

interface CollectionRequest {
  speciesIds: string[];
  imagesPerSpecies: number;
}

interface AnnotationRequest {
  imageIds?: string[];
  annotateAll?: boolean;
}

type TabType = 'collection' | 'annotation' | 'statistics' | 'history';

// ============================================================================
// Query Keys
// ============================================================================

const imageManagementKeys = {
  all: ['image-management'] as const,
  stats: () => [...imageManagementKeys.all, 'stats'] as const,
  quota: () => [...imageManagementKeys.all, 'quota'] as const,
  jobs: () => [...imageManagementKeys.all, 'jobs'] as const,
  pendingImages: () => [...imageManagementKeys.all, 'pending-images'] as const,
};

// ============================================================================
// API Hooks
// ============================================================================

const useImageStats = () => {
  return useQuery({
    queryKey: imageManagementKeys.stats(),
    queryFn: async (): Promise<ImageStats> => {
      try {
        const response = await axios.get<{ data: ImageStats }>('/api/admin/images/stats');
        return response.data.data;
      } catch (err) {
        logError('Error fetching image stats:', err instanceof Error ? err : new Error(String(err)));
        return {
          totalImages: 0,
          pendingAnnotation: 0,
          annotated: 0,
          failed: 0,
          bySpecies: {},
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
  });
};

const useQuotaStatus = () => {
  return useQuery({
    queryKey: imageManagementKeys.quota(),
    queryFn: async (): Promise<QuotaStatus> => {
      try {
        const response = await axios.get<{ data: QuotaStatus }>('/api/admin/quota/status');
        return response.data.data;
      } catch (err) {
        logError('Error fetching quota status:', err instanceof Error ? err : new Error(String(err)));
        return {
          unsplash: { remaining: 50, limit: 50, resetTime: null },
          anthropic: { remaining: 1000, limit: 1000, resetTime: null },
        };
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
};

const useCollectionJobs = () => {
  return useQuery({
    queryKey: imageManagementKeys.jobs(),
    queryFn: async (): Promise<CollectionJob[]> => {
      try {
        const response = await axios.get<{ data: CollectionJob[] }>('/api/admin/jobs');
        return response.data.data;
      } catch (err) {
        logError('Error fetching jobs:', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    staleTime: 10 * 1000, // 10 seconds - jobs update frequently
    gcTime: 5 * 60 * 1000,
    refetchInterval: 5000, // Poll every 5 seconds for active jobs
  });
};

const usePendingImages = () => {
  return useQuery({
    queryKey: imageManagementKeys.pendingImages(),
    queryFn: async (): Promise<{ id: string; speciesId: string; url: string; createdAt: string }[]> => {
      try {
        const response = await axios.get<{ data: { id: string; speciesId: string; url: string; createdAt: string }[] }>(
          '/api/admin/images/pending'
        );
        return response.data.data;
      } catch (err) {
        logError('Error fetching pending images:', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

const useCollectImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CollectionRequest): Promise<CollectionJob> => {
      const response = await axios.post<{ data: CollectionJob }>('/api/admin/images/collect', request);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.stats() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.quota() });
    },
    onError: (err) => {
      logError('Error starting image collection:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

const useStartAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AnnotationRequest): Promise<CollectionJob> => {
      const response = await axios.post<{ data: CollectionJob }>('/api/admin/images/annotate', request);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.stats() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.quota() });
      queryClient.invalidateQueries({ queryKey: imageManagementKeys.pendingImages() });
    },
    onError: (err) => {
      logError('Error starting annotation:', err instanceof Error ? err : new Error(String(err)));
    },
  });
};

// ============================================================================
// Components
// ============================================================================

interface SpeciesMultiSelectProps {
  species: Species[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

const SpeciesMultiSelect: React.FC<SpeciesMultiSelectProps> = ({
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

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const useToast = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((type: ToastNotification['type'], message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
};

const ToastContainer: React.FC<{
  toasts: ToastNotification[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Alert
          key={toast.id}
          variant={toast.type === 'success' ? 'success' : toast.type === 'error' ? 'danger' : 'info'}
          onClose={() => onRemove(toast.id)}
        >
          {toast.message}
        </Alert>
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ImageManagementPage: React.FC = () => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { data: species = [], isLoading: speciesLoading } = useSpecies();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useImageStats();
  const { data: quota, isLoading: quotaLoading } = useQuotaStatus();
  const { data: jobs = [], isLoading: jobsLoading } = useCollectionJobs();
  const { data: pendingImages = [] } = usePendingImages();

  const collectMutation = useCollectImages();
  const annotateMutation = useStartAnnotation();

  const { toasts, addToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('collection');
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [imagesPerSpecies, setImagesPerSpecies] = useState(2);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [annotateAllPending, setAnnotateAllPending] = useState(true);

  // Check for active jobs and poll more frequently
  const hasActiveJobs = jobs.some((j) => j.status === 'running' || j.status === 'pending');

  useEffect(() => {
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        refetchStats();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [hasActiveJobs, refetchStats]);

  // Handle collection submission
  const handleCollectImages = async () => {
    if (selectedSpecies.length === 0) {
      addToast('error', 'Please select at least one species');
      return;
    }

    try {
      await collectMutation.mutateAsync({
        speciesIds: selectedSpecies,
        imagesPerSpecies,
      });
      addToast('success', `Started collecting images for ${selectedSpecies.length} species`);
      setSelectedSpecies([]);
    } catch {
      addToast('error', 'Failed to start image collection');
    }
  };

  // Handle annotation submission
  const handleStartAnnotation = async () => {
    try {
      if (annotateAllPending) {
        await annotateMutation.mutateAsync({ annotateAll: true });
        addToast('success', 'Started annotation for all pending images');
      } else {
        if (selectedImages.length === 0) {
          addToast('error', 'Please select at least one image');
          return;
        }
        await annotateMutation.mutateAsync({ imageIds: selectedImages });
        addToast('success', `Started annotation for ${selectedImages.length} images`);
        setSelectedImages([]);
      }
    } catch {
      addToast('error', 'Failed to start annotation');
    }
  };

  // Loading states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth check
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access image management.</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const isLoading = speciesLoading || statsLoading || quotaLoading || jobsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Image Management</h1>
              <p className="text-gray-600 mt-1">
                Collect bird images and manage AI annotations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/admin/annotations"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                View Annotations
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b border-gray-200">
            {[
              { key: 'collection', label: 'Image Collection' },
              { key: 'annotation', label: 'Batch Annotation' },
              { key: 'statistics', label: 'Statistics' },
              { key: 'history', label: 'Job History' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading data...</span>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Image Collection Tab */}
            {activeTab === 'collection' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Collection Form */}
                <Card variant="elevated" padding="lg">
                  <CardHeader
                    title="Collect Images"
                    subtitle="Select species and configure collection parameters"
                  />
                  <CardBody>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Bird Species
                        </label>
                        <SpeciesMultiSelect
                          species={species}
                          selected={selectedSpecies}
                          onChange={setSelectedSpecies}
                          disabled={collectMutation.isPending}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Images per Species
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={imagesPerSpecies}
                          onChange={(e) => setImagesPerSpecies(parseInt(e.target.value) || 2)}
                          disabled={collectMutation.isPending}
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Recommended: 2-5 images per species
                        </p>
                      </div>

                      {quota && quota.unsplash.remaining < 10 && (
                        <Alert variant="warning" title="Low API Quota">
                          Only {quota.unsplash.remaining} Unsplash requests remaining.
                          {quota.unsplash.resetTime && (
                            <span> Resets at {new Date(quota.unsplash.resetTime).toLocaleTimeString()}</span>
                          )}
                        </Alert>
                      )}
                    </div>
                  </CardBody>
                  <CardFooter>
                    <Button
                      variant="primary"
                      onClick={handleCollectImages}
                      isLoading={collectMutation.isPending}
                      disabled={selectedSpecies.length === 0 || collectMutation.isPending}
                    >
                      Collect Images ({selectedSpecies.length} species)
                    </Button>
                  </CardFooter>
                </Card>

                {/* Active Jobs Preview */}
                <Card variant="elevated" padding="lg">
                  <CardHeader
                    title="Active Jobs"
                    subtitle="Currently running collection and annotation jobs"
                  />
                  <CardBody>
                    {jobs.filter((j) => j.status === 'running' || j.status === 'pending').length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p>No active jobs</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobs
                          .filter((j) => j.status === 'running' || j.status === 'pending')
                          .map((job) => (
                            <div key={job.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium capitalize">{job.type}</span>
                                <Badge
                                  variant={job.status === 'running' ? 'primary' : 'warning'}
                                  dot
                                >
                                  {job.status}
                                </Badge>
                              </div>
                              <ProgressBar
                                value={job.progress}
                                max={job.total}
                                variant="gradient"
                                color="primary"
                                showLabel
                                animated={job.status === 'running'}
                              />
                              <p className="text-sm text-gray-500 mt-2">
                                {job.progress} / {job.total} completed
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Batch Annotation Tab */}
            {activeTab === 'annotation' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Annotation Form */}
                <Card variant="elevated" padding="lg">
                  <CardHeader
                    title="Start Annotation"
                    subtitle="Generate AI annotations for bird images"
                  />
                  <CardBody>
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            checked={annotateAllPending}
                            onChange={() => setAnnotateAllPending(true)}
                            disabled={annotateMutation.isPending}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-medium">
                            Annotate all un-annotated images ({stats?.pendingAnnotation || 0} images)
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            checked={!annotateAllPending}
                            onChange={() => setAnnotateAllPending(false)}
                            disabled={annotateMutation.isPending}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-medium">Select specific images</span>
                        </label>
                      </div>

                      {!annotateAllPending && (
                        <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                          {pendingImages.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No pending images</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {pendingImages.map((img) => (
                                <label
                                  key={img.id}
                                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                    selectedImages.includes(img.id)
                                      ? 'border-blue-500 ring-2 ring-blue-200'
                                      : 'border-transparent hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedImages.includes(img.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedImages([...selectedImages, img.id]);
                                      } else {
                                        setSelectedImages(selectedImages.filter((id) => id !== img.id));
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <img
                                    src={img.url}
                                    alt="Bird"
                                    className="w-full h-20 object-cover"
                                  />
                                  {selectedImages.includes(img.id) && (
                                    <div className="absolute top-1 right-1 bg-blue-600 rounded-full p-0.5">
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {quota && quota.anthropic.remaining < 100 && (
                        <Alert variant="warning" title="Low API Quota">
                          Only {quota.anthropic.remaining} Anthropic requests remaining.
                          {quota.anthropic.resetTime && (
                            <span> Resets at {new Date(quota.anthropic.resetTime).toLocaleTimeString()}</span>
                          )}
                        </Alert>
                      )}
                    </div>
                  </CardBody>
                  <CardFooter>
                    <Button
                      variant="primary"
                      onClick={handleStartAnnotation}
                      isLoading={annotateMutation.isPending}
                      disabled={
                        annotateMutation.isPending ||
                        (!annotateAllPending && selectedImages.length === 0) ||
                        (annotateAllPending && (stats?.pendingAnnotation || 0) === 0)
                      }
                    >
                      Start Annotation
                    </Button>
                  </CardFooter>
                </Card>

                {/* Annotation Progress */}
                <Card variant="elevated" padding="lg">
                  <CardHeader
                    title="Annotation Progress"
                    subtitle="Real-time annotation status"
                  />
                  <CardBody>
                    {jobs.filter((j) => j.type === 'annotation' && (j.status === 'running' || j.status === 'pending')).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        <p>No annotation jobs running</p>
                        <p className="text-sm mt-1">Start an annotation job to see progress here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobs
                          .filter((j) => j.type === 'annotation' && (j.status === 'running' || j.status === 'pending'))
                          .map((job) => (
                            <div key={job.id} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge variant={job.status === 'running' ? 'success' : 'warning'} dot>
                                  {job.status === 'running' ? 'Processing' : 'Queued'}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  Started {new Date(job.startedAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <ProgressBar
                                value={job.progress}
                                max={job.total}
                                variant="striped"
                                color="success"
                                size="lg"
                                showLabel
                                label="Annotation Progress"
                                animated
                              />
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-green-50 rounded-lg p-2">
                                  <div className="text-lg font-bold text-green-600">
                                    {job.results?.annotated || 0}
                                  </div>
                                  <div className="text-xs text-green-700">Annotated</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-2">
                                  <div className="text-lg font-bold text-yellow-600">
                                    {job.total - job.progress}
                                  </div>
                                  <div className="text-xs text-yellow-700">Remaining</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-2">
                                  <div className="text-lg font-bold text-red-600">
                                    {job.results?.failed || 0}
                                  </div>
                                  <div className="text-xs text-red-700">Failed</div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'statistics' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card variant="elevated" padding="md">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{stats?.totalImages || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Total Images</div>
                    </div>
                  </Card>
                  <Card variant="elevated" padding="md">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600">{stats?.pendingAnnotation || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Pending Annotation</div>
                    </div>
                  </Card>
                  <Card variant="elevated" padding="md">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{stats?.annotated || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Annotated</div>
                    </div>
                  </Card>
                  <Card variant="elevated" padding="md">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{stats?.failed || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Failed</div>
                    </div>
                  </Card>
                </div>

                {/* API Quota Status */}
                <Card variant="elevated" padding="lg">
                  <CardHeader title="API Quota Status" subtitle="Current usage and limits" />
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Unsplash API</h4>
                        <ProgressBar
                          value={quota?.unsplash.remaining || 0}
                          max={quota?.unsplash.limit || 50}
                          variant="gradient"
                          color={
                            (quota?.unsplash.remaining || 0) < 10
                              ? 'danger'
                              : (quota?.unsplash.remaining || 0) < 25
                              ? 'warning'
                              : 'success'
                          }
                          showLabel
                          label="Requests Remaining"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          {quota?.unsplash.remaining || 0} / {quota?.unsplash.limit || 50} requests
                          {quota?.unsplash.resetTime && (
                            <span className="ml-2">
                              (Resets: {new Date(quota.unsplash.resetTime).toLocaleString()})
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Anthropic API</h4>
                        <ProgressBar
                          value={quota?.anthropic.remaining || 0}
                          max={quota?.anthropic.limit || 1000}
                          variant="gradient"
                          color={
                            (quota?.anthropic.remaining || 0) < 100
                              ? 'danger'
                              : (quota?.anthropic.remaining || 0) < 500
                              ? 'warning'
                              : 'success'
                          }
                          showLabel
                          label="Tokens Remaining"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          {quota?.anthropic.remaining || 0} / {quota?.anthropic.limit || 1000} requests
                          {quota?.anthropic.resetTime && (
                            <span className="ml-2">
                              (Resets: {new Date(quota.anthropic.resetTime).toLocaleString()})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Images by Species */}
                <Card variant="elevated" padding="lg">
                  <CardHeader title="Images by Species" subtitle="Distribution of collected images" />
                  <CardBody>
                    {stats?.bySpecies && Object.keys(stats.bySpecies).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(stats.bySpecies)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 12)
                          .map(([speciesId, count]) => {
                            const sp = species.find((s) => s.id === speciesId);
                            return (
                              <div
                                key={speciesId}
                                className="bg-gray-50 rounded-lg p-3 text-center"
                              >
                                <div className="text-xl font-bold text-gray-800">{count}</div>
                                <div className="text-xs text-gray-600 truncate" title={sp?.englishName || speciesId}>
                                  {sp?.englishName || speciesId}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No images collected yet</p>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Job History Tab */}
            {activeTab === 'history' && (
              <Card variant="elevated" padding="lg">
                <CardHeader title="Job History" subtitle="Recent collection and annotation jobs" />
                <CardBody>
                  {jobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <p>No jobs yet</p>
                      <p className="text-sm mt-1">Start collecting or annotating images to see job history</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Progress</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Started</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Completed</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Results</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.map((job) => (
                            <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <Badge
                                  variant={job.type === 'collection' ? 'primary' : 'info'}
                                  size="sm"
                                >
                                  {job.type}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant={
                                    job.status === 'completed'
                                      ? 'success'
                                      : job.status === 'failed'
                                      ? 'danger'
                                      : job.status === 'running'
                                      ? 'primary'
                                      : 'warning'
                                  }
                                  dot
                                  size="sm"
                                >
                                  {job.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <ProgressBar
                                    value={job.progress}
                                    max={job.total}
                                    size="sm"
                                    color={job.status === 'failed' ? 'danger' : 'primary'}
                                    className="w-24"
                                  />
                                  <span className="text-sm text-gray-600">
                                    {job.progress}/{job.total}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {new Date(job.startedAt).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                              </td>
                              <td className="py-3 px-4">
                                {job.results ? (
                                  <div className="text-sm">
                                    {job.type === 'collection' && (
                                      <span className="text-green-600">
                                        {job.results.collected} collected
                                      </span>
                                    )}
                                    {job.type === 'annotation' && (
                                      <>
                                        <span className="text-green-600">
                                          {job.results.annotated} annotated
                                        </span>
                                        {job.results.failed && job.results.failed > 0 && (
                                          <span className="text-red-600 ml-2">
                                            {job.results.failed} failed
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ) : job.error ? (
                                  <span className="text-sm text-red-600" title={job.error}>
                                    Error
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default ImageManagementPage;
