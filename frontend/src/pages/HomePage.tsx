import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🦅 Aves
          </h1>
          <p className="text-xl text-gray-600">
            Visual Spanish Bird Learning Platform
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Learn Card */}
          <Link
            to="/learn"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-xl font-semibold mb-2">Learn Vocabulary</h2>
            <p className="text-gray-600">
              Explore bird images with interactive annotations and progressive vocabulary disclosure
            </p>
          </Link>

          {/* Practice Card */}
          <Link
            to="/practice"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold mb-2">Practice Exercises</h2>
            <p className="text-gray-600">
              Test your knowledge with visual discrimination and contextual exercises
            </p>
          </Link>

          {/* Browse Card */}
          <Link
            to="/species"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">Species Browser</h2>
            <p className="text-gray-600">
              Browse all bird species by taxonomy, habitat, and characteristics
            </p>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Learning Progress</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Terms Learned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Exercises Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600">Species Explored</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};