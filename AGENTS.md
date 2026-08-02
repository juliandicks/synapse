# Agent Instructions

- Use `gh auth status` before relying on GitHub CLI output.
- Use `gh issue list --repo juliandicks/synapse --limit 20` and `gh pr list --repo juliandicks/synapse --limit 20` to inspect repository activity.
- If `gh` reports an API connectivity error, retry outside the sandboxed CLI environment if network access is required.
