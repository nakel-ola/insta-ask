# Contributing to InstaAsk

## Before You Start

- Use Node.js 20 or newer.
- Install dependencies with `npm install`.
- Run `npm run typecheck` before opening a pull request.

## Development Workflow

1. Create a branch for your change.
2. Make focused changes with a clear scope.
3. Test the extension manually in Chrome using `Load unpacked`.
4. Run `npm run typecheck`.
5. Open a pull request with a concise description of the change and the manual checks you performed.

## Coding Expectations

- Keep the extension compatible with Manifest V3.
- Preserve the current plain JavaScript plus `// @ts-check` setup unless the repo is intentionally being migrated.
- Prefer small, readable modules and avoid mixing unrelated UI and storage logic.
- Keep user-facing copy short and direct.

## Pull Request Checklist

- The change is limited to the intended scope.
- New behavior is documented in the README when needed.
- `npm run typecheck` passes.
- Manual browser verification was completed for affected flows.

## Reporting Issues

When reporting a bug, include:

- What page or site the issue happened on
- The selected text or action that triggered it
- Expected behavior
- Actual behavior
- Browser version if relevant
