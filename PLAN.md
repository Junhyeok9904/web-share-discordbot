# Plan: Implement CI/CD for Discord Link Opener

## Problem Statement
Currently, testing and releasing binaries are done manually by the developer. This is error-prone, inconsistent across environments, and consumes local machine resources.

## Goals
1. Automate unit tests on every push and PR to ensure code quality.
2. Automate the generation of binaries for Windows and Mac.
3. Automatically create a GitHub Release and attach the binaries when a new tag is pushed.

## Dream State Mapping
```
  CURRENT STATE                  THIS PLAN                  12-MONTH IDEAL
  Manual builds/releases    ---> Auto-release + Update check ---> Zero-touch background updates
```

## NOT in scope
- **Browser Extension**: Deferred to focus on the unique value of standalone process execution and "zero-touch" opening.
- **Official Code Signing**: Deferred due to cost/complexity; user manual bypass ("Right-click -> Open") remains the baseline.

## What already exists
- **Build Scripts**: Local `pkg` and `ncc` commands are proven and will be ported to Actions.
- **TDD Logic**: `src/utils.js` and its 13 tests are ready for CI integration.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|----------|
| 1 | CEO | Maintain Binary Approach | User Challenge | User Choice | Standalone automation value > Extension friction | Browser Extension |
| 2 | CEO | Automated CI/CD | Mechanical | Completeness | Human time is expensive; automation is near-free | Manual Release |
| 3 | CEO | Integrity & Rollback | Taste | P1 (Completeness) | Automated updates need safety nets to prevent bricking | Simple Link-only Update |

  +====================================================================+
  |            CEO PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | Mode selected        | SELECTIVE EXPANSION                         |
  | Step 0               | APPROVED (Maintain Binary Approach)         |
  | Consensus            | 1/6 confirmed (Challenges resolved)          |
  | NOT in scope         | written (2 items)                           |
  | What already exists  | written (2 items)                           |
  | Dream state delta    | written                                     |
  | Unresolved decisions | 0                                            |
  +====================================================================+

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 6 proposals, 4 accepted, 2 deferred |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | CLEAR | 6 issues, 0 critical gaps |
| DX Review | `/plan-devex-review` | Developer experience | 1 | CLEAR | score: 5/10 → 9/10, TTHW: 10m → 2m |

**VERDICT: CEO + ENG + DX CLEARED — ready to implement.**

## Proposed Solution: GitHub Actions


### Task 1: CI Workflow (Test)
- Create `.github/workflows/ci.yml`.
- Trigger: Push to `main`, PR to `main`.
- Steps:
    - Checkout code.
    - Set up Node.js 22.
    - Install dependencies (`npm install`).
    - Run tests (`npm test`).

### Task 2: CD Workflow (Release)
- Create `.github/workflows/release.yml`.
- Trigger: Push tags matching `v*`.
- Steps:
    - Checkout code.
    - Set up Node.js 22.
    - Install dependencies.
    - Build single JavaScript file using `ncc`.
    - Build binaries for Windows, Mac (x64, Arm64) using `@yao-pkg/pkg`.
    - Create a GitHub Release using `softprops/action-gh-release`.
    - Upload binaries to the release.

## Implementation Details
- Use `@vercel/ncc` to bundle everything into `dist/index.js` to avoid issues with `node_modules` in the binary.
- Use `@yao-pkg/pkg` for Node 22 support.
- Binaries to be generated:
    - `DiscordLinkOpener-Windows.exe` (node22-win-x64)
    - `DiscordLinkOpener-Mac-x64` (node22-macos-x64)
    - `DiscordLinkOpener-Mac-Arm64` (node22-macos-arm64)

## Verification Plan
1. Push a test commit to verify CI.
2. Push a new tag (e.g., `v1.5.0-test`) to verify the auto-release.
