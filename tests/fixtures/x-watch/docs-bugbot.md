# Bugbot

Bugbot reviews pull requests and identifies bugs, security issues, and code quality problems.

## How it works

Bugbot analyzes PR diffs and leaves comments with explanations and fix suggestions. Manual trigger by commenting `cursor review` or `bugbot run` on any PR.

## Setup

Connect repositories through the dashboard. For GitHub Enterprise Server, follow the [GitHub integration setup](https://cursor.com/docs/integrations/github.md#setup).

## CI check statuses

Bugbot publishes a GitHub check named `Cursor Bugbot`.

## Configuration

Team admins can enable Bugbot per repository.

## Analytics

Open Bugbot in Automations to view review activity.

## API

```bash
curl --request POST --url https://api.cursor.com/bugbot/review -u YOUR_API_KEY:
```

## Incremental reviews

By default, Bugbot reviews only the changes since the previous Bugbot review.

## Effort Levels

Effort levels control how much time Bugbot spends reasoning during a review.

## Rules

Guide reviews with team rules, repository rules, and project `.cursor/BUGBOT.md` files.

Cursor project rules (`*.mdc` files in `.cursor/rules/`) do not apply to Bugbot runs.

## Run in your agent

Use the `/review-bugbot` or `/review` skills to run Bugbot from your agent before you push the code.

## Autofix

Bugbot Autofix automatically spawns a Cloud Agent to fix bugs found during PR reviews.

## MCP support

Bugbot is integrated with your MCP servers so your AI tools can interact with Bugbot directly.

## Admin Configuration API

Team admins can use the Bugbot Admin API to enable Bugbot across multiple repositories.

## Pricing

Bugbot uses usage-based billing. Additional reviews bill from on-demand spend.

## Troubleshooting

Enable verbose mode by commenting `cursor review verbose=true`.

## FAQ

When you use all included Bugbot usage, additional Bugbot reviews bill from on-demand spend.

## Related

[Bugbot help](https://cursor.com/help/ai-features/bugbot.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
