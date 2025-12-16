import type { Meta, StoryObj } from '@storybook/react';
import { SpeciesCard } from './SpeciesCard';
import { Species } from '../../../../shared/types/species.types';

const meta: Meta<typeof SpeciesCard> = {
  title: 'Species/SpeciesCard',
  component: SpeciesCard,
  tags: ['autodocs'],
  argTypes: {
    viewMode: {
      control: 'select',
      options: ['grid', 'list'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof SpeciesCard>;

// Mock species data
const mockSpecies: Species = {
  id: '1',
  scientificName: 'Cardinalis cardinalis',
  englishName: 'Northern Cardinal',
  spanishName: 'Cardenal Rojo',
  familyName: 'Cardinalidae',
  orderName: 'Passeriformes',
  conservationStatus: 'LC',
  sizeCategory: 'medium',
  primaryColors: ['#FF0000', '#8B0000', '#000000'],
  habitats: ['Forest', 'Suburban'],
  descriptionSpanish: 'Ave canora de color rojo brillante con cresta distintiva.',
  descriptionEnglish: 'Bright red songbird with a distinctive crest.',
  primaryImageUrl: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=800',
  annotationCount: 12,
};

const mockSpeciesEndangered: Species = {
  ...mockSpecies,
  id: '2',
  scientificName: 'Gymnogyps californianus',
  englishName: 'California Condor',
  spanishName: 'Cóndor de California',
  familyName: 'Cathartidae',
  conservationStatus: 'CR',
  sizeCategory: 'large',
  primaryColors: ['#000000', '#FFFFFF'],
  habitats: ['Mountain', 'Desert'],
  primaryImageUrl: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800',
  annotationCount: 5,
};

const mockSpeciesNoImage: Species = {
  ...mockSpecies,
  id: '3',
  primaryImageUrl: undefined,
  englishName: 'Mystery Bird',
  spanishName: 'Pájaro Misterioso',
};

// Grid View (Default)
export const GridView: Story = {
  args: {
    species: mockSpecies,
    viewMode: 'grid',
  },
};

// List View
export const ListView: Story = {
  args: {
    species: mockSpecies,
    viewMode: 'list',
  },
};

// Conservation Status Variants
export const LeastConcern: Story = {
  args: {
    species: { ...mockSpecies, conservationStatus: 'LC' },
  },
};

export const NearThreatened: Story = {
  args: {
    species: { ...mockSpecies, conservationStatus: 'NT' },
  },
};

export const Vulnerable: Story = {
  args: {
    species: { ...mockSpecies, conservationStatus: 'VU' },
  },
};

export const Endangered: Story = {
  args: {
    species: { ...mockSpecies, conservationStatus: 'EN' },
  },
};

export const CriticallyEndangered: Story = {
  args: {
    species: mockSpeciesEndangered,
  },
};

// Without Image
export const NoImage: Story = {
  args: {
    species: mockSpeciesNoImage,
  },
};

// Without Annotation Count
export const NoAnnotations: Story = {
  args: {
    species: { ...mockSpecies, annotationCount: undefined },
  },
};

// Species Grid
export const SpeciesGrid: Story = {
  render: () => {
    const speciesList = [
      mockSpecies,
      { ...mockSpecies, id: '2', spanishName: 'Arrendajo Azul', englishName: 'Blue Jay', conservationStatus: 'LC' as const },
      { ...mockSpecies, id: '3', spanishName: 'Petirrojo Americano', englishName: 'American Robin', conservationStatus: 'LC' as const },
      { ...mockSpecies, id: '4', spanishName: 'Águila Calva', englishName: 'Bald Eagle', conservationStatus: 'LC' as const, sizeCategory: 'large' as const },
      { ...mockSpeciesEndangered, id: '5' },
      { ...mockSpecies, id: '6', spanishName: 'Colibrí Garganta de Rubí', englishName: 'Ruby-throated Hummingbird', sizeCategory: 'small' as const },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {speciesList.map((species) => (
          <SpeciesCard
            key={species.id}
            species={species}
            onClick={(s) => console.log('Clicked:', s.englishName)}
            viewMode="grid"
          />
        ))}
      </div>
    );
  },
};

// Species List
export const SpeciesList: Story = {
  render: () => {
    const speciesList = [
      mockSpecies,
      { ...mockSpecies, id: '2', spanishName: 'Arrendajo Azul', englishName: 'Blue Jay', conservationStatus: 'LC' as const },
      { ...mockSpecies, id: '3', spanishName: 'Petirrojo Americano', englishName: 'American Robin', conservationStatus: 'LC' as const },
      mockSpeciesEndangered,
    ];

    return (
      <div className="space-y-4 max-w-2xl p-4">
        {speciesList.map((species) => (
          <SpeciesCard
            key={species.id}
            species={species}
            onClick={(s) => console.log('Clicked:', s.englishName)}
            viewMode="list"
          />
        ))}
      </div>
    );
  },
};

// With Click Handler
export const Clickable: Story = {
  args: {
    species: mockSpecies,
    onClick: (species) => alert(`Clicked on ${species.englishName}`),
  },
};

// All Size Categories
export const SizeCategories: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-4">
      <SpeciesCard
        species={{ ...mockSpecies, sizeCategory: 'small', englishName: 'Hummingbird' }}
        viewMode="grid"
      />
      <SpeciesCard
        species={{ ...mockSpecies, sizeCategory: 'medium', englishName: 'Cardinal' }}
        viewMode="grid"
      />
      <SpeciesCard
        species={{ ...mockSpecies, sizeCategory: 'large', englishName: 'Eagle' }}
        viewMode="grid"
      />
    </div>
  ),
};

// Habitat Tags Display
export const WithManyHabitats: Story = {
  args: {
    species: {
      ...mockSpecies,
      habitats: ['Forest', 'Suburban', 'Wetland', 'Grassland'],
    },
  },
};
