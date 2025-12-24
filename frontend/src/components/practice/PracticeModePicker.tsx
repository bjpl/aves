/**
 * PracticeModePicker Component
 *
 * Allows users to choose different practice modes:
 * - Review Due (SRS terms that need review)
 * - Quick Quiz (random mix)
 * - By Species
 * - By Difficulty
 * - By Type (visual match, fill blank, etc.)
 */

import React from 'react';
import { useUserSRSStats } from '../../hooks/useSpacedRepetition';
import { useSpecies } from '../../hooks/useSpecies';

export type PracticeMode = 'review' | 'quick' | 'species' | 'difficulty' | 'type';

interface PracticeModePickerProps {
  selectedMode: PracticeMode;
  onModeSelect: (mode: PracticeMode) => void;
  selectedSpeciesId?: string;
  onSpeciesSelect?: (speciesId: string) => void;
  selectedDifficulty?: number;
  onDifficultySelect?: (level: number) => void;
  selectedType?: string;
  onTypeSelect?: (type: string) => void;
}

const ModeCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ title, description, icon, badge, badgeColor = 'bg-blue-600', isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
      isSelected
        ? 'border-blue-600 bg-blue-50'
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {badge !== undefined && (
            <span className={`px-2 py-0.5 text-xs font-bold text-white rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </button>
);

export const PracticeModePicker: React.FC<PracticeModePickerProps> = ({
  selectedMode,
  onModeSelect,
  selectedSpeciesId,
  onSpeciesSelect,
  selectedDifficulty,
  onDifficultySelect,
  selectedType,
  onTypeSelect,
}) => {
  const { data: stats } = useUserSRSStats();
  const { data: species = [] } = useSpecies();

  const dueCount = stats?.dueForReview || 0;

  const exerciseTypes = [
    { id: 'visual_match', label: 'Visual Match', description: 'Identify birds from images' },
    { id: 'fill_blank', label: 'Fill in the Blank', description: 'Complete sentences' },
    { id: 'multiple_choice', label: 'Multiple Choice', description: 'Choose correct answer' },
    { id: 'listening', label: 'Listening', description: 'Audio recognition' },
  ];

  const difficulties = [
    { level: 1, label: 'Beginner', color: 'bg-green-500' },
    { level: 2, label: 'Elementary', color: 'bg-blue-500' },
    { level: 3, label: 'Intermediate', color: 'bg-yellow-500' },
    { level: 4, label: 'Advanced', color: 'bg-orange-500' },
    { level: 5, label: 'Expert', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Main Mode Selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Practice Mode</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ModeCard
            title="Review Due"
            description="Practice terms scheduled for review by spaced repetition"
            badge={dueCount > 0 ? dueCount : undefined}
            badgeColor={dueCount > 0 ? 'bg-red-500' : 'bg-gray-400'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            isSelected={selectedMode === 'review'}
            onClick={() => onModeSelect('review')}
          />

          <ModeCard
            title="Quick Quiz"
            description="Random mix of 10 exercises across all content"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            isSelected={selectedMode === 'quick'}
            onClick={() => onModeSelect('quick')}
          />

          <ModeCard
            title="By Species"
            description="Focus on vocabulary for a specific bird species"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            }
            isSelected={selectedMode === 'species'}
            onClick={() => onModeSelect('species')}
          />

          <ModeCard
            title="By Difficulty"
            description="Choose exercises matching your skill level"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            isSelected={selectedMode === 'difficulty'}
            onClick={() => onModeSelect('difficulty')}
          />

          <ModeCard
            title="By Exercise Type"
            description="Practice specific exercise formats"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            }
            isSelected={selectedMode === 'type'}
            onClick={() => onModeSelect('type')}
          />
        </div>
      </div>

      {/* Secondary Selection based on mode */}
      {selectedMode === 'species' && onSpeciesSelect && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Select Species</h3>
          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {species.filter(s => s.annotationCount && s.annotationCount > 0).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSpeciesSelect(s.id)}
                  className={`p-2 text-sm rounded-lg text-left transition-colors ${
                    selectedSpeciesId === s.id
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="font-medium truncate block">{s.spanishName}</span>
                  <span className="text-xs text-gray-500">{s.annotationCount} terms</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedMode === 'difficulty' && onDifficultySelect && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Select Difficulty</h3>
          <div className="flex flex-wrap gap-2">
            {difficulties.map(d => (
              <button
                key={d.level}
                onClick={() => onDifficultySelect(d.level)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDifficulty === d.level
                    ? `${d.color} text-white`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMode === 'type' && onTypeSelect && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Select Exercise Type</h3>
          <div className="space-y-2">
            {exerciseTypes.map(t => (
              <button
                key={t.id}
                onClick={() => onTypeSelect(t.id)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedType === t.id
                    ? 'bg-blue-100 border-2 border-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <span className="font-medium text-gray-900">{t.label}</span>
                <span className="text-sm text-gray-600 ml-2">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTerms}</div>
              <div className="text-xs text-gray-600">Total Terms</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.mastered}</div>
              <div className="text-xs text-gray-600">Mastered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.learning}</div>
              <div className="text-xs text-gray-600">Learning</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.streak}</div>
              <div className="text-xs text-gray-600">Day Streak</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeModePicker;
