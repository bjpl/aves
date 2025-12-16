import type { Meta, StoryObj } from '@storybook/react';
import { ConservationStatusBadge } from './ConservationStatusBadge';

const meta: Meta<typeof ConservationStatusBadge> = {
  title: 'Species/ConservationStatusBadge',
  component: ConservationStatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ConservationStatusBadge>;

// Individual Status Badges
export const LeastConcern: Story = {
  args: {
    status: 'LC',
    scientificName: 'Cardinalis cardinalis',
  },
};

export const NearThreatened: Story = {
  args: {
    status: 'NT',
    scientificName: 'Strix occidentalis',
  },
};

export const Vulnerable: Story = {
  args: {
    status: 'VU',
    scientificName: 'Numenius americanus',
  },
};

export const Endangered: Story = {
  args: {
    status: 'EN',
    scientificName: 'Grus americana',
  },
};

export const CriticallyEndangered: Story = {
  args: {
    status: 'CR',
    scientificName: 'Gymnogyps californianus',
  },
};

export const ExtinctInWild: Story = {
  args: {
    status: 'EW',
    scientificName: 'Spix\'s Macaw',
  },
};

export const Extinct: Story = {
  args: {
    status: 'EX',
    scientificName: 'Ectopistes migratorius',
  },
};

// All Statuses
export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-8 max-w-xl">
      <ConservationStatusBadge status="LC" scientificName="Cardinalis cardinalis" />
      <ConservationStatusBadge status="NT" scientificName="Strix occidentalis" />
      <ConservationStatusBadge status="VU" scientificName="Numenius americanus" />
      <ConservationStatusBadge status="EN" scientificName="Grus americana" />
      <ConservationStatusBadge status="CR" scientificName="Gymnogyps californianus" />
      <ConservationStatusBadge status="EW" scientificName="Cyanopsitta spixii" />
      <ConservationStatusBadge status="EX" scientificName="Ectopistes migratorius" />
    </div>
  ),
};

// IUCN Color Scale Visualization
export const IUCNColorScale: Story = {
  render: () => (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">IUCN Red List Categories</h3>
      <div className="flex gap-2 flex-wrap">
        <span className="px-3 py-1 rounded bg-green-100 text-green-800 border border-green-300 font-medium">
          LC - Least Concern
        </span>
        <span className="px-3 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 font-medium">
          NT - Near Threatened
        </span>
        <span className="px-3 py-1 rounded bg-orange-100 text-orange-800 border border-orange-300 font-medium">
          VU - Vulnerable
        </span>
        <span className="px-3 py-1 rounded bg-red-100 text-red-800 border border-red-300 font-medium">
          EN - Endangered
        </span>
        <span className="px-3 py-1 rounded bg-red-200 text-red-900 border border-red-400 font-medium">
          CR - Critically Endangered
        </span>
        <span className="px-3 py-1 rounded bg-purple-100 text-purple-800 border border-purple-300 font-medium">
          EW - Extinct in Wild
        </span>
        <span className="px-3 py-1 rounded bg-gray-200 text-gray-900 border border-gray-400 font-medium">
          EX - Extinct
        </span>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        The IUCN Red List Categories indicate the conservation status of species,
        from Least Concern (stable populations) to Extinct.
      </p>
    </div>
  ),
};

// Species Detail Example
export const InSpeciesDetail: Story = {
  render: () => (
    <div className="max-w-lg p-6 bg-white rounded-lg shadow">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Cóndor de California</h2>
        <p className="text-gray-600">California Condor</p>
        <p className="text-sm text-gray-500 italic">Gymnogyps californianus</p>
      </div>

      <ConservationStatusBadge
        status="CR"
        scientificName="Gymnogyps californianus"
      />

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          The California Condor is one of the world's rarest birds.
          Conservation efforts have helped increase their population from
          22 individuals in 1982 to over 500 today.
        </p>
      </div>
    </div>
  ),
};
