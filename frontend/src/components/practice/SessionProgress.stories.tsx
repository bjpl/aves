import type { Meta, StoryObj } from '@storybook/react';
import { SessionProgress } from './SessionProgress';

const meta: Meta<typeof SessionProgress> = {
  title: 'Practice/SessionProgress',
  component: SessionProgress,
  tags: ['autodocs'],
  argTypes: {
    currentExercise: { control: { type: 'range', min: 0, max: 20 } },
    totalExercises: { control: 'number' },
    currentScore: { control: 'number' },
    streak: { control: { type: 'range', min: 0, max: 10 } },
  },
};

export default meta;
type Story = StoryObj<typeof SessionProgress>;

// Basic Session
export const Default: Story = {
  args: {
    currentExercise: 5,
    totalExercises: 15,
    currentScore: 4,
    streak: 2,
  },
};

// Session States
export const JustStarted: Story = {
  args: {
    currentExercise: 1,
    totalExercises: 15,
    currentScore: 1,
    streak: 1,
    elapsedTime: 45,
  },
};

export const MidSession: Story = {
  args: {
    currentExercise: 8,
    totalExercises: 15,
    currentScore: 6,
    streak: 3,
    averageTime: 20,
    elapsedTime: 160,
  },
};

export const AlmostComplete: Story = {
  args: {
    currentExercise: 14,
    totalExercises: 15,
    currentScore: 12,
    streak: 5,
    averageTime: 18,
    elapsedTime: 252,
  },
};

export const SessionComplete: Story = {
  args: {
    currentExercise: 15,
    totalExercises: 15,
    currentScore: 13,
    streak: 0,
    elapsedTime: 300,
  },
};

// Streak States
export const NoStreak: Story = {
  args: {
    currentExercise: 5,
    totalExercises: 15,
    currentScore: 2,
    streak: 0,
    elapsedTime: 100,
  },
};

export const SmallStreak: Story = {
  args: {
    currentExercise: 6,
    totalExercises: 15,
    currentScore: 5,
    streak: 2,
    elapsedTime: 120,
  },
};

export const MediumStreak: Story = {
  args: {
    currentExercise: 8,
    totalExercises: 15,
    currentScore: 7,
    streak: 4,
    elapsedTime: 160,
  },
};

export const HotStreak: Story = {
  args: {
    currentExercise: 10,
    totalExercises: 15,
    currentScore: 10,
    streak: 7,
    elapsedTime: 200,
  },
};

// With Time Estimates
export const WithTimeEstimate: Story = {
  args: {
    currentExercise: 5,
    totalExercises: 15,
    currentScore: 4,
    streak: 2,
    averageTime: 25,
    elapsedTime: 125,
  },
};

// Accuracy States
export const PerfectAccuracy: Story = {
  args: {
    currentExercise: 10,
    totalExercises: 15,
    currentScore: 10,
    streak: 10,
    averageTime: 15,
    elapsedTime: 150,
  },
};

export const StrugglingSesssion: Story = {
  args: {
    currentExercise: 8,
    totalExercises: 15,
    currentScore: 3,
    streak: 0,
    averageTime: 30,
    elapsedTime: 240,
  },
};

export const GoodProgress: Story = {
  args: {
    currentExercise: 12,
    totalExercises: 15,
    currentScore: 9,
    streak: 3,
    averageTime: 22,
    elapsedTime: 264,
  },
};

// Long Session
export const LongSession: Story = {
  args: {
    currentExercise: 25,
    totalExercises: 50,
    currentScore: 20,
    streak: 4,
    averageTime: 20,
    elapsedTime: 500,
  },
};

// Quick Quiz
export const QuickQuiz: Story = {
  args: {
    currentExercise: 3,
    totalExercises: 5,
    currentScore: 3,
    streak: 3,
    averageTime: 10,
    elapsedTime: 30,
  },
};

// Practice Mode Comparison
export const PracticeModes: Story = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Vocabulary Practice</h3>
        <SessionProgress
          currentExercise={8}
          totalExercises={20}
          currentScore={6}
          streak={3}
          averageTime={15}
          elapsedTime={120}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Species Identification</h3>
        <SessionProgress
          currentExercise={5}
          totalExercises={10}
          currentScore={4}
          streak={2}
          averageTime={25}
          elapsedTime={125}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Audio Recognition</h3>
        <SessionProgress
          currentExercise={3}
          totalExercises={8}
          currentScore={2}
          streak={1}
          averageTime={30}
          elapsedTime={90}
        />
      </div>
    </div>
  ),
};

// Milestone Progress
export const AtMilestones: Story = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <div>
        <p className="text-sm text-gray-500 mb-2">25% Complete</p>
        <SessionProgress
          currentExercise={5}
          totalExercises={20}
          currentScore={4}
          streak={2}
        />
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">50% Complete</p>
        <SessionProgress
          currentExercise={10}
          totalExercises={20}
          currentScore={8}
          streak={4}
        />
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">75% Complete</p>
        <SessionProgress
          currentExercise={15}
          totalExercises={20}
          currentScore={12}
          streak={3}
        />
      </div>
    </div>
  ),
};
