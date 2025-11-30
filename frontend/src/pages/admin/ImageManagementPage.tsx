/**
 * Image Management Admin Page
 *
 * CONCEPT: Admin interface for batch image collection and AI annotation
 * WHY: Streamline the process of collecting bird images and generating annotations
 * PATTERN: Multi-panel dashboard with job tracking and real-time progress
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useSpecies } from '../../hooks/useSpecies';
import { Card, CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Alert } from '../../components/ui/Alert';
import { ImageGalleryTab } from '../../components/admin/ImageGalleryTab';
import {
  TabType,
  SpeciesMultiSelect,
  ToastContainer,
  BulkActionToolbar,
  DeleteConfirmationModal,
  useImageManagement,
  useToast,
  DashboardSkeleton,
} from '../../components/admin/image-management';

export const ImageManagementPage: React.FC = () => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { data: species = [], isLoading: speciesLoading } = useSpecies();

  const {
    stats,
    quota,
    jobs,
    pendingImages,
    isLoading: dataLoading,
    hasActiveJobs,
    refetchStats,
    collectMutation,
    annotateMutation,
    bulkDeleteMutation,
    bulkAnnotateMutation,
  } = useImageManagement();

  const { toasts, addToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('collection');
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [imagesPerSpecies, setImagesPerSpecies] = useState(2);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [annotateAllPending, setAnnotateAllPending] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gallerySelectedImages, setGallerySelectedImages] = useState<string[]>([]);

  // Note: Smart polling is now handled in useImageManagement hook
  // The hook automatically polls when hasActiveJobs is true

  // Collection handler
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

  // Annotation handler
  const handleStartAnnotation = async () => {
    try {
      if (annotateAllPending) {
        await annotateMutation.mutateAsync({ all: true });
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

  // Bulk delete handler
  const handleBulkDelete = async () => {
    try {
      const result = await bulkDeleteMutation.mutateAsync(gallerySelectedImages);
      addToast('success', result.message);
      setGallerySelectedImages([]);
      setShowDeleteModal(false);
      refetchStats();
    } catch {
      addToast('error', 'Failed to delete images');
    }
  };

  // Bulk annotate handler
  const handleBulkAnnotate = async () => {
    try {
      const result = await bulkAnnotateMutation.mutateAsync(gallerySelectedImages);
      addToast('success', result.message);
      setGallerySelectedImages([]);
    } catch {
      addToast('error', 'Failed to start bulk annotation');
    }
  };

  // Loading state
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

  const isLoading = speciesLoading || dataLoading;

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
              { key: 'gallery', label: 'Gallery' },
              { key: 'annotation', label: 'Batch Annotation' },
              { key: 'statistics', label: 'Statistics' },
              { key: 'history', label: 'Job History' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`relative px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {/* Badge showing selected images count */}
                {tab.key === 'annotation' && gallerySelectedImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {gallerySelectedImages.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && (
          <DashboardSkeleton activeTab={activeTab} />
        )}

        {!isLoading && (
          <>
            {/* Image Collection Tab */}
            {activeTab === 'collection' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                {/* Active Jobs Preview - Component extracted inline for brevity */}
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

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <ImageGalleryTab
                species={species}
                onToast={addToast}
                selectedImages={gallerySelectedImages}
                onSelectionChange={setGallerySelectedImages}
              />
            )}

            {/* Batch Annotation Tab */}
            {activeTab === 'annotation' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="elevated" padding="lg">
                  <CardHeader
                    title="Batch Annotation"
                    subtitle="Generate AI annotations for multiple images"
                  />
                  <CardBody>
                    <div className="space-y-4">
                      {/* Help text */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">How Batch Annotation Works:</p>
                            <ol className="list-decimal list-inside space-y-1 text-blue-700">
                              <li>Go to the <strong>Gallery</strong> tab</li>
                              <li>Select images using the checkboxes</li>
                              <li>Click "Annotate Selected" in the toolbar</li>
                              <li>Monitor progress in real-time below</li>
                            </ol>
                            <p className="mt-2 text-blue-700">
                              Or use the quick options below to annotate all pending images at once.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quick action: Selected from Gallery */}
                      {gallerySelectedImages.length > 0 && (
                        <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-5 h-5 text-blue-600"
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
                              <span className="font-medium text-blue-900">
                                {gallerySelectedImages.length} image{gallerySelectedImages.length !== 1 ? 's' : ''} selected from Gallery
                              </span>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setGallerySelectedImages([])}
                            >
                              Clear
                            </Button>
                          </div>
                          <p className="text-sm text-blue-700 mb-3">
                            Ready to annotate your selected images with AI-generated vocabulary terms.
                          </p>
                          <Button
                            variant="primary"
                            onClick={handleBulkAnnotate}
                            isLoading={bulkAnnotateMutation.isPending}
                            disabled={bulkAnnotateMutation.isPending}
                            className="w-full"
                          >
                            <svg
                              className="w-4 h-4 mr-2"
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
                            Annotate {gallerySelectedImages.length} Selected Image{gallerySelectedImages.length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      )}

                      {/* Quick action: All pending */}
                      {gallerySelectedImages.length === 0 && (
                        <>
                          <div className="border rounded-lg p-4">
                            <label className="flex items-start space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                checked={annotateAllPending}
                                onChange={() => setAnnotateAllPending(true)}
                                disabled={annotateMutation.isPending}
                                className="w-4 h-4 text-blue-600 mt-0.5"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">
                                  Annotate all un-annotated images
                                </span>
                                <p className="text-sm text-gray-600 mt-1">
                                  Process all {stats?.pendingAnnotation || 0} images without annotations
                                </p>
                              </div>
                            </label>
                          </div>

                          <div className="border rounded-lg p-4">
                            <label className="flex items-start space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                checked={!annotateAllPending}
                                onChange={() => setAnnotateAllPending(false)}
                                disabled={annotateMutation.isPending}
                                className="w-4 h-4 text-blue-600 mt-0.5"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">
                                  Select specific pending images
                                </span>
                                <p className="text-sm text-gray-600 mt-1">
                                  Choose individual images from the list below
                                </p>
                              </div>
                            </label>
                          </div>

                          {!annotateAllPending && (
                            <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50">
                              {pendingImages.length === 0 ? (
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
                                  <p className="font-medium">All images are annotated!</p>
                                  <p className="text-sm mt-1">No pending images to process</p>
                                </div>
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
                        </>
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
                    {gallerySelectedImages.length === 0 && (
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
                        <svg
                          className="w-4 h-4 mr-2"
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
                        Start Annotation
                      </Button>
                    )}
                  </CardFooter>
                </Card>

                {/* Annotation Progress - Component extracted inline for brevity */}
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

                <Card variant="elevated" padding="lg">
                  <CardHeader title="Images by Species" subtitle="Distribution of collected images - click to filter gallery" />
                  <CardBody>
                    {stats?.bySpecies && Object.keys(stats.bySpecies).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(stats.bySpecies)
                          .sort(([, a], [, b]) => {
                            const countA = typeof a === 'number' ? a : a.count;
                            const countB = typeof b === 'number' ? b : b.count;
                            return countB - countA;
                          })
                          .slice(0, 12)
                          .map(([speciesName, data]) => {
                            const count = typeof data === 'number' ? data : data.count;
                            const sampleImageUrl = typeof data === 'object' && data.sampleImageUrl ? data.sampleImageUrl : null;
                            const speciesId = typeof data === 'object' && data.speciesId ? data.speciesId : null;

                            return (
                              <button
                                key={speciesName}
                                onClick={() => {
                                  setActiveTab('gallery');
                                }}
                                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-gray-200 hover:border-blue-400 text-left group"
                                title={`View ${count} ${speciesName} image${count !== 1 ? 's' : ''}`}
                              >
                                {/* Image Thumbnail */}
                                {sampleImageUrl ? (
                                  <div className="relative aspect-[4/3] bg-gray-100">
                                    <img
                                      src={sampleImageUrl}
                                      alt={speciesName}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                      <span className="opacity-0 group-hover:opacity-100 text-white font-medium text-sm bg-blue-600 px-3 py-1 rounded-full transition-opacity">
                                        View All
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}

                                {/* Species Info */}
                                <div className="p-3">
                                  <div className="text-xl font-bold text-gray-800 mb-1">{count}</div>
                                  <div className="text-sm text-gray-600 truncate" title={speciesName}>
                                    {speciesName}
                                  </div>
                                </div>
                              </button>
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
        count={gallerySelectedImages.length}
        isDeleting={bulkDeleteMutation.isPending}
      />
    </div>
  );
};

export default ImageManagementPage;
