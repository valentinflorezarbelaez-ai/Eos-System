# Secrets & Network

Cloud Agents are available in Privacy Mode. Privacy Mode (Legacy) is not supported.

## Secret protection

Secrets provided to Cloud Agents are encrypted at rest and in transit.

### Runtime secrets

Secrets set with type Runtime Secret are redacted from transcripts and commits as `[REDACTED]`. These should never be committed to the repository.

### Build secrets

Build secrets are only available to the Docker build process and are not exposed to the running agent.

## OIDC identity tokens

For cloud roles and internal APIs, prefer short-lived OIDC tokens over long-lived keys in Secrets.

## Signed commits

Cloud Agents sign every commit with a HSM-backed Ed25519 key. No setup is required.

## What you should know

1. Grant read-write privileges to our GitHub app for repos you want to edit.

## Network access

Control which network resources your Cloud Agents can reach.

### Access modes

Three modes control outbound network access: Allow all, Default + allowlist, and Allowlist only.

### Artifact uploads

Don't broaden the entry to `*.s3.us-east-1.amazonaws.com`: the wildcard opens egress to every bucket.

### Private network access

Use Tailscale in your home directory.

## Egress IP ranges

curl https://cursor.com/docs/ips.json for the published ranges.

## FAQ

Are Cloud Agents less secure than local agents?

## Sitemap

[Overview of all docs pages](/llms.txt)
