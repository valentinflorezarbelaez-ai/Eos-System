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
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/models-and-usage/grok-4-5' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/agent' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/ask-mode' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/plan-mode' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/tab' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/inline-edit' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/cloud-agents' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/background-agents' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/mobile-app' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/shared-transcripts' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/bugbot' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/rules' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/skills' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/mcp' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/context' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/ignore-files' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/plugins' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/multi-agent' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/side-chats' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/conversation-search' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/grok-bot' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/ai-pair-programming' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/get-started/quickstart' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/getting-started/install' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/getting-started/first-project' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/getting-started/build-ai-coding-agent' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/security-and-privacy/privacy' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/security-and-privacy/regions' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/security-and-privacy/sso' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/security-and-privacy/account-compromised' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/security-and-privacy/marketplace-security' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/agent-issues' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/tab-issues' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/install-issues' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/network' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/extensions' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/performance' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/reporting-bugs' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/integrations/git' && feed.kind === 'html-page'),
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
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/create-repository' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/pull-requests' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/browse' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/settings' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/codebase-settings' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/overview' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/using' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/shell-mode' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/acp' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/headless' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/sdk/typescript' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/sdk/python' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/sdk/bridge' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/pricing' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/members' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/pricing' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/models-and-usage/available-models' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/models-and-usage/cursor-router' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/models-and-usage/api-keys'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/terminal'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/browser'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/debug-mode'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/max-mode'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/keyboard-shortcuts'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/themes'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/customization/extensions'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/coding-agents'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/agentic-coding'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/ai-features/vibe-coding'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/reference/ignore-file'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/bugbot-usage-based-billing'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/models-and-usage/token-rate'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/grok-bot/get-started'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/grok-bot/work'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/grok-bot/teams'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/grok-bot/plans'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/learn/working-with-agents'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/blog/typescript-sdk'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/dashboard'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/dashboard/billing'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://trust.cursor.com/subprocessors'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/security-and-privacy/compliance'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/reference/plugins'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/marketplace'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/tab-issues'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/extensions'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/install-issues'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/reporting-bugs'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/integrations/git'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/network'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/troubleshooting/performance'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/enterprise/network-configuration'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/enterprise/endpoint-security'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/enterprise/privacy-and-data-governance'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/getting-started/migrate-vscode'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/getting-started/migrate-jetbrains'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/downloads'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/download'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/learn/understanding-your-codebase'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/billing'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/teams-management'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/overages'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/cancel'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/cursor-start'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/regions'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/payment-not-applied'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/pricing'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/dashboard'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/analytics'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/setup'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/sso'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/account-and-billing/teams-setup'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/admin-api'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/account/teams/analytics-api'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/enterprise'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://github.com/cursor/sdk-bridge'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/sdk/changelog'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://github.com/cursor/cookbook'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/installation'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/reference/permissions'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/changelog'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cli/github-actions'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/origin/git'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/integrations/cursor-blame'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/integrations/github-gitlab'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/integrations/cli'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/help/integrations/third-party'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/api/origin'),
    false
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
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/settings' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/private-connectivity' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/bugbot' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/security-agents' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/approval-agents' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/mobile' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/cloud-agent/api/endpoints' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/agents-window' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/agent-review' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/plan-mode' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/debug-mode' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/design-mode' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/tools/browser' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/tools/terminal' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/tools/search' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/tools/canvas' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/configuration/worktrees' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/security' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/agent/security/run-modes'),
    false
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/mcp' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/plugins' && feed.kind === 'html-page'),
    true
  );
  assert.equal(
    watchlist.feeds.some((feed) => feed.url === 'https://cursor.com/docs/customize-cursor' && feed.kind === 'html-page'),
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
  const originCreateRepo = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/create-repository');
  assert.ok(originCreateRepo);
  assert.match(originCreateRepo.summary, /Create in the UI/);
  assert.match(originCreateRepo.summary, /Sync from GitHub/);
  assert.match(originCreateRepo.summary, /Create with a Cursor agent/);
  assert.equal(originCreateRepo.summary.includes('Sitemap'), false);
  assert.equal(/Push your first commit —/.test(originCreateRepo.summary), false);
  assert.equal(originCreateRepo.summary.includes('origin.cursor.com'), false);
  assert.match(originCreateRepo.apply_in_eos, /optional paid git hosting/i);
  assert.match(originCreateRepo.apply_in_eos, /GitHub remains source of truth/i);
  assert.match(originCreateRepo.apply_in_eos, /Do not create an Origin repo/i);
  assert.match(originCreateRepo.apply_in_eos, /Cloud Agent VM already has its GitHub checkout/i);
  assert.match(originCreateRepo.apply_in_eos, /environment\.json/);
  assert.match(originCreateRepo.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(originCreateRepo.apply_in_eos), false);
  assert.equal(originCreateRepo.apply_in_eos.includes('Custom Mode'), false);
  const originPullRequests = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/pull-requests');
  assert.ok(originPullRequests);
  assert.match(originPullRequests.summary, /Pull request list/);
  assert.match(originPullRequests.summary, /Open a pull request/);
  assert.match(originPullRequests.summary, /Pull request page/);
  assert.match(originPullRequests.summary, /Mirrored GitHub/);
  assert.equal(originPullRequests.summary.includes('Sitemap'), false);
  assert.equal(originPullRequests.summary.includes('origin.cursor.com'), false);
  assert.match(originPullRequests.apply_in_eos, /optional Origin hosting/i);
  assert.match(originPullRequests.apply_in_eos, /GitHub remains source of truth/i);
  assert.match(originPullRequests.apply_in_eos, /Do not open Origin PRs/i);
  assert.match(originPullRequests.apply_in_eos, /Cloud Agent VM already opens GitHub PRs/i);
  assert.match(originPullRequests.apply_in_eos, /environment\.json/);
  assert.match(originPullRequests.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(originPullRequests.apply_in_eos), false);
  assert.equal(originPullRequests.apply_in_eos.includes('Custom Mode'), false);
  const originBrowse = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/browse');
  assert.ok(originBrowse);
  assert.match(originBrowse.summary, /Folders and files/);
  assert.match(originBrowse.summary, /Search/);
  assert.match(originBrowse.summary, /Branch history and commits/);
  assert.match(originBrowse.summary, /Go to file/);
  assert.equal(originBrowse.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(originBrowse.summary), false);
  assert.equal(originBrowse.summary.includes('origin.cursor.com'), false);
  assert.match(originBrowse.apply_in_eos, /optional Origin hosting/i);
  assert.match(originBrowse.apply_in_eos, /GitHub remains source of truth/i);
  assert.match(originBrowse.apply_in_eos, /Do not use Origin browse/i);
  assert.match(originBrowse.apply_in_eos, /Cloud Agent VM already searches its GitHub checkout/i);
  assert.match(originBrowse.apply_in_eos, /environment\.json/);
  assert.match(originBrowse.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(originBrowse.apply_in_eos), false);
  assert.equal(originBrowse.apply_in_eos.includes('Custom Mode'), false);
  const originSettings = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/settings');
  assert.ok(originSettings);
  assert.equal(originSettings.title, 'Settings');
  assert.match(originSettings.summary, /Sync status/);
  assert.match(originSettings.summary, /Detach from GitHub/);
  assert.match(originSettings.summary, /Permissions/);
  assert.match(originSettings.summary, /Rules and Protections/);
  assert.equal(originSettings.summary.includes('Sitemap'), false);
  assert.equal(originSettings.summary.includes('origin.cursor.com'), false);
  assert.match(originSettings.apply_in_eos, /optional Origin hosting/i);
  assert.match(originSettings.apply_in_eos, /GitHub remains source of truth/i);
  assert.match(originSettings.apply_in_eos, /Do not Detach/i);
  assert.match(originSettings.apply_in_eos, /Origin Apps/i);
  assert.match(originSettings.apply_in_eos, /Cloud Agent VM already uses its GitHub checkout/i);
  assert.match(originSettings.apply_in_eos, /environment\.json/);
  assert.match(originSettings.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(originSettings.apply_in_eos), false);
  assert.equal(originSettings.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(originSettings.apply_in_eos.includes('Vercel'), false);
  const originCodebaseSettings = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/codebase-settings');
  assert.ok(originCodebaseSettings);
  assert.equal(originCodebaseSettings.title, 'Codebase settings');
  assert.match(originCodebaseSettings.summary, /Permissions/);
  assert.match(originCodebaseSettings.summary, /Apps/);
  assert.equal(originCodebaseSettings.summary.includes('Sitemap'), false);
  assert.equal(originCodebaseSettings.summary.includes('origin.cursor.com'), false);
  assert.match(originCodebaseSettings.apply_in_eos, /optional team-level Origin hosting/i);
  assert.match(originCodebaseSettings.apply_in_eos, /GitHub remains source of truth/i);
  assert.match(originCodebaseSettings.apply_in_eos, /claim a codebase name/i);
  assert.match(originCodebaseSettings.apply_in_eos, /Origin Apps/i);
  assert.match(originCodebaseSettings.apply_in_eos, /Origin API tokens/i);
  assert.match(originCodebaseSettings.apply_in_eos, /Cloud Agent VM already uses its GitHub checkout/i);
  assert.match(originCodebaseSettings.apply_in_eos, /environment\.json/);
  assert.match(originCodebaseSettings.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(originCodebaseSettings.apply_in_eos), false);
  assert.equal(originCodebaseSettings.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(originCodebaseSettings.apply_in_eos.includes('Vercel'), false);
  const cursorCli = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/overview');
  assert.ok(cursorCli);
  assert.equal(cursorCli.title, 'Cursor CLI');
  assert.match(cursorCli.summary, /Interactive mode/);
  assert.match(cursorCli.summary, /Modes/);
  assert.match(cursorCli.summary, /Non-interactive mode/);
  assert.match(cursorCli.summary, /Cloud Agent handoff/);
  assert.match(cursorCli.summary, /Sessions/);
  assert.match(cursorCli.summary, /Sandbox controls/);
  assert.equal(cursorCli.summary.includes('Sitemap'), false);
  assert.equal(cursorCli.summary.includes('cursor.com/install'), false);
  assert.match(cursorCli.apply_in_eos, /optional local terminal agent/i);
  assert.match(cursorCli.apply_in_eos, /without the local agent CLI/i);
  assert.match(cursorCli.apply_in_eos, /Do not install Cursor CLI/i);
  assert.match(cursorCli.apply_in_eos, /print mode/i);
  assert.match(cursorCli.apply_in_eos, /Cloud Agent handoff/i);
  assert.match(cursorCli.apply_in_eos, /\/goal/);
  assert.match(cursorCli.apply_in_eos, /environment\.json/);
  assert.match(cursorCli.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(cursorCli.apply_in_eos), false);
  assert.equal(cursorCli.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(cursorCli.apply_in_eos.includes('Vercel'), false);
  assert.equal(cursorCli.apply_in_eos.includes('curl'), false);
  const cursorCliUsing = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/using');
  assert.ok(cursorCliUsing);
  assert.equal(cursorCliUsing.title, 'Using Agent in CLI');
  assert.match(cursorCliUsing.summary, /Modes/);
  assert.match(cursorCliUsing.summary, /Prompting/);
  assert.match(cursorCliUsing.summary, /MCP/);
  assert.match(cursorCliUsing.summary, /ACP/);
  assert.match(cursorCliUsing.summary, /Rules/);
  assert.match(cursorCliUsing.summary, /Cloud Agent handoff/);
  assert.match(cursorCliUsing.summary, /CLI worktrees/);
  assert.equal(cursorCliUsing.summary.includes('Sitemap'), false);
  assert.equal(cursorCliUsing.summary.includes('cursor.com/install'), false);
  assert.match(cursorCliUsing.apply_in_eos, /optional local terminal agent/i);
  assert.match(cursorCliUsing.apply_in_eos, /without the local agent CLI/i);
  assert.match(cursorCliUsing.apply_in_eos, /print mode/i);
  assert.match(cursorCliUsing.apply_in_eos, /worktrees/i);
  assert.match(cursorCliUsing.apply_in_eos, /ACP/i);
  assert.match(cursorCliUsing.apply_in_eos, /Cloud Agent handoff/i);
  assert.match(cursorCliUsing.apply_in_eos, /\/goal/);
  assert.match(cursorCliUsing.apply_in_eos, /environment\.json/);
  assert.match(cursorCliUsing.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(cursorCliUsing.apply_in_eos), false);
  assert.equal(cursorCliUsing.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(cursorCliUsing.apply_in_eos.includes('Vercel'), false);
  assert.equal(cursorCliUsing.apply_in_eos.includes('curl'), false);
  const cursorCliShellMode = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/shell-mode');
  assert.ok(cursorCliShellMode);
  assert.equal(cursorCliShellMode.title, 'Shell Mode');
  assert.match(cursorCliShellMode.summary, /Command execution/);
  assert.match(cursorCliShellMode.summary, /Output/);
  assert.match(cursorCliShellMode.summary, /Limitations/);
  assert.match(cursorCliShellMode.summary, /Permissions/);
  assert.match(cursorCliShellMode.summary, /Usage guidelines/);
  assert.equal(cursorCliShellMode.summary.includes('Sitemap'), false);
  assert.equal(/Troubleshooting —/.test(cursorCliShellMode.summary), false);
  assert.equal(/FAQ —/.test(cursorCliShellMode.summary), false);
  assert.equal(cursorCliShellMode.summary.includes('cursor.com/install'), false);
  assert.match(cursorCliShellMode.apply_in_eos, /optional local Cursor CLI/i);
  assert.match(cursorCliShellMode.apply_in_eos, /already runs shell commands/i);
  assert.match(cursorCliShellMode.apply_in_eos, /Do not rotate this watch into Cursor CLI Shell Mode/i);
  assert.match(cursorCliShellMode.apply_in_eos, /\/goal/);
  assert.match(cursorCliShellMode.apply_in_eos, /environment\.json/);
  assert.match(cursorCliShellMode.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(cursorCliShellMode.apply_in_eos), false);
  assert.equal(cursorCliShellMode.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(cursorCliShellMode.apply_in_eos.includes('Vercel'), false);
  assert.equal(cursorCliShellMode.apply_in_eos.includes('curl'), false);
  const cursorCliAcp = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/acp');
  assert.ok(cursorCliAcp);
  assert.equal(cursorCliAcp.title, 'ACP');
  assert.match(cursorCliAcp.summary, /Overview/);
  assert.match(cursorCliAcp.summary, /Start ACP server/);
  assert.match(cursorCliAcp.summary, /Transport and message format/);
  assert.match(cursorCliAcp.summary, /Request flow/);
  assert.match(cursorCliAcp.summary, /Authentication/);
  assert.match(cursorCliAcp.summary, /Cursor extension methods/);
  assert.match(cursorCliAcp.summary, /Minimal Node.js client/);
  assert.match(cursorCliAcp.summary, /IDE integrations/);
  assert.equal(cursorCliAcp.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(cursorCliAcp.summary), false);
  assert.equal(cursorCliAcp.summary.includes('cursor.com/install'), false);
  assert.match(cursorCliAcp.apply_in_eos, /optional local Cursor CLI protocol/i);
  assert.match(cursorCliAcp.apply_in_eos, /without an ACP client/i);
  assert.match(cursorCliAcp.apply_in_eos, /Do not rotate this watch into agent acp/i);
  assert.match(cursorCliAcp.apply_in_eos, /IDE integrations/i);
  assert.match(cursorCliAcp.apply_in_eos, /\/goal/);
  assert.match(cursorCliAcp.apply_in_eos, /environment\.json/);
  assert.match(cursorCliAcp.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(cursorCliAcp.apply_in_eos), false);
  assert.equal(cursorCliAcp.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(cursorCliAcp.apply_in_eos.includes('Vercel'), false);
  assert.equal(cursorCliAcp.apply_in_eos.includes('curl'), false);
  const cursorCliHeadless = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/headless');
  assert.ok(cursorCliHeadless);
  assert.equal(cursorCliHeadless.title, 'Using Headless CLI');
  assert.match(cursorCliHeadless.summary, /How it works/);
  assert.match(cursorCliHeadless.summary, /Example scripts/);
  assert.match(cursorCliHeadless.summary, /Working with images/);
  assert.equal(/Setup —/.test(cursorCliHeadless.summary), false);
  assert.equal(cursorCliHeadless.summary.includes('Sitemap'), false);
  assert.equal(cursorCliHeadless.summary.includes('cursor.com/install'), false);
  assert.equal(cursorCliHeadless.summary.toLowerCase().includes('curl'), false);
  assert.match(cursorCliHeadless.apply_in_eos, /optional local Cursor CLI for scripts/i);
  assert.match(cursorCliHeadless.apply_in_eos, /without print mode/i);
  assert.match(cursorCliHeadless.apply_in_eos, /Do not rotate this watch into print mode/i);
  assert.match(cursorCliHeadless.apply_in_eos, /--force/);
  assert.match(cursorCliHeadless.apply_in_eos, /Do not put CURSOR_API_KEY in git/);
  assert.match(cursorCliHeadless.apply_in_eos, /\/goal/);
  assert.match(cursorCliHeadless.apply_in_eos, /environment\.json/);
  assert.match(cursorCliHeadless.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(cursorCliHeadless.apply_in_eos), false);
  assert.equal(cursorCliHeadless.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(cursorCliHeadless.apply_in_eos.includes('Vercel'), false);
  assert.equal(cursorCliHeadless.apply_in_eos.includes('curl'), false);
  const sdkTypescript = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/sdk/typescript');
  assert.ok(sdkTypescript);
  assert.equal(sdkTypescript.title, 'Cursor TypeScript SDK');
  assert.match(sdkTypescript.summary, /Overview/);
  assert.match(sdkTypescript.summary, /Authentication/);
  assert.match(sdkTypescript.summary, /Usage and billing/);
  assert.match(sdkTypescript.summary, /Installation/);
  assert.match(sdkTypescript.summary, /Quick start/);
  assert.match(sdkTypescript.summary, /Creating agents/);
  assert.equal(sdkTypescript.summary.includes('Sitemap'), false);
  assert.equal(/MCP servers —/.test(sdkTypescript.summary), false);
  assert.equal(sdkTypescript.summary.toLowerCase().includes('npm install'), false);
  assert.equal(sdkTypescript.summary.toLowerCase().includes('curl'), false);
  assert.match(sdkTypescript.apply_in_eos, /optional agent scripting/i);
  assert.match(sdkTypescript.apply_in_eos, /official feeds/i);
  assert.match(sdkTypescript.apply_in_eos, /@cursor\/sdk/);
  assert.match(sdkTypescript.apply_in_eos, /api\.cursor\.com/);
  assert.match(sdkTypescript.apply_in_eos, /Do not install @cursor\/sdk/i);
  assert.match(sdkTypescript.apply_in_eos, /SDK scripts/i);
  assert.match(sdkTypescript.apply_in_eos, /Do not put CURSOR_API_KEY in git/);
  assert.match(sdkTypescript.apply_in_eos, /GitHub/);
  assert.match(sdkTypescript.apply_in_eos, /environment\.json/);
  assert.match(sdkTypescript.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(sdkTypescript.apply_in_eos), false);
  assert.equal(sdkTypescript.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(sdkTypescript.apply_in_eos.includes('Vercel'), false);
  assert.equal(sdkTypescript.apply_in_eos.includes('curl'), false);
  const sdkPython = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/sdk/python');
  assert.ok(sdkPython);
  assert.equal(sdkPython.title, 'Cursor Python SDK');
  assert.match(sdkPython.summary, /Overview/);
  assert.match(sdkPython.summary, /Authentication/);
  assert.match(sdkPython.summary, /Usage and billing/);
  assert.match(sdkPython.summary, /Installation/);
  assert.match(sdkPython.summary, /Quick start/);
  assert.match(sdkPython.summary, /Async usage/);
  assert.match(sdkPython.summary, /Creating agents/);
  assert.equal(sdkPython.summary.includes('Sitemap'), false);
  assert.equal(/MCP servers —/.test(sdkPython.summary), false);
  assert.equal(/Troubleshooting —/.test(sdkPython.summary), false);
  assert.equal(sdkPython.summary.toLowerCase().includes('pip install'), false);
  assert.equal(sdkPython.summary.toLowerCase().includes('curl'), false);
  assert.match(sdkPython.apply_in_eos, /optional agent scripting/i);
  assert.match(sdkPython.apply_in_eos, /official feeds/i);
  assert.match(sdkPython.apply_in_eos, /cursor-sdk/);
  assert.match(sdkPython.apply_in_eos, /api\.cursor\.com/);
  assert.match(sdkPython.apply_in_eos, /Do not install cursor-sdk/i);
  assert.match(sdkPython.apply_in_eos, /SDK scripts/i);
  assert.match(sdkPython.apply_in_eos, /Do not put CURSOR_API_KEY in git/);
  assert.match(sdkPython.apply_in_eos, /GitHub/);
  assert.match(sdkPython.apply_in_eos, /environment\.json/);
  assert.match(sdkPython.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(sdkPython.apply_in_eos), false);
  assert.equal(sdkPython.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(sdkPython.apply_in_eos.includes('Vercel'), false);
  assert.equal(sdkPython.apply_in_eos.includes('curl'), false);
  const sdkBridge = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/sdk/bridge');
  assert.ok(sdkBridge);
  assert.equal(sdkBridge.title, 'Cursor SDK Bridge');
  assert.match(sdkBridge.summary, /When to use it/);
  assert.match(sdkBridge.summary, /How it works/);
  assert.match(sdkBridge.summary, /Adapter shape/);
  assert.match(sdkBridge.summary, /Protocol/);
  assert.match(sdkBridge.summary, /Authentication/);
  assert.match(sdkBridge.summary, /Versioning/);
  assert.match(sdkBridge.summary, /Support/);
  assert.equal(sdkBridge.summary.includes('Sitemap'), false);
  assert.equal(/Get started —/.test(sdkBridge.summary), false);
  assert.equal(/Related —/.test(sdkBridge.summary), false);
  assert.equal(sdkBridge.summary.toLowerCase().includes('pip install'), false);
  assert.equal(sdkBridge.summary.toLowerCase().includes('curl'), false);
  assert.match(sdkBridge.apply_in_eos, /optional local protocol/i);
  assert.match(sdkBridge.apply_in_eos, /without a first-party SDK/i);
  assert.match(sdkBridge.apply_in_eos, /official feeds/i);
  assert.match(sdkBridge.apply_in_eos, /cursor-sdk-bridge/);
  assert.match(sdkBridge.apply_in_eos, /api\.cursor\.com/);
  assert.match(sdkBridge.apply_in_eos, /Do not install the SDK Bridge/i);
  assert.match(sdkBridge.apply_in_eos, /adapter scripts/i);
  assert.match(sdkBridge.apply_in_eos, /Do not put CURSOR_API_KEY in git/);
  assert.match(sdkBridge.apply_in_eos, /GitHub/);
  assert.match(sdkBridge.apply_in_eos, /environment\.json/);
  assert.match(sdkBridge.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(sdkBridge.apply_in_eos), false);
  assert.equal(sdkBridge.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(sdkBridge.apply_in_eos.includes('Vercel'), false);
  assert.equal(sdkBridge.apply_in_eos.includes('curl'), false);
  const teamPricing = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/account/teams/pricing');
  assert.ok(teamPricing);
  assert.equal(teamPricing.title, 'Team Pricing');
  assert.match(teamPricing.summary, /How pricing works/);
  assert.match(teamPricing.summary, /Active seats/);
  assert.match(teamPricing.summary, /Spending controls/);
  assert.match(teamPricing.summary, /Model Pricing/);
  assert.equal(teamPricing.summary.includes('Sitemap'), false);
  assert.equal(/Get started —/.test(teamPricing.summary), false);
  assert.equal(teamPricing.summary.toLowerCase().includes('curl'), false);
  assert.match(teamPricing.apply_in_eos, /vendor Teams and Enterprise billing/i);
  assert.match(teamPricing.apply_in_eos, /included quota/i);
  assert.match(teamPricing.apply_in_eos, /on-demand/i);
  assert.match(teamPricing.apply_in_eos, /vendor team seat prices/i);
  assert.match(teamPricing.apply_in_eos, /EOS budget evidence/i);
  assert.match(teamPricing.apply_in_eos, /not a Teams admin dashboard/i);
  assert.match(teamPricing.apply_in_eos, /environment\.json/);
  assert.equal(/enable/i.test(teamPricing.apply_in_eos), false);
  assert.equal(teamPricing.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(teamPricing.apply_in_eos.includes('Vercel'), false);
  assert.equal(teamPricing.apply_in_eos.includes('Slack'), false);
  assert.equal(teamPricing.apply_in_eos.includes('curl'), false);
  const teamMembers = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/account/teams/members');
  assert.ok(teamMembers);
  assert.equal(teamMembers.title, 'Members, Roles, and Seat Types');
  assert.match(teamMembers.summary, /Roles/);
  assert.match(teamMembers.summary, /Seat Types/);
  assert.match(teamMembers.summary, /Usage Controls/);
  assert.equal(teamMembers.summary.includes('Sitemap'), false);
  assert.equal(/Managing members —/.test(teamMembers.summary), false);
  assert.equal(/Domain settings —/.test(teamMembers.summary), false);
  assert.equal(/Security & SSO —/.test(teamMembers.summary), false);
  assert.equal(/Role Comparison —/.test(teamMembers.summary), false);
  assert.equal(/Billing —/.test(teamMembers.summary), false);
  assert.equal(teamMembers.summary.toLowerCase().includes('curl'), false);
  assert.match(teamMembers.apply_in_eos, /vendor Teams admin config/i);
  assert.match(teamMembers.apply_in_eos, /roles, and seat types/i);
  assert.match(teamMembers.apply_in_eos, /included quota/i);
  assert.match(teamMembers.apply_in_eos, /on-demand/i);
  assert.match(teamMembers.apply_in_eos, /not a Teams admin dashboard/i);
  assert.match(teamMembers.apply_in_eos, /Teams setup or SSO pages/i);
  assert.match(teamMembers.apply_in_eos, /environment\.json/);
  assert.equal(/enable/i.test(teamMembers.apply_in_eos), false);
  assert.equal(teamMembers.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(teamMembers.apply_in_eos.includes('Vercel'), false);
  assert.equal(teamMembers.apply_in_eos.includes('Slack'), false);
  assert.equal(teamMembers.apply_in_eos.includes('curl'), false);
  const helpPricing = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/account-and-billing/pricing');
  assert.ok(helpPricing);
  assert.equal(helpPricing.title, 'Pricing and plans');
  assert.match(helpPricing.summary, /What plans are available/);
  assert.match(helpPricing.summary, /What is Auto/);
  assert.match(helpPricing.summary, /Is Cursor Router available on my plan/);
  assert.match(helpPricing.summary, /Cost mode/);
  assert.match(helpPricing.summary, /Hobby plan/);
  assert.equal(helpPricing.summary.includes('Sitemap'), false);
  assert.equal(/How do I upgrade my plan —/.test(helpPricing.summary), false);
  assert.equal(/How do I downgrade my plan —/.test(helpPricing.summary), false);
  assert.equal(/Where do I manage my subscription —/.test(helpPricing.summary), false);
  assert.equal(/What if I move from an individual plan to a Teams plan —/.test(helpPricing.summary), false);
  assert.equal(/Can I switch between monthly and yearly billing —/.test(helpPricing.summary), false);
  assert.equal(/Related —/.test(helpPricing.summary), false);
  assert.equal(helpPricing.summary.toLowerCase().includes('stripe'), false);
  assert.equal(helpPricing.summary.toLowerCase().includes('curl'), false);
  assert.match(helpPricing.apply_in_eos, /vendor individual and Teams plan names/i);
  assert.match(helpPricing.apply_in_eos, /included quota/i);
  assert.match(helpPricing.apply_in_eos, /on-demand/i);
  assert.match(helpPricing.apply_in_eos, /vendor plan prices/i);
  assert.match(helpPricing.apply_in_eos, /EOS budget evidence/i);
  assert.match(helpPricing.apply_in_eos, /Do not change this Cloud Agent billing from the dashboard/i);
  assert.match(helpPricing.apply_in_eos, /environment\.json/);
  assert.equal(/enable/i.test(helpPricing.apply_in_eos), false);
  assert.equal(helpPricing.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpPricing.apply_in_eos.includes('Vercel'), false);
  assert.equal(helpPricing.apply_in_eos.includes('Slack'), false);
  assert.equal(helpPricing.apply_in_eos.includes('curl'), false);
  const helpAvailableModels = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/models-and-usage/available-models');
  assert.ok(helpAvailableModels);
  assert.equal(helpAvailableModels.title, 'Available models');
  assert.match(helpAvailableModels.summary, /Which models are available/);
  assert.match(helpAvailableModels.summary, /Which model should I use/);
  assert.match(helpAvailableModels.summary, /Cursor Router/);
  assert.match(helpAvailableModels.summary, /How much does Auto cost/);
  assert.equal(helpAvailableModels.summary.includes('Sitemap'), false);
  assert.equal(/How do I switch models —/.test(helpAvailableModels.summary), false);
  assert.equal(/Related —/.test(helpAvailableModels.summary), false);
  assert.equal(helpAvailableModels.summary.toLowerCase().includes('curl'), false);
  assert.match(helpAvailableModels.apply_in_eos, /vendor model names and Auto routing/i);
  assert.match(helpAvailableModels.apply_in_eos, /included quota/i);
  assert.match(helpAvailableModels.apply_in_eos, /on-demand/i);
  assert.match(helpAvailableModels.apply_in_eos, /vendor model rates/i);
  assert.match(helpAvailableModels.apply_in_eos, /EOS budget evidence/i);
  assert.match(helpAvailableModels.apply_in_eos, /Do not put API keys in git/i);
  assert.match(helpAvailableModels.apply_in_eos, /@cursor\/sdk/);
  assert.match(helpAvailableModels.apply_in_eos, /environment\.json/);
  assert.equal(/enable/i.test(helpAvailableModels.apply_in_eos), false);
  assert.equal(helpAvailableModels.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpAvailableModels.apply_in_eos.includes('Vercel'), false);
  assert.equal(helpAvailableModels.apply_in_eos.includes('Slack'), false);
  assert.equal(helpAvailableModels.apply_in_eos.includes('curl'), false);
  const helpCursorRouter = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/models-and-usage/cursor-router');
  assert.ok(helpCursorRouter);
  assert.equal(helpCursorRouter.title, 'Cursor Router');
  assert.match(helpCursorRouter.summary, /What is Cursor Router/);
  assert.match(helpCursorRouter.summary, /How does Cursor Router decide/);
  assert.match(helpCursorRouter.summary, /Cost, Balance, and Intelligence/);
  assert.match(helpCursorRouter.summary, /Can I use Cursor Router from the SDK/);
  assert.equal(helpCursorRouter.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpCursorRouter.summary), false);
  assert.equal(helpCursorRouter.summary.toLowerCase().includes('curl'), false);
  assert.match(helpCursorRouter.apply_in_eos, /vendor Auto routing/i);
  assert.match(helpCursorRouter.apply_in_eos, /Cost, Balance, and Intelligence/i);
  assert.match(helpCursorRouter.apply_in_eos, /EOS rules still bind/i);
  assert.match(helpCursorRouter.apply_in_eos, /included quota/i);
  assert.match(helpCursorRouter.apply_in_eos, /on-demand/i);
  assert.match(helpCursorRouter.apply_in_eos, /@cursor\/sdk/);
  assert.match(helpCursorRouter.apply_in_eos, /Do not put API keys in git/i);
  assert.match(helpCursorRouter.apply_in_eos, /environment\.json/);
  assert.equal(/enable/i.test(helpCursorRouter.apply_in_eos), false);
  assert.equal(helpCursorRouter.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpCursorRouter.apply_in_eos.includes('Vercel'), false);
  assert.equal(helpCursorRouter.apply_in_eos.includes('Slack'), false);
  assert.equal(helpCursorRouter.apply_in_eos.includes('curl'), false);
  const helpGrok45 = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/models-and-usage/grok-4-5');
  assert.ok(helpGrok45);
  assert.equal(helpGrok45.title, 'Grok 4.5');
  assert.match(helpGrok45.summary, /What is Grok 4.5/);
  assert.match(helpGrok45.summary, /effort levels/);
  assert.match(helpGrok45.summary, /When should I choose Grok 4.5 over Composer/);
  assert.match(helpGrok45.summary, /Which plans include Grok 4.5/);
  assert.equal(helpGrok45.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGrok45.summary), false);
  assert.match(helpGrok45.apply_in_eos, /prior vendor Cursor Model/i);
  assert.match(helpGrok45.apply_in_eos, /Auto vs Composer pool/i);
  assert.match(helpGrok45.apply_in_eos, /included-credit treatment/i);
  assert.match(helpGrok45.apply_in_eos, /vendor quality claims/i);
  assert.match(helpGrok45.apply_in_eos, /included quota/i);
  assert.match(helpGrok45.apply_in_eos, /on-demand/i);
  assert.match(helpGrok45.apply_in_eos, /@cursor\/sdk/);
  assert.match(helpGrok45.apply_in_eos, /Do not put API keys in git/i);
  assert.match(helpGrok45.apply_in_eos, /environment\.json/);
  assert.equal(/enable/i.test(helpGrok45.apply_in_eos), false);
  assert.equal(helpGrok45.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpGrok45.apply_in_eos.includes('Vercel'), false);
  assert.equal(helpGrok45.apply_in_eos.includes('Slack'), false);
  assert.equal(helpGrok45.apply_in_eos.includes('curl'), false);
  const startFromScratch = store.learnings.find((row) => row.source_url === 'https://cursor.com/changelog/start-from-scratch');
  assert.ok(startFromScratch);
  assert.equal(startFromScratch.title, 'Start from scratch, without a repo');
  assert.match(startFromScratch.summary, /Origin repo/i);
  assert.match(startFromScratch.apply_in_eos, /Start from scratch creates an Origin repo without GitHub/i);
  assert.match(startFromScratch.apply_in_eos, /GitHub remains source of truth/i);
  assert.match(startFromScratch.apply_in_eos, /Do not Start from scratch or create an Origin repo/i);
  assert.match(startFromScratch.apply_in_eos, /Cloud Agent VM already has its GitHub checkout/i);
  assert.match(startFromScratch.apply_in_eos, /environment\.json/);
  assert.match(startFromScratch.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(startFromScratch.apply_in_eos), false);
  assert.equal(startFromScratch.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(startFromScratch.apply_in_eos.includes('Vercel'), false);
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
  const securityOverview = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/security');
  assert.ok(securityOverview);
  assert.match(securityOverview.summary, /never widened/i);
  assert.match(securityOverview.summary, /\.cursorignore/);
  assert.equal(securityOverview.summary.includes('SOC 2'), false);
  assert.equal(securityOverview.summary.includes('Trust Center'), false);
  assert.match(securityOverview.apply_in_eos, /security model/i);
  assert.match(securityOverview.apply_in_eos, /never widened/i);
  assert.match(securityOverview.apply_in_eos, /Runtime Secrets/);
  assert.match(securityOverview.apply_in_eos, /\.cursorignore/);
  assert.match(securityOverview.apply_in_eos, /Privacy Mode \(Legacy\)/);
  assert.match(securityOverview.apply_in_eos, /SOC 2/);
  assert.equal(/enable/i.test(securityOverview.apply_in_eos), false);
  assert.equal(securityOverview.apply_in_eos.includes('Custom Mode'), false);
  const settings = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/settings');
  assert.ok(settings);
  assert.match(settings.summary, /\.cursor\/environment\.json/);
  assert.match(settings.summary, /Team follow-ups/i);
  assert.match(settings.summary, /secret exposure/i);
  assert.match(settings.apply_in_eos, /not EOS governance/i);
  assert.match(settings.apply_in_eos, /environment\.json/);
  assert.match(settings.apply_in_eos, /team follow-ups/i);
  assert.match(settings.apply_in_eos, /secrets/i);
  assert.equal(/enable/i.test(settings.apply_in_eos), false);
  assert.equal(settings.apply_in_eos.includes('Custom Mode'), false);
  const privateConnectivity = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/private-connectivity');
  assert.ok(privateConnectivity);
  assert.match(privateConnectivity.summary, /AWS PrivateLink/);
  assert.match(privateConnectivity.summary, /Cloudflare Tunnel/);
  assert.equal(privateConnectivity.summary.includes('10.2.8.0'), false);
  assert.equal(privateConnectivity.summary.includes('api2.cursor.sh'), false);
  assert.match(privateConnectivity.apply_in_eos, /public cloud/i);
  assert.match(privateConnectivity.apply_in_eos, /Enterprise-only/i);
  assert.match(privateConnectivity.apply_in_eos, /not required/i);
  assert.match(privateConnectivity.apply_in_eos, /GitHub/i);
  assert.match(privateConnectivity.apply_in_eos, /tunnel tokens/i);
  assert.equal(/enable/i.test(privateConnectivity.apply_in_eos), false);
  assert.equal(privateConnectivity.apply_in_eos.includes('Custom Mode'), false);
  const bugbot = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/bugbot');
  assert.ok(bugbot);
  assert.match(bugbot.summary, /\/review-bugbot/);
  assert.match(bugbot.summary, /\.cursor\/BUGBOT\.md/);
  assert.equal(bugbot.summary.includes('YOUR_API_KEY'), false);
  assert.equal(bugbot.summary.includes('github.md'), false);
  assert.match(bugbot.apply_in_eos, /optional PR review/i);
  assert.match(bugbot.apply_in_eos, /TDD evidence remains required/i);
  assert.match(bugbot.apply_in_eos, /\/review-bugbot/);
  assert.match(bugbot.apply_in_eos, /GitHub/i);
  assert.match(bugbot.apply_in_eos, /API keys/i);
  assert.equal(/enable/i.test(bugbot.apply_in_eos), false);
  assert.equal(bugbot.apply_in_eos.includes('Custom Mode'), false);
  const securityAgents = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/security-agents');
  assert.ok(securityAgents);
  assert.match(securityAgents.summary, /Security Reviewer/);
  assert.match(securityAgents.summary, /Vulnerability Scanner/);
  assert.match(securityAgents.summary, /\/review-security/);
  assert.equal(securityAgents.summary.includes('on-demand spend'), false);
  assert.match(securityAgents.apply_in_eos, /vendor PR reviewer/i);
  assert.match(securityAgents.apply_in_eos, /security-auditor/);
  assert.match(securityAgents.apply_in_eos, /\/review-security/);
  assert.match(securityAgents.apply_in_eos, /vendor finding counts/i);
  assert.match(securityAgents.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(securityAgents.apply_in_eos), false);
  assert.equal(securityAgents.apply_in_eos.includes('Custom Mode'), false);
  const approvalAgents = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/approval-agents');
  assert.ok(approvalAgents);
  assert.match(approvalAgents.summary, /How it works/);
  assert.match(approvalAgents.summary, /Reviewer assignment/);
  assert.match(approvalAgents.summary, /Approval policy files/);
  assert.equal(approvalAgents.summary.includes('Sitemap'), false);
  assert.match(approvalAgents.apply_in_eos, /optional vendor automation/i);
  assert.match(approvalAgents.apply_in_eos, /TDD/);
  assert.match(approvalAgents.apply_in_eos, /human review/i);
  assert.match(approvalAgents.apply_in_eos, /APPROVAL_POLICY\.md/);
  assert.match(approvalAgents.apply_in_eos, /\.cursor\/approval-policies\/ROUTING\.md/);
  assert.match(approvalAgents.apply_in_eos, /auto-approve/i);
  assert.match(approvalAgents.apply_in_eos, /GitHub/i);
  assert.match(approvalAgents.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(approvalAgents.apply_in_eos), false);
  assert.equal(approvalAgents.apply_in_eos.includes('Custom Mode'), false);
  const mobile = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/mobile');
  assert.ok(mobile);
  assert.match(mobile.summary, /What lives on the web/);
  assert.match(mobile.summary, /Remote Control/);
  assert.match(mobile.summary, /\/remote-control/);
  assert.equal(mobile.summary.includes('Sitemap'), false);
  assert.match(mobile.apply_in_eos, /Cloud Agent VM/);
  assert.match(mobile.apply_in_eos, /optional beta client/i);
  assert.match(mobile.apply_in_eos, /environment\.json/);
  assert.match(mobile.apply_in_eos, /\/remote-control/);
  assert.match(mobile.apply_in_eos, /Privacy Mode \(Legacy\)/);
  assert.match(mobile.apply_in_eos, /GitHub|GitLab/);
  assert.match(mobile.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(mobile.apply_in_eos), false);
  assert.equal(mobile.apply_in_eos.includes('Custom Mode'), false);
  const apiEndpoints = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/api/endpoints');
  assert.ok(apiEndpoints);
  assert.match(apiEndpoints.summary, /public beta/i);
  assert.equal(apiEndpoints.summary.includes('YOUR_API_KEY'), false);
  assert.equal(apiEndpoints.summary.includes('Sitemap'), false);
  assert.match(apiEndpoints.apply_in_eos, /official feeds/i);
  assert.match(apiEndpoints.apply_in_eos, /not the Cloud Agents API/i);
  assert.match(apiEndpoints.apply_in_eos, /api\.cursor\.com/);
  assert.match(apiEndpoints.apply_in_eos, /API keys/i);
  assert.match(apiEndpoints.apply_in_eos, /GitHub/i);
  assert.match(apiEndpoints.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(apiEndpoints.apply_in_eos), false);
  assert.equal(apiEndpoints.apply_in_eos.includes('Custom Mode'), false);
  const agentsWindow = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/agents-window');
  assert.ok(agentsWindow);
  assert.match(agentsWindow.summary, /Features Available Only in the Agents Window/);
  assert.match(agentsWindow.summary, /\/in-cloud/);
  assert.match(agentsWindow.summary, /\/autopilot/);
  assert.equal(agentsWindow.summary.includes('Sitemap'), false);
  assert.equal(/Open the Agents Window —/.test(agentsWindow.summary), false);
  assert.equal(/Switch Back to the IDE —/.test(agentsWindow.summary), false);
  assert.equal(/Enterprise access —/.test(agentsWindow.summary), false);
  assert.match(agentsWindow.apply_in_eos, /Cloud Agent VM/);
  assert.match(agentsWindow.apply_in_eos, /not in the desktop Agents Window/i);
  assert.match(agentsWindow.apply_in_eos, /\/in-cloud/);
  assert.match(agentsWindow.apply_in_eos, /\/autopilot/);
  assert.match(agentsWindow.apply_in_eos, /environment\.json/);
  assert.match(agentsWindow.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(agentsWindow.apply_in_eos), false);
  assert.equal(agentsWindow.apply_in_eos.includes('Custom Mode'), false);
  const agentReview = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/agent-review');
  assert.ok(agentReview);
  assert.match(agentReview.summary, /Running a review/);
  assert.match(agentReview.summary, /\/agent-review/);
  assert.match(agentReview.summary, /Review depth/);
  assert.match(agentReview.summary, /BUGBOT\.md/);
  assert.equal(agentReview.summary.includes('Sitemap'), false);
  assert.equal(/Setup —/.test(agentReview.summary), false);
  assert.match(agentReview.apply_in_eos, /optional in-editor review/i);
  assert.match(agentReview.apply_in_eos, /TDD/);
  assert.match(agentReview.apply_in_eos, /\/agent-review/);
  assert.match(agentReview.apply_in_eos, /not a substitute/i);
  assert.match(agentReview.apply_in_eos, /BUGBOT\.md/);
  assert.match(agentReview.apply_in_eos, /Cloud Agent VM/);
  assert.match(agentReview.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(agentReview.apply_in_eos), false);
  assert.equal(agentReview.apply_in_eos.includes('Custom Mode'), false);
  const planMode = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/plan-mode');
  assert.ok(planMode);
  assert.match(planMode.summary, /How it works/);
  assert.match(planMode.summary, /When to use Plan Mode/);
  assert.match(planMode.summary, /Starting over from a plan/);
  assert.equal(planMode.summary.includes('Sitemap'), false);
  assert.equal(/Switching modes —/.test(planMode.summary), false);
  assert.equal(/Related —/.test(planMode.summary), false);
  assert.match(planMode.apply_in_eos, /optional desktop planning/i);
  assert.match(planMode.apply_in_eos, /\/goal/);
  assert.match(planMode.apply_in_eos, /do not rotate this Cloud Agent into Plan Mode/i);
  assert.match(planMode.apply_in_eos, /TDD/);
  assert.match(planMode.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(planMode.apply_in_eos), false);
  assert.equal(planMode.apply_in_eos.includes('Custom Mode'), false);
  const helpAgentMode = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/agent');
  assert.ok(helpAgentMode);
  assert.equal(helpAgentMode.title, 'Agent mode');
  assert.match(helpAgentMode.summary, /What can Agent mode do/);
  assert.match(helpAgentMode.summary, /How do I start using Agent/);
  assert.match(helpAgentMode.summary, /How do I interrupt Agent/);
  assert.match(helpAgentMode.summary, /How do I review Agent changes/);
  assert.equal(helpAgentMode.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpAgentMode.summary), false);
  assert.match(helpAgentMode.apply_in_eos, /vendor desktop Agent/i);
  assert.match(helpAgentMode.apply_in_eos, /\/goal/);
  assert.match(helpAgentMode.apply_in_eos, /do not rotate this Cloud Agent into desktop Agent mode/i);
  assert.match(helpAgentMode.apply_in_eos, /environment\.json/);
  assert.match(helpAgentMode.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpAgentMode.apply_in_eos), false);
  assert.equal(helpAgentMode.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpAgentMode.apply_in_eos.includes('Vercel'), false);
  const helpAskMode = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/ask-mode');
  assert.ok(helpAskMode);
  assert.equal(helpAskMode.title, 'Ask mode');
  assert.match(helpAskMode.summary, /How do I use Ask mode/);
  assert.match(helpAskMode.summary, /When should I use Ask mode/);
  assert.equal(helpAskMode.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpAskMode.summary), false);
  assert.match(helpAskMode.apply_in_eos, /vendor desktop read-only Agent/i);
  assert.match(helpAskMode.apply_in_eos, /\/goal/);
  assert.match(helpAskMode.apply_in_eos, /do not rotate this Cloud Agent into desktop Ask mode/i);
  assert.match(helpAskMode.apply_in_eos, /environment\.json/);
  assert.match(helpAskMode.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpAskMode.apply_in_eos), false);
  assert.equal(helpAskMode.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpAskMode.apply_in_eos.includes('Vercel'), false);
  const helpPlanMode = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/plan-mode');
  assert.ok(helpPlanMode);
  assert.equal(helpPlanMode.title, 'Plan mode');
  assert.match(helpPlanMode.summary, /How do I use Plan mode/);
  assert.match(helpPlanMode.summary, /When should I use Plan mode/);
  assert.match(helpPlanMode.summary, /How do I save plans/);
  assert.match(helpPlanMode.summary, /How do I start over in Plan mode/);
  assert.equal(helpPlanMode.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpPlanMode.summary), false);
  assert.match(helpPlanMode.apply_in_eos, /vendor desktop planning/i);
  assert.match(helpPlanMode.apply_in_eos, /\/goal/);
  assert.match(helpPlanMode.apply_in_eos, /do not rotate this Cloud Agent into desktop Plan mode/i);
  assert.match(helpPlanMode.apply_in_eos, /TDD/);
  assert.match(helpPlanMode.apply_in_eos, /environment\.json/);
  assert.match(helpPlanMode.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpPlanMode.apply_in_eos), false);
  assert.equal(helpPlanMode.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpPlanMode.apply_in_eos.includes('Vercel'), false);
  const helpTab = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/tab');
  assert.ok(helpTab);
  assert.equal(helpTab.title, 'Tab completion');
  assert.match(helpTab.summary, /How do I accept or reject suggestions/);
  assert.match(helpTab.summary, /Can Tab edit multiple lines at once/);
  assert.match(helpTab.summary, /What is jump-in-file/);
  assert.match(helpTab.summary, /Can Tab suggest edits in other files/);
  assert.equal(helpTab.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTab.summary), false);
  assert.match(helpTab.apply_in_eos, /vendor desktop autocomplete/i);
  assert.match(helpTab.apply_in_eos, /\/goal/);
  assert.match(helpTab.apply_in_eos, /do not rotate this Cloud Agent into desktop Tab/i);
  assert.match(helpTab.apply_in_eos, /environment\.json/);
  assert.match(helpTab.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTab.apply_in_eos), false);
  assert.equal(helpTab.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTab.apply_in_eos.includes('Vercel'), false);
  const helpInlineEdit = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/inline-edit');
  assert.ok(helpInlineEdit);
  assert.equal(helpInlineEdit.title, 'Inline edit');
  assert.match(helpInlineEdit.summary, /How do I use inline edit/);
  assert.match(helpInlineEdit.summary, /How do I ask a quick question with inline edit/);
  assert.match(helpInlineEdit.summary, /Can I switch from inline edit to Agent/);
  assert.equal(helpInlineEdit.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpInlineEdit.summary), false);
  assert.match(helpInlineEdit.apply_in_eos, /vendor desktop Cmd\+K/i);
  assert.match(helpInlineEdit.apply_in_eos, /\/goal/);
  assert.match(helpInlineEdit.apply_in_eos, /do not rotate this Cloud Agent into desktop Inline edit/i);
  assert.match(helpInlineEdit.apply_in_eos, /environment\.json/);
  assert.match(helpInlineEdit.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpInlineEdit.apply_in_eos), false);
  assert.equal(helpInlineEdit.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpInlineEdit.apply_in_eos.includes('Vercel'), false);
  const helpCloudAgents = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/cloud-agents');
  assert.ok(helpCloudAgents);
  assert.equal(helpCloudAgents.title, 'Cloud Agents');
  assert.match(helpCloudAgents.summary, /What can Cloud Agents do/);
  assert.match(helpCloudAgents.summary, /How does "Move to Cloud" handle my file state/);
  assert.match(helpCloudAgents.summary, /How do I set up Cloud Agents/);
  assert.equal(helpCloudAgents.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpCloudAgents.summary), false);
  assert.match(helpCloudAgents.apply_in_eos, /vendor isolated-VM Agent/i);
  assert.match(helpCloudAgents.apply_in_eos, /\/goal/);
  assert.match(helpCloudAgents.apply_in_eos, /do not rotate this Cloud Agent into desktop Move to Cloud/i);
  assert.match(helpCloudAgents.apply_in_eos, /environment\.json/);
  assert.match(helpCloudAgents.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpCloudAgents.apply_in_eos), false);
  assert.equal(helpCloudAgents.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpCloudAgents.apply_in_eos.includes('Vercel'), false);
  const helpBackgroundAgents = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/background-agents');
  assert.ok(helpBackgroundAgents);
  assert.equal(helpBackgroundAgents.title, 'What are background agents?');
  assert.match(helpBackgroundAgents.summary, /How do background agents work/);
  assert.match(helpBackgroundAgents.summary, /How do background agents show their work/);
  assert.match(helpBackgroundAgents.summary, /How do I start a background agent/);
  assert.equal(helpBackgroundAgents.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpBackgroundAgents.summary), false);
  assert.match(helpBackgroundAgents.apply_in_eos, /vendor isolated-VM Agent/i);
  assert.match(helpBackgroundAgents.apply_in_eos, /\/goal/);
  assert.match(helpBackgroundAgents.apply_in_eos, /do not rotate this Cloud Agent into desktop background agents/i);
  assert.match(helpBackgroundAgents.apply_in_eos, /environment\.json/);
  assert.match(helpBackgroundAgents.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpBackgroundAgents.apply_in_eos), false);
  assert.equal(helpBackgroundAgents.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpBackgroundAgents.apply_in_eos.includes('Vercel'), false);
  const helpMobileApp = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/mobile-app');
  assert.ok(helpMobileApp);
  assert.equal(helpMobileApp.title, 'Cursor for iOS');
  assert.match(helpMobileApp.summary, /Is there an Android app/);
  assert.match(helpMobileApp.summary, /Which devices and versions are supported/);
  assert.match(helpMobileApp.summary, /What is different on iPad/);
  assert.equal(helpMobileApp.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpMobileApp.summary), false);
  assert.match(helpMobileApp.apply_in_eos, /vendor mobile Cloud Agent client/i);
  assert.match(helpMobileApp.apply_in_eos, /Cloud Agent VM/);
  assert.match(helpMobileApp.apply_in_eos, /do not rotate this Cloud Agent into the iOS app/i);
  assert.match(helpMobileApp.apply_in_eos, /environment\.json/);
  assert.match(helpMobileApp.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpMobileApp.apply_in_eos), false);
  assert.equal(helpMobileApp.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpMobileApp.apply_in_eos.includes('Vercel'), false);
  const helpSharedTranscripts = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/shared-transcripts');
  assert.ok(helpSharedTranscripts);
  assert.equal(helpSharedTranscripts.title, 'Shared transcripts');
  assert.match(helpSharedTranscripts.summary, /How do I share a conversation/);
  assert.match(helpSharedTranscripts.summary, /Who can view shared transcripts/);
  assert.match(helpSharedTranscripts.summary, /Can I fork a shared transcript/);
  assert.equal(helpSharedTranscripts.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSharedTranscripts.summary), false);
  assert.match(helpSharedTranscripts.apply_in_eos, /vendor conversation sharing/i);
  assert.match(helpSharedTranscripts.apply_in_eos, /\/goal/);
  assert.match(helpSharedTranscripts.apply_in_eos, /do not rotate this Cloud Agent into shared transcripts/i);
  assert.match(helpSharedTranscripts.apply_in_eos, /environment\.json/);
  assert.match(helpSharedTranscripts.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSharedTranscripts.apply_in_eos), false);
  assert.equal(helpSharedTranscripts.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSharedTranscripts.apply_in_eos.includes('Vercel'), false);
  const helpBugbot = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/bugbot');
  assert.ok(helpBugbot);
  assert.equal(helpBugbot.title, 'Bugbot');
  assert.match(helpBugbot.summary, /Can Cursor review my PRs/);
  assert.match(helpBugbot.summary, /What is Bugbot/);
  assert.match(helpBugbot.summary, /How do I set up Bugbot/);
  assert.equal(helpBugbot.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpBugbot.summary), false);
  assert.match(helpBugbot.apply_in_eos, /vendor PR review/i);
  assert.match(helpBugbot.apply_in_eos, /\/goal/);
  assert.match(helpBugbot.apply_in_eos, /do not rotate this Cloud Agent into Bugbot dashboard setup/i);
  assert.match(helpBugbot.apply_in_eos, /TDD/);
  assert.match(helpBugbot.apply_in_eos, /GitHub/);
  assert.match(helpBugbot.apply_in_eos, /environment\.json/);
  assert.match(helpBugbot.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpBugbot.apply_in_eos), false);
  assert.equal(helpBugbot.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpBugbot.apply_in_eos.includes('Vercel'), false);
  const helpRules = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/customization/rules');
  assert.ok(helpRules);
  assert.equal(helpRules.title, 'Rules');
  assert.match(helpRules.summary, /What is a rule/);
  assert.match(helpRules.summary, /How do I create a project rule/);
  assert.match(helpRules.summary, /How do I set up user rules/);
  assert.equal(helpRules.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpRules.summary), false);
  assert.match(helpRules.apply_in_eos, /vendor Agent instructions/i);
  assert.match(helpRules.apply_in_eos, /\/goal/);
  assert.match(helpRules.apply_in_eos, /do not rotate this Cloud Agent into dashboard team rules/i);
  assert.match(helpRules.apply_in_eos, /\.mdc/);
  assert.match(helpRules.apply_in_eos, /AGENTS\.md/);
  assert.match(helpRules.apply_in_eos, /\/create-rule/);
  assert.match(helpRules.apply_in_eos, /Team dashboard rules are not EOS governance/i);
  assert.match(helpRules.apply_in_eos, /environment\.json/);
  assert.match(helpRules.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpRules.apply_in_eos), false);
  assert.equal(helpRules.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpRules.apply_in_eos.includes('Vercel'), false);
  const helpSkills = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/customization/skills');
  assert.ok(helpSkills);
  assert.equal(helpSkills.title, 'Skills');
  assert.match(helpSkills.summary, /What are Skills/);
  assert.match(helpSkills.summary, /How do I create a skill/);
  assert.match(helpSkills.summary, /Are user-level skills available/);
  assert.equal(helpSkills.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSkills.summary), false);
  assert.match(helpSkills.apply_in_eos, /vendor Agent workflows/i);
  assert.match(helpSkills.apply_in_eos, /\/goal/);
  assert.match(helpSkills.apply_in_eos, /do not rotate this Cloud Agent into dashboard team skills/i);
  assert.match(helpSkills.apply_in_eos, /SKILL\.md/);
  assert.match(helpSkills.apply_in_eos, /\.cursor\/skills/);
  assert.match(helpSkills.apply_in_eos, /\/create-skill/);
  assert.match(helpSkills.apply_in_eos, /environment\.json/);
  assert.match(helpSkills.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSkills.apply_in_eos), false);
  assert.equal(helpSkills.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSkills.apply_in_eos.includes('Vercel'), false);
  const helpMcp = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/customization/mcp');
  assert.ok(helpMcp);
  assert.equal(helpMcp.title, 'MCP integrations');
  assert.match(helpMcp.summary, /What is an MCP server/);
  assert.match(helpMcp.summary, /How do I install an MCP server manually/);
  assert.match(helpMcp.summary, /How do I use MCP tools in chat/);
  assert.equal(helpMcp.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpMcp.summary), false);
  assert.match(helpMcp.apply_in_eos, /vendor Agent integrations/i);
  assert.match(helpMcp.apply_in_eos, /\/goal/);
  assert.match(helpMcp.apply_in_eos, /do not rotate this Cloud Agent into dashboard team MCP/i);
  assert.match(helpMcp.apply_in_eos, /\.cursor\/mcp\.json/);
  assert.match(helpMcp.apply_in_eos, /API keys/i);
  assert.match(helpMcp.apply_in_eos, /not EOS governance/i);
  assert.match(helpMcp.apply_in_eos, /environment\.json/);
  assert.match(helpMcp.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpMcp.apply_in_eos), false);
  assert.equal(helpMcp.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpMcp.apply_in_eos.includes('Vercel'), false);
  const helpContext = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/customization/context');
  assert.ok(helpContext);
  assert.equal(helpContext.title, '@ mentions and context');
  assert.match(helpContext.summary, /What can I reference with @/);
  assert.match(helpContext.summary, /When should I use @ mentions/);
  assert.match(helpContext.summary, /Can I attach multiple items/);
  assert.equal(helpContext.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpContext.summary), false);
  assert.match(helpContext.apply_in_eos, /vendor Agent @ mentions/i);
  assert.match(helpContext.apply_in_eos, /\/goal/);
  assert.match(helpContext.apply_in_eos, /do not rotate this Cloud Agent into desktop @ mentions/i);
  assert.match(helpContext.apply_in_eos, /Cloud Agent VM already searches/i);
  assert.match(helpContext.apply_in_eos, /environment\.json/);
  assert.match(helpContext.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpContext.apply_in_eos), false);
  assert.equal(helpContext.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpContext.apply_in_eos.includes('Vercel'), false);
  const helpIgnoreFiles = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/customization/ignore-files');
  assert.ok(helpIgnoreFiles);
  assert.equal(helpIgnoreFiles.title, 'Ignore files');
  assert.match(helpIgnoreFiles.summary, /How do I exclude files from Cursor/);
  assert.match(helpIgnoreFiles.summary, /Does Cursor respect \.gitignore/);
  assert.match(helpIgnoreFiles.summary, /Why should I ignore files/);
  assert.equal(helpIgnoreFiles.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpIgnoreFiles.summary), false);
  assert.match(helpIgnoreFiles.apply_in_eos, /vendor Agent context exclusions/i);
  assert.match(helpIgnoreFiles.apply_in_eos, /\/goal/);
  assert.match(helpIgnoreFiles.apply_in_eos, /do not rotate this Cloud Agent into desktop ignore-file setup/i);
  assert.match(helpIgnoreFiles.apply_in_eos, /\.cursorignore/);
  assert.match(helpIgnoreFiles.apply_in_eos, /Do not put secrets in git/);
  assert.match(helpIgnoreFiles.apply_in_eos, /environment\.json/);
  assert.match(helpIgnoreFiles.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpIgnoreFiles.apply_in_eos), false);
  assert.equal(helpIgnoreFiles.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpIgnoreFiles.apply_in_eos.includes('Vercel'), false);
  const helpPlugins = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/customization/plugins');
  assert.ok(helpPlugins);
  assert.equal(helpPlugins.title, 'Plugins');
  assert.match(helpPlugins.summary, /What are plugins/);
  assert.match(helpPlugins.summary, /How do I install a plugin/);
  assert.match(helpPlugins.summary, /Are plugins reviewed for security/);
  assert.equal(helpPlugins.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpPlugins.summary), false);
  assert.match(helpPlugins.apply_in_eos, /vendor Agent reusable tools/i);
  assert.match(helpPlugins.apply_in_eos, /\/goal/);
  assert.match(helpPlugins.apply_in_eos, /do not rotate this Cloud Agent into dashboard team marketplace/i);
  assert.match(helpPlugins.apply_in_eos, /\.cursor\/mcp\.json/);
  assert.match(helpPlugins.apply_in_eos, /not EOS governance/i);
  assert.match(helpPlugins.apply_in_eos, /environment\.json/);
  assert.match(helpPlugins.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpPlugins.apply_in_eos), false);
  assert.equal(helpPlugins.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpPlugins.apply_in_eos.includes('Vercel'), false);
  const helpMultiAgent = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/multi-agent');
  assert.ok(helpMultiAgent);
  assert.equal(helpMultiAgent.title, 'What is multi-agent coding?');
  assert.match(helpMultiAgent.summary, /How do I run multiple agents in Cursor/);
  assert.match(helpMultiAgent.summary, /What are subagents/);
  assert.match(helpMultiAgent.summary, /How do I multitask with agents/);
  assert.equal(helpMultiAgent.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpMultiAgent.summary), false);
  assert.match(helpMultiAgent.apply_in_eos, /vendor desktop Agents Window parallelism/i);
  assert.match(helpMultiAgent.apply_in_eos, /\/goal/);
  assert.match(helpMultiAgent.apply_in_eos, /do not rotate this Cloud Agent into desktop Agents Window/i);
  assert.match(helpMultiAgent.apply_in_eos, /\/multitask/);
  assert.match(helpMultiAgent.apply_in_eos, /Build in Parallel/);
  assert.match(helpMultiAgent.apply_in_eos, /already runs one isolated agent/i);
  assert.match(helpMultiAgent.apply_in_eos, /environment\.json/);
  assert.match(helpMultiAgent.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpMultiAgent.apply_in_eos), false);
  assert.equal(helpMultiAgent.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpMultiAgent.apply_in_eos.includes('Vercel'), false);
  const helpSideChats = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/side-chats');
  assert.ok(helpSideChats);
  assert.equal(helpSideChats.title, 'Side chats');
  assert.match(helpSideChats.summary, /What is a side chat and how does it differ/);
  assert.match(helpSideChats.summary, /How do I open a side chat/);
  assert.match(helpSideChats.summary, /How do I bring side chat context back/);
  assert.equal(helpSideChats.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSideChats.summary), false);
  assert.match(helpSideChats.apply_in_eos, /vendor local-only side conversations/i);
  assert.match(helpSideChats.apply_in_eos, /\/goal/);
  assert.match(helpSideChats.apply_in_eos, /do not rotate this Cloud Agent into \/side/i);
  assert.match(helpSideChats.apply_in_eos, /desktop side chats/i);
  assert.match(helpSideChats.apply_in_eos, /has no side chats/i);
  assert.match(helpSideChats.apply_in_eos, /environment\.json/);
  assert.match(helpSideChats.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSideChats.apply_in_eos), false);
  assert.equal(helpSideChats.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSideChats.apply_in_eos.includes('Vercel'), false);
  const helpConversationSearch = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/conversation-search');
  assert.ok(helpConversationSearch);
  assert.equal(helpConversationSearch.title, 'Conversation search');
  assert.match(helpConversationSearch.summary, /How do I search my past agent conversations/);
  assert.match(helpConversationSearch.summary, /How do I search within an existing conversation/);
  assert.equal(helpConversationSearch.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpConversationSearch.summary), false);
  assert.match(helpConversationSearch.apply_in_eos, /vendor desktop transcript search/i);
  assert.match(helpConversationSearch.apply_in_eos, /\/goal/);
  assert.match(helpConversationSearch.apply_in_eos, /do not rotate this Cloud Agent into desktop conversation search/i);
  assert.match(helpConversationSearch.apply_in_eos, /already searches the workspace/i);
  assert.match(helpConversationSearch.apply_in_eos, /environment\.json/);
  assert.match(helpConversationSearch.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpConversationSearch.apply_in_eos), false);
  assert.equal(helpConversationSearch.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpConversationSearch.apply_in_eos.includes('Vercel'), false);
  const grokBotDocs = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/grok-bot');
  assert.ok(grokBotDocs);
  assert.equal(grokBotDocs.title, 'Grok Bot');
  assert.match(grokBotDocs.summary, /What makes Grok Bot different/);
  assert.match(grokBotDocs.summary, /Your Bots share one computer/);
  assert.match(grokBotDocs.summary, /A good first handoff/);
  assert.equal(grokBotDocs.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(grokBotDocs.summary), false);
  assert.match(grokBotDocs.apply_in_eos, /vendor persistent-cloud Bots/i);
  assert.match(grokBotDocs.apply_in_eos, /\/goal/);
  assert.match(grokBotDocs.apply_in_eos, /do not rotate this Cloud Agent into the Grok Bot desktop or iOS app/i);
  assert.match(grokBotDocs.apply_in_eos, /no Grok Bot Linux app/i);
  assert.match(grokBotDocs.apply_in_eos, /environment\.json/);
  assert.match(grokBotDocs.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(grokBotDocs.apply_in_eos), false);
  assert.equal(grokBotDocs.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(grokBotDocs.apply_in_eos.includes('Vercel'), false);
  assert.equal(grokBotDocs.apply_in_eos.includes('changelog + forum'), false);
  const helpAiPairProgramming = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/ai-features/ai-pair-programming');
  assert.ok(helpAiPairProgramming);
  assert.equal(helpAiPairProgramming.title, 'How does AI pair programming work in Cursor?');
  assert.match(helpAiPairProgramming.summary, /What is an AI coding assistant/);
  assert.match(helpAiPairProgramming.summary, /How do I pair program with Cursor/);
  assert.equal(helpAiPairProgramming.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpAiPairProgramming.summary), false);
  assert.match(helpAiPairProgramming.apply_in_eos, /vendor desktop Agent coworking/i);
  assert.match(helpAiPairProgramming.apply_in_eos, /\/goal/);
  assert.match(helpAiPairProgramming.apply_in_eos, /do not rotate this Cloud Agent into desktop pair-programming chat/i);
  assert.match(helpAiPairProgramming.apply_in_eos, /environment\.json/);
  assert.match(helpAiPairProgramming.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpAiPairProgramming.apply_in_eos), false);
  assert.equal(helpAiPairProgramming.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpAiPairProgramming.apply_in_eos.includes('Vercel'), false);
  const getStartedQuickstart = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/get-started/quickstart');
  assert.ok(getStartedQuickstart);
  assert.equal(getStartedQuickstart.title, 'Quickstart');
  assert.match(getStartedQuickstart.summary, /first useful change/);
  assert.match(getStartedQuickstart.summary, /explain your codebase/);
  assert.equal(getStartedQuickstart.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(getStartedQuickstart.summary), false);
  assert.equal(/Next steps/.test(getStartedQuickstart.summary), false);
  assert.equal(getStartedQuickstart.summary.toLowerCase().includes('curl'), false);
  assert.match(getStartedQuickstart.apply_in_eos, /vendor desktop first-run/i);
  assert.match(getStartedQuickstart.apply_in_eos, /\/goal/);
  assert.match(getStartedQuickstart.apply_in_eos, /do not rotate this Cloud Agent into desktop first-run or quickstart/i);
  assert.match(getStartedQuickstart.apply_in_eos, /already has its GitHub checkout/i);
  assert.match(getStartedQuickstart.apply_in_eos, /environment\.json/);
  assert.match(getStartedQuickstart.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(getStartedQuickstart.apply_in_eos), false);
  assert.equal(getStartedQuickstart.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(getStartedQuickstart.apply_in_eos.includes('Vercel'), false);
  const helpGettingStartedInstall = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/getting-started/install');
  assert.ok(helpGettingStartedInstall);
  assert.equal(helpGettingStartedInstall.title, 'Download and install Cursor');
  assert.match(helpGettingStartedInstall.summary, /What do I need before installing/);
  assert.match(helpGettingStartedInstall.summary, /How do I install Cursor/);
  assert.equal(helpGettingStartedInstall.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGettingStartedInstall.summary), false);
  assert.equal(helpGettingStartedInstall.summary.toLowerCase().includes('curl'), false);
  assert.match(helpGettingStartedInstall.apply_in_eos, /vendor desktop first-run/i);
  assert.match(helpGettingStartedInstall.apply_in_eos, /\/goal/);
  assert.match(helpGettingStartedInstall.apply_in_eos, /do not rotate this Cloud Agent into desktop install or first-run/i);
  assert.match(helpGettingStartedInstall.apply_in_eos, /already has its GitHub checkout/i);
  assert.match(helpGettingStartedInstall.apply_in_eos, /environment\.json/);
  assert.match(helpGettingStartedInstall.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpGettingStartedInstall.apply_in_eos), false);
  assert.equal(helpGettingStartedInstall.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpGettingStartedInstall.apply_in_eos.includes('Vercel'), false);
  const helpGettingStartedFirstProject = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/getting-started/first-project');
  assert.ok(helpGettingStartedFirstProject);
  assert.equal(helpGettingStartedFirstProject.title, 'Your first project');
  assert.match(helpGettingStartedFirstProject.summary, /How do I open a project in Cursor/);
  assert.match(helpGettingStartedFirstProject.summary, /How do I start using Agent/);
  assert.match(helpGettingStartedFirstProject.summary, /How do I review Agent changes/);
  assert.match(helpGettingStartedFirstProject.summary, /How do I give Agent more context/);
  assert.equal(helpGettingStartedFirstProject.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGettingStartedFirstProject.summary), false);
  assert.equal(helpGettingStartedFirstProject.summary.toLowerCase().includes('curl'), false);
  assert.match(helpGettingStartedFirstProject.apply_in_eos, /vendor desktop first-run/i);
  assert.match(helpGettingStartedFirstProject.apply_in_eos, /\/goal/);
  assert.match(helpGettingStartedFirstProject.apply_in_eos, /do not rotate this Cloud Agent into desktop first-project or first-run/i);
  assert.match(helpGettingStartedFirstProject.apply_in_eos, /already has its GitHub checkout/i);
  assert.match(helpGettingStartedFirstProject.apply_in_eos, /environment\.json/);
  assert.match(helpGettingStartedFirstProject.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpGettingStartedFirstProject.apply_in_eos), false);
  assert.equal(helpGettingStartedFirstProject.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpGettingStartedFirstProject.apply_in_eos.includes('Vercel'), false);
  const helpGettingStartedBuildAiCodingAgent = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/getting-started/build-ai-coding-agent');
  assert.ok(helpGettingStartedBuildAiCodingAgent);
  assert.equal(helpGettingStartedBuildAiCodingAgent.title, 'How do I build an AI coding agent?');
  assert.match(helpGettingStartedBuildAiCodingAgent.summary, /What is a coding agent made of/);
  assert.match(helpGettingStartedBuildAiCodingAgent.summary, /Can I build an agent without coding/);
  assert.match(helpGettingStartedBuildAiCodingAgent.summary, /How do I build a coding agent with the Cursor SDK/);
  assert.match(helpGettingStartedBuildAiCodingAgent.summary, /What can I build with the Cursor SDK/);
  assert.equal(helpGettingStartedBuildAiCodingAgent.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGettingStartedBuildAiCodingAgent.summary), false);
  assert.equal(helpGettingStartedBuildAiCodingAgent.summary.toLowerCase().includes('curl'), false);
  assert.equal(helpGettingStartedBuildAiCodingAgent.summary.includes('CURSOR_API_KEY'), false);
  assert.match(helpGettingStartedBuildAiCodingAgent.apply_in_eos, /vendor custom-agent SDK how-to/i);
  assert.match(helpGettingStartedBuildAiCodingAgent.apply_in_eos, /\/goal/);
  assert.match(helpGettingStartedBuildAiCodingAgent.apply_in_eos, /do not rotate this Cloud Agent into building a custom coding agent or installing @cursor\/sdk/i);
  assert.match(helpGettingStartedBuildAiCodingAgent.apply_in_eos, /already has its GitHub checkout/i);
  assert.match(helpGettingStartedBuildAiCodingAgent.apply_in_eos, /environment\.json/);
  assert.match(helpGettingStartedBuildAiCodingAgent.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpGettingStartedBuildAiCodingAgent.apply_in_eos), false);
  assert.equal(helpGettingStartedBuildAiCodingAgent.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpGettingStartedBuildAiCodingAgent.apply_in_eos.includes('Vercel'), false);
  const helpSecurityAndPrivacyPrivacy = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/privacy');
  assert.ok(helpSecurityAndPrivacyPrivacy);
  assert.equal(helpSecurityAndPrivacyPrivacy.title, 'Privacy and data');
  assert.match(helpSecurityAndPrivacyPrivacy.summary, /What is Privacy Mode/);
  assert.match(helpSecurityAndPrivacyPrivacy.summary, /How do I enable Privacy Mode/);
  assert.match(helpSecurityAndPrivacyPrivacy.summary, /What data is sent to AI providers/);
  assert.equal(helpSecurityAndPrivacyPrivacy.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyPrivacy.summary), false);
  assert.equal(helpSecurityAndPrivacyPrivacy.summary.toLowerCase().includes('curl'), false);
  assert.match(helpSecurityAndPrivacyPrivacy.apply_in_eos, /vendor Privacy Mode data-handling/i);
  assert.match(helpSecurityAndPrivacyPrivacy.apply_in_eos, /\/goal/);
  assert.match(helpSecurityAndPrivacyPrivacy.apply_in_eos, /do not rotate this Cloud Agent into desktop Privacy Mode settings/i);
  assert.match(helpSecurityAndPrivacyPrivacy.apply_in_eos, /environment\.json/);
  assert.match(helpSecurityAndPrivacyPrivacy.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSecurityAndPrivacyPrivacy.apply_in_eos), false);
  assert.equal(helpSecurityAndPrivacyPrivacy.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSecurityAndPrivacyPrivacy.apply_in_eos.includes('Vercel'), false);
  const helpSecurityAndPrivacyRegions = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/regions');
  assert.ok(helpSecurityAndPrivacyRegions);
  assert.equal(helpSecurityAndPrivacyRegions.title, 'Regions and model availability');
  assert.match(helpSecurityAndPrivacyRegions.summary, /What can I do if a model is unavailable in my region/);
  assert.match(helpSecurityAndPrivacyRegions.summary, /Which regions does each provider support/);
  assert.match(helpSecurityAndPrivacyRegions.summary, /Can I use Grok 4.5 in the EU/);
  assert.match(helpSecurityAndPrivacyRegions.summary, /Is Cursor Start available outside India/);
  assert.match(helpSecurityAndPrivacyRegions.summary, /Does Cursor offer data residency controls/);
  assert.equal(helpSecurityAndPrivacyRegions.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyRegions.summary), false);
  assert.equal(helpSecurityAndPrivacyRegions.summary.toLowerCase().includes('curl'), false);
  assert.match(helpSecurityAndPrivacyRegions.apply_in_eos, /vendor region\/model-availability data-handling/i);
  assert.match(helpSecurityAndPrivacyRegions.apply_in_eos, /\/goal/);
  assert.match(helpSecurityAndPrivacyRegions.apply_in_eos, /do not rotate this Cloud Agent into desktop region, API-key, or Cursor Start settings/i);
  assert.match(helpSecurityAndPrivacyRegions.apply_in_eos, /environment\.json/);
  assert.match(helpSecurityAndPrivacyRegions.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSecurityAndPrivacyRegions.apply_in_eos), false);
  assert.equal(helpSecurityAndPrivacyRegions.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSecurityAndPrivacyRegions.apply_in_eos.includes('Vercel'), false);
  const helpSecurityAndPrivacySso = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/sso');
  assert.ok(helpSecurityAndPrivacySso);
  assert.equal(helpSecurityAndPrivacySso.title, 'SSO and authentication');
  assert.match(helpSecurityAndPrivacySso.summary, /What do I need before setting up SSO/);
  assert.match(helpSecurityAndPrivacySso.summary, /How do I set up SSO/);
  assert.match(helpSecurityAndPrivacySso.summary, /Does Cursor support SCIM provisioning/);
  assert.match(helpSecurityAndPrivacySso.summary, /How do I view my SSO configuration and domains/);
  assert.match(helpSecurityAndPrivacySso.summary, /Why do team members see "Not assigned to this application"/);
  assert.equal(helpSecurityAndPrivacySso.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacySso.summary), false);
  assert.equal(helpSecurityAndPrivacySso.summary.toLowerCase().includes('curl'), false);
  assert.match(helpSecurityAndPrivacySso.apply_in_eos, /vendor team SAML authentication/i);
  assert.match(helpSecurityAndPrivacySso.apply_in_eos, /\/goal/);
  assert.match(helpSecurityAndPrivacySso.apply_in_eos, /do not rotate this Cloud Agent into desktop or team SSO settings/i);
  assert.match(helpSecurityAndPrivacySso.apply_in_eos, /environment\.json/);
  assert.match(helpSecurityAndPrivacySso.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSecurityAndPrivacySso.apply_in_eos), false);
  assert.equal(helpSecurityAndPrivacySso.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSecurityAndPrivacySso.apply_in_eos.includes('Vercel'), false);
  const helpSecurityAndPrivacyAccountCompromised = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/account-compromised');
  assert.ok(helpSecurityAndPrivacyAccountCompromised);
  assert.equal(helpSecurityAndPrivacyAccountCompromised.title, 'Compromised account');
  assert.match(helpSecurityAndPrivacyAccountCompromised.summary, /What are signs of unauthorized account access/);
  assert.match(helpSecurityAndPrivacyAccountCompromised.summary, /How do I secure my Cursor account/);
  assert.match(helpSecurityAndPrivacyAccountCompromised.summary, /What if I use SSO to log in/);
  assert.match(helpSecurityAndPrivacyAccountCompromised.summary, /Should I contact Cursor support/);
  assert.equal(helpSecurityAndPrivacyAccountCompromised.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyAccountCompromised.summary), false);
  assert.equal(helpSecurityAndPrivacyAccountCompromised.summary.toLowerCase().includes('curl'), false);
  assert.match(helpSecurityAndPrivacyAccountCompromised.apply_in_eos, /vendor compromised-account incident response/i);
  assert.match(helpSecurityAndPrivacyAccountCompromised.apply_in_eos, /\/goal/);
  assert.match(helpSecurityAndPrivacyAccountCompromised.apply_in_eos, /do not rotate this Cloud Agent into dashboard session revoke, billing, or API-key settings/i);
  assert.match(helpSecurityAndPrivacyAccountCompromised.apply_in_eos, /environment\.json/);
  assert.match(helpSecurityAndPrivacyAccountCompromised.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSecurityAndPrivacyAccountCompromised.apply_in_eos), false);
  assert.equal(helpSecurityAndPrivacyAccountCompromised.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSecurityAndPrivacyAccountCompromised.apply_in_eos.includes('Vercel'), false);
  const helpSecurityAndPrivacyMarketplaceSecurity = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/marketplace-security');
  assert.ok(helpSecurityAndPrivacyMarketplaceSecurity);
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurity.title, 'Marketplace security');
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.summary, /What risk does installing a plugin carry/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.summary, /Are plugins open source/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.summary, /Are plugin updates reviewed/);
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurity.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyMarketplaceSecurity.summary), false);
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurity.summary.toLowerCase().includes('curl'), false);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos, /vendor marketplace plugin review/i);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos, /\/goal/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos, /do not rotate this Cloud Agent into marketplace plugin install/i);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos, /environment\.json/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos), false);
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurity.apply_in_eos.includes('Vercel'), false);
  const helpTroubleshootingAgentIssues = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/troubleshooting/agent-issues');
  assert.ok(helpTroubleshootingAgentIssues);
  assert.equal(helpTroubleshootingAgentIssues.title, 'Agent troubleshooting');
  assert.match(helpTroubleshootingAgentIssues.summary, /How can I improve Agent accuracy/);
  assert.match(helpTroubleshootingAgentIssues.summary, /What if Agent doesn't pick up my files/);
  assert.match(helpTroubleshootingAgentIssues.summary, /How do I undo Agent changes/);
  assert.equal(helpTroubleshootingAgentIssues.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingAgentIssues.summary), false);
  assert.equal(helpTroubleshootingAgentIssues.summary.toLowerCase().includes('curl'), false);
  assert.match(helpTroubleshootingAgentIssues.apply_in_eos, /vendor desktop Agent diagnostics/i);
  assert.match(helpTroubleshootingAgentIssues.apply_in_eos, /\/goal/);
  assert.match(helpTroubleshootingAgentIssues.apply_in_eos, /do not rotate this Cloud Agent into desktop Agent troubleshooting/i);
  assert.match(helpTroubleshootingAgentIssues.apply_in_eos, /environment\.json/);
  assert.match(helpTroubleshootingAgentIssues.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTroubleshootingAgentIssues.apply_in_eos), false);
  assert.equal(helpTroubleshootingAgentIssues.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTroubleshootingAgentIssues.apply_in_eos.includes('Vercel'), false);
  const helpTroubleshootingTabIssues = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/troubleshooting/tab-issues');
  assert.ok(helpTroubleshootingTabIssues);
  assert.equal(helpTroubleshootingTabIssues.title, 'How do I troubleshoot Tab completions?');
  assert.match(helpTroubleshootingTabIssues.summary, /Why aren't Tab suggestions appearing/);
  assert.match(helpTroubleshootingTabIssues.summary, /How can I improve Tab suggestion quality/);
  assert.match(helpTroubleshootingTabIssues.summary, /What if Tab feels slow/);
  assert.equal(helpTroubleshootingTabIssues.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingTabIssues.summary), false);
  assert.equal(helpTroubleshootingTabIssues.summary.toLowerCase().includes('curl'), false);
  assert.match(helpTroubleshootingTabIssues.apply_in_eos, /vendor desktop Tab diagnostics/i);
  assert.match(helpTroubleshootingTabIssues.apply_in_eos, /\/goal/);
  assert.match(helpTroubleshootingTabIssues.apply_in_eos, /do not rotate this Cloud Agent into desktop Tab troubleshooting/i);
  assert.match(helpTroubleshootingTabIssues.apply_in_eos, /environment\.json/);
  assert.match(helpTroubleshootingTabIssues.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTroubleshootingTabIssues.apply_in_eos), false);
  assert.equal(helpTroubleshootingTabIssues.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTroubleshootingTabIssues.apply_in_eos.includes('Vercel'), false);
  const helpTroubleshootingInstallIssues = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/troubleshooting/install-issues');
  assert.ok(helpTroubleshootingInstallIssues);
  assert.equal(helpTroubleshootingInstallIssues.title, 'Installation and startup');
  assert.match(helpTroubleshootingInstallIssues.summary, /What if I see a blank screen on startup/);
  assert.match(helpTroubleshootingInstallIssues.summary, /How do I update Cursor/);
  assert.match(helpTroubleshootingInstallIssues.summary, /What are update channels/);
  assert.equal(helpTroubleshootingInstallIssues.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingInstallIssues.summary), false);
  assert.equal(helpTroubleshootingInstallIssues.summary.toLowerCase().includes('curl'), false);
  assert.match(helpTroubleshootingInstallIssues.apply_in_eos, /vendor desktop install\/startup diagnostics/i);
  assert.match(helpTroubleshootingInstallIssues.apply_in_eos, /\/goal/);
  assert.match(helpTroubleshootingInstallIssues.apply_in_eos, /do not rotate this Cloud Agent into desktop install troubleshooting/i);
  assert.match(helpTroubleshootingInstallIssues.apply_in_eos, /environment\.json/);
  assert.match(helpTroubleshootingInstallIssues.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTroubleshootingInstallIssues.apply_in_eos), false);
  assert.equal(helpTroubleshootingInstallIssues.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTroubleshootingInstallIssues.apply_in_eos.includes('Vercel'), false);
  const helpTroubleshootingNetwork = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/troubleshooting/network');
  assert.ok(helpTroubleshootingNetwork);
  assert.equal(helpTroubleshootingNetwork.title, 'Network, proxy, and remote connections');
  assert.match(helpTroubleshootingNetwork.summary, /How do I run network diagnostics/);
  assert.match(helpTroubleshootingNetwork.summary, /What if AI features stop working behind a proxy/);
  assert.match(helpTroubleshootingNetwork.summary, /Which domains does Cursor need access to/);
  assert.equal(helpTroubleshootingNetwork.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingNetwork.summary), false);
  assert.equal(helpTroubleshootingNetwork.summary.toLowerCase().includes('curl'), false);
  assert.match(helpTroubleshootingNetwork.apply_in_eos, /vendor desktop network\/proxy diagnostics/i);
  assert.match(helpTroubleshootingNetwork.apply_in_eos, /\/goal/);
  assert.match(helpTroubleshootingNetwork.apply_in_eos, /do not rotate this Cloud Agent into desktop network troubleshooting/i);
  assert.match(helpTroubleshootingNetwork.apply_in_eos, /environment\.json/);
  assert.match(helpTroubleshootingNetwork.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTroubleshootingNetwork.apply_in_eos), false);
  assert.equal(helpTroubleshootingNetwork.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTroubleshootingNetwork.apply_in_eos.includes('Vercel'), false);
  const helpTroubleshootingExtensions = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/troubleshooting/extensions');
  assert.ok(helpTroubleshootingExtensions);
  assert.equal(helpTroubleshootingExtensions.title, 'Extension conflicts');
  assert.match(helpTroubleshootingExtensions.summary, /How do I identify a conflicting extension/);
  assert.match(helpTroubleshootingExtensions.summary, /Which extensions commonly conflict/);
  assert.match(helpTroubleshootingExtensions.summary, /How do I disable an extension/);
  assert.equal(helpTroubleshootingExtensions.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingExtensions.summary), false);
  assert.equal(helpTroubleshootingExtensions.summary.toLowerCase().includes('curl'), false);
  assert.match(helpTroubleshootingExtensions.apply_in_eos, /vendor desktop extension-conflict diagnostics/i);
  assert.match(helpTroubleshootingExtensions.apply_in_eos, /\/goal/);
  assert.match(helpTroubleshootingExtensions.apply_in_eos, /do not rotate this Cloud Agent into desktop extension troubleshooting/i);
  assert.match(helpTroubleshootingExtensions.apply_in_eos, /environment\.json/);
  assert.match(helpTroubleshootingExtensions.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTroubleshootingExtensions.apply_in_eos), false);
  assert.equal(helpTroubleshootingExtensions.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTroubleshootingExtensions.apply_in_eos.includes('Vercel'), false);
  const helpTroubleshootingPerformance = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/troubleshooting/performance');
  assert.ok(helpTroubleshootingPerformance);
  assert.equal(helpTroubleshootingPerformance.title, 'Performance');
  assert.match(helpTroubleshootingPerformance.summary, /How do I reduce high CPU or memory usage/);
  assert.match(helpTroubleshootingPerformance.summary, /How do I reduce editor input delay/);
  assert.equal(helpTroubleshootingPerformance.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingPerformance.summary), false);
  assert.equal(helpTroubleshootingPerformance.summary.toLowerCase().includes('curl'), false);
  assert.match(helpTroubleshootingPerformance.apply_in_eos, /vendor desktop CPU\/memory\/input-delay diagnostics/i);
  assert.match(helpTroubleshootingPerformance.apply_in_eos, /\/goal/);
  assert.match(helpTroubleshootingPerformance.apply_in_eos, /do not rotate this Cloud Agent into desktop performance troubleshooting/i);
  assert.match(helpTroubleshootingPerformance.apply_in_eos, /environment\.json/);
  assert.match(helpTroubleshootingPerformance.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTroubleshootingPerformance.apply_in_eos), false);
  assert.equal(helpTroubleshootingPerformance.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTroubleshootingPerformance.apply_in_eos.includes('Vercel'), false);
  const helpTroubleshootingReportingBugs = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/troubleshooting/reporting-bugs');
  assert.ok(helpTroubleshootingReportingBugs);
  assert.equal(helpTroubleshootingReportingBugs.title, 'Reporting a bug');
  assert.match(helpTroubleshootingReportingBugs.summary, /What should I include in a bug report/);
  assert.match(helpTroubleshootingReportingBugs.summary, /Where do I report Cursor bugs/);
  assert.match(helpTroubleshootingReportingBugs.summary, /What is a request ID/);
  assert.equal(helpTroubleshootingReportingBugs.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingReportingBugs.summary), false);
  assert.equal(helpTroubleshootingReportingBugs.summary.toLowerCase().includes('curl'), false);
  assert.match(helpTroubleshootingReportingBugs.apply_in_eos, /vendor desktop bug-report diagnostics/i);
  assert.match(helpTroubleshootingReportingBugs.apply_in_eos, /\/goal/);
  assert.match(helpTroubleshootingReportingBugs.apply_in_eos, /do not rotate this Cloud Agent into desktop bug reporting/i);
  assert.match(helpTroubleshootingReportingBugs.apply_in_eos, /environment\.json/);
  assert.match(helpTroubleshootingReportingBugs.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpTroubleshootingReportingBugs.apply_in_eos), false);
  assert.equal(helpTroubleshootingReportingBugs.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpTroubleshootingReportingBugs.apply_in_eos.includes('Vercel'), false);
  const helpIntegrationsGit = store.learnings.find((row) => row.source_url === 'https://cursor.com/help/integrations/git');
  assert.ok(helpIntegrationsGit);
  assert.equal(helpIntegrationsGit.title, 'Git');
  assert.match(helpIntegrationsGit.summary, /Can Agent write commit messages for me/);
  assert.match(helpIntegrationsGit.summary, /How does AI merge conflict resolution work/);
  assert.match(helpIntegrationsGit.summary, /How does Agent attribution work/);
  assert.equal(helpIntegrationsGit.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpIntegrationsGit.summary), false);
  assert.equal(helpIntegrationsGit.summary.toLowerCase().includes('curl'), false);
  assert.match(helpIntegrationsGit.apply_in_eos, /vendor desktop git\/Source Control features/i);
  assert.match(helpIntegrationsGit.apply_in_eos, /\/goal/);
  assert.match(helpIntegrationsGit.apply_in_eos, /do not rotate this Cloud Agent into desktop git UI/i);
  assert.match(helpIntegrationsGit.apply_in_eos, /GitHub remains source of truth/i);
  assert.match(helpIntegrationsGit.apply_in_eos, /environment\.json/);
  assert.match(helpIntegrationsGit.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(helpIntegrationsGit.apply_in_eos), false);
  assert.equal(helpIntegrationsGit.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(helpIntegrationsGit.apply_in_eos.includes('Vercel'), false);
  const debugMode = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/debug-mode');
  assert.ok(debugMode);
  assert.match(debugMode.summary, /When to use Debug Mode/);
  assert.match(debugMode.summary, /How it works/);
  assert.match(debugMode.summary, /Tips for Debug Mode/);
  assert.equal(debugMode.summary.includes('Sitemap'), false);
  assert.equal(/Switching modes —/.test(debugMode.summary), false);
  assert.equal(/Related —/.test(debugMode.summary), false);
  assert.match(debugMode.apply_in_eos, /optional desktop debugging/i);
  assert.match(debugMode.apply_in_eos, /local Cursor extension/i);
  assert.match(debugMode.apply_in_eos, /Cloud Agent VM/);
  assert.match(debugMode.apply_in_eos, /TDD/);
  assert.match(debugMode.apply_in_eos, /do not rotate this Cloud Agent into Debug Mode/i);
  assert.match(debugMode.apply_in_eos, /\/goal/);
  assert.match(debugMode.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(debugMode.apply_in_eos), false);
  assert.equal(debugMode.apply_in_eos.includes('Custom Mode'), false);
  const designMode = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/design-mode');
  assert.ok(designMode);
  assert.match(designMode.summary, /Ways to direct the agent/);
  assert.match(designMode.summary, /Select an element/);
  assert.match(designMode.summary, /Draw on the page/);
  assert.match(designMode.summary, /What the agent sees/);
  assert.match(designMode.summary, /Work in flow/);
  assert.equal(designMode.summary.includes('Sitemap'), false);
  assert.equal(/Open Design Mode —/.test(designMode.summary), false);
  assert.equal(/Keyboard shortcuts —/.test(designMode.summary), false);
  assert.equal(/Related —/.test(designMode.summary), false);
  assert.match(designMode.apply_in_eos, /optional desktop visual prompting/i);
  assert.match(designMode.apply_in_eos, /Agents Window/);
  assert.match(designMode.apply_in_eos, /Cloud Agent VM/);
  assert.match(designMode.apply_in_eos, /do not rotate this Cloud Agent into Design Mode/i);
  assert.match(designMode.apply_in_eos, /environment\.json/);
  assert.match(designMode.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(designMode.apply_in_eos), false);
  assert.equal(designMode.apply_in_eos.includes('Custom Mode'), false);
  const browserTool = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/tools/browser');
  assert.ok(browserTool);
  assert.match(browserTool.summary, /Native integration/);
  assert.match(browserTool.summary, /Browser capabilities/);
  assert.match(browserTool.summary, /Navigate/);
  assert.match(browserTool.summary, /Session persistence/);
  assert.equal(browserTool.summary.includes('Sitemap'), false);
  assert.equal(/Recommended models —/.test(browserTool.summary), false);
  assert.equal(/Enterprise usage —/.test(browserTool.summary), false);
  assert.equal(/Related —/.test(browserTool.summary), false);
  assert.match(browserTool.apply_in_eos, /optional desktop browser control/i);
  assert.match(browserTool.apply_in_eos, /Cloud Agent VM/);
  assert.match(browserTool.apply_in_eos, /official feeds/i);
  assert.match(browserTool.apply_in_eos, /not live sites/i);
  assert.match(browserTool.apply_in_eos, /do not rotate this Cloud Agent into Browser/i);
  assert.match(browserTool.apply_in_eos, /environment\.json/);
  assert.match(browserTool.apply_in_eos, /not EOS governance/i);
  assert.match(browserTool.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(browserTool.apply_in_eos), false);
  assert.equal(browserTool.apply_in_eos.includes('Custom Mode'), false);
  const terminalTool = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/tools/terminal');
  assert.ok(terminalTool);
  assert.match(terminalTool.summary, /Sandbox/);
  assert.match(terminalTool.summary, /sandbox\.json/);
  assert.match(terminalTool.summary, /CURSOR_AGENT/);
  assert.equal(terminalTool.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(terminalTool.summary), false);
  assert.match(terminalTool.apply_in_eos, /optional desktop shell control/i);
  assert.match(terminalTool.apply_in_eos, /Run Mode/);
  assert.match(terminalTool.apply_in_eos, /sandbox\.json/);
  assert.match(terminalTool.apply_in_eos, /Cloud Agent VM already runs shell commands/);
  assert.match(terminalTool.apply_in_eos, /do not rotate this Cloud Agent into desktop Terminal/i);
  assert.match(terminalTool.apply_in_eos, /environment\.json/);
  assert.match(terminalTool.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(terminalTool.apply_in_eos), false);
  assert.equal(terminalTool.apply_in_eos.includes('Custom Mode'), false);
  const searchTool = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/tools/search');
  assert.ok(searchTool);
  assert.match(searchTool.summary, /Instant Grep/);
  assert.match(searchTool.summary, /Explore subagent/);
  assert.match(searchTool.summary, /Privacy and security/);
  assert.equal(searchTool.summary.includes('Sitemap'), false);
  assert.equal(/FAQ —/.test(searchTool.summary), false);
  assert.match(searchTool.apply_in_eos, /optional desktop Instant Grep/i);
  assert.match(searchTool.apply_in_eos, /Explore subagent/);
  assert.match(searchTool.apply_in_eos, /Cloud Agent VM already searches the workspace/);
  assert.match(searchTool.apply_in_eos, /do not rotate this Cloud Agent into desktop Search/i);
  assert.match(searchTool.apply_in_eos, /environment\.json/);
  assert.match(searchTool.apply_in_eos, /\.cursor\/keys/);
  assert.match(searchTool.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(searchTool.apply_in_eos), false);
  assert.equal(searchTool.apply_in_eos.includes('Custom Mode'), false);
  const canvasTool = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/tools/canvas');
  assert.ok(canvasTool);
  assert.match(canvasTool.summary, /How it works/);
  assert.match(canvasTool.summary, /Opening a canvas/);
  assert.match(canvasTool.summary, /Sharing canvases/);
  assert.match(canvasTool.summary, /Open Canvas/);
  assert.equal(canvasTool.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(canvasTool.summary), false);
  assert.equal(canvasTool.summary.includes('Custom Mode'), false);
  assert.match(canvasTool.apply_in_eos, /optional desktop interactive artifacts/i);
  assert.match(canvasTool.apply_in_eos, /Agents Window/);
  assert.match(canvasTool.apply_in_eos, /Cloud Agent VM/);
  assert.match(canvasTool.apply_in_eos, /do not rotate this Cloud Agent into desktop Canvases/i);
  assert.match(canvasTool.apply_in_eos, /environment\.json/);
  assert.match(canvasTool.apply_in_eos, /not EOS governance/i);
  assert.match(canvasTool.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(canvasTool.apply_in_eos), false);
  assert.equal(canvasTool.apply_in_eos.includes('Custom Mode'), false);
  const worktrees = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/configuration/worktrees');
  assert.ok(worktrees);
  assert.match(worktrees.summary, /Agents Window/);
  assert.match(worktrees.summary, /\.cursor\/worktrees\.json/);
  assert.match(worktrees.summary, /Worktree Skills/);
  assert.equal(worktrees.summary.includes('Sitemap'), false);
  assert.equal(/Example setup configurations —/.test(worktrees.summary), false);
  assert.equal(worktrees.summary.includes('Custom Mode'), false);
  assert.match(worktrees.apply_in_eos, /optional desktop isolated Git checkouts/i);
  assert.match(worktrees.apply_in_eos, /Agents Window/);
  assert.match(worktrees.apply_in_eos, /Cloud Agent VM already has its own checkout/);
  assert.match(worktrees.apply_in_eos, /do not rotate this Cloud Agent into desktop worktrees/i);
  assert.match(worktrees.apply_in_eos, /environment\.json/);
  assert.match(worktrees.apply_in_eos, /\.cursor\/worktrees\.json/);
  assert.match(worktrees.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(worktrees.apply_in_eos), false);
  assert.equal(worktrees.apply_in_eos.includes('Custom Mode'), false);
  assert.equal(worktrees.apply_in_eos.includes('/best-of-n'), false);
  const agentSecurity = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/security');
  assert.ok(agentSecurity);
  assert.match(agentSecurity.summary, /First-party tool calls/);
  assert.match(agentSecurity.summary, /Run Modes/);
  assert.match(agentSecurity.summary, /\.cursorignore/);
  assert.match(agentSecurity.summary, /Third-party tool calls/);
  assert.match(agentSecurity.summary, /Network requests/);
  assert.equal(agentSecurity.summary.includes('Sitemap'), false);
  assert.equal(/Workspace trust —/.test(agentSecurity.summary), false);
  assert.equal(/Responsible disclosure —/.test(agentSecurity.summary), false);
  assert.match(agentSecurity.apply_in_eos, /optional desktop guardrails/i);
  assert.match(agentSecurity.apply_in_eos, /Cloud Agent VM already honors EOS TDD/);
  assert.match(agentSecurity.apply_in_eos, /\.cursorignore/);
  assert.match(agentSecurity.apply_in_eos, /do not rotate this Cloud Agent into desktop Agent Security/i);
  assert.match(agentSecurity.apply_in_eos, /Run Modes/);
  assert.match(agentSecurity.apply_in_eos, /best-effort/);
  assert.match(agentSecurity.apply_in_eos, /environment\.json/);
  assert.match(agentSecurity.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(agentSecurity.apply_in_eos), false);
  assert.equal(agentSecurity.apply_in_eos.includes('Custom Mode'), false);
  const runModes = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/agent/security/run-modes');
  assert.equal(runModes, undefined);
  const originGit = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/origin/git');
  assert.equal(originGit, undefined);
  const originApi = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/api/origin');
  assert.equal(originApi, undefined);
  const cliInstall = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/installation');
  assert.equal(cliInstall, undefined);
  const cliPermissions = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/reference/permissions');
  assert.equal(cliPermissions, undefined);
  const cliChangelog = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/changelog');
  assert.equal(cliChangelog, undefined);
  const cliGithubActions = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/cli/github-actions');
  assert.equal(cliGithubActions, undefined);
  const sdkChangelog = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/sdk/changelog');
  assert.equal(sdkChangelog, undefined);
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
  const customizeCursor = store.learnings.find((row) => row.source_url === 'https://cursor.com/docs/customize-cursor');
  assert.ok(customizeCursor);
  assert.match(customizeCursor.summary, /What you can do from Customize/);
  assert.match(customizeCursor.summary, /Extension components/);
  assert.match(customizeCursor.summary, /plugins, skills, and MCPs/i);
  assert.equal(customizeCursor.summary.includes('Sitemap'), false);
  assert.equal(/Learn more —/.test(customizeCursor.summary), false);
  assert.equal(/Marketplace leaderboard —/.test(customizeCursor.summary), false);
  assert.equal(customizeCursor.summary.includes('Custom Mode'), false);
  assert.match(customizeCursor.apply_in_eos, /optional desktop sidebar/i);
  assert.match(customizeCursor.apply_in_eos, /\.cursor\/mcp\.json/);
  assert.match(customizeCursor.apply_in_eos, /do not rotate this Cloud Agent into desktop Customize/i);
  assert.match(customizeCursor.apply_in_eos, /not EOS governance/i);
  assert.match(customizeCursor.apply_in_eos, /environment\.json/);
  assert.match(customizeCursor.apply_in_eos, /included quota/i);
  assert.equal(/enable/i.test(customizeCursor.apply_in_eos), false);
  assert.equal(customizeCursor.apply_in_eos.includes('Custom Mode'), false);
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
    { title: 'Grok 4.5', link: 'https://cursor.com/help/models-and-usage/grok-4-5' },
    { title: 'Agent mode', link: 'https://cursor.com/help/ai-features/agent' },
    { title: 'Ask mode', link: 'https://cursor.com/help/ai-features/ask-mode' },
    { title: 'Plan mode', link: 'https://cursor.com/help/ai-features/plan-mode' },
    { title: 'Tab completion', link: 'https://cursor.com/help/ai-features/tab' },
    { title: 'Inline edit', link: 'https://cursor.com/help/ai-features/inline-edit' },
    { title: 'Cloud Agents', link: 'https://cursor.com/help/ai-features/cloud-agents' },
    { title: 'What are background agents?', link: 'https://cursor.com/help/ai-features/background-agents' },
    { title: 'Cursor for iOS', link: 'https://cursor.com/help/ai-features/mobile-app' },
    { title: 'Shared transcripts', link: 'https://cursor.com/help/ai-features/shared-transcripts' },
    { title: 'Bugbot', link: 'https://cursor.com/help/ai-features/bugbot' },
    { title: 'Rules', link: 'https://cursor.com/help/customization/rules' },
    { title: 'Skills', link: 'https://cursor.com/help/customization/skills' },
    { title: 'MCP integrations', link: 'https://cursor.com/help/customization/mcp' },
    { title: '@ mentions and context', link: 'https://cursor.com/help/customization/context' },
    { title: 'Ignore files', link: 'https://cursor.com/help/customization/ignore-files' },
    { title: 'Plugins', link: 'https://cursor.com/help/customization/plugins' },
    { title: 'What is multi-agent coding?', link: 'https://cursor.com/help/ai-features/multi-agent' },
    { title: 'Side chats', link: 'https://cursor.com/help/ai-features/side-chats' },
    { title: 'Conversation search', link: 'https://cursor.com/help/ai-features/conversation-search' },
    { title: 'Grok Bot', link: 'https://cursor.com/docs/grok-bot' },
    { title: 'How does AI pair programming work in Cursor?', link: 'https://cursor.com/help/ai-features/ai-pair-programming' },
    { title: 'Quickstart', link: 'https://cursor.com/docs/get-started/quickstart' },
    { title: 'Download and install Cursor', link: 'https://cursor.com/help/getting-started/install' },
    { title: 'Your first project', link: 'https://cursor.com/help/getting-started/first-project' },
    { title: 'How do I build an AI coding agent?', link: 'https://cursor.com/help/getting-started/build-ai-coding-agent' },
    { title: 'Privacy and data', link: 'https://cursor.com/help/security-and-privacy/privacy' },
    { title: 'Regions and model availability', link: 'https://cursor.com/help/security-and-privacy/regions' },
    { title: 'SSO and authentication', link: 'https://cursor.com/help/security-and-privacy/sso' },
    { title: 'Compromised account', link: 'https://cursor.com/help/security-and-privacy/account-compromised' },
    { title: 'Marketplace security', link: 'https://cursor.com/help/security-and-privacy/marketplace-security' },
    { title: 'Agent troubleshooting', link: 'https://cursor.com/help/troubleshooting/agent-issues' },
    { title: 'Tab completions', link: 'https://cursor.com/help/troubleshooting/tab-issues' },
    { title: 'Installation and startup', link: 'https://cursor.com/help/troubleshooting/install-issues' },
    { title: 'Network, proxy, and remote connections', link: 'https://cursor.com/help/troubleshooting/network' },
    { title: 'Extension conflicts', link: 'https://cursor.com/help/troubleshooting/extensions' },
    { title: 'Performance', link: 'https://cursor.com/help/troubleshooting/performance' },
    { title: 'Reporting a bug', link: 'https://cursor.com/help/troubleshooting/reporting-bugs' },
    { title: 'Git', link: 'https://cursor.com/help/integrations/git' },
    { title: 'Models & Pricing', link: 'https://cursor.com/docs/models-and-pricing' },
    { title: 'Automations', link: 'https://cursor.com/help/ai-features/automations' },
    { title: 'Cloud Agent Builds', link: 'https://cursor.com/docs/cloud-agent/builds' },
    { title: 'Start from scratch, without a repo', link: 'https://cursor.com/changelog/start-from-scratch' },
    { title: 'Origin', link: 'https://cursor.com/docs/origin' },
    { title: 'Install the Origin CLI', link: 'https://cursor.com/docs/origin/cli' },
    { title: 'Origin integrations', link: 'https://cursor.com/docs/origin/integrations' },
    { title: 'Mirror a GitHub repository', link: 'https://cursor.com/docs/origin/mirror-github' },
    { title: 'Create an Origin repository', link: 'https://cursor.com/docs/origin/create-repository' },
    { title: 'Pull requests', link: 'https://cursor.com/docs/origin/pull-requests' },
    { title: 'Browse & Search', link: 'https://cursor.com/docs/origin/browse' },
    { title: 'Origin repository settings', link: 'https://cursor.com/docs/origin/settings' },
    { title: 'Settings', link: 'https://cursor.com/docs/origin/settings' },
    { title: 'Codebase settings', link: 'https://cursor.com/docs/origin/codebase-settings' },
    { title: 'Cursor CLI', link: 'https://cursor.com/docs/cli/overview' },
    { title: 'Using Agent in CLI', link: 'https://cursor.com/docs/cli/using' },
    { title: 'Shell Mode', link: 'https://cursor.com/docs/cli/shell-mode' },
    { title: 'ACP', link: 'https://cursor.com/docs/cli/acp' },
    { title: 'Using Headless CLI', link: 'https://cursor.com/docs/cli/headless' },
    { title: 'Cursor TypeScript SDK', link: 'https://cursor.com/docs/sdk/typescript' },
    { title: 'Cursor Python SDK', link: 'https://cursor.com/docs/sdk/python' },
    { title: 'Cursor SDK Bridge', link: 'https://cursor.com/docs/sdk/bridge' },
    { title: 'Team Pricing', link: 'https://cursor.com/docs/account/teams/pricing' },
    { title: 'Members, Roles, and Seat Types', link: 'https://cursor.com/docs/account/teams/members' },
    { title: 'Pricing and plans', link: 'https://cursor.com/help/account-and-billing/pricing' },
    { title: 'Available models', link: 'https://cursor.com/help/models-and-usage/available-models' },
    { title: 'Cursor Router', link: 'https://cursor.com/help/models-and-usage/cursor-router' },
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
    { title: 'Dashboard settings', link: 'https://cursor.com/docs/cloud-agent/settings' },
    { title: 'Private Connectivity', link: 'https://cursor.com/docs/cloud-agent/private-connectivity' },
    { title: 'Bugbot', link: 'https://cursor.com/docs/bugbot' },
    { title: 'Security Agents', link: 'https://cursor.com/docs/security-agents' },
    { title: 'Model Context Protocol (MCP)', link: 'https://cursor.com/docs/mcp' },
    { title: 'Plugins', link: 'https://cursor.com/docs/plugins' },
    { title: 'Customize Cursor', link: 'https://cursor.com/docs/customize-cursor' },
    { title: 'Overview', link: 'https://cursor.com/docs/customize-cursor' },
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

test('applyHint for Start from scratch keeps GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Start from scratch, without a repo',
    link: 'https://cursor.com/changelog/start-from-scratch',
    summary: 'Cloud Agents no longer require a connected GitHub or other third-party SCM provider. Cursor creates an Origin repo. Connect a Vercel account and hit publish.'
  });
  assert.match(hint, /Start from scratch creates an Origin repo without GitHub/i);
  assert.match(hint, /GitHub remains source of truth/i);
  assert.match(hint, /Do not Start from scratch or create an Origin repo/i);
  assert.match(hint, /Cloud Agent VM already has its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Cursor Start'), false);
});

test('applyHint for Origin create-repository keeps GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Create an Origin repository',
    link: 'https://cursor.com/docs/origin/create-repository',
    summary: 'Create a new Origin repository in the UI or with a Cursor agent, then push your first commit.'
  });
  assert.match(hint, /optional paid git hosting/i);
  assert.match(hint, /GitHub remains source of truth/i);
  assert.match(hint, /Do not create an Origin repo/i);
  assert.match(hint, /Do not create an Origin repo or Detach/i);
  assert.match(hint, /Cloud Agent VM already has its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Origin pull-requests keeps GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Pull requests',
    link: 'https://cursor.com/docs/origin/pull-requests',
    summary: 'Open, review, and merge pull requests on Origin. Mirrored GitHub pull requests sync back to GitHub.'
  });
  assert.match(hint, /optional Origin hosting/i);
  assert.match(hint, /GitHub remains source of truth/i);
  assert.match(hint, /Do not open Origin PRs/i);
  assert.match(hint, /Do not open Origin PRs or Detach/i);
  assert.match(hint, /Cloud Agent VM already opens GitHub PRs/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Origin browse keeps GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Browse & Search',
    link: 'https://cursor.com/docs/origin/browse',
    summary: 'Browse files, search code, and inspect commit history in Origin repositories at cursor.com/codebase.'
  });
  assert.match(hint, /optional Origin hosting/i);
  assert.match(hint, /GitHub remains source of truth/i);
  assert.match(hint, /Do not use Origin browse/i);
  assert.match(hint, /Do not use Origin browse or Detach/i);
  assert.match(hint, /Cloud Agent VM already searches its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Origin settings keeps GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Settings',
    link: 'https://cursor.com/docs/origin/settings',
    summary: 'Manage an Origin repository: sync status, access, rules and protections, and third-party apps.'
  });
  assert.match(hint, /optional Origin hosting/i);
  assert.match(hint, /GitHub remains source of truth/i);
  assert.match(hint, /Do not Detach/i);
  assert.match(hint, /Origin Apps/i);
  assert.match(hint, /Cloud Agent VM already uses its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Origin codebase settings keeps GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Codebase settings',
    link: 'https://cursor.com/docs/origin/codebase-settings',
    summary: 'Manage team-level Origin codebase settings: permissions and internal apps for the Origin API.'
  });
  assert.match(hint, /optional team-level Origin hosting/i);
  assert.match(hint, /GitHub remains source of truth/i);
  assert.match(hint, /claim a codebase name/i);
  assert.match(hint, /Origin Apps/i);
  assert.match(hint, /Origin API tokens/i);
  assert.match(hint, /Cloud Agent VM already uses its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Cursor CLI keeps this watch in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Cursor CLI',
    link: 'https://cursor.com/docs/cli/overview',
    summary: 'Get started with Cursor CLI to code in your terminal'
  });
  assert.match(hint, /optional local terminal agent/i);
  assert.match(hint, /without the local agent CLI/i);
  assert.match(hint, /Do not install Cursor CLI/i);
  assert.match(hint, /print mode/i);
  assert.match(hint, /Cloud Agent handoff/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Using Agent in CLI keeps this watch in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Using Agent in CLI',
    link: 'https://cursor.com/docs/cli/using',
    summary: 'Use Agent from the command line with prompting strategies, MCP support, and rule integration. Navigate conversations, review changes, and manage command approval.'
  });
  assert.match(hint, /optional local terminal agent/i);
  assert.match(hint, /without the local agent CLI/i);
  assert.match(hint, /print mode/i);
  assert.match(hint, /worktrees/i);
  assert.match(hint, /ACP/i);
  assert.match(hint, /Cloud Agent handoff/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for CLI Shell Mode keeps this Cloud Agent VM running shell commands', () => {
  const hint = applyHint({
    title: 'Shell Mode',
    link: 'https://cursor.com/docs/cli/shell-mode',
    summary: 'Use Cursor CLI in Shell Mode for continuous interaction with Agent. Leverage context persistence and command history for complex development tasks.'
  });
  assert.match(hint, /optional local Cursor CLI/i);
  assert.match(hint, /already runs shell commands/i);
  assert.match(hint, /Do not rotate this watch into Cursor CLI Shell Mode/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for CLI ACP keeps this watch without a custom ACP client', () => {
  const hint = applyHint({
    title: 'ACP',
    link: 'https://cursor.com/docs/cli/acp',
    summary: 'Use Agent Client Protocol (ACP) with Cursor CLI to run `agent acp` as a protocol server for custom clients.'
  });
  assert.match(hint, /optional local Cursor CLI protocol/i);
  assert.match(hint, /without an ACP client/i);
  assert.match(hint, /Do not rotate this watch into agent acp/i);
  assert.match(hint, /IDE integrations/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Headless CLI keeps this watch without print mode', () => {
  const hint = applyHint({
    title: 'Using Headless CLI',
    link: 'https://cursor.com/docs/cli/headless',
    summary: 'Run Cursor CLI in headless mode for automation and CI/CD pipelines. Configure non-interactive usage with API keys and scripting support.'
  });
  assert.match(hint, /optional local Cursor CLI for scripts/i);
  assert.match(hint, /without print mode/i);
  assert.match(hint, /Do not rotate this watch into print mode/i);
  assert.match(hint, /--force/);
  assert.match(hint, /Do not put CURSOR_API_KEY in git/);
  assert.match(hint, /\/goal/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for TypeScript SDK keeps this watch on official feeds', () => {
  const hint = applyHint({
    title: 'Cursor TypeScript SDK',
    link: 'https://cursor.com/docs/sdk/typescript',
    summary: 'Cursor TypeScript SDK lets you create and manage Cursor agents programmatically with the @cursor/sdk TypeScript package.'
  });
  assert.match(hint, /optional agent scripting/i);
  assert.match(hint, /official feeds/i);
  assert.match(hint, /@cursor\/sdk/);
  assert.match(hint, /api\.cursor\.com/);
  assert.match(hint, /Do not install @cursor\/sdk/i);
  assert.match(hint, /SDK scripts/i);
  assert.match(hint, /Do not put CURSOR_API_KEY in git/);
  assert.match(hint, /GitHub/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Python SDK keeps this watch on official feeds', () => {
  const hint = applyHint({
    title: 'Cursor Python SDK',
    link: 'https://cursor.com/docs/sdk/python',
    summary: 'Cursor Python SDK lets you create and manage Cursor agents programmatically from Python.'
  });
  assert.match(hint, /optional agent scripting/i);
  assert.match(hint, /official feeds/i);
  assert.match(hint, /cursor-sdk/);
  assert.match(hint, /api\.cursor\.com/);
  assert.match(hint, /Do not install cursor-sdk/i);
  assert.match(hint, /SDK scripts/i);
  assert.match(hint, /Do not put CURSOR_API_KEY in git/);
  assert.match(hint, /GitHub/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for SDK Bridge keeps this watch on official feeds', () => {
  const hint = applyHint({
    title: 'Cursor SDK Bridge',
    link: 'https://cursor.com/docs/sdk/bridge',
    summary: 'Build Cursor agent SDKs in Go, Rust, Java, and other languages on the open sdk.v1 bridge protocol.'
  });
  assert.match(hint, /optional local protocol/i);
  assert.match(hint, /without a first-party SDK/i);
  assert.match(hint, /official feeds/i);
  assert.match(hint, /cursor-sdk-bridge/);
  assert.match(hint, /api\.cursor\.com/);
  assert.match(hint, /Do not install the SDK Bridge/i);
  assert.match(hint, /adapter scripts/i);
  assert.match(hint, /Do not put CURSOR_API_KEY in git/);
  assert.match(hint, /GitHub/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Team Pricing keeps included quota and rejects vendor seat prices', () => {
  const hint = applyHint({
    title: 'Team Pricing',
    link: 'https://cursor.com/docs/account/teams/pricing',
    summary: 'There are two business plans: Teams and Enterprise (Custom).'
  });
  assert.match(hint, /vendor Teams and Enterprise billing/i);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.match(hint, /vendor team seat prices/i);
  assert.match(hint, /EOS budget evidence/i);
  assert.match(hint, /not a Teams admin dashboard/i);
  assert.match(hint, /environment\.json/);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Team Members keeps this Cloud Agent off the Teams dashboard', () => {
  const hint = applyHint({
    title: 'Members, Roles, and Seat Types',
    link: 'https://cursor.com/docs/account/teams/members',
    summary: 'Cursor Teams use roles for permissions and seat types for usage limits.'
  });
  assert.match(hint, /vendor Teams admin config/i);
  assert.match(hint, /roles, and seat types/i);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.match(hint, /not a Teams admin dashboard/i);
  assert.match(hint, /Teams setup or SSO pages/i);
  assert.match(hint, /environment\.json/);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Help Pricing keeps included quota and rejects dashboard billing changes', () => {
  const hint = applyHint({
    title: 'Pricing and plans',
    link: 'https://cursor.com/help/account-and-billing/pricing',
    summary: 'Cursor Router will launch for Teams and Enterprise plans. Individual plans (Hobby, Pro, Pro+, Ultra) will receive this update a few months after launch.'
  });
  assert.match(hint, /vendor individual and Teams plan names/i);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.match(hint, /vendor plan prices/i);
  assert.match(hint, /EOS budget evidence/i);
  assert.match(hint, /Do not change this Cloud Agent billing from the dashboard/i);
  assert.match(hint, /environment\.json/);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Help Available models keeps included quota and rejects API keys', () => {
  const hint = applyHint({
    title: 'Available models',
    link: 'https://cursor.com/help/models-and-usage/available-models',
    summary: 'Cursor Router routes across GPT-5.5, Claude Opus 5, Grok 4.5, and Claude Fable 5. Team admins manage model access. To use Router from code, call Cursor.models.list() in the TypeScript SDK.'
  });
  assert.match(hint, /vendor model names and Auto routing/i);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.match(hint, /vendor model rates/i);
  assert.match(hint, /EOS budget evidence/i);
  assert.match(hint, /Do not put API keys in git/i);
  assert.match(hint, /@cursor\/sdk/);
  assert.match(hint, /environment\.json/);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
});

test('applyHint for Help Cursor Router keeps Auto modes and rejects SDK install', () => {
  const hint = applyHint({
    title: 'Cursor Router',
    link: 'https://cursor.com/help/models-and-usage/cursor-router',
    summary: 'Team admins can enable-disable Cursor Router. TypeScript SDK and Python SDK expose auto-smart. See Custom Mode and Microsoft Teams.'
  });
  assert.match(hint, /vendor Auto routing/i);
  assert.match(hint, /Cost, Balance, and Intelligence/i);
  assert.match(hint, /EOS rules still bind/i);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.match(hint, /@cursor\/sdk/);
  assert.match(hint, /Do not put API keys in git/i);
  assert.match(hint, /environment\.json/);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
  assert.equal(hint.includes('Microsoft Teams'), false);
});

test('applyHint for Help Grok 4.5 keeps included-credit treatment and rejects quality claims', () => {
  const hint = applyHint({
    title: 'Grok 4.5',
    link: 'https://cursor.com/help/models-and-usage/grok-4-5',
    summary: 'You cannot change the effort level or enable Fast mode on Cursor Start. Enterprise teams need to enable Grok 4.5. TypeScript SDK and Custom Mode.'
  });
  assert.match(hint, /prior vendor Cursor Model/i);
  assert.match(hint, /Auto vs Composer pool/i);
  assert.match(hint, /included-credit treatment/i);
  assert.match(hint, /vendor quality claims/i);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.match(hint, /@cursor\/sdk/);
  assert.match(hint, /Do not put API keys in git/i);
  assert.match(hint, /environment\.json/);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('curl'), false);
  assert.equal(hint.includes('Cursor Start'), false);
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

test('applyHint for Cloud Agent settings rejects team follow-ups as EOS governance', () => {
  const hint = applyHint({
    title: 'Dashboard settings',
    link: 'https://cursor.com/docs/cloud-agent/settings',
    summary: 'Workspace admin settings for Cloud Agents.'
  });
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /Builds/);
  assert.match(hint, /allowlist/i);
  assert.match(hint, /team follow-ups/i);
  assert.match(hint, /secrets/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Custom Mode'), false);
});

test('applyHint for Private Connectivity keeps this watch on public cloud', () => {
  const hint = applyHint({
    title: 'Private Connectivity',
    link: 'https://cursor.com/docs/cloud-agent/private-connectivity',
    summary: 'Connect Cursor to private Git providers with AWS PrivateLink or Cloudflare Tunnel.'
  });
  assert.match(hint, /public cloud/i);
  assert.match(hint, /Enterprise-only/i);
  assert.match(hint, /not required/i);
  assert.match(hint, /GitHub/i);
  assert.match(hint, /tunnel tokens/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('10.2.8.0'), false);
});

test('applyHint for Bugbot keeps TDD evidence and GitHub as source of truth', () => {
  const hint = applyHint({
    title: 'Bugbot',
    link: 'https://cursor.com/docs/bugbot',
    summary: 'Bugbot reviews pull requests and identifies bugs. Use /review-bugbot before you push.'
  });
  assert.match(hint, /optional PR review/i);
  assert.match(hint, /TDD evidence remains required/i);
  assert.match(hint, /\/review-bugbot/);
  assert.match(hint, /not a substitute for tests/i);
  assert.match(hint, /GitHub/i);
  assert.match(hint, /integration setup/i);
  assert.match(hint, /API keys/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Security Agents keeps EOS security-auditor as Control Plane check', () => {
  const hint = applyHint({
    title: 'Security Agents',
    link: 'https://cursor.com/docs/security-agents',
    summary: 'Security Agents include Security Reviewer and Vulnerability Scanner. Use /review-security before you push.'
  });
  assert.match(hint, /vendor PR reviewer/i);
  assert.match(hint, /security-auditor/);
  assert.match(hint, /Control Plane check/i);
  assert.match(hint, /\/review-security/);
  assert.match(hint, /not a substitute/i);
  assert.match(hint, /vendor finding counts/i);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Approval Agents keeps TDD evidence and exact policy filenames', () => {
  const hint = applyHint({
    title: 'PR Routing & Approval',
    link: 'https://cursor.com/docs/approval-agents',
    summary: 'PR Routing & Approval routes pull requests to the right reviewers and can approve low-risk changes.'
  });
  assert.match(hint, /optional vendor automation/i);
  assert.match(hint, /TDD/);
  assert.match(hint, /human review/i);
  assert.match(hint, /APPROVAL_POLICY\.md/);
  assert.match(hint, /\.cursor\/approval-policies\/ROUTING\.md/);
  assert.match(hint, /auto-approve/i);
  assert.match(hint, /GitHub/i);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Cursor for iOS keeps this watch in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Cursor for iOS',
    link: 'https://cursor.com/docs/cloud-agent/mobile',
    summary: 'Cursor for iOS is a native mobile app. Use /remote-control to hand off a session.'
  });
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /iPhone|iPad/);
  assert.match(hint, /optional beta client/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /\/remote-control/);
  assert.match(hint, /Privacy Mode \(Legacy\)/);
  assert.match(hint, /GitHub|GitLab/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Cloud Agents API keeps this watch on official feeds', () => {
  const hint = applyHint({
    title: 'Cloud Agents API',
    link: 'https://cursor.com/docs/cloud-agent/api/endpoints',
    summary: 'The Cloud Agents API lets you programmatically launch and manage cloud agents.'
  });
  assert.match(hint, /official feeds/i);
  assert.match(hint, /not the Cloud Agents API/i);
  assert.match(hint, /api\.cursor\.com/);
  assert.match(hint, /API keys/i);
  assert.match(hint, /GitHub/i);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Agents Window keeps this watch in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Agents Window',
    link: 'https://cursor.com/docs/agent/agents-window',
    summary: 'The Agents Window is Cursor\'s agent-first interface. Use /in-cloud or /autopilot for cloud subagents.'
  });
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /not in the desktop Agents Window/i);
  assert.match(hint, /\/in-cloud/);
  assert.match(hint, /\/autopilot/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Agent Review keeps TDD evidence and /agent-review', () => {
  const hint = applyHint({
    title: 'Agent Review',
    link: 'https://cursor.com/docs/agent/agent-review',
    summary: 'Agent Review runs a dedicated code review on your local changes. Use /agent-review on demand.'
  });
  assert.match(hint, /optional in-editor review/i);
  assert.match(hint, /TDD/);
  assert.match(hint, /\/agent-review/);
  assert.match(hint, /not a substitute/i);
  assert.match(hint, /BUGBOT\.md/);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Help Agent mode keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Agent mode',
    link: 'https://cursor.com/help/ai-features/agent',
    summary: 'Start conversations, give instructions, review changes, and interrupt Agent. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor desktop Agent/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Agent mode/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Ask mode keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Ask mode',
    link: 'https://cursor.com/help/ai-features/ask-mode',
    summary: 'Explore code and ask questions without making changes. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor desktop read-only Agent/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Ask mode/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Plan mode keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Plan mode',
    link: 'https://cursor.com/help/ai-features/plan-mode',
    summary: 'Review a detailed plan before Agent writes code. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor desktop planning/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Plan mode/i);
  assert.match(hint, /TDD/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Tab keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Tab completion',
    link: 'https://cursor.com/help/ai-features/tab',
    summary: 'Accept, reject, and configure AI-powered code suggestions. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor desktop autocomplete/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Tab/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Inline edit keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Inline edit',
    link: 'https://cursor.com/help/ai-features/inline-edit',
    summary: 'Make quick, targeted code changes without leaving the editor. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor desktop Cmd\+K/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Inline edit/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Cloud Agents keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Cloud Agents',
    link: 'https://cursor.com/help/ai-features/cloud-agents',
    summary: 'Run AI coding tasks in the cloud while you keep working. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor isolated-VM Agent/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Move to Cloud/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Background Agents keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'What are background agents?',
    link: 'https://cursor.com/help/ai-features/background-agents',
    summary: 'Background agents run coding tasks asynchronously in the cloud while you keep working. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor isolated-VM Agent/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop background agents/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Cursor for iOS keeps this watch in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Cursor for iOS',
    link: 'https://cursor.com/help/ai-features/mobile-app',
    summary: 'Direct, supervise, and review agents from your iPhone or iPad. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor mobile Cloud Agent client/i);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /do not rotate this Cloud Agent into the iOS app/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Shared transcripts keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Shared transcripts',
    link: 'https://cursor.com/help/ai-features/shared-transcripts',
    summary: 'Share read-only copies of your AI conversations with teammates or the public. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor conversation sharing/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into shared transcripts/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Bugbot keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Bugbot',
    link: 'https://cursor.com/help/ai-features/bugbot',
    summary: 'You can enable usage-based billing. Open Bugbot in Automations to enable it on specific repositories. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor PR review/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into Bugbot dashboard setup/i);
  assert.match(hint, /TDD/);
  assert.match(hint, /GitHub/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Rules keeps .mdc and team dashboard off EOS governance', () => {
  const hint = applyHint({
    title: 'Rules',
    link: 'https://cursor.com/help/customization/rules',
    summary: 'Optional rules are enabled by default. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor Agent instructions/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into dashboard team rules/i);
  assert.match(hint, /\.mdc/);
  assert.match(hint, /AGENTS\.md/);
  assert.match(hint, /\/create-rule/);
  assert.match(hint, /Team dashboard rules are not EOS governance/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Skills keeps repo skills off Custom Mode', () => {
  const hint = applyHint({
    title: 'Skills',
    link: 'https://cursor.com/help/customization/skills',
    summary: 'Pin an EOS skill as a Custom Mode. Optional skills are enabled by default. Vercel.'
  });
  assert.match(hint, /vendor Agent workflows/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into dashboard team skills/i);
  assert.match(hint, /SKILL\.md/);
  assert.match(hint, /\.cursor\/skills/);
  assert.match(hint, /\/create-skill/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help MCP keeps .cursor/mcp.json and rejects API keys', () => {
  const hint = applyHint({
    title: 'MCP integrations',
    link: 'https://cursor.com/help/customization/mcp',
    summary: 'Optional MCP is enabled by default. Custom Mode and Vercel. API_KEY=secret.'
  });
  assert.match(hint, /vendor Agent integrations/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into dashboard team MCP/i);
  assert.match(hint, /\.cursor\/mcp\.json/);
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /API keys/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('API_KEY'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Context keeps this watch searching the Cloud Agent VM', () => {
  const hint = applyHint({
    title: '@ mentions and context',
    link: 'https://cursor.com/help/customization/context',
    summary: 'Optional @ mentions are enabled by default. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor Agent @ mentions/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop @ mentions/i);
  assert.match(hint, /Cloud Agent VM already searches/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Ignore files keeps .cursorignore and secrets out of git', () => {
  const hint = applyHint({
    title: 'Ignore files',
    link: 'https://cursor.com/help/customization/ignore-files',
    summary: 'Optional ignore files are enabled by default. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor Agent context exclusions/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop ignore-file setup/i);
  assert.match(hint, /\.cursorignore/);
  assert.match(hint, /Do not put secrets in git/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Plugins keeps repo playbooks off team marketplace', () => {
  const hint = applyHint({
    title: 'Plugins',
    link: 'https://cursor.com/help/customization/plugins',
    summary: 'Optional plugins are enabled by default. Custom Mode and Vercel.'
  });
  assert.match(hint, /vendor Agent reusable tools/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into dashboard team marketplace/i);
  assert.match(hint, /\.cursor\/mcp\.json/);
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help multi-agent keeps this Cloud Agent as one isolated VM', () => {
  const hint = applyHint({
    title: 'What is multi-agent coding?',
    link: 'https://cursor.com/help/ai-features/multi-agent',
    summary: 'Optional multi-agent is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop Agents Window parallelism/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Agents Window/i);
  assert.match(hint, /\/multitask/);
  assert.match(hint, /Build in Parallel/);
  assert.match(hint, /already runs one isolated agent/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
});

test('applyHint for Help Side chats keeps this Cloud Agent off desktop /side', () => {
  const hint = applyHint({
    title: 'Side chats',
    link: 'https://cursor.com/help/ai-features/side-chats',
    summary: 'Optional side chats are enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor local-only side conversations/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into \/side/i);
  assert.match(hint, /desktop side chats/i);
  assert.match(hint, /has no side chats/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Park tangents'), false);
});

test('applyHint for Help Conversation search keeps this watch searching the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Conversation search',
    link: 'https://cursor.com/help/ai-features/conversation-search',
    summary: 'Optional conversation search is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop transcript search/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop conversation search/i);
  assert.match(hint, /already searches the workspace/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Instant Grep'), false);
});

test('applyHint for Grok Bot docs keeps this Cloud Agent off the Grok Bot app', () => {
  const hint = applyHint({
    title: 'Grok Bot',
    link: 'https://cursor.com/docs/grok-bot',
    summary: 'Optional Grok Bot is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor persistent-cloud Bots/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into the Grok Bot desktop or iOS app/i);
  assert.match(hint, /no Grok Bot Linux app/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('changelog + forum'), false);
});

test('applyHint for Help AI pair programming keeps this Cloud Agent off desktop pair-programming chat', () => {
  const hint = applyHint({
    title: 'How does AI pair programming work in Cursor?',
    link: 'https://cursor.com/help/ai-features/ai-pair-programming',
    summary: 'Optional AI pair programming is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop Agent coworking/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop pair-programming chat/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Cursor Learn'), false);
});

test('applyHint for Quickstart keeps this Cloud Agent off desktop first-run', () => {
  const hint = applyHint({
    title: 'Quickstart',
    link: 'https://cursor.com/docs/get-started/quickstart',
    summary: 'Optional Quickstart is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop first-run/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop first-run or quickstart/i);
  assert.match(hint, /already has its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help install keeps this Cloud Agent off desktop install', () => {
  const hint = applyHint({
    title: 'Download and install Cursor',
    link: 'https://cursor.com/help/getting-started/install',
    summary: 'Optional Help install is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop first-run/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop install or first-run/i);
  assert.match(hint, /already has its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help first project keeps this Cloud Agent off desktop first-project', () => {
  const hint = applyHint({
    title: 'Your first project',
    link: 'https://cursor.com/help/getting-started/first-project',
    summary: 'Optional Help first project is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop first-run/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop first-project or first-run/i);
  assert.match(hint, /already has its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help build AI coding agent keeps this watch on /goal and does not install @cursor/sdk', () => {
  const hint = applyHint({
    title: 'How do I build an AI coding agent?',
    link: 'https://cursor.com/help/getting-started/build-ai-coding-agent',
    summary: 'Optional Help build AI coding agent is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor custom-agent SDK how-to/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into building a custom coding agent or installing @cursor\/sdk/i);
  assert.match(hint, /already has its GitHub checkout/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help Privacy keeps this Cloud Agent off desktop Privacy Mode settings', () => {
  const hint = applyHint({
    title: 'Privacy and data',
    link: 'https://cursor.com/help/security-and-privacy/privacy',
    summary: 'Optional Help Privacy is enabled by default. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor Privacy Mode data-handling/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Privacy Mode settings/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help Regions keeps this Cloud Agent off desktop region, API-key, and Cursor Start settings', () => {
  const hint = applyHint({
    title: 'Regions and model availability',
    link: 'https://cursor.com/help/security-and-privacy/regions',
    summary: 'Optional Help Regions remains enabled by default. Custom Mode and Vercel. Use Slack. Cursor Start is enabled outside India.'
  });
  assert.match(hint, /vendor region\/model-availability data-handling/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop region, API-key, or Cursor Start settings/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help SSO keeps this Cloud Agent off desktop or team SSO settings', () => {
  const hint = applyHint({
    title: 'SSO and authentication',
    link: 'https://cursor.com/help/security-and-privacy/sso',
    summary: 'Optional Help SSO is enabled by default. Custom Mode and Vercel. Use Slack. SCIM is enabled with SSO.'
  });
  assert.match(hint, /vendor team SAML authentication/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop or team SSO settings/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help Compromised account keeps this Cloud Agent off dashboard session revoke, billing, and API-key settings', () => {
  const hint = applyHint({
    title: 'Compromised account',
    link: 'https://cursor.com/help/security-and-privacy/account-compromised',
    summary: 'Optional Help Compromised account is enabled by default. Custom Mode and Vercel. Use Slack. Enable two-factor authentication.'
  });
  assert.match(hint, /vendor compromised-account incident response/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into dashboard session revoke, billing, or API-key settings/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help Marketplace security keeps this Cloud Agent off marketplace plugin install', () => {
  const hint = applyHint({
    title: 'Marketplace security',
    link: 'https://cursor.com/help/security-and-privacy/marketplace-security',
    summary: 'Optional Help Marketplace security is enabled by default. Custom Mode and Vercel. Use Slack. Team marketplace plugins are enabled.'
  });
  assert.match(hint, /vendor marketplace plugin review/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into marketplace plugin install/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
  assert.equal(hint.includes('Team MCP marketplace is vendor distribution'), false);
});

test('applyHint for Help Agent troubleshooting keeps this Cloud Agent off desktop Agent troubleshooting', () => {
  const hint = applyHint({
    title: 'Agent troubleshooting',
    link: 'https://cursor.com/help/troubleshooting/agent-issues',
    summary: 'Optional Help Agent troubleshooting is enabled by default. Custom Mode and Vercel. Use Slack. Agent diagnostics are enabled.'
  });
  assert.match(hint, /vendor desktop Agent diagnostics/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Agent troubleshooting/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help Tab troubleshooting keeps this Cloud Agent off desktop Tab troubleshooting', () => {
  const hint = applyHint({
    title: 'Tab completions',
    link: 'https://cursor.com/help/troubleshooting/tab-issues',
    summary: 'Optional Help Tab troubleshooting is enabled by default. Custom Mode and Vercel. Use Slack. HTTP Compatibility Mode is enabled.'
  });
  assert.match(hint, /vendor desktop Tab diagnostics/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Tab troubleshooting/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help install troubleshooting keeps this Cloud Agent off desktop install troubleshooting', () => {
  const hint = applyHint({
    title: 'Installation and startup',
    link: 'https://cursor.com/help/troubleshooting/install-issues',
    summary: 'Optional Help install troubleshooting is enabled by default. Custom Mode and Vercel. Use Slack. Reinstall from cursor.com/download.'
  });
  assert.match(hint, /vendor desktop install\/startup diagnostics/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop install troubleshooting/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help network troubleshooting keeps this Cloud Agent off desktop network troubleshooting', () => {
  const hint = applyHint({
    title: 'Network, proxy, and remote connections',
    link: 'https://cursor.com/help/troubleshooting/network',
    summary: 'Optional Help network troubleshooting is enabled by default. Custom Mode and Vercel. Use Slack. marketplace.cursorapi.com and HTTP Compatibility Mode.'
  });
  assert.match(hint, /vendor desktop network\/proxy diagnostics/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop network troubleshooting/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
  assert.equal(hint.includes('marketplace'), false);
});

test('applyHint for Help extension troubleshooting keeps this Cloud Agent off desktop extension troubleshooting', () => {
  const hint = applyHint({
    title: 'Extension conflicts',
    link: 'https://cursor.com/help/troubleshooting/extensions',
    summary: 'Optional Help extension troubleshooting is enabled by default. Re-enable extensions. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop extension-conflict diagnostics/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop extension troubleshooting/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
});

test('applyHint for Help performance troubleshooting keeps this Cloud Agent off desktop performance troubleshooting', () => {
  const hint = applyHint({
    title: 'Performance',
    link: 'https://cursor.com/help/troubleshooting/performance',
    summary: 'Optional Help performance troubleshooting is enabled by default. Re-enable extensions. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop CPU\/memory\/input-delay diagnostics/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop performance troubleshooting/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
  const customizationExtensions = applyHint({
    title: 'Performance',
    link: 'https://cursor.com/help/customization/extensions',
    summary: 'Optional Help performance troubleshooting is enabled by default. Re-enable extensions.'
  });
  assert.equal(/vendor desktop CPU\/memory\/input-delay diagnostics/i.test(customizationExtensions), false);
  assert.match(customizationExtensions, /Review this official Cursor item/);
});

test('applyHint for Help bug-report troubleshooting keeps this Cloud Agent off desktop bug reporting', () => {
  const hint = applyHint({
    title: 'Reporting a bug',
    link: 'https://cursor.com/help/troubleshooting/reporting-bugs',
    summary: 'Optional Help bug-report troubleshooting is enabled by default. Privacy Mode enabled. Temporarily enable Share Data. Custom Mode and Vercel. Use Slack.'
  });
  assert.match(hint, /vendor desktop bug-report diagnostics/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop bug reporting/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
  const forumBug = applyHint({
    title: 'Reporting a bug',
    link: 'https://forum.cursor.com/t/reporting-a-bug/1',
    summary: 'Optional Help bug-report troubleshooting is enabled by default. Privacy Mode enabled.'
  });
  assert.equal(/vendor desktop bug-report diagnostics/i.test(forumBug), false);
});

test('applyHint for Help Git keeps this Cloud Agent off desktop git UI', () => {
  const hint = applyHint({
    title: 'Git',
    link: 'https://cursor.com/help/integrations/git',
    summary: 'Optional Help Git is enabled by default. Custom Mode and Vercel. Use Slack. Cursor Blame.'
  });
  assert.match(hint, /vendor desktop git\/Source Control features/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop git UI/i);
  assert.match(hint, /GitHub remains source of truth/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.match(hint, /on-demand/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('Vercel'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('Slack'), false);
  assert.equal(hint.includes('Plan Mode'), false);
  const originGit = applyHint({
    title: 'Git',
    link: 'https://cursor.com/docs/origin/git',
    summary: 'Optional Help Git is enabled by default. Origin git hosting.'
  });
  assert.equal(/vendor desktop git\/Source Control features/i.test(originGit), false);
  const cursorBlame = applyHint({
    title: 'Git',
    link: 'https://cursor.com/docs/integrations/cursor-blame',
    summary: 'Optional Help Git is enabled by default. Cursor Blame.'
  });
  assert.equal(/vendor desktop git\/Source Control features/i.test(cursorBlame), false);
});

test('applyHint for Plan Mode keeps this watch on the standing /goal', () => {
  const hint = applyHint({
    title: 'Plan Mode',
    link: 'https://cursor.com/docs/agent/plan-mode',
    summary: 'Plan Mode creates detailed implementation plans before writing any code.'
  });
  assert.match(hint, /optional desktop planning/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /do not rotate this Cloud Agent into Plan Mode/i);
  assert.match(hint, /TDD/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Debug Mode keeps EOS TDD in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Debug Mode',
    link: 'https://cursor.com/docs/agent/debug-mode',
    summary: 'Debug Mode helps you find root causes using runtime logs.'
  });
  assert.match(hint, /optional desktop debugging/i);
  assert.match(hint, /local Cursor extension/i);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /TDD/);
  assert.match(hint, /do not rotate this Cloud Agent into Debug Mode/i);
  assert.match(hint, /\/goal/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Design Mode keeps this watch in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Design Mode',
    link: 'https://cursor.com/docs/agent/design-mode',
    summary: 'Design Mode lets you direct agents with visual prompts in the Agents Window browser.'
  });
  assert.match(hint, /optional desktop visual prompting/i);
  assert.match(hint, /Agents Window/);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /do not rotate this Cloud Agent into Design Mode/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Browser keeps this watch on official feeds', () => {
  const hint = applyHint({
    title: 'Browser',
    link: 'https://cursor.com/docs/agent/tools/browser',
    summary: 'Agent can control a web browser to test applications and audit accessibility.'
  });
  assert.match(hint, /optional desktop browser control/i);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /official feeds/i);
  assert.match(hint, /not live sites/i);
  assert.match(hint, /do not rotate this Cloud Agent into Browser/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Terminal keeps this Cloud Agent VM running shell commands', () => {
  const hint = applyHint({
    title: 'Terminal',
    link: 'https://cursor.com/docs/agent/tools/terminal',
    summary: 'Cursor runs shell commands with Run Mode and sandbox.json.'
  });
  assert.match(hint, /optional desktop shell control/i);
  assert.match(hint, /Run Mode/);
  assert.match(hint, /sandbox\.json/);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Terminal/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Search keeps this Cloud Agent VM searching the workspace', () => {
  const hint = applyHint({
    title: 'Search',
    link: 'https://cursor.com/docs/agent/tools/search',
    summary: 'How Agent searches your codebase with Instant Grep and the Explore subagent.'
  });
  assert.match(hint, /optional desktop Instant Grep/i);
  assert.match(hint, /Explore subagent/);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Search/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /\.cursor\/keys/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Canvases keeps this watch in the Cloud Agent VM', () => {
  const hint = applyHint({
    title: 'Canvases',
    link: 'https://cursor.com/docs/agent/tools/canvas',
    summary: 'Canvases let Cursor render dashboards and custom interfaces as interactive artifacts alongside the chat.'
  });
  assert.match(hint, /optional desktop interactive artifacts/i);
  assert.match(hint, /Agents Window/);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Canvases/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
});

test('applyHint for Worktrees keeps this Cloud Agent VM on its own checkout', () => {
  const hint = applyHint({
    title: 'Worktrees',
    link: 'https://cursor.com/docs/configuration/worktrees',
    summary: 'Run agents in isolated Git worktrees from the Agents Window.'
  });
  assert.match(hint, /optional desktop isolated Git checkouts/i);
  assert.match(hint, /Agents Window/);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop worktrees/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /\.cursor\/worktrees\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('/best-of-n'), false);
});

test('applyHint for Agent Security keeps this watch on EOS TDD and .cursorignore', () => {
  const hint = applyHint({
    title: 'Agent Security',
    link: 'https://cursor.com/docs/agent/security',
    summary: 'Security considerations for using Cursor Agent'
  });
  assert.match(hint, /optional desktop guardrails/i);
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /TDD/);
  assert.match(hint, /\.cursorignore/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Agent Security/i);
  assert.match(hint, /Run Modes/);
  assert.match(hint, /best-effort/);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
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

test('applyHint for Customize Cursor keeps repo playbooks and rejects dashboard Customize', () => {
  const hint = applyHint({
    title: 'Overview',
    link: 'https://cursor.com/docs/customize-cursor',
    summary: 'Use the Customize page to add plugins, skills, MCPs, rules, commands, hooks, and subagents.'
  });
  assert.match(hint, /optional desktop sidebar/i);
  assert.match(hint, /\.cursor\/mcp\.json/);
  assert.match(hint, /do not rotate this Cloud Agent into desktop Customize/i);
  assert.match(hint, /not EOS governance/i);
  assert.match(hint, /environment\.json/);
  assert.match(hint, /included quota/i);
  assert.equal(/enable/i.test(hint), false);
  assert.equal(hint.includes('Custom Mode'), false);
  assert.equal(hint.includes('timers'), false);
  assert.equal(hint.includes('/goal'), false);
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

  const originCreateRepo = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-create-repository.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/create-repository'
  );
  assert.equal(originCreateRepo[0].id, 'https://cursor.com/docs/origin/create-repository');
  assert.equal(originCreateRepo[0].title, 'Create an Origin repository');
  assert.match(originCreateRepo[0].summary, /Create a new Origin repository/i);
  assert.match(applyHint(originCreateRepo[0]), /optional paid git hosting/i);
  assert.match(applyHint(originCreateRepo[0]), /Do not create an Origin repo/i);
  assert.equal(/enable/i.test(applyHint(originCreateRepo[0])), false);
  assert.equal(applyHint(originCreateRepo[0]).includes('Custom Mode'), false);

  const originPullRequests = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-pull-requests.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/pull-requests'
  );
  assert.equal(originPullRequests[0].id, 'https://cursor.com/docs/origin/pull-requests');
  assert.equal(originPullRequests[0].title, 'Pull requests');
  assert.match(originPullRequests[0].summary, /Open, review, and merge pull requests/i);
  assert.match(applyHint(originPullRequests[0]), /optional Origin hosting/i);
  assert.match(applyHint(originPullRequests[0]), /Do not open Origin PRs/i);
  assert.equal(/enable/i.test(applyHint(originPullRequests[0])), false);
  assert.equal(applyHint(originPullRequests[0]).includes('Custom Mode'), false);

  const originBrowse = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-browse.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/browse'
  );
  assert.equal(originBrowse[0].id, 'https://cursor.com/docs/origin/browse');
  assert.equal(originBrowse[0].title, 'Browse & Search');
  assert.match(originBrowse[0].summary, /Browse files, search code/i);
  assert.match(applyHint(originBrowse[0]), /optional Origin hosting/i);
  assert.match(applyHint(originBrowse[0]), /Do not use Origin browse/i);
  assert.equal(/enable/i.test(applyHint(originBrowse[0])), false);
  assert.equal(applyHint(originBrowse[0]).includes('Custom Mode'), false);

  const originSettings = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-settings.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/settings'
  );
  assert.equal(originSettings[0].id, 'https://cursor.com/docs/origin/settings');
  assert.equal(originSettings[0].title, 'Origin repository settings');
  assert.match(originSettings[0].summary, /Manage an Origin repository/i);
  assert.match(applyHint(originSettings[0]), /optional Origin hosting/i);
  assert.match(applyHint(originSettings[0]), /Do not Detach/i);
  assert.equal(/enable/i.test(applyHint(originSettings[0])), false);
  assert.equal(applyHint(originSettings[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(originSettings[0]).includes('Vercel'), false);

  const originCodebaseSettings = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-codebase-settings.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/origin/codebase-settings'
  );
  assert.equal(originCodebaseSettings[0].id, 'https://cursor.com/docs/origin/codebase-settings');
  assert.equal(originCodebaseSettings[0].title, 'Codebase settings');
  assert.match(originCodebaseSettings[0].summary, /Manage team-level Origin codebase/);
  assert.match(applyHint(originCodebaseSettings[0]), /optional team-level Origin hosting/i);
  assert.match(applyHint(originCodebaseSettings[0]), /claim a codebase name/i);
  assert.equal(/enable/i.test(applyHint(originCodebaseSettings[0])), false);
  assert.equal(applyHint(originCodebaseSettings[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(originCodebaseSettings[0]).includes('Vercel'), false);

  const cursorCli = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-overview.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cli/overview'
  );
  assert.equal(cursorCli[0].id, 'https://cursor.com/docs/cli/overview');
  assert.equal(cursorCli[0].title, 'Cursor CLI');
  assert.match(cursorCli[0].summary, /Get started with Cursor CLI/);
  assert.match(applyHint(cursorCli[0]), /optional local terminal agent/i);
  assert.match(applyHint(cursorCli[0]), /Do not install Cursor CLI/i);
  assert.equal(/enable/i.test(applyHint(cursorCli[0])), false);
  assert.equal(applyHint(cursorCli[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorCli[0]).includes('curl'), false);

  const cursorCliUsing = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-using.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cli/using'
  );
  assert.equal(cursorCliUsing[0].id, 'https://cursor.com/docs/cli/using');
  assert.equal(cursorCliUsing[0].title, 'Using Agent in CLI');
  assert.match(cursorCliUsing[0].summary, /Use Agent from the command line/);
  assert.match(applyHint(cursorCliUsing[0]), /optional local terminal agent/i);
  assert.match(applyHint(cursorCliUsing[0]), /worktrees/i);
  assert.equal(/enable/i.test(applyHint(cursorCliUsing[0])), false);
  assert.equal(applyHint(cursorCliUsing[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorCliUsing[0]).includes('curl'), false);

  const cursorCliShellMode = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-shell-mode.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cli/shell-mode'
  );
  assert.equal(cursorCliShellMode[0].id, 'https://cursor.com/docs/cli/shell-mode');
  assert.equal(cursorCliShellMode[0].title, 'Shell Mode');
  assert.match(cursorCliShellMode[0].summary, /Use Cursor CLI in Shell Mode/);
  assert.match(applyHint(cursorCliShellMode[0]), /optional local Cursor CLI/i);
  assert.match(applyHint(cursorCliShellMode[0]), /already runs shell commands/i);
  assert.equal(/enable/i.test(applyHint(cursorCliShellMode[0])), false);
  assert.equal(applyHint(cursorCliShellMode[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorCliShellMode[0]).includes('curl'), false);

  const cursorCliAcp = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-acp.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cli/acp'
  );
  assert.equal(cursorCliAcp[0].id, 'https://cursor.com/docs/cli/acp');
  assert.equal(cursorCliAcp[0].title, 'ACP');
  assert.match(cursorCliAcp[0].summary, /Use Agent Client Protocol/);
  assert.match(applyHint(cursorCliAcp[0]), /optional local Cursor CLI protocol/i);
  assert.match(applyHint(cursorCliAcp[0]), /without an ACP client/i);
  assert.equal(/enable/i.test(applyHint(cursorCliAcp[0])), false);
  assert.equal(applyHint(cursorCliAcp[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorCliAcp[0]).includes('curl'), false);

  const cursorCliHeadless = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-headless.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cli/headless'
  );
  assert.equal(cursorCliHeadless[0].id, 'https://cursor.com/docs/cli/headless');
  assert.equal(cursorCliHeadless[0].title, 'Using Headless CLI');
  assert.match(cursorCliHeadless[0].summary, /Run Cursor CLI in headless mode/);
  assert.match(applyHint(cursorCliHeadless[0]), /optional local Cursor CLI for scripts/i);
  assert.match(applyHint(cursorCliHeadless[0]), /without print mode/i);
  assert.equal(/enable/i.test(applyHint(cursorCliHeadless[0])), false);
  assert.equal(applyHint(cursorCliHeadless[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorCliHeadless[0]).includes('curl'), false);

  const cursorSdkTypescript = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-sdk-typescript.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/sdk/typescript'
  );
  assert.equal(cursorSdkTypescript[0].id, 'https://cursor.com/docs/sdk/typescript');
  assert.equal(cursorSdkTypescript[0].title, 'Cursor TypeScript SDK');
  assert.match(cursorSdkTypescript[0].summary, /@cursor\/sdk TypeScript package/);
  assert.match(applyHint(cursorSdkTypescript[0]), /optional agent scripting/i);
  assert.match(applyHint(cursorSdkTypescript[0]), /official feeds/i);
  assert.equal(/enable/i.test(applyHint(cursorSdkTypescript[0])), false);
  assert.equal(applyHint(cursorSdkTypescript[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorSdkTypescript[0]).includes('curl'), false);

  const cursorSdkPython = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-sdk-python.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/sdk/python'
  );
  assert.equal(cursorSdkPython[0].id, 'https://cursor.com/docs/sdk/python');
  assert.equal(cursorSdkPython[0].title, 'Cursor Python SDK');
  assert.match(cursorSdkPython[0].summary, /programmatically from Python/);
  assert.match(applyHint(cursorSdkPython[0]), /optional agent scripting/i);
  assert.match(applyHint(cursorSdkPython[0]), /cursor-sdk/);
  assert.equal(/enable/i.test(applyHint(cursorSdkPython[0])), false);
  assert.equal(applyHint(cursorSdkPython[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorSdkPython[0]).includes('curl'), false);

  const cursorSdkBridge = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-sdk-bridge.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/sdk/bridge'
  );
  assert.equal(cursorSdkBridge[0].id, 'https://cursor.com/docs/sdk/bridge');
  assert.equal(cursorSdkBridge[0].title, 'Cursor SDK Bridge');
  assert.match(cursorSdkBridge[0].summary, /sdk\.v1 bridge protocol/);
  assert.match(applyHint(cursorSdkBridge[0]), /optional local protocol/i);
  assert.match(applyHint(cursorSdkBridge[0]), /cursor-sdk-bridge/);
  assert.equal(/enable/i.test(applyHint(cursorSdkBridge[0])), false);
  assert.equal(applyHint(cursorSdkBridge[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(cursorSdkBridge[0]).includes('curl'), false);

  const teamPricing = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-account-teams-pricing.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/account/teams/pricing'
  );
  assert.equal(teamPricing[0].id, 'https://cursor.com/docs/account/teams/pricing');
  assert.equal(teamPricing[0].title, 'Team Pricing');
  assert.match(teamPricing[0].summary, /business plans/);
  assert.match(applyHint(teamPricing[0]), /vendor Teams and Enterprise billing/i);
  assert.match(applyHint(teamPricing[0]), /vendor team seat prices/i);
  assert.equal(/enable/i.test(applyHint(teamPricing[0])), false);
  assert.equal(applyHint(teamPricing[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(teamPricing[0]).includes('Slack'), false);
  assert.equal(applyHint(teamPricing[0]).includes('curl'), false);

  const teamMembers = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-account-teams-members.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/account/teams/members'
  );
  assert.equal(teamMembers[0].id, 'https://cursor.com/docs/account/teams/members');
  assert.equal(teamMembers[0].title, 'Members, Roles, and Seat Types');
  assert.match(teamMembers[0].summary, /roles, seat types, and permissions/);
  assert.match(applyHint(teamMembers[0]), /vendor Teams admin config/i);
  assert.match(applyHint(teamMembers[0]), /Teams setup or SSO pages/i);
  assert.equal(/enable/i.test(applyHint(teamMembers[0])), false);
  assert.equal(applyHint(teamMembers[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(teamMembers[0]).includes('Slack'), false);
  assert.equal(applyHint(teamMembers[0]).includes('curl'), false);

  const helpPricing = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-account-and-billing-pricing.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/account-and-billing/pricing'
  );
  assert.equal(helpPricing[0].id, 'https://cursor.com/help/account-and-billing/pricing');
  assert.equal(helpPricing[0].title, 'Pricing and plans');
  assert.match(helpPricing[0].summary, /Compare plans and manage upgrades/);
  assert.match(applyHint(helpPricing[0]), /vendor individual and Teams plan names/i);
  assert.match(applyHint(helpPricing[0]), /Do not change this Cloud Agent billing from the dashboard/i);
  assert.equal(/enable/i.test(applyHint(helpPricing[0])), false);
  assert.equal(applyHint(helpPricing[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpPricing[0]).includes('Slack'), false);
  assert.equal(applyHint(helpPricing[0]).includes('curl'), false);

  const helpAvailableModels = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-models-and-usage-available-models.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/models-and-usage/available-models'
  );
  assert.equal(helpAvailableModels[0].id, 'https://cursor.com/help/models-and-usage/available-models');
  assert.equal(helpAvailableModels[0].title, 'Available models');
  assert.match(helpAvailableModels[0].summary, /Which AI models you can use/);
  assert.match(applyHint(helpAvailableModels[0]), /vendor model names and Auto routing/i);
  assert.match(applyHint(helpAvailableModels[0]), /Do not put API keys in git/i);
  assert.equal(/enable/i.test(applyHint(helpAvailableModels[0])), false);
  assert.equal(applyHint(helpAvailableModels[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpAvailableModels[0]).includes('Slack'), false);
  assert.equal(applyHint(helpAvailableModels[0]).includes('curl'), false);

  const helpCursorRouter = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-models-and-usage-cursor-router.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/models-and-usage/cursor-router'
  );
  assert.equal(helpCursorRouter[0].id, 'https://cursor.com/help/models-and-usage/cursor-router');
  assert.equal(helpCursorRouter[0].title, 'Cursor Router');
  assert.match(helpCursorRouter[0].summary, /How Cursor Router picks models for Auto/);
  assert.match(applyHint(helpCursorRouter[0]), /vendor Auto routing/i);
  assert.match(applyHint(helpCursorRouter[0]), /Cost, Balance, and Intelligence/i);
  assert.match(applyHint(helpCursorRouter[0]), /Do not put API keys in git/i);
  assert.equal(/enable/i.test(applyHint(helpCursorRouter[0])), false);
  assert.equal(applyHint(helpCursorRouter[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpCursorRouter[0]).includes('Slack'), false);
  assert.equal(applyHint(helpCursorRouter[0]).includes('curl'), false);

  const helpGrok45 = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-models-and-usage-grok-4-5.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/models-and-usage/grok-4-5'
  );
  assert.equal(helpGrok45[0].id, 'https://cursor.com/help/models-and-usage/grok-4-5');
  assert.equal(helpGrok45[0].title, 'Grok 4.5');
  assert.match(helpGrok45[0].summary, /What Grok 4.5 is/);
  assert.match(applyHint(helpGrok45[0]), /prior vendor Cursor Model/i);
  assert.match(applyHint(helpGrok45[0]), /Do not treat vendor quality claims/i);
  assert.equal(/enable/i.test(applyHint(helpGrok45[0])), false);
  assert.equal(applyHint(helpGrok45[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpGrok45[0]).includes('Slack'), false);
  assert.equal(applyHint(helpGrok45[0]).includes('curl'), false);

  const helpAgentMode = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-agent.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/agent'
  );
  assert.equal(helpAgentMode[0].id, 'https://cursor.com/help/ai-features/agent');
  assert.equal(helpAgentMode[0].title, 'Agent mode');
  assert.match(helpAgentMode[0].summary, /Start conversations, give instructions, review changes, and interrupt Agent/);
  assert.match(applyHint(helpAgentMode[0]), /vendor desktop Agent/i);
  assert.match(applyHint(helpAgentMode[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpAgentMode[0])), false);
  assert.equal(applyHint(helpAgentMode[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpAgentMode[0]).includes('Vercel'), false);

  const helpAskMode = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-ask-mode.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/ask-mode'
  );
  assert.equal(helpAskMode[0].id, 'https://cursor.com/help/ai-features/ask-mode');
  assert.equal(helpAskMode[0].title, 'Ask mode');
  assert.match(helpAskMode[0].summary, /Explore code and ask questions without making changes/);
  assert.match(applyHint(helpAskMode[0]), /vendor desktop read-only Agent/i);
  assert.match(applyHint(helpAskMode[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpAskMode[0])), false);
  assert.equal(applyHint(helpAskMode[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpAskMode[0]).includes('Vercel'), false);

  const helpPlanMode = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-plan-mode.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/plan-mode'
  );
  assert.equal(helpPlanMode[0].id, 'https://cursor.com/help/ai-features/plan-mode');
  assert.equal(helpPlanMode[0].title, 'Plan mode');
  assert.match(helpPlanMode[0].summary, /Review a detailed plan before Agent writes code/);
  assert.match(applyHint(helpPlanMode[0]), /vendor desktop planning/i);
  assert.match(applyHint(helpPlanMode[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpPlanMode[0])), false);
  assert.equal(applyHint(helpPlanMode[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpPlanMode[0]).includes('Vercel'), false);

  const helpTab = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-tab.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/tab'
  );
  assert.equal(helpTab[0].id, 'https://cursor.com/help/ai-features/tab');
  assert.equal(helpTab[0].title, 'Tab completion');
  assert.match(helpTab[0].summary, /Accept, reject, and configure AI-powered code suggestions/);
  assert.match(applyHint(helpTab[0]), /vendor desktop autocomplete/i);
  assert.match(applyHint(helpTab[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTab[0])), false);
  assert.equal(applyHint(helpTab[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTab[0]).includes('Vercel'), false);

  const helpInlineEdit = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-inline-edit.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/inline-edit'
  );
  assert.equal(helpInlineEdit[0].id, 'https://cursor.com/help/ai-features/inline-edit');
  assert.equal(helpInlineEdit[0].title, 'Inline edit');
  assert.match(helpInlineEdit[0].summary, /Make quick, targeted code changes without leaving the editor/);
  assert.match(applyHint(helpInlineEdit[0]), /vendor desktop Cmd\+K/i);
  assert.match(applyHint(helpInlineEdit[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpInlineEdit[0])), false);
  assert.equal(applyHint(helpInlineEdit[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpInlineEdit[0]).includes('Vercel'), false);

  const helpCloudAgents = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-cloud-agents.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/cloud-agents'
  );
  assert.equal(helpCloudAgents[0].id, 'https://cursor.com/help/ai-features/cloud-agents');
  assert.equal(helpCloudAgents[0].title, 'Cloud Agents');
  assert.match(helpCloudAgents[0].summary, /Run AI coding tasks in the cloud while you keep working/);
  assert.match(applyHint(helpCloudAgents[0]), /vendor isolated-VM Agent/i);
  assert.match(applyHint(helpCloudAgents[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpCloudAgents[0])), false);
  assert.equal(applyHint(helpCloudAgents[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpCloudAgents[0]).includes('Vercel'), false);

  const helpBackgroundAgents = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-background-agents.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/background-agents'
  );
  assert.equal(helpBackgroundAgents[0].id, 'https://cursor.com/help/ai-features/background-agents');
  assert.equal(helpBackgroundAgents[0].title, 'What are background agents?');
  assert.match(helpBackgroundAgents[0].summary, /Background agents run coding tasks asynchronously in the cloud while you keep working/);
  assert.match(applyHint(helpBackgroundAgents[0]), /vendor isolated-VM Agent/i);
  assert.match(applyHint(helpBackgroundAgents[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpBackgroundAgents[0])), false);
  assert.equal(applyHint(helpBackgroundAgents[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpBackgroundAgents[0]).includes('Vercel'), false);

  const helpMobileApp = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-mobile-app.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/mobile-app'
  );
  assert.equal(helpMobileApp[0].id, 'https://cursor.com/help/ai-features/mobile-app');
  assert.equal(helpMobileApp[0].title, 'Cursor for iOS');
  assert.match(helpMobileApp[0].summary, /Direct, supervise, and review agents running in the cloud and on your computer from your iPhone or iPad/);
  assert.match(applyHint(helpMobileApp[0]), /vendor mobile Cloud Agent client/i);
  assert.match(applyHint(helpMobileApp[0]), /Cloud Agent VM/);
  assert.equal(/enable/i.test(applyHint(helpMobileApp[0])), false);
  assert.equal(applyHint(helpMobileApp[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpMobileApp[0]).includes('Vercel'), false);

  const helpSharedTranscripts = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-shared-transcripts.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/shared-transcripts'
  );
  assert.equal(helpSharedTranscripts[0].id, 'https://cursor.com/help/ai-features/shared-transcripts');
  assert.equal(helpSharedTranscripts[0].title, 'Shared transcripts');
  assert.match(helpSharedTranscripts[0].summary, /Share read-only copies of your AI conversations with teammates or the public/);
  assert.match(applyHint(helpSharedTranscripts[0]), /vendor conversation sharing/i);
  assert.match(applyHint(helpSharedTranscripts[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSharedTranscripts[0])), false);
  assert.equal(applyHint(helpSharedTranscripts[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSharedTranscripts[0]).includes('Vercel'), false);

  const helpBugbot = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-bugbot.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/bugbot'
  );
  assert.equal(helpBugbot[0].id, 'https://cursor.com/help/ai-features/bugbot');
  assert.equal(helpBugbot[0].title, 'Bugbot');
  assert.match(helpBugbot[0].summary, /Automated PR reviews that catch bugs, security issues, and code quality problems/);
  assert.match(applyHint(helpBugbot[0]), /vendor PR review/i);
  assert.match(applyHint(helpBugbot[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpBugbot[0])), false);
  assert.equal(applyHint(helpBugbot[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpBugbot[0]).includes('Vercel'), false);

  const helpRules = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-rules.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/customization/rules'
  );
  assert.equal(helpRules[0].id, 'https://cursor.com/help/customization/rules');
  assert.equal(helpRules[0].title, 'Rules');
  assert.match(helpRules[0].summary, /Give Agent persistent instructions for coding style, patterns, and workflows/);
  assert.match(applyHint(helpRules[0]), /vendor Agent instructions/i);
  assert.match(applyHint(helpRules[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpRules[0])), false);
  assert.equal(applyHint(helpRules[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpRules[0]).includes('Vercel'), false);

  const helpSkills = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-skills.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/customization/skills'
  );
  assert.equal(helpSkills[0].id, 'https://cursor.com/help/customization/skills');
  assert.equal(helpSkills[0].title, 'Skills');
  assert.match(helpSkills[0].summary, /Reusable workflows Agent can follow for specific tasks/);
  assert.match(applyHint(helpSkills[0]), /vendor Agent workflows/i);
  assert.match(applyHint(helpSkills[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSkills[0])), false);
  assert.equal(applyHint(helpSkills[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSkills[0]).includes('Vercel'), false);

  const helpMcp = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-mcp.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/customization/mcp'
  );
  assert.equal(helpMcp[0].id, 'https://cursor.com/help/customization/mcp');
  assert.equal(helpMcp[0].title, 'MCP integrations');
  assert.match(helpMcp[0].summary, /Connect Cursor to external tools and data sources with Model Context Protocol/);
  assert.match(applyHint(helpMcp[0]), /vendor Agent integrations/i);
  assert.match(applyHint(helpMcp[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpMcp[0])), false);
  assert.equal(applyHint(helpMcp[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpMcp[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpMcp[0]).includes('API_KEY'), false);

  const helpContext = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-context.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/customization/context'
  );
  assert.equal(helpContext[0].id, 'https://cursor.com/help/customization/context');
  assert.equal(helpContext[0].title, '@ mentions and context');
  assert.match(helpContext[0].summary, /Reference files, folders, and more in conversations/);
  assert.match(applyHint(helpContext[0]), /vendor Agent @ mentions/i);
  assert.match(applyHint(helpContext[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpContext[0])), false);
  assert.equal(applyHint(helpContext[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpContext[0]).includes('Vercel'), false);

  const helpIgnoreFiles = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-ignore-files.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/customization/ignore-files'
  );
  assert.equal(helpIgnoreFiles[0].id, 'https://cursor.com/help/customization/ignore-files');
  assert.equal(helpIgnoreFiles[0].title, 'Ignore files');
  assert.match(helpIgnoreFiles[0].summary, /Exclude files and folders from AI context/);
  assert.match(applyHint(helpIgnoreFiles[0]), /vendor Agent context exclusions/i);
  assert.match(applyHint(helpIgnoreFiles[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpIgnoreFiles[0])), false);
  assert.equal(applyHint(helpIgnoreFiles[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpIgnoreFiles[0]).includes('Vercel'), false);

  const helpPlugins = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-plugins.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/customization/plugins'
  );
  assert.equal(helpPlugins[0].id, 'https://cursor.com/help/customization/plugins');
  assert.equal(helpPlugins[0].title, 'Plugins');
  assert.match(helpPlugins[0].summary, /Install and manage plugins from the Cursor Marketplace/);
  assert.match(applyHint(helpPlugins[0]), /vendor Agent reusable tools/i);
  assert.match(applyHint(helpPlugins[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpPlugins[0])), false);
  assert.equal(applyHint(helpPlugins[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpPlugins[0]).includes('Vercel'), false);

  const helpMultiAgent = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-multi-agent.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/multi-agent'
  );
  assert.equal(helpMultiAgent[0].id, 'https://cursor.com/help/ai-features/multi-agent');
  assert.equal(helpMultiAgent[0].title, 'What is multi-agent coding?');
  assert.match(helpMultiAgent[0].summary, /Multi-agent coding runs several AI agents in parallel/);
  assert.match(applyHint(helpMultiAgent[0]), /vendor desktop Agents Window parallelism/i);
  assert.match(applyHint(helpMultiAgent[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpMultiAgent[0])), false);
  assert.equal(applyHint(helpMultiAgent[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpMultiAgent[0]).includes('Vercel'), false);

  const helpSideChats = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-side-chats.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/side-chats'
  );
  assert.equal(helpSideChats[0].id, 'https://cursor.com/help/ai-features/side-chats');
  assert.equal(helpSideChats[0].title, 'Side chats');
  assert.match(helpSideChats[0].summary, /Open a parallel agent conversation to explore ideas without interrupting your main chat/);
  assert.match(applyHint(helpSideChats[0]), /vendor local-only side conversations/i);
  assert.match(applyHint(helpSideChats[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSideChats[0])), false);
  assert.equal(applyHint(helpSideChats[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSideChats[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpSideChats[0]).includes('Park tangents'), false);

  const helpConversationSearch = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-conversation-search.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/conversation-search'
  );
  assert.equal(helpConversationSearch[0].id, 'https://cursor.com/help/ai-features/conversation-search');
  assert.equal(helpConversationSearch[0].title, 'Conversation search');
  assert.match(helpConversationSearch[0].summary, /Search past agent transcripts and find matches inside an open conversation/);
  assert.match(applyHint(helpConversationSearch[0]), /vendor desktop transcript search/i);
  assert.match(applyHint(helpConversationSearch[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpConversationSearch[0])), false);
  assert.equal(applyHint(helpConversationSearch[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpConversationSearch[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpConversationSearch[0]).includes('Instant Grep'), false);

  const grokBotDocs = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-grok-bot.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/grok-bot'
  );
  assert.equal(grokBotDocs[0].id, 'https://cursor.com/docs/grok-bot');
  assert.equal(grokBotDocs[0].title, 'Grok Bot');
  assert.match(grokBotDocs[0].summary, /Persistent AI Bots that finish real work on a cloud computer/);
  assert.match(applyHint(grokBotDocs[0]), /vendor persistent-cloud Bots/i);
  assert.match(applyHint(grokBotDocs[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(grokBotDocs[0])), false);
  assert.equal(applyHint(grokBotDocs[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(grokBotDocs[0]).includes('Vercel'), false);
  assert.equal(applyHint(grokBotDocs[0]).includes('changelog + forum'), false);

  const helpAiPairProgramming = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-ai-pair-programming.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/ai-features/ai-pair-programming'
  );
  assert.equal(helpAiPairProgramming[0].id, 'https://cursor.com/help/ai-features/ai-pair-programming');
  assert.equal(helpAiPairProgramming[0].title, 'How does AI pair programming work in Cursor?');
  assert.match(helpAiPairProgramming[0].summary, /AI pair programming puts you and a coding agent on the same task/);
  assert.match(applyHint(helpAiPairProgramming[0]), /vendor desktop Agent coworking/i);
  assert.match(applyHint(helpAiPairProgramming[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpAiPairProgramming[0])), false);
  assert.equal(applyHint(helpAiPairProgramming[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpAiPairProgramming[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpAiPairProgramming[0]).includes('Cursor Learn'), false);

  const getStartedQuickstart = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-get-started-quickstart.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/get-started/quickstart'
  );
  assert.equal(getStartedQuickstart[0].id, 'https://cursor.com/docs/get-started/quickstart');
  assert.equal(getStartedQuickstart[0].title, 'Quickstart');
  assert.match(getStartedQuickstart[0].summary, /Go from install to your first useful change in Cursor/);
  assert.match(applyHint(getStartedQuickstart[0]), /vendor desktop first-run/i);
  assert.match(applyHint(getStartedQuickstart[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(getStartedQuickstart[0])), false);
  assert.equal(applyHint(getStartedQuickstart[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(getStartedQuickstart[0]).includes('Vercel'), false);
  assert.equal(applyHint(getStartedQuickstart[0]).includes('Plan Mode'), false);

  const helpGettingStartedInstall = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-getting-started-install.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/getting-started/install'
  );
  assert.equal(helpGettingStartedInstall[0].id, 'https://cursor.com/help/getting-started/install');
  assert.equal(helpGettingStartedInstall[0].title, 'Download and install Cursor');
  assert.match(helpGettingStartedInstall[0].summary, /Get Cursor running on Mac, Windows, or Linux/);
  assert.match(applyHint(helpGettingStartedInstall[0]), /vendor desktop first-run/i);
  assert.match(applyHint(helpGettingStartedInstall[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpGettingStartedInstall[0])), false);
  assert.equal(applyHint(helpGettingStartedInstall[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpGettingStartedInstall[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpGettingStartedInstall[0]).includes('Plan Mode'), false);

  const helpGettingStartedFirstProject = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-getting-started-first-project.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/getting-started/first-project'
  );
  assert.equal(helpGettingStartedFirstProject[0].id, 'https://cursor.com/help/getting-started/first-project');
  assert.equal(helpGettingStartedFirstProject[0].title, 'Your first project');
  assert.match(helpGettingStartedFirstProject[0].summary, /Open a folder, run your first Agent task, and review changes/);
  assert.match(applyHint(helpGettingStartedFirstProject[0]), /vendor desktop first-run/i);
  assert.match(applyHint(helpGettingStartedFirstProject[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpGettingStartedFirstProject[0])), false);
  assert.equal(applyHint(helpGettingStartedFirstProject[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpGettingStartedFirstProject[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpGettingStartedFirstProject[0]).includes('Plan Mode'), false);

  const helpGettingStartedBuildAiCodingAgent = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-getting-started-build-ai-coding-agent.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/getting-started/build-ai-coding-agent'
  );
  assert.equal(helpGettingStartedBuildAiCodingAgent[0].id, 'https://cursor.com/help/getting-started/build-ai-coding-agent');
  assert.equal(helpGettingStartedBuildAiCodingAgent[0].title, 'How do I build an AI coding agent?');
  assert.match(helpGettingStartedBuildAiCodingAgent[0].summary, /Cursor SDK to run custom agents on Cursor's runtime/);
  assert.match(helpGettingStartedBuildAiCodingAgent[0].summary, /Here's how to start/);
  assert.match(applyHint(helpGettingStartedBuildAiCodingAgent[0]), /vendor custom-agent SDK how-to/i);
  assert.match(applyHint(helpGettingStartedBuildAiCodingAgent[0]), /\/goal/);
  assert.match(applyHint(helpGettingStartedBuildAiCodingAgent[0]), /@cursor\/sdk/);
  assert.equal(/enable/i.test(applyHint(helpGettingStartedBuildAiCodingAgent[0])), false);
  assert.equal(applyHint(helpGettingStartedBuildAiCodingAgent[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpGettingStartedBuildAiCodingAgent[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpGettingStartedBuildAiCodingAgent[0]).includes('Plan Mode'), false);

  const helpSecurityAndPrivacyPrivacy = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-privacy.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/security-and-privacy/privacy'
  );
  assert.equal(helpSecurityAndPrivacyPrivacy[0].id, 'https://cursor.com/help/security-and-privacy/privacy');
  assert.equal(helpSecurityAndPrivacyPrivacy[0].title, 'Privacy and data');
  assert.match(helpSecurityAndPrivacyPrivacy[0].summary, /How Cursor handles your code, Privacy Mode, and data retention/);
  assert.match(applyHint(helpSecurityAndPrivacyPrivacy[0]), /vendor Privacy Mode data-handling/i);
  assert.match(applyHint(helpSecurityAndPrivacyPrivacy[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSecurityAndPrivacyPrivacy[0])), false);
  assert.equal(applyHint(helpSecurityAndPrivacyPrivacy[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyPrivacy[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyPrivacy[0]).includes('Plan Mode'), false);

  const helpSecurityAndPrivacyRegions = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-regions.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/security-and-privacy/regions'
  );
  assert.equal(helpSecurityAndPrivacyRegions[0].id, 'https://cursor.com/help/security-and-privacy/regions');
  assert.equal(helpSecurityAndPrivacyRegions[0].title, 'Regions and model availability');
  assert.match(helpSecurityAndPrivacyRegions[0].summary, /Why some models may not be available in your region/);
  assert.match(applyHint(helpSecurityAndPrivacyRegions[0]), /vendor region\/model-availability data-handling/i);
  assert.match(applyHint(helpSecurityAndPrivacyRegions[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSecurityAndPrivacyRegions[0])), false);
  assert.equal(applyHint(helpSecurityAndPrivacyRegions[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyRegions[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyRegions[0]).includes('Plan Mode'), false);

  const helpSecurityAndPrivacySso = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-sso.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/security-and-privacy/sso'
  );
  assert.equal(helpSecurityAndPrivacySso[0].id, 'https://cursor.com/help/security-and-privacy/sso');
  assert.equal(helpSecurityAndPrivacySso[0].title, 'SSO and authentication');
  assert.match(helpSecurityAndPrivacySso[0].summary, /Set up SAML single sign-on for your team/);
  assert.match(applyHint(helpSecurityAndPrivacySso[0]), /vendor team SAML authentication/i);
  assert.match(applyHint(helpSecurityAndPrivacySso[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSecurityAndPrivacySso[0])), false);
  assert.equal(applyHint(helpSecurityAndPrivacySso[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSecurityAndPrivacySso[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpSecurityAndPrivacySso[0]).includes('Plan Mode'), false);

  const helpSecurityAndPrivacyAccountCompromised = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-account-compromised.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/security-and-privacy/account-compromised'
  );
  assert.equal(helpSecurityAndPrivacyAccountCompromised[0].id, 'https://cursor.com/help/security-and-privacy/account-compromised');
  assert.equal(helpSecurityAndPrivacyAccountCompromised[0].title, 'Compromised account');
  assert.match(helpSecurityAndPrivacyAccountCompromised[0].summary, /What to do if you suspect unauthorized access to your Cursor account/);
  assert.match(applyHint(helpSecurityAndPrivacyAccountCompromised[0]), /vendor compromised-account incident response/i);
  assert.match(applyHint(helpSecurityAndPrivacyAccountCompromised[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSecurityAndPrivacyAccountCompromised[0])), false);
  assert.equal(applyHint(helpSecurityAndPrivacyAccountCompromised[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyAccountCompromised[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyAccountCompromised[0]).includes('Plan Mode'), false);

  const helpSecurityAndPrivacyMarketplaceSecurity = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-marketplace-security.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/security-and-privacy/marketplace-security'
  );
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurity[0].id, 'https://cursor.com/help/security-and-privacy/marketplace-security');
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurity[0].title, 'Marketplace security');
  assert.match(helpSecurityAndPrivacyMarketplaceSecurity[0].summary, /How plugins are vetted, reviewed, and maintained in the Cursor Marketplace/);
  assert.match(applyHint(helpSecurityAndPrivacyMarketplaceSecurity[0]), /vendor marketplace plugin review/i);
  assert.match(applyHint(helpSecurityAndPrivacyMarketplaceSecurity[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpSecurityAndPrivacyMarketplaceSecurity[0])), false);
  assert.equal(applyHint(helpSecurityAndPrivacyMarketplaceSecurity[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyMarketplaceSecurity[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyMarketplaceSecurity[0]).includes('Plan Mode'), false);
  assert.equal(applyHint(helpSecurityAndPrivacyMarketplaceSecurity[0]).includes('Team MCP marketplace is vendor distribution'), false);

  const helpTroubleshootingAgentIssues = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-agent-issues.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/troubleshooting/agent-issues'
  );
  assert.equal(helpTroubleshootingAgentIssues[0].id, 'https://cursor.com/help/troubleshooting/agent-issues');
  assert.equal(helpTroubleshootingAgentIssues[0].title, 'Agent troubleshooting');
  assert.match(helpTroubleshootingAgentIssues[0].summary, /Fix common Agent issues with file access, rules, and terminal commands/);
  assert.match(applyHint(helpTroubleshootingAgentIssues[0]), /vendor desktop Agent diagnostics/i);
  assert.match(applyHint(helpTroubleshootingAgentIssues[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTroubleshootingAgentIssues[0])), false);
  assert.equal(applyHint(helpTroubleshootingAgentIssues[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTroubleshootingAgentIssues[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpTroubleshootingAgentIssues[0]).includes('Plan Mode'), false);

  const helpTroubleshootingTabIssues = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-tab-issues.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/troubleshooting/tab-issues'
  );
  assert.equal(helpTroubleshootingTabIssues[0].id, 'https://cursor.com/help/troubleshooting/tab-issues');
  assert.equal(helpTroubleshootingTabIssues[0].title, 'Tab completions');
  assert.match(helpTroubleshootingTabIssues[0].summary, /Troubleshoot missing or unexpected Tab completions/);
  assert.match(applyHint(helpTroubleshootingTabIssues[0]), /vendor desktop Tab diagnostics/i);
  assert.match(applyHint(helpTroubleshootingTabIssues[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTroubleshootingTabIssues[0])), false);
  assert.equal(applyHint(helpTroubleshootingTabIssues[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTroubleshootingTabIssues[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpTroubleshootingTabIssues[0]).includes('Plan Mode'), false);

  const helpTroubleshootingInstallIssues = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-install-issues.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/troubleshooting/install-issues'
  );
  assert.equal(helpTroubleshootingInstallIssues[0].id, 'https://cursor.com/help/troubleshooting/install-issues');
  assert.equal(helpTroubleshootingInstallIssues[0].title, 'Installation and startup');
  assert.match(helpTroubleshootingInstallIssues[0].summary, /Troubleshoot startup, updates, blank screens, and macOS warnings/);
  assert.match(applyHint(helpTroubleshootingInstallIssues[0]), /vendor desktop install\/startup diagnostics/i);
  assert.match(applyHint(helpTroubleshootingInstallIssues[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTroubleshootingInstallIssues[0])), false);
  assert.equal(applyHint(helpTroubleshootingInstallIssues[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTroubleshootingInstallIssues[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpTroubleshootingInstallIssues[0]).includes('Plan Mode'), false);

  const helpTroubleshootingNetwork = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-network.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/troubleshooting/network'
  );
  assert.equal(helpTroubleshootingNetwork[0].id, 'https://cursor.com/help/troubleshooting/network');
  assert.equal(helpTroubleshootingNetwork[0].title, 'Network, proxy, and remote connections');
  assert.match(helpTroubleshootingNetwork[0].summary, /Fix connection issues with proxies, VPNs, SSH, and remote development/);
  assert.match(applyHint(helpTroubleshootingNetwork[0]), /vendor desktop network\/proxy diagnostics/i);
  assert.match(applyHint(helpTroubleshootingNetwork[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTroubleshootingNetwork[0])), false);
  assert.equal(applyHint(helpTroubleshootingNetwork[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTroubleshootingNetwork[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpTroubleshootingNetwork[0]).includes('Plan Mode'), false);

  const helpTroubleshootingExtensions = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-extensions.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/troubleshooting/extensions'
  );
  assert.equal(helpTroubleshootingExtensions[0].id, 'https://cursor.com/help/troubleshooting/extensions');
  assert.equal(helpTroubleshootingExtensions[0].title, 'Extension conflicts');
  assert.match(helpTroubleshootingExtensions[0].summary, /Identify and resolve extensions that interfere with Cursor/);
  assert.match(applyHint(helpTroubleshootingExtensions[0]), /vendor desktop extension-conflict diagnostics/i);
  assert.match(applyHint(helpTroubleshootingExtensions[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTroubleshootingExtensions[0])), false);
  assert.equal(applyHint(helpTroubleshootingExtensions[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTroubleshootingExtensions[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpTroubleshootingExtensions[0]).includes('Plan Mode'), false);

  const helpTroubleshootingPerformance = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-performance.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/troubleshooting/performance'
  );
  assert.equal(helpTroubleshootingPerformance[0].id, 'https://cursor.com/help/troubleshooting/performance');
  assert.equal(helpTroubleshootingPerformance[0].title, 'Performance');
  assert.match(helpTroubleshootingPerformance[0].summary, /Reduce CPU usage and memory usage in large repos/);
  assert.match(applyHint(helpTroubleshootingPerformance[0]), /vendor desktop CPU\/memory\/input-delay diagnostics/i);
  assert.match(applyHint(helpTroubleshootingPerformance[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTroubleshootingPerformance[0])), false);
  assert.equal(applyHint(helpTroubleshootingPerformance[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTroubleshootingPerformance[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpTroubleshootingPerformance[0]).includes('Plan Mode'), false);

  const helpTroubleshootingReportingBugs = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-reporting-bugs.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/troubleshooting/reporting-bugs'
  );
  assert.equal(helpTroubleshootingReportingBugs[0].id, 'https://cursor.com/help/troubleshooting/reporting-bugs');
  assert.equal(helpTroubleshootingReportingBugs[0].title, 'Reporting a bug');
  assert.match(helpTroubleshootingReportingBugs[0].summary, /How to file a bug report with the right information, including Request IDs/);
  assert.match(applyHint(helpTroubleshootingReportingBugs[0]), /vendor desktop bug-report diagnostics/i);
  assert.match(applyHint(helpTroubleshootingReportingBugs[0]), /\/goal/);
  assert.equal(/enable/i.test(applyHint(helpTroubleshootingReportingBugs[0])), false);
  assert.equal(applyHint(helpTroubleshootingReportingBugs[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpTroubleshootingReportingBugs[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpTroubleshootingReportingBugs[0]).includes('Plan Mode'), false);

  const helpIntegrationsGit = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-integrations-git.html'), 'utf8'),
    'html-page',
    'https://cursor.com/help/integrations/git'
  );
  assert.equal(helpIntegrationsGit[0].id, 'https://cursor.com/help/integrations/git');
  assert.equal(helpIntegrationsGit[0].title, 'Git');
  assert.match(helpIntegrationsGit[0].summary, /AI commit messages, merge conflict resolution, agent attribution, and Cursor Blame/);
  assert.match(applyHint(helpIntegrationsGit[0]), /vendor desktop git\/Source Control features/i);
  assert.match(applyHint(helpIntegrationsGit[0]), /\/goal/);
  assert.match(applyHint(helpIntegrationsGit[0]), /GitHub remains source of truth/i);
  assert.equal(/enable/i.test(applyHint(helpIntegrationsGit[0])), false);
  assert.equal(applyHint(helpIntegrationsGit[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(helpIntegrationsGit[0]).includes('Vercel'), false);
  assert.equal(applyHint(helpIntegrationsGit[0]).includes('Plan Mode'), false);

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

  const settings = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-settings.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/settings'
  );
  assert.equal(settings[0].id, 'https://cursor.com/docs/cloud-agent/settings');
  assert.equal(settings[0].title, 'Dashboard settings');
  assert.match(settings[0].summary, /Workspace admin/i);
  assert.match(applyHint(settings[0]), /team follow-ups/i);
  assert.equal(/enable/i.test(applyHint(settings[0])), false);

  const privateConnectivity = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-private-connectivity.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/private-connectivity'
  );
  assert.equal(privateConnectivity[0].id, 'https://cursor.com/docs/cloud-agent/private-connectivity');
  assert.equal(privateConnectivity[0].title, 'Private Connectivity');
  assert.match(privateConnectivity[0].summary, /AWS PrivateLink/);
  assert.match(privateConnectivity[0].summary, /Cloudflare Tunnel/);
  assert.doesNotMatch(privateConnectivity[0].summary, /This Cloud Agent run is public cloud/i);
  assert.match(applyHint(privateConnectivity[0]), /public cloud/i);
  assert.match(applyHint(privateConnectivity[0]), /Enterprise-only/i);
  assert.match(applyHint(privateConnectivity[0]), /tunnel tokens/i);
  assert.equal(/enable/i.test(applyHint(privateConnectivity[0])), false);

  const bugbot = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-bugbot.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/bugbot'
  );
  assert.equal(bugbot[0].id, 'https://cursor.com/docs/bugbot');
  assert.equal(bugbot[0].title, 'Bugbot');
  assert.match(bugbot[0].summary, /pull requests/i);
  assert.match(applyHint(bugbot[0]), /\/review-bugbot/);
  assert.match(applyHint(bugbot[0]), /TDD evidence remains required/i);
  assert.equal(/enable/i.test(applyHint(bugbot[0])), false);

  const securityAgents = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-security-agents.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/security-agents'
  );
  assert.equal(securityAgents[0].id, 'https://cursor.com/docs/security-agents');
  assert.equal(securityAgents[0].title, 'Security Agents');
  assert.match(securityAgents[0].summary, /vulnerabilit/i);
  assert.match(applyHint(securityAgents[0]), /\/review-security/);
  assert.match(applyHint(securityAgents[0]), /security-auditor/);
  assert.equal(/enable/i.test(applyHint(securityAgents[0])), false);

  const approvalAgents = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-approval-agents.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/approval-agents'
  );
  assert.equal(approvalAgents[0].id, 'https://cursor.com/docs/approval-agents');
  assert.equal(approvalAgents[0].title, 'PR Routing & Approval');
  assert.match(approvalAgents[0].summary, /pull requests/i);
  assert.match(applyHint(approvalAgents[0]), /APPROVAL_POLICY\.md/);
  assert.match(applyHint(approvalAgents[0]), /optional vendor automation/i);
  assert.equal(/enable/i.test(applyHint(approvalAgents[0])), false);

  const mobile = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-mobile.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/mobile'
  );
  assert.equal(mobile[0].id, 'https://cursor.com/docs/cloud-agent/mobile');
  assert.equal(mobile[0].title, 'Cursor for iOS');
  assert.match(mobile[0].summary, /mobile app/i);
  assert.match(applyHint(mobile[0]), /\/remote-control/);
  assert.match(applyHint(mobile[0]), /Cloud Agent VM/);
  assert.equal(/enable/i.test(applyHint(mobile[0])), false);

  const apiEndpoints = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-api-endpoints.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/cloud-agent/api/endpoints'
  );
  assert.equal(apiEndpoints[0].id, 'https://cursor.com/docs/cloud-agent/api/endpoints');
  assert.equal(apiEndpoints[0].title, 'Cloud Agents API');
  assert.match(apiEndpoints[0].summary, /programmatically/i);
  assert.match(applyHint(apiEndpoints[0]), /official feeds/i);
  assert.match(applyHint(apiEndpoints[0]), /api\.cursor\.com/);
  assert.equal(/enable/i.test(applyHint(apiEndpoints[0])), false);

  const agentsWindow = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-agents-window.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/agents-window'
  );
  assert.equal(agentsWindow[0].id, 'https://cursor.com/docs/agent/agents-window');
  assert.equal(agentsWindow[0].title, 'Agents Window');
  assert.match(agentsWindow[0].summary, /agent-first/i);
  assert.match(applyHint(agentsWindow[0]), /\/in-cloud/);
  assert.match(applyHint(agentsWindow[0]), /Cloud Agent VM/);
  assert.equal(/enable/i.test(applyHint(agentsWindow[0])), false);

  const agentReview = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-agent-review.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/agent-review'
  );
  assert.equal(agentReview[0].id, 'https://cursor.com/docs/agent/agent-review');
  assert.equal(agentReview[0].title, 'Agent Review');
  assert.match(agentReview[0].summary, /local changes/i);
  assert.match(applyHint(agentReview[0]), /\/agent-review/);
  assert.match(applyHint(agentReview[0]), /TDD/);
  assert.equal(/enable/i.test(applyHint(agentReview[0])), false);

  const planMode = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-plan-mode.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/plan-mode'
  );
  assert.equal(planMode[0].id, 'https://cursor.com/docs/agent/plan-mode');
  assert.equal(planMode[0].title, 'Plan Mode');
  assert.match(planMode[0].summary, /implementation plans/i);
  assert.match(applyHint(planMode[0]), /\/goal/);
  assert.match(applyHint(planMode[0]), /optional desktop planning/i);
  assert.equal(/enable/i.test(applyHint(planMode[0])), false);

  const debugMode = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-debug-mode.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/debug-mode'
  );
  assert.equal(debugMode[0].id, 'https://cursor.com/docs/agent/debug-mode');
  assert.equal(debugMode[0].title, 'Debug Mode');
  assert.match(debugMode[0].summary, /root causes/i);
  assert.match(applyHint(debugMode[0]), /Cloud Agent VM/);
  assert.match(applyHint(debugMode[0]), /TDD/);
  assert.equal(/enable/i.test(applyHint(debugMode[0])), false);

  const designMode = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-design-mode.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/design-mode'
  );
  assert.equal(designMode[0].id, 'https://cursor.com/docs/agent/design-mode');
  assert.equal(designMode[0].title, 'Design Mode');
  assert.match(designMode[0].summary, /visual prompts|Point, draw, or narrate/i);
  assert.match(applyHint(designMode[0]), /Cloud Agent VM/);
  assert.match(applyHint(designMode[0]), /optional desktop visual prompting/i);
  assert.equal(/enable/i.test(applyHint(designMode[0])), false);

  const browserTool = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-browser.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/tools/browser'
  );
  assert.equal(browserTool[0].id, 'https://cursor.com/docs/agent/tools/browser');
  assert.equal(browserTool[0].title, 'Browser');
  assert.match(browserTool[0].summary, /web browser/i);
  assert.match(applyHint(browserTool[0]), /Cloud Agent VM/);
  assert.match(applyHint(browserTool[0]), /optional desktop browser control/i);
  assert.equal(/enable/i.test(applyHint(browserTool[0])), false);

  const terminalTool = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-terminal.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/tools/terminal'
  );
  assert.equal(terminalTool[0].id, 'https://cursor.com/docs/agent/tools/terminal');
  assert.equal(terminalTool[0].title, 'Terminal');
  assert.match(terminalTool[0].summary, /sandbox/i);
  assert.match(applyHint(terminalTool[0]), /Cloud Agent VM/);
  assert.match(applyHint(terminalTool[0]), /optional desktop shell control/i);
  assert.equal(/enable/i.test(applyHint(terminalTool[0])), false);

  const searchTool = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-search.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/tools/search'
  );
  assert.equal(searchTool[0].id, 'https://cursor.com/docs/agent/tools/search');
  assert.equal(searchTool[0].title, 'Search');
  assert.match(searchTool[0].summary, /Instant Grep/i);
  assert.match(applyHint(searchTool[0]), /Cloud Agent VM/);
  assert.match(applyHint(searchTool[0]), /optional desktop Instant Grep/i);
  assert.equal(/enable/i.test(applyHint(searchTool[0])), false);

  const canvasTool = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-canvas.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/tools/canvas'
  );
  assert.equal(canvasTool[0].id, 'https://cursor.com/docs/agent/tools/canvas');
  assert.equal(canvasTool[0].title, 'Canvases');
  assert.match(canvasTool[0].summary, /interactive artifacts/i);
  assert.match(applyHint(canvasTool[0]), /Cloud Agent VM/);
  assert.match(applyHint(canvasTool[0]), /optional desktop interactive artifacts/i);
  assert.equal(/enable/i.test(applyHint(canvasTool[0])), false);
  assert.equal(applyHint(canvasTool[0]).includes('Custom Mode'), false);

  const worktrees = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-configuration-worktrees.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/configuration/worktrees'
  );
  assert.equal(worktrees[0].id, 'https://cursor.com/docs/configuration/worktrees');
  assert.equal(worktrees[0].title, 'Worktrees');
  assert.match(worktrees[0].summary, /isolated Git worktrees/i);
  assert.match(applyHint(worktrees[0]), /Cloud Agent VM/);
  assert.match(applyHint(worktrees[0]), /optional desktop isolated Git checkouts/i);
  assert.equal(/enable/i.test(applyHint(worktrees[0])), false);
  assert.equal(applyHint(worktrees[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(worktrees[0]).includes('/best-of-n'), false);

  const agentSecurity = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-security.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/agent/security'
  );
  assert.equal(agentSecurity[0].id, 'https://cursor.com/docs/agent/security');
  assert.equal(agentSecurity[0].title, 'Agent Security');
  assert.match(agentSecurity[0].summary, /Security considerations/i);
  assert.match(applyHint(agentSecurity[0]), /Cloud Agent VM/);
  assert.match(applyHint(agentSecurity[0]), /optional desktop guardrails/i);
  assert.equal(/enable/i.test(applyHint(agentSecurity[0])), false);
  assert.equal(applyHint(agentSecurity[0]).includes('Custom Mode'), false);

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

  const customizeCursor = parseOfficialSource(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-customize-cursor.html'), 'utf8'),
    'html-page',
    'https://cursor.com/docs/customize-cursor'
  );
  assert.equal(customizeCursor[0].id, 'https://cursor.com/docs/customize-cursor');
  assert.equal(customizeCursor[0].title, 'Overview');
  assert.match(customizeCursor[0].summary, /Customize page/i);
  assert.match(applyHint(customizeCursor[0]), /optional desktop sidebar/i);
  assert.equal(/enable/i.test(applyHint(customizeCursor[0])), false);
  assert.equal(applyHint(customizeCursor[0]).includes('Custom Mode'), false);
  assert.equal(applyHint(customizeCursor[0]).includes('/goal'), false);
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
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/models-and-usage/grok-4-5'),
    'https://cursor.com/help/models-and-usage/grok-4-5.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/agent'),
    'https://cursor.com/help/ai-features/agent.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/ask-mode'),
    'https://cursor.com/help/ai-features/ask-mode.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/plan-mode'),
    'https://cursor.com/help/ai-features/plan-mode.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/tab'),
    'https://cursor.com/help/ai-features/tab.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/inline-edit'),
    'https://cursor.com/help/ai-features/inline-edit.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/cloud-agents'),
    'https://cursor.com/help/ai-features/cloud-agents.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/background-agents'),
    'https://cursor.com/help/ai-features/background-agents.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/mobile-app'),
    'https://cursor.com/help/ai-features/mobile-app.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/shared-transcripts'),
    'https://cursor.com/help/ai-features/shared-transcripts.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/bugbot'),
    'https://cursor.com/help/ai-features/bugbot.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/customization/rules'),
    'https://cursor.com/help/customization/rules.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/customization/skills'),
    'https://cursor.com/help/customization/skills.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/customization/mcp'),
    'https://cursor.com/help/customization/mcp.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/customization/context'),
    'https://cursor.com/help/customization/context.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/customization/ignore-files'),
    'https://cursor.com/help/customization/ignore-files.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/customization/plugins'),
    'https://cursor.com/help/customization/plugins.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/multi-agent'),
    'https://cursor.com/help/ai-features/multi-agent.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/side-chats'),
    'https://cursor.com/help/ai-features/side-chats.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/conversation-search'),
    'https://cursor.com/help/ai-features/conversation-search.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/docs/grok-bot'),
    'https://cursor.com/docs/grok-bot.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/ai-features/ai-pair-programming'),
    'https://cursor.com/help/ai-features/ai-pair-programming.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/docs/get-started/quickstart'),
    'https://cursor.com/docs/get-started/quickstart.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/getting-started/install'),
    'https://cursor.com/help/getting-started/install.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/getting-started/first-project'),
    'https://cursor.com/help/getting-started/first-project.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/getting-started/build-ai-coding-agent'),
    'https://cursor.com/help/getting-started/build-ai-coding-agent.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/security-and-privacy/privacy'),
    'https://cursor.com/help/security-and-privacy/privacy.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/security-and-privacy/regions'),
    'https://cursor.com/help/security-and-privacy/regions.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/security-and-privacy/sso'),
    'https://cursor.com/help/security-and-privacy/sso.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/security-and-privacy/account-compromised'),
    'https://cursor.com/help/security-and-privacy/account-compromised.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/security-and-privacy/marketplace-security'),
    'https://cursor.com/help/security-and-privacy/marketplace-security.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/troubleshooting/agent-issues'),
    'https://cursor.com/help/troubleshooting/agent-issues.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/troubleshooting/tab-issues'),
    'https://cursor.com/help/troubleshooting/tab-issues.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/troubleshooting/install-issues'),
    'https://cursor.com/help/troubleshooting/install-issues.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/troubleshooting/network'),
    'https://cursor.com/help/troubleshooting/network.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/troubleshooting/extensions'),
    'https://cursor.com/help/troubleshooting/extensions.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/troubleshooting/performance'),
    'https://cursor.com/help/troubleshooting/performance.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/troubleshooting/reporting-bugs'),
    'https://cursor.com/help/troubleshooting/reporting-bugs.md'
  );
  assert.equal(
    cursorOfficialMarkdownUrl('https://cursor.com/help/integrations/git'),
    'https://cursor.com/help/integrations/git.md'
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

  const originCreateRepoMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-create-repository.md'), 'utf8')
  );
  assert.equal(originCreateRepoMd.title, 'Create an Origin repository');
  assert.match(originCreateRepoMd.summary, /Create in the UI/);
  assert.match(originCreateRepoMd.summary, /Sync from GitHub/);
  assert.match(originCreateRepoMd.summary, /Create with a Cursor agent/);
  assert.equal(originCreateRepoMd.summary.includes('Sitemap'), false);
  assert.equal(/Push your first commit —/.test(originCreateRepoMd.summary), false);
  assert.equal(originCreateRepoMd.summary.includes('origin.cursor.com'), false);

  const originPullRequestsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-pull-requests.md'), 'utf8')
  );
  assert.equal(originPullRequestsMd.title, 'Pull requests');
  assert.match(originPullRequestsMd.summary, /Pull request list/);
  assert.match(originPullRequestsMd.summary, /Open a pull request/);
  assert.match(originPullRequestsMd.summary, /Pull request page/);
  assert.match(originPullRequestsMd.summary, /Mirrored GitHub/);
  assert.equal(originPullRequestsMd.summary.includes('Sitemap'), false);
  assert.equal(originPullRequestsMd.summary.includes('origin.cursor.com'), false);

  const originBrowseMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-browse.md'), 'utf8')
  );
  assert.equal(originBrowseMd.title, 'Browse & Search');
  assert.match(originBrowseMd.summary, /Folders and files/);
  assert.match(originBrowseMd.summary, /Search/);
  assert.match(originBrowseMd.summary, /Branch history and commits/);
  assert.match(originBrowseMd.summary, /Go to file/);
  assert.equal(originBrowseMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(originBrowseMd.summary), false);
  assert.equal(originBrowseMd.summary.includes('origin.cursor.com'), false);

  const originSettingsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-settings.md'), 'utf8')
  );
  assert.equal(originSettingsMd.title, 'Settings');
  assert.match(originSettingsMd.summary, /Sync status/);
  assert.match(originSettingsMd.summary, /Detach from GitHub/);
  assert.match(originSettingsMd.summary, /Permissions/);
  assert.match(originSettingsMd.summary, /Rules and Protections/);
  assert.equal(originSettingsMd.summary.includes('Sitemap'), false);
  assert.equal(originSettingsMd.summary.includes('origin.cursor.com'), false);

  const originCodebaseSettingsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-origin-codebase-settings.md'), 'utf8')
  );
  assert.equal(originCodebaseSettingsMd.title, 'Codebase settings');
  assert.match(originCodebaseSettingsMd.summary, /Permissions/);
  assert.match(originCodebaseSettingsMd.summary, /Apps/);
  assert.equal(originCodebaseSettingsMd.summary.includes('Sitemap'), false);
  assert.equal(originCodebaseSettingsMd.summary.includes('origin.cursor.com'), false);

  const cursorCliMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-overview.md'), 'utf8')
  );
  assert.equal(cursorCliMd.title, 'Cursor CLI');
  assert.match(cursorCliMd.summary, /Interactive mode/);
  assert.match(cursorCliMd.summary, /Modes/);
  assert.match(cursorCliMd.summary, /Non-interactive mode/);
  assert.match(cursorCliMd.summary, /Cloud Agent handoff/);
  assert.match(cursorCliMd.summary, /Sessions/);
  assert.match(cursorCliMd.summary, /Sandbox controls/);
  assert.equal(cursorCliMd.summary.includes('Sitemap'), false);
  assert.equal(cursorCliMd.summary.includes('cursor.com/install'), false);
  assert.equal(/Getting started —/.test(cursorCliMd.summary), false);

  const cursorCliUsingMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-using.md'), 'utf8')
  );
  assert.equal(cursorCliUsingMd.title, 'Using Agent in CLI');
  assert.match(cursorCliUsingMd.summary, /Modes/);
  assert.match(cursorCliUsingMd.summary, /Prompting/);
  assert.match(cursorCliUsingMd.summary, /MCP/);
  assert.match(cursorCliUsingMd.summary, /ACP/);
  assert.match(cursorCliUsingMd.summary, /Rules/);
  assert.match(cursorCliUsingMd.summary, /Cloud Agent handoff/);
  assert.match(cursorCliUsingMd.summary, /CLI worktrees/);
  assert.match(cursorCliUsingMd.summary, /Non-interactive mode/);
  assert.equal(cursorCliUsingMd.summary.includes('Sitemap'), false);
  assert.equal(cursorCliUsingMd.summary.includes('cursor.com/install'), false);

  const cursorCliShellModeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-shell-mode.md'), 'utf8')
  );
  assert.equal(cursorCliShellModeMd.title, 'Shell Mode');
  assert.match(cursorCliShellModeMd.summary, /Command execution/);
  assert.match(cursorCliShellModeMd.summary, /Output/);
  assert.match(cursorCliShellModeMd.summary, /Limitations/);
  assert.match(cursorCliShellModeMd.summary, /Permissions/);
  assert.match(cursorCliShellModeMd.summary, /Usage guidelines/);
  assert.equal(cursorCliShellModeMd.summary.includes('Sitemap'), false);
  assert.equal(/Troubleshooting —/.test(cursorCliShellModeMd.summary), false);
  assert.equal(/FAQ —/.test(cursorCliShellModeMd.summary), false);
  assert.equal(cursorCliShellModeMd.summary.includes('cursor.com/install'), false);

  const cursorCliAcpMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-acp.md'), 'utf8')
  );
  assert.equal(cursorCliAcpMd.title, 'ACP');
  assert.match(cursorCliAcpMd.summary, /Overview/);
  assert.match(cursorCliAcpMd.summary, /Start ACP server/);
  assert.match(cursorCliAcpMd.summary, /Transport and message format/);
  assert.match(cursorCliAcpMd.summary, /Request flow/);
  assert.match(cursorCliAcpMd.summary, /Authentication/);
  assert.match(cursorCliAcpMd.summary, /Cursor extension methods/);
  assert.match(cursorCliAcpMd.summary, /Minimal Node.js client/);
  assert.match(cursorCliAcpMd.summary, /IDE integrations/);
  assert.equal(cursorCliAcpMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(cursorCliAcpMd.summary), false);
  assert.equal(cursorCliAcpMd.summary.includes('cursor.com/install'), false);

  const cursorCliHeadlessMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cli-headless.md'), 'utf8')
  );
  assert.equal(cursorCliHeadlessMd.title, 'Using Headless CLI');
  assert.match(cursorCliHeadlessMd.summary, /How it works/);
  assert.match(cursorCliHeadlessMd.summary, /Example scripts/);
  assert.match(cursorCliHeadlessMd.summary, /Working with images/);
  assert.equal(/Setup —/.test(cursorCliHeadlessMd.summary), false);
  assert.equal(cursorCliHeadlessMd.summary.includes('Sitemap'), false);
  assert.equal(cursorCliHeadlessMd.summary.includes('cursor.com/install'), false);
  assert.equal(cursorCliHeadlessMd.summary.toLowerCase().includes('curl'), false);

  const cursorSdkTypescriptMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-sdk-typescript.md'), 'utf8')
  );
  assert.equal(cursorSdkTypescriptMd.title, 'Cursor TypeScript SDK');
  assert.match(cursorSdkTypescriptMd.summary, /Overview/);
  assert.match(cursorSdkTypescriptMd.summary, /Authentication/);
  assert.match(cursorSdkTypescriptMd.summary, /Usage and billing/);
  assert.match(cursorSdkTypescriptMd.summary, /Installation/);
  assert.match(cursorSdkTypescriptMd.summary, /Quick start/);
  assert.match(cursorSdkTypescriptMd.summary, /Creating agents/);
  assert.match(cursorSdkTypescriptMd.summary, /Sending messages/);
  assert.match(cursorSdkTypescriptMd.summary, /Stream events/);
  assert.match(cursorSdkTypescriptMd.summary, /Known limitations/);
  assert.equal(cursorSdkTypescriptMd.summary.includes('Sitemap'), false);
  assert.equal(/MCP servers —/.test(cursorSdkTypescriptMd.summary), false);
  assert.equal(cursorSdkTypescriptMd.summary.toLowerCase().includes('npm install'), false);
  assert.equal(cursorSdkTypescriptMd.summary.toLowerCase().includes('curl'), false);

  const cursorSdkPythonMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-sdk-python.md'), 'utf8')
  );
  assert.equal(cursorSdkPythonMd.title, 'Cursor Python SDK');
  assert.match(cursorSdkPythonMd.summary, /Overview/);
  assert.match(cursorSdkPythonMd.summary, /Authentication/);
  assert.match(cursorSdkPythonMd.summary, /Usage and billing/);
  assert.match(cursorSdkPythonMd.summary, /Installation/);
  assert.match(cursorSdkPythonMd.summary, /Quick start/);
  assert.match(cursorSdkPythonMd.summary, /Async usage/);
  assert.match(cursorSdkPythonMd.summary, /Creating agents/);
  assert.match(cursorSdkPythonMd.summary, /Known limitations/);
  assert.equal(cursorSdkPythonMd.summary.includes('Sitemap'), false);
  assert.equal(/MCP servers —/.test(cursorSdkPythonMd.summary), false);
  assert.equal(/Troubleshooting —/.test(cursorSdkPythonMd.summary), false);
  assert.equal(cursorSdkPythonMd.summary.toLowerCase().includes('pip install'), false);
  assert.equal(cursorSdkPythonMd.summary.toLowerCase().includes('curl'), false);

  const cursorSdkBridgeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-sdk-bridge.md'), 'utf8')
  );
  assert.equal(cursorSdkBridgeMd.title, 'Cursor SDK Bridge');
  assert.match(cursorSdkBridgeMd.summary, /When to use it/);
  assert.match(cursorSdkBridgeMd.summary, /How it works/);
  assert.match(cursorSdkBridgeMd.summary, /Adapter shape/);
  assert.match(cursorSdkBridgeMd.summary, /Protocol/);
  assert.match(cursorSdkBridgeMd.summary, /Authentication/);
  assert.match(cursorSdkBridgeMd.summary, /Versioning/);
  assert.match(cursorSdkBridgeMd.summary, /Support/);
  assert.equal(cursorSdkBridgeMd.summary.includes('Sitemap'), false);
  assert.equal(/Get started —/.test(cursorSdkBridgeMd.summary), false);
  assert.equal(/Related —/.test(cursorSdkBridgeMd.summary), false);
  assert.equal(cursorSdkBridgeMd.summary.toLowerCase().includes('pip install'), false);
  assert.equal(cursorSdkBridgeMd.summary.toLowerCase().includes('curl'), false);

  const teamPricingMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-account-teams-pricing.md'), 'utf8')
  );
  assert.equal(teamPricingMd.title, 'Team Pricing');
  assert.match(teamPricingMd.summary, /How pricing works/);
  assert.match(teamPricingMd.summary, /Active seats/);
  assert.match(teamPricingMd.summary, /Spending controls/);
  assert.match(teamPricingMd.summary, /Model Pricing/);
  assert.equal(teamPricingMd.summary.includes('Sitemap'), false);
  assert.equal(/Get started —/.test(teamPricingMd.summary), false);
  assert.equal(/FAQ —/.test(teamPricingMd.summary), false);
  assert.equal(teamPricingMd.summary.toLowerCase().includes('curl'), false);

  const teamMembersMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-account-teams-members.md'), 'utf8')
  );
  assert.equal(teamMembersMd.title, 'Members, Roles, and Seat Types');
  assert.match(teamMembersMd.summary, /Roles/);
  assert.match(teamMembersMd.summary, /Seat Types/);
  assert.match(teamMembersMd.summary, /Usage Controls/);
  assert.equal(teamMembersMd.summary.includes('Sitemap'), false);
  assert.equal(/Managing members —/.test(teamMembersMd.summary), false);
  assert.equal(/Domain settings —/.test(teamMembersMd.summary), false);
  assert.equal(/Security & SSO —/.test(teamMembersMd.summary), false);
  assert.equal(/Role Comparison —/.test(teamMembersMd.summary), false);
  assert.equal(/Billing —/.test(teamMembersMd.summary), false);
  assert.equal(/Get started —/.test(teamMembersMd.summary), false);
  assert.equal(teamMembersMd.summary.toLowerCase().includes('curl'), false);

  const helpPricingMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-account-and-billing-pricing.md'), 'utf8')
  );
  assert.equal(helpPricingMd.title, 'Pricing and plans');
  assert.match(helpPricingMd.summary, /What plans are available/);
  assert.match(helpPricingMd.summary, /What is Auto/);
  assert.match(helpPricingMd.summary, /Is Cursor Router available on my plan/);
  assert.match(helpPricingMd.summary, /Cost mode/);
  assert.match(helpPricingMd.summary, /Hobby plan/);
  assert.equal(helpPricingMd.summary.includes('Sitemap'), false);
  assert.equal(/How do I upgrade my plan —/.test(helpPricingMd.summary), false);
  assert.equal(/How do I downgrade my plan —/.test(helpPricingMd.summary), false);
  assert.equal(/Where do I manage my subscription —/.test(helpPricingMd.summary), false);
  assert.equal(/What if I move from an individual plan to a Teams plan —/.test(helpPricingMd.summary), false);
  assert.equal(/Can I switch between monthly and yearly billing —/.test(helpPricingMd.summary), false);
  assert.equal(/Related —/.test(helpPricingMd.summary), false);
  assert.equal(helpPricingMd.summary.toLowerCase().includes('stripe'), false);
  assert.equal(helpPricingMd.summary.toLowerCase().includes('curl'), false);

  const helpAvailableModelsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-models-and-usage-available-models.md'), 'utf8')
  );
  assert.equal(helpAvailableModelsMd.title, 'Available models');
  assert.match(helpAvailableModelsMd.summary, /Which models are available/);
  assert.match(helpAvailableModelsMd.summary, /Which model should I use/);
  assert.match(helpAvailableModelsMd.summary, /Cursor Router/);
  assert.match(helpAvailableModelsMd.summary, /How much does Auto cost/);
  assert.equal(helpAvailableModelsMd.summary.includes('Sitemap'), false);
  assert.equal(/How do I switch models —/.test(helpAvailableModelsMd.summary), false);
  assert.equal(/Related —/.test(helpAvailableModelsMd.summary), false);
  assert.equal(helpAvailableModelsMd.summary.toLowerCase().includes('curl'), false);

  const helpCursorRouterMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-models-and-usage-cursor-router.md'), 'utf8')
  );
  assert.equal(helpCursorRouterMd.title, 'Cursor Router');
  assert.match(helpCursorRouterMd.summary, /What is Cursor Router/);
  assert.match(helpCursorRouterMd.summary, /How does Cursor Router decide/);
  assert.match(helpCursorRouterMd.summary, /Cost, Balance, and Intelligence/);
  assert.match(helpCursorRouterMd.summary, /Can I use Cursor Router from the SDK/);
  assert.equal(helpCursorRouterMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpCursorRouterMd.summary), false);
  assert.equal(helpCursorRouterMd.summary.toLowerCase().includes('curl'), false);

  const helpGrok45Md = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-models-and-usage-grok-4-5.md'), 'utf8')
  );
  assert.equal(helpGrok45Md.title, 'Grok 4.5');
  assert.match(helpGrok45Md.summary, /What is Grok 4.5/);
  assert.match(helpGrok45Md.summary, /effort levels/);
  assert.match(helpGrok45Md.summary, /When should I choose Grok 4.5 over Composer/);
  assert.match(helpGrok45Md.summary, /Which plans include Grok 4.5/);
  assert.equal(helpGrok45Md.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGrok45Md.summary), false);
  assert.equal(helpGrok45Md.summary.toLowerCase().includes('curl'), false);

  const helpAgentModeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-agent.md'), 'utf8')
  );
  assert.equal(helpAgentModeMd.title, 'Agent mode');
  assert.match(helpAgentModeMd.summary, /What can Agent mode do/);
  assert.match(helpAgentModeMd.summary, /How do I start using Agent/);
  assert.match(helpAgentModeMd.summary, /How do I interrupt Agent/);
  assert.match(helpAgentModeMd.summary, /How do I review Agent changes/);
  assert.equal(helpAgentModeMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpAgentModeMd.summary), false);
  assert.equal(helpAgentModeMd.summary.toLowerCase().includes('curl'), false);

  const helpAskModeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-ask-mode.md'), 'utf8')
  );
  assert.equal(helpAskModeMd.title, 'Ask mode');
  assert.match(helpAskModeMd.summary, /How do I use Ask mode/);
  assert.match(helpAskModeMd.summary, /When should I use Ask mode/);
  assert.equal(helpAskModeMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpAskModeMd.summary), false);
  assert.equal(helpAskModeMd.summary.toLowerCase().includes('curl'), false);

  const helpPlanModeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-plan-mode.md'), 'utf8')
  );
  assert.equal(helpPlanModeMd.title, 'Plan mode');
  assert.match(helpPlanModeMd.summary, /How do I use Plan mode/);
  assert.match(helpPlanModeMd.summary, /When should I use Plan mode/);
  assert.match(helpPlanModeMd.summary, /How do I save plans/);
  assert.match(helpPlanModeMd.summary, /How do I start over in Plan mode/);
  assert.equal(helpPlanModeMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpPlanModeMd.summary), false);
  assert.equal(helpPlanModeMd.summary.toLowerCase().includes('curl'), false);

  const helpTabMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-tab.md'), 'utf8')
  );
  assert.equal(helpTabMd.title, 'Tab completion');
  assert.match(helpTabMd.summary, /How do I accept or reject suggestions/);
  assert.match(helpTabMd.summary, /Can Tab edit multiple lines at once/);
  assert.match(helpTabMd.summary, /What is jump-in-file/);
  assert.match(helpTabMd.summary, /Can Tab suggest edits in other files/);
  assert.equal(helpTabMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTabMd.summary), false);
  assert.equal(helpTabMd.summary.toLowerCase().includes('curl'), false);

  const helpInlineEditMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-inline-edit.md'), 'utf8')
  );
  assert.equal(helpInlineEditMd.title, 'Inline edit');
  assert.match(helpInlineEditMd.summary, /How do I use inline edit/);
  assert.match(helpInlineEditMd.summary, /How do I ask a quick question with inline edit/);
  assert.match(helpInlineEditMd.summary, /Can I switch from inline edit to Agent/);
  assert.equal(helpInlineEditMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpInlineEditMd.summary), false);
  assert.equal(helpInlineEditMd.summary.toLowerCase().includes('curl'), false);

  const helpCloudAgentsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-cloud-agents.md'), 'utf8')
  );
  assert.equal(helpCloudAgentsMd.title, 'Cloud Agents');
  assert.match(helpCloudAgentsMd.summary, /What can Cloud Agents do/);
  assert.match(helpCloudAgentsMd.summary, /How does "Move to Cloud" handle my file state/);
  assert.match(helpCloudAgentsMd.summary, /How do I start a Cloud Agent task/);
  assert.equal(helpCloudAgentsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpCloudAgentsMd.summary), false);
  assert.equal(helpCloudAgentsMd.summary.toLowerCase().includes('curl'), false);

  const helpBackgroundAgentsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-background-agents.md'), 'utf8')
  );
  assert.equal(helpBackgroundAgentsMd.title, 'What are background agents?');
  assert.match(helpBackgroundAgentsMd.summary, /How do background agents work/);
  assert.match(helpBackgroundAgentsMd.summary, /How do background agents show their work/);
  assert.match(helpBackgroundAgentsMd.summary, /How do I start a background agent/);
  assert.equal(helpBackgroundAgentsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpBackgroundAgentsMd.summary), false);
  assert.equal(helpBackgroundAgentsMd.summary.toLowerCase().includes('curl'), false);

  const helpMobileAppMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-mobile-app.md'), 'utf8')
  );
  assert.equal(helpMobileAppMd.title, 'Cursor for iOS');
  assert.match(helpMobileAppMd.summary, /Is there an Android app/);
  assert.match(helpMobileAppMd.summary, /Which devices and versions are supported/);
  assert.match(helpMobileAppMd.summary, /What is different on iPad/);
  assert.equal(helpMobileAppMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpMobileAppMd.summary), false);
  assert.equal(helpMobileAppMd.summary.toLowerCase().includes('curl'), false);

  const helpSharedTranscriptsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-shared-transcripts.md'), 'utf8')
  );
  assert.equal(helpSharedTranscriptsMd.title, 'Shared transcripts');
  assert.match(helpSharedTranscriptsMd.summary, /How do I share a conversation/);
  assert.match(helpSharedTranscriptsMd.summary, /Who can view shared transcripts/);
  assert.match(helpSharedTranscriptsMd.summary, /Can I fork a shared transcript/);
  assert.equal(helpSharedTranscriptsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSharedTranscriptsMd.summary), false);
  assert.equal(helpSharedTranscriptsMd.summary.toLowerCase().includes('curl'), false);

  const helpBugbotMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-bugbot.md'), 'utf8')
  );
  assert.equal(helpBugbotMd.title, 'Bugbot');
  assert.match(helpBugbotMd.summary, /Can Cursor review my PRs/);
  assert.match(helpBugbotMd.summary, /What is Bugbot/);
  assert.match(helpBugbotMd.summary, /How do I set up Bugbot/);
  assert.equal(helpBugbotMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpBugbotMd.summary), false);
  assert.equal(helpBugbotMd.summary.toLowerCase().includes('curl'), false);

  const helpRulesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-rules.md'), 'utf8')
  );
  assert.equal(helpRulesMd.title, 'Rules');
  assert.match(helpRulesMd.summary, /What is a rule/);
  assert.match(helpRulesMd.summary, /How do I create a project rule/);
  assert.match(helpRulesMd.summary, /How do I set up user rules/);
  assert.equal(helpRulesMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpRulesMd.summary), false);
  assert.equal(helpRulesMd.summary.toLowerCase().includes('curl'), false);

  const helpSkillsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-skills.md'), 'utf8')
  );
  assert.equal(helpSkillsMd.title, 'Skills');
  assert.match(helpSkillsMd.summary, /What are Skills/);
  assert.match(helpSkillsMd.summary, /How do I create a skill/);
  assert.match(helpSkillsMd.summary, /Are user-level skills available/);
  assert.equal(helpSkillsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSkillsMd.summary), false);
  assert.equal(helpSkillsMd.summary.toLowerCase().includes('curl'), false);

  const helpMcpMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-mcp.md'), 'utf8')
  );
  assert.equal(helpMcpMd.title, 'MCP integrations');
  assert.match(helpMcpMd.summary, /What is an MCP server/);
  assert.match(helpMcpMd.summary, /How do I install an MCP server manually/);
  assert.match(helpMcpMd.summary, /Do MCP servers work with Cloud Agents/);
  assert.equal(helpMcpMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpMcpMd.summary), false);
  assert.equal(helpMcpMd.summary.toLowerCase().includes('curl'), false);

  const helpContextMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-context.md'), 'utf8')
  );
  assert.equal(helpContextMd.title, '@ mentions and context');
  assert.match(helpContextMd.summary, /What can I reference with @/);
  assert.match(helpContextMd.summary, /When should I use @ mentions/);
  assert.match(helpContextMd.summary, /Can I attach multiple items/);
  assert.equal(helpContextMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpContextMd.summary), false);
  assert.equal(helpContextMd.summary.toLowerCase().includes('curl'), false);

  const helpIgnoreFilesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-ignore-files.md'), 'utf8')
  );
  assert.equal(helpIgnoreFilesMd.title, 'Ignore files');
  assert.match(helpIgnoreFilesMd.summary, /How do I exclude files from Cursor/);
  assert.match(helpIgnoreFilesMd.summary, /Does Cursor respect \.gitignore/);
  assert.match(helpIgnoreFilesMd.summary, /Why should I ignore files/);
  assert.equal(helpIgnoreFilesMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpIgnoreFilesMd.summary), false);
  assert.equal(helpIgnoreFilesMd.summary.toLowerCase().includes('curl'), false);

  const helpPluginsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-customization-plugins.md'), 'utf8')
  );
  assert.equal(helpPluginsMd.title, 'Plugins');
  assert.match(helpPluginsMd.summary, /What are plugins/);
  assert.match(helpPluginsMd.summary, /How do I install a plugin/);
  assert.match(helpPluginsMd.summary, /Are plugins reviewed for security/);
  assert.equal(helpPluginsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpPluginsMd.summary), false);
  assert.equal(helpPluginsMd.summary.toLowerCase().includes('curl'), false);

  const helpMultiAgentMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-multi-agent.md'), 'utf8')
  );
  assert.equal(helpMultiAgentMd.title, 'What is multi-agent coding?');
  assert.match(helpMultiAgentMd.summary, /How do I run multiple agents in Cursor/);
  assert.match(helpMultiAgentMd.summary, /What are subagents/);
  assert.match(helpMultiAgentMd.summary, /How do I multitask with agents/);
  assert.equal(helpMultiAgentMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpMultiAgentMd.summary), false);
  assert.equal(helpMultiAgentMd.summary.toLowerCase().includes('curl'), false);

  const helpSideChatsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-side-chats.md'), 'utf8')
  );
  assert.equal(helpSideChatsMd.title, 'Side chats');
  assert.match(helpSideChatsMd.summary, /What is a side chat and how does it differ/);
  assert.match(helpSideChatsMd.summary, /How do I open a side chat/);
  assert.match(helpSideChatsMd.summary, /How do I bring side chat context back/);
  assert.equal(helpSideChatsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSideChatsMd.summary), false);
  assert.equal(helpSideChatsMd.summary.toLowerCase().includes('curl'), false);

  const helpConversationSearchMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-conversation-search.md'), 'utf8')
  );
  assert.equal(helpConversationSearchMd.title, 'Conversation search');
  assert.match(helpConversationSearchMd.summary, /How do I search my past agent conversations/);
  assert.match(helpConversationSearchMd.summary, /How do I search within an existing conversation/);
  assert.equal(helpConversationSearchMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpConversationSearchMd.summary), false);
  assert.equal(helpConversationSearchMd.summary.toLowerCase().includes('curl'), false);

  const grokBotMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-grok-bot.md'), 'utf8')
  );
  assert.equal(grokBotMd.title, 'Grok Bot');
  assert.match(grokBotMd.summary, /What makes Grok Bot different/);
  assert.match(grokBotMd.summary, /Your Bots share one computer/);
  assert.match(grokBotMd.summary, /A good first handoff/);
  assert.equal(grokBotMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(grokBotMd.summary), false);
  assert.equal(grokBotMd.summary.toLowerCase().includes('curl'), false);

  const helpAiPairProgrammingMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-ai-features-ai-pair-programming.md'), 'utf8')
  );
  assert.equal(helpAiPairProgrammingMd.title, 'How does AI pair programming work in Cursor?');
  assert.match(helpAiPairProgrammingMd.summary, /What is an AI coding assistant/);
  assert.match(helpAiPairProgrammingMd.summary, /How do I pair program with Cursor/);
  assert.equal(helpAiPairProgrammingMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpAiPairProgrammingMd.summary), false);
  assert.equal(helpAiPairProgrammingMd.summary.toLowerCase().includes('curl'), false);

  const getStartedQuickstartMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-get-started-quickstart.md'), 'utf8')
  );
  assert.equal(getStartedQuickstartMd.title, 'Quickstart');
  assert.match(getStartedQuickstartMd.summary, /first useful change/);
  assert.match(getStartedQuickstartMd.summary, /Next steps/);
  assert.equal(getStartedQuickstartMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(getStartedQuickstartMd.summary), false);
  assert.equal(getStartedQuickstartMd.summary.toLowerCase().includes('curl'), false);

  const helpGettingStartedInstallMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-getting-started-install.md'), 'utf8')
  );
  assert.equal(helpGettingStartedInstallMd.title, 'Download and install Cursor');
  assert.match(helpGettingStartedInstallMd.summary, /What do I need before installing/);
  assert.match(helpGettingStartedInstallMd.summary, /How do I install Cursor/);
  assert.equal(helpGettingStartedInstallMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGettingStartedInstallMd.summary), false);
  assert.equal(helpGettingStartedInstallMd.summary.toLowerCase().includes('curl'), false);

  const helpGettingStartedFirstProjectMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-getting-started-first-project.md'), 'utf8')
  );
  assert.equal(helpGettingStartedFirstProjectMd.title, 'Your first project');
  assert.match(helpGettingStartedFirstProjectMd.summary, /How do I open a project in Cursor/);
  assert.match(helpGettingStartedFirstProjectMd.summary, /How do I start using Agent/);
  assert.match(helpGettingStartedFirstProjectMd.summary, /How do I review Agent changes/);
  assert.match(helpGettingStartedFirstProjectMd.summary, /How do I give Agent more context/);
  assert.equal(helpGettingStartedFirstProjectMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGettingStartedFirstProjectMd.summary), false);
  assert.equal(helpGettingStartedFirstProjectMd.summary.toLowerCase().includes('curl'), false);

  const helpGettingStartedBuildAiCodingAgentMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-getting-started-build-ai-coding-agent.md'), 'utf8')
  );
  assert.equal(helpGettingStartedBuildAiCodingAgentMd.title, 'How do I build an AI coding agent?');
  assert.match(helpGettingStartedBuildAiCodingAgentMd.summary, /What is a coding agent made of/);
  assert.match(helpGettingStartedBuildAiCodingAgentMd.summary, /Can I build an agent without coding/);
  assert.match(helpGettingStartedBuildAiCodingAgentMd.summary, /How do I build a coding agent with the Cursor SDK/);
  assert.match(helpGettingStartedBuildAiCodingAgentMd.summary, /What can I build with the Cursor SDK/);
  assert.equal(helpGettingStartedBuildAiCodingAgentMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpGettingStartedBuildAiCodingAgentMd.summary), false);
  assert.equal(helpGettingStartedBuildAiCodingAgentMd.summary.toLowerCase().includes('curl'), false);
  assert.equal(helpGettingStartedBuildAiCodingAgentMd.summary.includes('CURSOR_API_KEY'), false);

  const helpSecurityAndPrivacyPrivacyMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-privacy.md'), 'utf8')
  );
  assert.equal(helpSecurityAndPrivacyPrivacyMd.title, 'Privacy and data');
  assert.match(helpSecurityAndPrivacyPrivacyMd.summary, /What is Privacy Mode/);
  assert.match(helpSecurityAndPrivacyPrivacyMd.summary, /How do I enable Privacy Mode/);
  assert.match(helpSecurityAndPrivacyPrivacyMd.summary, /What data is sent to AI providers/);
  assert.match(helpSecurityAndPrivacyPrivacyMd.summary, /Where is my code processed/);
  assert.equal(helpSecurityAndPrivacyPrivacyMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyPrivacyMd.summary), false);
  assert.equal(helpSecurityAndPrivacyPrivacyMd.summary.toLowerCase().includes('curl'), false);

  const helpSecurityAndPrivacyRegionsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-regions.md'), 'utf8')
  );
  assert.equal(helpSecurityAndPrivacyRegionsMd.title, 'Regions and model availability');
  assert.match(helpSecurityAndPrivacyRegionsMd.summary, /What can I do if a model is unavailable in my region/);
  assert.match(helpSecurityAndPrivacyRegionsMd.summary, /Which regions does each provider support/);
  assert.match(helpSecurityAndPrivacyRegionsMd.summary, /Can I use Grok 4.5 in the EU/);
  assert.match(helpSecurityAndPrivacyRegionsMd.summary, /Is Cursor Start available outside India/);
  assert.match(helpSecurityAndPrivacyRegionsMd.summary, /Does Cursor offer data residency controls/);
  assert.equal(helpSecurityAndPrivacyRegionsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyRegionsMd.summary), false);
  assert.equal(helpSecurityAndPrivacyRegionsMd.summary.toLowerCase().includes('curl'), false);

  const helpSecurityAndPrivacySsoMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-sso.md'), 'utf8')
  );
  assert.equal(helpSecurityAndPrivacySsoMd.title, 'SSO and authentication');
  assert.match(helpSecurityAndPrivacySsoMd.summary, /What do I need before setting up SSO/);
  assert.match(helpSecurityAndPrivacySsoMd.summary, /How do I set up SSO/);
  assert.match(helpSecurityAndPrivacySsoMd.summary, /Does Cursor support SCIM provisioning/);
  assert.match(helpSecurityAndPrivacySsoMd.summary, /How do I view my SSO configuration and domains/);
  assert.match(helpSecurityAndPrivacySsoMd.summary, /Why do team members see "Not assigned to this application"/);
  assert.equal(helpSecurityAndPrivacySsoMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacySsoMd.summary), false);
  assert.equal(helpSecurityAndPrivacySsoMd.summary.toLowerCase().includes('curl'), false);

  const helpSecurityAndPrivacyAccountCompromisedMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-account-compromised.md'), 'utf8')
  );
  assert.equal(helpSecurityAndPrivacyAccountCompromisedMd.title, 'Compromised account');
  assert.match(helpSecurityAndPrivacyAccountCompromisedMd.summary, /What are signs of unauthorized account access/);
  assert.match(helpSecurityAndPrivacyAccountCompromisedMd.summary, /How do I secure my Cursor account/);
  assert.match(helpSecurityAndPrivacyAccountCompromisedMd.summary, /What if I use SSO to log in/);
  assert.match(helpSecurityAndPrivacyAccountCompromisedMd.summary, /Should I contact Cursor support/);
  assert.match(helpSecurityAndPrivacyAccountCompromisedMd.summary, /How do I check for unauthorized usage/);
  assert.match(helpSecurityAndPrivacyAccountCompromisedMd.summary, /What if my API keys were exposed/);
  assert.equal(helpSecurityAndPrivacyAccountCompromisedMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyAccountCompromisedMd.summary), false);
  assert.equal(helpSecurityAndPrivacyAccountCompromisedMd.summary.toLowerCase().includes('curl'), false);

  const helpSecurityAndPrivacyMarketplaceSecurityMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-security-and-privacy-marketplace-security.md'), 'utf8')
  );
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurityMd.title, 'Marketplace security');
  assert.match(helpSecurityAndPrivacyMarketplaceSecurityMd.summary, /What risk does installing a plugin carry/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurityMd.summary, /Are plugins open source/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurityMd.summary, /Are plugin updates reviewed/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurityMd.summary, /What happens if a security issue is found in a plugin/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurityMd.summary, /Are plugin authors required to maintain their plugins/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurityMd.summary, /How do I report a plugin issue/);
  assert.match(helpSecurityAndPrivacyMarketplaceSecurityMd.summary, /How do you decide which plugins to list/);
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurityMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpSecurityAndPrivacyMarketplaceSecurityMd.summary), false);
  assert.equal(helpSecurityAndPrivacyMarketplaceSecurityMd.summary.toLowerCase().includes('curl'), false);

  const helpTroubleshootingAgentIssuesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-agent-issues.md'), 'utf8')
  );
  assert.equal(helpTroubleshootingAgentIssuesMd.title, 'Agent troubleshooting');
  assert.match(helpTroubleshootingAgentIssuesMd.summary, /How can I improve Agent accuracy/);
  assert.match(helpTroubleshootingAgentIssuesMd.summary, /What if Agent doesn't pick up my files/);
  assert.match(helpTroubleshootingAgentIssuesMd.summary, /How do I undo Agent changes/);
  assert.match(helpTroubleshootingAgentIssuesMd.summary, /What if Agent sets CI=1 in terminal commands/);
  assert.match(helpTroubleshootingAgentIssuesMd.summary, /What if I see "Agent Execution Timed Out"/);
  assert.match(helpTroubleshootingAgentIssuesMd.summary, /How do I report a bad Agent response/);
  assert.equal(helpTroubleshootingAgentIssuesMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingAgentIssuesMd.summary), false);
  assert.equal(helpTroubleshootingAgentIssuesMd.summary.toLowerCase().includes('curl'), false);

  const helpTroubleshootingTabIssuesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-tab-issues.md'), 'utf8')
  );
  assert.equal(helpTroubleshootingTabIssuesMd.title, 'How do I troubleshoot Tab completions?');
  assert.match(helpTroubleshootingTabIssuesMd.summary, /Why aren't Tab suggestions appearing/);
  assert.match(helpTroubleshootingTabIssuesMd.summary, /How can I improve Tab suggestion quality/);
  assert.match(helpTroubleshootingTabIssuesMd.summary, /What if Tab feels slow/);
  assert.match(helpTroubleshootingTabIssuesMd.summary, /How do I toggle Tab off for certain file types/);
  assert.equal(helpTroubleshootingTabIssuesMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingTabIssuesMd.summary), false);
  assert.equal(helpTroubleshootingTabIssuesMd.summary.toLowerCase().includes('curl'), false);

  const helpTroubleshootingInstallIssuesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-install-issues.md'), 'utf8')
  );
  assert.equal(helpTroubleshootingInstallIssuesMd.title, 'Installation and startup');
  assert.match(helpTroubleshootingInstallIssuesMd.summary, /What if I see a blank screen on startup/);
  assert.match(helpTroubleshootingInstallIssuesMd.summary, /How do I update Cursor/);
  assert.match(helpTroubleshootingInstallIssuesMd.summary, /What are update channels/);
  assert.match(helpTroubleshootingInstallIssuesMd.summary, /What does the macOS "Cursor is damaged" warning mean/);
  assert.match(helpTroubleshootingInstallIssuesMd.summary, /How do I free up disk space used by Cursor/);
  assert.equal(helpTroubleshootingInstallIssuesMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingInstallIssuesMd.summary), false);
  assert.equal(helpTroubleshootingInstallIssuesMd.summary.toLowerCase().includes('curl'), false);

  const helpTroubleshootingNetworkMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-network.md'), 'utf8')
  );
  assert.equal(helpTroubleshootingNetworkMd.title, 'Network, proxy, and remote connections');
  assert.match(helpTroubleshootingNetworkMd.summary, /How do I run network diagnostics/);
  assert.match(helpTroubleshootingNetworkMd.summary, /What if AI features stop working behind a proxy/);
  assert.match(helpTroubleshootingNetworkMd.summary, /Which domains does Cursor need access to/);
  assert.match(helpTroubleshootingNetworkMd.summary, /What if AI features don't work over SSH or remote connections/);
  assert.match(helpTroubleshootingNetworkMd.summary, /What if a VPN causes DNS resolution failures/);
  assert.match(helpTroubleshootingNetworkMd.summary, /What does the "suspicious activity" message mean/);
  assert.equal(helpTroubleshootingNetworkMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingNetworkMd.summary), false);
  assert.equal(helpTroubleshootingNetworkMd.summary.toLowerCase().includes('curl'), false);

  const helpTroubleshootingExtensionsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-extensions.md'), 'utf8')
  );
  assert.equal(helpTroubleshootingExtensionsMd.title, 'Extension conflicts');
  assert.match(helpTroubleshootingExtensionsMd.summary, /How do I identify a conflicting extension/);
  assert.match(helpTroubleshootingExtensionsMd.summary, /Which extensions commonly conflict/);
  assert.match(helpTroubleshootingExtensionsMd.summary, /How do I disable an extension/);
  assert.equal(helpTroubleshootingExtensionsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingExtensionsMd.summary), false);
  assert.equal(helpTroubleshootingExtensionsMd.summary.toLowerCase().includes('curl'), false);

  const helpTroubleshootingPerformanceMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-performance.md'), 'utf8')
  );
  assert.equal(helpTroubleshootingPerformanceMd.title, 'Performance');
  assert.match(helpTroubleshootingPerformanceMd.summary, /How do I reduce high CPU or memory usage/);
  assert.match(helpTroubleshootingPerformanceMd.summary, /How do I reduce editor input delay/);
  assert.equal(helpTroubleshootingPerformanceMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingPerformanceMd.summary), false);
  assert.equal(helpTroubleshootingPerformanceMd.summary.toLowerCase().includes('curl'), false);

  const helpTroubleshootingReportingBugsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-troubleshooting-reporting-bugs.md'), 'utf8')
  );
  assert.equal(helpTroubleshootingReportingBugsMd.title, 'Reporting a bug');
  assert.match(helpTroubleshootingReportingBugsMd.summary, /What should I include in a bug report/);
  assert.match(helpTroubleshootingReportingBugsMd.summary, /Where do I report Cursor bugs/);
  assert.match(helpTroubleshootingReportingBugsMd.summary, /What is a request ID/);
  assert.match(helpTroubleshootingReportingBugsMd.summary, /How do I find my request ID/);
  assert.match(helpTroubleshootingReportingBugsMd.summary, /How does Privacy Mode affect debugging/);
  assert.match(helpTroubleshootingReportingBugsMd.summary, /How should I report an issue involving unexpected agent behavior/);
  assert.equal(helpTroubleshootingReportingBugsMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpTroubleshootingReportingBugsMd.summary), false);
  assert.equal(helpTroubleshootingReportingBugsMd.summary.toLowerCase().includes('curl'), false);

  const helpIntegrationsGitMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/help-integrations-git.md'), 'utf8')
  );
  assert.equal(helpIntegrationsGitMd.title, 'Git');
  assert.match(helpIntegrationsGitMd.summary, /Can Agent write commit messages for me/);
  assert.match(helpIntegrationsGitMd.summary, /How does AI merge conflict resolution work/);
  assert.match(helpIntegrationsGitMd.summary, /How does Agent attribution work/);
  assert.match(helpIntegrationsGitMd.summary, /Can enterprise admins control commit attribution/);
  assert.match(helpIntegrationsGitMd.summary, /What is Cursor Blame/);
  assert.match(helpIntegrationsGitMd.summary, /Does Agent work across multiple workspaces/);
  assert.equal(helpIntegrationsGitMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(helpIntegrationsGitMd.summary), false);
  assert.equal(helpIntegrationsGitMd.summary.toLowerCase().includes('curl'), false);

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

  const settingsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-settings.md'), 'utf8')
  );
  assert.equal(settingsMd.title, 'Cloud Agents settings');
  assert.match(settingsMd.summary, /\.cursor\/environment\.json/);
  assert.match(settingsMd.summary, /allowlist/i);
  assert.match(settingsMd.summary, /Team follow-ups/i);
  assert.match(settingsMd.summary, /secret exposure/i);
  assert.equal(settingsMd.summary.includes('Sitemap'), false);
  assert.equal(/Default settings —/.test(settingsMd.summary), false);
  assert.equal(/Security settings —/.test(settingsMd.summary), false);

  const privateConnectivityMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-private-connectivity.md'), 'utf8')
  );
  assert.equal(privateConnectivityMd.title, 'Private Connectivity');
  assert.match(privateConnectivityMd.summary, /AWS PrivateLink/);
  assert.match(privateConnectivityMd.summary, /Cloudflare Tunnel/);
  assert.match(privateConnectivityMd.summary, /How to choose/);
  assert.match(privateConnectivityMd.summary, /Supported options/);
  assert.equal(privateConnectivityMd.summary.includes('10.2.8.0'), false);
  assert.equal(privateConnectivityMd.summary.includes('api2.cursor.sh'), false);
  assert.equal(privateConnectivityMd.summary.includes('github-integration-setup'), false);
  assert.equal(privateConnectivityMd.summary.includes('Sitemap'), false);
  assert.equal(/AWS PrivateLink —/.test(privateConnectivityMd.summary), false);
  assert.equal(/Cloudflare Tunnel —/.test(privateConnectivityMd.summary), false);
  assert.equal(/Prerequisites —/.test(privateConnectivityMd.summary), false);
  assert.equal(/Complete the source control connection —/.test(privateConnectivityMd.summary), false);
  assert.equal(/Check the private webhook path —/.test(privateConnectivityMd.summary), false);

  const bugbotMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-bugbot.md'), 'utf8')
  );
  assert.equal(bugbotMd.title, 'Bugbot');
  assert.match(bugbotMd.summary, /How it works/);
  assert.match(bugbotMd.summary, /\/review-bugbot/);
  assert.match(bugbotMd.summary, /\.cursor\/BUGBOT\.md/);
  assert.match(bugbotMd.summary, /Autofix/);
  assert.equal(bugbotMd.summary.includes('github.md'), false);
  assert.equal(bugbotMd.summary.includes('YOUR_API_KEY'), false);
  assert.equal(bugbotMd.summary.includes('Sitemap'), false);
  assert.equal(/Setup —/.test(bugbotMd.summary), false);
  assert.equal(/CI check statuses —/.test(bugbotMd.summary), false);
  assert.equal(/API —/.test(bugbotMd.summary), false);
  assert.equal(/Admin Configuration API —/.test(bugbotMd.summary), false);
  assert.equal(/Pricing —/.test(bugbotMd.summary), false);
  assert.equal(/Troubleshooting —/.test(bugbotMd.summary), false);

  const securityAgentsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-security-agents.md'), 'utf8')
  );
  assert.equal(securityAgentsMd.title, 'Security Agents');
  assert.match(securityAgentsMd.summary, /How it works/);
  assert.match(securityAgentsMd.summary, /Security Reviewer/);
  assert.match(securityAgentsMd.summary, /Vulnerability Scanner/);
  assert.match(securityAgentsMd.summary, /\/review-security/);
  assert.equal(securityAgentsMd.summary.includes('on-demand spend'), false);
  assert.equal(securityAgentsMd.summary.includes('Sitemap'), false);
  assert.equal(/Setup —/.test(securityAgentsMd.summary), false);
  assert.equal(/Billing —/.test(securityAgentsMd.summary), false);
  assert.equal(/Analytics —/.test(securityAgentsMd.summary), false);
  assert.equal(/Viewing Runs —/.test(securityAgentsMd.summary), false);

  const approvalAgentsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-approval-agents.md'), 'utf8')
  );
  assert.equal(approvalAgentsMd.title, 'PR Routing & Approval');
  assert.match(approvalAgentsMd.summary, /How it works/);
  assert.match(approvalAgentsMd.summary, /code ownership/);
  assert.match(approvalAgentsMd.summary, /Approval policy files/);
  assert.match(approvalAgentsMd.summary, /APPROVAL_POLICY\.md/);
  assert.match(approvalAgentsMd.summary, /Routing policies/);
  assert.match(approvalAgentsMd.summary, /\.cursor\/approval-policies\/ROUTING\.md/);
  assert.match(approvalAgentsMd.summary, /Policy precedence/);
  assert.equal(approvalAgentsMd.summary.includes('Sitemap'), false);
  assert.equal(/Setup —/.test(approvalAgentsMd.summary), false);
  assert.equal(/Enable routing and approval —/.test(approvalAgentsMd.summary), false);
  assert.equal(/Configure triggers —/.test(approvalAgentsMd.summary), false);
  assert.equal(/Save and enable —/.test(approvalAgentsMd.summary), false);

  const mobileMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-mobile.md'), 'utf8')
  );
  assert.equal(mobileMd.title, 'Cursor for iOS');
  assert.match(mobileMd.summary, /What you can do|What lives on the web|Remote Control/);
  assert.match(mobileMd.summary, /\/remote-control/);
  assert.match(mobileMd.summary, /Privacy Mode \(Legacy\)/);
  assert.equal(mobileMd.summary.includes('Sitemap'), false);
  assert.equal(/Getting started —/.test(mobileMd.summary), false);
  assert.equal(/Related pages —/.test(mobileMd.summary), false);
  assert.equal(/Before you start —/.test(mobileMd.summary), false);
  assert.equal(/Team controls —/.test(mobileMd.summary), false);
  assert.equal(mobileMd.summary.includes('github.md'), false);
  assert.equal(mobileMd.summary.includes('gitlab.md'), false);

  const apiEndpointsMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-cloud-agent-api-endpoints.md'), 'utf8')
  );
  assert.equal(apiEndpointsMd.title, 'Cloud Agents API');
  assert.match(apiEndpointsMd.summary, /public beta/i);
  assert.match(apiEndpointsMd.summary, /Cloud Agents API/);
  assert.equal(apiEndpointsMd.summary.includes('YOUR_API_KEY'), false);
  assert.equal(apiEndpointsMd.summary.includes('YOUR_GITHUB_TOKEN'), false);
  assert.equal(apiEndpointsMd.summary.includes('Sitemap'), false);
  assert.equal(/Endpoints —/.test(apiEndpointsMd.summary), false);
  assert.equal(/Create An Agent —/.test(apiEndpointsMd.summary), false);

  const agentsWindowMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-agents-window.md'), 'utf8')
  );
  assert.equal(agentsWindowMd.title, 'Agents Window');
  assert.match(agentsWindowMd.summary, /Features Available Only in the Agents Window/);
  assert.match(agentsWindowMd.summary, /\/in-cloud/);
  assert.match(agentsWindowMd.summary, /\/autopilot/);
  assert.equal(agentsWindowMd.summary.includes('Sitemap'), false);
  assert.equal(/Open the Agents Window —/.test(agentsWindowMd.summary), false);
  assert.equal(/Switch Back to the IDE —/.test(agentsWindowMd.summary), false);
  assert.equal(/Enterprise access —/.test(agentsWindowMd.summary), false);

  const agentReviewMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-agent-review.md'), 'utf8')
  );
  assert.equal(agentReviewMd.title, 'Agent Review');
  assert.match(agentReviewMd.summary, /Running a review/);
  assert.match(agentReviewMd.summary, /\/agent-review/);
  assert.match(agentReviewMd.summary, /Review depth/);
  assert.match(agentReviewMd.summary, /BUGBOT\.md/);
  assert.equal(agentReviewMd.summary.includes('Sitemap'), false);
  assert.equal(/Setup —/.test(agentReviewMd.summary), false);

  const planModeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-plan-mode.md'), 'utf8')
  );
  assert.equal(planModeMd.title, 'Plan Mode');
  assert.match(planModeMd.summary, /How it works/);
  assert.match(planModeMd.summary, /When to use Plan Mode/);
  assert.match(planModeMd.summary, /Starting over from a plan/);
  assert.equal(planModeMd.summary.includes('Sitemap'), false);
  assert.equal(/Switching modes —/.test(planModeMd.summary), false);
  assert.equal(/Related —/.test(planModeMd.summary), false);

  const debugModeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-debug-mode.md'), 'utf8')
  );
  assert.equal(debugModeMd.title, 'Debug Mode');
  assert.match(debugModeMd.summary, /When to use Debug Mode/);
  assert.match(debugModeMd.summary, /How it works/);
  assert.match(debugModeMd.summary, /Tips for Debug Mode/);
  assert.equal(debugModeMd.summary.includes('Sitemap'), false);
  assert.equal(/Switching modes —/.test(debugModeMd.summary), false);
  assert.equal(/Related —/.test(debugModeMd.summary), false);

  const designModeMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-design-mode.md'), 'utf8')
  );
  assert.equal(designModeMd.title, 'Design Mode');
  assert.match(designModeMd.summary, /Ways to direct the agent/);
  assert.match(designModeMd.summary, /Select an element/);
  assert.match(designModeMd.summary, /Draw on the page/);
  assert.match(designModeMd.summary, /What the agent sees/);
  assert.match(designModeMd.summary, /Work in flow/);
  assert.equal(designModeMd.summary.includes('Sitemap'), false);
  assert.equal(/Open Design Mode —/.test(designModeMd.summary), false);
  assert.equal(/Keyboard shortcuts —/.test(designModeMd.summary), false);
  assert.equal(/Related —/.test(designModeMd.summary), false);

  const browserToolMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-browser.md'), 'utf8')
  );
  assert.equal(browserToolMd.title, 'Browser');
  assert.match(browserToolMd.summary, /Native integration/);
  assert.match(browserToolMd.summary, /Browser capabilities/);
  assert.match(browserToolMd.summary, /Session persistence/);
  assert.match(browserToolMd.summary, /Navigate/);
  assert.match(browserToolMd.summary, /Console Output/);
  assert.match(browserToolMd.summary, /Tool approval/);
  assert.equal(browserToolMd.summary.includes('Sitemap'), false);
  assert.equal(/Recommended models —/.test(browserToolMd.summary), false);
  assert.equal(/Enterprise usage —/.test(browserToolMd.summary), false);
  assert.equal(/Related —/.test(browserToolMd.summary), false);

  const terminalToolMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-terminal.md'), 'utf8')
  );
  assert.equal(terminalToolMd.title, 'Terminal');
  assert.match(terminalToolMd.summary, /Sandbox/);
  assert.match(terminalToolMd.summary, /sandbox\.json/);
  assert.match(terminalToolMd.summary, /CURSOR_AGENT/);
  assert.equal(terminalToolMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(terminalToolMd.summary), false);

  const searchToolMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-search.md'), 'utf8')
  );
  assert.equal(searchToolMd.title, 'Search');
  assert.match(searchToolMd.summary, /Instant Grep/);
  assert.match(searchToolMd.summary, /Explore subagent/);
  assert.match(searchToolMd.summary, /Privacy and security/);
  assert.equal(searchToolMd.summary.includes('Sitemap'), false);
  assert.equal(/FAQ —/.test(searchToolMd.summary), false);

  const canvasToolMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-tools-canvas.md'), 'utf8')
  );
  assert.equal(canvasToolMd.title, 'Canvases');
  assert.match(canvasToolMd.summary, /How it works/);
  assert.match(canvasToolMd.summary, /Opening a canvas/);
  assert.match(canvasToolMd.summary, /Sharing canvases/);
  assert.match(canvasToolMd.summary, /Open Canvas/);
  assert.equal(canvasToolMd.summary.includes('Sitemap'), false);
  assert.equal(/Related —/.test(canvasToolMd.summary), false);
  assert.equal(canvasToolMd.summary.includes('Custom Mode'), false);

  const worktreesMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-configuration-worktrees.md'), 'utf8')
  );
  assert.equal(worktreesMd.title, 'Worktrees');
  assert.match(worktreesMd.summary, /Agents Window/);
  assert.match(worktreesMd.summary, /\.cursor\/worktrees\.json/);
  assert.match(worktreesMd.summary, /Worktree Skills/);
  assert.equal(worktreesMd.summary.includes('Sitemap'), false);
  assert.equal(/Example setup configurations —/.test(worktreesMd.summary), false);
  assert.equal(worktreesMd.summary.includes('Custom Mode'), false);

  const agentSecurityMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-agent-security.md'), 'utf8')
  );
  assert.equal(agentSecurityMd.title, 'Agent Security');
  assert.match(agentSecurityMd.summary, /First-party tool calls/);
  assert.match(agentSecurityMd.summary, /Run Modes/);
  assert.match(agentSecurityMd.summary, /\.cursorignore/);
  assert.match(agentSecurityMd.summary, /Third-party tool calls/);
  assert.match(agentSecurityMd.summary, /Network requests/);
  assert.equal(agentSecurityMd.summary.includes('Sitemap'), false);
  assert.equal(/Workspace trust —/.test(agentSecurityMd.summary), false);
  assert.equal(/Responsible disclosure —/.test(agentSecurityMd.summary), false);

  const customizeCursorMd = parseOfficialMarkdown(
    fs.readFileSync(path.join(__dirname, 'fixtures/x-watch/docs-customize-cursor.md'), 'utf8')
  );
  assert.equal(customizeCursorMd.title, 'Customize Cursor');
  assert.match(customizeCursorMd.summary, /What you can do from Customize/);
  assert.match(customizeCursorMd.summary, /Extension components/);
  assert.match(customizeCursorMd.summary, /plugins, skills, and MCPs/i);
  assert.equal(customizeCursorMd.summary.includes('Sitemap'), false);
  assert.equal(/Learn more —/.test(customizeCursorMd.summary), false);
  assert.equal(/Marketplace leaderboard —/.test(customizeCursorMd.summary), false);
  assert.equal(customizeCursorMd.summary.includes('Custom Mode'), false);

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
      title: 'Grok 4.5',
      source_url: 'https://cursor.com/help/models-and-usage/grok-4-5',
      published_at: null,
      apply_in_eos: 'Help Grok 4.5 is a prior vendor Cursor Model. Honor Auto vs Composer pool and included-credit treatment from official help. Do not treat vendor quality claims as EOS evidence. Honor included quota. Do not switch this watch to on-demand. Do not install @cursor/sdk. Do not put API keys in git. Keep environment.json + Builds.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/grok-4-5'), false);
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
      title: 'Create an Origin repository',
      source_url: 'https://cursor.com/docs/origin/create-repository',
      published_at: null,
      apply_in_eos: 'Creating an Origin repository is optional paid git hosting. GitHub remains source of truth for this synced repo. Do not create an Origin repo or Detach from GitHub for this watch. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Pull requests',
      source_url: 'https://cursor.com/docs/origin/pull-requests',
      published_at: null,
      apply_in_eos: 'Origin pull requests are optional Origin hosting. GitHub remains source of truth for this synced repo. Do not open Origin PRs or Detach from GitHub for this watch. This Cloud Agent VM already opens GitHub PRs. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Browse & Search',
      source_url: 'https://cursor.com/docs/origin/browse',
      published_at: null,
      apply_in_eos: 'Origin browse and search are optional Origin hosting. GitHub remains source of truth for this synced repo. Do not use Origin browse or Detach from GitHub for this watch. This Cloud Agent VM already searches its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Settings',
      source_url: 'https://cursor.com/docs/origin/settings',
      published_at: null,
      apply_in_eos: 'Origin repository settings are optional Origin hosting. GitHub remains source of truth for this synced repo. Do not Detach from GitHub or manage Origin Apps for this watch. This Cloud Agent VM already uses its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Codebase settings',
      source_url: 'https://cursor.com/docs/origin/codebase-settings',
      published_at: null,
      apply_in_eos: 'Origin codebase settings are optional team-level Origin hosting. GitHub remains source of truth for this synced repo. Do not claim a codebase name, turn Origin on or off, or manage Origin Apps for this watch. Do not put Origin API tokens in git. This Cloud Agent VM already uses its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/create-repository'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/pull-requests'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/browse'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/settings'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin/codebase-settings'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings clusters Start from scratch onto Origin and keeps Router', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Start from scratch, without a repo',
      source_url: 'https://cursor.com/changelog/start-from-scratch',
      published_at: 'Thu, 27 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Start from scratch creates an Origin repo without GitHub. GitHub remains source of truth for this synced repo. Do not Start from scratch or create an Origin repo for this watch. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Origin Code Hosting',
      source_url: 'https://cursor.com/changelog/origin-code-hosting',
      published_at: 'Mon, 17 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
    },
    {
      title: 'Origin',
      source_url: 'https://cursor.com/docs/origin',
      published_at: null,
      apply_in_eos: 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/start-from-scratch'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/origin-code-hosting'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/origin'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/router'), true);
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
      title: 'Cursor Router',
      source_url: 'https://cursor.com/help/models-and-usage/cursor-router',
      published_at: null,
      apply_in_eos: 'Help Cursor Router is vendor Auto routing with Cost, Balance, and Intelligence modes. EOS rules still bind model and governance choices. Honor included quota. Do not switch this watch to on-demand. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put API keys in git. Keep environment.json + Builds.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/cursor-router'), false);
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
      title: 'Cloud Agents',
      source_url: 'https://cursor.com/help/ai-features/cloud-agents',
      published_at: null,
      apply_in_eos: 'Help Cloud Agents is vendor isolated-VM Agent. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Move to Cloud for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'What are background agents?',
      source_url: 'https://cursor.com/help/ai-features/background-agents',
      published_at: null,
      apply_in_eos: 'Help Background Agents is vendor isolated-VM Agent. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop background agents for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Grok Bot',
      source_url: 'https://cursor.com/docs/grok-bot',
      published_at: null,
      apply_in_eos: 'Grok Bot is vendor persistent-cloud Bots. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into the Grok Bot desktop or iOS app for daily ingest. This Cloud Agent VM has no Grok Bot Linux app. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
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
    },
    {
      title: 'Cloud Agents API',
      source_url: 'https://cursor.com/docs/cloud-agent/api/endpoints',
      published_at: null,
      apply_in_eos: 'This watch uses official feeds, not the Cloud Agents API. Do not treat api.cursor.com as this ingest path. Do not put API keys in git. Keep GitHub as source of truth. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor TypeScript SDK',
      source_url: 'https://cursor.com/docs/sdk/typescript',
      published_at: null,
      apply_in_eos: 'The TypeScript SDK is optional agent scripting. This watch uses official feeds, not @cursor/sdk or api.cursor.com. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor Python SDK',
      source_url: 'https://cursor.com/docs/sdk/python',
      published_at: null,
      apply_in_eos: 'The Python SDK is optional agent scripting. This watch uses official feeds, not cursor-sdk or api.cursor.com. Do not install cursor-sdk or rotate this watch into SDK scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor SDK Bridge',
      source_url: 'https://cursor.com/docs/sdk/bridge',
      published_at: null,
      apply_in_eos: 'The SDK Bridge is optional local protocol for languages without a first-party SDK. This watch uses official feeds, not cursor-sdk-bridge or api.cursor.com. Do not install the SDK Bridge or rotate this watch into adapter scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Models & Pricing',
      source_url: 'https://cursor.com/docs/models-and-pricing',
      published_at: null,
      apply_in_eos: 'Honor included Cursor Models vs Other Models pools. Do not treat vendor rates as EOS budget evidence.'
    },
    {
      title: 'Team Pricing',
      source_url: 'https://cursor.com/docs/account/teams/pricing',
      published_at: null,
      apply_in_eos: 'Team Pricing is vendor Teams and Enterprise billing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor team seat prices as EOS budget evidence. This Cloud Agent is not a Teams admin dashboard. Keep environment.json + Builds.'
    },
    {
      title: 'Members, Roles, and Seat Types',
      source_url: 'https://cursor.com/docs/account/teams/members',
      published_at: null,
      apply_in_eos: 'Members, roles, and seat types are vendor Teams admin config. Honor included quota. Do not switch this watch to on-demand. This Cloud Agent is not a Teams admin dashboard. Do not ingest Teams setup or SSO pages. Keep environment.json + Builds.'
    },
    {
      title: 'Pricing and plans',
      source_url: 'https://cursor.com/help/account-and-billing/pricing',
      published_at: null,
      apply_in_eos: 'Help Pricing and plans lists vendor individual and Teams plan names. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor plan prices as EOS budget evidence. Do not change this Cloud Agent billing from the dashboard. Keep environment.json + Builds.'
    },
    {
      title: 'Available models',
      source_url: 'https://cursor.com/help/models-and-usage/available-models',
      published_at: null,
      apply_in_eos: 'Help Available models lists vendor model names and Auto routing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor model rates as EOS budget evidence. Do not put API keys in git. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Keep environment.json + Builds.'
    },
    {
      title: 'Cursor Router',
      source_url: 'https://cursor.com/changelog/router',
      published_at: 'Wed, 22 Jul 2026 00:00:00 GMT',
      apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
    },
    {
      title: 'Cursor Router',
      source_url: 'https://cursor.com/help/models-and-usage/cursor-router',
      published_at: null,
      apply_in_eos: 'Help Cursor Router is vendor Auto routing with Cost, Balance, and Intelligence modes. EOS rules still bind model and governance choices. Honor included quota. Do not switch this watch to on-demand. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put API keys in git. Keep environment.json + Builds.'
    },
    {
      title: 'Agents Window',
      source_url: 'https://cursor.com/docs/agent/agents-window',
      published_at: null,
      apply_in_eos: 'This watch already runs in the Cloud Agent VM, not in the desktop Agents Window. Use /in-cloud or /babysit when a local session must hand work to its own VM. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Design Mode',
      source_url: 'https://cursor.com/docs/agent/design-mode',
      published_at: null,
      apply_in_eos: 'Design Mode is optional desktop visual prompting in the Agents Window. This watch already runs in the Cloud Agent VM, not the desktop Agents Window. Do not rotate this Cloud Agent into Design Mode for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Browser',
      source_url: 'https://cursor.com/docs/agent/tools/browser',
      published_at: null,
      apply_in_eos: 'Browser is optional desktop browser control. This watch already runs in the Cloud Agent VM and uses official feeds, not live sites. Do not rotate this Cloud Agent into Browser for daily ingest. Keep environment.json + Builds. Team MCP dashboard controls are not EOS governance. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Terminal',
      source_url: 'https://cursor.com/docs/agent/tools/terminal',
      published_at: null,
      apply_in_eos: 'Terminal is optional desktop shell control with Run Mode and sandbox.json. This Cloud Agent VM already runs shell commands. Do not rotate this Cloud Agent into desktop Terminal for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Search',
      source_url: 'https://cursor.com/docs/agent/tools/search',
      published_at: null,
      apply_in_eos: 'Search is optional desktop Instant Grep and Explore subagent. This Cloud Agent VM already searches the workspace. Do not rotate this Cloud Agent into desktop Search for daily ingest. Keep environment.json + Builds. Do not put .cursor/keys in git. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Canvases',
      source_url: 'https://cursor.com/docs/agent/tools/canvas',
      published_at: null,
      apply_in_eos: 'Canvases are optional desktop interactive artifacts in the Agents Window. This watch already runs in the Cloud Agent VM. Do not rotate this Cloud Agent into desktop Canvases for daily ingest. Keep environment.json + Builds. Shared canvases and team dashboard controls are not EOS governance. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Worktrees',
      source_url: 'https://cursor.com/docs/configuration/worktrees',
      published_at: null,
      apply_in_eos: 'Worktrees are optional desktop isolated Git checkouts in the Agents Window. This Cloud Agent VM already has its own checkout. Do not rotate this Cloud Agent into desktop worktrees for daily ingest. Keep environment.json + Builds. Do not put secrets in .cursor/worktrees.json. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Agent Security',
      source_url: 'https://cursor.com/docs/agent/security',
      published_at: null,
      apply_in_eos: 'Agent Security is optional desktop guardrails for first-party tools, MCP, and network. This Cloud Agent VM already honors EOS TDD and .cursorignore. Do not rotate this Cloud Agent into desktop Agent Security settings for daily ingest. Keep environment.json + Builds. Run Modes are best-effort, not a hard security boundary. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Ignore files',
      source_url: 'https://cursor.com/help/customization/ignore-files',
      published_at: null,
      apply_in_eos: 'Help Ignore files is vendor Agent context exclusions. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop ignore-file setup for daily ingest. Keep .cursorignore. Do not put secrets in git. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Privacy and data',
      source_url: 'https://cursor.com/help/security-and-privacy/privacy',
      published_at: null,
      apply_in_eos: 'Help Privacy is vendor Privacy Mode data-handling. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Privacy Mode settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Regions and model availability',
      source_url: 'https://cursor.com/help/security-and-privacy/regions',
      published_at: null,
      apply_in_eos: 'Help Regions is vendor region/model-availability data-handling. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop region, API-key, or Cursor Start settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'SSO and authentication',
      source_url: 'https://cursor.com/help/security-and-privacy/sso',
      published_at: null,
      apply_in_eos: 'Help SSO is vendor team SAML authentication. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop or team SSO settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Compromised account',
      source_url: 'https://cursor.com/help/security-and-privacy/account-compromised',
      published_at: null,
      apply_in_eos: 'Help Compromised account is vendor compromised-account incident response. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard session revoke, billing, or API-key settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Marketplace security',
      source_url: 'https://cursor.com/help/security-and-privacy/marketplace-security',
      published_at: null,
      apply_in_eos: 'Help Marketplace security is vendor marketplace plugin review. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into marketplace plugin install for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'What is multi-agent coding?',
      source_url: 'https://cursor.com/help/ai-features/multi-agent',
      published_at: null,
      apply_in_eos: 'Help multi-agent is vendor desktop Agents Window parallelism. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Agents Window, /multitask, or Build in Parallel for daily ingest. This Cloud Agent VM already runs one isolated agent. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    }
  ], 6);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-19-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/subagents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/agents-window'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/design-mode'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/tools/browser'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/tools/terminal'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/tools/search'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/tools/canvas'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/configuration/worktrees'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/security'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/ignore-files'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/privacy'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/regions'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/sso'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/account-compromised'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/marketplace-security'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/multi-agent'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-13-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/builds'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/cloud-agents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/background-agents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/grok-bot'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/api/endpoints'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/typescript'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/python'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/bridge'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/account/teams/pricing'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/account/teams/members'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/account-and-billing/pricing'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/available-models'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/cursor-router'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/models-and-pricing'), true);
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
      title: 'Plan Mode',
      source_url: 'https://cursor.com/docs/agent/plan-mode',
      published_at: null,
      apply_in_eos: 'Plan Mode is optional desktop planning before code. Keep this watch on the standing /goal; do not rotate this Cloud Agent into Plan Mode for daily ingest. EOS TDD remains required. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Debug Mode',
      source_url: 'https://cursor.com/docs/agent/debug-mode',
      published_at: null,
      apply_in_eos: 'Debug Mode is optional desktop debugging with a local Cursor extension. This watch already uses EOS TDD in the Cloud Agent VM; do not rotate this Cloud Agent into Debug Mode for daily ingest. Keep the standing /goal. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Agent mode',
      source_url: 'https://cursor.com/help/ai-features/agent',
      published_at: null,
      apply_in_eos: 'Help Agent mode is vendor desktop Agent. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Agent mode for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Ask mode',
      source_url: 'https://cursor.com/help/ai-features/ask-mode',
      published_at: null,
      apply_in_eos: 'Help Ask mode is vendor desktop read-only Agent. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Ask mode for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Plan mode',
      source_url: 'https://cursor.com/help/ai-features/plan-mode',
      published_at: null,
      apply_in_eos: 'Help Plan mode is vendor desktop planning before code. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Plan mode for daily ingest. EOS TDD remains required. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Tab completion',
      source_url: 'https://cursor.com/help/ai-features/tab',
      published_at: null,
      apply_in_eos: 'Help Tab is vendor desktop autocomplete. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Tab for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Inline edit',
      source_url: 'https://cursor.com/help/ai-features/inline-edit',
      published_at: null,
      apply_in_eos: 'Help Inline edit is vendor desktop Cmd+K. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Inline edit for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cloud Agents',
      source_url: 'https://cursor.com/docs/cloud-agent',
      published_at: null,
      apply_in_eos: 'Cloud Agents run on isolated VMs. Use environment.json + Builds; keep this watch on official feeds, not X.'
    },
    {
      title: 'Cloud Agents',
      source_url: 'https://cursor.com/help/ai-features/cloud-agents',
      published_at: null,
      apply_in_eos: 'Help Cloud Agents is vendor isolated-VM Agent. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Move to Cloud for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'What are background agents?',
      source_url: 'https://cursor.com/help/ai-features/background-agents',
      published_at: null,
      apply_in_eos: 'Help Background Agents is vendor isolated-VM Agent. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop background agents for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Shared transcripts',
      source_url: 'https://cursor.com/help/ai-features/shared-transcripts',
      published_at: null,
      apply_in_eos: 'Help Shared transcripts is vendor conversation sharing. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into shared transcripts for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor CLI',
      source_url: 'https://cursor.com/docs/cli/overview',
      published_at: null,
      apply_in_eos: 'Cursor CLI is optional local terminal agent. This Cloud Agent VM already runs ingest without the local agent CLI. Do not install Cursor CLI or rotate this watch into print mode, sandbox, or Cloud Agent handoff for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Using Agent in CLI',
      source_url: 'https://cursor.com/docs/cli/using',
      published_at: null,
      apply_in_eos: 'Using Agent in CLI is optional local terminal agent. This Cloud Agent VM already runs ingest without the local agent CLI. Do not rotate this watch into print mode, worktrees, ACP, or Cloud Agent handoff for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Shell Mode',
      source_url: 'https://cursor.com/docs/cli/shell-mode',
      published_at: null,
      apply_in_eos: 'Shell Mode is optional local Cursor CLI. This Cloud Agent VM already runs shell commands. Do not rotate this watch into Cursor CLI Shell Mode for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'ACP',
      source_url: 'https://cursor.com/docs/cli/acp',
      published_at: null,
      apply_in_eos: 'ACP is optional local Cursor CLI protocol for custom clients. This Cloud Agent VM already runs ingest without an ACP client. Do not rotate this watch into agent acp, custom stdio clients, or IDE integrations for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Using Headless CLI',
      source_url: 'https://cursor.com/docs/cli/headless',
      published_at: null,
      apply_in_eos: 'Headless CLI is optional local Cursor CLI for scripts. This Cloud Agent VM already runs ingest without print mode. Do not rotate this watch into print mode, --force, or install Cursor CLI for daily ingest. Do not put CURSOR_API_KEY in git. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Agent Skills',
      source_url: 'https://cursor.com/docs/skills',
      published_at: null,
      apply_in_eos: 'Pin an EOS skill as a Custom Mode when a session must stay on one playbook.'
    },
    {
      title: 'Rules',
      source_url: 'https://cursor.com/help/customization/rules',
      published_at: null,
      apply_in_eos: 'Help Rules is vendor Agent instructions. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team rules for daily ingest. Keep .mdc, AGENTS.md, and /create-rule. Team dashboard rules are not EOS governance. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Skills',
      source_url: 'https://cursor.com/help/customization/skills',
      published_at: null,
      apply_in_eos: 'Help Skills is vendor Agent workflows. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team skills for daily ingest. Keep SKILL.md under .cursor/skills. Prefer /create-skill. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'MCP integrations',
      source_url: 'https://cursor.com/help/customization/mcp',
      published_at: null,
      apply_in_eos: 'Help MCP is vendor Agent integrations. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team MCP for daily ingest. Commit project MCP servers as .cursor/mcp.json. User-level ~/.cursor/mcp.json is local IDE config. Team dashboard MCP is not EOS governance. Do not put API keys in git. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: '@ mentions and context',
      source_url: 'https://cursor.com/help/customization/context',
      published_at: null,
      apply_in_eos: 'Help Context is vendor Agent @ mentions. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop @ mentions for daily ingest. This Cloud Agent VM already searches the workspace. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Ignore files',
      source_url: 'https://cursor.com/help/customization/ignore-files',
      published_at: null,
      apply_in_eos: 'Help Ignore files is vendor Agent context exclusions. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop ignore-file setup for daily ingest. Keep .cursorignore. Do not put secrets in git. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Plugins',
      source_url: 'https://cursor.com/help/customization/plugins',
      published_at: null,
      apply_in_eos: 'Help Plugins is vendor Agent reusable tools. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team marketplace plugins for daily ingest. Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Team marketplace plugins are not EOS governance. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'What is multi-agent coding?',
      source_url: 'https://cursor.com/help/ai-features/multi-agent',
      published_at: null,
      apply_in_eos: 'Help multi-agent is vendor desktop Agents Window parallelism. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Agents Window, /multitask, or Build in Parallel for daily ingest. This Cloud Agent VM already runs one isolated agent. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Side chats',
      source_url: 'https://cursor.com/help/ai-features/side-chats',
      published_at: null,
      apply_in_eos: 'Help Side chats is vendor local-only side conversations. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into /side or desktop side chats for daily ingest. This Cloud Agent VM has no side chats. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Conversation search',
      source_url: 'https://cursor.com/help/ai-features/conversation-search',
      published_at: null,
      apply_in_eos: 'Help Conversation search is vendor desktop transcript search. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop conversation search for daily ingest. This Cloud Agent VM already searches the workspace. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'How does AI pair programming work in Cursor?',
      source_url: 'https://cursor.com/help/ai-features/ai-pair-programming',
      published_at: null,
      apply_in_eos: 'Help AI pair programming is vendor desktop Agent coworking. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop pair-programming chat for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Quickstart',
      source_url: 'https://cursor.com/docs/get-started/quickstart',
      published_at: null,
      apply_in_eos: 'Quickstart is vendor desktop first-run. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop first-run or quickstart for daily ingest. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Download and install Cursor',
      source_url: 'https://cursor.com/help/getting-started/install',
      published_at: null,
      apply_in_eos: 'Help install is vendor desktop first-run. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop install or first-run for daily ingest. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Your first project',
      source_url: 'https://cursor.com/help/getting-started/first-project',
      published_at: null,
      apply_in_eos: 'Help first project is vendor desktop first-run. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop first-project or first-run for daily ingest. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'How do I build an AI coding agent?',
      source_url: 'https://cursor.com/help/getting-started/build-ai-coding-agent',
      published_at: null,
      apply_in_eos: 'Help build AI coding agent is vendor custom-agent SDK how-to. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into building a custom coding agent or installing @cursor/sdk for daily ingest. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Privacy and data',
      source_url: 'https://cursor.com/help/security-and-privacy/privacy',
      published_at: null,
      apply_in_eos: 'Help Privacy is vendor Privacy Mode data-handling. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Privacy Mode settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Regions and model availability',
      source_url: 'https://cursor.com/help/security-and-privacy/regions',
      published_at: null,
      apply_in_eos: 'Help Regions is vendor region/model-availability data-handling. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop region, API-key, or Cursor Start settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'SSO and authentication',
      source_url: 'https://cursor.com/help/security-and-privacy/sso',
      published_at: null,
      apply_in_eos: 'Help SSO is vendor team SAML authentication. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop or team SSO settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Compromised account',
      source_url: 'https://cursor.com/help/security-and-privacy/account-compromised',
      published_at: null,
      apply_in_eos: 'Help Compromised account is vendor compromised-account incident response. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard session revoke, billing, or API-key settings for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Marketplace security',
      source_url: 'https://cursor.com/help/security-and-privacy/marketplace-security',
      published_at: null,
      apply_in_eos: 'Help Marketplace security is vendor marketplace plugin review. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into marketplace plugin install for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Agent troubleshooting',
      source_url: 'https://cursor.com/help/troubleshooting/agent-issues',
      published_at: null,
      apply_in_eos: 'Help Agent troubleshooting is vendor desktop Agent diagnostics. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Agent troubleshooting for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'How do I troubleshoot Tab completions?',
      source_url: 'https://cursor.com/help/troubleshooting/tab-issues',
      published_at: null,
      apply_in_eos: 'Help Tab troubleshooting is vendor desktop Tab diagnostics. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop Tab troubleshooting for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Installation and startup',
      source_url: 'https://cursor.com/help/troubleshooting/install-issues',
      published_at: null,
      apply_in_eos: 'Help install troubleshooting is vendor desktop install/startup diagnostics. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop install troubleshooting for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Network, proxy, and remote connections',
      source_url: 'https://cursor.com/help/troubleshooting/network',
      published_at: null,
      apply_in_eos: 'Help network troubleshooting is vendor desktop network/proxy diagnostics. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop network troubleshooting for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Extension conflicts',
      source_url: 'https://cursor.com/help/troubleshooting/extensions',
      published_at: null,
      apply_in_eos: 'Help extension troubleshooting is vendor desktop extension-conflict diagnostics. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop extension troubleshooting for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Performance',
      source_url: 'https://cursor.com/help/troubleshooting/performance',
      published_at: null,
      apply_in_eos: 'Help performance troubleshooting is vendor desktop CPU/memory/input-delay diagnostics. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop performance troubleshooting for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Reporting a bug',
      source_url: 'https://cursor.com/help/troubleshooting/reporting-bugs',
      published_at: null,
      apply_in_eos: 'Help bug-report troubleshooting is vendor desktop bug-report diagnostics. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop bug reporting for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Git',
      source_url: 'https://cursor.com/help/integrations/git',
      published_at: null,
      apply_in_eos: 'Help Git is vendor desktop git/Source Control features. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop git UI for daily ingest. GitHub remains source of truth for this synced repo. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Grok Bot',
      source_url: 'https://cursor.com/docs/grok-bot',
      published_at: null,
      apply_in_eos: 'Grok Bot is vendor persistent-cloud Bots. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into the Grok Bot desktop or iOS app for daily ingest. This Cloud Agent VM has no Grok Bot Linux app. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/plan-mode'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/debug-mode'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/agent'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/ask-mode'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/plan-mode'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/tab'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/inline-edit'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/cloud-agents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/background-agents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/shared-transcripts'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/overview'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/using'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/shell-mode'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/acp'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/headless'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/skills'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/rules'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/skills'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/mcp'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/context'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/ignore-files'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/plugins'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/multi-agent'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/side-chats'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/conversation-search'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/ai-pair-programming'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/get-started/quickstart'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/getting-started/install'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/getting-started/first-project'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/getting-started/build-ai-coding-agent'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/privacy'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/regions'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/sso'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/account-compromised'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/security-and-privacy/marketplace-security'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/troubleshooting/agent-issues'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/troubleshooting/tab-issues'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/troubleshooting/install-issues'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/troubleshooting/network'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/troubleshooting/extensions'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/troubleshooting/performance'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/troubleshooting/reporting-bugs'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/integrations/git'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/grok-bot'), false);
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
      title: 'Rules',
      source_url: 'https://cursor.com/help/customization/rules',
      published_at: null,
      apply_in_eos: 'Help Rules is vendor Agent instructions. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team rules for daily ingest. Keep .mdc, AGENTS.md, and /create-rule. Team dashboard rules are not EOS governance. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Skills',
      source_url: 'https://cursor.com/help/customization/skills',
      published_at: null,
      apply_in_eos: 'Help Skills is vendor Agent workflows. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team skills for daily ingest. Keep SKILL.md under .cursor/skills. Prefer /create-skill. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'MCP integrations',
      source_url: 'https://cursor.com/help/customization/mcp',
      published_at: null,
      apply_in_eos: 'Help MCP is vendor Agent integrations. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team MCP for daily ingest. Commit project MCP servers as .cursor/mcp.json. User-level ~/.cursor/mcp.json is local IDE config. Team dashboard MCP is not EOS governance. Do not put API keys in git. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: '@ mentions and context',
      source_url: 'https://cursor.com/help/customization/context',
      published_at: null,
      apply_in_eos: 'Help Context is vendor Agent @ mentions. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into desktop @ mentions for daily ingest. This Cloud Agent VM already searches the workspace. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
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
      title: 'Plugins',
      source_url: 'https://cursor.com/help/customization/plugins',
      published_at: null,
      apply_in_eos: 'Help Plugins is vendor Agent reusable tools. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into dashboard team marketplace plugins for daily ingest. Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Team marketplace plugins are not EOS governance. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Customize Cursor',
      source_url: 'https://cursor.com/changelog/customize',
      published_at: 'Mon, 22 Jun 2026 00:00:00 GMT',
      apply_in_eos: 'Manage skills/plugins on Customize. Pin EOS skills; do not copy marketplace defaults blindly.'
    },
    {
      title: 'Customize Cursor',
      source_url: 'https://cursor.com/docs/customize-cursor',
      published_at: null,
      apply_in_eos: 'Customize Cursor is optional desktop sidebar for plugins, skills, MCP, rules, and hooks. Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Do not rotate this Cloud Agent into desktop Customize for daily ingest. Keep environment.json + Builds. Team marketplace and dashboard Customize are not EOS governance. Honor included quota; do not switch this watch to on-demand.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/rules'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/skills'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/mcp'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/context'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/mcp'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/plugins'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/customization/plugins'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/customize-cursor'), false);
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
      title: 'Dashboard settings',
      source_url: 'https://cursor.com/docs/cloud-agent/settings',
      published_at: null,
      apply_in_eos: 'Treat Cloud Agents dashboard settings as team-admin config, not EOS governance. Keep environment.json + Builds as the start path and honor network allowlists. Do not turn on team follow-ups: a teammate can drive an agent that holds another user\'s secrets.'
    },
    {
      title: 'Private Connectivity',
      source_url: 'https://cursor.com/docs/cloud-agent/private-connectivity',
      published_at: null,
      apply_in_eos: 'This Cloud Agent run is public cloud. Private Connectivity is Enterprise-only (AWS PrivateLink or Cloudflare Tunnel) for private Git/registries. It is not required for this watch. Keep GitHub as source of truth. Do not put tunnel tokens in git.'
    },
    {
      title: 'Bugbot is now over 3x faster, 22% cheaper, and finds 10% more bugs',
      source_url: 'https://cursor.com/changelog/bugbot-updates-june-2026',
      published_at: 'Wed, 10 Jun 2026 00:00:00 GMT',
      apply_in_eos: 'Bugbot is optional PR review. EOS TDD evidence remains required.'
    },
    {
      title: 'Bugbot',
      source_url: 'https://cursor.com/docs/bugbot',
      published_at: null,
      apply_in_eos: 'Bugbot is optional PR review. EOS TDD evidence remains required. /review-bugbot is in-agent review, not a substitute for tests. Keep GitHub as source of truth; do not ingest GitHub/GitLab/Bitbucket integration setup pages. Do not put Bugbot API keys in git.'
    },
    {
      title: 'Bugbot',
      source_url: 'https://cursor.com/help/ai-features/bugbot',
      published_at: null,
      apply_in_eos: 'Help Bugbot is vendor PR review. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into Bugbot dashboard setup for daily ingest. EOS TDD evidence remains required. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Agent Review',
      source_url: 'https://cursor.com/docs/agent/agent-review',
      published_at: null,
      apply_in_eos: 'Agent Review is optional in-editor review of local changes. EOS TDD evidence remains required. /agent-review is not a substitute for tests. Keep BUGBOT.md if this repo uses Bugbot rules. This watch already runs in the Cloud Agent VM, not the desktop Agents Window. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor Security Review',
      source_url: 'https://cursor.com/changelog/04-30-26',
      published_at: 'Thu, 30 Apr 2026 00:00:00 GMT',
      apply_in_eos: 'Cursor Security Review is a vendor PR reviewer. EOS security-auditor skill remains the Control Plane check.'
    },
    {
      title: 'Security Agents',
      source_url: 'https://cursor.com/docs/security-agents',
      published_at: null,
      apply_in_eos: 'Cursor Security Review is a vendor PR reviewer. EOS security-auditor skill remains the Control Plane check. /review-security is in-agent review, not a substitute for that check. Do not treat vendor finding counts as EOS evidence. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'PR Routing & Approval',
      source_url: 'https://cursor.com/docs/approval-agents',
      published_at: null,
      apply_in_eos: 'PR Routing & Approval is optional vendor automation. It does not replace EOS TDD or human review. Keep exact APPROVAL_POLICY.md and .cursor/approval-policies/ROUTING.md if this repo uses them. Do not treat vendor auto-approve as EOS evidence. Keep GitHub as source of truth; do not ingest Slack or Teams setup. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor Mobile App for iOS',
      source_url: 'https://cursor.com/changelog/ios-mobile-app',
      published_at: 'Mon, 29 Jun 2026 00:00:00 GMT',
      apply_in_eos: 'iPad/iOS can launch Cloud Agents; this watch still runs in the Cloud Agent VM, not on the tablet.'
    },
    {
      title: 'Cursor for iOS',
      source_url: 'https://cursor.com/docs/cloud-agent/mobile',
      published_at: null,
      apply_in_eos: 'This watch runs in the Cloud Agent VM, not on iPhone or iPad. Cursor for iOS is an optional beta client. Keep environment.json + Builds on the web. /remote-control hands a local session to the cloud; tool calls stay on the computer. Privacy Mode (Legacy) is not supported. Do not ingest GitHub or GitLab setup pages. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor for iOS',
      source_url: 'https://cursor.com/help/ai-features/mobile-app',
      published_at: null,
      apply_in_eos: 'Help Cursor for iOS is vendor mobile Cloud Agent client. Keep this watch in the Cloud Agent VM. Do not rotate this Cloud Agent into the iOS app for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cloud Agents',
      source_url: 'https://cursor.com/docs/cloud-agent',
      published_at: null,
      apply_in_eos: 'Cloud Agents run on isolated VMs. Use environment.json + Builds; keep this watch on official feeds, not X.'
    },
    {
      title: 'Cloud Agents API',
      source_url: 'https://cursor.com/docs/cloud-agent/api/endpoints',
      published_at: null,
      apply_in_eos: 'This watch uses official feeds, not the Cloud Agents API. Do not treat api.cursor.com as this ingest path. Do not put API keys in git. Keep GitHub as source of truth. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor TypeScript SDK',
      source_url: 'https://cursor.com/docs/sdk/typescript',
      published_at: null,
      apply_in_eos: 'The TypeScript SDK is optional agent scripting. This watch uses official feeds, not @cursor/sdk or api.cursor.com. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor Python SDK',
      source_url: 'https://cursor.com/docs/sdk/python',
      published_at: null,
      apply_in_eos: 'The Python SDK is optional agent scripting. This watch uses official feeds, not cursor-sdk or api.cursor.com. Do not install cursor-sdk or rotate this watch into SDK scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Cursor SDK Bridge',
      source_url: 'https://cursor.com/docs/sdk/bridge',
      published_at: null,
      apply_in_eos: 'The SDK Bridge is optional local protocol for languages without a first-party SDK. This watch uses official feeds, not cursor-sdk-bridge or api.cursor.com. Do not install the SDK Bridge or rotate this watch into adapter scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
    },
    {
      title: 'Models & Pricing',
      source_url: 'https://cursor.com/docs/models-and-pricing',
      published_at: null,
      apply_in_eos: 'Honor included Cursor Models vs Other Models pools. Do not treat vendor rates as EOS budget evidence.'
    },
    {
      title: 'Team Pricing',
      source_url: 'https://cursor.com/docs/account/teams/pricing',
      published_at: null,
      apply_in_eos: 'Team Pricing is vendor Teams and Enterprise billing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor team seat prices as EOS budget evidence. This Cloud Agent is not a Teams admin dashboard. Keep environment.json + Builds.'
    },
    {
      title: 'Members, Roles, and Seat Types',
      source_url: 'https://cursor.com/docs/account/teams/members',
      published_at: null,
      apply_in_eos: 'Members, roles, and seat types are vendor Teams admin config. Honor included quota. Do not switch this watch to on-demand. This Cloud Agent is not a Teams admin dashboard. Do not ingest Teams setup or SSO pages. Keep environment.json + Builds.'
    },
    {
      title: 'Pricing and plans',
      source_url: 'https://cursor.com/help/account-and-billing/pricing',
      published_at: null,
      apply_in_eos: 'Help Pricing and plans lists vendor individual and Teams plan names. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor plan prices as EOS budget evidence. Do not change this Cloud Agent billing from the dashboard. Keep environment.json + Builds.'
    },
    {
      title: 'Available models',
      source_url: 'https://cursor.com/help/models-and-usage/available-models',
      published_at: null,
      apply_in_eos: 'Help Available models lists vendor model names and Auto routing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor model rates as EOS budget evidence. Do not put API keys in git. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Keep environment.json + Builds.'
    },
    {
      title: 'Cursor Router',
      source_url: 'https://cursor.com/changelog/router',
      published_at: 'Wed, 22 Jul 2026 00:00:00 GMT',
      apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
    },
    {
      title: 'Cursor Router',
      source_url: 'https://cursor.com/help/models-and-usage/cursor-router',
      published_at: null,
      apply_in_eos: 'Help Cursor Router is vendor Auto routing with Cost, Balance, and Intelligence modes. EOS rules still bind model and governance choices. Honor included quota. Do not switch this watch to on-demand. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put API keys in git. Keep environment.json + Builds.'
    },
    {
      title: 'Agents Window',
      source_url: 'https://cursor.com/docs/agent/agents-window',
      published_at: null,
      apply_in_eos: 'This watch already runs in the Cloud Agent VM, not in the desktop Agents Window. Use /in-cloud or /babysit when a local session must hand work to its own VM. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/approval-agents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/agents-window'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/mobile'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/mobile-app'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/api/endpoints'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/typescript'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/python'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/bridge'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/account/teams/pricing'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/account/teams/members'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/account-and-billing/pricing'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/available-models'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/cursor-router'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/models-and-pricing'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-13-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/setup'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/best-practices'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/identity'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/metadata'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/security-network'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/security'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/settings'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/private-connectivity'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/bugbot'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/agent-review'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/bugbot'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/security-agents'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/usage-limits'), true);
});

test('selectCurrentLearnings clusters Agent Review onto Bugbot changelog and keeps usage limits', () => {
  const selected = selectCurrentLearnings([
    {
      title: 'Cloud Agents and Cursor Harness Improvements',
      source_url: 'https://cursor.com/changelog/08-19-26',
      published_at: 'Wed, 19 Aug 2026 00:00:00 GMT',
      apply_in_eos: 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.'
    },
    {
      title: 'Bugbot is now over 3x faster, 22% cheaper, and finds 10% more bugs',
      source_url: 'https://cursor.com/changelog/bugbot-updates-june-2026',
      published_at: 'Wed, 10 Jun 2026 00:00:00 GMT',
      apply_in_eos: 'Bugbot is optional PR review. EOS TDD evidence remains required.'
    },
    {
      title: 'Bugbot',
      source_url: 'https://cursor.com/docs/bugbot',
      published_at: null,
      apply_in_eos: 'Bugbot is optional PR review. EOS TDD evidence remains required. /review-bugbot is in-agent review, not a substitute for tests.'
    },
    {
      title: 'Agent Review',
      source_url: 'https://cursor.com/docs/agent/agent-review',
      published_at: null,
      apply_in_eos: 'Agent Review is optional in-editor review of local changes. EOS TDD evidence remains required. /agent-review is not a substitute for tests.'
    },
    {
      title: 'Bugbot',
      source_url: 'https://cursor.com/help/ai-features/bugbot',
      published_at: null,
      apply_in_eos: 'Help Bugbot is vendor PR review. Keep this watch on the standing /goal. Do not rotate this Cloud Agent into Bugbot dashboard setup for daily ingest. EOS TDD evidence remains required. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.'
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/bugbot-updates-june-2026'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/bugbot'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/agent/agent-review'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/ai-features/bugbot'), false);
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
  dated.push({
    title: 'Team Pricing',
    source_url: 'https://cursor.com/docs/account/teams/pricing',
    published_at: null,
    apply_in_eos: 'Team Pricing is vendor Teams and Enterprise billing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor team seat prices as EOS budget evidence. This Cloud Agent is not a Teams admin dashboard. Keep environment.json + Builds.'
  });
  dated.push({
    title: 'Members, Roles, and Seat Types',
    source_url: 'https://cursor.com/docs/account/teams/members',
    published_at: null,
    apply_in_eos: 'Members, roles, and seat types are vendor Teams admin config. Honor included quota. Do not switch this watch to on-demand. This Cloud Agent is not a Teams admin dashboard. Do not ingest Teams setup or SSO pages. Keep environment.json + Builds.'
  });
  dated.push({
    title: 'Pricing and plans',
    source_url: 'https://cursor.com/help/account-and-billing/pricing',
    published_at: null,
    apply_in_eos: 'Help Pricing and plans lists vendor individual and Teams plan names. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor plan prices as EOS budget evidence. Do not change this Cloud Agent billing from the dashboard. Keep environment.json + Builds.'
  });
  dated.push({
    title: 'Available models',
    source_url: 'https://cursor.com/help/models-and-usage/available-models',
    published_at: null,
    apply_in_eos: 'Help Available models lists vendor model names and Auto routing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor model rates as EOS budget evidence. Do not put API keys in git. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Keep environment.json + Builds.'
  });
  dated.push({
    title: 'Cursor Router',
    source_url: 'https://cursor.com/changelog/router',
    published_at: '2026-07-22T00:00:00.000Z',
    apply_in_eos: 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.'
  });
  dated.push({
    title: 'Cursor Router',
    source_url: 'https://cursor.com/help/models-and-usage/cursor-router',
    published_at: null,
    apply_in_eos: 'Help Cursor Router is vendor Auto routing with Cost, Balance, and Intelligence modes. EOS rules still bind model and governance choices. Honor included quota. Do not switch this watch to on-demand. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put API keys in git. Keep environment.json + Builds.'
  });
  const selected = selectCurrentLearnings(dated, 10);
  assert.equal(selected[0].source_url, 'https://cursor.com/changelog/item-0');
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/models-and-pricing'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/account/teams/pricing'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/account/teams/members'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/account-and-billing/pricing'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/available-models'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/help/models-and-usage/cursor-router'), false);
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
  assert.equal(current.includes('cursor.com/help/models-and-usage/grok-4-5'), false);
  assert.match(current, /cursor.com\/docs\/models-and-pricing/);
  assert.match(current, /cursor.com\/changelog\/start-from-scratch/);
  assert.match(current, /cursor.com\/changelog\/router/);
  assert.equal(current.includes('cursor.com/changelog/origin-code-hosting'), false);
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
  assert.equal(current.includes('cursor.com/docs/cloud-agent/settings'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/private-connectivity'), false);
  assert.equal(current.includes('cursor.com/docs/bugbot'), false);
  assert.equal(current.includes('cursor.com/docs/security-agents'), false);
  assert.equal(current.includes('cursor.com/docs/approval-agents'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/mobile'), false);
  assert.equal(current.includes('cursor.com/docs/cloud-agent/api/endpoints'), false);
  assert.equal(current.includes('cursor.com/docs/agent/agents-window'), false);
  assert.equal(current.includes('cursor.com/docs/agent/agent-review'), false);
  assert.equal(current.includes('cursor.com/docs/agent/plan-mode'), false);
  assert.equal(current.includes('cursor.com/docs/agent/debug-mode'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/agent'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/ask-mode'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/plan-mode'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/tab'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/inline-edit'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/cloud-agents'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/background-agents'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/mobile-app'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/shared-transcripts'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/bugbot'), false);
  assert.equal(current.includes('cursor.com/help/customization/rules'), false);
  assert.equal(current.includes('cursor.com/help/customization/skills'), false);
  assert.equal(current.includes('cursor.com/help/customization/mcp'), false);
  assert.equal(current.includes('cursor.com/help/customization/context'), false);
  assert.equal(current.includes('cursor.com/help/customization/ignore-files'), false);
  assert.equal(current.includes('cursor.com/help/customization/plugins'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/multi-agent'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/side-chats'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/conversation-search'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/ai-pair-programming'), false);
  assert.equal(current.includes('cursor.com/docs/get-started/quickstart'), false);
  assert.equal(current.includes('cursor.com/help/getting-started/install'), false);
  assert.equal(current.includes('cursor.com/help/getting-started/first-project'), false);
  assert.equal(current.includes('cursor.com/help/getting-started/build-ai-coding-agent'), false);
  assert.equal(current.includes('cursor.com/help/security-and-privacy/privacy'), false);
  assert.equal(current.includes('cursor.com/help/security-and-privacy/regions'), false);
  assert.equal(current.includes('cursor.com/help/security-and-privacy/sso'), false);
  assert.equal(current.includes('cursor.com/help/security-and-privacy/account-compromised'), false);
  assert.equal(current.includes('cursor.com/help/security-and-privacy/marketplace-security'), false);
  assert.equal(current.includes('cursor.com/help/troubleshooting/agent-issues'), false);
  assert.equal(current.includes('cursor.com/help/troubleshooting/tab-issues'), false);
  assert.equal(current.includes('cursor.com/help/troubleshooting/install-issues'), false);
  assert.equal(current.includes('cursor.com/help/troubleshooting/network'), false);
  assert.equal(current.includes('cursor.com/help/troubleshooting/extensions'), false);
  assert.equal(current.includes('cursor.com/help/troubleshooting/performance'), false);
  assert.equal(current.includes('cursor.com/help/troubleshooting/reporting-bugs'), false);
  assert.equal(current.includes('cursor.com/help/integrations/git'), false);
  assert.equal(current.includes('cursor.com/docs/grok-bot'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/terminal'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/browser'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/debug-mode'), false);
  assert.equal(current.includes('cursor.com/help/ai-features/max-mode'), false);
  assert.equal(current.includes('cursor.com/docs/cli/overview'), false);
  assert.equal(current.includes('cursor.com/docs/cli/using'), false);
  assert.equal(current.includes('cursor.com/docs/cli/shell-mode'), false);
  assert.equal(current.includes('cursor.com/docs/cli/acp'), false);
  assert.equal(current.includes('cursor.com/docs/cli/headless'), false);
  assert.equal(current.includes('cursor.com/docs/cli/installation'), false);
  assert.equal(current.includes('cursor.com/docs/cli/reference/permissions'), false);
  assert.equal(current.includes('cursor.com/docs/cli/changelog'), false);
  assert.equal(current.includes('cursor.com/docs/cli/github-actions'), false);
  assert.equal(current.includes('cursor.com/docs/sdk/typescript'), false);
  assert.equal(current.includes('cursor.com/docs/sdk/python'), false);
  assert.equal(current.includes('cursor.com/docs/sdk/bridge'), false);
  assert.equal(current.includes('cursor.com/docs/sdk/changelog'), false);
  assert.equal(current.includes('cursor.com/docs/account/teams/pricing'), false);
  assert.equal(current.includes('cursor.com/docs/account/teams/members'), false);
  assert.equal(current.includes('cursor.com/help/account-and-billing/pricing'), false);
  assert.equal(current.includes('cursor.com/help/models-and-usage/available-models'), false);
  assert.equal(current.includes('cursor.com/help/models-and-usage/cursor-router'), false);
  assert.equal(current.includes('cursor.com/help/models-and-usage/grok-4-5'), false);
  assert.equal(current.includes('cursor.com/help/models-and-usage/api-keys'), false);
  assert.equal(current.includes('cursor.com/help/account-and-billing/teams-management'), false);
  assert.equal(current.includes('cursor.com/help/account-and-billing/overages'), false);
  assert.equal(current.includes('cursor.com/help/account-and-billing/billing'), false);
  assert.equal(current.includes('cursor.com/help/account-and-billing/cancel'), false);
  assert.equal(current.includes('cursor.com/help/account-and-billing/cursor-start'), false);
  assert.equal(current.includes('cursor.com/docs/account/teams/setup'), false);
  assert.equal(current.includes('cursor.com/docs/account/teams/sso'), false);
  assert.equal(current.includes('cursor.com/docs/account/teams/admin-api'), false);
  assert.equal(current.includes('cursor.com/docs/enterprise'), false);
  assert.equal(current.includes('cursor.com/docs/agent/design-mode'), false);
  assert.equal(current.includes('cursor.com/docs/agent/tools/browser'), false);
  assert.equal(current.includes('cursor.com/docs/agent/tools/terminal'), false);
  assert.equal(current.includes('cursor.com/docs/agent/tools/search'), false);
  assert.equal(current.includes('cursor.com/docs/agent/tools/canvas'), false);
  assert.equal(current.includes('cursor.com/docs/configuration/worktrees'), false);
  assert.equal(current.includes('cursor.com/docs/agent/security'), false);
  assert.equal(current.includes('cursor.com/docs/mcp'), false);
  assert.equal(current.includes('cursor.com/docs/plugins'), false);
  assert.equal(current.includes('cursor.com/docs/customize-cursor'), false);
  assert.equal(current.includes('cursor.com/changelog/customize'), false);
  assert.equal(current.includes('cursor.com/blog/git-at-any-scale'), false);
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
  assert.equal(current.includes('cursor.com/docs/origin/create-repository'), false);
  assert.equal(current.includes('cursor.com/docs/origin/pull-requests'), false);
  assert.equal(current.includes('cursor.com/docs/origin/browse'), false);
  assert.equal(current.includes('cursor.com/docs/origin/settings'), false);
  assert.equal(current.includes('cursor.com/docs/origin/codebase-settings'), false);
  assert.equal(current.includes('cursor.com/docs/origin/git'), false);
  assert.equal(current.includes('cursor.com/docs/api/origin'), false);
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
