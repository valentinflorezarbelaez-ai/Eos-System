# Plugins

Plugins package rules, skills, agents, commands, MCP servers, and hooks into distributable bundles.

## What plugins contain

A plugin can bundle rules (`.mdc` files), skills, agents, commands, MCP servers, and hooks.

## The Agent Plugins standard

Plugins bundle reusable components an agent can use.

- **Agent Plugins**: spec-conformant plugins with a `plugin.json` manifest at the plugin root, packaging skills and MCP servers
- **Cursor Plugins**: plugins with a `.cursor-plugin/plugin.json` manifest, which add rules, agents, commands, hooks, and variables

## Cursor Plugin canvases

Hex Canvas and Atlassian Canvas are vendor templates.

## The marketplace

Browse official plugins at cursor.com/marketplace.

## Team marketplaces

Team marketplaces are available on Teams and Enterprise plans.

### Default team marketplace

Admins can add Team MCP servers that are already available to Cloud Agents, then make the same servers available for teammates.

Removing a linked MCP plugin from the marketplace can delete the Team MCP server for Cloud Agents.

### How does SCIM work?

Organization Groups can sync membership from your identity provider.

### Plugin installation modes

Default On installs the plugin unless developers opt out.

## Add a team marketplace

Go to Dashboard -> Plugins.

## Installing plugins

Select Install and choose a project or user scope.

### MCP Apps deeplinks

Share MCP server configurations using install links.

## Creating plugins

A plugin is a directory with a manifest and its components.

### Test plugins locally

Put either plugin format in `~/.cursor/plugins/local`.

## FAQ

Are marketplace plugins reviewed for security?

## Related

- [Plugins help](https://cursor.com/help/customization/plugins.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
