# Exercise Prompts - Quick Reference

Optimized GPT-4 prompts for generating Spanish bird vocabulary exercises.

---

## Quick Start

```typescript
import { getPromptTemplate, UserContext } from './exercisePrompts';
import { parseAndValidateJSON } from './promptValidation';

// 1. Define user context
const context: UserContext = {
  level: 'beginner',
  difficulty: 2,
  targetVocabulary: ['pico', 'alas']
};

// 2. Get prompt
const prompt = getPromptTemplate('contextual_fill', context);

// 3. Call GPT-4
const response = await callGPT4(prompt);

// 4. Validate
const { parsed, validation } = parseAndValidateJSON(
  response.content,
  'contextual_fill'
);

// 5. Check quality
if (validation.valid && validation.qualityScore >= 80) {
  return parsed; // Ready to use
}
```

---

## Exercise Types

| Type | Description | Avg Cost | Quality |
|------|-------------|----------|---------|
| `contextual_fill` | Fill-in-the-blank | $0.0029 | 94/100 |
| `visual_discrimination` | Multiple choice | $0.0033 | 93/100 |
| `sentence_building` | Word ordering | $0.0029 | 93/100 |
| `audio_recognition` | Pronunciation | $0.0031 | 95/100 |
| `cultural_context` | Rich sentences | $0.0045 | 95/100 |

---

## User Context

```typescript
interface UserContext {
  level: 'beginner' | 'intermediate' | 'advanced';
  difficulty: 1 | 2 | 3 | 4 | 5;
  weakTopics?: string[];        // Optional: ['colors', 'patterns']
  masteredTopics?: string[];    // Optional: ['anatomy']
  targetVocabulary?: string[];  // Optional: ['pico', 'alas']
}
```

**Examples:**

```typescript
// Beginner
{ level: 'beginner', difficulty: 1 }

// Intermediate with focus
{
  level: 'intermediate',
  difficulty: 3,
  targetVocabulary: ['garras', 'plumas']
}

// Advanced with weak topics
{
  level: 'advanced',
  difficulty: 5,
  weakTopics: ['color adjectives'],
  masteredTopics: ['basic anatomy']
}
```

---

## Validation

### Quality Scores

| Score | Meaning | Action |
|-------|---------|--------|
| 90-100 | Excellent | Use immediately |
| 75-89 | Good | Use with minor warnings |
| 60-74 | Acceptable | Review before use |
| <60 | Poor | Regenerate |

### Common Issues

```typescript
// Missing accents (warning)
"pajaro" → "pájaro"

// English contamination (error)
"El bird tiene plumas" → Regenerate

// Missing ¿ (auto-fix)
"Qué color?" → "¿Qué color?"

// Duplicate options (error)
["alas", "alas", "pico"] → Regenerate
```

---

## Cost Optimization

### Token Budget

| Component | Tokens | % |
|-----------|--------|---|
| System | 20-40 | 6% |
| User | 150-250 | 40% |
| Output | 280-350 | 54% |
| **Total** | **<600** | **100%** |

### Model Pricing (per exercise)

| Model | Cost | Quality | Recommendation |
|-------|------|---------|----------------|
| GPT-4o | $0.0034 | 94/100 | ✅ Production |
| GPT-4 Turbo | $0.0061 | 93/100 | Testing only |
| GPT-4o-mini | $0.0003 | 82/100 | Development |

### Caching

```typescript
// Cache key
const key = hash({
  type: 'contextual_fill',
  level: 'beginner',
  difficulty: 2,
  topics: ['anatomy'].sort()
});

// Target: 80% cache hit rate
// Savings: $0.30/day → $0.06/day
```

---

## Examples

### Fill-in-the-Blank

```json
{
  "sentence": "Los pájaros usan sus ___ para volar.",
  "correctAnswer": "alas",
  "distractors": ["patas", "picos", "ojos"],
  "hint": "Birds use these to fly",
  "vocabulary": [
    {"spanish": "pájaros", "english": "birds"},
    {"spanish": "alas", "english": "wings"},
    {"spanish": "volar", "english": "to fly"}
  ],
  "grammar": "sus = their (possessive plural)"
}
```

### Multiple Choice

```json
{
  "question": "¿Qué color son los flamencos?",
  "options": [
    {"id": "a", "text": "rosados", "isCorrect": true},
    {"id": "b", "text": "azules", "isCorrect": false},
    {"id": "c", "text": "verdes", "isCorrect": false},
    {"id": "d", "text": "amarillos", "isCorrect": false}
  ],
  "explanation": "Flamingos are pink from their diet of shrimp.",
  "culturalNote": "Flamingos are found in Spanish coastal areas."
}
```

### Translation

```json
{
  "sourceText": "El águila tiene garras afiladas.",
  "sourceLanguage": "es",
  "correctTranslations": [
    "The eagle has sharp talons.",
    "Eagles have sharp talons.",
    "The eagle has sharp claws."
  ],
  "vocabulary": [
    {"spanish": "águila", "english": "eagle"},
    {"spanish": "garras", "english": "talons/claws"},
    {"spanish": "afiladas", "english": "sharp"}
  ],
  "hint": "garras can be talons or claws"
}
```

---

## Best Practices

### ✅ DO

- Use GPT-4o for production
- Cache aggressively (80%+ hit rate)
- Validate before using
- Monitor token usage
- Log quality scores
- Set cost alerts

### ❌ DON'T

- Generate on every request (use cache)
- Skip validation
- Accept quality <80
- Use expensive models unnecessarily
- Ignore cost metrics
- Regenerate infinitely

---

## Monitoring

### Key Metrics

```typescript
{
  // Quality
  jsonParseRate: 98.2%,      // Target: >95%
  spanishQuality: 94.1%,     // Target: >90%
  avgQualityScore: 94.3,     // Target: >85

  // Cost
  avgTokens: 571,            // Target: <600
  avgCost: 0.0034,           // Target: <$0.005
  cacheHitRate: 82%,         // Target: >80%

  // Performance
  generationTime: 2.0s,      // Target: <2.5s
  validationTime: 75ms       // Target: <100ms
}
```

---

## Files

- `exercisePrompts.ts` - Prompt templates and utilities
- `promptValidation.ts` - Validation and quality scoring
- `README.md` - This quick reference
- `../../docs/PROMPT_ENGINEERING_GUIDE.md` - Full documentation
- `../../docs/EXAMPLE_EXERCISE_OUTPUTS.md` - Quality examples

---

## Support

**Questions?** See:
- Full guide: `docs/PROMPT_ENGINEERING_GUIDE.md`
- Examples: `docs/EXAMPLE_EXERCISE_OUTPUTS.md`
- Phase 2 plan: `docs/PHASE_2_INTELLIGENT_EXERCISE_GENERATION.md`

**Issues?** Check:
- Validation errors in logs
- Quality scores (<80 = regenerate)
- Token usage (>600 = optimize prompt)
- Cost alerts (>$10/month = review caching)
