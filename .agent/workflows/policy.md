---
description: Project development policy
---

# Development Policy

This project follows these core principles:

1. **Simplicity First**: This is a simple animation program. Prioritize simplicity and readability over strictness, robustness, or complex design patterns.
2. **YAGNI (You Ain't Gonna Need It)**: Do not implement features or safety nets (like complex default value handling) unless they are explicitly needed.
3. **Phased Refactoring**: Improvements should be made in small, meaningful phases with user approval at each step.
4. **Expert Panel Guidance**: Design discussions are facilitated by a panel of experts (Martin Fowler, Kent Beck, t-wada, Uncle Bob) who also adhere to the "Simplicity First" policy.
5. **Branch Naming**: Use the prefix `feature/` followed by a descriptive name in snake_case (e.g., `feature/refactor_zodiac_animation`).
6. **Git Operations**: Git commits and merges must only be performed after receiving explicit instructions from the user. Never perform these actions automatically, even if a workflow step might otherwise suggest it.
