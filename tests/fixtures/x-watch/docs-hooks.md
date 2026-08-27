# Hooks

Hooks let you observe, control, and extend the agent loop using custom scripts. Define hooks in `hooks.json` files at the project or user level.

## Hook categories

Hooks fall into three categories based on what triggers them.

## Cloud agent support

Cloud agents run command-based hooks from your repository. If you have hooks defined in `.cursor/hooks.json` at the root of your project, cloud agents pick them up and run them during their work.

### Supported hooks

The following hooks run in cloud agents: `beforeShellExecution`, `afterFileEdit`, and `stop`.

### Hooks not available in cloud agents

Tab completions and `sessionStart` do not run in cloud agents.

### Configuration sources

Cloud agents load hooks from these sources. Project hooks in `.cursor/hooks.json` are loaded. User-level hooks (`~/.cursor/hooks.json`) are not available in cloud agents.

### Execution type limits

Cloud agents run command-based hooks only. Prompt-based hooks are not available in the cloud execution environment.

## Configuration

Define hooks in a hooks.json file under your home directory, including audit.sh.

## Quickstart

Create a hooks.json file in your home directory.

## Examples

# audit.sh writes JSON input to a log.

## Partner Integrations

Looking for ready-to-use integrations from ecosystem partners.

## Sitemap

[Overview of all docs pages](/llms.txt)
