# Best Practices

Use these recommendations to get more reliable Cloud Agent runs.

## Set up the environment first

Use Cloud agent setup so that Cursor has its environment configured.

## Ensure the agent can access what it needs

Before running a Cloud Agent, verify these prerequisites.

### Secrets

Make sure the agent has access to required secrets through the Secrets tab. For cloud roles, prefer OIDC tokens over long-lived access keys.

### Egress controls

If you have network access restrictions enabled, ensure all URLs your local development requires are whitelisted.

## Use skills and agents.md to configure your agent

If the cloud agent is having difficulty testing its changes, we recommend using skills and agents.md to configure your agent.

## Use rules to enforce conventions

Cloud Agents can read and follow Rules at three levels.

### Repo rules

`.cursor/rules/*.mdc` files committed to the repository apply to all agents using that repository.

## Give the agent the tools it needs

We recommend using MCP and creating custom tools so that the agent has access to the same systems a human developer would.

## Related

- [Cloud agent setup](https://cursor.com/docs/cloud-agent/setup.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
