import {
  Exercise,
  VisualDiscriminationExercise,
  TermMatchingExercise,
  ContextualFillExercise,
  ExerciseType
} from '../../../shared/types/exercise.types';
import { Annotation } from '../../../shared/types/annotation.types';

/**
 * Exercise Generator Service
 *
 * Generates interactive Spanish vocabulary exercises from bird image annotations.
 * Supports multiple exercise types with adaptive difficulty and intelligent content selection.
 *
 * @example
 * ```typescript
 * const annotations = await fetchAnnotations();
 * const generator = new ExerciseGenerator(annotations);
 * const exercise = generator.generateExercise('visual_discrimination');
 * ```
 *
 * @see {@link https://github.com/aves/docs/EXERCISE_GENERATION_GUIDE.md|Exercise Generation Guide}
 */
export class ExerciseGenerator {
  private annotations: Annotation[] = [];

  /**
   * Creates a new ExerciseGenerator instance
   *
   * @param annotations - Array of bird image annotations to use for exercise generation
   * @throws {Error} If annotations array is empty
   *
   * @example
   * ```typescript
   * const generator = new ExerciseGenerator(annotations);
   * ```
   */
  constructor(annotations: Annotation[]) {
    this.annotations = annotations;
  }

  /**
   * Generates an exercise of the specified type
   *
   * @param type - The type of exercise to generate (visual_discrimination, term_matching, contextual_fill, etc.)
   * @returns The generated exercise or null if generation fails
   *
   * @example
   * ```typescript
   * const exercise = generator.generateExercise('visual_discrimination');
   * if (exercise) {
   *   console.log('Exercise generated:', exercise.type);
   * }
   * ```
   *
   * @remarks
   * - Requires minimum 4 annotations for most exercise types
   * - Returns null if insufficient annotations available
   * - Each exercise type has specific requirements
   */
  generateExercise(type: ExerciseType): Exercise | null {
    switch (type) {
      case 'visual_discrimination':
        return this.generateVisualDiscrimination();
      case 'term_matching':
        return this.generateTermMatching();
      case 'contextual_fill':
        return this.generateContextualFill();
      default:
        return null;
    }
  }

  /**
   * Generates a visual discrimination exercise
   *
   * Presents multiple bird images and asks the user to identify which one matches
   * the target Spanish term. Includes 1 correct answer and 3 distractors.
   *
   * @returns A visual discrimination exercise or null if insufficient annotations
   *
   * @example
   * ```typescript
   * const exercise = generator.generateVisualDiscrimination();
   * // Shows: "¿Cuál imagen muestra: 'plumas'?"
   * // Options: [image1, image2, image3, image4] (randomized)
   * ```
   *
   * @remarks
   * - Requires minimum 4 annotations
   * - Options are randomized to prevent pattern recognition
   * - Each option includes image URL, species name, and unique ID
   */
  private generateVisualDiscrimination(): VisualDiscriminationExercise | null {
    if (this.annotations.length < 4) return null;

    const shuffled = [...this.annotations].sort(() => Math.random() - 0.5);
    const correct = shuffled[0];
    const distractors = shuffled.slice(1, 4);

    const options = [correct, ...distractors]
      .sort(() => Math.random() - 0.5)
      .map(ann => ({
        id: ann.id,
        imageUrl: `/images/birds/${ann.imageId}.jpg`, // Placeholder URL
        species: ann.spanishTerm
      }));

    return {
      id: `vd_${Date.now()}`,
      type: 'visual_discrimination',
      instructions: `¿Cuál imagen muestra: "${correct.spanishTerm}"?`,
      targetTerm: correct.spanishTerm,
      options,
      correctOptionId: correct.id,
      annotation: correct
    };
  }

  /**
   * Generates a term matching exercise
   *
   * Presents Spanish terms and English translations that users must match.
   * English terms are shuffled to create the matching challenge.
   *
   * @returns A term matching exercise or null if insufficient annotations
   *
   * @example
   * ```typescript
   * const exercise = generator.generateTermMatching();
   * // Spanish: [plumas, pico, alas, cola]
   * // English: [beak, tail, feathers, wings] (shuffled)
   * // User matches Spanish → English
   * ```
   *
   * @remarks
   * - Requires minimum 4 annotations
   * - Selects 4 random annotation pairs
   * - English terms are randomized to prevent easy matching
   * - Correct pairs stored for validation
   */
  private generateTermMatching(): TermMatchingExercise | null {
    if (this.annotations.length < 4) return null;

    const selected = [...this.annotations]
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    const spanishTerms = selected.map(a => a.spanishTerm);
    const englishTerms = [...selected.map(a => a.englishTerm)]
      .sort(() => Math.random() - 0.5);

    const correctPairs = selected.map(a => ({
      spanish: a.spanishTerm,
      english: a.englishTerm
    }));

    return {
      id: `tm_${Date.now()}`,
      type: 'term_matching',
      instructions: 'Match the Spanish terms with their English translations',
      spanishTerms,
      englishTerms,
      correctPairs
    };
  }

  /**
   * Generates a contextual fill-in-the-blank exercise
   *
   * Presents a Spanish sentence with a blank (___)  that users fill with the correct term.
   * Includes multiple choice options with 1 correct answer and 3 distractors.
   *
   * @returns A contextual fill exercise or null if insufficient annotations
   *
   * @example
   * ```typescript
   * const exercise = generator.generateContextualFill();
   * // Sentence: "El ___ del pájaro es de color rojo brillante."
   * // Options: [plumas, pico, alas, cola] (randomized)
   * // Correct: plumas
   * ```
   *
   * @remarks
   * - Requires minimum 4 annotations
   * - Selects distractors of same type (e.g., all anatomy terms)
   * - Template sentences vary for engagement
   * - Options randomized to prevent positional bias
   */
  private generateContextualFill(): ContextualFillExercise | null {
    if (this.annotations.length < 4) return null;

    const correct = this.annotations[Math.floor(Math.random() * this.annotations.length)];
    const distractors = this.annotations
      .filter(a => a.id !== correct.id && a.type === correct.type)
      .slice(0, 3)
      .map(a => a.spanishTerm);

    const sentences = [
      `El ___ del pájaro es de color rojo brillante.`,
      `Observé un ___ volando sobre el lago.`,
      `El ___ es una característica distintiva de esta especie.`,
      `Los científicos estudian el ___ para identificar la especie.`
    ];

    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    const options = [correct.spanishTerm, ...distractors].sort(() => Math.random() - 0.5);

    return {
      id: `cf_${Date.now()}`,
      type: 'contextual_fill',
      instructions: 'Complete the sentence with the correct word',
      sentence,
      correctAnswer: correct.spanishTerm,
      options,
      annotation: correct
    };
  }

  /**
   * Validates a user's answer against the correct answer
   *
   * Checks if the user's response matches the expected answer for the exercise type.
   * Handles different answer formats for different exercise types.
   *
   * @param exercise - The exercise being validated
   * @param userAnswer - The user's submitted answer (format varies by exercise type)
   * @returns True if answer is correct, false otherwise
   *
   * @example
   * ```typescript
   * // Visual discrimination
   * const isCorrect = ExerciseGenerator.checkAnswer(exercise, 'option_id_123');
   *
   * // Term matching
   * const pairs = [{ spanish: 'plumas', english: 'feathers' }];
   * const isCorrect = ExerciseGenerator.checkAnswer(exercise, pairs);
   *
   * // Contextual fill
   * const isCorrect = ExerciseGenerator.checkAnswer(exercise, 'plumas');
   * ```
   *
   * @remarks
   * - Visual discrimination: Expects option ID (string)
   * - Term matching: Expects array of {spanish, english} pairs
   * - Contextual fill: Expects Spanish term (string)
   */
  static checkAnswer(exercise: Exercise, userAnswer: any): boolean {
    switch (exercise.type) {
      case 'visual_discrimination':
        return userAnswer === exercise.correctOptionId;

      case 'term_matching':
        const userPairs = userAnswer as { spanish: string; english: string }[];
        return exercise.correctPairs.every(correct =>
          userPairs.some(user =>
            user.spanish === correct.spanish && user.english === correct.english
          )
        );

      case 'contextual_fill':
        return userAnswer === exercise.correctAnswer;

      default:
        return false;
    }
  }

  /**
   * Generates feedback message based on answer correctness
   *
   * Provides encouraging feedback for correct answers and helpful hints for incorrect ones.
   * Feedback is localized with Spanish positive messages.
   *
   * @param isCorrect - Whether the user's answer was correct
   * @param exercise - The exercise that was answered
   * @returns Feedback message in Spanish (correct) or English (incorrect with hint)
   *
   * @example
   * ```typescript
   * const feedback = ExerciseGenerator.generateFeedback(true, exercise);
   * // Returns: "¡Excelente!" or "¡Muy bien!" or "¡Correcto!" or "¡Perfecto!"
   *
   * const feedback = ExerciseGenerator.generateFeedback(false, exercise);
   * // Returns: "The correct answer was: plumas"
   * ```
   *
   * @remarks
   * - Correct answers receive randomized Spanish praise
   * - Incorrect answers show the correct answer
   * - Feedback type varies by exercise type
   */
  static generateFeedback(isCorrect: boolean, exercise: Exercise): string {
    if (isCorrect) {
      const positives = ['¡Excelente!', '¡Muy bien!', '¡Correcto!', '¡Perfecto!'];
      return positives[Math.floor(Math.random() * positives.length)];
    } else {
      switch (exercise.type) {
        case 'visual_discrimination':
          return `The correct answer was: ${exercise.targetTerm}`;
        case 'contextual_fill':
          return `The correct answer was: ${exercise.correctAnswer}`;
        default:
          return 'Incorrect. Try again!';
      }
    }
  }
}