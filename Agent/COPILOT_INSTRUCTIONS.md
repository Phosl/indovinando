# Copilot Instructions

Be concise.

Never rewrite files completely unless requested.

Prefer modifying existing code.

Always explain changes before generating code.

Use TypeScript strict mode.

Keep functions under 50 lines when possible.

Avoid adding dependencies.

When unsure, ask before implementing.

# Suggestion Prototyping (Project Adaptation)

Apply these rules to interactive UI work in this repository.

## Design Extraction First

- Before coding, extract visible design tokens from references: colors, spacing, radius, shadows,
  typography.
- Reuse existing project variables and patterns whenever possible.
- Do not invent new visual language if an existing one already fits the feature.

## Visual Composition Guardrails

- Keep consistent spacing rhythm (prefer 4/8/12/16/24 scale).
- Preserve clear grouping (tight within group, larger gap between groups).
- Align text and containers to shared edges; avoid arbitrary offsets.
- Run a quick pre-ship pass for proximity, breathing room, alignment, and visual balance.

## Micro-Interaction Rules

- Design interactions in 4 phases: anticipation, preview, commit, resolution.
- Preview feedback must be proportional to user input (drag distance/progress), not binary.
- Commit feedback must be deterministic and visible (state change + motion cue).
- Gesture path and button path must trigger equivalent feedback.
- Related elements should react together (no isolated animation islands).
- Respect reduced motion preferences.

## Motion and Implementation Constraints

- Prefer existing stack (React + SCSS/CSS transitions/keyframes); avoid adding animation
  dependencies unless requested.
- Keep motion short and purposeful; avoid decorative motion without state meaning.
- Ensure mobile-first behavior and touch-friendly hit areas.
- Validate no regressions in loading/error/empty states while adding motion.

# Project Instructions

## General

Be concise and practical.

Before writing code:

- explain the proposed solution in 3-5 bullet points
- identify potential risks
- ask for confirmation if the change is large

Do not repeat information already present in the conversation.

## Code Generation

Generate only the code that needs to change.

Do not rewrite entire files unless explicitly requested.

Prefer incremental modifications.

Show diffs or replacement blocks when possible.

Avoid boilerplate.

## Architecture

Respect the existing project structure.

Reuse existing components before creating new ones.

Avoid introducing new dependencies unless explicitly approved.

Prefer native browser APIs.

## Frontend

Prioritize:

- performance
- maintainability
- responsive design
- accessibility

Use semantic HTML.

Prefer CSS variables over hardcoded values.

Avoid inline styles unless necessary.

## JavaScript / TypeScript

Use modern ES modules.

Prefer TypeScript strict mode.

Avoid `any`.

Prefer pure functions.

Keep functions small and focused.

## UX/UI

Justify UX decisions briefly.

Highlight:

- usability issues
- accessibility concerns
- responsive behavior
- edge cases

Do not make visual assumptions without checking the design.

## Debugging

When debugging:

1. identify the likely cause
2. propose the smallest fix
3. explain why it works
4. suggest validation steps

## Token Optimization

Keep responses under 150 words unless asked otherwise.

Do not repeat code already shown.

Do not print unchanged code.

Do not generate documentation unless requested.

Prefer bullet points over long paragraphs.

When multiple solutions exist:

- show the best one first
- briefly mention alternatives

## Large Tasks

For complex requests:

- create a short plan
- execute one step at a time
- wait for confirmation before large refactors

## Agent Mode

Read only files directly related to the task.

Do not scan the entire repository unless requested.

Do not open generated files, build artifacts or node_modules.

Limit searches to relevant directories first.

Summarize findings in less than 10 bullet points.

When enough information is available, stop searching and proceed.
