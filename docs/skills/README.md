# Skill Library Documentation

This directory contains reusable skill patterns for common development tasks, designed for storage in AgentDB and retrieval by AI agents.

## Available Skills

### 1. test-timeout-fix (v1.0.0)
**Category:** Testing
**Status:** Production Ready

Comprehensive pattern for diagnosing and fixing test timeout issues in Vitest/Jest test suites.

**Files:**
- `test-timeout-fix.json` - Machine-readable skill definition
- `test-timeout-fix.md` - Human-readable documentation

**When to Use:**
- Tests timing out or hanging
- Slow test execution
- Unresolved promises
- Missing cleanup
- Mock configuration issues

**Quick Start:**
```typescript
// 1. Check the diagnostic checklist
// 2. Apply relevant fix patterns
// 3. Verify success criteria
```

## Skill Structure

Each skill follows this structure:

```json
{
  "skillId": "unique-skill-identifier",
  "name": "Human-Readable Name",
  "version": "1.0.0",
  "category": "testing|development|debugging|...",
  "tags": ["searchable", "keywords"],
  "description": "What this skill helps with",

  "triggerConditions": ["When to use this skill"],
  "commonCauses": ["Root causes of the problem"],
  "diagnosticSteps": ["How to diagnose the issue"],
  "fixPatterns": ["Proven solutions"],
  "bestPractices": ["Guidelines for success"],
  "troubleshootingChecklist": ["Step-by-step verification"],
  "successCriteria": ["How to measure success"],
  "exampleFixes": ["Before/after code examples"]
}
```

## How Skills Are Created

### Research Phase
1. **Analyze Codebase**: Study existing code patterns
2. **Identify Problems**: Find common issues and anti-patterns
3. **Gather Solutions**: Document working fix patterns
4. **Extract Best Practices**: Distill lessons learned

### Documentation Phase
1. **Structure Knowledge**: Organize into reusable pattern
2. **Create Examples**: Provide clear before/after code
3. **Add Context**: Include when/why to use each pattern
4. **Define Success**: Set measurable criteria

### Integration Phase
1. **Store in AgentDB**: Index for efficient retrieval
2. **Make Searchable**: Add relevant tags and keywords
3. **Version Control**: Track iterations and improvements
4. **Enable Discovery**: Connect to problem detection

## Using Skills in Agent Workflows

### Pattern Detection
```typescript
// Agent detects a problem
const problem = detectTestTimeout(testOutput);

// Query AgentDB for relevant skills
const skills = await agentdb.skills.find({
  tags: { $in: ['timeout', 'async'] }
});

// Apply the skill
const skill = skills[0];
await applySkill(skill, context);
```

### Skill Application
```typescript
// 1. Follow diagnostic steps
for (const step of skill.diagnosticSteps) {
  const result = await executeStep(step);
  if (result.issueFound) {
    // 2. Apply relevant fix pattern
    const fix = skill.fixPatterns.find(f =>
      f.when === result.condition
    );
    await applyFix(fix, context);

    // 3. Verify success criteria
    const success = await verifyCriteria(skill.successCriteria);
    if (success) break;
  }
}
```

### Skill Evolution
```typescript
// Learn from new patterns
const newPattern = await discoverPattern(codebase);

// Update existing skill
await agentdb.skills.updateOne(
  { skillId: 'test-timeout-fix' },
  {
    $push: { fixPatterns: newPattern },
    $set: { version: '1.1.0' }
  }
);
```

## Creating New Skills

### 1. Identify a Pattern
Look for:
- Recurring problems across projects
- Common solution patterns
- Tribal knowledge that should be codified
- Tasks that require specific expertise

### 2. Research the Domain
- Study existing implementations
- Analyze successful solutions
- Document common pitfalls
- Gather best practices

### 3. Structure the Knowledge
Follow the skill template:
```json
{
  "skillId": "new-skill-name",
  "name": "Descriptive Name",
  "version": "1.0.0",
  "category": "relevant-category",
  "tags": ["searchable", "keywords"],

  "triggerConditions": [],
  "commonCauses": [],
  "diagnosticSteps": [],
  "fixPatterns": [],
  "bestPractices": [],
  "exampleFixes": []
}
```

### 4. Validate with Examples
- Provide clear before/after code
- Show multiple scenarios
- Include edge cases
- Demonstrate success criteria

### 5. Document Integration
- How to detect when skill is needed
- How to apply the skill
- How to measure success
- How to update the skill

## Skill Categories

### Testing
- test-timeout-fix
- mock-configuration
- test-isolation
- coverage-improvement

### Development (Planned)
- api-design-patterns
- error-handling-best-practices
- performance-optimization
- security-hardening

### Debugging (Planned)
- memory-leak-detection
- performance-profiling
- error-tracing
- log-analysis

### Architecture (Planned)
- service-design
- database-modeling
- caching-strategies
- scalability-patterns

## Contributing Skills

### Process
1. Research and document the pattern
2. Create JSON and MD files
3. Add examples and validation
4. Test with real scenarios
5. Submit for review

### Quality Guidelines
- Clear trigger conditions
- Step-by-step diagnostics
- Proven fix patterns
- Measurable success criteria
- Comprehensive examples

### Naming Convention
- Use kebab-case for skill IDs
- Be descriptive but concise
- Include domain context
- Version semantically

## Integration with Claude Flow

Skills can be used with Claude Flow for enhanced coordination:

```typescript
// Initialize swarm with skill awareness
await mcp__claude-flow__swarm_init({
  topology: 'mesh',
  maxAgents: 5
});

// Spawn specialist agents with skills
await mcp__claude-flow__agent_spawn({
  type: 'tester',
  capabilities: ['test-timeout-fix', 'mock-configuration']
});

// Orchestrate task using skills
await mcp__claude-flow__task_orchestrate({
  task: 'Fix test timeouts',
  strategy: 'adaptive'
});
```

## Metrics and Success

Track skill effectiveness:
- **Application Count**: How often used
- **Success Rate**: Problems solved / applications
- **Time Saved**: Compared to manual diagnosis
- **Pattern Coverage**: Problems addressed / total problems

## Future Enhancements

### Planned Features
- [ ] Automatic skill discovery from codebase
- [ ] Machine learning for pattern matching
- [ ] Cross-project skill sharing
- [ ] Skill composition (combining skills)
- [ ] Interactive skill application

### Skill Pipeline
1. **Detection**: Auto-detect problems
2. **Matching**: Find relevant skills
3. **Application**: Apply fix patterns
4. **Validation**: Verify success
5. **Learning**: Update skills with new patterns

## References

- [AgentDB Documentation](../agentdb/README.md)
- [Claude Flow Integration](../claude-flow/README.md)
- [Test Patterns](../testing/patterns.md)
- [Development Standards](../standards/README.md)

---

**Last Updated:** 2025-12-03
**Maintained By:** Research Agent
**Status:** Active Development
