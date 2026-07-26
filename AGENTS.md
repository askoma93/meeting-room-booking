## Agent skills

### Project engineering skills

Use the smallest relevant set of skills for the task:

- Use `frontend-design` when creating or polishing Angular pages and components. Preserve accessibility, responsiveness, and the project's product context while avoiding generic template-like UI.
- Use `playwright-interactive` after frontend changes for functional and visual QA in a real browser. Verify important states, responsive layouts, and user-visible error handling.
- Use `figma` when a task includes a Figma URL or node and the Figma MCP server is connected. Treat the supplied design and its tokens as the source of truth.
- Use `security-best-practices` when the user explicitly requests secure-by-default implementation or a security review of TypeScript behavior in Angular or NestJS, especially authentication, authorization, validation, secrets, and browser security.
- Use `security-threat-model` when explicitly threat-modeling the application or a major trust-boundary change.
- Continue to use `implement`, `tdd`, `codebase-design`, `diagnosing-bugs`, and `code-review` for the core implementation flow; the project skills above complement rather than replace them.

### Issue tracker

Issues are tracked in GitHub Issues for `askoma93/meeting-room-booking`. See `docs/agents/issue-tracker.md`.

### Task completion

When work originates from a GitHub issue, do not consider the task complete until
its acceptance criteria are implemented, the relevant checks and code review
pass, all task-related changes are committed and pushed to the current remote
branch, and the originating issue is closed with a concise completion comment.
Do this automatically unless the user explicitly asks to keep the issue open or
not to push.

### Triage labels

This repo uses the default mattpocock/skills triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.
