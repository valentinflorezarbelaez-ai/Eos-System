# Agent metadata

Cloud Agents can read key-value metadata about the current run from inside the VM.

This API is local to the agent VM. It is not the caller-owned metadata tags you set when creating an agent with the SDK or Cloud Agents API.

When something outside the VM needs to verify the agent's identity, have the agent mint an OIDC token instead. Metadata is not a credential.

## Read a value

This API is not the Cloud Agents API metadata tags. The agent reads keys over the Unix socket.

### When keys appear

Install scripts can read the same socket. A key is present only when it has a value.

## Who can read metadata

Don't forward metadata values as a credential. Use an OIDC token to prove identity.

## Rate limits and errors

Each agent VM can make 120 metadata requests per minute. The cap is shared with OIDC minting.

## Examples

curl the socket for agent/id.

## Related pages

- [OIDC tokens](https://cursor.com/docs/cloud-agent/identity.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
