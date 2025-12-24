import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CMSService } from '../../services/cms.service';
import { LazyImage } from '../ui/LazyImage';

interface Bird {
  id: number;
  attributes: {
    spanishName: string;
    englishName: string;
    images?: {
      data?: Array<{
        attributes: {
          url: string;
        };
      }>;
    };
  };
}

interface LessonContentProps {
  content: string;
  birds?: { data: Bird[] };
  onBack: () => void;
  onNext: () => void;
}

export const LessonContent: React.FC<LessonContentProps> = ({
  content,
  birds,
  onBack,
  onNext
}) => {
  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>

      {/* Related Birds */}
      {birds?.data && birds.data.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Featured Birds</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {birds.data.map((bird) => (
              <div key={bird.id} className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
                {bird.attributes.images?.data?.[0] && (
                  <LazyImage
                    src={CMSService.getMediaUrl(bird.attributes.images.data[0].attributes.url)}
                    alt={bird.attributes.spanishName}
                    className="w-20 h-20 rounded-lg"
                    blurAmount={10}
                  />
                )}
                <div>
                  <h4 className="font-medium">{bird.attributes.spanishName}</h4>
                  <p className="text-sm text-gray-600">{bird.attributes.englishName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          Take Quiz
          <ChevronRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
};
