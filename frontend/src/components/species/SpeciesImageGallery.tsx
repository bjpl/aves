import React, { useState } from 'react';
import { SpeciesImage } from '../../../../shared/types/species.types';
import { LazyImage } from '../ui/LazyImage';

interface SpeciesImageGalleryProps {
  images: SpeciesImage[];
  speciesName: string;
}

export const SpeciesImageGallery: React.FC<SpeciesImageGalleryProps> = ({ images, speciesName }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
    document.body.style.overflow = 'unset';
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;

    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') navigateImage('prev');
    if (e.key === 'ArrowRight') navigateImage('next');
    if (e.key === 'Escape') closeLightbox();
  };

  // Show single primary image if only one image
  if (images.length === 1) {
    return (
      <div
        className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 relative cursor-pointer hover:opacity-95 transition-opacity"
        onClick={() => openLightbox(0)}
      >
        <LazyImage
          src={images[0].url || images[0].thumbnailUrl || ''}
          alt={speciesName}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700 shadow-md">
          Click to enlarge
        </div>

        {/* Lightbox for single image */}
        {selectedImageIndex !== null && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={closeLightbox}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
            aria-label="Image viewer"
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={images[0].url || images[0].thumbnailUrl || ''}
                alt={speciesName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Gallery view for multiple images
  return (
    <div className="space-y-3">
      {/* Image count badge */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </span>
        </div>
        <span className="text-xs text-gray-500">Click to view full size</span>
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 relative cursor-pointer rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
            onClick={() => openLightbox(index)}
          >
            <LazyImage
              src={image.thumbnailUrl || image.url}
              alt={`${speciesName} - Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {image.annotationCount !== undefined && image.annotationCount > 0 && (
              <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
                {image.annotationCount} terms
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox modal */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label="Image gallery viewer"
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateImage('prev');
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3 z-10"
            aria-label="Previous image"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Image */}
          <div className="max-w-6xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[selectedImageIndex].url || images[selectedImageIndex].thumbnailUrl || ''}
              alt={`${speciesName} - Image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
            />

            {/* Image counter */}
            <div className="mt-4 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
              {selectedImageIndex + 1} / {images.length}
              {images[selectedImageIndex].annotationCount !== undefined && images[selectedImageIndex].annotationCount! > 0 && (
                <span className="ml-3 text-blue-300">
                  • {images[selectedImageIndex].annotationCount} learning annotations
                </span>
              )}
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateImage('next');
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3 z-10"
            aria-label="Next image"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default SpeciesImageGallery;
