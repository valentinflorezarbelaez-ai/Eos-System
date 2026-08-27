# Available models

Cursor supports a range of AI models from multiple providers.

## How do I switch models?

Open the model selector in your chat or agent panel and choose the model you want, or press Cmd + / to cycle through models.

## Which models are available?

Cursor offers its own models (Grok 4.5 and Composer) in the Cursor Models pool alongside other frontier models from OpenAI, Anthropic, and Google. The available models depend on your plan.

See the [models reference](https://cursor.com/docs/models-and-pricing.md) for the complete list.

## Which model should I use?

- **Auto** selects models that balance intelligence, cost, and reliability. See [Cursor Router](https://cursor.com/help/models-and-usage/cursor-router.md) for Cost, Balance, and Intelligence modes.
- **Grok 4.5** is Cursor's flagship model.
- **Composer** is Cursor's fast, cost-efficient model.

## Which models does Cursor Router route across?

Cursor Router routes across GPT-5.5, Claude Opus 5, Grok 4.5, and Claude Fable 5. Blocking Grok 4.5 turns the router off.

To use Router from code, call `Cursor.models.list()` in the [TypeScript SDK](https://cursor.com/docs/sdk/typescript.md) or [Python SDK](https://cursor.com/docs/sdk/python.md).

## Can I see which model Cursor Router used for my request?

By default, the routed model identity is hidden so you judge results on merit.

## How much does Auto cost?

All Auto modes bill at the list price of the model each request is routed to.

## How much does Grok 4.5 cost?

Grok 4.5 draws from the Cursor Models usage pool included with your plan.

## How much do models cost?

Each model has its own per-token rate set by the provider. Cursor charges at these published API rates with no markup.

## What model am I talking to?

The active model is shown in the model picker at the top of the chat panel.

## What models do subagents use?

Built-in subagents select their model automatically based on the subtask.

## What does "model not available" mean?

Some models may not be available in certain regions based on restrictions set by the model providers (not Cursor).

Workarounds include Auto, other providers, or Bring Your Own API Key in Cursor Settings.

## Related

- [Cursor Router](https://cursor.com/help/models-and-usage/cursor-router.md)
- [API keys](https://cursor.com/help/models-and-usage/api-keys.md)
- [Usage and limits](https://cursor.com/help/models-and-usage/usage-limits.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
