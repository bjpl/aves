import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { VocabularyPanel } from '../../../components/learn/VocabularyPanel';

// Use regular render since test-utils already includes router
const renderWithRouter = (component: React.ReactElement) => {
  return render(component);
};

describe('VocabularyPanel', () => {
  const sampleAnnotations = [
    {
      id: 'ann-1',
      term: 'Pico',
      english: 'Beak',
      pronunciation: 'PEE-koh',
      description: 'The hard part of a bird\'s mouth',
    },
    {
      id: 'ann-2',
      term: 'Ala',
      english: 'Wing',
      pronunciation: 'AH-lah',
      description: 'Used for flying',
    },
    {
      id: 'ann-3',
      term: 'Cola',
      english: 'Tail',
      pronunciation: 'KOH-lah',
      description: 'Tail feathers',
    },
  ];

  const defaultProps = {
    selectedAnnotation: null,
    birdAnnotations: sampleAnnotations,
    birdName: 'Robin',
    discoveredTerms: new Set<string>(),
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      expect(screen.getByText('Vocabulary Details')).toBeInTheDocument();
    });

    it('should display header', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      expect(screen.getByText('Vocabulary Details')).toBeInTheDocument();
    });

    it('should use sticky positioning', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const panel = container.querySelector('.sticky.top-4');
      expect(panel).toBeInTheDocument();
    });

    it('should apply white background', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const panel = container.querySelector('.bg-white');
      expect(panel).toBeInTheDocument();
    });

    it('should apply shadow and rounded corners', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const panel = container.querySelector('.shadow-lg.rounded-lg');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show placeholder when no annotation selected', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      expect(screen.getByText('Click on a highlighted area to see details')).toBeInTheDocument();
    });

    it('should display eye icon in empty state', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should center empty state content', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const emptyState = container.querySelector('.text-center.py-8');
      expect(emptyState).toBeInTheDocument();
    });

    it('should use gray color for empty state', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const message = screen.getByText('Click on a highlighted area to see details');
      expect(message.parentElement).toHaveClass('text-gray-500');
    });
  });

  describe('Selected Annotation Display', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedAnnotation: sampleAnnotations[0],
    };

    it('should display Spanish term', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('Pico')).toBeInTheDocument();
    });

    it('should display pronunciation', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('PEE-koh')).toBeInTheDocument();
    });

    it('should display English translation', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('Beak')).toBeInTheDocument();
    });

    it('should display description', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('The hard part of a bird\'s mouth')).toBeInTheDocument();
    });

    it('should show English label', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('English:')).toBeInTheDocument();
    });

    it('should show Description label', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('Description:')).toBeInTheDocument();
    });

    it('should apply large bold text to Spanish term', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      const term = screen.getByText('Pico');
      expect(term).toHaveClass('text-2xl', 'font-bold');
    });

    it('should style pronunciation as italic', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      const pronunciation = screen.getByText('PEE-koh');
      expect(pronunciation).toHaveClass('italic');
    });
  });

  describe('Practice Button', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedAnnotation: sampleAnnotations[0],
    };

    it('should show practice button when annotation selected', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('Practice This Term')).toBeInTheDocument();
    });

    it('should link to practice page', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      const link = screen.getByText('Practice This Term').closest('a');
      expect(link).toHaveAttribute('href', '/practice');
    });

    it('should style button with green background', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      const link = screen.getByText('Practice This Term').closest('a');
      expect(link).toHaveClass('bg-green-500', 'text-white');
    });

    it('should have hover effect', () => {
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      const link = screen.getByText('Practice This Term').closest('a');
      expect(link).toHaveClass('hover:bg-green-600');
    });

    it('should not show practice button in empty state', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      expect(screen.queryByText('Practice This Term')).not.toBeInTheDocument();
    });
  });

  describe('Terms List', () => {
    it('should display bird name in terms section', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      expect(screen.getByText('Terms for Robin:')).toBeInTheDocument();
    });

    it('should list all bird annotations', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      expect(screen.getByText('Pico')).toBeInTheDocument();
      expect(screen.getByText('Ala')).toBeInTheDocument();
      expect(screen.getByText('Cola')).toBeInTheDocument();
    });

    it('should show undiscovered terms in gray', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const grayTerms = container.querySelectorAll('.bg-gray-50.text-gray-400');
      expect(grayTerms.length).toBe(3);
    });

    it('should show discovered terms in green', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithDiscovered} />);
      const greenTerms = container.querySelectorAll('.bg-green-50.text-green-700');
      expect(greenTerms.length).toBe(1);
    });

    it('should show checkmark on discovered terms', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1', 'ann-2']),
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithDiscovered} />);
      const checkmarks = container.querySelectorAll('svg');
      // Should have checkmarks for discovered terms
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should not show checkmark on undiscovered terms', () => {
      const propsWithPartialDiscovery = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
        selectedAnnotation: null,
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithPartialDiscovery} />);

      // Check that only one checkmark exists
      const terms = container.querySelectorAll('.bg-green-50');
      expect(terms.length).toBe(1);
    });

    it('should separate terms list with border', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const separator = container.querySelector('.border-t');
      expect(separator).toBeInTheDocument();
    });

    it('should apply spacing to terms list', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const termsList = container.querySelector('.space-y-2');
      expect(termsList).toBeInTheDocument();
    });
  });

  describe('Different Annotations', () => {
    it('should update display when different annotation selected', () => {
      const { rerender } = renderWithRouter(
        <VocabularyPanel {...defaultProps} selectedAnnotation={sampleAnnotations[0]} />
      );
      expect(screen.getByText('Pico')).toBeInTheDocument();

      rerender(
        <VocabularyPanel {...defaultProps} selectedAnnotation={sampleAnnotations[1]} />
      );
      expect(screen.getByText('Ala')).toBeInTheDocument();
      expect(screen.getByText('Wing')).toBeInTheDocument();
    });

    it('should display all annotation details correctly', () => {
      const propsWithWing = {
        ...defaultProps,
        selectedAnnotation: sampleAnnotations[1],
      };
      renderWithRouter(<VocabularyPanel {...propsWithWing} />);

      expect(screen.getByText('Ala')).toBeInTheDocument();
      expect(screen.getByText('AH-lah')).toBeInTheDocument();
      expect(screen.getByText('Wing')).toBeInTheDocument();
      expect(screen.getByText('Used for flying')).toBeInTheDocument();
    });
  });

  describe('Discovery Progress', () => {
    it('should track multiple discovered terms', () => {
      const propsWithMultipleDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1', 'ann-2', 'ann-3']),
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithMultipleDiscovered} />);

      const discoveredTerms = container.querySelectorAll('.bg-green-50');
      expect(discoveredTerms.length).toBe(3);
    });

    it('should handle partial discovery', () => {
      const propsWithPartial = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-2']),
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithPartial} />);

      const discoveredTerms = container.querySelectorAll('.bg-green-50');
      const undiscoveredTerms = container.querySelectorAll('.bg-gray-50');

      expect(discoveredTerms.length).toBe(1);
      expect(undiscoveredTerms.length).toBe(2);
    });

    it('should show all terms as undiscovered initially', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const undiscoveredTerms = container.querySelectorAll('.bg-gray-50.text-gray-400');
      expect(undiscoveredTerms.length).toBe(3);
    });
  });

  describe('Layout and Styling', () => {
    it('should use padding on panel', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const panel = container.querySelector('.p-6');
      expect(panel).toBeInTheDocument();
    });

    it('should space sections vertically', () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedAnnotation: sampleAnnotations[0],
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      const spacedSections = container.querySelector('.space-y-4');
      expect(spacedSections).toBeInTheDocument();
    });

    it('should use flex layout for term items', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const flexItems = container.querySelectorAll('.flex.items-center.justify-between');
      expect(flexItems.length).toBeGreaterThan(0);
    });

    it('should apply rounded corners to term items', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const roundedItems = container.querySelectorAll('.rounded');
      expect(roundedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty annotations array', () => {
      const emptyProps = {
        ...defaultProps,
        birdAnnotations: [],
      };
      renderWithRouter(<VocabularyPanel {...emptyProps} />);
      expect(screen.getByText('Terms for Robin:')).toBeInTheDocument();
    });

    it('should handle single annotation', () => {
      const singleProps = {
        ...defaultProps,
        birdAnnotations: [sampleAnnotations[0]],
      };
      const { container } = renderWithRouter(<VocabularyPanel {...singleProps} />);
      const terms = container.querySelectorAll('.flex.items-center');
      expect(terms.length).toBe(1);
    });

    it('should handle bird name with special characters', () => {
      const specialProps = {
        ...defaultProps,
        birdName: 'Ñandú',
      };
      renderWithRouter(<VocabularyPanel {...specialProps} />);
      expect(screen.getByText('Terms for Ñandú:')).toBeInTheDocument();
    });

    it('should handle annotation with long description', () => {
      const longDescAnnotation = {
        ...sampleAnnotations[0],
        description: 'A'.repeat(200),
      };
      const longProps = {
        ...defaultProps,
        selectedAnnotation: longDescAnnotation,
      };
      renderWithRouter(<VocabularyPanel {...longProps} />);
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle all terms discovered', () => {
      const allDiscoveredProps = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1', 'ann-2', 'ann-3']),
      };
      const { container } = renderWithRouter(<VocabularyPanel {...allDiscoveredProps} />);

      const undiscoveredTerms = container.querySelectorAll('.bg-gray-50.text-gray-400');
      expect(undiscoveredTerms.length).toBe(0);

      const discoveredTerms = container.querySelectorAll('.bg-green-50.text-green-700');
      expect(discoveredTerms.length).toBe(3);
    });
  });

  describe('Accessibility', () => {
    it('should use semantic heading', () => {
      renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const heading = screen.getByText('Vocabulary Details');
      expect(heading.tagName).toBe('H2');
    });

    it('should have link with descriptive text', () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedAnnotation: sampleAnnotations[0],
      };
      renderWithRouter(<VocabularyPanel {...propsWithSelection} />);
      expect(screen.getByText('Practice This Term')).toBeInTheDocument();
    });

    it('should have readable text contrast', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const grayText = container.querySelectorAll('.text-gray-600');
      expect(grayText.length).toBeGreaterThan(0);
    });

    it('should use proper text sizes for hierarchy', () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedAnnotation: sampleAnnotations[0],
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithSelection} />);

      const largeText = container.querySelector('.text-2xl');
      const mediumText = container.querySelector('.text-lg');
      const smallText = container.querySelectorAll('.text-sm');

      expect(largeText).toBeInTheDocument();
      expect(mediumText).toBeInTheDocument();
      expect(smallText.length).toBeGreaterThan(0);
    });
  });

  describe('Checkmark SVG', () => {
    it('should render checkmark SVG for discovered terms', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithDiscovered} />);

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should apply correct size to checkmark', () => {
      const propsWithDiscovered = {
        ...defaultProps,
        discoveredTerms: new Set(['ann-1']),
      };
      const { container } = renderWithRouter(<VocabularyPanel {...propsWithDiscovered} />);

      const checkmarkSvg = container.querySelector('svg.w-5.h-5');
      expect(checkmarkSvg).toBeInTheDocument();
    });
  });

  describe('Empty State SVG', () => {
    it('should render eye icon in empty state', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const eyeIcon = container.querySelector('svg.w-16.h-16');
      expect(eyeIcon).toBeInTheDocument();
    });

    it('should style empty state icon appropriately', () => {
      const { container } = renderWithRouter(<VocabularyPanel {...defaultProps} />);
      const icon = container.querySelector('svg.text-gray-300');
      expect(icon).toBeInTheDocument();
    });
  });
});
