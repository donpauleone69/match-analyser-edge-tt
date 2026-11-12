# What does Simplify do?

_Chat note — 2026-11-12. Brainstorm. No product change._

## Short answer

**Cursor does not document a built-in first-party “Simplify” mode** (not in core skills / CLI slash commands / Agent–Edit docs). In practice, “Simplify” usually means a **cleanup pass** on code you already wrote: clarify, dedupe, reduce nesting/AI slop, **without changing behaviour**.

## How people invoke it

- Type `/` in Agent chat and pick a simplify skill if one is installed (marketplace), **or**
- Ask in natural language: “simplify these changes.”
- Closely related (often confused): Anthropic Claude Code’s `/simplify` — not the same as a stock Cursor command.

## Vs Agent / Edit

| | Agent | Edit | Simplify (cleanup) |
|--|--|--|--|
| Job | Build / explore | Scoped multi-file edits | Polish settled diffs |
| Scope | Task-driven | Change-focused | Prefer recent/touched code |
| Behaviour change | Yes | Yes | **Should not** |

## Caveats

- Not a substitute for tests or review.
- Can over-trim comments or defensive checks — always read the diff.
- Only as good as the skill/prompt you use; not guaranteed to exist out of the box.
