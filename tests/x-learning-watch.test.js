import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addWatchedHandles,
  applyHint,
  computeNewItems,
  extractActionableLearnings,
  ingest,
  isBlockedFetchUrl,
  mergeLearnings,
  parseCursorBlogArticle,
  parseCursorBlogIndex,
  parseFeed,
  parseOfficialSource,
  parseOfficialMarkdown,
  cursorOfficialMarkdownUrl,
  renderBriefing,
  selectCurrentLearnings,
  writeIngestArtifacts,
  validateCitedXPosts,
  validateWatchlist
} from '../scripts/engine/x-learning-watch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rssXml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/changelog.rss.xml'), 'utf8');
const atomXml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/blog.atom.xml'), 'utf8');

const validWatchlist = {
  watch_id: 'X-WATCH-001',
  requested_platform: 'X',
  accounts: [
    {
      handle: 'cursor_ai',
      url: 'https://x.com/cursor_ai',
      priority: 'PRIMARY',
      timeline_access: 'BLOCKED'
    }
  ],
  feeds: [
    {
      feed_id: 'FEED-CURSOR-CHANGELOG',
      url: 'https://cursor.com/changelog/rss.xml',
      kind: 'rss',
      fetchable: true
    }
  ]
};

test('validateWatchlist accepts cursor_ai seed', () => {
  const result = validateWatchlist(validWatchlist);
  assert.equal(result.valid, true);
  assert.equal(result.handles.includes('cursor_ai'), true);
});

test('validateWatchlist rejects missing accounts', () => {
  const result = validateWatchlist({ feeds: validWatchlist.feeds });
  assert.equal(result.valid, false);
});

test('parseFeed extracts RSS items', () => {
  const items = parseFeed(rssXml);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Cloud Agents and Cursor Harness Improvements');
  assert.equal(items[0].id, 'https://cursor.com/changelog/08-19-26');
  assert.equal(items[0].link, 'https://cursor.com/changelog/08-19-26');
  assert.match(items[0].publishedAt, /19 Aug 2026/);
  assert.match(items[0].summary, /subscribe to events/);
});

test('parseFeed extracts forum announcement items', () => {
  const forumXml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/announcements.rss.xml'), 'utf8');
  const items = parseFeed(forumXml);
  assert.equal(items.length, 8);
  assert.equal(items[0].title, 'Origin Code Hosting');
  assert.equal(items[0].id, 'forum.cursor.com-topic-168670');
  assert.equal(items[0].link, 'https://forum.cursor.com/t/origin-code-hosting/168670');
  assert.equal(items[1].title, 'Grok 4.6 is now Live!');
  assert.equal(items[2].title, 'Introducing Grok Bot');
});

test('parseFeed extracts Atom entries', () => {
  const items = parseFeed(atomXml);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Builds');
  assert.equal(items[0].id, 'https://cursor.com/blog/builds');
  assert.equal(items[0].link, 'https://cursor.com/blog/builds');
  assert.match(items[0].summary, /environment copies/);
});

test('computeNewItems returns only unseen ids', () => {
  const items = parseFeed(rssXml);
  const fresh = computeNewItems(items, []);
  assert.equal(fresh.length, 2);
  const delta = computeNewItems(items, ['https://cursor.com/changelog/08-19-26']);
  assert.equal(delta.length, 1);
  assert.equal(delta[0].id, 'https://cursor.com/changelog/origin-code-hosting');
});

test('isBlockedFetchUrl flags X hosts', () => {
  assert.equal(isBlockedFetchUrl('https://x.com/cursor_ai'), true);
  assert.equal(isBlockedFetchUrl('https://twitter.com/cursor_ai'), true);
  assert.equal(isBlockedFetchUrl('https://cursor.com/changelog/rss.xml'), false);
  assert.equal(isBlockedFetchUrl('https://forum.cursor.com/c/announcements/11.rss'), false);
  assert.equal(isBlockedFetchUrl('https://cursor.com/blog'), false);
  assert.equal(isBlockedFetchUrl('https://cursor.com/help/models-and-usage/grok-4-6'), false);
  assert.equal(isBlockedFetchUrl('https://cursor.com/docs/models-and-pricing'), false);
});

test('ingest does not fetch x.com and records BLOCKED', async () => {
  const calls = [];
  const result = await ingest({
    watchlist: {
      ...validWatchlist,
      feeds: [
        {
          feed_id: 'FEED-X-TIMELINE',
          url: 'https://x.com/cursor_ai',
          kind: 'rss',
          fetchable: true
        }
      ]
    },
    state: { seen_ids: [] },
    fetchImpl: async (url) => {
      calls.push(url);
      return { ok: true, text: rssXml };
    }
  });
  assert.equal(calls.length, 0);
  assert.equal(result.blocked.length, 1);
  assert.equal(result.blocked[0].url, 'https://x.com/cursor_ai');
  assert.equal(result.items.length, 0);
});

test('repo WATCHLIST.json seeds cursor_ai and official changelog', () => {
  const watchlistPath = path.join(__dirname, '../docs/intelligence/x-watch/WATCHLIST.json');
  const watchlist = JSON.parse(fs.readFileSync(watchlistPath, 'utf8'));
  const result = validateWatchlist(watchlist);
  assert.equal(result.valid, true);
  assert.equal(result.handles.includes('cursor_ai'), true);
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/changelog/rss.xml'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://forum.cursor.com/c/announcements/11.rss'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/blog' && feed.kind === 'html'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/models-and-usage/grok-4-6' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/models-and-pricing' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/automations' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/builds' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/cli' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/integrations' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/mirror-github' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cursor-router' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/models-and-usage/usage-limits' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/capabilities' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/subagents' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/overview' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/skills' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/prompting' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/rules' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/automations' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/setup' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/best-practices' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/identity' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/metadata' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/hooks' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/security-network' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/security' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/mcp' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/plugins' && feed.kind === 'html-page'),
    true
  );
});

test('ingest fetches official RSS and updates seen ids', async () => {
  const result = await ingest({
    watchlist: validWatchlist,
    state: { seen_ids: ['https://cursor.com/changelog/08-19-26'] },
    fetchImpl: async () => ({ ok: true, text: rssXml })
  });
  assert.equal(result.newItems.length, 1);
  assert.equal(result.newItems[0].title, 'Origin Code Hosting');
  assert.equal(result.nextState.seen_ids.includes('https://cursor.com/changelog/origin-code-hosting'), true);
  assert.match(renderBriefing(result), /Origin Code Hosting/);
  assert.match(renderBriefing(result), /cursor_ai/);
  assert.equal(result.learnings.length, 1);
  assert.equal(result.learnings[0].source_url, 'https://cursor.com/changelog/origin-code-hosting');
  assert.equal(result.learnings[0].epistemic_status, 'OBSERVED');
  assert.equal(result.learnings[0].x_timeline_verified, false);
  assert.match(result.learnings[0].apply_in_eos, /Origin|GitHub|host/i);
  assert.match(renderBriefing(result), /Learnings to apply/);
});

test('extractActionableLearnings maps changelog items to OBSERVED lessons', () => {
  const items = parseFeed(rssXml);
  const learnings = extractActionableLearnings(items);
  assert.equal(learnings.length, 2);
  assert.equal(learnings[0].learning_id.startsWith('LRN-CURSOR-'), true);
  assert.equal(learnings[0].x_timeline_verified, false);
  assert.match(learnings[0].apply_in_eos, /timer|PR|Slack|subscription/i);
});

test('mergeLearnings is idempotent by source_url', () => {
  const learnings = extractActionableLearnings(parseFeed(rssXml));
  const first = mergeLearnings({ learnings: [] }, learnings);
  assert.equal(first.added, 2);
  const second = mergeLearnings(first.store, learnings);
  assert.equal(second.added, 0);
  assert.equal(second.store.learnings.length, 2);
});

test('mergeLearnings refreshes a row when the incoming summary is richer', () => {
  const seed = extractActionableLearnings(parseFeed(rssXml));
  const first = mergeLearnings({ learnings: [] }, seed);
  const richer = {
    ...seed[0],
    summary: `${seed[0].summary} Subscriptions /goal isolated subagents custom modes steering.`
  };
  const second = mergeLearnings(first.store, [richer]);
  assert.equal(second.added, 0);
  assert.match(second.store.learnings.find((row) => row.source_url === seed[0].source_url).summary, /steering/);
});

test('mergeLearnings sorts by parsed publication date, newest first', () => {
  const merged = mergeLearnings({ learnings: [] }, [
    { source_url: 'https://cursor.com/changelog/ipad', title: 'iPad', published_at: 'Wed, 29 Jul 2026 00:00:00 GMT', summary: 'old' },
    { source_url: 'https://cursor.com/changelog/08-19-26', title: 'Harness', published_at: 'Wed, 19 Aug 2026 00:00:00 GMT', summary: 'new' }
  ]);
  assert.equal(merged.store.learnings[0].source_url, 'https://cursor.com/changelog/08-19-26');
});

test('addWatchedHandles records operator handles as BLOCKED timelines', () => {
  const result = addWatchedHandles(validWatchlist, ['@anysphere', 'https://x.com/cursor_ai', 'bad handle!', '']);
  assert.deepEqual(result.added, ['anysphere']);
  assert.equal(result.skipped.some((row) => row.reason === 'DUPLICATE'), true);
  assert.equal(result.skipped.some((row) => row.reason === 'INVALID'), true);
  const extra = result.watchlist.accounts.find((account) => account.handle === 'anysphere');
  assert.equal(extra.timeline_access, 'BLOCKED');
  assert.equal(extra.url, 'https://x.com/anysphere');
});

test('repo LEARNINGS.json is OBSERVED-only and newest first', () => {
  const store = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/intelligence/x-watch/LEARNINGS.json'), 'utf8'));
  assert.ok(store.learnings.length >= 1);
  assert.equal(store.learnings.every((row) => row.epistemic_status === 'OBSERVED'), true);
  assert.equal(store.learnings.every((row) => row.x_timeline_verified === false), true);
  const times = store.learnings.map((row) => Date.parse(row.published_at) || 0);
  for (let i = 1; i < times.length; i += 1) {
    assert.ok(times[i - 1] >= times[i], 'LEARNINGS.json must stay newest-first');
  }
  const harness = store.learnings.find((row) => row.source_url === 'https://cursor.com/changelog/08-19-26');
  assert.ok(harness);
  assert.match(harness.apply_in_eos, /timer|Slack|PR/i);
  assert.match(harness.apply_in_eos, /auto-CI-fix/i);
  const overview = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/overview');
  assert.ok(overview);
  assert.match(overview.summary, /Steer a running agent/i);
  const originIntegrations = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/integrations');
  assert.ok(originIntegrations);
  assert.match(originIntegrations.summary, /\/automate/);
  assert.match(originIntegrations.apply_in_eos, /Origin|GitHub/i);
  const originMirror = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/mirror-github');
  assert.ok(originMirror);
  assert.match(originMirror.apply_in_eos, /Do not Detach/i);
  assert.match(originMirror.apply_in_eos, /source of truth/i);
  const bestPractices = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/best-practices');
  assert.ok(bestPractices);
  assert.match(bestPractices.summary, /OIDC/i);
  assert.match(bestPractices.apply_in_eos, /OIDC/i);
  const rules = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/rules');
  assert.ok(rules);
  assert.match(rules.summary, /\.mdc/);
  assert.match(rules.summary, /\/create-rule/);
  assert.match(rules.apply_in_eos, /\.mdc/);
  assert.match(rules.apply_in_eos, /\/create-rule/);
  assert.match(rules.apply_in_eos, /Team dashboard rules are not EOS governance/i);
  assert.equal(rules.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(rules.summary.includes('Code Style'), false);
  const identity = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/identity');
  assert.ok(identity);
  assert.match(identity.summary, /OIDC/i);
  assert.match(identity.apply_in_eos, /OIDC/i);
  assert.match(identity.apply_in_eos, /Cloud Agents API/i);
  assert.match(identity.apply_in_eos, /unexpected aud/i);
  assert.equal(/How it works — 1\./.test(identity.summary), false);
  const metadata = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/metadata');
  assert.ok(metadata);
  assert.match(metadata.apply_in_eos, /not a credential/i);
  assert.match(metadata.apply_in_eos, /OIDC/i);
  assert.match(metadata.apply_in_eos, /Cloud Agents API/i);
  const hooks = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/hooks');
  assert.ok(hooks);
  assert.match(hooks.summary, /\.cursor\/hooks\.json/);
  assert.match(hooks.summary, /Cloud agent support/i);
  assert.match(hooks.summary, /command-based/i);
  assert.match(hooks.apply_in_eos, /\.cursor\/hooks\.json/);
  assert.match(hooks.apply_in_eos, /User-level/i);
  assert.match(hooks.apply_in_eos, /prompt-based/i);
  assert.match(hooks.apply_in_eos, /Tab/);
  assert.match(hooks.apply_in_eos, /sessionStart/);
  assert.equal(hooks.summary.includes('hooks partners'), false);
  assert.equal(hooks.apply_in_eos.includes('Custom Mode'), false);
  const securityNetwork = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/security-network');
  assert.ok(securityNetwork);
  assert.match(securityNetwork.summary, /OIDC/i);
  assert.match(securityNetwork.summary, /\[REDACTED\]/);
  assert.match(securityNetwork.apply_in_eos, /Runtime Secrets/);
  assert.match(securityNetwork.apply_in_eos, /OIDC/);
  assert.match(securityNetwork.apply_in_eos, /\[REDACTED\]/);
  assert.match(securityNetwork.apply_in_eos, /allowlist/i);
  assert.match(securityNetwork.apply_in_eos, /Privacy Mode \(Legacy\)/);
  assert.equal(/enable/i.test(securityNetwork.apply_in_eos), false);
  assert.equal(securityNetwork.apply_in_eos.includes('Custom Mode'), false);
  const mcp = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/mcp');
  assert.ok(mcp);
  assert.match(mcp.summary, /\.cursor\/mcp\.json/);
  assert.match(mcp.apply_in_eos, /\.cursor\/mcp\.json/);
  assert.match(mcp.apply_in_eos, /User-level/i);
  assert.match(mcp.apply_in_eos, /not EOS governance/i);
  assert.match(mcp.apply_in_eos, /API keys/i);
  assert.equal(/enable/i.test(mcp.apply_in_eos), false);
  assert.equal(mcp.apply_in_eos.includes('Custom Mode'), false);
  const plugins = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/plugins');
  assert.ok(plugins);
  assert.match(plugins.summary, /plugin\.json/);
  assert.match(plugins.summary, /\.cursor-plugin\/plugin\.json/);
  assert.match(plugins.apply_in_eos, /\.cursor\/mcp\.json/);
  assert.match(plugins.apply_in_eos, /~\/\.cursor\/plugins\/local/);
  assert.match(plugins.apply_in_eos, /not EOS governance/i);
  assert.match(plugins.apply_in_eos, /Cloud Agent MCP/i);
  assert.equal(/enable/i.test(plugins.apply_in_eos), false);
  assert.equal(plugins.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(/Migrate existing Team MCPs —/.test(plugins.summary), false);
  const cloudAgents = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent');
  assert.ok(cloudAgents);
  assert.equal(cloudAgents.summary.includes(' Cloud Agents How to access'), false);
  const grokBot = store.learnings.find((row) => row.source_url === 'https://forum.cursor.com/t/introducing-grok-bot/168053');
  if (grokBot) {
    assert.match(grokBot.apply_in_eos, /Grok Bot/i);
    assert.equal(grokBot.apply_in_eos.includes('timers'), false);
  }
  const aiuc = store.learnings.find((row) => row.source_url === 'https://cursor.com/blog/aiuc-1');
  if (aiuc) {
    assert.match(aiuc.apply_in_eos, /security-auditor/i);
  }
});

test('applyHint is specific for current official product titles', () => {
  const samples = [
    { title: 'Google Workspace Plugins', link: 'https://cursor.com/changelog/google-workspace-plugins' },
    { title: 'Improvements to Cursor in Slack', link: 'https://cursor.com/changelog/slack-improvements' },
    { title: 'Cursor Router', link: 'https://cursor.com/changelog/router' },
    { title: 'Side Chats and Conversation Search', link: 'https://cursor.com/changelog/side-chat' },
    { title: 'MCPs and Organizations in Team Marketplaces', link: 'https://cursor.com/changelog/team-marketplace-updates' },
    { title: 'Grok 4.6 is now Live!', link: 'https://forum.cursor.com/t/grok-4-6-is-now-live/168189' },
    { title: 'Introducing Grok Bot', link: 'https://forum.cursor.com/t/introducing-grok-bot/168053' },
    { title: 'Share your Thoughts on Grok 4.6', link: 'https://forum.cursor.com/t/share-your-thoughts-on-grok-4-6/168190' },
    { title: 'New Campus Community Launches', link: 'https://forum.cursor.com/t/new-campus-community-launches/164026' },
    { title: 'Addressing the recent Mindgard report', link: 'https://forum.cursor.com/t/addressing-the-recent-mindgard-report/165817' },
    { title: 'Claude Opus 5 now available!', link: 'https://forum.cursor.com/t/claude-opus-5-now-available/166583' },
    { title: 'Cursor is now a part of SpaceX', link: 'https://cursor.com/blog/joining-spacex' },
    { title: 'Introducing Grok 4.6', link: 'https://cursor.com/blog/grok-4-6' },
    { title: 'Grok 4.6', link: 'https://cursor.com/help/models-and-usage/grok-4-6' },
    { title: 'Models & Pricing', link: 'https://cursor.com/docs/models-and-pricing' },
    { title: 'Automations', link: 'https://cursor.com/help/ai-features/automations' },
    { title: 'Cloud Agent Builds', link: 'https://cursor.com/docs/cloud-agent/builds' },
    { title: 'Origin', link: 'https://cursor.com/docs/origin' },
    { title: 'Install the Origin CLI', link: 'https://cursor.com/docs/origin/cli' },
    { title: 'Origin integrations', link: 'https://cursor.com/docs/origin/integrations' },
    { title: 'Mirror a GitHub repository', link: 'https://cursor.com/docs/origin/mirror-github' },
    { title: 'Towards self-driving codebases', link: 'https://cursor.com/blog/self-driving-codebases' },
    { title: 'Cursor Router', link: 'https://cursor.com/docs/cursor-router' },
    { title: 'Usage and limits', link: 'https://cursor.com/help/models-and-usage/usage-limits' },
    { title: 'Cloud Agents', link: 'https://cursor.com/docs/cloud-agent' },
    { title: 'Capabilities', link: 'https://cursor.com/docs/cloud-agent/capabilities' },
    { title: 'Subagents', link: 'https://cursor.com/docs/subagents' },
    { title: 'Overview', link: 'https://cursor.com/docs/agent/overview' },
    { title: 'Agent Skills', link: 'https://cursor.com/docs/skills' },
    { title: 'Prompting agents', link: 'https://cursor.com/docs/agent/prompting' },
    { title: 'Rules', link: 'https://cursor.com/docs/rules' },
    { title: 'Automations', link: 'https://cursor.com/docs/cloud-agent/automations' },
    { title: 'Cloud Environment Setup', link: 'https://cursor.com/docs/cloud-agent/setup' },
    { title: 'Cloud Agent Best Practices', link: 'https://cursor.com/docs/cloud-agent/best-practices' },
    { title: 'OIDC tokens', link: 'https://cursor.com/docs/cloud-agent/identity' },
    { title: 'Agent metadata', link: 'https://cursor.com/docs/cloud-agent/metadata' },
    { title: 'Hooks', link: 'https://cursor.com/docs/hooks' },
    { title: 'Secrets & Network', link: 'https://cursor.com/docs/cloud-agent/security-network' },
    { title: 'Security overview', link: 'https://cursor.com/docs/cloud-agent/security' },
    { title: 'Model Context Protocol (MCP)', link: 'https://cursor.com/docs/mcp' },
    { title: 'Plugins', link: 'https://cursor.com/docs/plugins' },
    { title: 'Cursor earns AIUC-1 certification for agent security and reliability', link: 'https://cursor.com/blog/aiuc-1' }
  ];
  for (const sample of samples) {
    const hint = applyHint({ ...sample, summary: sample.title });
    assert.equal(hint.startsWith('Review this official'), false, sample.title);
  }
});

test('applyHint does not treat forum subscription wording as changelog harness news', () => {
  const grokBot = applyHint({
    title: 'Introducing Grok Bot',
    link: 'https://forum.cursor.com/t/introducing-grok-bot/168053',
    summary: 'Available today for SuperGrok Heavy, Cursor Ultra, and Cursor Teams Premium subscribers.'
  });
  assert.match(grokBot, /Grok Bot/i);
  assert.equal(grokBot.includes('timers'), false);

  const start = applyHint({
    title: 'Cursor Start: a new plan for developers in India',
    link: 'https://forum.cursor.com/t/cursor-start-a-new-plan-for-developers-in-india/166792',
    summary: 'Today we’re launching Cursor Start, a new subscription plan available in India.'
  });
  assert.match(start, /India regional pricing/i);
  assert.equal(start.includes('timers'), false);

  const composerThoughts = applyHint({
    title: 'Share your Thoughts on Composer 2.5!',
    link: 'https://forum.cursor.com/t/share-your-thoughts-on-composer-2-5/160935',
    summary: 'Composer 2.5 feedback thread for subscribers.'
  });
  assert.match(composerThoughts, /feedback thread/i);
});

test('applyHint for harness changelog includes wake subscriptions and auto-CI-fix', () => {
  const hint = applyHint({
    title: 'Cloud Agents and Cursor Harness Improvements',
    link: 'https://cursor.com/changelog/08-19-26',
    summary: 'Subscriptions let cloud agents wait for GitHub, Slack, or timers.'
  });
  assert.match(hint, /timer|Slack|PR/i);
  assert.match(hint, /auto-CI-fix/i);
  assert.match(hint, /not X/i);
  assert.equal(hint.includes('desktop scraping'), false);
});

test('applyHint for agent overview includes /goal and steering follow-ups', () => {
  const hint = applyHint({
    title: 'Overview',
    link: 'https://cursor.com/docs/agent/overview',
    summary: 'Use /goal for long-lived objectives. Steer a running agent at the next tool call.'
  });
  assert.match(hint, /\/goal/i);
  assert.match(hint, /steer|follow-up/i);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Enable Cloud Agent Builds'), false);
});

test('applyHint for Cloud Agent Builds treats Builds as the default start path', () => {
  const docsHint = applyHint({
    title: 'Cloud Agent Builds',
    link: 'https://cursor.com/docs/cloud-agent/builds',
    summary: 'By default, an agent uses the latest successful active Build for its environment.'
  });
  assert.match(docsHint, /default start path/i);
  assert.match(docsHint, /install/i);
  assert.equal(/enable/i.test(docsHint), false);

  const changelogHint = applyHint({
    title: 'Cloud Agents Start 3x Faster with Builds',
    link: 'https://cursor.com/changelog/08-13-26',
    summary: 'This release introduces builds. Click Enable Builds.'
  });
  assert.match(changelogHint, /default start path/i);
  assert.equal(/enable/i.test(changelogHint), false);

  const setupHint = applyHint({
    title: 'Cloud Environment Setup',
    link: 'https://cursor.com/docs/cloud-agent/setup',
    summary: 'Set up Cloud Agents with environment config, startup commands, and secrets.'
  });
  assert.match(setupHint, /default start path/i);
  assert.match(setupHint, /install/i);
  assert.equal(/enable/i.test(setupHint), false);
  assert.equal(setupHint.includes('timers'), false);
});

test('applyHint for Origin mirror keeps GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Mirror a GitHub repository',
    link: 'https://cursor.com/docs/origin/mirror-github',
    summary: 'Detach from GitHub converts Origin into the source of truth. Bugbot reviews PRs without mirroring.'
  });
  assert.match(hint, /Do not Detach/i);
  assert.match(hint, /GitHub as the source of truth/i);
  assert.match(hint, /Bugbot/i);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Cloud Agent best practices prefers OIDC and repo conventions', () => {
  const hint = applyHint({
    title: 'Cloud Agent Best Practices',
    link: 'https://cursor.com/docs/cloud-agent/best-practices',
    summary: 'Prefer OIDC tokens over long-lived access keys. Use skills and agents.md.'
  });
  assert.match(hint, /OIDC/i);
  assert.match(hint, /AGENTS\.md/i);
  assert.match(hint, /environment\.json/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Rules keeps .mdc, AGENTS.md, and /create-rule', () => {
  const hint = applyHint({
    title: 'Rules',
    link: 'https://cursor.com/docs/rules',
    summary: 'Project rules live in .cursor/rules as .mdc files. Type /create-rule in Agent.'
  });
  assert.match(hint, /\.mdc/i);
  assert.match(hint, /AGENTS\.md/i);
  assert.match(hint, /\/create-rule/i);
  assert.match(hint, /Team dashboard rules are not EOS governance/i);
  assert.equal(hint.includes('Custom Mode'), false);
});

test('applyHint for Cloud Agent identity prefers short-lived OIDC JWTs', () => {
  const hint = applyHint({
    title: 'OIDC tokens',
    link: 'https://cursor.com/docs/cloud-agent/identity',
    summary: 'Mint short-lived JWTs from a Cloud Agent VM and verify them with Cursor OIDC discovery.'
  });
  assert.match(hint, /OIDC/i);
  assert.match(hint, /docs\/cloud-agent\/identity/);
  assert.match(hint, /Cloud Agents API/i);
  assert.match(hint, /unexpected aud/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Cloud Agent metadata treats values as not a credential', () => {
  const hint = applyHint({
    title: 'Agent metadata',
    link: 'https://cursor.com/docs/cloud-agent/metadata',
    summary: 'Read agent, owner, turn, and workspace metadata from a Cloud Agent VM over the local identity socket.'
  });
  assert.match(hint, /not a credential/i);
  assert.match(hint, /OIDC/i);
  assert.match(hint, /Cloud Agents API/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Hooks keeps .cursor/hooks.json for Cloud Agents', () => {
  const hint = applyHint({
    title: 'Hooks',
    link: 'https://cursor.com/docs/hooks',
    summary: 'Cloud agents run command-based hooks from .cursor/hooks.json.'
  });
  assert.match(hint, /\.cursor\/hooks\.json/);
  assert.match(hint, /User-level/i);
  assert.match(hint, /prompt-based/i);
  assert.match(hint, /Tab/);
  assert.match(hint, /sessionStart/);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Secrets & Network prefers Runtime Secrets and allowlists', () => {
  const hint = applyHint({
    title: 'Secrets & Network',
    link: 'https://cursor.com/docs/cloud-agent/security-network',
    summary: 'Security, privacy, and network access configuration for Cloud Agents.'
  });
  assert.match(hint, /Runtime Secrets/);
  assert.match(hint, /OIDC/);
  assert.match(hint, /\[REDACTED\]/);
  assert.match(hint, /allowlist/i);
  assert.match(hint, /\*\.s3/);
  assert.match(hint, /Privacy Mode \(Legacy\)/);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Custom Mode'), false);
});

test('applyHint for Cloud Agent security overview is the model not the config reference', () => {
  const hint = applyHint({
    title: 'Security overview',
    link: 'https://cursor.com/docs/cloud-agent/security',
    summary: 'How Cloud Agents are architected and secured.'
  });
  assert.match(hint, /security model/i);
  assert.match(hint, /never widened/i);
  assert.match(hint, /Runtime Secrets/);
  assert.match(hint, /OIDC/);
  assert.match(hint, /\.cursorignore/);
  assert.match(hint, /draft-PR/i);
  assert.match(hint, /Privacy Mode \(Legacy\)/);
  assert.match(hint, /SOC 2/);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Custom Mode'), false);
});

test('applyHint for MCP keeps .cursor/mcp.json and rejects dashboard governance', () => {
  const hint = applyHint({
    title: 'Model Context Protocol (MCP)',
    link: 'https://cursor.com/docs/mcp',
    summary: 'Connect Cursor to external tools and data sources using MCP.'
  });
  assert.match(hint, /\.cursor\/mcp\.json/);
  assert.match(hint, /User-level/i);
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /API keys/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Plugins keeps repo playbooks and rejects marketplace governance', () => {
  const hint = applyHint({
    title: 'Plugins',
    link: 'https://cursor.com/docs/plugins',
    summary: 'Browse, install, and manage plugins from the Cursor Marketplace.'
  });
  assert.match(hint, /\.cursor\/mcp\.json/);
  assert.match(hint, /~\/\.cursor\/plugins\/local/);
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /Cloud Agent MCP/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint is specific for every forum announcement fixture title', () => {
  const forumXml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/announcements.rss.xml'), 'utf8');
  for (const item of parseFeed(forumXml)) {
    const hint = applyHint(item);
    assert.equal(hint.startsWith('Review this official'), false, item.title);
  }
});

test('ingest fetches changelog and forum announcements independently', async () => {
  const forumXml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/announcements.rss.xml'), 'utf8');
  const calls = [];
  const result = await ingest({
    watchlist: {
      ...validWatchlist,
      feeds: [
        ...validWatchlist.feeds,
        {
          feed_id: 'FEED-CURSOR-FORUM-ANNOUNCEMENTS',
          url: 'https://forum.cursor.com/c/announcements/11.rss',
          kind: 'rss',
          fetchable: true
        }
      ]
    },
    state: { seen_ids: [] },
    fetchImpl: async (url) => {
      calls.push(url);
      if (String(url).includes('forum.cursor.com')) return { ok: true, text: forumXml };
      return { ok: true, text: rssXml };
    }
  });
  assert.deepEqual(calls, [
    'https://cursor.com/changelog/rss.xml',
    'https://forum.cursor.com/c/announcements/11.rss'
  ]);
  assert.equal(result.blocked.length, 0);
  assert.equal(result.items.length, 10);
  assert.equal(result.newItems.length, 10);
  assert.equal(result.items.some((item) => item.feed_id === 'FEED-CURSOR-FORUM-ANNOUNCEMENTS'), true);
});

test('parseCursorBlogIndex extracts official blog cards and skips topic crumbs', () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/blog-index.html'), 'utf8');
  const items = parseCursorBlogIndex(html);
  assert.equal(items.length, 4);
  assert.equal(items[0].id, 'https://cursor.com/blog/joining-spacex');
  assert.equal(items[0].title, 'Cursor is now a part of SpaceX');
  assert.match(items[0].publishedAt, /2026-08-14/);
  assert.equal(items[1].title, 'Introducing Grok 4.6');
  assert.equal(items[2].title, 'Introducing Cursor Start');
  assert.equal(items[3].id, 'https://cursor.com/blog/self-driving-codebases');
  assert.equal(items[3].title, 'self driving codebases');
  assert.equal(parseOfficialSource(html, 'html').length, 4);
  assert.equal(applyHint(items[0]).includes('FUNDACION'), true);
  assert.match(applyHint(items[1]), /Grok/i);
  assert.match(applyHint(items[3]), /research/i);
});

test('ingest fetches the official blog index as HTML', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/blog-index.html'), 'utf8');
  const articleHtml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/blog-article.html'), 'utf8');
  const researchHtml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/blog-self-driving.html'), 'utf8');
  const calls = [];
  const result = await ingest({
    watchlist: {
      ...validWatchlist,
      feeds: [
        {
          feed_id: 'FEED-CURSOR-BLOG-INDEX',
          url: 'https://cursor.com/blog',
          kind: 'html',
          fetchable: true
        }
      ]
    },
    state: { seen_ids: [] },
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === 'https://cursor.com/blog') return { ok: true, text: html };
      if (String(url).includes('self-driving-codebases')) return { ok: true, text: researchHtml };
      return { ok: true, text: articleHtml };
    }
  });
  assert.equal(calls[0], 'https://cursor.com/blog');
  assert.equal(calls.includes('https://cursor.com/blog/joining-spacex'), true);
  assert.equal(calls.includes('https://cursor.com/blog/grok-4-6'), true);
  assert.equal(calls.includes('https://cursor.com/blog/self-driving-codebases'), true);
  assert.equal(calls.includes('https://x.com/cursor_ai'), false);
  assert.equal(result.items.length, 4);
  assert.equal(result.newItems.length, 4);
  const grok = result.items.find((item) => item.link === 'https://cursor.com/blog/grok-4-6');
  assert.match(grok.summary, /long-running agents/i);
  const research = result.items.find((item) => item.link === 'https://cursor.com/blog/self-driving-codebases');
  assert.equal(research.title, 'Towards self-driving codebases');
  assert.match(research.summary, /research harness/i);
  assert.equal(result.learnings.every((row) => row.epistemic_status === 'OBSERVED'), true);
});

test('parseCursorBlogArticle reads official og tags', () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/blog-article.html'), 'utf8');
  const article = parseCursorBlogArticle(html);
  assert.equal(article.title, 'Introducing Grok 4.6');
  assert.match(article.summary, /long-running agents/i);
  assert.match(article.summary, /They're stronger/);
  assert.match(article.publishedAt, /2026-08-12/);
});

test('parseOfficialSource html-page uses the page URL as a stable id', () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-grok-4-6.html'), 'utf8');
  const url = 'https://cursor.com/help/models-and-usage/grok-4-6';
  const items = parseOfficialSource(html, 'html-page', url);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, url);
  assert.equal(items[0].link, url);
  assert.equal(items[0].title, 'Grok 4.6');
  assert.match(items[0].summary, /plans include/i);
  assert.match(applyHint(items[0]), /pool|credit/i);
  assert.equal(applyHint(items[0]).startsWith('Review this official'), false);
});

test('parseOfficialSource html-page decodes docs titles and pricing pools', () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-models-pricing.html'), 'utf8');
  const url = 'https://cursor.com/docs/models-and-pricing';
  const items = parseOfficialSource(html, 'html-page', url);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Models & Pricing');
  assert.match(items[0].summary, /two usage pools/i);
  assert.match(applyHint(items[0]), /Cursor Models vs Other Models/i);
  assert.equal(applyHint(items[0]).includes('EOS budget evidence'), true);
});

test('parseOfficialSource html-page maps Cloud Agent automations, builds, and Origin', () => {
  const automations = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-automations.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/automations'
  );
  assert.equal(automations[0].title, 'Automations');
  assert.match(automations[0].summary, /GitHub, GitLab, Slack/i);
  assert.match(applyHint(automations[0]), /GitHub\/Slack|not X/i);

  const builds = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-builds.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/builds'
  );
  assert.equal(builds[0].title, 'Cloud Agent Builds');
  assert.match(applyHint(builds[0]), /Builds/i);

  const origin = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin'
  );
  assert.equal(origin[0].title, 'Origin');
  assert.match(origin[0].summary, /git forge/i);
  assert.match(applyHint(origin[0]), /Origin|GitHub/i);

  const originCli = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-cli.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/cli'
  );
  assert.equal(originCli[0].id, 'https://cursor.com/docs/origin/cli');
  assert.equal(originCli[0].title, 'Install the Origin CLI');
  assert.match(originCli[0].summary, /single command/i);
  assert.match(applyHint(originCli[0]), /Origin|GitHub/i);
  assert.equal(applyHint(originCli[0]).includes('timers'), false);

  const originIntegrations = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-integrations.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/integrations'
  );
  assert.equal(originIntegrations[0].id, 'https://cursor.com/docs/origin/integrations');
  assert.equal(originIntegrations[0].title, 'Origin integrations');
  assert.match(originIntegrations[0].summary, /Automations and cloud agents/i);
  assert.match(applyHint(originIntegrations[0]), /Origin|GitHub/i);
  assert.equal(applyHint(originIntegrations[0]).includes('timers'), false);
  assert.equal(applyHint(originIntegrations[0]).includes('Vercel'), false);

  const originMirror = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-mirror-github.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/mirror-github'
  );
  assert.equal(originMirror[0].id, 'https://cursor.com/docs/origin/mirror-github');
  assert.equal(originMirror[0].title, 'Mirror a GitHub repository');
  assert.match(originMirror[0].summary, /Sync a GitHub repository/i);
  assert.match(applyHint(originMirror[0]), /Do not Detach/i);
  assert.match(applyHint(originMirror[0]), /source of truth/i);
  assert.equal(applyHint(originMirror[0]).includes('timers'), false);
  assert.equal(/enable/i.test(applyHint(originMirror[0])), false);

  const automationsDocs = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-automations.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/automations'
  );
  assert.equal(automationsDocs[0].id, 'https://cursor.com/docs/cloud-agent/automations');
  assert.equal(automationsDocs[0].title, 'Automations');
  assert.match(automationsDocs[0].summary, /schedule or in response to events/i);
  assert.match(applyHint(automationsDocs[0]), /GitHub\/Slack|not X/i);
  assert.equal(applyHint(automationsDocs[0]).includes('timers'), false);

  const setup = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-setup.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/setup'
  );
  assert.equal(setup[0].id, 'https://cursor.com/docs/cloud-agent/setup');
  assert.equal(setup[0].title, 'Cloud Environment Setup');
  assert.match(setup[0].summary, /environment config/i);
  assert.match(applyHint(setup[0]), /default start path/i);
  assert.equal(applyHint(setup[0]).includes('isolated VMs'), false);

  const bestPractices = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-best-practices.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/best-practices'
  );
  assert.equal(bestPractices[0].id, 'https://cursor.com/docs/cloud-agent/best-practices');
  assert.equal(bestPractices[0].title, 'Cloud Agent Best Practices');
  assert.match(bestPractices[0].summary, /running Cloud Agents/i);
  assert.match(applyHint(bestPractices[0]), /OIDC/i);
  assert.equal(/enable/i.test(applyHint(bestPractices[0])), false);

  const identity = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-identity.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/identity'
  );
  assert.equal(identity[0].id, 'https://cursor.com/docs/cloud-agent/identity');
  assert.equal(identity[0].title, 'OIDC tokens');
  assert.match(identity[0].summary, /short-lived JWTs/i);
  assert.match(applyHint(identity[0]), /OIDC/i);
  assert.match(applyHint(identity[0]), /Cloud Agents API/i);
  assert.equal(/enable/i.test(applyHint(identity[0])), false);

  const metadata = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-metadata.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/metadata'
  );
  assert.equal(metadata[0].id, 'https://cursor.com/docs/cloud-agent/metadata');
  assert.equal(metadata[0].title, 'Agent metadata');
  assert.match(metadata[0].summary, /identity socket/i);
  assert.match(applyHint(metadata[0]), /not a credential/i);
  assert.match(applyHint(metadata[0]), /OIDC/i);
  assert.equal(/enable/i.test(applyHint(metadata[0])), false);

  const hooks = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-hooks.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/hooks'
  );
  assert.equal(hooks[0].id, 'https://cursor.com/docs/hooks');
  assert.equal(hooks[0].title, 'Hooks');
  assert.match(hooks[0].summary, /hooks/i);
  assert.match(applyHint(hooks[0]), /\.cursor\/hooks\.json/);
  assert.equal(applyHint(hooks[0]).includes('Custom Mode'), false);

  const securityNetwork = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-security-network.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/security-network'
  );
  assert.equal(securityNetwork[0].id, 'https://cursor.com/docs/cloud-agent/security-network');
  assert.equal(securityNetwork[0].title, 'Secrets & Network');
  assert.match(securityNetwork[0].summary, /network access/i);
  assert.match(applyHint(securityNetwork[0]), /Runtime Secrets/);
  assert.match(applyHint(securityNetwork[0]), /OIDC/);
  assert.equal(/enable/i.test(applyHint(securityNetwork[0])), false);

  const securityOverview = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-security.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/security'
  );
  assert.equal(securityOverview[0].id, 'https://cursor.com/docs/cloud-agent/security');
  assert.equal(securityOverview[0].title, 'Security overview');
  assert.match(securityOverview[0].summary, /architected and secured/i);
  assert.match(applyHint(securityOverview[0]), /security model/i);
  assert.equal(/enable/i.test(applyHint(securityOverview[0])), false);

  const mcp = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-mcp.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/mcp'
  );
  assert.equal(mcp[0].id, 'https://cursor.com/docs/mcp');
  assert.equal(mcp[0].title, 'Model Context Protocol (MCP)');
  assert.match(mcp[0].summary, /MCP/i);
  assert.match(applyHint(mcp[0]), /\.cursor\/mcp\.json/);
  assert.equal(/enable/i.test(applyHint(mcp[0])), false);

  const plugins = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-plugins.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/plugins'
  );
  assert.equal(plugins[0].id, 'https://cursor.com/docs/plugins');
  assert.equal(plugins[0].title, 'Plugins');
  assert.match(plugins[0].summary, /plugin/i);
  assert.match(applyHint(plugins[0]), /~\/\.cursor\/plugins\/local/);
  assert.equal(/enable/i.test(applyHint(plugins[0])), false);
});

test('parseOfficialSource html-page maps Cursor Router and usage limits', () => {
  const router = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cursor-router.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cursor-router'
  );
  assert.equal(router[0].title, 'Cursor Router');
  assert.match(router[0].summary, /optimization modes/i);
  assert.match(applyHint(router[0]), /Auto mode/i);

  const usage = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-usage-limits.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/models-and-usage/usage-limits'
  );
  assert.equal(usage[0].title, 'Usage and limits');
  assert.match(usage[0].summary, /Spending/i);
  assert.match(applyHint(usage[0]), /included quota/i);
});

test('parseOfficialSource html-page maps Cloud Agents overview and Subagents', () => {
  const overview = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent'
  );
  assert.equal(overview[0].id, 'https://cursor.com/docs/cloud-agent');
  assert.equal(overview[0].title, 'Cloud Agents');
  assert.match(overview[0].summary, /cloud/i);
  assert.match(applyHint(overview[0]), /isolated VMs/i);
  assert.equal(applyHint(overview[0]).includes('timers'), false);
  assert.equal(applyHint(overview[0]).includes('included quota'), false);

  const buildsHint = applyHint({
    title: 'Cloud Agent Builds',
    link: 'https://cursor.com/docs/cloud-agent/builds',
    summary: 'Start Cloud Agents from pre-built, verified development environments.'
  });
  assert.match(buildsHint, /default start path/i);
  assert.equal(/enable/i.test(buildsHint), false);
  assert.equal(buildsHint.includes('isolated VMs'), false);

  const subagents = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-subagents.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/subagents'
  );
  assert.equal(subagents[0].title, 'Subagents');
  assert.match(applyHint(subagents[0]), /isolated subagents/i);
});

test('cursorOfficialMarkdownUrl maps docs/help pages and refuses X', () => {
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/docs/cloud-agent/capabilities'),
    'https://cursor.com/docs/cloud-agent/capabilities.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/models-and-usage/grok-4-6'),
    'https://cursor.com/help/models-and-usage/grok-4-6.md'
  );
  assert.equal(cursorOfficialMarkdownUrl('https://cursor.com/blog'), null);
  assert.equal(cursorOfficialMarkdownUrl('https://x.com/cursor_ai'), null);
});

test('parseOfficialMarkdown summarizes H2 sections from official docs markdown', () => {
  const md = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-capabilities.md'), 'utf8');
  const parsed = parseOfficialMarkdown(md);
  assert.equal(parsed.title, 'Capabilities');
  assert.match(parsed.summary, /Subscriptions/i);
  assert.match(parsed.summary, /GitHub, Slack, Linear, or timer/i);
  assert.match(parsed.summary, /Fixing CI Failures/i);
  assert.match(parsed.summary, /Steer a running agent/i);
  assert.match(parsed.summary, /Slack triggers/i);
  assert.match(parsed.summary, /Agent-driven setup/i);
  assert.match(parsed.summary, /\/goal/);
  assert.match(parsed.summary, /\/automate/);
  assert.equal(parsed.summary.includes('Sitemap'), false);
  assert.equal(parsed.summary.includes('Overview of all docs pages'), false);
  assert.equal(parsed.summary.includes('Search files and folders'), false);

  const originIntegrationsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-integrations.md'), 'utf8')
  );
  assert.equal(originIntegrationsMd.title, 'Integrations');
  assert.match(originIntegrationsMd.summary, /\/automate/);
  assert.match(originIntegrationsMd.summary, /Origin repositor/i);
  assert.equal(originIntegrationsMd.summary.includes('Sitemap'), false);
  assert.equal(originIntegrationsMd.summary.includes('Overview of all docs pages'), false);
  assert.equal(originIntegrationsMd.summary.includes('Create a repository'), false);

  const originMirrorMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-mirror-github.md'), 'utf8')
  );
  assert.equal(originMirrorMd.title, 'Mirror a GitHub repository');
  assert.match(originMirrorMd.summary, /source of truth/i);
  assert.match(originMirrorMd.summary, /Bugbot/i);
  assert.equal(originMirrorMd.summary.includes('Sitemap'), false);
  assert.equal(originMirrorMd.summary.includes('Overview of all docs pages'), false);

  const bestPracticesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-best-practices.md'), 'utf8')
  );
  assert.equal(bestPracticesMd.title, 'Best Practices');
  assert.match(bestPracticesMd.summary, /OIDC/i);
  assert.match(bestPracticesMd.summary, /agents\.md/i);
  assert.match(bestPracticesMd.summary, /Repo rules/i);
  assert.equal(bestPracticesMd.summary.includes('Sitemap'), false);
  assert.equal(bestPracticesMd.summary.includes('Overview of all docs pages'), false);

  const rulesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-rules.md'), 'utf8')
  );
  assert.equal(rulesMd.title, 'Rules');
  assert.match(rulesMd.summary, /\.mdc/);
  assert.match(rulesMd.summary, /\.cursor\/rules/);
  assert.match(rulesMd.summary, /Creating a rule/i);
  assert.match(rulesMd.summary, /\/create-rule/);
  assert.match(rulesMd.summary, /AGENTS\.md/i);
  assert.equal(rulesMd.summary.includes('Sitemap'), false);
  assert.equal(rulesMd.summary.includes('frontend components'), false);
  assert.equal(rulesMd.summary.includes('Why isn'), false);
  assert.equal(rulesMd.summary.includes('Code Style'), false);

  const identityMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-identity.md'), 'utf8')
  );
  assert.equal(identityMd.title, 'OIDC tokens');
  assert.match(identityMd.summary, /OIDC/i);
  assert.match(identityMd.summary, /JWKS/i);
  assert.match(identityMd.summary, /Cloud Agents API/i);
  assert.match(identityMd.summary, /When claims appear/i);
  assert.match(identityMd.summary, /agent calls the local socket/i);
  assert.equal(/How it works — 1\./.test(identityMd.summary), false);
  assert.equal(identityMd.summary.includes('Sitemap'), false);
  assert.equal(identityMd.summary.includes('Related pages'), false);

  const metadataMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-metadata.md'), 'utf8')
  );
  assert.equal(metadataMd.title, 'Agent metadata');
  assert.match(metadataMd.summary, /Cloud Agents API/i);
  assert.match(metadataMd.summary, /OIDC/i);
  assert.match(metadataMd.summary, /When keys appear/i);
  assert.match(metadataMd.summary, /credential/i);
  assert.equal(metadataMd.summary.includes('Sitemap'), false);
  assert.equal(metadataMd.summary.includes('Related pages'), false);
  assert.equal(metadataMd.summary.includes('curl the socket'), false);

  const hooksMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-hooks.md'), 'utf8')
  );
  assert.equal(hooksMd.title, 'Hooks');
  assert.match(hooksMd.summary, /\.cursor\/hooks\.json/);
  assert.match(hooksMd.summary, /Cloud agent support/i);
  assert.match(hooksMd.summary, /command-based/i);
  assert.match(hooksMd.summary, /Cloud agents load hooks from these sources/);
  assert.equal(hooksMd.summary.includes('Sitemap'), false);
  assert.equal(hooksMd.summary.includes('audit.sh'), false);
  assert.equal(hooksMd.summary.includes('home directory'), false);
  assert.equal(hooksMd.summary.includes('ecosystem partners'), false);
  assert.equal(hooksMd.summary.includes('hooks partners'), false);
  assert.equal(/Configuration —/.test(hooksMd.summary), false);
  assert.equal(/Hook categories —/.test(hooksMd.summary), false);
  assert.equal(/Secrets management —/.test(hooksMd.summary), false);

  const securityNetworkMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-security-network.md'), 'utf8')
  );
  assert.equal(securityNetworkMd.title, 'Secrets & Network');
  assert.match(securityNetworkMd.summary, /Runtime secrets/i);
  assert.match(securityNetworkMd.summary, /\[REDACTED\]/);
  assert.match(securityNetworkMd.summary, /OIDC/);
  assert.match(securityNetworkMd.summary, /Artifact uploads/i);
  assert.match(securityNetworkMd.summary, /\*\.s3/);
  assert.equal(securityNetworkMd.summary.includes('Sitemap'), false);
  assert.equal(securityNetworkMd.summary.includes('GitHub app'), false);
  assert.equal(securityNetworkMd.summary.includes('home directory'), false);
  assert.equal(securityNetworkMd.summary.includes('ips.json'), false);
  assert.equal(/What you should know —/.test(securityNetworkMd.summary), false);
  assert.equal(/Egress IP ranges —/.test(securityNetworkMd.summary), false);

  const securityOverviewMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-security.md'), 'utf8')
  );
  assert.equal(securityOverviewMd.title, 'Security overview');
  assert.match(securityOverviewMd.summary, /never widened/i);
  assert.match(securityOverviewMd.summary, /Privacy Mode/i);
  assert.match(securityOverviewMd.summary, /\.cursorignore/);
  assert.match(securityOverviewMd.summary, /Runtime Secrets/i);
  assert.equal(securityOverviewMd.summary.includes('Sitemap'), false);
  assert.equal(securityOverviewMd.summary.includes('SOC 2'), false);
  assert.equal(securityOverviewMd.summary.includes('Trust Center'), false);
  assert.equal(/How Cloud Agents work —/.test(securityOverviewMd.summary), false);
  assert.equal(/Encryption —/.test(securityOverviewMd.summary), false);
  assert.equal(/Data deletion —/.test(securityOverviewMd.summary), false);
  assert.equal(/Related pages —/.test(securityOverviewMd.summary), false);

  const mcpMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-mcp.md'), 'utf8')
  );
  assert.equal(mcpMd.title, 'Model Context Protocol (MCP)');
  assert.match(mcpMd.summary, /\.cursor\/mcp\.json/);
  assert.match(mcpMd.summary, /~\/\.cursor\/mcp\.json/);
  assert.match(mcpMd.summary, /Cloud Agents/i);
  assert.match(mcpMd.summary, /Project Configuration/i);
  assert.equal(mcpMd.summary.includes('Sitemap'), false);
  assert.equal(mcpMd.summary.includes('Marketplace'), false);
  assert.equal(mcpMd.summary.includes('API_KEY'), false);
  assert.equal(/Using MCP in chat —/.test(mcpMd.summary), false);
  assert.equal(/One-click installation —/.test(mcpMd.summary), false);

  const pluginsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-plugins.md'), 'utf8')
  );
  assert.equal(pluginsMd.title, 'Plugins');
  assert.match(pluginsMd.summary, /plugin\.json/);
  assert.match(pluginsMd.summary, /\.cursor-plugin\/plugin\.json/);
  assert.match(pluginsMd.summary, /Cloud Agents/i);
  assert.match(pluginsMd.summary, /Default team marketplace/i);
  assert.equal(pluginsMd.summary.includes('Sitemap'), false);
  assert.equal(pluginsMd.summary.includes('Hex Canvas'), false);
  assert.equal(pluginsMd.summary.includes('cursor.com/marketplace'), false);
  assert.equal(/Installing plugins —/.test(pluginsMd.summary), false);
  assert.equal(/Test plugins locally —/.test(pluginsMd.summary), false);
  assert.equal(/How does SCIM work —/.test(pluginsMd.summary), false);
  assert.equal(/Migrate existing Team MCPs —/.test(pluginsMd.summary), false);
});

test('parseOfficialMarkdown does not inject Cloud Agents extra from later body text', () => {
  const parsed = parseOfficialMarkdown([
    '# Setup',
    '',
    'Agents run in isolated VMs.',
    '',
    '## What is a cloud agent environment?',
    '',
    'The development environment for a cloud agent is similar to the setup on your laptop.',
    '',
    'Cloud Agents also support MCP.',
  ].join('\n'));
  assert.match(parsed.summary, /laptop/);
  assert.equal(parsed.summary.includes(' Cloud Agents'), false);
});

test('parseOfficialSource html-page maps Cloud Agent capabilities without collapsing overview', () => {
  const capabilities = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-capabilities.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/capabilities'
  );
  assert.equal(capabilities[0].id, 'https://cursor.com/docs/cloud-agent/capabilities');
  assert.equal(capabilities[0].title, 'Capabilities');
  assert.match(capabilities[0].summary, /subscriptions/i);
  assert.match(applyHint(capabilities[0]), /subscriptions|auto-CI-fix/i);
  assert.equal(applyHint(capabilities[0]).includes('isolated VMs'), false);
  assert.equal(applyHint(capabilities[0]).includes('desktop scraping'), false);

  const overviewHint = applyHint({
    title: 'Cloud Agents',
    link: 'https://cursor.com/docs/cloud-agent',
    summary: 'Run Agent in the cloud for continuous coding assistance.'
  });
  assert.match(overviewHint, /isolated VMs/i);
  assert.equal(overviewHint.includes('auto-CI-fix'), false);
});

test('parseOfficialSource html-page maps agent overview /goal and Agent Skills', () => {
  const overview = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-overview.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/overview'
  );
  assert.equal(overview[0].id, 'https://cursor.com/docs/agent/overview');
  assert.equal(overview[0].title, 'Overview');
  assert.match(applyHint(overview[0]), /\/goal/i);
  assert.match(applyHint(overview[0]), /steer|follow-up/i);
  assert.equal(applyHint(overview[0]).includes('timers'), false);

  const skills = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-skills.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/skills'
  );
  assert.equal(skills[0].title, 'Agent Skills');
  assert.match(applyHint(skills[0]), /Custom Mode/i);
  assert.equal(applyHint(skills[0]).includes('timers'), false);

  const prompting = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-prompting.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/prompting'
  );
  assert.equal(prompting[0].id, 'https://cursor.com/docs/agent/prompting');
  assert.equal(prompting[0].title, 'Prompting agents');
  assert.match(prompting[0].summary, /Custom Mode/i);
  assert.match(applyHint(prompting[0]), /Custom Mode/i);
  assert.equal(applyHint(prompting[0]).includes('timers'), false);
  assert.equal(applyHint(prompting[0]).includes('context usage'), false);

  const rules = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-rules.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/rules'
  );
  assert.equal(rules[0].id, 'https://cursor.com/docs/rules');
  assert.equal(rules[0].title, 'Rules');
  assert.match(rules[0].summary, /AGENTS\.md/i);
  assert.match(applyHint(rules[0]), /\.mdc/);
  assert.match(applyHint(rules[0]), /\/create-rule/);
  assert.equal(applyHint(rules[0]).includes('Custom Mode'), false);
});

test('ingest fetches official docs/help html-page feeds once and not x.com', async () => {
  const grokHtml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-grok-4-6.html'), 'utf8');
  const pricingHtml = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-models-pricing.html'), 'utf8');
  const calls = [];
  const watchlist = {
    ...validWatchlist,
    feeds: [
      {
        feed_id: 'FEED-CURSOR-DOCS-GROK-46',
        url: 'https://cursor.com/help/models-and-usage/grok-4-6',
        kind: 'html-page',
        fetchable: true
      },
      {
        feed_id: 'FEED-CURSOR-DOCS-MODELS-PRICING',
        url: 'https://cursor.com/docs/models-and-pricing',
        kind: 'html-page',
        fetchable: true
      }
    ]
  };
  const result = await ingest({
    watchlist,
    state: { seen_ids: [] },
    fetchImpl: async (url) => {
      calls.push(url);
      if (String(url).includes('grok-4-6')) return { ok: true, text: grokHtml };
      return { ok: true, text: pricingHtml };
    }
  });
  assert.deepEqual(calls, [
    'https://cursor.com/help/models-and-usage/grok-4-6',
    'https://cursor.com/help/models-and-usage/grok-4-6.md',
    'https://cursor.com/docs/models-and-pricing',
    'https://cursor.com/docs/models-and-pricing.md'
  ]);
  assert.equal(result.blocked.length, 0);
  assert.equal(result.items.length, 2);
  assert.equal(result.newItems.length, 2);
  assert.equal(result.items[0].id, 'https://cursor.com/help/models-and-usage/grok-4-6');
  assert.equal(calls.includes('https://x.com/cursor_ai'), false);
  const again = await ingest({
    watchlist,
    state: result.nextState,
    fetchImpl: async (url) => {
      calls.push(url);
      if (String(url).includes('grok-4-6')) return { ok: true, text: grokHtml };
      return { ok: true, text: pricingHtml };
    }
  });
  assert.equal(again.newItems.length, 0);
  assert.equal(again.items.length, 2);
});

test('ingest enriches html-page summaries from official markdown and keeps the HTML URL id', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-capabilities.html'), 'utf8');
  const md = fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-capabilities.md'), 'utf8');
  const calls = [];
  const result = await ingest({
    watchlist: {
      ...validWatchlist,
      feeds: [{
        feed_id: 'FEED-CURSOR-DOCS-CLOUD-AGENT-CAPABILITIES',
        url: 'https://cursor.com/docs/cloud-agent/capabilities',
        kind: 'html-page',
        fetchable: true
      }]
    },
    state: { seen_ids: [] },
    fetchImpl: async (url) => {
      calls.push(url);
      if (String(url).endsWith('.md')) return { ok: true, text: md };
      return { ok: true, text: html };
    }
  });
  assert.deepEqual(calls, [
    'https://cursor.com/docs/cloud-agent/capabilities',
    'https://cursor.com/docs/cloud-agent/capabilities.md'
  ]);
  assert.equal(result.items[0].id, 'https://cursor.com/docs/cloud-agent/capabilities');
  assert.equal(result.items[0].title, 'Capabilities');
  assert.match(result.items[0].summary, /Subscriptions/i);
  assert.match(result.items[0].summary, /Fixing CI Failures/i);
  assert.equal(result.learnings[0].x_timeline_verified, false);
  assert.match(result.learnings[0].apply_in_eos, /subscriptions|auto-CI-fix/i);
});

test('selectCurrentLearnings prefers changelog product news over customer stories', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'IMDEX uses Cursor',
      source_url: 'https://cursor.com/blog/imdex',
      published_at: '2026-08-25T12:00:00.000Z',
      apply_in_eos: 'Official Cursor blog post. Adopt only tooling we already run; customer/press stories are not EOS evidence.'
    },
    {
      title: 'Share your Thoughts on Grok 4.6',
      source_url: 'https://forum.cursor.com/t/share-your-thoughts-on-grok-4-6/168190',
      published_at: '2026-08-12T17:37:00.000Z',
      apply_in_eos: 'Vendor feedback thread. Do not treat forum sentiment as EOS evidence.'
    },
    {
      title: 'Origin Code Hosting',
      source_url: 'https://forum.cursor.com/t/origin-code-hosting/168670',
      published_at: 'Mon, 17 Aug 2026 17:42:08 +0000',
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
    },
    {
      title: 'Origin Code Hosting',
      source_url: 'https://cursor.com/changelog/origin-code-hosting',
      published_at: 'Mon, 17 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
    },
    {
      title: 'Introducing Grok 4.6',
      source_url: 'https://cursor.com/blog/grok-4-6',
      published_at: '2026-08-12T00:00:00.000Z',
      apply_in_eos: 'Grok model availability is vendor catalog news. EOS still evidence-gates quality claims.'
    },
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    }
  ], 4);
  assert.equal(selected[0].source_url, 'https://cursor.com/changelog/08-19-26');
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/origin-code-hosting'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://forum.cursor.com/t/origin-code-hosting/168670'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/blog/grok-4-6'), true);
  assert.equal(selected.at(-1).source_url, 'https://cursor.com/blog/imdex');
});

test('selectCurrentLearnings clusters Grok 4.6 onto official docs/help', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Grok 4.6 is now Live!',
      source_url: 'https://forum.cursor.com/t/grok-4-6-is-now-live/168189',
      published_at: '2026-08-12T17:37:00.000Z',
      apply_in_eos: 'Grok model availability is vendor catalog news. EOS still evidence-gates quality claims.'
    },
    {
      title: 'Introducing Grok 4.6',
      source_url: 'https://cursor.com/blog/grok-4-6',
      published_at: '2026-08-12T00:00:00.000Z',
      apply_in_eos: 'Grok model availability is vendor catalog news. EOS still evidence-gates quality claims.'
    },
    {
      title: 'Grok 4.6',
      source_url: 'https://cursor.com/help/models-and-usage/grok-4-6',
      published_at: null,
      apply_in_eos: 'Honor Auto vs Composer pool and Grok 4.6 included-credit treatment from official help. Do not treat vendor quality claims as EOS evidence.'
    },
    {
      title: 'Introducing Grok Bot',
      source_url: 'https://forum.cursor.com/t/introducing-grok-bot/168053',
      published_at: '2026-08-12T16:00:00.000Z',
      apply_in_eos: 'Grok Bot is a separate vendor product. This Cloud Agent watch stays on changelog + forum announcements, not Grok Bot.'
    },
    {
      title: 'Models & Pricing',
      source_url: 'https://cursor.com/docs/models-and-pricing',
      published_at: null,
      apply_in_eos: 'Honor included Cursor Models vs Other Models pools. Do not treat vendor rates as EOS budget evidence.'
    },
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    }
  ], 4);
  assert.equal(selected[0].source_url, 'https://cursor.com/changelog/08-19-26');
  assert.equal(selected.filter((row) => /grok 4\.6/i.test(row.title)).length, 1);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/grok-4-6'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/blog/grok-4-6'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://forum.cursor.com/t/grok-4-6-is-now-live/168189'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://forum.cursor.com/t/introducing-grok-bot/168053'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/models-and-pricing'), true);
});

test('selectCurrentLearnings clusters automations, builds, and Origin onto changelog', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Automations',
      source_url: 'https://cursor.com/help/ai-features/automations',
      published_at: null,
      apply_in_eos: 'Automations trigger on GitHub/Slack, not X. This daily changelog timer already covers ingest.'
    },
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    },
    {
      title: 'Cloud Agent Builds',
      source_url: 'https://cursor.com/docs/cloud-agent/builds',
      published_at: null,
      apply_in_eos: 'Enable Cloud Agent Builds so ingest and other agents boot from a ready environment.'
    },
    {
      title: 'Cloud Agents Start 3x Faster with Builds',
      source_url: 'https://cursor.com/changelog/08-13-26',
      published_at: 'Thu, 13 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Enable Cloud Agent Builds so ingest and other agents boot from a ready environment.'
    },
    {
      title: 'Origin',
      source_url: 'https://cursor.com/docs/origin',
      published_at: null,
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
    },
    {
      title: 'Origin Code Hosting',
      source_url: 'https://cursor.com/changelog/origin-code-hosting',
      published_at: 'Mon, 17 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
    },
    {
      title: 'Install the Origin CLI',
      source_url: 'https://cursor.com/docs/origin/cli',
      published_at: null,
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
    },
    {
      title: 'Origin integrations',
      source_url: 'https://cursor.com/docs/origin/integrations',
      published_at: null,
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
    },
    {
      title: 'Mirror a GitHub repository',
      source_url: 'https://cursor.com/docs/origin/mirror-github',
      published_at: null,
      apply_in_eos: 'Keep GitHub as the source of truth for this synced repo. Do not Detach from GitHub. Origin is an optional mirror; Bugbot and Cursor Review do not require it.'
    },
    {
      title: 'Usage and limits',
      source_url: 'https://cursor.com/help/models-and-usage/usage-limits',
      published_at: null,
      apply_in_eos: 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.'
    }
  ], 5);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-19-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/automations'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-13-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/builds'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/origin-code-hosting'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/cli'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/integrations'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/mirror-github'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings clusters Cursor Router onto changelog', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'How Cursor Router chooses the right model for the task',
      source_url: 'https://cursor.com/blog/how-cursor-router-works',
      published_at: '2026-08-06T12:00:00.000Z',
      apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
    },
    {
      title: 'Cursor Router',
      source_url: 'https://cursor.com/docs/cursor-router',
      published_at: null,
      apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
    },
    {
      title: 'Cursor Router',
      source_url: 'https://cursor.com/changelog/router',
      published_at: 'Wed, 22 Jul 2026 00:00:00 GMT',
      apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
    },
    {
      title: 'Usage and limits',
      source_url: 'https://cursor.com/help/models-and-usage/usage-limits',
      published_at: null,
      apply_in_eos: 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.'
    }
  ], 3);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/router'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/blog/how-cursor-router-works'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cursor-router'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings clusters Subagents onto harness changelog and keeps Cloud Agents overview off Builds', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    },
    {
      title: 'Subagents',
      source_url: 'https://cursor.com/docs/subagents',
      published_at: null,
      apply_in_eos: 'Run isolated subagents on their own VMs when work must not collide with the parent branch.'
    },
    {
      title: 'Cloud Agents',
      source_url: 'https://cursor.com/docs/cloud-agent',
      published_at: null,
      apply_in_eos: 'Cloud Agents run on isolated VMs. Use environment.json + Builds; keep this watch on official feeds, not X.'
    },
    {
      title: 'Capabilities',
      source_url: 'https://cursor.com/docs/cloud-agent/capabilities',
      published_at: null,
      apply_in_eos: 'Honor Cloud Agent subscriptions (GitHub PR, Slack, timers) and auto-CI-fix on PRs this agent opens. Do not scrape X.'
    },
    {
      title: 'Cloud Agent Builds',
      source_url: 'https://cursor.com/docs/cloud-agent/builds',
      published_at: null,
      apply_in_eos: 'Enable Cloud Agent Builds so ingest and other agents boot from a ready environment.'
    },
    {
      title: 'Cloud Agents Start 3x Faster with Builds',
      source_url: 'https://cursor.com/changelog/08-13-26',
      published_at: 'Thu, 13 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Enable Cloud Agent Builds so ingest and other agents boot from a ready environment.'
    },
    {
      title: 'Usage and limits',
      source_url: 'https://cursor.com/help/models-and-usage/usage-limits',
      published_at: null,
      apply_in_eos: 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.'
    }
  ], 6);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-19-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/subagents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-13-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/builds'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/capabilities'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings keeps /goal overview and skills off the harness changelog row', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    },
    {
      title: 'Overview',
      source_url: 'https://cursor.com/docs/agent/overview',
      published_at: null,
      apply_in_eos: 'Keep long-lived EOS objectives in /goal instead of one-shot prompts.'
    },
    {
      title: 'Agent Skills',
      source_url: 'https://cursor.com/docs/skills',
      published_at: null,
      apply_in_eos: 'Pin an EOS skill as a Custom Mode when a session must stay on one playbook.'
    },
    {
      title: 'Usage and limits',
      source_url: 'https://cursor.com/help/models-and-usage/usage-limits',
      published_at: null,
      apply_in_eos: 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.'
    }
  ], 6);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-19-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/overview'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/skills'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings clusters prompting Custom Modes onto skills and keeps usage limits', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    },
    {
      title: 'Prompting agents',
      source_url: 'https://cursor.com/docs/agent/prompting',
      published_at: null,
      apply_in_eos: 'Pin an EOS skill as a Custom Mode when a session must stay on one playbook.'
    },
    {
      title: 'Rules',
      source_url: 'https://cursor.com/docs/rules',
      published_at: null,
      apply_in_eos: 'Commit EOS conventions as .cursor/rules/*.mdc (plain .md is ignored). Use AGENTS.md for simple instructions. Prefer /create-rule over dumping style guides. Team dashboard rules are not EOS governance.'
    },
    {
      title: 'Model Context Protocol (MCP)',
      source_url: 'https://cursor.com/docs/mcp',
      published_at: null,
      apply_in_eos: 'Commit project MCP servers as .cursor/mcp.json. User-level ~/.cursor/mcp.json is local IDE config, not this Cloud Agent environment. Team dashboard MCP can reach Cloud Agents but is not EOS governance. Do not put API keys in git.'
    },
    {
      title: 'Plugins',
      source_url: 'https://cursor.com/docs/plugins',
      published_at: null,
      apply_in_eos: 'Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Team marketplace plugins and ~/.cursor/plugins/local are not EOS governance and are not this Cloud Agent environment. Do not delete a team marketplace without reviewing Cloud Agent MCP impact.'
    },
    {
      title: 'Agent Skills',
      source_url: 'https://cursor.com/docs/skills',
      published_at: null,
      apply_in_eos: 'Pin an EOS skill as a Custom Mode when a session must stay on one playbook.'
    },
    {
      title: 'Overview',
      source_url: 'https://cursor.com/docs/agent/overview',
      published_at: null,
      apply_in_eos: 'Keep long-lived EOS objectives in /goal. Steer running agents with follow-ups that wait for the next tool call.'
    },
    {
      title: 'Usage and limits',
      source_url: 'https://cursor.com/help/models-and-usage/usage-limits',
      published_at: null,
      apply_in_eos: 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.'
    }
  ], 6);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/skills'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/prompting'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/rules'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/mcp'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/plugins'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/overview'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings clusters automations docs onto harness and setup onto Builds', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    },
    {
      title: 'Automations',
      source_url: 'https://cursor.com/docs/cloud-agent/automations',
      published_at: null,
      apply_in_eos: 'Automations trigger on GitHub/Slack, not X. This daily changelog timer already covers ingest.'
    },
    {
      title: 'Hooks',
      source_url: 'https://cursor.com/docs/hooks',
      published_at: null,
      apply_in_eos: 'Commit command-based hooks as .cursor/hooks.json at the repo root so Cloud Agents pick them up.'
    },
    {
      title: 'Cloud Environment Setup',
      source_url: 'https://cursor.com/docs/cloud-agent/setup',
      published_at: null,
      apply_in_eos: 'Treat Cloud Agent Builds as the default start path. Keep install idempotent in environment.json; use start for live services.'
    },
    {
      title: 'Cloud Agents Start 3x Faster with Builds',
      source_url: 'https://cursor.com/changelog/08-13-26',
      published_at: 'Thu, 13 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Treat Cloud Agent Builds as the default start path. Keep install idempotent in environment.json; use start for live services.'
    },
    {
      title: 'Cloud Agent Best Practices',
      source_url: 'https://cursor.com/docs/cloud-agent/best-practices',
      published_at: null,
      apply_in_eos: 'Honor Cloud Agent setup (environment.json + Builds). Prefer OIDC over long-lived secrets. Use skills, AGENTS.md, and .cursor/rules for repo conventions. Do not put secrets in git.'
    },
    {
      title: 'OIDC tokens',
      source_url: 'https://cursor.com/docs/cloud-agent/identity',
      published_at: null,
      apply_in_eos: 'Prefer short-lived OIDC JWTs minted in the Cloud Agent VM over long-lived secrets. Point agents at docs/cloud-agent/identity. Do not treat this socket as the Cloud Agents API. Verifiers must reject unexpected aud.'
    },
    {
      title: 'Agent metadata',
      source_url: 'https://cursor.com/docs/cloud-agent/metadata',
      published_at: null,
      apply_in_eos: 'Read Cloud Agent run metadata from the VM socket; it is not a credential. Use OIDC JWTs when something outside the VM must verify identity. Do not confuse this with SDK/Cloud Agents API metadata tags.'
    },
    {
      title: 'Secrets & Network',
      source_url: 'https://cursor.com/docs/cloud-agent/security-network',
      published_at: null,
      apply_in_eos: 'Prefer Runtime Secrets or short-lived OIDC over long-lived keys in git. Treat [REDACTED] in transcripts as expected, not a missing secret. Honor Cloud Agent network allowlists; do not open *.s3 wildcards. Privacy Mode (Legacy) is not supported for Cloud Agents.'
    },
    {
      title: 'Security overview',
      source_url: 'https://cursor.com/docs/cloud-agent/security',
      published_at: null,
      apply_in_eos: 'Treat this page as the Cloud Agent security model, not the config reference. Honor isolated VMs, access that is never widened past the triggering user, Runtime Secrets/OIDC, network allowlists, .cursorignore, and draft-PR handoff. Privacy Mode (Legacy) is not supported. Do not treat SOC 2 or Trust Center claims as EOS evidence.'
    },
    {
      title: 'Usage and limits',
      source_url: 'https://cursor.com/help/models-and-usage/usage-limits',
      published_at: null,
      apply_in_eos: 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.'
    }
  ], 6);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-19-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/automations'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/hooks'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-13-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/setup'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/best-practices'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/identity'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/metadata'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/security-network'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/security'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings does not drop changelog rows for reserved docs', () => {
  const rows = [];
  for (let i = 0; i < 8; i += 1) {
    rows.push({
      title: `Blog ${i}`,
      source_url: `https://cursor.com/blog/post-${i}`,
      published_at: `2026-08-${String(20 - i).padStart(2, '0')}T00:00:00.000Z`,
      apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
    });
  }
  rows.push({
    title: 'Cursor Router',
    source_url: 'https://cursor.com/changelog/router',
    published_at: '2026-08-06T00:00:00.000Z',
    apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
  });
  rows.push({
    title: 'Models & Pricing',
    source_url: 'https://cursor.com/docs/models-and-pricing',
    published_at: null,
    apply_in_eos: 'Honor included Cursor Models vs Other Models pools. Do not treat vendor rates as EOS budget evidence.'
  });
  rows.push({
    title: 'Usage and limits',
    source_url: 'https://cursor.com/help/models-and-usage/usage-limits',
    published_at: null,
    apply_in_eos: 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.'
  });
  const selected = selectCurrentLearnings(rows, 10);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/router'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/models-and-pricing'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings keeps undated official docs/help pages in CURRENT', () => {
  const dated = [];
  for (let i = 0; i < 12; i += 1) {
    dated.push({
      title: `Changelog ${i}`,
      source_url: `https://cursor.com/changelog/item-${i}`,
      published_at: `2026-08-${String(26 - i).padStart(2, '0')}T00:00:00.000Z`,
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    });
  }
  dated.push({
    title: 'Models & Pricing',
    source_url: 'https://cursor.com/docs/models-and-pricing',
    published_at: null,
    apply_in_eos: 'Honor included Cursor Models vs Other Models pools. Do not treat vendor rates as EOS budget evidence.'
  });
  const selected = selectCurrentLearnings(dated, 10);
  assert.equal(selected[0].source_url, 'https://cursor.com/changelog/item-0');
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/models-and-pricing'), true);
  assert.equal(selected.length, 10);
});

test('repo CURRENT.md leads with product actions, not customer stories', () => {
  const current = fs.readFileSync(path.join(__dirname, '../docs/intelligence/x-watch/CURRENT.md'), 'utf8');
  assert.match(current, /## Official product actions/);
  const section = current.split('## Official product actions')[1] || '';
  const first = section.split('\n').find((line) => line.startsWith('- **'));
  assert.ok(first);
  assert.equal(first.includes('IMDEX'), false);
  assert.equal(first.includes('customer/press'), false);
  assert.match(current, /cursor.com\/help\/models-and-usage\/grok-4-6/);
  assert.match(current, /cursor.com\/docs\/models-and-pricing/);
  assert.match(current, /cursor.com\/changelog\/router/);
  assert.match(current, /cursor.com\/help\/models-and-usage\/usage-limits/);
  assert.match(current, /cursor.com\/docs\/cloud-agent(?!\/)/);
  assert.match(current, /cursor.com\/docs\/agent\/overview/);
  assert.match(current, /cursor.com\/docs\/skills/);
  assert.equal(current.includes('cursor.com/docs/agent/prompting'), false);
  assert.equal(current.includes('cursor.com/docs/rules'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/automations'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/setup'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/best-practices'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/identity'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/metadata'), false);
  assert.equal(current.includes('cursor.com/docs/hooks'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/security-network'), false);
  assert.equal(/cursor\.com\/docs\/cloud-agent\/security(?!-network)/.test(current), false);
  assert.equal(current.includes('cursor.com/docs/mcp'), false);
  assert.equal(current.includes('cursor.com/docs/plugins'), false);
  assert.match(current, /cursor.com\/changelog\/08-19-26/);
  assert.match(current, /default start path/);
  assert.equal(current.includes('Enable Cloud Agent Builds'), false);
  assert.match(current, /Steer running agents/);
  assert.match(current, /2090136960295645431/);
  assert.match(current, /2090136964116721902/);
  assert.match(current, /2089399059488350447/);
  assert.match(current, /2089399061040308603/);
  assert.match(current, /2087941309013397970/);
  assert.match(current, /2087941310217064850/);
  assert.equal(current.includes('cursor.com/docs/origin/cli'), false);
  assert.equal(current.includes('cursor.com/docs/origin/integrations'), false);
  assert.equal(current.includes('cursor.com/docs/origin/mirror-github'), false);
});

test('cited X posts never claim an X fetch', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/intelligence/x-watch/CITED_X_POSTS.json'), 'utf8'));
  const result = validateCitedXPosts(doc);
  assert.equal(result.valid, true);
  assert.equal(doc.citations.every((row) => row.fetched_from_x === false), true);
  const official = doc.citations.map((row) => row.official_source);
  assert.equal(official.includes('https://cursor.com/changelog/origin-code-hosting'), true);
  assert.equal(official.includes('https://cursor.com/changelog/08-13-26'), true);
  assert.equal(
    doc.citations.some((row) => row.x_url === 'https://x.com/cursor_ai/status/2088249881718919393' && row.official_source === 'https://cursor.com/blog/joining-spacex'),
    true
  );
  assert.equal(
    doc.citations.some((row) => row.x_url === 'https://x.com/cursor_ai/status/2084317547608911986' && row.fetched_from_x === false),
    true
  );
  assert.equal(
    doc.citations.some((row) => (
      row.x_url === 'https://x.com/cursor_ai/status/2090136960295645431'
      && row.cited_by === 'https://www.unrollnow.com/status/2090136956101414982'
      && /Custom Mode/i.test(row.about)
      && row.fetched_from_x === false
    )),
    true
  );
  assert.equal(
    doc.citations.some((row) => (
      row.x_url === 'https://x.com/cursor_ai/status/2090136964116721902'
      && row.cited_by === 'https://www.unrollnow.com/status/2090136956101414982'
      && /Steer/i.test(row.about)
      && row.fetched_from_x === false
    )),
    true
  );
  assert.equal(
    doc.citations.some((row) => (
      row.x_url === 'https://x.com/cursor_ai/status/2089399059488350447'
      && row.cited_by === 'https://www.unrollnow.com/status/2089399057659596847'
      && /Vercel/i.test(row.about)
      && row.fetched_from_x === false
    )),
    true
  );
  assert.equal(
    doc.citations.some((row) => (
      row.x_url === 'https://x.com/cursor_ai/status/2089399061040308603'
      && row.cited_by === 'https://www.unrollnow.com/status/2089399057659596847'
      && /beta/i.test(row.about)
      && row.fetched_from_x === false
    )),
    true
  );
  assert.equal(
    doc.citations.some((row) => (
      row.x_url === 'https://x.com/cursor_ai/status/2087941309013397970'
      && row.cited_by === 'https://www.unrollnow.com/status/2087941307624980753'
      && /resilient/i.test(row.about)
      && row.fetched_from_x === false
    )),
    true
  );
  assert.equal(
    doc.citations.some((row) => (
      row.x_url === 'https://x.com/cursor_ai/status/2087941310217064850'
      && row.cited_by === 'https://www.unrollnow.com/status/2087941307624980753'
      && /Faire/i.test(row.about)
      && /vendor marketing/i.test(row.eos_note || '')
      && row.fetched_from_x === false
    )),
    true
  );
  assert.equal(
    validateCitedXPosts({
      citations: [{
        x_url: 'https://x.com/cursor_ai/status/1',
        cited_by: 'https://x.com/cursor_ai',
        fetched_from_x: false,
        epistemic_status: 'CITED_NOT_FETCHED'
      }]
    }).valid,
    false
  );
});

test('writeIngestArtifacts skips timestamp-only no-op ingests', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'x-watch-noop-'));
  try {
    const item = {
      id: 'https://cursor.com/changelog/origin-code-hosting',
      title: 'Origin Code Hosting',
      link: 'https://cursor.com/changelog/origin-code-hosting',
      publishedAt: 'Mon, 17 Aug 2026 00:00:00 GMT',
      summary: 'Cursor can now host your code.'
    };
    const first = writeIngestArtifacts(root, {
      items: [item],
      newItems: [item],
      nextState: {
        seen_ids: [item.id],
        last_ingest_at: '2026-08-26T00:00:00.000Z',
        last_item_count: 1,
        last_new_item_count: 1
      },
      briefingMarkdown: '# briefing\n'
    }, new Date('2026-08-26T00:00:00.000Z'));
    assert.equal(first.artifactsWritten, true);
    const statePath = path.join(root, 'docs/intelligence/x-watch/STATE.json');
    const learningsPath = path.join(root, 'docs/intelligence/x-watch/LEARNINGS.json');
    const currentPath = path.join(root, 'docs/intelligence/x-watch/CURRENT.md');
    const stateBefore = fs.readFileSync(statePath, 'utf8');
    const learningsBefore = fs.readFileSync(learningsPath, 'utf8');
    const currentBefore = fs.readFileSync(currentPath, 'utf8');
    const second = writeIngestArtifacts(root, {
      items: [item],
      newItems: [],
      nextState: {
        seen_ids: [item.id],
        last_ingest_at: '2026-08-27T00:00:00.000Z',
        last_item_count: 1,
        last_new_item_count: 0
      },
      briefingMarkdown: '# briefing\n'
    }, new Date('2026-08-27T00:00:00.000Z'));
    assert.equal(second.artifactsWritten, false);
    assert.equal(second.learningsAdded, 0);
    assert.equal(fs.readFileSync(statePath, 'utf8'), stateBefore);
    assert.equal(fs.readFileSync(learningsPath, 'utf8'), learningsBefore);
    assert.equal(fs.readFileSync(currentPath, 'utf8'), currentBefore);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writeIngestArtifacts writes when a living page summary gets richer', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'x-watch-richer-'));
  try {
    const shortItem = {
      id: 'https://cursor.com/docs/skills',
      title: 'Agent Skills',
      link: 'https://cursor.com/docs/skills',
      publishedAt: '',
      summary: 'Skills'
    };
    writeIngestArtifacts(root, {
      items: [shortItem],
      newItems: [shortItem],
      nextState: {
        seen_ids: [shortItem.id],
        last_ingest_at: '2026-08-26T00:00:00.000Z',
        last_item_count: 1,
        last_new_item_count: 1
      },
      briefingMarkdown: '# briefing\n'
    }, new Date('2026-08-26T00:00:00.000Z'));
    const richer = {
      ...shortItem,
      summary: 'Extend AI agents with specialized capabilities using Agent Skills, an open standard for packaging reusable knowledge and scripts.'
    };
    const second = writeIngestArtifacts(root, {
      items: [richer],
      newItems: [],
      nextState: {
        seen_ids: [shortItem.id],
        last_ingest_at: '2026-08-27T00:00:00.000Z',
        last_item_count: 1,
        last_new_item_count: 0
      },
      briefingMarkdown: '# briefing\n'
    }, new Date('2026-08-27T00:00:00.000Z'));
    assert.equal(second.artifactsWritten, true);
    const store = JSON.parse(fs.readFileSync(path.join(root, 'docs/intelligence/x-watch/LEARNINGS.json'), 'utf8'));
    assert.match(store.learnings[0].summary, /open standard/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
