---
description: Project development policy
---

# Development Policy

This project follows these core principles:

1. **Simplicity First**: This is a simple animation program. Prioritize simplicity and readability over strictness, robustness, or complex design patterns.
2. **YAGNI (You Ain't Gonna Need It)**: Do not implement features or safety nets unless they are explicitly needed.
3. **Branching & Naming**:
   - **Default**: Work is primarily performed on the currently checked-out branch (e.g., `main`).
   - **Feature Branches**: New branches (using the prefix `feature/` followed by snake_case) are created **only when explicitly instructed by the user**.

### Git Operations

1. **Explicit Permission Required**: Git commits and merges MUST NOT be performed automatically. You MUST ask for and receive explicit permission from the user BEFORE executing a command that results in a commit.
   - **Two-Step Approval Principle**: "Approval for implementation" and "Approval for commit" are separate steps. "Implement" only permits code changes and verification, NOT committing.
   - **Re-confirmation after Verification**: After verification, always ask again if it is okay to commit.

### Implementation Process

1. **Explicit Approval Required**: Do NOT execute any code changes until the implementation plan is approved.
2. **Verified Editing Protocol**:
   - **Pre-Verification Source Review**: After any modification, you MUST use `view_file` to confirm the changes match the intended state BEFORE proceeding to verification.
   - **Immediate Stop on Tool Failure**: If a replacement tool fails, STOP immediately and report to the user.
3. **Artifact Language**: All user-facing artifacts (`implementation_plan.md`, `discussion.md`, `walkthrough.md`) MUST be provided in Japanese.
4. **Code Comments**: Do not write about the history in comments. Describe the current intent concisely.

### Refactoring & Architecture

1. Follow "Simplicity First" and "YAGNI".
2. Improvements should be made in small, meaningful phases with user approval.
3. When a discussion with expert personas (Martin Fowler, Kent Beck, t-wada, Uncle Bob) is required:
   - Use a single artifact file named `discussion.md`.
   - **Overwrite** the content of `discussion.md` to keep it focused.
   - Present only the summary or final conclusion in the chat (in Japanese).
