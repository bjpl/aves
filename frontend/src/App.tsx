import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { SkipLink } from './components/ui/SkipLink';
import { error as logError } from './utils/logger';
import './App.css';

// Navigation link component with active state and accessibility
const NavLink = ({
  to,
  children,
  isAdmin = false,
  ariaLabel
}: {
  to: string;
  children: React.ReactNode;
  isAdmin?: boolean;
  ariaLabel?: string;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  const baseClasses = "inline-flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md";
  const activeClasses = isAdmin
    ? "text-orange-700 bg-orange-50"
    : "text-blue-700 bg-blue-50";
  const inactiveClasses = isAdmin
    ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50";

  return (
    <Link
      to={to}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
};

// User account button component with logout functionality
const UserAccountButton = () => {
  const { user, signOut, loading } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      logError('Logout failed', err instanceof Error ? err : { error: err });
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse flex items-center">
          <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <button
        onClick={handleLogout}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors rounded-md"
        aria-label="Logout from your account"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
    );
  }

  return (
    <NavLink to="/login" ariaLabel="Login to your account">
      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      Login
    </NavLink>
  );
};

// Lazy load route components for better performance
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const EnhancedLearnPage = lazy(() => import('./pages/EnhancedLearnPage').then(m => ({ default: m.EnhancedLearnPage })));
const EnhancedPracticePage = lazy(() => import('./pages/EnhancedPracticePage').then(m => ({ default: m.EnhancedPracticePage })));
const SpeciesPage = lazy(() => import('./pages/SpeciesPage').then(m => ({ default: m.SpeciesPage })));
const SpeciesDetailPage = lazy(() => import('./pages/SpeciesDetailPage').then(m => ({ default: m.SpeciesDetailPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminAnnotationReviewPage = lazy(() => import('./pages/admin/AdminAnnotationReviewPage').then(m => ({ default: m.AdminAnnotationReviewPage })));
const ImageManagementPage = lazy(() => import('./pages/admin/ImageManagementPage'));
const MLAnalyticsPage = lazy(() => import('./pages/admin/MLAnalyticsPage').then(m => ({ default: m.MLAnalyticsPage })));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'));

function App() {
  // PATTERN: Hardcoded basename for GitHub Pages deployment
  // WHY: GitHub Pages serves from /aves/ subdirectory
  // CONCEPT: Explicit path ensures consistent routing behavior
  // Use /aves/ basename for GitHub Pages, / for local dev
  const isGitHubPages = window.location.hostname.includes('github.io');
  const basename = isGitHubPages ? '/aves/' : '/';

  return (
    <Router basename={basename}>
      <div className="min-h-screen">
        {/* Skip link for keyboard navigation */}
        <SkipLink targetId="main-content">Skip to main content</SkipLink>

        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link
                  to="/"
                  className="flex items-center px-2 py-2 text-gray-900 hover:text-gray-700"
                  aria-label="Aves home page"
                >
                  <span className="text-2xl mr-2" role="img" aria-label="Eagle">🦅</span>
                  <span className="font-bold text-xl">Aves</span>
                </Link>

                {/* Main Navigation */}
                <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                  <NavLink to="/learn" ariaLabel="Learn about bird species and their features">Learn</NavLink>
                  <NavLink to="/practice" ariaLabel="Practice identifying birds with interactive exercises">Practice</NavLink>
                  <NavLink to="/species" ariaLabel="Browse all bird species in the database">Species</NavLink>
                  <NavLink to="/dashboard" ariaLabel="View your learning progress and dashboard">Dashboard</NavLink>
                </div>
              </div>

              {/* Admin Navigation - Visually separated */}
              <div className="hidden sm:flex sm:items-center sm:space-x-1" role="navigation" aria-label="Admin navigation">
                <span className="text-xs text-gray-400 mr-2 hidden md:inline" aria-hidden="true">Admin:</span>
                <NavLink to="/admin/annotations" isAdmin ariaLabel="Admin: Review and manage bird annotations">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Review
                </NavLink>
                <NavLink to="/admin/images" isAdmin ariaLabel="Admin: Manage bird images in the database">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Images
                </NavLink>
                <NavLink to="/admin/analytics" isAdmin ariaLabel="Admin: View machine learning analytics and performance">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </NavLink>

                {/* User Account/Login Button */}
                <div className="ml-2 pl-2 border-l border-gray-300">
                  <UserAccountButton />
                </div>
              </div>

              {/* Mobile menu button (future enhancement) */}
              <div className="sm:hidden flex items-center">
                <Link to="/learn" className="px-2 py-1 text-gray-700 text-sm">Learn</Link>
                <Link to="/admin/annotations" className="px-2 py-1 text-orange-600 text-sm">Admin</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes with Suspense for lazy loading */}
        <main id="main-content" role="main" tabIndex={-1}>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
              <div className="text-center">
                <div className="text-4xl mb-4" role="img" aria-label="Eagle">🦅</div>
                <div className="text-gray-600">Loading...</div>
              </div>
            </div>
          }>
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/learn" element={<EnhancedLearnPage />} />
            <Route path="/practice" element={<EnhancedPracticePage />} />
            <Route path="/species" element={<SpeciesPage />} />
            <Route path="/species/:id" element={<SpeciesDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<UserDashboardPage />} />
            <Route path="/admin/annotations" element={<AdminAnnotationReviewPage />} />
            <Route path="/admin/images" element={<ImageManagementPage />} />
            <Route path="/admin/analytics" element={<MLAnalyticsPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;