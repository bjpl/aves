// import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { EnhancedLearnPage } from './pages/EnhancedLearnPage';
import { EnhancedPracticePage } from './pages/EnhancedPracticePage';
import { SpeciesPage } from './pages/SpeciesPage';
import './App.css';

function App() {
  // PATTERN: Dynamic basename for GitHub Pages compatibility
  // WHY: GitHub Pages serves from /repository-name/ subdirectory
  // CONCEPT: Use environment variable or base URL detection
  const basename = import.meta.env.BASE_URL || '/';

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
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn" element={<EnhancedLearnPage />} />
          <Route path="/practice" element={<EnhancedPracticePage />} />
          <Route path="/species" element={<SpeciesPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;