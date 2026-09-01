# Private Connectivity

Cursor supports private network connectivity for Enterprise teams that need Cursor to work with systems that are not reachable from the public internet.

The same private connectivity setup is used across Cloud Agents, Bugbot, and Cursor backend services.

## Supported options

AWS PrivateLink and Cloudflare Tunnel are the supported options.

## How to choose

Use AWS PrivateLink when your private Git provider or package registry is in AWS. Use Cloudflare Tunnel when AWS PrivateLink is not practical.

## Prerequisites

A Cursor Enterprise workspace and a self-hosted Git provider reachable over HTTPS.

## AWS PrivateLink

Create a Network Load Balancer and publish an endpoint service. Allow CIDR `10.2.8.0/21`.

## Cloudflare Tunnel

Keep the tunnel token secret. Do not send it through email or chat.

## Complete the source control connection

For GitHub Enterprise Server, follow the GitHub integration setup.

## Check the private webhook path

curl https://api2.cursor.sh/

## Troubleshooting

Cursor cannot complete the private connection.

## Google Private Service Connect

Cursor does not currently offer customer-facing Google Private Service Connect.

## What to send Cursor

Endpoint service name and AWS region.

## Further reading

AWS Create an endpoint service.

## Sitemap

[Overview of all docs pages](/llms.txt)
