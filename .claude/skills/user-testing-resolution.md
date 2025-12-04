---
name: user-testing-resolution
description: Systematic workflow for resolving user testing issues with swarm coordination, AgentDB learning, and GOAP planning
version: 1.0.0
tags: [qa, testing, swarm-coordination, agentdb, goap, neural-training, systematic-resolution]
author: Claude Code
created: 2025-12-04
requires:
  - claude-flow@alpha
  - agentdb
  - npm (for package management)
category: quality-assurance
difficulty: intermediate
---

# User Testing Issue Resolution

**Systematic workflow for analyzing, resolving, and learning from user testing feedback using swarm coordination, AgentDB pattern learning, and GOAP planning.**

## Overview

This skill provides a comprehensive, repeatable process for addressing user testing issues through:

- **Priority-based triage** of testing notes
- **Parallel agent swarms** for category-specific investigation
- **AgentDB integration** for pattern learning and experience replay
- **Neural training** on successful resolution strategies
- **GOAP planning** for automated future issue resolution
- **Test-driven fixes** ensuring regression prevention

### When to Use This Skill

- After receiving user testing feedback
- When addressing QA reports
- For systematic bug fixing workflows
- To build organizational knowledge from testing insights
- When training AI agents on resolution patterns

---

## Prerequisites

### Required Tools

```bash
# Verify claude-flow is available
npx claude-flow@alpha --version

# Verify AgentDB MCP server is configured
# Check Claude Desktop MCP settings for agentdb server

# Project should have:
# - Test infrastructure (Jest/Mocha/Pytest/etc.)
# - Version control (Git)
# - Package manager (npm/yarn/pip/etc.)
```

### Environment Setup

```bash
# Initialize AgentDB for learning storage
# (AgentDB MCP server should be configured in Claude Desktop)

# Ensure git is clean or on a feature branch
git status

# Create testing notes file if not exists
mkdir -p docs/testing
touch docs/testing/user-feedback.md
```

---

## Workflow Steps

### Step 1: Analyze Testing Notes

**Objective:** Parse and prioritize user testing feedback

<details>
<summary>📋 Detailed Process</summary>

```bash
# Read testing notes (adjust path to your file)
# Example: docs/testing/user-feedback.md
```

**Analysis Checklist:**
- [ ] Categorize issues (UI, Backend, Performance, UX, Security, etc.)
- [ ] Assign priority (Critical, High, Medium, Low)
- [ ] Identify affected components/modules
- [ ] Note reproduction steps
- [ ] Extract user impact assessment

**Example Categorization:**

```yaml
categories:
  critical:
    - database_transaction_failures
    - authentication_bypass_risk
  high:
    - slow_query_performance
    - missing_validation_errors
  medium:
    - ui_inconsistencies
    - unclear_error_messages
  low:
    - style_improvements
    - documentation_gaps
```

**Store Analysis in AgentDB:**

```javascript
// Use AgentDB MCP tools to store analysis
mcp__agentdb__agentdb_insert({
  text: "User testing analysis: [summary of findings]",
  metadata: {
    session_id: "user-testing-[date]",
    issue_count: [total],
    critical_count: [number],
    categories: ["ui", "backend", "performance"]
  },
  tags: ["user-testing", "triage", "analysis"]
})
```

</details>

---

### Step 2: Initialize Swarm Coordination

**Objective:** Set up parallel agent topology for efficient resolution

<details>
<summary>🔄 Swarm Setup</summary>

**Choose Topology Based on Issue Complexity:**

| Issue Count | Topology | Reasoning |
|-------------|----------|-----------|
| 1-3 issues | `star` | Centralized coordination for simple fixes |
| 4-8 issues | `mesh` | Peer-to-peer for moderate complexity |
| 9+ issues | `hierarchical` | Structured layers for complex resolution |

```bash
# Initialize swarm coordination (MCP coordination layer)
npx claude-flow@alpha swarm init --topology mesh --max-agents 6
```

**Agent Types to Spawn:**

- **Issue Analyzer** - Investigates root causes
- **Code Reviewer** - Examines affected code sections
- **Test Engineer** - Creates regression tests
- **Fix Implementer** - Writes corrective code
- **Documentation Updater** - Updates relevant docs
- **Integration Validator** - Ensures system-wide compatibility

</details>

---

### Step 3: Spawn Parallel Investigation Agents

**Objective:** Deploy specialized agents via Task tool for concurrent issue resolution

<details>
<summary>🤖 Agent Deployment Pattern</summary>

**CRITICAL:** Use Claude Code's **Task tool** for actual agent execution (NOT MCP tools).

**Single Message - Parallel Agent Execution:**

```javascript
// ALL agents spawned in ONE message via Task tool
Task("Critical Issue Analyzer", `
  Investigate critical issues: [list from Step 1]

  For each issue:
  1. Run hooks: npx claude-flow@alpha hooks pre-task --description "Analyze critical issue [ID]"
  2. Locate affected code files
  3. Identify root cause
  4. Store findings: npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/critical/[issue-id]"
  5. Propose fix strategy
  6. Complete: npx claude-flow@alpha hooks post-task --task-id "critical-[id]"

  Store all findings in AgentDB with episode tracking.
`, "researcher")

Task("High Priority Resolver", `
  Resolve high-priority issues: [list from Step 1]

  For each issue:
  1. Pre-task hook: npx claude-flow@alpha hooks pre-task --description "Fix high-priority [ID]"
  2. Write failing test first (TDD)
  3. Implement minimal fix
  4. Verify test passes
  5. Post-edit hook: npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/high/[issue-id]"
  6. Document changes
  7. Complete: npx claude-flow@alpha hooks post-task --task-id "high-[id]"

  Record episodes in AgentDB for learning.
`, "coder")

Task("Test Coverage Engineer", `
  Create comprehensive tests for ALL fixes:

  1. Pre-task: npx claude-flow@alpha hooks pre-task --description "Test coverage for user issues"
  2. Write unit tests for each bug fix
  3. Write integration tests for affected workflows
  4. Achieve 90%+ coverage on modified code
  5. Store test patterns: npx claude-flow@alpha hooks post-edit --file "tests/*" --memory-key "swarm/tests/patterns"
  6. Complete: npx claude-flow@alpha hooks post-task --task-id "test-coverage"

  Store successful test patterns in AgentDB.
`, "tester")

Task("Performance Validator", `
  Analyze performance-related issues: [list from Step 1]

  1. Pre-task hook: npx claude-flow@alpha hooks pre-task --description "Performance validation"
  2. Benchmark affected operations (before/after)
  3. Identify bottlenecks
  4. Propose optimizations
  5. Validate improvements with metrics
  6. Post-task: npx claude-flow@alpha hooks post-task --task-id "performance"

  Store performance patterns in AgentDB.
`, "perf-analyzer")

Task("Documentation Specialist", `
  Update documentation for resolved issues:

  1. Pre-task: npx claude-flow@alpha hooks pre-task --description "Documentation updates"
  2. Update API docs if interfaces changed
  3. Update user guides for UX fixes
  4. Add troubleshooting entries
  5. Update CHANGELOG.md
  6. Complete: npx claude-flow@alpha hooks post-task --task-id "docs"

  Store documentation patterns in AgentDB.
`, "api-docs")

// Batch ALL todos in ONE call
TodoWrite({
  todos: [
    {content: "Analyze critical issues", status: "in_progress", activeForm: "Analyzing critical issues"},
    {content: "Resolve high-priority bugs", status: "in_progress", activeForm: "Resolving high-priority bugs"},
    {content: "Create comprehensive tests", status: "in_progress", activeForm: "Creating comprehensive tests"},
    {content: "Validate performance improvements", status: "in_progress", activeForm: "Validating performance"},
    {content: "Update documentation", status: "in_progress", activeForm: "Updating documentation"},
    {content: "Store patterns in AgentDB", status: "pending", activeForm: "Storing patterns in AgentDB"},
    {content: "Train neural models", status: "pending", activeForm: "Training neural models"},
    {content: "Create GOAP plan", status: "pending", activeForm: "Creating GOAP plan"},
    {content: "Commit and push changes", status: "pending", activeForm: "Committing changes"}
  ]
})
```

**Key Pattern:** All agents coordinate through:
- **Pre-task hooks** (session restore, context loading)
- **Post-edit hooks** (memory storage, notification)
- **Post-task hooks** (metrics export, session end)

</details>

---

### Step 4: Store Findings in AgentDB

**Objective:** Persist resolution patterns for future learning

<details>
<summary>💾 AgentDB Integration</summary>

**Store Each Resolution as an Episode:**

```javascript
// For each resolved issue, store as AgentDB episode
mcp__agentdb__reflexion_store({
  session_id: "user-testing-resolution-[date]",
  task: "Resolve [issue category]: [brief description]",
  input: "[Issue details from testing notes]",
  output: "[Fix implemented]",
  reward: [0.0-1.0 based on success],
  success: [true/false],
  critique: "[Self-critique: what worked, what could improve]",
  latency_ms: [time taken],
  tokens: [tokens used if tracked]
})
```

**Reward Scoring Guide:**

- **1.0** - Perfect fix, comprehensive tests, no regressions
- **0.8** - Good fix, adequate tests, minor issues
- **0.6** - Fix works but incomplete tests or edge cases
- **0.4** - Partial fix, needs refinement
- **0.2** - Fix attempted but failed

**Store Skills Developed:**

```javascript
mcp__agentdb__skill_create({
  name: "[Issue Type] Resolution Pattern",
  description: "Systematic approach for resolving [category] issues",
  code: "[Pseudocode or key steps]",
  success_rate: [calculated from episodes]
})
```

**Example Episode Storage:**

```javascript
// Critical database transaction failure resolved
mcp__agentdb__reflexion_store({
  session_id: "user-testing-resolution-2025-12-04",
  task: "Fix database transaction rollback failures in AnnotationService",
  input: "User reported annotation save failures with 500 errors. Database showed uncommitted transactions causing locks.",
  output: "Added explicit BEGIN/COMMIT wrappers, implemented transaction retry logic with exponential backoff, added comprehensive error logging.",
  reward: 0.95,
  success: true,
  critique: "Solution is robust and includes proper error handling. Could improve by adding transaction timeout configuration for production environments.",
  latency_ms: 2400000,
  tokens: 15000
})
```

</details>

---

### Step 5: Implement Fixes with Tests

**Objective:** Apply test-driven development for all resolutions

<details>
<summary>🔧 TDD Implementation Pattern</summary>

**For Each Issue:**

1. **Write Failing Test**
   ```bash
   # Example: Jest test for backend
   describe('Issue #42 - Annotation Save Failure', () => {
     it('should complete transaction successfully', async () => {
       // Arrange: Set up test scenario
       const annotation = createTestAnnotation();

       // Act: Perform operation that was failing
       const result = await annotationService.save(annotation);

       // Assert: Verify fix works
       expect(result.success).toBe(true);
       expect(result.transactionCommitted).toBe(true);
     });
   });
   ```

2. **Implement Minimal Fix**
   ```typescript
   // backend/src/services/AnnotationService.ts
   async save(annotation: Annotation): Promise<SaveResult> {
     const transaction = await db.beginTransaction();

     try {
       const result = await transaction.insert(annotation);
       await transaction.commit(); // FIX: Explicit commit

       return { success: true, transactionCommitted: true, data: result };
     } catch (error) {
       await transaction.rollback();
       logger.error('Transaction failed', error);
       throw new TransactionError(error);
     }
   }
   ```

3. **Verify Test Passes**
   ```bash
   npm test -- --testNamePattern="Issue #42"
   ```

4. **Add Edge Case Tests**
   ```typescript
   it('should rollback on validation error', async () => { /* ... */ });
   it('should retry on deadlock', async () => { /* ... */ });
   it('should timeout after max retries', async () => { /* ... */ });
   ```

5. **Run Full Test Suite**
   ```bash
   npm test
   ```

**Commit Pattern:**

```bash
git add [modified-files] [test-files]
git commit -m "fix: resolve [issue description] from user testing

- Add transaction commit wrappers
- Implement retry logic
- Add comprehensive error handling
- Tests: 95% coverage on AnnotationService

Resolves user testing issue #42

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

</details>

---

### Step 6: Train Neural Patterns

**Objective:** Learn from successful resolution strategies

<details>
<summary>🧠 Neural Training Process</summary>

**After Successful Fixes:**

```javascript
// Train AgentDB neural patterns on successful resolution episodes
mcp__agentdb__learning_start_session({
  user_id: "user-testing-resolution",
  session_type: "decision-transformer",
  config: {
    learning_rate: 0.01,
    discount_factor: 0.95,
    exploration_rate: 0.1,
    batch_size: 32
  }
})

// Store pattern for each resolution category
mcp__agentdb__agentdb_pattern_store({
  taskType: "database_transaction_fix",
  approach: "Explicit transaction management with BEGIN/COMMIT wrappers, retry logic, comprehensive logging",
  successRate: 0.95,
  metadata: {
    affected_files: ["backend/src/services/AnnotationService.ts"],
    test_coverage: 0.95,
    resolution_time_ms: 2400000
  },
  tags: ["database", "transactions", "critical-fix"]
})

// Provide feedback to learning system
mcp__agentdb__learning_feedback({
  session_id: "[learning-session-id]",
  state: "database transaction failure",
  action: "implement explicit transaction management",
  reward: 0.95,
  success: true,
  next_state: "transactions completing successfully with retry logic"
})

// Train the model
mcp__agentdb__learning_train({
  session_id: "[learning-session-id]",
  epochs: 50,
  batch_size: 32,
  learning_rate: 0.01
})
```

**Pattern Categories to Train:**

- **Database Issues** - Transaction handling, query optimization, connection pooling
- **Authentication** - Session management, token validation, permission checks
- **API Errors** - Input validation, error responses, rate limiting
- **UI Bugs** - State management, rendering issues, event handling
- **Performance** - Caching strategies, lazy loading, query optimization

**Retrieve Patterns for Future Issues:**

```javascript
// When new similar issue arises
const recommendations = await mcp__agentdb__learning_predict({
  session_id: "[learning-session-id]",
  state: "[new issue description]"
})

// Get explanation of recommendation
const explanation = await mcp__agentdb__learning_explain({
  query: "[new issue description]",
  k: 5,
  include_causal: true,
  include_confidence: true,
  include_evidence: true
})
```

</details>

---

### Step 7: Create GOAP Plan

**Objective:** Automate future similar issue resolution

<details>
<summary>🎯 GOAP Planning for Automation</summary>

**Goal-Oriented Action Planning (GOAP)** creates automated workflows based on learned patterns.

**Define Goals and Actions:**

```yaml
# GOAP Plan: User Testing Issue Resolution Automation

goals:
  - name: "All critical issues resolved"
    conditions:
      - critical_issue_count == 0
      - all_critical_tests_passing == true

  - name: "All high-priority issues resolved"
    conditions:
      - high_priority_count == 0
      - test_coverage >= 0.90

actions:
  - name: "Analyze Issue"
    preconditions:
      - issue_exists == true
      - issue_analyzed == false
    effects:
      - issue_analyzed = true
      - root_cause_identified = true
    cost: 10

  - name: "Write Test"
    preconditions:
      - issue_analyzed == true
      - test_exists == false
    effects:
      - test_exists = true
      - test_failing = true
    cost: 15

  - name: "Implement Fix"
    preconditions:
      - test_exists == true
      - test_failing == true
      - fix_implemented == false
    effects:
      - fix_implemented = true
      - test_passing = true
    cost: 25

  - name: "Store Pattern"
    preconditions:
      - fix_implemented == true
      - test_passing == true
      - pattern_stored == false
    effects:
      - pattern_stored = true
      - learning_complete = true
    cost: 5

initial_state:
  - critical_issue_count: 3
  - high_priority_count: 5
  - issue_analyzed: false
  - test_exists: false
  - fix_implemented: false
  - pattern_stored: false
```

**Execute GOAP Plan:**

```bash
# Using claude-flow GOAP integration
npx claude-flow@alpha goap plan \
  --goal "All critical issues resolved" \
  --state-file "docs/testing/issue-state.json" \
  --actions-file "docs/testing/resolution-actions.json"

# GOAP will generate optimal action sequence
# Claude Code agents then execute the plan
```

**Store GOAP Plan in AgentDB:**

```javascript
mcp__agentdb__agentdb_insert({
  text: "GOAP plan for user testing resolution: [plan summary]",
  metadata: {
    plan_type: "user_testing_resolution",
    goal_count: 2,
    action_count: 4,
    estimated_cost: 55,
    success_rate: 0.92
  },
  tags: ["goap", "automation", "user-testing", "workflow"]
})
```

**Future Automation:**

Next time user testing issues arrive, AgentDB can suggest:
1. Retrieve similar past issues
2. Load GOAP plan for that category
3. Execute plan automatically with minimal human oversight
4. Continuously improve based on outcomes

</details>

---

## Integration with Mandatory Tools

### AgentDB Integration Points

| Workflow Step | AgentDB Tool | Purpose |
|---------------|--------------|---------|
| Analysis | `agentdb_insert` | Store categorized issues |
| Investigation | `reflexion_retrieve` | Find similar past issues |
| Resolution | `reflexion_store` | Record resolution episode |
| Testing | `skill_create` | Store test patterns |
| Learning | `learning_train` | Train on successful fixes |
| Future Use | `learning_predict` | Suggest solutions for new issues |

### Claude-Flow Hooks

**Pre-Operation Hooks:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "user-testing-[id]"
```

**During Operation Hooks:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[issue]"
npx claude-flow@alpha hooks notify --message "[progress update]"
```

**Post-Operation Hooks:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

### GOAP Planning

**Plan Generation:**
```bash
npx claude-flow@alpha goap plan --goal "[goal]" --state-file "[state]"
```

**Plan Execution:**
```bash
npx claude-flow@alpha goap execute --plan-file "[plan]"
```

---

## Complete Example Workflow

### Scenario: User Testing Revealed 8 Issues

**Testing Notes Summary:**
- 2 Critical (database transactions, authentication bypass)
- 3 High (slow queries, missing validation, error handling)
- 2 Medium (UI inconsistencies, unclear messages)
- 1 Low (documentation gap)

**Execution:**

```bash
# Step 1: Analyze (manual or agent-assisted)
# Read docs/testing/user-feedback-2025-12-04.md
# Categorize and prioritize issues

# Step 2: Initialize swarm (MCP coordination)
npx claude-flow@alpha swarm init --topology mesh --max-agents 5

# Step 3: Spawn agents via Task tool (see Step 3 above for full example)
# ALL agents spawned in single message with Task tool
# - Critical Issue Analyzer
# - High Priority Resolver
# - Test Coverage Engineer
# - Performance Validator
# - Documentation Specialist

# Step 4: Agents execute with hooks integration
# Pre-task: Load session context
# During: Store progress in memory
# Post-task: Export metrics

# Step 5: Store all findings in AgentDB
# Each agent stores episodes, patterns, and skills

# Step 6: Train neural models on successful fixes
# Decision Transformer learns optimal fix strategies

# Step 7: Generate GOAP plan for future automation
# Store plan for next user testing cycle

# Step 8: Commit all changes
git add backend/ tests/ docs/
git commit -m "fix: resolve 8 user testing issues

Critical fixes:
- Database transaction management
- Authentication security hardening

High priority:
- Query performance optimization
- Input validation
- Error handling improvements

Tests: 95% coverage on modified code
AgentDB: 8 episodes stored, 3 patterns learned

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

---

## Best Practices

### 1. Priority-Driven Execution

Always address issues in priority order:
1. **Critical** - Security, data loss, system crashes
2. **High** - Major functionality broken, poor performance
3. **Medium** - UX issues, minor bugs
4. **Low** - Polish, documentation, enhancements

### 2. Test-First Approach

Never implement a fix without first writing a failing test. This ensures:
- Bug is reproducible
- Fix actually works
- Regression prevention
- Documentation of expected behavior

### 3. Comprehensive AgentDB Storage

Store EVERYTHING in AgentDB:
- Issue analysis
- Resolution episodes
- Test patterns
- Performance metrics
- GOAP plans

This builds organizational knowledge over time.

### 4. Batch Operations

Follow CLAUDE.md guidelines:
- ALL agents in ONE message (Task tool)
- ALL todos in ONE call (TodoWrite)
- ALL file operations together
- ALL bash commands together

### 5. Hooks for Coordination

Every agent MUST run hooks:
- **Pre-task**: Context loading
- **Post-edit**: Memory storage
- **Post-task**: Metrics export

This enables swarm coordination and learning.

### 6. Neural Training After Success

After each successful resolution session:
1. Store all episodes with high-quality critiques
2. Train neural models on the patterns
3. Validate learning with prediction tests
4. Document learned strategies

### 7. GOAP for Automation

Create GOAP plans for repeatable workflows:
- User testing resolution
- Bug fix pipelines
- Performance optimization
- Security hardening

Over time, these plans become increasingly automated.

### 8. Version Control Hygiene

- Commit frequently with clear messages
- Reference issue IDs in commits
- Include test coverage in commit message
- Tag releases after major fixes
- Update CHANGELOG.md

### 9. Documentation Updates

Always update documentation:
- API docs if interfaces changed
- User guides for UX fixes
- Architecture docs for structural changes
- CHANGELOG for release notes
- Testing docs for new test patterns

### 10. Metrics Tracking

Track and improve over time:
- Resolution time per issue category
- Test coverage per module
- Neural model prediction accuracy
- GOAP plan execution success rate
- Agent coordination efficiency

---

## Success Metrics

### Resolution Efficiency

- **Target:** < 2 hours per critical issue
- **Target:** < 1 hour per high-priority issue
- **Target:** < 30 min per medium issue

### Test Coverage

- **Target:** 95%+ on all modified code
- **Target:** 90%+ overall project coverage

### Learning Effectiveness

- **Target:** 80%+ neural prediction accuracy after 10 episodes
- **Target:** 90%+ skill reusability rate

### Automation Progress

- **Target:** 50%+ of medium/low issues auto-resolvable after 3 iterations
- **Target:** GOAP plans executable with minimal oversight

---

## Troubleshooting

### Issue: Agents Not Coordinating

**Solution:**
- Verify hooks are being called (pre-task, post-edit, post-task)
- Check claude-flow@alpha is installed: `npx claude-flow@alpha --version`
- Ensure memory keys are consistent across agents

### Issue: AgentDB Storage Failing

**Solution:**
- Verify AgentDB MCP server is configured in Claude Desktop
- Check MCP server status in Claude Desktop settings
- Initialize AgentDB if needed: `mcp__agentdb__agentdb_init`

### Issue: Neural Training Not Improving

**Solution:**
- Ensure reward signals are accurate (0.0-1.0 scale)
- Provide high-quality self-critiques in episodes
- Increase training epochs or adjust learning rate
- Collect more diverse examples (minimum 10 episodes per category)

### Issue: GOAP Plans Failing

**Solution:**
- Verify initial state is accurate
- Check preconditions are achievable
- Adjust action costs for better planning
- Ensure effects correctly update state

---

## Advanced Techniques

### Multi-Session Learning

Track resolution effectiveness across multiple user testing cycles:

```javascript
// Retrieve patterns from previous sessions
const pastPatterns = await mcp__agentdb__agentdb_pattern_search({
  task: "user testing resolution",
  k: 20,
  threshold: 0.7
})

// Transfer learning between sessions
await mcp__agentdb__learning_transfer({
  source_session: "user-testing-2025-11-15",
  target_session: "user-testing-2025-12-04",
  transfer_type: "all",
  min_similarity: 0.7
})
```

### Predictive Issue Detection

Use AgentDB to predict likely issues before user testing:

```javascript
const predictions = await mcp__agentdb__learning_predict({
  session_id: "issue-prediction",
  state: "recent code changes in authentication module"
})

// Proactively create tests for predicted issues
```

### Swarm Size Optimization

Dynamically adjust agent count based on issue complexity:

```javascript
const issueComplexity = calculateComplexity(issues);
const optimalAgentCount = Math.min(
  Math.ceil(issueComplexity / 20),
  10 // max agents
);

// Initialize swarm with optimal size
npx claude-flow@alpha swarm init --max-agents ${optimalAgentCount}
```

---

## Related Skills

- **tdd-workflow.md** - Test-Driven Development patterns
- **code-review-systematic.md** - Systematic code review process
- **performance-optimization.md** - Performance issue resolution
- **agentdb-learning.md** - AgentDB integration patterns
- **goap-planning.md** - Goal-Oriented Action Planning

---

## Changelog

### v1.0.0 (2025-12-04)
- Initial release
- Complete workflow with AgentDB, neural training, and GOAP
- Integration with claude-flow hooks
- Comprehensive examples and best practices

---

## Contributing

Improvements to this skill are welcome. Focus areas:
- Additional issue categories and patterns
- Improved neural training strategies
- More efficient GOAP plans
- Better metrics and success criteria
- Integration with additional tools (CI/CD, monitoring, etc.)

---

**Remember:** This skill follows mandatory practices from CLAUDE.md:
- Batch all operations in single messages
- Use Task tool for agent execution (not MCP)
- Integrate AgentDB for learning
- Use hooks for coordination
- Create GOAP plans for automation
- Store patterns for future use

**Happy systematic issue resolution!** 🚀
