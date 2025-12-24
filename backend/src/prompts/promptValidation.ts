/**
 * Prompt Validation Utilities
 * Validates GPT-4 generated exercise content for quality and correctness
 */

import { ExerciseType } from '../types/exercise.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number; // 0-100
}

export interface SpanishValidationRules {
  requireAccents: boolean;
  checkGrammar: boolean;
  checkGender: boolean;
  checkVocabulary: boolean;
}

export interface VocabularyEntry {
  spanish: string;
  english: string;
}

export interface FillInBlankExercise {
  sentence: string;
  correctAnswer: string;
  distractors: string[];
  hint?: string;
  vocabulary?: VocabularyEntry[];
  grammar?: string;
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MultipleChoiceExercise {
  question: string;
  options: MultipleChoiceOption[];
  explanation?: string;
  vocabulary?: VocabularyEntry[];
}

export interface TranslationExercise {
  sourceText: string;
  sourceLanguage: 'es' | 'en';
  correctTranslations: string[];
  vocabulary?: VocabularyEntry[];
}

export interface ContextualSentenceExercise {
  sentence: string;
  vocabulary: VocabularyEntry[];
  educationalNote?: string;
}

/**
 * Spanish Language Patterns
 */
const SPANISH_PATTERNS = {
  // Common Spanish characters
  accents: /[áéíóúüñ¿¡]/i,

  // Common Spanish words
  articles: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],

  // Bird anatomy vocabulary
  birdAnatomy: [
    'pico', 'alas', 'plumas', 'cola', 'patas', 'garras',
    'ojos', 'cuello', 'pecho', 'cabeza', 'pata'
  ],

  // Colors
  colors: [
    'rojo', 'roja', 'rojos', 'rojas',
    'azul', 'azules',
    'verde', 'verdes',
    'amarillo', 'amarilla', 'amarillos', 'amarillas',
    'negro', 'negra', 'negros', 'negras',
    'blanco', 'blanca', 'blancos', 'blancas'
  ],

  // Common birds
  commonBirds: [
    'águila', 'búho', 'colibrí', 'flamenco', 'garza',
    'loro', 'pájaro', 'pájaros', 'ave', 'aves',
    'cardenal', 'pelícano', 'tucán', 'pingüino'
  ],

  // Question words
  questionWords: ['qué', 'cómo', 'dónde', 'cuándo', 'quién', 'cuál', 'por qué']
};

/**
 * Validate Spanish text quality
 */
export function validateSpanishText(
  text: string,
  rules: SpanishValidationRules = {
    requireAccents: true,
    checkGrammar: true,
    checkGender: true,
    checkVocabulary: true
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 100;

  // Check minimum length
  if (text.length < 10) {
    errors.push('Text too short (minimum 10 characters)');
    qualityScore -= 30;
  }

  // Check maximum length for sentences
  if (text.length > 500) {
    warnings.push('Text very long (may be too complex)');
    qualityScore -= 10;
  }

  // Check for Spanish accents (if required)
  if (rules.requireAccents && text.length > 20) {
    if (!SPANISH_PATTERNS.accents.test(text)) {
      warnings.push('No Spanish accents found (á, é, í, ó, ú, ñ, ¿, ¡)');
      qualityScore -= 15;
    }
  }

  // Check for question marks
  if (text.includes('?') && !text.includes('¿')) {
    errors.push('Missing opening question mark (¿)');
    qualityScore -= 20;
  }

  // Check for exclamation marks
  if (text.includes('!') && !text.includes('¡')) {
    warnings.push('Missing opening exclamation mark (¡)');
    qualityScore -= 10;
  }

  // Check for common English words (possible translation errors)
  const englishWords = ['the', 'and', 'is', 'are', 'have', 'has', 'with', 'for'];
  const foundEnglish = englishWords.filter(word =>
    text.toLowerCase().includes(` ${word} `)
  );
  if (foundEnglish.length > 0) {
    errors.push(`Possible English words found: ${foundEnglish.join(', ')}`);
    qualityScore -= 25;
  }

  // Check capitalization
  if (text.length > 0 && text[0] !== text[0].toUpperCase()) {
    warnings.push('Text should start with capital letter');
    qualityScore -= 5;
  }

  // Check for proper sentence ending
  if (text.length > 0 && !['.', '?', '!'].includes(text[text.length - 1])) {
    warnings.push('Sentence should end with punctuation');
    qualityScore -= 5;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Validate vocabulary entries
 */
export function validateVocabulary(
  vocab: VocabularyEntry[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 100;

  if (!Array.isArray(vocab)) {
    errors.push('Vocabulary must be an array');
    return { valid: false, errors, warnings, qualityScore: 0 };
  }

  if (vocab.length === 0) {
    warnings.push('No vocabulary entries provided');
    qualityScore -= 20;
  }

  vocab.forEach((entry, index) => {
    // Check required fields
    if (!entry.spanish || !entry.english) {
      errors.push(`Vocabulary entry ${index}: missing spanish or english field`);
      qualityScore -= 15;
      return;
    }

    // Check Spanish text
    const spanishResult = validateSpanishText(entry.spanish, {
      requireAccents: false, // Not all words have accents
      checkGrammar: false,
      checkGender: false,
      checkVocabulary: false
    });

    if (!spanishResult.valid) {
      warnings.push(`Vocabulary entry ${index} (${entry.spanish}): ${spanishResult.errors.join(', ')}`);
      qualityScore -= 5;
    }

    // Check for empty strings
    if (entry.spanish.trim().length === 0 || entry.english.trim().length === 0) {
      errors.push(`Vocabulary entry ${index}: empty string`);
      qualityScore -= 10;
    }

    // Check for reasonable length
    if (entry.spanish.length > 50 || entry.english.length > 50) {
      warnings.push(`Vocabulary entry ${index}: unusually long (might be a phrase, not a word)`);
      qualityScore -= 5;
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Validate fill-in-the-blank exercise
 */
export function validateFillInBlank(exercise: FillInBlankExercise): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 100;

  // Check required fields
  if (!exercise.sentence) {
    errors.push('Missing sentence field');
    qualityScore -= 30;
  } else {
    // Check for blank marker
    if (!exercise.sentence.includes('___')) {
      errors.push('Sentence must contain ___ blank marker');
      qualityScore -= 25;
    }

    // Count blanks
    const blankCount = (exercise.sentence.match(/___/g) || []).length;
    if (blankCount > 1) {
      errors.push('Sentence should have exactly one blank');
      qualityScore -= 20;
    }

    // Validate Spanish text
    const textValidation = validateSpanishText(exercise.sentence);
    if (!textValidation.valid) {
      errors.push(...textValidation.errors);
      qualityScore -= 15;
    }
    if (textValidation.warnings.length > 0) {
      warnings.push(...textValidation.warnings);
    }
  }

  // Check correct answer
  if (!exercise.correctAnswer) {
    errors.push('Missing correctAnswer field');
    qualityScore -= 30;
  } else {
    if (exercise.correctAnswer.trim().length === 0) {
      errors.push('correctAnswer cannot be empty');
      qualityScore -= 25;
    }

    // Check if answer fits the blank
    if (exercise.sentence && exercise.sentence.includes('___')) {
      const filledSentence = exercise.sentence.replace('___', exercise.correctAnswer);
      const validation = validateSpanishText(filledSentence);
      if (!validation.valid) {
        warnings.push('Filled sentence may have issues');
      }
    }
  }

  // Check distractors
  if (!exercise.distractors || !Array.isArray(exercise.distractors)) {
    errors.push('Missing or invalid distractors array');
    qualityScore -= 20;
  } else {
    if (exercise.distractors.length < 3) {
      errors.push('Must have at least 3 distractors');
      qualityScore -= 15;
    }

    // Check for duplicates
    const allOptions = [exercise.correctAnswer, ...exercise.distractors];
    const unique = new Set(allOptions);
    if (unique.size !== allOptions.length) {
      errors.push('Distractors must be unique (no duplicates with correct answer)');
      qualityScore -= 20;
    }

    // Check distractor quality
    exercise.distractors.forEach((distractor: string, index: number) => {
      if (distractor.trim().length === 0) {
        errors.push(`Distractor ${index} is empty`);
        qualityScore -= 10;
      }
    });
  }

  // Check vocabulary
  if (exercise.vocabulary) {
    const vocabValidation = validateVocabulary(exercise.vocabulary);
    if (!vocabValidation.valid) {
      warnings.push(...vocabValidation.errors);
      qualityScore -= 10;
    }
  }

  // Check hint
  if (!exercise.hint || exercise.hint.trim().length === 0) {
    warnings.push('No hint provided');
    qualityScore -= 5;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Validate multiple choice exercise
 */
export function validateMultipleChoice(exercise: MultipleChoiceExercise): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 100;

  // Check question
  if (!exercise.question) {
    errors.push('Missing question field');
    qualityScore -= 30;
  } else {
    const validation = validateSpanishText(exercise.question);
    if (!validation.valid) {
      errors.push(...validation.errors);
      qualityScore -= 15;
    }
  }

  // Check options
  if (!exercise.options || !Array.isArray(exercise.options)) {
    errors.push('Missing or invalid options array');
    qualityScore -= 30;
    return { valid: false, errors, warnings, qualityScore: 0 };
  }

  if (exercise.options.length < 4) {
    errors.push('Must have at least 4 options');
    qualityScore -= 25;
  }

  // Check for exactly one correct answer
  const correctOptions = exercise.options.filter((opt: MultipleChoiceOption) => opt.isCorrect);
  if (correctOptions.length === 0) {
    errors.push('No correct option specified');
    qualityScore -= 30;
  } else if (correctOptions.length > 1) {
    errors.push('Multiple correct options found (should have exactly one)');
    qualityScore -= 25;
  }

  // Validate each option
  exercise.options.forEach((option: MultipleChoiceOption, index: number) => {
    if (!option.id) {
      errors.push(`Option ${index}: missing id field`);
      qualityScore -= 10;
    }
    if (!option.text) {
      errors.push(`Option ${index}: missing text field`);
      qualityScore -= 10;
    }
    if (option.isCorrect === undefined) {
      errors.push(`Option ${index}: missing isCorrect field`);
      qualityScore -= 10;
    }

    // Validate option text
    if (option.text) {
      const validation = validateSpanishText(option.text, {
        requireAccents: false,
        checkGrammar: false,
        checkGender: false,
        checkVocabulary: false
      });
      if (!validation.valid) {
        warnings.push(`Option ${index} may have issues: ${validation.errors.join(', ')}`);
      }
    }
  });

  // Check for duplicate options
  const optionTexts = exercise.options.map((opt: MultipleChoiceOption) => opt.text?.toLowerCase());
  const uniqueTexts = new Set(optionTexts);
  if (uniqueTexts.size !== optionTexts.length) {
    errors.push('Duplicate options found');
    qualityScore -= 20;
  }

  // Check explanation
  if (!exercise.explanation) {
    warnings.push('No explanation provided');
    qualityScore -= 5;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Validate translation exercise
 */
export function validateTranslation(exercise: TranslationExercise): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 100;

  // Check source text
  if (!exercise.sourceText) {
    errors.push('Missing sourceText field');
    qualityScore -= 30;
  }

  // Check source language
  if (!exercise.sourceLanguage || !['es', 'en'].includes(exercise.sourceLanguage)) {
    errors.push('sourceLanguage must be "es" or "en"');
    qualityScore -= 20;
  }

  // Validate source text language
  if (exercise.sourceLanguage === 'es') {
    const validation = validateSpanishText(exercise.sourceText);
    if (!validation.valid) {
      errors.push('Source text (Spanish) has validation errors');
      warnings.push(...validation.errors);
      qualityScore -= 15;
    }
  }

  // Check correct translations
  if (!exercise.correctTranslations || !Array.isArray(exercise.correctTranslations)) {
    errors.push('Missing or invalid correctTranslations array');
    qualityScore -= 30;
  } else {
    if (exercise.correctTranslations.length === 0) {
      errors.push('Must have at least one correct translation');
      qualityScore -= 25;
    }

    // Validate each translation
    exercise.correctTranslations.forEach((trans: string, index: number) => {
      if (!trans || trans.trim().length === 0) {
        errors.push(`Translation ${index} is empty`);
        qualityScore -= 10;
      }

      // If target is Spanish, validate
      if (exercise.sourceLanguage === 'en') {
        const validation = validateSpanishText(trans);
        if (!validation.valid) {
          warnings.push(`Translation ${index} may have issues`);
        }
      }
    });

    // Check for duplicates
    const unique = new Set(exercise.correctTranslations);
    if (unique.size !== exercise.correctTranslations.length) {
      warnings.push('Duplicate translations found');
      qualityScore -= 10;
    }
  }

  // Check vocabulary
  if (exercise.vocabulary) {
    const vocabValidation = validateVocabulary(exercise.vocabulary);
    if (!vocabValidation.valid) {
      warnings.push(...vocabValidation.errors);
      qualityScore -= 10;
    }
  } else {
    warnings.push('No vocabulary provided');
    qualityScore -= 5;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Validate contextual sentence
 */
export function validateContextualSentence(exercise: ContextualSentenceExercise): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 100;

  // Check sentence
  if (!exercise.sentence) {
    errors.push('Missing sentence field');
    qualityScore -= 30;
  } else {
    // Validate Spanish text
    const validation = validateSpanishText(exercise.sentence);
    if (!validation.valid) {
      errors.push(...validation.errors);
      qualityScore -= 15;
    }
    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings);
    }

    // Check length (should be substantial for context)
    if (exercise.sentence.length < 30) {
      warnings.push('Sentence seems short for contextual exercise');
      qualityScore -= 10;
    }
  }

  // Check vocabulary
  if (!exercise.vocabulary || exercise.vocabulary.length === 0) {
    warnings.push('No vocabulary entries provided');
    qualityScore -= 15;
  } else {
    const vocabValidation = validateVocabulary(exercise.vocabulary);
    if (!vocabValidation.valid) {
      warnings.push(...vocabValidation.errors);
      qualityScore -= 10;
    }

    // Check if vocabulary words appear in sentence
    exercise.vocabulary.forEach((vocab: VocabularyEntry) => {
      if (exercise.sentence && !exercise.sentence.toLowerCase().includes(vocab.spanish.toLowerCase())) {
        warnings.push(`Vocabulary word "${vocab.spanish}" not found in sentence`);
        qualityScore -= 5;
      }
    });
  }

  // Check educational note
  if (!exercise.educationalNote) {
    warnings.push('No educational note provided');
    qualityScore -= 5;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityScore: Math.max(0, qualityScore)
  };
}

/**
 * Main validation function - routes to specific validators
 */
export function validateExercise(
  exercise: FillInBlankExercise | MultipleChoiceExercise | TranslationExercise | ContextualSentenceExercise,
  exerciseType: ExerciseType
): ValidationResult {
  // First check if it's valid JSON
  if (!exercise || typeof exercise !== 'object') {
    return {
      valid: false,
      errors: ['Exercise must be a valid object'],
      warnings: [],
      qualityScore: 0
    };
  }

  // Route to specific validator
  switch (exerciseType) {
    case 'contextual_fill':
      return validateFillInBlank(exercise as FillInBlankExercise);

    case 'visual_discrimination':
    case 'term_matching':
      return validateMultipleChoice(exercise as MultipleChoiceExercise);

    case 'cultural_context':
      return validateContextualSentence(exercise as ContextualSentenceExercise);

    default:
      // Generic validation
      return {
        valid: true,
        errors: [],
        warnings: ['No specific validator for this exercise type'],
        qualityScore: 80
      };
  }
}

/**
 * Parse and validate JSON response from GPT-4
 */
export function parseAndValidateJSON(
  content: string,
  exerciseType: ExerciseType
): { parsed: FillInBlankExercise | MultipleChoiceExercise | TranslationExercise | ContextualSentenceExercise | null; validation: ValidationResult } {
  let parsed: FillInBlankExercise | MultipleChoiceExercise | TranslationExercise | ContextualSentenceExercise | null = null;

  try {
    // Remove markdown code blocks if present
    let jsonString = content.trim();
    jsonString = jsonString.replace(/^```json\s*\n?/i, '');
    jsonString = jsonString.replace(/\n?```\s*$/, '');
    jsonString = jsonString.trim();

    // Parse JSON
    parsed = JSON.parse(jsonString) as FillInBlankExercise | MultipleChoiceExercise | TranslationExercise | ContextualSentenceExercise;
  } catch (error) {
    return {
      parsed: null,
      validation: {
        valid: false,
        errors: [`JSON parse error: ${(error as Error).message}`],
        warnings: [],
        qualityScore: 0
      }
    };
  }

  // Validate the parsed exercise
  const validation = validateExercise(parsed, exerciseType);

  return { parsed, validation };
}

/**
 * Batch validate multiple exercises
 */
export function batchValidateExercises(
  exercises: Array<{ exercise: FillInBlankExercise | MultipleChoiceExercise | TranslationExercise | ContextualSentenceExercise; type: ExerciseType }>
): Array<ValidationResult & { index: number }> {
  return exercises.map((item, index) => ({
    index,
    ...validateExercise(item.exercise, item.type)
  }));
}
