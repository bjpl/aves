export type SizeCategory = 'small' | 'medium' | 'large';
export type ConservationStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';

export interface Species {
  id: string;
  scientificName: string;
  spanishName: string;
  englishName: string;
  orderName: string;
  familyName: string;
  genus?: string;
  sizeCategory?: SizeCategory;
  primaryColors?: string[];
  habitats?: string[];
  conservationStatus?: ConservationStatus;
  descriptionSpanish?: string;
  descriptionEnglish?: string;
  funFact?: string;
  primaryImageUrl?: string;
  annotationCount?: number;
}

export interface SpeciesFilter {
  searchTerm?: string;
  orderName?: string;
  familyName?: string;
  habitat?: string;
  sizeCategory?: SizeCategory;
  primaryColor?: string;
}

export interface TaxonomicGroup {
  name: string;
  level: 'order' | 'family' | 'genus';
  count: number;
  children?: TaxonomicGroup[];
}

export interface SpeciesStats {
  totalSpecies: number;
  totalAnnotations: number;
  byOrder: Record<string, number>;
  byHabitat: Record<string, number>;
  bySize: Record<SizeCategory, number>;
}