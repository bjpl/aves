import React from 'react';

interface Annotation {
  id: string;
  term: string;
  english: string;
  pronunciation: string;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  description: string;
}

interface InteractiveBirdImageProps {
  imageUrl: string;
  altText: string;
  annotations: Annotation[];
  discoveredTerms: Set<string>;
  hoveredAnnotation: string | null;
  onAnnotationHover: (id: string | null) => void;
  onAnnotationClick: (annotation: Annotation) => void;
}

export const InteractiveBirdImage: React.FC<InteractiveBirdImageProps> = ({
  imageUrl,
  altText,
  annotations,
  discoveredTerms,
  hoveredAnnotation,
  onAnnotationHover,
  onAnnotationClick
}) => {
  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt={altText}
        className="w-full rounded-lg"
        onError={(e) => {
          console.error('Image failed to load:', imageUrl);
          // Use a real bird image as fallback for better UX
          e.currentTarget.onerror = null; // Prevent infinite loop
          e.currentTarget.src = 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&h=600&fit=crop&q=80';
        }}
      />

      {/* Annotation Hotspots */}
      {annotations.map(annotation => (
        <div
          key={annotation.id}
          className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
          onMouseEnter={() => onAnnotationHover(annotation.id)}
          onMouseLeave={() => onAnnotationHover(null)}
          onClick={() => onAnnotationClick(annotation)}
        >
          {/* Pulsing dot */}
          <div className={`relative ${discoveredTerms.has(annotation.id) ? '' : 'animate-pulse'}`}>
            <div className={`w-8 h-8 rounded-full border-3 ${
              discoveredTerms.has(annotation.id)
                ? 'bg-green-500 border-green-600'
                : 'bg-blue-500 border-blue-600'
            } opacity-75`} />
            {discoveredTerms.has(annotation.id) && (
              <svg className="absolute inset-0 w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Hover tooltip */}
          {hoveredAnnotation === annotation.id && (
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg whitespace-nowrap z-10">
              <div className="text-sm font-bold">{annotation.term}</div>
              <div className="text-xs opacity-90">{annotation.english}</div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="border-8 border-transparent border-t-gray-900" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
