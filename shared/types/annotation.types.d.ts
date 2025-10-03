export interface Coordinate {
    x: number;
    y: number;
}
export interface BoundingBox {
    topLeft: Coordinate;
    bottomRight: Coordinate;
    width: number;
    height: number;
}
export type AnnotationType = 'anatomical' | 'behavioral' | 'color' | 'pattern' | 'habitat';
export interface Annotation {
    id: string;
    imageId: string;
    boundingBox: BoundingBox;
    type: AnnotationType;
    spanishTerm: string;
    englishTerm: string;
    pronunciation?: string;
    difficultyLevel: 1 | 2 | 3 | 4 | 5;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AnnotationInteraction {
    annotationId: string;
    interactionType: 'hover' | 'click' | 'keyboard';
    timestamp: Date;
    revealed: boolean;
}
export interface Image {
    id: string;
    url: string;
    thumbnailUrl?: string;
    species: string;
    scientificName: string;
    source: 'unsplash' | 'midjourney' | 'uploaded';
    width: number;
    height: number;
    annotations: Annotation[];
    metadata?: {
        photographer?: string;
        license?: string;
        tags?: string[];
    };
}
//# sourceMappingURL=annotation.types.d.ts.map