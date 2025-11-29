import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

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
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link
                  to="/"
                  className="flex items-center px-2 py-2 text-gray-900 hover:text-gray-700"
                >
                  <span className="text-2xl mr-2">🦅</span>
                  <span className="font-bold text-xl">Aves</span>
                </Link>
                <div className="ml-6 flex space-x-4">
                  <Link
                    to="/learn"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Learn
                  </Link>
                  <Link
                    to="/practice"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Practice
                  </Link>
                  <Link
                    to="/species"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Species
                  </Link>
                  <Link
                    to="/admin/annotations"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 border-l border-gray-200 ml-4 pl-4"
                  >
                    Review
                  </Link>
                  <Link
                    to="/admin/images"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    Images
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    Analytics
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes with Suspense for lazy loading */}
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-4xl mb-4">🦅</div>
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
            <Route path="/admin/annotations" element={<AdminAnnotationReviewPage />} />
            <Route path="/admin/images" element={<ImageManagementPage />} />
            <Route path="/admin/analytics" element={<MLAnalyticsPage />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;