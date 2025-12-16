# AVES Documentation Index

Welcome to the AVES (Avian Vocabulary Educational System) documentation. This index provides a comprehensive guide to all project documentation organized by category.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Features](#features)
- [Portfolio & Showcase](#portfolio--showcase)
- [Testing](#testing)
- [Deployment](#deployment)
- [Implementation Reports](#implementation-reports)
- [Analysis & Research](#analysis--research)
- [User Testing](#user-testing)
- [Skills & Procedures](#skills--procedures)
- [GOAP Planning System](#goap-planning-system)
- [Project Management](#project-management)

---

## Getting Started

### Core Documentation
- [**Main README**](../README.md) - Project overview, features, and quick start guide
- [**CLAUDE.md**](../CLAUDE.md) - Claude Code configuration and SPARC development environment
- [**SHIPPED.md**](../SHIPPED.md) - Release history and shipped features

### Setup Guides
- [**Deployment Guide**](DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [**Deployment Overview**](DEPLOYMENT.md) - Deployment configuration and options

---

## Architecture

### Architecture Overview
- [**Architecture README**](architecture/README.md) - Architecture documentation overview
- [**Architecture Evaluation**](ARCHITECTURE_EVALUATION.md) - System architecture assessment and evaluation
- [**Dependency Graph**](architecture/DEPENDENCY_GRAPH.md) - System dependency visualization and analysis
- [**Refactoring Strategy**](architecture/REFACTORING_STRATEGY.md) - Code refactoring guidelines and approach
- [**Refactoring Summary**](architecture/REFACTORING_SUMMARY.md) - Completed refactoring work overview

### Architecture Decision Records (ADRs)
- [**ADR Index**](architecture/decisions/README.md) - Complete list of architecture decisions
- [**ADR Overview**](architecture/ADR.md) - ADR process and conventions
- [**ADR-001: Monorepo Structure**](architecture/decisions/ADR-001-monorepo-structure.md) - Project organization strategy
- [**ADR-002: AI Provider Selection**](architecture/decisions/ADR-002-ai-provider-selection.md) - AI service integration choices
- [**ADR-003: Database Architecture**](architecture/decisions/ADR-003-database-architecture.md) - Data persistence design
- [**ADR-004: State Management**](architecture/decisions/ADR-004-state-management.md) - Frontend state management approach
- [**ADR-005: File Structure Pattern**](architecture/decisions/ADR-005-file-structure-pattern.md) - Code organization conventions
- [**ADR-006: Logging Strategy**](architecture/decisions/ADR-006-logging-strategy.md) - Application logging approach
- [**ADR-007: Authentication Flow**](architecture/decisions/ADR-007-authentication-flow.md) - User authentication design
- [**ADR-008: Testing Strategy**](architecture/decisions/ADR-008-testing-strategy.md) - Test architecture and approach
- [**ADR-009: CI/CD Pipeline**](architecture/decisions/ADR-009-cicd-pipeline.md) - Continuous integration/deployment
- [**ADR-010: API Design**](architecture/decisions/ADR-010-api-design.md) - RESTful API design principles

### Migration & Refactoring
- [**Migration Checklist**](architecture/MIGRATION_CHECKLIST.md) - TypeScript migration tracking
- [**Phase 2 Complete**](architecture/PHASE2_COMPLETE.md) - Phase 2 migration completion report
- [**Phase 6 Documentation Complete**](architecture/PHASE_6_DOCUMENTATION_COMPLETE.md) - Documentation phase completion
- [**God File Decomposition Status**](architecture/god-file-decomposition-status.md) - Large file refactoring progress
- [**Phase 2 Decomposition Report**](architecture/phase2-decomposition-report.md) - Detailed decomposition results
- [**Decomposition Visual Guide**](architecture/decomposition-visual-guide.md) - Visual guide to code decomposition

### Remediation
- [**Remediation Architecture Spec**](architecture/REMEDIATION_ARCHITECTURE_SPEC.md) - Architecture remediation specification
- [**Remediation Summary**](architecture/REMEDIATION_SUMMARY.md) - Remediation work completed
- [**Remediation Plan**](REMEDIATION_PLAN.md) - Overall remediation strategy

---

## API Documentation

### API Design & Audits
- [**API Design Evaluation**](analysis/api_design_evaluation.md) - API design assessment and best practices
- [**API Audit Report**](API_AUDIT_REPORT.md) - Comprehensive API audit findings
- [**API Audit Summary**](API_AUDIT_SUMMARY.md) - Executive summary of API audit

### API Reference
- See [**ADR-010: API Design**](architecture/decisions/ADR-010-api-design.md) for API design principles
- Frontend API integration documented in [**Frontend Hooks Data Flow Audit**](audits/frontend-hooks-data-flow-audit.md)

---

## Features

### Core Features
- [**Annotation Preview Implementation**](features/annotation-preview-implementation.md) - Image annotation preview system
- [**Conservation Status Links**](features/conservation-status-links.md) - Conservation status integration
- [**SRS Integration**](SRS_INTEGRATION.md) - Spaced Repetition System implementation
- [**Quality Scoring Integration**](QUALITY_SCORING_INTEGRATION.md) - Quality scoring system
- [**Quality Integration Quick Reference**](QUALITY_INTEGRATION_QUICK_REF.md) - Quick reference guide

### Annotation System
- [**Annotation Pipeline Implementation**](ANNOTATION_PIPELINE_IMPLEMENTATION.md) - Complete annotation pipeline
- [**Annotation History Implementation**](ANNOTATION_HISTORY_IMPLEMENTATION.md) - Annotation history tracking

### Components
- [**Feedback Components**](components/FEEDBACK_COMPONENTS.md) - User feedback UI components

---

## Portfolio & Showcase

- [**Portfolio Showcase**](PORTFOLIO_SHOWCASE.md) - Portfolio-ready project showcase
- [**Production Readiness**](PRODUCTION_READINESS.md) - Production deployment readiness assessment
- [**Portfolio Readiness GOAP Analysis**](PORTFOLIO_READINESS_GOAP_ANALYSIS.md) - GOAP planning for portfolio readiness

---

## Testing

### Testing Strategy & Reports
- [**Testing Summary**](testing/TESTING_SUMMARY.md) - Overall testing approach and results
- [**Final Test Results**](testing/FINAL_TEST_RESULTS.md) - Latest test execution results
- [**Phase 4 Test Restoration Report**](testing/PHASE4_TEST_RESTORATION_REPORT.md) - Test suite restoration work
- [**Test Coordination Report**](testing/TEST_COORDINATION_REPORT.md) - Test coordination and organization

### Test Infrastructure
- [**Test Timeout Analysis**](research/test-timeout-analysis.md) - Test performance investigation
- [**Test Timeout Fix**](skills/test-timeout-fix.md) - Test timeout resolution guide
- [**Test Timeout Quick Reference**](skills/test-timeout-quick-reference.md) - Quick troubleshooting guide

---

## Deployment

- [**Deployment Guide**](DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [**Deployment Overview**](DEPLOYMENT.md) - Deployment configuration options
- See [**ADR-009: CI/CD Pipeline**](architecture/decisions/ADR-009-cicd-pipeline.md) for CI/CD architecture

---

## Implementation Reports

### Implementation Summaries
- [**Implementation Summary**](IMPLEMENTATION_SUMMARY.md) - Overall implementation status
- [**Implementation Summary - VisionPreflight**](IMPLEMENTATION_SUMMARY_VisionPreflight.md) - VisionPreflight implementation
- [**Implementation Plan**](IMPLEMENTATION_PLAN.md) - Original implementation planning
- [**Integration Summary**](INTEGRATION_SUMMARY.md) - System integration overview
- [**Enhancements Implementation Complete**](ENHANCEMENTS_IMPLEMENTATION_COMPLETE.md) - Enhancement completion report
- [**Phase 5 TypeScript Progress**](PHASE_5_TYPESCRIPT_PROGRESS.md) - TypeScript migration progress

### Session Reports
- [**Swarm Execution Summary 2025-11-29**](SWARM_EXECUTION_SUMMARY_2025-11-29.md) - Multi-agent coordination session
- [**Swarm Recovery 2025-12-04 Session Report**](sessions/swarm-recovery-2025-12-04-session-report.md) - Recovery session details

---

## Analysis & Research

### Code Quality Analysis
- [**Pattern Observation Count Verification**](analysis/pattern-observation-count-verification.md) - Pattern tracking accuracy
- [**Pattern Observation Count Accuracy Fix**](investigations/pattern-observation-count-accuracy-fix.md) - Pattern counting bug fix
- [**Quality Scores Not Generated Investigation**](investigation-quality-scores-not-generated.md) - Quality score debugging

### Technical Research
- [**Logging Migration Phase 3**](logging-migration-phase3.md) - Logging system migration
- [**Frontend Hooks Data Flow Audit**](audits/frontend-hooks-data-flow-audit.md) - Frontend data flow analysis

---

## User Testing

### User Testing Reports
- [**User Testing Analysis**](USER_TESTING_ANALYSIS.md) - User testing insights and findings
- [**User Testing Round 2 Complete**](USER_TESTING_ROUND2_COMPLETE.md) - Round 2 completion summary
- [**User Testing Round 2 Final Status**](USER_TESTING_ROUND2_FINAL_STATUS.md) - Final round 2 status
- [**AVES User Testing - Round 2 Notes (Organized)**](AVES%20User%20Testing%20-%20Round%202%20Notes%20(Organized).md) - Detailed round 2 notes

### UI/UX Improvements
- [**UI/UX Fixes Summary**](UI_UX_FIXES_SUMMARY.md) - UI/UX improvement summary
- [**Learn Tab Fix Summary**](fixes/LEARN_TAB_FIX_SUMMARY.md) - Learn tab bug fixes
- [**Learn Tab Fixes 2025-11-29**](fixes/learn-tab-fixes-2025-11-29.md) - Detailed learn tab fixes

---

## Skills & Procedures

### Skills Documentation
- [**Skills README**](skills/README.md) - Skills library overview
- [**Skill Library**](skill-library.md) - Comprehensive skill catalog
- [**GOAP User Testing Resolution**](skills/goap-user-testing-resolution.md) - GOAP-driven testing resolution

### Procedures
- [**Quality Score Backfill Procedure**](procedures/quality-score-backfill-procedure.md) - Data backfill process
- [**Quality Score Backfill Script**](scripts/quality-score-backfill.md) - Backfill script documentation

---

## GOAP Planning System

### GOAP Documentation
- [**GOAP README**](GOAP-README.md) - Goal-Oriented Action Planning overview
- [**GOAP Integration Plan**](GOAP_INTEGRATION_PLAN.md) - GOAP system integration
- [**GOAP Production Readiness Plan**](GOAP_PRODUCTION_READINESS_PLAN.md) - Production planning

### GOAP Analysis
- [**GOAP Analysis 2025-12-14**](goap/GOAP_ANALYSIS_2025-12-14.md) - Latest GOAP analysis
- [**GOAP Plan Analysis**](goap-plan-analysis.md) - GOAP plan evaluation
- [**GOAP Cost-Benefit Analysis**](goap-cost-benefit-analysis.md) - GOAP efficiency analysis
- [**GOAP Execution Comparison**](goap-execution-comparison.md) - Execution strategy comparison
- [**GOAP Visual Summary**](goap-visual-summary.md) - Visual GOAP overview
- [**GOAP Week 1 Execution Guide**](goap-week1-execution-guide.md) - GOAP execution playbook

---

## Project Management

### Specifications
- [**SPARC Specifications**](SPARC_SPECIFICATIONS.md) - SPARC methodology specifications

### Status & Tracking
- [**Production Readiness**](PRODUCTION_READINESS.md) - Production deployment checklist
- [**Portfolio Showcase**](PORTFOLIO_SHOWCASE.md) - Portfolio presentation materials

---

## Quick Links

### For Developers
- [Setup Guide](../README.md#getting-started)
- [Architecture Overview](architecture/README.md)
- [API Design Guidelines](architecture/decisions/ADR-010-api-design.md)
- [Testing Strategy](architecture/decisions/ADR-008-testing-strategy.md)
- [Contributing Guide](../README.md#contributing) *(if available)*

### For Project Managers
- [Production Readiness](PRODUCTION_READINESS.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [GOAP Planning](GOAP-README.md)
- [User Testing Results](USER_TESTING_ANALYSIS.md)

### For Architects
- [Architecture Decision Records](architecture/decisions/README.md)
- [Architecture Evaluation](ARCHITECTURE_EVALUATION.md)
- [API Design Evaluation](analysis/api_design_evaluation.md)
- [Refactoring Strategy](architecture/REFACTORING_STRATEGY.md)

---

## Documentation Guidelines

When adding new documentation:

1. **Place files in appropriate subdirectories**:
   - `architecture/` - Architecture and design decisions
   - `features/` - Feature documentation
   - `testing/` - Test reports and strategies
   - `goap/` - GOAP planning documents
   - `analysis/` - Code analysis and research
   - `skills/` - Reusable skills and procedures

2. **Use clear, descriptive filenames** with proper capitalization

3. **Update this index** when adding new documentation

4. **Include dates** in filename or frontmatter for time-sensitive docs

5. **Link related documents** to create documentation pathways

---

*Last Updated: 2025-12-14*

*This documentation index is auto-generated and manually curated. For questions or suggestions, please open an issue.*
