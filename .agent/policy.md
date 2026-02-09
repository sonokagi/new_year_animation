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
2. **Plan Classification**: At the beginning of each implementation plan (`implementation_plan.md`), you MUST explicitly categorize the change as one of the following:
   - **[Behavioral Change]**: Features, bug fixes, or visual adjustments that change how the app behaves or looks.
   - **[Structural Change (Refactoring)]**: Internal code cleanup or reorganization with ZERO change to external behavior or appearance.
3. **Verified Editing Protocol**:
   - **Strict Source Review (Side-Effect Check)**: After any modification, you MUST use `view_file` to confirm:
     - a) All planned changes were applied.
     - b) **Unintended deletions or side-effects have NOT occurred in surrounding code.**
     - c) If critical classes or functions were near the edit range, confirm their existence via `grep_search` or `outline`.
   - **Pre-Implementation Usage Search**: Before deleting or renaming any function/method, you MUST search for ALL usages and list them in the implementation plan. Do NOT rely solely on `grep_search` results; cross-verify with `view_file` as `grep_search` may return incomplete results.
   - **Plan-to-Diff Review (Anti-Hallucination)**: After execution, you MUST compare the resulting diff (or tool output) against `implementation_plan.md`.
     - **Detection**: Check for "kindness-driven additions" or "statistical pattern completions" that were NOT in the plan.
     - **Action**: If unplanned code is found, revert/remove it immediately before proceeding to verification.
   - **Atomic Edits**: Avoid "Mega-Chunks". Prefer multiple small, focused replacement chunks over a single large block to minimize over-inclusion errors.
   - **Immediate Stop on Tool Failure**: If a replacement tool fails, STOP immediately and report to the user.
4. **Artifact Language**: All user-facing artifacts (`implementation_plan.md`, `discussion.md`, `walkthrough.md`) MUST be provided in Japanese.
5. **Code Comments**: Do not write about the history in comments. Describe the current intent concisely.

### Refactoring & Architecture

1. Follow "Simplicity First" and "YAGNI".
2. Improvements should be made in small, meaningful phases with user approval.
3. **Behavioral Integrity**: When performing a [Structural Change], AI MUST verify that external behavior remains 100% unchanged. You MUST include a declaration in the plan: "I have self-reviewed that external behavior will remain 100% unchanged."
   - Any intended behavior changes or bug fixes MUST be separated into a different task labeled as [Behavioral Change].
4. **Negative Verification**: In `walkthrough.md`, you MUST include a specific verification item: "**No unplanned code insertion confirmed**". This forces an explicit check against the implementation plan.
5. When a discussion with expert personas (Martin Fowler, Kent Beck, t-wada, Uncle Bob) is required:
   - Use a single artifact file named `discussion.md`.
   - **Overwrite** the content of `discussion.md` to keep it focused.
   - Present only the summary or final conclusion in the chat (in Japanese).
