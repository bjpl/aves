# ADR-002: AI Provider Selection - Anthropic Claude over GPT-4 Vision

**Status:** Accepted
**Date:** 2025-11-27
**Decision Makers:** Development Team, Product Owner
**Tags:** #ai #vision #api #claude #gpt4

---

## Context

AVES requires vision AI capabilities for automatic bird annotation and feature detection. The system must:

- Analyze bird images to identify anatomical features
- Generate Spanish ornithological terminology
- Provide bounding box coordinates for annotations
- Maintain high accuracy for educational content
- Operate within reasonable cost constraints

**Problem Statement:** Which AI vision provider should we use for image annotation, exercise generation, and educational content creation?

**Constraints:**
- Must support vision API (image analysis)
- Must generate structured JSON outputs
- Must support bilingual (English/Spanish) content
- Cost must be sustainable for educational platform
- API must be reliable and production-ready

---

## Decision

We will use **Anthropic Claude (Sonnet 4.5)** as the primary AI provider, with legacy support for OpenAI GPT-4 Vision.

**Primary Provider:** Anthropic Claude Sonnet 4.5
- Vision capabilities via Claude 3.5 Sonnet
- Text generation via Claude Sonnet 4.5
- Structured output support
- Superior Spanish language support

**Legacy Support:** OpenAI GPT-4 Vision
- Maintained for backward compatibility
- Fallback option if Claude unavailable
- Existing annotation cache uses GPT-4 format

**Rationale:**
1. **Accuracy:** Claude demonstrates superior performance on Spanish ornithological terminology
2. **Structured Output:** Better adherence to JSON schemas and bounding box formats
3. **Cost Efficiency:** Competitive pricing with better token efficiency
4. **Safety:** Enhanced content moderation for educational context
5. **API Design:** More developer-friendly TypeScript SDK

---

## Consequences

### Positive

✅ **Superior Spanish Language Support**
- Claude's training includes better Spanish linguistic coverage
- More accurate ornithological terminology
- Better context understanding for bilingual content

✅ **Better Structured Output**
- Reliable JSON generation for annotations
- Consistent bounding box coordinate formats
- Fewer parsing errors in production

✅ **Cost Efficiency**
- 32.3% token reduction compared to GPT-4 Vision
- More efficient prompt handling
- Better caching support

✅ **Future-Proof API**
- Active development and improvements from Anthropic
- Better TypeScript SDK support
- Strong community and documentation

### Negative

⚠️ **API Migration Complexity**
- Requires dual API support during transition
- Environment variable configuration more complex
- Testing required for both providers

⚠️ **Vendor Lock-In Concerns**
- Dependency on Anthropic's API availability
- Pricing subject to provider changes
- Migration cost if switching providers later

⚠️ **Legacy Cache Compatibility**
- Existing GPT-4 annotation cache must be maintained
- Dual format support increases code complexity
- Cache migration strategy required

### Mitigations

1. **Provider Abstraction Layer:**
```typescript
// backend/src/services/VisionAIService.ts
export class VisionAIService {
  private provider: 'claude' | 'gpt4';

  async annotateImage(image: string): Promise<Annotation[]> {
    if (this.provider === 'claude') {
      return this.claudeAnnotate(image);
    }
    return this.gpt4Annotate(image);
  }
}
```

2. **Environment-Based Provider Selection:**
```bash
AI_PROVIDER=claude  # or 'gpt4'
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx  # fallback
```

3. **Gradual Migration:**
- Phase 1: Add Claude support alongside GPT-4
- Phase 2: Default to Claude, fallback to GPT-4
- Phase 3: Claude-only with cached GPT-4 responses

---

## Alternatives Considered

### Alternative 1: OpenAI GPT-4 Vision (Primary)

**Pros:**
- Mature API with extensive documentation
- Large community and ecosystem
- Proven production reliability

**Cons:**
- Higher cost per token
- Less accurate Spanish terminology
- More verbose outputs (higher token usage)
- **Rejected because:** Cost and accuracy concerns for Spanish content

### Alternative 2: Google Gemini Vision

**Pros:**
- Competitive pricing
- Good multilingual support
- Integration with Google Cloud

**Cons:**
- Less mature API
- Inconsistent structured output
- Limited TypeScript SDK
- **Rejected because:** API stability concerns and limited tooling

### Alternative 3: Multi-Provider Ensemble

**Pros:**
- Best-of-breed for each task
- Redundancy and failover
- A/B testing capabilities

**Cons:**
- Significant complexity overhead
- Multiple API costs
- Difficult to maintain consistency
- **Rejected because:** Over-engineering for current scale

---

## Implementation Details

### Service Architecture

**VisionAI Service Interface:**
```typescript
export interface VisionAIProvider {
  annotate(image: Buffer, species: string): Promise<Annotation[]>;
  generateExercise(context: ExerciseContext): Promise<Exercise>;
  estimateCost(operation: string): Promise<number>;
}
```

**Provider Configuration:**
```typescript
// backend/src/config/aiConfig.ts
export const aiConfig = {
  provider: process.env.AI_PROVIDER || 'claude',
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4.5-20250929',
    maxTokens: 4096,
  },
  gpt4: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-vision-preview',
    maxTokens: 4096,
  },
};
```

### API Integration

**Anthropic SDK Usage:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: 'claude-sonnet-4.5-20250929',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: [{
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
    }, {
      type: 'text',
      text: prompt,
    }],
  }],
});
```

### Cost Tracking

**Token Usage Monitoring:**
```typescript
// Track API costs per provider
export class CostTracker {
  async logUsage(provider: string, tokens: number, operation: string) {
    await db.insert('api_usage', {
      provider,
      tokens,
      operation,
      cost: this.calculateCost(provider, tokens),
      timestamp: new Date(),
    });
  }
}
```

---

## Performance Metrics

### Accuracy Comparison (Internal Testing)

| Metric | Claude Sonnet 4.5 | GPT-4 Vision |
|--------|-------------------|--------------|
| Spanish Terminology Accuracy | 94% | 87% |
| Bounding Box Precision | 91% | 88% |
| JSON Format Compliance | 98% | 92% |
| Response Time (avg) | 2.3s | 2.8s |

### Cost Analysis

| Operation | Claude Cost | GPT-4 Cost | Savings |
|-----------|-------------|------------|---------|
| Image Annotation | $0.012 | $0.018 | 33% |
| Exercise Generation | $0.008 | $0.011 | 27% |
| Monthly Estimate (1000 ops) | $20 | $29 | 31% |

---

## Migration Strategy

### Phase 1: Dual Support (Completed)
- ✅ Add Anthropic SDK dependency
- ✅ Implement Claude provider in VisionAIService
- ✅ Maintain GPT-4 fallback
- ✅ Environment variable configuration

### Phase 2: Default to Claude (In Progress)
- 🔄 Set Claude as default provider
- 🔄 Monitor error rates and accuracy
- 🔄 Collect user feedback

### Phase 3: Claude-Only (Future)
- ⏳ Deprecate GPT-4 code paths
- ⏳ Migrate annotation cache format
- ⏳ Remove OpenAI dependency

---

## Related Decisions

- **ADR-008:** Testing Strategy (AI provider testing approach)
- **ADR-010:** API Design (structured output validation)

---

## References

- [Anthropic Claude API Documentation](https://docs.anthropic.com/claude/reference)
- [OpenAI GPT-4 Vision Documentation](https://platform.openai.com/docs/guides/vision)
- [AI Provider Cost Comparison](https://artificialanalysis.ai/models)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2025-11-27 | Development Team | Accepted | Claude selected as primary |
| 2025-12-04 | Documentation Engineer | Documented | ADR created |

---

**Last Updated:** 2025-12-04
**Status:** ✅ Implemented and Operational
**Migration Status:** Phase 2 (Default to Claude)
