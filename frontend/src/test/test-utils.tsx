import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };

// Helper function to create mock user
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'learner',
  ...overrides,
});

// Helper function to create mock observation
export const createMockObservation = (overrides = {}) => ({
  id: '1',
  birdId: 'bird-1',
  userId: 'user-1',
  location: 'Test Location',
  date: new Date().toISOString(),
  notes: 'Test observation',
  imageUrl: '/test-image.jpg',
  verified: false,
  ...overrides,
});

// Helper function to create mock bird species
export const createMockBirdSpecies = (overrides = {}) => ({
  id: 'bird-1',
  commonName: 'Test Bird',
  scientificName: 'Testus birdus',
  family: 'Testidae',
  habitat: 'Test habitat',
  description: 'A test bird species',
  imageUrl: '/test-bird.jpg',
  ...overrides,
});
