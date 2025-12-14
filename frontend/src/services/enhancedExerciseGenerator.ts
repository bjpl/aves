import { ExerciseType } from '../../../shared/types/exercise.types';
import { Annotation } from '../../../shared/types/annotation.types';
import { EnhancedExercise, EnhancedExerciseType } from '../../../shared/types/enhanced-exercise.types';
import { ExerciseAnswer } from '../types/api.types';

export class EnhancedExerciseGenerator {
  private annotations: Annotation[] = [];
  private currentLevel: number = 1;
  private exerciseHistory: string[] = [];

  constructor(annotations: Annotation[]) {
    this.annotations = annotations;
  }

  generateAdaptiveExercise(): EnhancedExercise | null {
    // Adaptive difficulty based on learner progress
    const exerciseTypes = this.getExerciseTypesForLevel(this.currentLevel);
    const type = this.selectNextExerciseType(exerciseTypes);

    return this.generateExercise(type);
  }

  private getExerciseTypesForLevel(level: number): EnhancedExerciseType[] {
    const typesByLevel: Record<number, EnhancedExerciseType[]> = {
      1: ['visual_identification', 'visual_discrimination'],
      2: ['term_matching', 'audio_recognition', 'contextual_fill'],
      3: ['sentence_building', 'cultural_context']
    };

    return typesByLevel[Math.min(level, 3)] || typesByLevel[1];
  }

  private selectNextExerciseType(types: EnhancedExerciseType[]): EnhancedExerciseType {
    // Avoid repeating the same exercise type
    const available = types.filter(t => !this.exerciseHistory.slice(-2).includes(t));
    const selected = available.length > 0 ? available : types;

    const type = selected[Math.floor(Math.random() * selected.length)];
    this.exerciseHistory.push(type);

    return type;
  }

  generateExercise(type: EnhancedExerciseType): EnhancedExercise | null {
    switch (type) {
      case 'visual_identification':
        return this.generateVisualIdentification();
      case 'visual_discrimination':
        return this.generateEnhancedVisualDiscrimination();
      case 'audio_recognition':
        return this.generateAudioRecognition();
      case 'term_matching':
        return this.generateEnhancedTermMatching();
      case 'contextual_fill':
        return this.generateEnhancedContextualFill();
      case 'sentence_building':
        return this.generateSentenceBuilding();
      case 'cultural_context':
        return this.generateCulturalContext();
      default:
        return null;
    }
  }

  private generateVisualIdentification(): EnhancedExercise | null {
    const anatomicalAnnotations = this.annotations.filter(a => a.type === 'anatomical');
    if (anatomicalAnnotations.length === 0) return null;

    const target = anatomicalAnnotations[Math.floor(Math.random() * anatomicalAnnotations.length)];
    const bird = target.imageId || 'flamingo';

    return {
      id: `vi_${Date.now()}`,
      type: 'visual_identification' as ExerciseType,
      annotation: target,
      prompt: target.spanishTerm,
      pedagogicalLevel: 'recognition',
      learningObjective: 'Identify bird anatomy parts in Spanish',
      instructions: 'Click on the bird part',
      metadata: {
        bird,
        targetPart: this.mapTermToPart(target.spanishTerm),
        pronunciation: target.pronunciation,
        tip: `Remember: ${target.spanishTerm} means ${target.englishTerm} in English`
      },
      preTeaching: `Look at the bird image. You'll identify "${target.spanishTerm}" (${target.englishTerm}).`,
      scaffolding: [
        'Look at the overall bird shape',
        'Focus on the specific body parts',
        `Find the ${target.englishTerm}`
      ]
    };
  }

  private generateEnhancedVisualDiscrimination(): EnhancedExercise | null {
    if (this.annotations.length < 4) return null;

    const byDifficulty = this.annotations.filter(a => a.difficultyLevel === this.currentLevel);
    const pool = byDifficulty.length >= 4 ? byDifficulty : this.annotations;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const correct = shuffled[0];
    const distractors = shuffled.slice(1, 4);

    return {
      id: `evd_${Date.now()}`,
      type: 'visual_discrimination',
      annotation: correct,
      prompt: correct.spanishTerm,
      instructions: `Select the image that shows: "${correct.spanishTerm}"`,
      pedagogicalLevel: 'comprehension',
      learningObjective: 'Match Spanish bird terms with visual representations',
      metadata: {
        correctId: correct.id,
        options: [correct, ...distractors].map(a => ({
          id: a.id,
          term: a.spanishTerm,
          image: a.imageId,
          hint: a.englishTerm
        }))
      },
      preTeaching: `"${correct.spanishTerm}" is pronounced "${correct.pronunciation}"`,
      culturalNote: this.getCulturalNote(correct.spanishTerm)
    };
  }

  private generateAudioRecognition(): EnhancedExercise | null {
    const withPronunciation = this.annotations.filter(a => a.pronunciation);
    if (withPronunciation.length < 4) return null;

    const correct = withPronunciation[Math.floor(Math.random() * withPronunciation.length)];
    const options = [correct, ...withPronunciation.filter(a => a.id !== correct.id).slice(0, 3)];

    return {
      id: `ar_${Date.now()}`,
      type: 'audio_recognition' as ExerciseType,
      annotation: correct,
      prompt: 'Listen and select the correct word',
      instructions: 'Which word do you hear?',
      pedagogicalLevel: 'recognition',
      learningObjective: 'Develop Spanish pronunciation recognition',
      metadata: {
        audioText: correct.spanishTerm,
        pronunciation: correct.pronunciation,
        options: options.map(a => ({
          id: a.id,
          text: a.spanishTerm,
          translation: a.englishTerm
        })),
        correctId: correct.id
      },
      scaffolding: [
        'Listen carefully to the pronunciation',
        'Focus on syllable stress',
        'Compare with similar-sounding words'
      ]
    };
  }

  private generateEnhancedTermMatching(): EnhancedExercise | null {
    const byType = this.groupAnnotationsByType();
    const selectedType = Object.keys(byType)[Math.floor(Math.random() * Object.keys(byType).length)];
    const pool = byType[selectedType];

    if (pool.length < 4) return null;

    const selected = pool.slice(0, 4);

    return {
      id: `etm_${Date.now()}`,
      type: 'term_matching',
      annotation: selected[0], // Use first annotation as primary
      prompt: 'Match Spanish and English terms',
      instructions: `Match ${selectedType} vocabulary`,
      pedagogicalLevel: 'application',
      learningObjective: 'Connect Spanish and English bird terminology',
      metadata: {
        pairs: selected.map(a => ({
          spanish: a.spanishTerm,
          english: a.englishTerm,
          hint: a.pronunciation
        })),
        category: selectedType
      },
      preTeaching: `These terms are all related to ${selectedType} features`,
      scaffolding: [
        'Look for cognates (similar words)',
        'Use pronunciation as a memory aid',
        'Group by meaning categories'
      ]
    };
  }

  private generateEnhancedContextualFill(): EnhancedExercise | null {
    const correct = this.annotations[Math.floor(Math.random() * this.annotations.length)];
    const sameType = this.annotations.filter(a => a.type === correct.type && a.id !== correct.id);

    if (sameType.length < 3) return null;

    const contextSentences = this.getContextSentences(correct);
    const sentence = contextSentences[Math.floor(Math.random() * contextSentences.length)];

    return {
      id: `ecf_${Date.now()}`,
      type: 'contextual_fill',
      annotation: correct,
      prompt: sentence.text.replace('___', '_____'),
      instructions: 'Complete the sentence',
      pedagogicalLevel: 'application',
      learningObjective: 'Use Spanish bird vocabulary in context',
      metadata: {
        correctAnswer: correct.spanishTerm,
        options: [correct, ...sameType.slice(0, 3)].map(a => ({
          text: a.spanishTerm,
          translation: a.englishTerm
        })),
        context: sentence.context,
        grammarNote: sentence.grammar
      },
      scaffolding: [
        'Read the entire sentence first',
        'Identify the missing word type',
        'Consider gender and number agreement'
      ],
      culturalNote: sentence.cultural
    };
  }

  private generateSentenceBuilding(): EnhancedExercise | null {
    const annotation = this.annotations[Math.floor(Math.random() * this.annotations.length)];

    const templates = [
      {
        template: 'El [BIRD] tiene [FEATURE] [ADJECTIVE]',
        words: ['El', annotation.imageId || 'pájaro', 'tiene', annotation.spanishTerm, this.getAdjective()],
        translation: `The ${annotation.imageId || 'bird'} has ${annotation.englishTerm} ${this.getAdjectiveTranslation()}`
      },
      {
        template: '[FEATURE] del [BIRD] es [COLOR]',
        words: [annotation.spanishTerm, 'del', annotation.imageId || 'pájaro', 'es', this.getColor()],
        translation: `The ${annotation.englishTerm} of the ${annotation.imageId || 'bird'} is ${this.getColorTranslation()}`
      }
    ];

    const selected = templates[Math.floor(Math.random() * templates.length)];
    const scrambled = [...selected.words].sort(() => Math.random() - 0.5);

    return {
      id: `sb_${Date.now()}`,
      type: 'sentence_building' as ExerciseType,
      annotation: annotation,
      prompt: 'Build a sentence',
      instructions: 'Arrange the words to form a correct sentence',
      pedagogicalLevel: 'synthesis',
      learningObjective: 'Construct Spanish sentences about birds',
      metadata: {
        scrambledWords: scrambled,
        correctOrder: selected.words,
        translation: selected.translation,
        template: selected.template
      },
      scaffolding: [
        'Identify the subject (bird)',
        'Find the verb',
        'Check adjective agreement',
        'Verify word order'
      ],
      preTeaching: 'Spanish word order: Subject + Verb + Object'
    };
  }

  private generateCulturalContext(): EnhancedExercise | null {
    const culturalItems = [
      {
        question: '¿Por qué los flamencos son rosados?',
        options: [
          'Por su dieta de camarones',
          'Por el sol',
          'Por el agua salada',
          'Por sus genes'
        ],
        correct: 0,
        explanation: 'Flamingos get their pink color from carotenoids in the shrimp and algae they eat.',
        cultural: 'In Spanish culture, flamingos symbolize grace and beauty.'
      },
      {
        question: '¿Dónde anidan las cigüeñas en España?',
        options: [
          'En los árboles',
          'En los campanarios de las iglesias',
          'En las cuevas',
          'En el suelo'
        ],
        correct: 1,
        explanation: 'Storks traditionally nest on church bell towers in Spain.',
        cultural: 'Stork nests on churches are considered good luck in Spanish villages.'
      },
      {
        question: '¿Cuál es el ave nacional de España?',
        options: [
          'El águila imperial ibérica',
          'El gorrión',
          'La paloma',
          'El buitre'
        ],
        correct: 0,
        explanation: 'The Spanish Imperial Eagle is a critically endangered species endemic to Spain.',
        cultural: 'This majestic bird represents Spanish pride in conservation efforts.'
      },
      {
        question: '¿Por qué migran muchas aves a España en invierno?',
        options: [
          'Por el clima templado mediterráneo',
          'Por las montañas',
          'Por las playas',
          'Por las ciudades grandes'
        ],
        correct: 0,
        explanation: 'Spain\'s mild Mediterranean climate provides ideal winter conditions for migratory birds.',
        cultural: 'The Strait of Gibraltar is one of the world\'s most important bird migration routes.'
      },
      {
        question: '¿Qué significa cuando un búho canta cerca de tu casa?',
        options: [
          'Mala suerte según tradiciones antiguas',
          'Buena suerte',
          'Va a llover',
          'Alguien va a visitarte'
        ],
        correct: 0,
        explanation: 'In Spanish folklore, owl calls near homes were traditionally considered omens.',
        cultural: 'Modern Spain celebrates owls for pest control and ecological importance.'
      },
      {
        question: '¿Cuál es la función principal del pico del colibrí?',
        options: [
          'Alcanzar el néctar de las flores',
          'Defenderse de predadores',
          'Construir nidos',
          'Atraer pareja'
        ],
        correct: 0,
        explanation: 'Hummingbird beaks are specially adapted to reach nectar deep inside flowers.',
        cultural: 'Though rare in Spain, hummingbirds are studied for biomimicry in Spanish engineering.'
      },
      {
        question: '¿Por qué los loros pueden imitar la voz humana?',
        options: [
          'Tienen un órgano vocal especial llamado siringe',
          'Tienen cuerdas vocales como humanos',
          'Usan el pico para hacer sonidos',
          'Es un instinto natural'
        ],
        correct: 0,
        explanation: 'Parrots have a unique vocal organ called the syrinx that allows complex sound production.',
        cultural: 'Talking parrots have been popular pets in Spanish households for centuries.'
      },
      {
        question: '¿Cuál es el ave más pequeña del mundo?',
        options: [
          'El colibrí zunzuncito',
          'El gorrión',
          'El petirrojo',
          'El canario'
        ],
        correct: 0,
        explanation: 'The Bee Hummingbird (zunzuncito) is the world\'s smallest bird at about 5 cm long.',
        cultural: 'Spanish scientists study miniaturization through hummingbird anatomy.'
      },
      {
        question: '¿Por qué los pájaros carpinteros golpean los árboles?',
        options: [
          'Para buscar insectos y comunicarse',
          'Para afilar el pico',
          'Para marcar territorio solamente',
          'Por diversión'
        ],
        correct: 0,
        explanation: 'Woodpeckers drum to find food and communicate with other woodpeckers.',
        cultural: 'Spanish forests host several woodpecker species vital for forest health.'
      },
      {
        question: '¿Qué ave es símbolo de paz en la cultura española?',
        options: [
          'La paloma blanca',
          'El águila',
          'El gorrión',
          'La golondrina'
        ],
        correct: 0,
        explanation: 'The white dove has been a universal symbol of peace, prominently used in Spanish art.',
        cultural: 'Picasso\'s dove became an iconic peace symbol, deeply rooted in Spanish culture.'
      },
      {
        question: '¿Cuántas veces por segundo puede batir sus alas un colibrí?',
        options: [
          'Hasta 80 veces',
          'Hasta 20 veces',
          'Hasta 200 veces',
          'Hasta 5 veces'
        ],
        correct: 0,
        explanation: 'Hummingbirds can beat their wings 50-80 times per second during normal flight.',
        cultural: 'This rapid movement inspires Spanish drone and robotics research.'
      },
      {
        question: '¿Por qué las aves tienen plumas y no pelo?',
        options: [
          'Las plumas son mejores para volar y aislamiento',
          'Las plumas son más bonitas',
          'El pelo es muy pesado',
          'Las aves son reptiles'
        ],
        correct: 0,
        explanation: 'Feathers provide insulation, waterproofing, and the aerodynamic properties needed for flight.',
        cultural: 'Spanish textile designers study feather structure for innovative materials.'
      }
    ];

    const selected = culturalItems[Math.floor(Math.random() * culturalItems.length)];

    // Find a relevant annotation for this cultural context (optional, may be undefined)
    const annotation = this.annotations.length > 0 ? this.annotations[0] : undefined;

    return {
      id: `cc_${Date.now()}`,
      type: 'cultural_context' as ExerciseType,
      annotation: annotation,
      prompt: selected.question,
      instructions: 'Answer the cultural question',
      pedagogicalLevel: 'analysis',
      learningObjective: 'Understand cultural connections to Spanish bird vocabulary',
      metadata: {
        options: selected.options,
        correctIndex: selected.correct,
        explanation: selected.explanation
      },
      culturalNote: selected.cultural,
      scaffolding: [
        'Think about Spanish geography',
        'Consider traditional practices',
        'Remember cultural symbols'
      ]
    };
  }

  // Helper methods
  private mapTermToPart(spanishTerm: string): string {
    const mapping: Record<string, string> = {
      'el pico': 'beak',
      'las patas': 'legs',
      'las alas': 'wings',
      'las garras': 'talons',
      'los ojos': 'eyes',
      'el cuello': 'neck',
      'las plumas': 'feathers',
      'la cola': 'tail',
      'el pecho': 'breast'
    };
    return mapping[spanishTerm] || 'beak';
  }

  private groupAnnotationsByType(): Record<string, Annotation[]> {
    return this.annotations.reduce((groups, ann) => {
      const type = ann.type || 'general';
      if (!groups[type]) groups[type] = [];
      groups[type].push(ann);
      return groups;
    }, {} as Record<string, Annotation[]>);
  }

  private getContextSentences(annotation: Annotation) {
    const contexts = [
      {
        text: `El ___ del ${annotation.imageId || 'pájaro'} es muy característico.`,
        context: 'describing features',
        grammar: 'Noun-adjective agreement',
        cultural: 'Spanish descriptive language is rich and specific'
      },
      {
        text: `Mira cómo el ${annotation.imageId || 'pájaro'} usa su ___ para comer.`,
        context: 'observing behavior',
        grammar: 'Possessive "su" (his/her/its)',
        cultural: 'Birdwatching is popular in Spanish natural parks'
      },
      {
        text: `Los ___ son importantes para identificar esta especie.`,
        context: 'scientific identification',
        grammar: 'Plural forms',
        cultural: 'Spain has rich ornithological research traditions'
      },
      {
        text: `Este ${annotation.imageId || 'pájaro'} tiene un ___ muy hermoso.`,
        context: 'aesthetic observation',
        grammar: 'Indefinite article + noun',
        cultural: 'Appreciation of natural beauty is valued in Spanish culture'
      },
      {
        text: `¿Has visto el ___ de ese ${annotation.imageId || 'pájaro'}?`,
        context: 'asking questions',
        grammar: 'Question formation with "¿Has visto...?"',
        cultural: 'Conversational Spanish often uses present perfect tense'
      },
      {
        text: `El ___ ayuda al ${annotation.imageId || 'pájaro'} a volar mejor.`,
        context: 'explaining function',
        grammar: 'Verb + infinitive construction',
        cultural: 'Spanish emphasizes cause-and-effect relationships'
      },
      {
        text: `Sin su ___, el ${annotation.imageId || 'pájaro'} no podría sobrevivir.`,
        context: 'expressing necessity',
        grammar: 'Conditional tense + "podría"',
        cultural: 'Spanish uses subjunctive mood for hypotheticals'
      },
      {
        text: `La ___ del ${annotation.imageId || 'pájaro'} es diferente en cada estación.`,
        context: 'seasonal changes',
        grammar: 'Definite article + noun + adjective',
        cultural: 'Spain\'s diverse ecosystems create seasonal bird variations'
      },
      {
        text: `Me gusta observar el ___ cuando el ${annotation.imageId || 'pájaro'} descansa.`,
        context: 'personal preference',
        grammar: '"Me gusta" + infinitive',
        cultural: 'Birdwatching ("observación de aves") is growing in Spain'
      },
      {
        text: `El color del ___ indica la edad del ${annotation.imageId || 'pájaro'}.`,
        context: 'biological indicator',
        grammar: 'Noun phrase as subject',
        cultural: 'Spanish ornithology has deep scientific traditions'
      },
      {
        text: `Podemos identificar el ${annotation.imageId || 'pájaro'} por su ___.`,
        context: 'identification method',
        grammar: '"Por" indicating means/method',
        cultural: 'Field guides focus on distinguishing features'
      },
      {
        text: `Durante la migración, el ___ del ${annotation.imageId || 'pájaro'} cambia de color.`,
        context: 'migration patterns',
        grammar: 'Time expression + verb conjugation',
        cultural: 'Spain is a crucial migration route for many bird species'
      },
      {
        text: `Los científicos miden el ___ para estudiar la salud del ${annotation.imageId || 'pájaro'}.`,
        context: 'scientific research',
        grammar: 'Third person plural verb form',
        cultural: 'Spanish research institutions lead in avian conservation'
      }
    ];
    return contexts;
  }

  private getCulturalNote(term: string): string {
    const notes: Record<string, string> = {
      'el pico': 'Expression: "Cerrar el pico" means to be quiet',
      'las patas': 'Saying: "Meter la pata" means to make a mistake',
      'las alas': 'Phrase: "Dar alas" means to encourage someone',
      'los ojos': 'Expression: "Vista de águila" means sharp vision'
    };
    return notes[term] || 'Spanish has many bird-related expressions';
  }

  private getAdjective(): string {
    const adjectives = ['grande', 'pequeño', 'largo', 'corto', 'fuerte', 'delicado'];
    return adjectives[Math.floor(Math.random() * adjectives.length)];
  }

  private getAdjectiveTranslation(): string {
    const translations: Record<string, string> = {
      'grande': 'large',
      'pequeño': 'small',
      'largo': 'long',
      'corto': 'short',
      'fuerte': 'strong',
      'delicado': 'delicate'
    };
    return translations[this.getAdjective()] || 'beautiful';
  }

  private getColor(): string {
    const colors = ['rojo', 'azul', 'verde', 'amarillo', 'negro', 'blanco', 'gris', 'marrón'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getColorTranslation(): string {
    const translations: Record<string, string> = {
      'rojo': 'red',
      'azul': 'blue',
      'verde': 'green',
      'amarillo': 'yellow',
      'negro': 'black',
      'blanco': 'white',
      'gris': 'gray',
      'marrón': 'brown'
    };
    return translations[this.getColor()] || 'colorful';
  }

  // Progress tracking
  updateLevel(performance: { correct: number; total: number }) {
    const accuracy = performance.correct / performance.total;
    if (accuracy > 0.8 && this.currentLevel < 3) {
      this.currentLevel++;
    } else if (accuracy < 0.5 && this.currentLevel > 1) {
      this.currentLevel--;
    }
  }

  static checkAnswer(exercise: EnhancedExercise, userAnswer: ExerciseAnswer): boolean {
    // Implementation for checking answers based on exercise type
    const metadata = exercise.metadata;
    if (!metadata) return false;

    switch (exercise.type) {
      case 'visual_identification':
        return userAnswer === metadata.targetPart;

      case 'visual_discrimination':
        return userAnswer === metadata.correctId;

      case 'audio_recognition':
        return userAnswer === metadata.correctId;

      case 'contextual_fill':
        return userAnswer === metadata.correctAnswer;

      case 'sentence_building':
        return JSON.stringify(userAnswer) === JSON.stringify(metadata.correctOrder);

      case 'cultural_context':
        return userAnswer === metadata.correctIndex;

      default:
        return false;
    }
  }

  static generateFeedback(isCorrect: boolean, exercise: EnhancedExercise): string {
    if (isCorrect) {
      const positives = [
        '¡Excelente! Excellent work!',
        '¡Muy bien! Very good!',
        '¡Perfecto! Perfect!',
        '¡Fantástico! Fantastic!',
        '¡Increíble! Amazing!'
      ];
      return positives[Math.floor(Math.random() * positives.length)];
    } else {
      const metadata = exercise.metadata;
      let feedback = 'Not quite right. ';

      if (metadata) {
        switch (exercise.type) {
          case 'visual_identification':
            feedback += `Look for "${metadata.targetPart}"`;
            break;
          case 'contextual_fill':
            feedback += `The answer was: ${metadata.correctAnswer}`;
            break;
          case 'cultural_context':
            feedback += metadata.explanation || 'Try again!';
            break;
          default:
            feedback += 'Try again!';
        }
      }

      return feedback;
    }
  }
}