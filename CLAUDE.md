# Claude Code Configuration - Flow Nexus Integration

═══════════════════════════════════════════════════════
    AGENT OPERATING INSTRUCTIONS
    ALL DIRECTIVES ARE MANDATORY - STRICT COMPLIANCE
═══════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════╗
║ ⚠️  CRITICAL: SWARM ORCHESTRATION ARCHITECTURE  ⚠️     ║
║                                                       ║
║ MANDATORY COORDINATION PATTERN:                      ║
║ → Topology Setup: Use Claude Flow's MCP (Model       ║
║   Context Protocol) coordination for establishing    ║
║   agent topology and communication patterns          ║
║ → Agent Execution: Use Task tool for actual agent    ║
║   execution, following guidelines in CLAUDE.md       ║
║ → Separation of Concerns: ALWAYS distinguish between ║
║   orchestration layer (Flow/MCP) and execution       ║
║   layer (Task tool)                                  ║
║                                                       ║
║ This pattern must be followed for ALL multi-agent    ║
║ coordination and swarm operations without exception. ║
╚═══════════════════════════════════════════════════════╝

[MANDATORY-1] COMMUNICATION & TRANSPARENCY
→ Explain every action in detail as you perform it
→ Include: what you're doing, why, expected outcomes, context, and rationale
→ Maximize thought exposure: make reasoning visible and understandable

[MANDATORY-2] PROFESSIONAL COMMUNICATION STYLE
→ Avoid sycophancy: Don't over-praise, over-agree, or use excessive enthusiasm
→ Maintain neutral, professional tone: Be direct, clear, and objective
→ Give honest assessments: Point out potential issues, trade-offs, and concerns
→ Don't over-apologize: Acknowledge errors once, then move forward with solutions
→ Challenge when appropriate: Question assumptions and suggest alternatives constructively
→ Skip unnecessary pleasantries: Get to the point efficiently
→ Be appropriately critical: Identify flaws, risks, and weaknesses without sugar-coating
→ Avoid hedging excessively: State things directly unless genuinely uncertain
→ No false validation: Don't agree with problematic ideas just to be agreeable
→ Professional candor over politeness: Prioritize clarity and usefulness over niceties

[MANDATORY-3] VERSION CONTROL & DOCUMENTATION
→ Commit frequently to local and remote repositories
→ Write clear, meaningful commit messages for all changes

[MANDATORY-4] TARGET AUDIENCE & SCOPE
→ Primary user: Individual use (requestor)
→ Future scope: Multi-user, public open-source or paid offering
→ Current priority: Build meaningful, functional features first

[MANDATORY-5] CLARIFICATION PROTOCOL
→ Stop and ask questions when:
  • Instructions unclear or ambiguous
  • Uncertain about requirements or approach
  • Insufficient information for intelligent decisions
  • Multiple valid paths exist

[MANDATORY-6] SWARM ORCHESTRATION APPROACH
→ Topology setup: Use Claude Flow's MCP (Model Context Protocol) coordination for establishing agent topology and communication patterns
→ Agent execution: Use Task tool for actual agent execution, following guidelines specified in CLAUDE.md
→ Separation of concerns: Distinguish between orchestration layer (Flow/MCP) and execution layer (Task tool)

[MANDATORY-7] ERROR HANDLING & RESILIENCE
→ Implement graceful error handling with clear error messages
→ Log errors with context for debugging
→ Validate inputs and outputs at boundaries
→ Provide fallback strategies when operations fail
→ Never fail silently; always surface issues appropriately

[MANDATORY-8] TESTING & QUALITY ASSURANCE
→ Write tests for critical functionality before considering work complete
→ Verify changes work as expected before committing
→ Document test cases and edge cases considered
→ Run existing tests to ensure no regressions

[MANDATORY-9] SECURITY & PRIVACY
→ Never commit secrets, API keys, or sensitive credentials
→ Use environment variables for configuration
→ Sanitize user inputs to prevent injection attacks
→ Consider data privacy implications for future multi-user scenarios
→ Follow principle of least privilege

[MANDATORY-10] ARCHITECTURE & DESIGN
→ Favor simple, readable solutions over clever complexity
→ Design for modularity and reusability from the start
→ Document architectural decisions and trade-offs
→ Consider future extensibility without over-engineering
→ Apply SOLID principles and appropriate design patterns

[MANDATORY-11] INCREMENTAL DELIVERY
→ Break large tasks into small, deployable increments
→ Deliver working functionality frequently (daily if possible)
→ Each commit should leave the system in a working state
→ Prioritize MVP features over perfect implementations
→ Iterate based on feedback and learnings

[MANDATORY-12] DOCUMENTATION STANDARDS
→ Update README.md as features are added
→ Document "why" decisions were made, not just "what"
→ Include setup instructions, dependencies, and usage examples
→ Maintain API documentation for all public interfaces
→ Document known limitations and future considerations

[MANDATORY-13] DEPENDENCY MANAGEMENT
→ Minimize external dependencies; evaluate necessity
→ Pin dependency versions for reproducibility
→ Document why each major dependency was chosen
→ Regularly review and update dependencies for security

[MANDATORY-14] PERFORMANCE AWARENESS
→ Profile before optimizing; avoid premature optimization
→ Consider scalability implications of design choices
→ Document performance characteristics and bottlenecks
→ Optimize for readability first, performance second (unless critical)

[MANDATORY-15] STATE MANAGEMENT
→ Make state transitions explicit and traceable
→ Validate state consistency at critical points
→ Consider idempotency for operations that might retry
→ Document state machine behavior where applicable

[MANDATORY-16] CONTINUOUS LEARNING & IMPROVEMENT
→ Document what worked and what didn't after completing tasks
→ Identify patterns in errors and user requests
→ Suggest process improvements based on observed inefficiencies
→ Build reusable solutions from recurring problems
→ Maintain a decision log for complex choices

[MANDATORY-17] OBSERVABILITY & MONITORING
→ Log key operations with appropriate detail levels
→ Track performance metrics for critical operations
→ Implement health checks for system components
→ Make system state inspectable at any time
→ Alert on anomalies or degraded performance

[MANDATORY-18] RESOURCE OPTIMIZATION
→ Track API calls, token usage, and computational costs
→ Implement caching strategies where appropriate
→ Avoid redundant operations and API calls
→ Consider rate limits and quota constraints
→ Optimize for cost-effectiveness without sacrificing quality

[MANDATORY-19] USER EXPERIENCE
→ Prioritize clarity and usability in all interfaces
→ Provide helpful feedback for all operations
→ Design for accessibility from the start
→ Minimize cognitive load required to use features
→ Make error messages actionable and user-friendly

[MANDATORY-20] DATA QUALITY & INTEGRITY
→ Validate data at system boundaries
→ Implement data consistency checks
→ Handle data migrations carefully with backups
→ Sanitize and normalize inputs
→ Maintain data provenance and audit trails

[MANDATORY-21] CONTEXT PRESERVATION
→ Maintain relevant context across operations
→ Persist important state between sessions
→ Reference previous decisions and outcomes
→ Build on prior work rather than restarting
→ Document assumptions and constraints

[MANDATORY-22] ETHICAL OPERATION
→ Consider bias and fairness implications
→ Respect user privacy and data sovereignty
→ Be transparent about capabilities and limitations
→ Decline tasks that could cause harm
→ Prioritize user agency and informed consent

[MANDATORY-23] AGENT COLLABORATION
→ Share context effectively with other agents
→ Coordinate to avoid duplicated work
→ Escalate appropriately to humans when needed
→ Maintain clear handoff protocols
→ Document inter-agent dependencies

[MANDATORY-24] RECOVERY PROCEDURES
→ Design operations to be reversible when possible
→ Maintain backups before destructive operations
→ Document rollback procedures for changes
→ Test recovery processes regularly
→ Keep system in recoverable state at all times

[MANDATORY-25] TECHNICAL DEBT MANAGEMENT
→ Flag areas needing refactoring with justification
→ Balance shipping fast vs. accumulating debt
→ Schedule time for addressing technical debt
→ Document intentional shortcuts and their trade-offs
→ Prevent debt from compounding unchecked

═══════════════════════════════════════════════════════
    END INSTRUCTIONS - COMPLIANCE REQUIRED
═══════════════════════════════════════════════════════

---

## 🚨 CRITICAL PROJECT RULES (Inherited from Parent Config)

### ⚡ CONCURRENT EXECUTION MANDATE

**ABSOLUTE RULES:**
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### **GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"**

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

**Example - Correct Pattern:**
```javascript
// ✅ CORRECT: Single message with all related operations
[Single Message]:
  Task("Research agent", "Analyze requirements...", "researcher")
  Task("Coder agent", "Implement features...", "coder")
  Task("Tester agent", "Write tests...", "tester")

  TodoWrite { todos: [...8-10 todos...] }

  Write "src/component.tsx"
  Write "tests/component.test.tsx"
  Bash "npm run build && npm test"
```

**Example - Wrong Pattern:**
```javascript
// ❌ WRONG: Multiple messages for related operations
Message 1: Task("agent 1")
Message 2: TodoWrite { todos: [1 todo] }
Message 3: Write "file.tsx"
Message 4: Bash "npm test"
```

---

### 📁 **FILE ORGANIZATION RULES**

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/backend` - Backend source code
- `/frontend` - Frontend source code
- `/daily_reports` - Daily development reports

**Examples:**
```
✅ CORRECT:
docs/DEPLOYMENT_GUIDE.md
docs/ANNOTATION_REVIEW_GUIDE.md
daily_reports/2025-10-06-workflow-optimization-analytics.md

❌ WRONG:
DEPLOYMENT_GUIDE.md (root)
README.md (unless main project readme)
notes.txt (root)
```

---

### 🎯 **CLAUDE CODE TASK TOOL USAGE**

**Task tool is the PRIMARY way to spawn agents:**
- Use for actual agent execution and work
- Each agent runs with full autonomy
- Agents can use hooks for coordination

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize topology
- `mcp__claude-flow__agent_spawn` - Define agent types
- `mcp__claude-flow__task_orchestrate` - High-level planning

**Pattern:**
```
Step 1 (Optional): MCP tools set up coordination
Step 2 (Required): Task tool spawns agents that do work
Step 3 (Required): Agents use hooks for communication
```

---

### 📋 **RULE INTERPRETATIONS & CLARIFICATIONS**

#### TodoWrite Batching Policy
**Rule:** "ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)"

**Interpretation:**
- **Initial Creation:** MUST start with 8-10+ todo items
- **Status Updates:** Can update incrementally (mark items complete as you finish)
- **Adding New Tasks:** Batch additions when discovering multiple related tasks

**Examples:**
```javascript
// ✅ COMPLIANT: Initial todo creation
TodoWrite { todos: [
  {content: "Fix critical bug", status: "in_progress", activeForm: "Fixing..."},
  {content: "Add keyboard shortcuts", status: "pending", activeForm: "Adding..."},
  {content: "Implement quality flags", status: "pending", activeForm: "Implementing..."},
  {content: "Build analytics API", status: "pending", activeForm: "Building..."},
  {content: "Create dashboard UI", status: "pending", activeForm: "Creating..."},
  {content: "Deploy to Railway", status: "pending", activeForm: "Deploying..."},
  {content: "Write documentation", status: "pending", activeForm: "Writing..."},
  {content: "Update daily report", status: "pending", activeForm: "Updating..."}
]}  // 8 items - compliant

// ✅ ACCEPTABLE: Incremental status updates
TodoWrite { todos: [
  {..., status: "completed"},  // Just completed task 1
  {..., status: "in_progress"} // Just started task 2
]}

// ❌ NON-COMPLIANT: Creating only 2-3 todos
TodoWrite { todos: [
  {content: "Do task", status: "pending"},
  {content: "Test task", status: "pending"}
]}  // Only 2 items - violates 5-10+ minimum
```

#### Concurrent Operations Policy
**Rule:** "ALL operations MUST be concurrent/parallel in a single message"

**Interpretation:**
- **Related operations:** MUST be in same message (e.g., all file reads for a feature)
- **Independent operations:** MUST be batched in parallel
- **Dependent operations:** Can be sequential with `&&` in Bash

**When to batch in single message:**
```javascript
// ✅ All reads for same analysis
Read "file1.ts"
Read "file2.ts"
Read "file3.ts"

// ✅ All writes for same feature
Write "component.tsx"
Write "component.test.tsx"
Write "component.styles.css"

// ✅ Multiple independent Bash commands
Bash "npm run build"
Bash "npm run test"
Bash "git status"
```

**When sequential is acceptable:**
```bash
# ✅ Dependent commands can use &&
Bash "npm run build && npm test && git add ."
```

---

### 🎯 **PRIORITY HIERARCHY**

When rules conflict or are ambiguous, follow this precedence:

**1. HIGHEST: Mandatory Instructions [1-25]**
- Universal principles (communication, security, testing)
- Override all other rules
- Apply to all development work

**2. HIGH: Critical Project Rules**
- Specific implementation patterns (batching, file organization)
- Must follow unless conflicts with Mandatory
- Project-specific operational guidelines

**3. REFERENCE: Platform Documentation**
- Optional features (Flow Nexus, SPARC, agents)
- Use when relevant to current task
- Reference material, not mandatory

**Resolution Process:**
1. Check if Mandatory instruction addresses it (precedence)
2. Apply Critical Project Rule if no conflict
3. Use professional judgment (MANDATORY-2, MANDATORY-5)
4. Ask for clarification if genuinely ambiguous (MANDATORY-5)

---

### 📊 **COMPLIANCE CHECKLIST**

Use this for self-assessment during development:

**File Organization:**
- [ ] No files saved to root folder (except package.json, README.md, etc.)
- [ ] All docs in `/docs` subdirectory
- [ ] All reports in `/daily_reports` subdirectory
- [ ] Source code in `/src`, `/backend`, or `/frontend`

**Concurrent Execution:**
- [ ] Related file reads batched in single message
- [ ] Related file writes batched in single message
- [ ] Independent operations called in parallel
- [ ] TodoWrite starts with 8-10+ items

**Version Control:**
- [ ] Commits made after each significant change
- [ ] Commit messages follow What/Why/How/Impact format
- [ ] No secrets committed to repository
- [ ] Changes pushed to remote regularly

**Quality:**
- [ ] Code builds without errors before committing
- [ ] Tests run (if applicable)
- [ ] Documentation updated with changes
- [ ] Error handling implemented

---

## 🌐 Flow Nexus Cloud Platform

Flow Nexus extends Claude Flow with cloud-powered features for AI development and deployment.

### Quick Start
1. **Register**: Use `mcp__flow-nexus__user_register` with email/password
2. **Login**: Use `mcp__flow-nexus__user_login` to access features
3. **Check Balance**: Use `mcp__flow-nexus__check_balance` for credits

### 🚀 Key Capabilities

**🤖 AI Swarms**
- Deploy multi-agent swarms in cloud sandboxes
- Pre-built templates for common architectures
- Auto-scaling and load balancing

**📦 E2B Sandboxes**
- `mcp__flow-nexus__sandbox_create` - Isolated execution environments
- Support for Node.js, Python, React, Next.js
- Real-time code execution with environment variables

**⚡ Workflows**
- `mcp__flow-nexus__workflow_create` - Event-driven automation
- Parallel task processing with message queues
- Reusable workflow templates

**🎯 Challenges & Learning**
- `mcp__flow-nexus__challenges_list` - Coding challenges
- Earn rUv credits by completing tasks
- Global leaderboard and achievements

**🧠 Neural Networks**
- `mcp__flow-nexus__neural_train` - Train custom models
- Distributed training across sandboxes
- Pre-built templates for ML tasks

**💰 Credits & Billing**
- Pay-as-you-go with rUv credits
- Auto-refill configuration available
- Free tier for getting started

### 🤖 Flow Nexus Agents

Specialized agents for Flow Nexus operations available in `.claude/agents/flow-nexus/`:

- **flow-nexus-auth**: Authentication and user management
- **flow-nexus-sandbox**: E2B sandbox deployment and management  
- **flow-nexus-swarm**: AI swarm orchestration and scaling
- **flow-nexus-workflow**: Event-driven workflow automation
- **flow-nexus-neural**: Neural network training and deployment
- **flow-nexus-challenges**: Coding challenges and gamification
- **flow-nexus-app-store**: Application marketplace management
- **flow-nexus-payments**: Credit management and billing
- **flow-nexus-user-tools**: User management and system utilities

### 📁 Flow Nexus Commands

Detailed Flow Nexus command documentation available in `.claude/commands/flow-nexus/`:

- `login-registration.md` - Authentication workflows
- `sandbox.md` - E2B sandbox management
- `swarm.md` - AI swarm deployment
- `workflow.md` - Automation workflows
- `neural-network.md` - ML model training
- `challenges.md` - Coding challenges
- `app-store.md` - App marketplace
- `payments.md` - Credit and billing
- `user-tools.md` - User utilities

### 💡 Example: Deploy a Swarm
```javascript
// 1. Login to Flow Nexus
mcp__flow-nexus__user_login({ 
  email: "user@example.com", 
  password: "password" 
})

// 2. Initialize swarm
mcp__flow-nexus__swarm_init({ 
  topology: "mesh", 
  maxAgents: 5 
})

// 3. Create sandbox
mcp__flow-nexus__sandbox_create({ 
  template: "node", 
  name: "api-dev" 
})

// 4. Orchestrate task
mcp__flow-nexus__task_orchestrate({
  task: "Build REST API with authentication",
  strategy: "parallel"
})
```

### 🔗 Integration with Claude Code

Flow Nexus seamlessly integrates with Claude Code through MCP (Model Context Protocol):

1. **Add MCP Server**: `claude mcp add flow-nexus npx flow-nexus@latest mcp start`
2. **Use in Claude Code**: Access all Flow Nexus tools through MCP interface
3. **Agent Coordination**: Use Flow Nexus agents for specialized cloud operations
4. **Command Reference**: Use slash commands for quick Flow Nexus operations

### 📚 Learn More

- Documentation: https://github.com/ruvnet/claude-flow#flow-nexus
- MCP Integration: Use `mcp__flow-nexus__*` tools in Claude Code
- Agent Usage: Type `/` in Claude Code to see Flow Nexus commands
- Community: Join discussions and share templates

---

**Ready to build with Flow Nexus? Start with authentication and explore the cloud-powered AI development platform!**
