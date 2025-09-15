export type ImageSourceType = 'unsplash' | 'midjourney' | 'upload';
export type LicenseType = 'unsplash' | 'cc0' | 'cc-by' | 'custom';

export interface ImageSource {
  id: string;
  speciesId: string;
  sourceType: ImageSourceType;
  sourceId?: string; // Unsplash photo ID
  originalUrl: string;
  localPath?: string;
  thumbnailPath?: string;
  width: number;
  height: number;
  photographer?: {
    name: string;
    url?: string;
  };
  license: {
    type: LicenseType;
    attributionRequired: boolean;
    text?: string;
  };
  downloadedAt?: Date;
  createdAt: Date;
}

export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  width: number;
  height: number;
  description?: string;
  alt_description?: string;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
  tags?: Array<{
    title: string;
  }>;
}

export interface ImageSearchResult {
  query: string;
  results: UnsplashPhoto[];
  total: number;
  totalPages: number;
}

export interface MidjourneyPrompt {
  id: string;
  speciesId: string;
  prompt: string;
  status: 'pending' | 'generated' | 'uploaded' | 'rejected';
  generatedImageUrl?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface ImageImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalSpecies: number;
  processedSpecies: number;
  imagesFound: number;
  imagesDownloaded: number;
  promptsGenerated: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}