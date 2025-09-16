import React, { useState } from 'react';
import { Exercise } from '../../../../shared/types/exercise.types';

interface VisualIdentificationProps {
  exercise: Exercise;
  onAnswer: (answer: any) => void;
  disabled: boolean;
}

export const VisualIdentification: React.FC<VisualIdentificationProps> = ({
  exercise,
  onAnswer,
  disabled
}) => {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  // Bird anatomy map with coordinates for common birds
  const anatomyMaps: Record<string, Array<{id: string, label: string, x: number, y: number, width: number, height: number}>> = {
    flamingo: [
      { id: 'beak', label: 'el pico', x: 25, y: 15, width: 8, height: 5 },
      { id: 'neck', label: 'el cuello', x: 22, y: 20, width: 6, height: 15 },
      { id: 'legs', label: 'las patas', x: 20, y: 50, width: 10, height: 30 },
      { id: 'feathers', label: 'las plumas', x: 15, y: 35, width: 20, height: 15 },
      { id: 'wings', label: 'las alas', x: 10, y: 30, width: 15, height: 20 }
    ],
    eagle: [
      { id: 'beak', label: 'el pico', x: 45, y: 20, width: 8, height: 6 },
      { id: 'talons', label: 'las garras', x: 40, y: 65, width: 12, height: 10 },
      { id: 'eyes', label: 'los ojos', x: 43, y: 18, width: 5, height: 3 },
      { id: 'wings', label: 'las alas', x: 25, y: 30, width: 30, height: 25 },
      { id: 'tail', label: 'la cola', x: 35, y: 55, width: 15, height: 12 }
    ],
    sparrow: [
      { id: 'beak', label: 'el pico', x: 42, y: 25, width: 5, height: 3 },
      { id: 'wings', label: 'las alas', x: 30, y: 35, width: 20, height: 15 },
      { id: 'tail', label: 'la cola', x: 25, y: 45, width: 10, height: 8 },
      { id: 'legs', label: 'las patas', x: 38, y: 50, width: 6, height: 8 },
      { id: 'breast', label: 'el pecho', x: 35, y: 38, width: 10, height: 10 }
    ]
  };

  const targetBird = exercise.metadata?.bird || 'flamingo';
  const targetPart = exercise.metadata?.targetPart || 'beak';
  const anatomyMap = anatomyMaps[targetBird] || anatomyMaps.flamingo;

  const handlePartClick = (partId: string) => {
    if (disabled) return;
    setSelectedPart(partId);
    onAnswer(partId);
  };

  const getPartStyle = (part: typeof anatomyMap[0]) => {
    const isTarget = part.id === targetPart;
    const isHovered = hoveredPart === part.id;
    const isSelected = selectedPart === part.id;

    let borderColor = 'transparent';
    let backgroundColor = 'transparent';
    let opacity = 0;

    if (isHovered && !disabled) {
      borderColor = '#3B82F6';
      backgroundColor = 'rgba(59, 130, 246, 0.1)';
      opacity = 0.8;
    }

    if (isSelected && disabled) {
      if (isTarget) {
        borderColor = '#10B981';
        backgroundColor = 'rgba(16, 185, 129, 0.2)';
        opacity = 1;
      } else {
        borderColor = '#EF4444';
        backgroundColor = 'rgba(239, 68, 68, 0.2)';
        opacity = 1;
      }
    }

    return {
      position: 'absolute' as const,
      left: `${part.x}%`,
      top: `${part.y}%`,
      width: `${part.width}%`,
      height: `${part.height}%`,
      border: `2px solid ${borderColor}`,
      backgroundColor,
      opacity,
      borderRadius: '8px',
      cursor: disabled ? 'default' : 'pointer',
      transition: 'all 0.2s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  };

  const getBirdImage = () => {
    const images: Record<string, string> = {
      flamingo: 'https://images.unsplash.com/photo-1535821265819-8e7ff3c30737?w=600',
      eagle: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=600',
      sparrow: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600',
      stork: 'https://images.unsplash.com/photo-1596071915134-94f36f1d3188?w=600',
      owl: 'https://images.unsplash.com/photo-1557401751-376608588678?w=600',
      peacock: 'https://images.unsplash.com/photo-1512990641230-7e91cc31d0dc?w=600'
    };
    return images[targetBird] || images.flamingo;
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Visual Identification
        </h3>
        <p className="text-lg text-gray-700">
          Click on: <span className="font-bold text-blue-600">{exercise.prompt}</span>
        </p>
        {exercise.metadata?.pronunciation && (
          <p className="text-sm text-gray-500 mt-1 italic">
            {exercise.metadata.pronunciation}
          </p>
        )}
      </div>

      {/* Interactive Bird Image */}
      <div className="relative mx-auto" style={{ maxWidth: '500px' }}>
        <img
          src={getBirdImage()}
          alt="Bird for identification"
          className="w-full rounded-lg shadow-md"
        />

        {/* Overlay hotspots */}
        {anatomyMap.map(part => (
          <div
            key={part.id}
            style={getPartStyle(part)}
            onMouseEnter={() => !disabled && setHoveredPart(part.id)}
            onMouseLeave={() => !disabled && setHoveredPart(null)}
            onClick={() => handlePartClick(part.id)}
          >
            {(hoveredPart === part.id || (selectedPart === part.id && disabled)) && (
              <span className="text-xs font-semibold text-gray-800 bg-white px-2 py-1 rounded shadow-sm">
                {part.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Visual Hints */}
      {!disabled && (
        <div className="flex justify-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-100 border-2 border-blue-500 rounded mr-2"></div>
            <span className="text-gray-600">Hover to explore</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 border-2 border-green-500 rounded mr-2"></div>
            <span className="text-gray-600">Correct</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-100 border-2 border-red-500 rounded mr-2"></div>
            <span className="text-gray-600">Incorrect</span>
          </div>
        </div>
      )}

      {/* Learning Tip */}
      {disabled && selectedPart === targetPart && exercise.metadata?.tip && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-700">
            <strong>💡 Learning Tip:</strong> {exercise.metadata.tip}
          </p>
        </div>
      )}
    </div>
  );
};