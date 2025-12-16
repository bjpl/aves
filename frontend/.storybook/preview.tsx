import type { Preview } from '@storybook/react';
import { STORYBOOK_VIEWPORTS } from '../src/test-utils/viewports';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: STORYBOOK_VIEWPORTS,
      defaultViewport: 'desktop',
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a2e' },
        { name: 'gray', value: '#f5f5f5' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="storybook-wrapper">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default preview;
