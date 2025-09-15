import {
  Exercise,
  VisualDiscriminationExercise,
  TermMatchingExercise,
  ContextualFillExercise,
  ExerciseType
} from '../../../shared/types/exercise.types';
import { Annotation } from '../../../shared/types/annotation.types';

export class ExerciseGenerator {
  private annotations: Annotation[] = [];

  constructor(annotations: Annotation[]) {
    this.annotations = annotations;
  }

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