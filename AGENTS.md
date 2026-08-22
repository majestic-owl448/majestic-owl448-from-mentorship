## Pull Requests

- Use conventional commit format for pull request titles.
- When creating a pull request, if you find problems outside the issue scope, make sure to record them. Search the existing issues first. If an existing issue covers the problem, add a note to that issue. Otherwise, create a new issue.

## Pull Request Reviews

- Review the full scope of the pull request's issue, not only the changed files and lines. Check whether the pull request missed any part of the issue.
- For problems found outside the issue's scope, search the existing issues first. If the problem is covered by the scope of an existing issue, and the specific problem is not already recorded, add a comment to the issue. Otherwise, create a new issue.

## Verification Before Commits

- After the user approves a text-only change, apply it and create its atomic commit without requiring runtime verification.
- Before committing a functional code change, verify the exact behavior the change claims to implement or fix.
- Use a verification method that matches the behavior. For example, a component remount test does not verify a full browser reload.