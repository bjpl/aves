import type { Meta, StoryObj } from '@storybook/react';
import { ProgressSection } from './ProgressSection';

const meta: Meta<typeof ProgressSection> = {
  title: 'Learn/ProgressSection',
  component: ProgressSection,
  tags: ['autodocs'],
  argTypes: {
    progress: { control: { type: 'range', min: 0, max: 100 } },
    discoveredCount: { control: 'number' },
    totalCount: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressSection>;

// Basic Progress
export const Default: Story = {
  args: {
    progress: 45,
    discoveredCount: 18,
    totalCount: 40,
  },
};

// Progress States
export const JustStarted: Story = {
  args: {
    progress: 5,
    discoveredCount: 2,
    totalCount: 40,
  },
};

export const QuarterComplete: Story = {
  args: {
    progress: 25,
    discoveredCount: 10,
    totalCount: 40,
  },
};

export const HalfwayComplete: Story = {
  args: {
    progress: 50,
    discoveredCount: 20,
    totalCount: 40,
  },
};

export const AlmostComplete: Story = {
  args: {
    progress: 90,
    discoveredCount: 36,
    totalCount: 40,
  },
};

export const Complete: Story = {
  args: {
    progress: 100,
    discoveredCount: 40,
    totalCount: 40,
  },
};

// No Progress
export const NoProgress: Story = {
  args: {
    progress: 0,
    discoveredCount: 0,
    totalCount: 40,
  },
};

// Different Total Counts
export const SmallVocabulary: Story = {
  args: {
    progress: 60,
    discoveredCount: 6,
    totalCount: 10,
  },
};

export const LargeVocabulary: Story = {
  args: {
    progress: 35,
    discoveredCount: 35,
    totalCount: 100,
  },
};

// Learning Dashboard Example
export const LearningDashboard: Story = {
  render: () => (
    <div className="max-w-md space-y-6 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900">Bird Anatomy Vocabulary</h2>

      <div className="space-y-4">
        <div className="p-3 bg-green-50 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-2">Body Parts</h3>
          <ProgressSection progress={80} discoveredCount={16} totalCount={20} />
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Wing Features</h3>
          <ProgressSection progress={45} discoveredCount={9} totalCount={20} />
        </div>

        <div className="p-3 bg-purple-50 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800 mb-2">Beak Types</h3>
          <ProgressSection progress={25} discoveredCount={3} totalCount={12} />
        </div>

        <div className="p-3 bg-orange-50 rounded-lg">
          <h3 className="text-sm font-medium text-orange-800 mb-2">Feet & Talons</h3>
          <ProgressSection progress={10} discoveredCount={1} totalCount={10} />
        </div>
      </div>
    </div>
  ),
};

// Species Learning Progress
export const SpeciesProgress: Story = {
  render: () => (
    <div className="max-w-md space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900">Species Discovered</h2>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Songbirds</span>
            <span className="text-xs text-gray-500">12/15 species</span>
          </div>
          <ProgressSection progress={80} discoveredCount={12} totalCount={15} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Raptors</span>
            <span className="text-xs text-gray-500">5/10 species</span>
          </div>
          <ProgressSection progress={50} discoveredCount={5} totalCount={10} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Waterfowl</span>
            <span className="text-xs text-gray-500">3/12 species</span>
          </div>
          <ProgressSection progress={25} discoveredCount={3} totalCount={12} />
        </div>
      </div>
    </div>
  ),
};

// Milestone Cards
export const MilestoneProgress: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div className="p-4 bg-white rounded-lg shadow border-l-4 border-green-500">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🏆</span>
          <span className="font-medium text-gray-900">Vocabulary Champion</span>
        </div>
        <ProgressSection progress={100} discoveredCount={50} totalCount={50} />
        <p className="text-xs text-green-600 mt-2">Complete! +100 XP earned</p>
      </div>

      <div className="p-4 bg-white rounded-lg shadow border-l-4 border-blue-500">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📚</span>
          <span className="font-medium text-gray-900">Bird Scholar</span>
        </div>
        <ProgressSection progress={72} discoveredCount={36} totalCount={50} />
        <p className="text-xs text-blue-600 mt-2">14 more terms to unlock</p>
      </div>

      <div className="p-4 bg-white rounded-lg shadow border-l-4 border-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎯</span>
          <span className="font-medium text-gray-900">Expert Identifier</span>
        </div>
        <ProgressSection progress={20} discoveredCount={10} totalCount={50} />
        <p className="text-xs text-gray-500 mt-2">Keep learning to unlock</p>
      </div>
    </div>
  ),
};
