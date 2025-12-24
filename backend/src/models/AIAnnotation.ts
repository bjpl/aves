/**
 * AI Annotation Models
 * Defines TypeScript interfaces for AI annotation entities
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIAnnotationItem {
  id: string;
  jobId: string;
  imageId: string;
  spanishTerm: string;
  englishTerm: string;
  boundingBox: BoundingBox;
  type: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficultyLevel: number;
  pronunciation?: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  approvedAnnotationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnnotationJob {
  jobId: string;
  imageId: string;
  annotationData: AIAnnotationItem[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'approved' | 'rejected';
  confidenceScore?: number;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnnotationReview {
  id: string;
  jobId: string;
  reviewerId: string;
  action: 'approve' | 'reject' | 'edit' | 'bulk_approve' | 'bulk_reject';
  affectedItems: number;
  notes?: string;
  createdAt: Date;
}

export interface GenerateAnnotationRequest {
  imageUrl: string;
}

export interface GenerateAnnotationResponse {
  jobId: string;
  status: string;
  imageId: string;
  message: string;
}

export interface ApproveAnnotationRequest {
  notes?: string;
}

export interface RejectAnnotationRequest {
  category?: string; // Rejection category from REJECTION_CATEGORIES
  notes?: string; // Additional reviewer notes
  reason?: string; // Legacy field (deprecated, use category + notes)
}

export interface EditAnnotationRequest {
  spanishTerm?: string;
  englishTerm?: string;
  boundingBox?: BoundingBox;
  type?: 'anatomical' | 'behavioral' | 'color' | 'pattern';
  difficultyLevel?: number;
  pronunciation?: string;
  notes?: string;
}

export interface BulkApproveRequest {
  jobIds: string[];
  notes?: string;
}

export interface BulkApproveResponse {
  message: string;
  approved: number;
  failed: number;
  details: Array<{
    jobId: string;
    status: string;
    itemsApproved?: number;
    error?: string;
  }>;
}

export interface AnnotationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processing: number;
  failed: number;
  avgConfidence: string;
  recentActivity: Array<{
    action: string;
    affectedItems: number;
    createdAt: Date;
    reviewerEmail?: string;
  }>;
}

export interface PendingAnnotationsResponse {
  annotations: AIAnnotationJob[];
  total: number;
  limit: number;
  offset: number;
  status: string;
}
