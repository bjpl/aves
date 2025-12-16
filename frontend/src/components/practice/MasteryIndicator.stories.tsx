import type { Meta, StoryObj } from '@storybook/react';
import { MasteryIndicator } from './MasteryIndicator';

const meta: Meta<typeof MasteryIndicator> = {
  title: 'Practice/MasteryIndicator',
  component: MasteryIndicator,
  tags: ['autodocs'],
  argTypes: {
    masteryLevel: { control: { type: 'range', min: 0, max: 100 } },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    showLabel: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof MasteryIndicator>;

// Basic Mastery Levels
export const Default: Story = {
  args: {
    masteryLevel: 75,
  },
};

export const Beginner: Story = {
  args: {
    masteryLevel: 15,
    timesCorrect: 3,
    timesIncorrect: 10,
  },
};

export const Intermediate: Story = {
  args: {
    masteryLevel: 50,
    timesCorrect: 15,
    timesIncorrect: 12,
  },
};

export const Advanced: Story = {
  args: {
    masteryLevel: 75,
    timesCorrect: 30,
    timesIncorrect: 8,
  },
};

export const Mastered: Story = {
  args: {
    masteryLevel: 95,
    timesCorrect: 50,
    timesIncorrect: 3,
  },
};

// Sizes
export const Small: Story = {
  args: {
    masteryLevel: 60,
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    masteryLevel: 60,
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    masteryLevel: 60,
    size: 'lg',
  },
};

// All Sizes
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="text-center">
        <MasteryIndicator masteryLevel={70} size="sm" />
        <p className="text-xs mt-2 text-gray-500">Small</p>
      </div>
      <div className="text-center">
        <MasteryIndicator masteryLevel={70} size="md" />
        <p className="text-xs mt-2 text-gray-500">Medium</p>
      </div>
      <div className="text-center">
        <MasteryIndicator masteryLevel={70} size="lg" />
        <p className="text-xs mt-2 text-gray-500">Large</p>
      </div>
    </div>
  ),
};

// With Label
export const WithLabel: Story = {
  args: {
    masteryLevel: 65,
    showLabel: true,
  },
};

// With Next Review Date
export const WithNextReview: Story = {
  args: {
    masteryLevel: 80,
    timesCorrect: 25,
    timesIncorrect: 5,
    nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  },
};

export const ReviewDueSoon: Story = {
  args: {
    masteryLevel: 60,
    timesCorrect: 15,
    timesIncorrect: 8,
    nextReviewAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  },
};

export const ReviewDueNow: Story = {
  args: {
    masteryLevel: 45,
    timesCorrect: 10,
    timesIncorrect: 12,
    nextReviewAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
  },
};

// Color Coding Progression
export const ColorProgression: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <MasteryIndicator masteryLevel={15} size="lg" />
        <p className="text-xs mt-2 text-gray-500">0-25%</p>
      </div>
      <div className="text-center">
        <MasteryIndicator masteryLevel={40} size="lg" />
        <p className="text-xs mt-2 text-gray-500">26-50%</p>
      </div>
      <div className="text-center">
        <MasteryIndicator masteryLevel={65} size="lg" />
        <p className="text-xs mt-2 text-gray-500">51-75%</p>
      </div>
      <div className="text-center">
        <MasteryIndicator masteryLevel={90} size="lg" />
        <p className="text-xs mt-2 text-gray-500">76-100%</p>
      </div>
    </div>
  ),
};

// Vocabulary Mastery Dashboard
export const VocabularyDashboard: Story = {
  render: () => (
    <div className="max-w-md bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Vocabulary Mastery</h3>
      <div className="space-y-3">
        {[
          { term: 'el pico', english: 'the beak', level: 95, correct: 45, incorrect: 2 },
          { term: 'las alas', english: 'the wings', level: 75, correct: 30, incorrect: 8 },
          { term: 'la cola', english: 'the tail', level: 60, correct: 20, incorrect: 12 },
          { term: 'las garras', english: 'the talons', level: 35, correct: 8, incorrect: 15 },
          { term: 'el plumaje', english: 'the plumage', level: 20, correct: 4, incorrect: 16 },
        ].map((item) => (
          <div key={item.term} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <div>
              <p className="font-medium text-gray-900">{item.term}</p>
              <p className="text-sm text-gray-500">{item.english}</p>
            </div>
            <MasteryIndicator
              masteryLevel={item.level}
              timesCorrect={item.correct}
              timesIncorrect={item.incorrect}
              size="md"
            />
          </div>
        ))}
      </div>
    </div>
  ),
};

// Species Mastery Grid
export const SpeciesMasteryGrid: Story = {
  render: () => (
    <div className="max-w-xl bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Species Recognition</h3>
      <div className="grid grid-cols-4 gap-4">
        {[
          { name: 'Cardinal', level: 90 },
          { name: 'Blue Jay', level: 85 },
          { name: 'Robin', level: 70 },
          { name: 'Sparrow', level: 65 },
          { name: 'Eagle', level: 55 },
          { name: 'Heron', level: 40 },
          { name: 'Condor', level: 25 },
          { name: 'Owl', level: 15 },
        ].map((species) => (
          <div key={species.name} className="text-center p-2">
            <MasteryIndicator masteryLevel={species.level} size="lg" showLabel />
            <p className="text-xs text-gray-600 mt-1">{species.name}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

// Edge Cases
export const ZeroMastery: Story = {
  args: {
    masteryLevel: 0,
    timesCorrect: 0,
    timesIncorrect: 5,
  },
};

export const FullMastery: Story = {
  args: {
    masteryLevel: 100,
    timesCorrect: 100,
    timesIncorrect: 0,
  },
};
