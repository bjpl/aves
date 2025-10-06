/**
 * Annotation Quality Control Constants
 *
 * CONCEPT: Comprehensive categories for educational content quality control
 * WHY: Ensure only high-quality, pedagogically sound annotations for learners
 * PATTERN: Structured taxonomy with severity levels and actionable feedback
 */

export const REJECTION_CATEGORIES = {
  // === Technical Issues ===
  NOT_IN_IMAGE: {
    value: 'not_in_image',
    label: 'Feature Not in Image',
    description: 'The identified feature does not exist in this photo',
    icon: '🚫',
    severity: 'critical',
    category: 'technical'
  },
  TOO_SMALL: {
    value: 'too_small',
    label: 'Too Small to See',
    description: 'Feature is too tiny to be useful for learning (<2% of image)',
    icon: '🔬',
    severity: 'high',
    category: 'technical'
  },
  UNCLEAR_BLURRY: {
    value: 'unclear_blurry',
    label: 'Unclear/Blurry',
    description: 'Cannot distinguish feature clearly due to image quality',
    icon: '👓',
    severity: 'high',
    category: 'technical'
  },
  OCCLUDED: {
    value: 'occluded',
    label: 'Blocked/Hidden',
    description: 'Feature is partially or fully obstructed from view',
    icon: '🌿',
    severity: 'medium',
    category: 'technical'
  },

  // === AI Identification Issues ===
  WRONG_IDENTIFICATION: {
    value: 'wrong_id',
    label: 'Misidentified Feature',
    description: 'AI confused one thing for another (e.g., branch as beak)',
    icon: '❌',
    severity: 'critical',
    category: 'identification'
  },
  WRONG_TERM: {
    value: 'wrong_term',
    label: 'Incorrect Spanish/English Term',
    description: 'Translation or terminology is incorrect',
    icon: '📚',
    severity: 'high',
    category: 'identification'
  },
  DUPLICATE: {
    value: 'duplicate',
    label: 'Duplicate Annotation',
    description: 'Same feature already annotated (e.g., "ala" and "alas")',
    icon: '📋',
    severity: 'low',
    category: 'identification'
  },

  // === Educational/Pedagogical Issues ===
  NOT_REPRESENTATIVE: {
    value: 'not_representative',
    label: 'Not a Representative Example',
    description: 'Feature exists but is atypical, unusual angle, or poor teaching example',
    icon: '🎓',
    severity: 'high',
    category: 'pedagogical'
  },
  CONFUSING_FOR_LEARNERS: {
    value: 'confusing',
    label: 'Potentially Confusing',
    description: 'Could mislead learners due to unusual presentation',
    icon: '😕',
    severity: 'medium',
    category: 'pedagogical'
  },
  INAPPROPRIATE_DIFFICULTY: {
    value: 'wrong_difficulty',
    label: 'Inappropriate Difficulty Level',
    description: 'Marked as beginner but should be advanced (or vice versa)',
    icon: '📊',
    severity: 'low',
    category: 'pedagogical'
  },

  // === Positioning Issues ===
  BAD_POSITION: {
    value: 'bad_position',
    label: 'Severely Misaligned',
    description: 'Bounding box is >50% off from actual feature location',
    icon: '🎯',
    severity: 'high',
    category: 'positioning'
  },
  BOX_TOO_LARGE: {
    value: 'box_too_large',
    label: 'Box Includes Too Much',
    description: 'Bounding box captures surrounding area, not just feature',
    icon: '📏',
    severity: 'medium',
    category: 'positioning'
  },
  BOX_TOO_SMALL: {
    value: 'box_too_small',
    label: 'Box Cuts Off Feature',
    description: 'Bounding box is too tight, cuts off part of feature',
    icon: '✂️',
    severity: 'medium',
    category: 'positioning'
  },

  // === Other ===
  OTHER: {
    value: 'other',
    label: 'Other Issue',
    description: 'Other quality issue not listed above',
    icon: '🤔',
    severity: 'low',
    category: 'other'
  }
} as const;

export const QUALITY_FLAGS = {
  // === Needs Action ===
  NEEDS_POSITION_FIX: {
    value: 'needs_position_fix',
    label: 'Position Needs Adjustment',
    description: 'Good annotation, but bounding box needs repositioning (use editor)',
    icon: '🎯',
    color: 'orange',
    requiresAction: true
  },
  NEEDS_TERM_REFINEMENT: {
    value: 'needs_term_refinement',
    label: 'Term Needs Refinement',
    description: 'Spanish/English term is close but needs minor correction',
    icon: '✏️',
    color: 'orange',
    requiresAction: true
  },

  // === Quality Indicators ===
  EXCELLENT_QUALITY: {
    value: 'excellent',
    label: 'Excellent Quality',
    description: 'Perfect annotation - clear, accurate, representative',
    icon: '⭐',
    color: 'green',
    requiresAction: false
  },
  GOOD_WITH_CAVEATS: {
    value: 'good_caveats',
    label: 'Good with Notes',
    description: 'Usable but has minor issues noted',
    icon: '✓',
    color: 'blue',
    requiresAction: false
  },

  // === Context Flags ===
  PARTIALLY_VISIBLE: {
    value: 'partially_visible',
    label: 'Partially Visible',
    description: 'Feature is cut off at image edge (50-90% visible)',
    icon: '✂️',
    color: 'yellow',
    requiresAction: false
  },
  UNUSUAL_ANGLE: {
    value: 'unusual_angle',
    label: 'Unusual Viewing Angle',
    description: 'Feature shown from atypical perspective',
    icon: '📐',
    color: 'blue',
    requiresAction: false
  },
  CONTEXT_SPECIFIC: {
    value: 'context_specific',
    label: 'Context-Specific View',
    description: 'Only visible in certain poses or situations',
    icon: '🔄',
    color: 'blue',
    requiresAction: false
  },

  // === Difficulty Flags ===
  ADVANCED_ONLY: {
    value: 'advanced_only',
    label: 'Advanced Learners Only',
    description: 'Too difficult for beginners, suitable for advanced',
    icon: '🎓',
    color: 'purple',
    requiresAction: false
  },
  BEGINNER_FRIENDLY: {
    value: 'beginner_friendly',
    label: 'Excellent for Beginners',
    description: 'Clear, simple, perfect for beginners',
    icon: '🌟',
    color: 'green',
    requiresAction: false
  },

  // === Image Quality ===
  LOW_CONTRAST: {
    value: 'low_contrast',
    label: 'Low Contrast',
    description: 'Feature blends with background, hard to distinguish',
    icon: '🌫️',
    color: 'gray',
    requiresAction: false
  },
  HIGH_QUALITY_IMAGE: {
    value: 'high_quality',
    label: 'High Quality Image',
    description: 'Excellent photo quality for learning',
    icon: '📸',
    color: 'green',
    requiresAction: false
  }
} as const;

export const DEFER_REASONS = {
  UNSURE: {
    value: 'unsure',
    label: 'Not Sure - Need More Time',
    description: 'Need more time or information to make decision',
    icon: '🤔'
  },
  SECOND_OPINION: {
    value: 'second_opinion',
    label: 'Request Second Opinion',
    description: 'Want another reviewer to verify this annotation',
    icon: '👥'
  },
  RESEARCH_NEEDED: {
    value: 'research_needed',
    label: 'Needs Research',
    description: 'Need to verify Spanish term, anatomy, or translation',
    icon: '📚'
  },
  BATCH_WITH_SIMILAR: {
    value: 'batch_similar',
    label: 'Review with Similar Items',
    description: 'Group with similar annotations for consistency',
    icon: '📦'
  },
  COMPLEX_DECISION: {
    value: 'complex',
    label: 'Complex Edge Case',
    description: 'Requires careful consideration or special handling',
    icon: '⚠️'
  }
} as const;

// Helper functions
export const getRejectionCategory = (value: string) => {
  return Object.values(REJECTION_CATEGORIES).find(cat => cat.value === value);
};

export const getQualityFlag = (value: string) => {
  return Object.values(QUALITY_FLAGS).find(flag => flag.value === value);
};

export const getDeferReason = (value: string) => {
  return Object.values(DEFER_REASONS).find(reason => reason.value === value);
};

// Get rejection categories by severity
export const getRejectionsBySeverity = (severity: 'critical' | 'high' | 'medium' | 'low') => {
  return Object.values(REJECTION_CATEGORIES).filter(cat => cat.severity === severity);
};

// Get rejection categories by category type
export const getRejectionsByCategory = (category: 'technical' | 'identification' | 'pedagogical' | 'positioning' | 'other') => {
  return Object.values(REJECTION_CATEGORIES).filter(cat => cat.category === category);
};

// Get flags that require action
export const getFlagsRequiringAction = () => {
  return Object.values(QUALITY_FLAGS).filter(flag => flag.requiresAction);
};

// Type exports
export type RejectionCategoryValue = typeof REJECTION_CATEGORIES[keyof typeof REJECTION_CATEGORIES]['value'];
export type QualityFlagValue = typeof QUALITY_FLAGS[keyof typeof QUALITY_FLAGS]['value'];
export type DeferReasonValue = typeof DEFER_REASONS[keyof typeof DEFER_REASONS]['value'];
