import React from 'react';

interface Bird {
  id: string;
  name: string;
  spanishName: string;
  imageUrl: string;
  annotations: any[];
}

interface BirdSelectorProps {
  birds: Bird[];
  selectedBird: Bird;
  onBirdSelect: (bird: Bird) => void;
}

export const BirdSelector: React.FC<BirdSelectorProps> = ({
  birds,
  selectedBird,
  onBirdSelect
}) => {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm">
        {birds.map(bird => (
          <button
            key={bird.id}
            onClick={() => onBirdSelect(bird)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedBird.id === bird.id
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="block text-xs opacity-75">{bird.name}</span>
            <span>{bird.spanishName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
