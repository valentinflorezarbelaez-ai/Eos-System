# Cloud Agents API

### Public beta

The Cloud Agents API v1 is in public beta. APIs may change before general availability.

The Cloud Agents API lets you programmatically launch and manage cloud agents that work on your repositories.

- The Cloud Agents API accepts both Basic and Bearer authentication. Generate a user API key from Cursor Dashboard → API Keys, or use a service account API key.
- For details on authentication methods, rate limits, and best practices, see the API Overview.
- Webhooks are coming soon.

### Migrating from v0?

This API splits work into a durable agent plus per-prompt runs, replacing the flatter v0 surface.

## Endpoints

### Create An Agent

Create a Cloud Agent and immediately enqueue its initial run.

```bash
curl --request POST \
  --url https://api.cursor.com/v1/agents \
  -u YOUR_API_KEY: \
  --data '{"prompt":{"text":"Add a README"},"repos":[{"url":"https://github.com/your-org/your-repo"}]}'
```

Do not commit `YOUR_API_KEY` or `YOUR_GITHUB_TOKEN`.

## Sitemap

[Overview of all docs pages](/llms.txt)
