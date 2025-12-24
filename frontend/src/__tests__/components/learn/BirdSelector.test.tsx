import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { BirdSelector } from '../../../components/learn/BirdSelector';

describe('BirdSelector', () => {
  const mockOnBirdSelect = vi.fn();

  const sampleBirds = [
    {
      id: '1',
      name: 'Robin',
      spanishName: 'Petirrojo',
      imageUrl: 'robin.jpg',
      annotations: [],
    },
    {
      id: '2',
      name: 'Eagle',
      spanishName: 'Águila',
      imageUrl: 'eagle.jpg',
      annotations: [],
    },
    {
      id: '3',
      name: 'Owl',
      spanishName: 'Búho',
      imageUrl: 'owl.jpg',
      annotations: [],
    },
  ];

  const defaultProps = {
    birds: sampleBirds,
    selectedBird: sampleBirds[0],
    onBirdSelect: mockOnBirdSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<BirdSelector {...defaultProps} />);
      expect(screen.getByText('Petirrojo')).toBeInTheDocument();
    });

    it('should render all bird options', () => {
      render(<BirdSelector {...defaultProps} />);
      expect(screen.getByText('Petirrojo')).toBeInTheDocument();
      expect(screen.getByText('Águila')).toBeInTheDocument();
      expect(screen.getByText('Búho')).toBeInTheDocument();
    });

    it('should display English names', () => {
      render(<BirdSelector {...defaultProps} />);
      expect(screen.getByText('Robin')).toBeInTheDocument();
      expect(screen.getByText('Eagle')).toBeInTheDocument();
      expect(screen.getByText('Owl')).toBeInTheDocument();
    });

    it('should display Spanish names', () => {
      render(<BirdSelector {...defaultProps} />);
      expect(screen.getByText('Petirrojo')).toBeInTheDocument();
      expect(screen.getByText('Águila')).toBeInTheDocument();
      expect(screen.getByText('Búho')).toBeInTheDocument();
    });

    it('should render buttons for each bird', () => {
      render(<BirdSelector {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3);
    });
  });

  describe('Selection Behavior', () => {
    it('should highlight the selected bird', () => {
      render(<BirdSelector {...defaultProps} />);
      const selectedButton = screen.getByText('Petirrojo').closest('button');
      expect(selectedButton).toHaveClass('bg-blue-500', 'text-white');
    });

    it('should not highlight unselected birds', () => {
      render(<BirdSelector {...defaultProps} />);
      const unselectedButton = screen.getByText('Águila').closest('button');
      expect(unselectedButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('should call onBirdSelect when bird is clicked', async () => {
      const user = userEvent.setup();
      render(<BirdSelector {...defaultProps} />);

      await user.click(screen.getByText('Águila'));
      expect(mockOnBirdSelect).toHaveBeenCalledWith(sampleBirds[1]);
    });

    it('should update selection when different bird clicked', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<BirdSelector {...defaultProps} />);

      await user.click(screen.getByText('Búho'));
      expect(mockOnBirdSelect).toHaveBeenCalledWith(sampleBirds[2]);

      // Simulate selection update
      rerender(<BirdSelector {...defaultProps} selectedBird={sampleBirds[2]} />);

      const selectedButton = screen.getByText('Búho').closest('button');
      expect(selectedButton).toHaveClass('bg-blue-500');
    });

    it('should allow clicking already selected bird', async () => {
      const user = userEvent.setup();
      render(<BirdSelector {...defaultProps} />);

      await user.click(screen.getByText('Petirrojo'));
      expect(mockOnBirdSelect).toHaveBeenCalledWith(sampleBirds[0]);
    });
  });

  describe('Styling', () => {
    it('should apply white background to container', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const wrapper = container.querySelector('.bg-white');
      expect(wrapper).toBeInTheDocument();
    });

    it('should use flexbox layout', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const flexContainer = container.querySelector('.flex.flex-wrap');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should apply gap between buttons', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const gapContainer = container.querySelector('.gap-2');
      expect(gapContainer).toBeInTheDocument();
    });

    it('should apply rounded corners to container', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const rounded = container.querySelector('.rounded-lg');
      expect(rounded).toBeInTheDocument();
    });

    it('should apply shadow to container', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const shadow = container.querySelector('.shadow-sm');
      expect(shadow).toBeInTheDocument();
    });

    it('should apply hover effect to unselected buttons', () => {
      render(<BirdSelector {...defaultProps} />);
      const unselectedButton = screen.getByText('Águila').closest('button');
      expect(unselectedButton).toHaveClass('hover:bg-gray-200');
    });

    it('should apply transition to buttons', () => {
      render(<BirdSelector {...defaultProps} />);
      const button = screen.getByText('Petirrojo').closest('button');
      expect(button).toHaveClass('transition-all');
    });
  });

  describe('Text Layout', () => {
    it('should display English name with smaller text', () => {
      render(<BirdSelector {...defaultProps} />);
      const englishName = screen.getByText('Robin');
      expect(englishName).toHaveClass('text-xs', 'opacity-75');
    });

    it('should use block display for English names', () => {
      render(<BirdSelector {...defaultProps} />);
      const englishName = screen.getByText('Robin');
      expect(englishName).toHaveClass('block');
    });

    it('should arrange names vertically in button', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const spans = button.querySelectorAll('span');
        expect(spans.length).toBe(2); // English and Spanish names
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single bird', () => {
      const singleBirdProps = {
        ...defaultProps,
        birds: [sampleBirds[0]],
        selectedBird: sampleBirds[0],
      };
      render(<BirdSelector {...singleBirdProps} />);

      expect(screen.getByText('Petirrojo')).toBeInTheDocument();
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('should handle many birds', () => {
      const manyBirds = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        name: `Bird ${i}`,
        spanishName: `Pájaro ${i}`,
        imageUrl: `bird${i}.jpg`,
        annotations: [],
      }));

      const manyBirdsProps = {
        ...defaultProps,
        birds: manyBirds,
        selectedBird: manyBirds[0],
      };

      render(<BirdSelector {...manyBirdsProps} />);
      expect(screen.getAllByRole('button').length).toBe(10);
    });

    it('should handle birds with special characters', () => {
      const specialBirds = [
        {
          id: '1',
          name: 'Ñandú',
          spanishName: 'Ñandú común',
          imageUrl: 'nandu.jpg',
          annotations: [],
        },
      ];

      const specialProps = {
        ...defaultProps,
        birds: specialBirds,
        selectedBird: specialBirds[0],
      };

      render(<BirdSelector {...specialProps} />);
      expect(screen.getByText('Ñandú')).toBeInTheDocument();
      expect(screen.getByText('Ñandú común')).toBeInTheDocument();
    });

    it('should handle birds with long names', () => {
      const longNameBirds = [
        {
          id: '1',
          name: 'Very Long English Bird Name',
          spanishName: 'Nombre Muy Largo De Pájaro En Español',
          imageUrl: 'bird.jpg',
          annotations: [],
        },
      ];

      const longNameProps = {
        ...defaultProps,
        birds: longNameBirds,
        selectedBird: longNameBirds[0],
      };

      render(<BirdSelector {...longNameProps} />);
      expect(screen.getByText('Very Long English Bird Name')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should use button elements for interactions', () => {
      render(<BirdSelector {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<BirdSelector {...defaultProps} />);

      await user.tab();
      // First button should receive focus
      const firstButton = screen.getByText('Petirrojo').closest('button');
      expect(document.activeElement).toBe(firstButton);
    });

    it('should have distinguishable selected state', () => {
      render(<BirdSelector {...defaultProps} />);
      const selectedButton = screen.getByText('Petirrojo').closest('button');
      const unselectedButton = screen.getByText('Águila').closest('button');

      // Selected should have blue background
      expect(selectedButton).toHaveClass('bg-blue-500');
      // Unselected should have gray background
      expect(unselectedButton).toHaveClass('bg-gray-100');
    });
  });

  describe('Responsive Behavior', () => {
    it('should use flex-wrap for responsive layout', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const flexContainer = container.querySelector('.flex-wrap');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should apply margin bottom to container', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const marginBottom = container.querySelector('.mb-6');
      expect(marginBottom).toBeInTheDocument();
    });

    it('should apply consistent padding to buttons', () => {
      render(<BirdSelector {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('px-4', 'py-2');
      });
    });
  });

  describe('Selection Visual Feedback', () => {
    it('should add shadow to selected bird', () => {
      render(<BirdSelector {...defaultProps} />);
      const selectedButton = screen.getByText('Petirrojo').closest('button');
      expect(selectedButton).toHaveClass('shadow-md');
    });

    it('should not add shadow to unselected birds', () => {
      render(<BirdSelector {...defaultProps} />);
      const unselectedButton = screen.getByText('Águila').closest('button');
      expect(unselectedButton).not.toHaveClass('shadow-md');
    });
  });

  describe('Key Uniqueness', () => {
    it('should use unique bird IDs as keys', () => {
      const { container } = render(<BirdSelector {...defaultProps} />);
      const buttons = container.querySelectorAll('button');

      // Each button should be unique (React doesn't error)
      expect(buttons.length).toBe(3);
    });
  });
});
