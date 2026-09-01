# Team Pricing

There are two business plans: Teams and Enterprise (Custom). Teams offers two types of seats: Standard ($40/user/mo) and Premium (5x usage at $120/user/mo).

Team plans provide additional features like:

- Centralized team billing and administration, with usage stats also available via the [Admin API](https://cursor.com/docs/account/teams/admin-api.md)
- Team marketplace for internal rules, skills, and plugins
- Agentic code reviews with Bugbot
- Cloud agents and automations with shared team context
- Usage analytics to understand team behavior
- Team-wide privacy mode enforcement
- SAML/OIDC SSO

We recommend Teams for any customer that is happy self-serving. We recommend [Enterprise](https://cursor.com/docs/enterprise.md) for customers that need priority support, pooled usage, invoicing, SCIM, or advanced security controls. [Contact sales](https://cursor.com/contact-sales?source=docs-teams-pricing) to get started.

## How pricing works

Teams pricing is based on paid seats and usage. Each paid seat includes monthly usage, and you can continue using Cursor beyond that with on-demand usage.

### Seat types

Teams has two paid seat types and one free admin-only seat type:

- **Standard**: $40/user/mo with the standard Teams usage allowance
- **Premium**: $120/user/mo with 5x the usage of a Standard seat
- **Free**: $0/user/mo for Unpaid Admins who manage the team without Cursor access

Seat type is separate from role. Members and Admins can have either a Standard or Premium seat. Unpaid Admins don't use a paid seat.

### Included usage

Each paid seat comes with included usage across two pools:

- Cursor Models (Cursor Grok 4.6, Grok 4.5, and Composer 2.5)
- Other Models (third-party models)

Usage is allocated per user based on seat type, does not transfer between team members, and resets at the start of each billing cycle.

### On-demand usage

On-demand usage allows you to continue using models after included usage is consumed, billed in arrears.

On-demand usage is enabled by default for the Teams plan.

### Cursor Token Rate

The Cursor Token Rate is $0.25 per million tokens and is charged on third-party model requests.

## Active seats

Cursor bills per active paid seat, not pre-allocated seats. Add, remove, upgrade, or downgrade users anytime and billing will adjust based on seat type.

## Spending controls

Teams can configure monthly team-wide spending limits. You can manage these limits through the dashboard. Per-member spend limits are available on [Enterprise](https://cursor.com/docs/enterprise.md) plans.

## Model Pricing

All prices are per million tokens. Teams are charged at public list API prices plus Cursor Token Rate for third-party model requests, including when Auto routes to a third-party model.

---

## Sitemap

[Overview of all docs pages](/llms.txt)
