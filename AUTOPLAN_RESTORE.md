# /autoplan Restore Point
Captured: 2026-05-30 | Branch: main | Commit: 8aad9e5

## Re-run Instructions
1. Copy "Original Plan State" below back to your plan file
2. Invoke /autoplan

## Original Plan State
# Plan: Implement CI/CD for Discord Link Opener

## Problem Statement
Currently, testing and releasing binaries are done manually by the developer. This is error-prone, inconsistent across environments, and consumes local machine resources.

## Goals
1. Automate unit tests on every push and PR to ensure code quality.
2. Automate the generation of binaries for Windows and Mac.
3. Automatically create a GitHub Release and attach the binaries when a new tag is pushed.

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
    - `DiscordLinkOpener-Mac-Arm64" (node22-macos-arm64)

## Verification Plan
1. Push a test commit to verify CI.
2. Push a new tag (e.g., `v1.5.0-test`) to verify the auto-release.
