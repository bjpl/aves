import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpeciesImageGallery } from '../SpeciesImageGallery';
import { SpeciesImage } from '../../../../../shared/types/species.types';

describe('SpeciesImageGallery', () => {
  const mockImages: SpeciesImage[] = [
    {
      id: '1',
      url: 'https://example.com/image1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      annotationCount: 5
    },
    {
      id: '2',
      url: 'https://example.com/image2.jpg',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      annotationCount: 3
    },
    {
      id: '3',
      url: 'https://example.com/image3.jpg',
      thumbnailUrl: 'https://example.com/thumb3.jpg',
      annotationCount: 0
    }
  ];

  it('renders nothing when no images provided', () => {
    const { container } = render(
      <SpeciesImageGallery images={[]} speciesName="Test Bird" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders single image with enlarge prompt', () => {
    const singleImage: SpeciesImage[] = [{
      id: '1',
      url: 'https://example.com/image1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg'
    }];

    render(<SpeciesImageGallery images={singleImage} speciesName="Test Bird" />);
    expect(screen.getByText('Click to enlarge')).toBeInTheDocument();
  });

  it('renders image count badge for multiple images', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);
    expect(screen.getByText('3 images')).toBeInTheDocument();
  });

  it('renders thumbnail grid for multiple images', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    // Check that all images are rendered - use container query since LazyImage has aria-hidden
    const container = document.querySelector('.grid');
    expect(container).toBeInTheDocument();
    expect(container?.children.length).toBe(mockImages.length);
  });

  it('displays annotation count badges on thumbnails', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    expect(screen.getByText('5 terms')).toBeInTheDocument();
    expect(screen.getByText('3 terms')).toBeInTheDocument();
  });

  it('opens lightbox when thumbnail is clicked', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    // Click on the thumbnail container
    const thumbnailContainers = document.querySelectorAll('.grid > div');
    fireEvent.click(thumbnailContainers[0]);

    // Lightbox should be visible with image counter
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('navigates between images in lightbox', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    // Open lightbox
    const thumbnailContainers = document.querySelectorAll('.grid > div');
    fireEvent.click(thumbnailContainers[0]);

    // Click next button
    const nextButton = screen.getByLabelText('Next image');
    fireEvent.click(nextButton);

    // Counter should show second image
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('closes lightbox when close button is clicked', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    // Open lightbox
    const thumbnailContainers = document.querySelectorAll('.grid > div');
    fireEvent.click(thumbnailContainers[0]);

    // Close lightbox
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    // Lightbox should be closed
    expect(screen.queryByText(/1 \/ 3/)).not.toBeInTheDocument();
  });

  it('wraps around when navigating past last image', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    // Open lightbox on last image
    const thumbnailContainers = document.querySelectorAll('.grid > div');
    fireEvent.click(thumbnailContainers[2]);

    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();

    // Click next - should wrap to first
    const nextButton = screen.getByLabelText('Next image');
    fireEvent.click(nextButton);

    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('wraps around when navigating before first image', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    // Open lightbox on first image
    const thumbnailContainers = document.querySelectorAll('.grid > div');
    fireEvent.click(thumbnailContainers[0]);

    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();

    // Click previous - should wrap to last
    const prevButton = screen.getByLabelText('Previous image');
    fireEvent.click(prevButton);

    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();
  });

  it('shows annotation count in lightbox when available', () => {
    render(<SpeciesImageGallery images={mockImages} speciesName="Test Bird" />);

    // Open lightbox on image with annotations
    const thumbnailContainers = document.querySelectorAll('.grid > div');
    fireEvent.click(thumbnailContainers[0]);

    expect(screen.getByText(/5 learning annotations/)).toBeInTheDocument();
  });
});
