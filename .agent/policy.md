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

### Slash Command Workflows

1. **`/plan`**: タスクの開始時に使用。実装計画（`implementation_plan.md`）を作成します。
2. **`/ok`**: **文脈判断型の進捗コマンド**。
   - プラン提出直後であれば → 承認されたとみなし、実装（`/exec`相当）を開始します。
   - 実装・検証（Walkthrough）提出直後であれば → コミット（`/commit`相当）を開始します。
3. **`/exec`**: 明示的に実装を開始する場合に使用。
4. **`/commit`**: 明示的にコミットを実行する場合に使用。

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
   - **Atomic Edits**: Avoid "Mega-Chunks". Prefer multiple small, focused replacement chunks over a single large block to minimize over-inclusion errors.
   - **Immediate Stop on Tool Failure**: If a replacement tool fails, STOP immediately and report to the user.
4. **Artifact Language**: All user-facing artifacts (`implementation_plan.md`, `discussion.md`, `walkthrough.md`) MUST be provided in Japanese.
5. **Code Comments**: Do not write about the history in comments. Describe the current intent concisely.

### Refactoring & Architecture

1. Follow "Simplicity First" and "YAGNI".
2. Improvements should be made in small, meaningful phases with user approval.
3. **Behavioral Integrity**: When performing a [Structural Change], AI MUST verify that external behavior remains 100% unchanged. You MUST include a declaration in the plan: "I have self-reviewed that external behavior will remain 100% unchanged."
   - Any intended behavior changes or bug fixes MUST be separated into a different task labeled as [Behavioral Change].
4. When a discussion with expert personas (Martin Fowler, Kent Beck, t-wada, Uncle Bob) is required:
   - Use a single artifact file named `discussion.md`.
   - **Overwrite** the content of `discussion.md` to keep it focused.
   - Present only the summary or final conclusion in the chat (in Japanese).
