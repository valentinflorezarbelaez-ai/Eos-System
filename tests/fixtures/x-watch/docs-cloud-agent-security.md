# Security overview

This page explains how Cloud Agents are built and secured. For the configuration reference, see Secrets & Network.

Cursor is SOC 2 Type 2 compliant. See the Trust Center for certifications.

## How Cloud Agents work

A Cloud Agent is a coding agent that runs in a virtual machine in Cursor's cloud.

## Access and authorization

Access is inherited, never widened. A Cloud Agent can only reach repositories the triggering user could already reach.

## Isolation and infrastructure

Each agent runs in its own VM boundary, not a shared process sandbox.

## Encryption

Cursor encrypts Cloud Agent data in transit and at rest.

## What data is stored, where, and for how long

Runtime workspace data lives in the isolated Cloud Agent VM.

## Privacy and model data

Cloud Agents run in Privacy Mode. Legacy Privacy Mode is not supported for Cloud Agents.

## Autonomy and prompt injection

Mark secrets as Runtime Secrets. Restrict outbound traffic with network allowlists. Add sensitive paths to `.cursorignore`. Agents open draft pull requests. Nothing merges until a person reviews the change.

## Risk considerations

Full codebase in the cloud is mitigated by isolated per-agent VMs.

## Auditability

Runs are logged, and team admins can review activity from the dashboard.

## Data deletion

Archive an agent from the dashboard.

## FAQ

Are Cloud Agents less secure than local agents?

## Related pages

- [Secrets & Network](https://cursor.com/docs/cloud-agent/security-network.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
