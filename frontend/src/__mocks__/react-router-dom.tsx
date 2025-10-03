import { vi } from 'vitest';

// Mock react-router-dom for testing
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn(() => ({ pathname: '/', search: '', hash: '', state: null }));
const mockUseParams = vi.fn(() => ({}));
const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);

export const useNavigate = () => mockNavigate;
export const useLocation = mockUseLocation;
export const useParams = mockUseParams;
export const useSearchParams = mockUseSearchParams;

export const Link = ({ to, children, ...props }: any) => (
  <a href={to} {...props}>
    {children}
  </a>
);

export const Navigate = ({ to }: any) => <div data-testid="navigate-to">{to}</div>;

export const BrowserRouter = ({ children }: any) => <div>{children}</div>;
export const Routes = ({ children }: any) => <div>{children}</div>;
export const Route = ({ children }: any) => <div>{children}</div>;

// Export mocks for test assertions
export const __mocks__ = {
  navigate: mockNavigate,
  useLocation: mockUseLocation,
  useParams: mockUseParams,
  useSearchParams: mockUseSearchParams,
};
