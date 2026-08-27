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
  assert.match(agentsWindow.summary, /\/babysit/);
  assert.equal(agentsWindow.summary.includes('Sitemap'), false);
  assert.equal(/Open the Agents Window —/.test(agentsWindow.summary), false);
  assert.equal(/Switch Back to the IDE —/.test(agentsWindow.summary), false);
  assert.equal(/Enterprise access —/.test(agentsWindow.summary), false);
  assert.match(agentsWindow.apply_in_eos, /Cloud Agent VM/);
  assert.match(agentsWindow.apply_in_eos, /not in the desktop Agents Window/i);
  assert.match(agentsWindow.apply_in_eos, /\/in-cloud/);
  assert.match(agentsWindow.apply_in_eos, /\/babysit/);
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
    { title: 'Models & Pricing', link: 'https://cursor.com/docs/models-and-pricing' },
    { title: 'Automations', link: 'https://cursor.com/help/ai-features/automations' },
    { title: 'Cloud Agent Builds', link: 'https://cursor.com/docs/cloud-agent/builds' },
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
    summary: 'The Agents Window is Cursor\'s agent-first interface. Use /in-cloud or /babysit for cloud subagents.'
  });
  assert.match(hint, /Cloud Agent VM/);
  assert.match(hint, /not in the desktop Agents Window/i);
  assert.match(hint, /\/in-cloud/);
  assert.match(hint, /\/babysit/);
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
  assert.match(agentsWindowMd.summary, /\/babysit/);
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/changelog/08-13-26'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/builds'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent'), true);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/api/endpoints'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/typescript'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/python'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/bridge'), false);
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/overview'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/using'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/shell-mode'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/acp'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cli/headless'), false);
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/mcp'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/plugins'), false);
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
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/cloud-agent/api/endpoints'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/typescript'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/python'), false);
  assert.equal(selected.some((row) => row.source_url === 'https://cursor.com/docs/sdk/bridge'), false);
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
