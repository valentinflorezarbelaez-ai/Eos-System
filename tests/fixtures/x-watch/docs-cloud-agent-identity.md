# OIDC tokens

Cloud Agents can mint short-lived [OIDC](https://openid.net/specs/openid-connect-core-1_0.html) JWTs from inside the VM without storing long-lived credentials in Secrets.

This API is local to the agent VM. It is unrelated to the Cloud Agents API, which uses Cursor API keys.

## How it works

1. The agent calls the local socket and asks for a token with an audience the verifier expects.
2. The verifier checks the signature against Cursor's published JWKS.

## Mint a token

This socket is unrelated to the Cloud Agents API. The agent mints a token over the Unix socket.

### When claims appear

Install scripts can mint on the same socket. A token only includes claims that have a value when it is minted.

## Verify a token

Publish these URLs to your identity provider or resource server. Discovery has no authorization_endpoint.

## Trust model

The token identifies the Cloud Agent run, not a specific process inside the VM. Any process that can reach the socket can mint a token.

## Rate limits and errors

Each agent VM can mint 30 tokens per minute. Cache a token until it expires instead of minting per call.

## Related pages

- [Best practices](https://cursor.com/docs/cloud-agent/best-practices.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
