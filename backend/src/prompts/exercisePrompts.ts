/**
 * Exercise Prompt Templates for GPT-4
 * Optimized for quality, cost efficiency, and Spanish bird vocabulary
 *
 * Target: 90%+ exercise quality with minimal token usage
 * Cost: ~$0.003 per exercise generation with GPT-4 Turbo
 */

import { ExerciseType } from '../types/exercise.types';

export interface UserContext {
  level: 'beginner' | 'intermediate' | 'advanced';
  difficulty: 1 | 2 | 3 | 4 | 5;
  weakTopics?: string[];
  masteredTopics?: string[];
  recentErrors?: string[];
  targetVocabulary?: string[];
}

export interface PromptTemplate {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  examples?: string[];
}

/**
 * Fill-in-the-Blank Prompts
 * Optimized for natural, contextual Spanish sentences
 */
export const FILL_IN_BLANK_PROMPTS = {
  system: `You are a Spanish language expert creating fill-in-the-blank exercises for bird vocabulary.
Output ONLY valid JSON. No markdown, no explanations.`,

  user: (context: UserContext): string => {
    const levelGuide = {
      beginner: 'simple present tense, basic vocabulary',
      intermediate: 'past/future tenses, varied vocabulary',
      advanced: 'subjunctive, complex structures, idiomatic expressions'
    };

    return `Create a fill-in-the-blank exercise for Spanish bird vocabulary.

Level: ${context.level} (${levelGuide[context.level]})
Difficulty: ${context.difficulty}/5
${context.targetVocabulary ? `Focus on: ${context.targetVocabulary.join(', ')}` : ''}
${context.weakTopics ? `Review: ${context.weakTopics.join(', ')}` : ''}

Requirements:
1. Natural, conversational sentence (8-15 words)
2. Clear context for the missing word
3. One blank marked with ___
4. Include 3 plausible distractors
5. Educational and memorable

Return JSON:
{
  "sentence": "El cardenal tiene plumas ___ brillantes.",
  "correctAnswer": "rojas",
  "distractors": ["azules", "verdes", "amarillas"],
  "hint": "Cardinals are known for this color",
  "vocabulary": [
    {"spanish": "plumas", "english": "feathers"},
    {"spanish": "brillantes", "english": "shiny"}
  ],
  "grammar": "adjective agreement: rojas (feminine plural)"
}`;
  },

  maxTokens: 500,
  temperature: 0.7,

  examples: [
    `{
  "sentence": "La garza usa su ___ largo para pescar.",
  "correctAnswer": "pico",
  "distractors": ["cuello", "ala", "pata"],
  "hint": "Birds use this to catch fish",
  "vocabulary": [
    {"spanish": "garza", "english": "heron"},
    {"spanish": "pescar", "english": "to fish"}
  ],
  "grammar": "su = possessive (its/his/her)"
}`
  ]
};

/**
 * Multiple Choice Prompts
 * Optimized for plausible distractors and clear correct answers
 */
export const MULTIPLE_CHOICE_PROMPTS = {
  system: `You are a Spanish language expert creating multiple choice exercises for bird vocabulary.
Output ONLY valid JSON. Generate plausible, educational distractors.`,

  user: (context: UserContext): string => {
    return `Create a multiple choice exercise for Spanish bird vocabulary.

Level: ${context.level}
Difficulty: ${context.difficulty}/5
${context.targetVocabulary ? `Vocabulary: ${context.targetVocabulary.join(', ')}` : ''}

Requirements:
1. Clear, unambiguous question
2. One correct answer
3. Three plausible distractors (not obviously wrong)
4. Educational value
5. Culturally appropriate content

Return JSON:
{
  "question": "¿Qué parte del cuerpo usan los pájaros para volar?",
  "options": [
    {"id": "a", "text": "las alas", "isCorrect": true},
    {"id": "b", "text": "las patas", "isCorrect": false},
    {"id": "c", "text": "el pico", "isCorrect": false},
    {"id": "d", "text": "la cola", "isCorrect": false}
  ],
  "explanation": "Las alas (wings) are used for flight. La cola (tail) helps with steering.",
  "culturalNote": "In Spanish, body parts often use definite articles: las alas, not sus alas"
}`;
  },

  maxTokens: 600,
  temperature: 0.6,

  examples: [
    `{
  "question": "¿Qué color son los flamencos?",
  "options": [
    {"id": "a", "text": "rosados", "isCorrect": true},
    {"id": "b", "text": "azules", "isCorrect": false},
    {"id": "c", "text": "verdes", "isCorrect": false},
    {"id": "d", "text": "amarillos", "isCorrect": false}
  ],
  "explanation": "Flamingos are pink (rosados) from their diet of shrimp and algae.",
  "culturalNote": "Flamenco dance gets its name from flamingo birds due to similar movements"
}`
  ]
};

/**
 * Translation Prompts (Spanish ↔ English)
 * Optimized for multiple acceptable translations
 */
export const TRANSLATION_PROMPTS = {
  system: `You are a bilingual Spanish-English expert creating translation exercises for bird vocabulary.
Accept multiple correct translations. Output ONLY valid JSON.`,

  user: (context: UserContext, direction: 'es-en' | 'en-es'): string => {
    const directionGuide = direction === 'es-en'
      ? 'Translate Spanish to English'
      : 'Translate English to Spanish';

    return `Create a translation exercise for bird vocabulary.

Direction: ${directionGuide}
Level: ${context.level}
Difficulty: ${context.difficulty}/5
${context.targetVocabulary ? `Include: ${context.targetVocabulary.join(', ')}` : ''}

Requirements:
1. Natural sentence (not word-for-word literal)
2. Include 2-3 bird vocabulary terms
3. List ALL acceptable translations
4. Provide context hints
5. Note cultural differences if any

Return JSON:
{
  "sourceText": "El águila tiene garras afiladas para cazar.",
  "sourceLanguage": "es",
  "correctTranslations": [
    "The eagle has sharp talons for hunting.",
    "Eagles have sharp talons to hunt.",
    "The eagle has sharp claws for hunting."
  ],
  "vocabulary": [
    {"spanish": "águila", "english": "eagle"},
    {"spanish": "garras", "english": "talons/claws"},
    {"spanish": "afiladas", "english": "sharp"},
    {"spanish": "cazar", "english": "to hunt"}
  ],
  "hint": "garras can be translated as talons or claws",
  "culturalNote": "Eagles symbolize power in both cultures"
}`;
  },

  maxTokens: 800,
  temperature: 0.5,

  examples: [
    `{
  "sourceText": "The hummingbird's beak is long and thin.",
  "sourceLanguage": "en",
  "correctTranslations": [
    "El pico del colibrí es largo y delgado.",
    "El colibrí tiene el pico largo y delgado.",
    "El pico del colibrí es largo y fino."
  ],
  "vocabulary": [
    {"spanish": "colibrí", "english": "hummingbird"},
    {"spanish": "pico", "english": "beak"},
    {"spanish": "delgado", "english": "thin"},
    {"spanish": "fino", "english": "fine/thin"}
  ],
  "hint": "delgado and fino both mean thin",
  "culturalNote": "Hummingbirds are native to the Americas"
}`
  ]
};

/**
 * Contextual Sentence Prompts
 * Optimized for rich, educational, memorable contexts
 */
export const CONTEXTUAL_PROMPTS = {
  system: `You are a Spanish language expert creating contextual sentences for bird vocabulary learning.
Create memorable, educational sentences. Output ONLY valid JSON.`,

  user: (context: UserContext): string => {
    return `Create a contextual sentence using Spanish bird vocabulary.

Level: ${context.level}
Difficulty: ${context.difficulty}/5
${context.targetVocabulary ? `Include: ${context.targetVocabulary.join(', ')}` : ''}
${context.weakTopics ? `Review: ${context.weakTopics.join(', ')}` : ''}

Requirements:
1. Rich, descriptive sentence (12-20 words)
2. Natural Spanish (not translated English)
3. Include 2-3 bird vocabulary terms
4. Educational content (behavior, habitat, characteristics)
5. Culturally relevant when possible
6. Memorable and engaging

Return JSON:
{
  "sentence": "El búho gira su cabeza casi completamente mientras sus grandes ojos amarillos observan la noche.",
  "vocabulary": [
    {"spanish": "búho", "english": "owl"},
    {"spanish": "cabeza", "english": "head"},
    {"spanish": "ojos", "english": "eyes"}
  ],
  "educationalNote": "Owls can rotate their heads up to 270 degrees because they cannot move their eyes.",
  "culturalNote": "In Spanish folklore, owls (búhos) are symbols of wisdom, like in many cultures.",
  "grammar": "girar = to turn/rotate; mientras = while (conjunction)",
  "pronunciation": "BOO-oh HEE-rah soo kah-BEH-sah"
}`;
  },

  maxTokens: 1000,
  temperature: 0.8,

  examples: [
    `{
  "sentence": "Los flamencos se paran en una pata para conservar calor corporal en las aguas frías.",
  "vocabulary": [
    {"spanish": "flamencos", "english": "flamingos"},
    {"spanish": "pata", "english": "leg"},
    {"spanish": "calor", "english": "heat/warmth"}
  ],
  "educationalNote": "Flamingos stand on one leg to conserve body heat by reducing heat loss.",
  "culturalNote": "Flamingos are found in coastal areas of Spain, especially in Andalusia.",
  "grammar": "se paran = they stand (reflexive verb); para + infinitive = in order to",
  "pronunciation": "flah-MEN-kohs seh PAH-rahn ehn OO-nah PAH-tah"
}`
  ]
};

/**
 * Sentence Building Prompts
 * Optimized for Spanish word order and grammar practice
 */
export const SENTENCE_BUILDING_PROMPTS = {
  system: `You are a Spanish grammar expert creating sentence building exercises.
Focus on proper Spanish word order. Output ONLY valid JSON.`,

  user: (context: UserContext): string => {
    return `Create a sentence building exercise for Spanish bird vocabulary.

Level: ${context.level}
Difficulty: ${context.difficulty}/5
${context.targetVocabulary ? `Include: ${context.targetVocabulary.join(', ')}` : ''}

Requirements:
1. Proper Spanish word order (different from English)
2. Include 1-2 bird vocabulary terms
3. 6-10 words total
4. Grammar teaching point
5. Clear correct order

Return JSON:
{
  "scrambledWords": ["brillantes", "tiene", "cardenal", "rojas", "El", "plumas"],
  "correctOrder": ["El", "cardenal", "tiene", "plumas", "rojas", "brillantes"],
  "sentence": "El cardenal tiene plumas rojas brillantes.",
  "translation": "The cardinal has bright red feathers.",
  "grammarNote": "In Spanish, adjectives usually come AFTER the noun: plumas rojas (not rojas plumas)",
  "vocabulary": [
    {"spanish": "cardenal", "english": "cardinal"},
    {"spanish": "plumas", "english": "feathers"},
    {"spanish": "brillantes", "english": "bright/shiny"}
  ]
}`;
  },

  maxTokens: 350,
  temperature: 0.5
};

/**
 * Audio Recognition Prompts
 * Optimized for pronunciation practice
 */
export const AUDIO_RECOGNITION_PROMPTS = {
  system: `You are a Spanish pronunciation expert creating listening comprehension exercises.
Focus on phonetically similar words. Output ONLY valid JSON.`,

  user: (context: UserContext): string => {
    return `Create an audio recognition exercise for Spanish bird vocabulary.

Level: ${context.level}
Difficulty: ${context.difficulty}/5

Requirements:
1. Target word with clear pronunciation
2. 3 distractors that sound similar
3. Pronunciation guide
4. Listening strategy tip

Return JSON:
{
  "targetWord": "pico",
  "distractors": ["piso", "pito", "rico"],
  "pronunciation": "PEE-koh",
  "translation": "beak",
  "listeningTip": "Listen for the hard 'k' sound in the middle",
  "phonetics": "The 'i' in pico is a short 'ee' sound, stressed on first syllable",
  "minimaPairs": [
    {"word": "piso", "meaning": "floor", "difference": "s vs c sound"},
    {"word": "rico", "meaning": "rich", "difference": "r vs p sound"}
  ]
}`;
  },

  maxTokens: 300,
  temperature: 0.6
};

/**
 * Get prompt template for specific exercise type
 */
export function getPromptTemplate(
  exerciseType: ExerciseType,
  context: UserContext,
  _options?: { direction?: 'es-en' | 'en-es' }
): PromptTemplate {
  switch (exerciseType) {
    case 'contextual_fill':
      return {
        system: FILL_IN_BLANK_PROMPTS.system,
        user: FILL_IN_BLANK_PROMPTS.user(context),
        maxTokens: FILL_IN_BLANK_PROMPTS.maxTokens,
        temperature: FILL_IN_BLANK_PROMPTS.temperature,
        examples: FILL_IN_BLANK_PROMPTS.examples
      };

    case 'visual_discrimination':
      // Use multiple choice for visual discrimination questions
      return {
        system: MULTIPLE_CHOICE_PROMPTS.system,
        user: MULTIPLE_CHOICE_PROMPTS.user(context),
        maxTokens: MULTIPLE_CHOICE_PROMPTS.maxTokens,
        temperature: MULTIPLE_CHOICE_PROMPTS.temperature,
        examples: MULTIPLE_CHOICE_PROMPTS.examples
      };

    case 'sentence_building':
      return {
        system: SENTENCE_BUILDING_PROMPTS.system,
        user: SENTENCE_BUILDING_PROMPTS.user(context),
        maxTokens: SENTENCE_BUILDING_PROMPTS.maxTokens,
        temperature: SENTENCE_BUILDING_PROMPTS.temperature
      };

    case 'audio_recognition':
      return {
        system: AUDIO_RECOGNITION_PROMPTS.system,
        user: AUDIO_RECOGNITION_PROMPTS.user(context),
        maxTokens: AUDIO_RECOGNITION_PROMPTS.maxTokens,
        temperature: AUDIO_RECOGNITION_PROMPTS.temperature
      };

    case 'cultural_context':
      return {
        system: CONTEXTUAL_PROMPTS.system,
        user: CONTEXTUAL_PROMPTS.user(context),
        maxTokens: CONTEXTUAL_PROMPTS.maxTokens,
        temperature: CONTEXTUAL_PROMPTS.temperature,
        examples: CONTEXTUAL_PROMPTS.examples
      };

    default:
      // Default to contextual fill
      return {
        system: FILL_IN_BLANK_PROMPTS.system,
        user: FILL_IN_BLANK_PROMPTS.user(context),
        maxTokens: FILL_IN_BLANK_PROMPTS.maxTokens,
        temperature: FILL_IN_BLANK_PROMPTS.temperature,
        examples: FILL_IN_BLANK_PROMPTS.examples
      };
  }
}

/**
 * Few-shot examples for consistency
 * These help GPT-4 understand the expected output format
 */
export const FEW_SHOT_EXAMPLES = {
  fillInBlank: [
    {
      input: { level: 'beginner', difficulty: 1, targetVocabulary: ['alas'] },
      output: {
        sentence: "Los pájaros usan sus ___ para volar.",
        correctAnswer: "alas",
        distractors: ["patas", "ojos", "picos"],
        hint: "Birds use these to fly",
        vocabulary: [
          { spanish: "pájaros", english: "birds" },
          { spanish: "volar", english: "to fly" }
        ],
        grammar: "sus = their (possessive plural)"
      }
    },
    {
      input: { level: 'intermediate', difficulty: 3, targetVocabulary: ['garras'] },
      output: {
        sentence: "El águila captura a su presa con sus ___ afiladas.",
        correctAnswer: "garras",
        distractors: ["alas", "plumas", "patas"],
        hint: "Sharp parts used for catching prey",
        vocabulary: [
          { spanish: "águila", english: "eagle" },
          { spanish: "captura", english: "captures" },
          { spanish: "presa", english: "prey" },
          { spanish: "afiladas", english: "sharp" }
        ],
        grammar: "afiladas agrees with garras (feminine plural)"
      }
    }
  ],

  multipleChoice: [
    {
      input: { level: 'beginner', difficulty: 2 },
      output: {
        question: "¿Qué tienen los pájaros en sus alas?",
        options: [
          { id: "a", text: "plumas", isCorrect: true },
          { id: "b", text: "escamas", isCorrect: false },
          { id: "c", text: "pelo", isCorrect: false },
          { id: "d", text: "piel", isCorrect: false }
        ],
        explanation: "Birds have feathers (plumas) on their wings. Scales (escamas) are for fish, hair (pelo) is for mammals.",
        culturalNote: "The Spanish word 'pluma' also means pen, as early pens were made from feathers"
      }
    }
  ],

  translation: [
    {
      input: { level: 'intermediate', difficulty: 3, direction: 'es-en' },
      output: {
        sourceText: "Las aves migratorias vuelan miles de kilómetros cada año.",
        sourceLanguage: "es",
        correctTranslations: [
          "Migratory birds fly thousands of kilometers every year.",
          "Migratory birds fly thousands of kilometers each year.",
          "Migrating birds fly thousands of kilometers annually."
        ],
        vocabulary: [
          { spanish: "aves", english: "birds" },
          { spanish: "migratorias", english: "migratory" },
          { spanish: "vuelan", english: "fly" },
          { spanish: "kilómetros", english: "kilometers" }
        ],
        hint: "'Aves' is more formal than 'pájaros'",
        culturalNote: "Many birds migrate between Europe and Africa across Spain"
      }
    }
  ]
};

/**
 * Token estimation utilities
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English/Spanish
  // This is approximate; actual tokenization may vary
  return Math.ceil(text.length / 4);
}

export function estimateCost(inputTokens: number, outputTokens: number, model: string = 'gpt-4-turbo'): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
  };

  const prices = pricing[model] || pricing['gpt-4-turbo'];
  const inputCost = (inputTokens / 1000) * prices.input;
  const outputCost = (outputTokens / 1000) * prices.output;

  return inputCost + outputCost;
}

/**
 * Calculate total prompt cost
 */
export function calculatePromptCost(
  template: PromptTemplate,
  model: string = 'gpt-4-turbo'
): { estimatedTokens: number; estimatedCost: number } {
  const inputTokens = estimateTokens(template.system + template.user);
  const outputTokens = template.maxTokens;

  return {
    estimatedTokens: inputTokens + outputTokens,
    estimatedCost: estimateCost(inputTokens, outputTokens, model)
  };
}
