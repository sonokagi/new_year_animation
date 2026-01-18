---
description: Project development policy
---

# Development Policy

This project follows these core principles:

1. **Simplicity First**: This is a simple animation program. Prioritize simplicity and readability over strictness, robustness, or complex design patterns.
2. **YAGNI (You Ain't Gonna Need It)**: Do not implement features or safety nets (like complex default value handling) unless they are explicitly needed.
3. **Branch Naming**: Use the prefix `feature/` followed by a descriptive name in snake_case (e.g., `feature/refactor_zodiac_animation`).

### Git Operations

1. **Explicit Permission Required**: Git commits and merges MUST NOT be performed automatically. You MUST ask for and receive explicit permission from the user BEFORE executing a command that results in a commit.

### Implementation Process

1. **Explicit Approval Required**: Do NOT execute implementation code changes or file modifications until explicitly approved by the user.
2. **Wait for Instructions**: Always present a plan and wait for the user's explicit command to proceed before writing code.

### Refactoring & Architecture

1. Follow "Simplicity First" and "YAGNI".
2. Improvements should be made in small, meaningful phases with user approval at each step.
3. When a discussion with expert personas (Martin Fowler, Kent Beck, t-wada, Uncle Bob) is required:
   - Use a single artifact file named `discussion.md`.
   - **Overwrite** the content of `discussion.md` for each new discussion to keep it focused (do not create multiple debate files).
   - DO NOT output the full dialogue directly in the chat block.
   - Present only the summary or the final conclusion/proposal in the chat.
   - All expert discussions and their summaries MUST be provided in Japanese.
   - Walkthroughs (`walkthrough.md`) MUST be provided in Japanese.
