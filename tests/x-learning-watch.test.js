import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  parseFeed,
  renderBriefing,
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
  assert.equal(store.learnings[0].source_url, 'https://cursor.com/changelog/08-19-26');
  assert.match(store.learnings[0].apply_in_eos, /timer|Slack|PR/i);
});

test('applyHint is specific for current official product titles', () => {
  const samples = [
    { title: 'Google Workspace Plugins', link: 'https://cursor.com/changelog/google-workspace-plugins' },
    { title: 'Improvements to Cursor in Slack', link: 'https://cursor.com/changelog/slack-improvements' },
    { title: 'Cursor Router', link: 'https://cursor.com/changelog/router' },
    { title: 'Side Chats and Conversation Search', link: 'https://cursor.com/changelog/side-chat' },
    { title: 'MCPs and Organizations in Team Marketplaces', link: 'https://cursor.com/changelog/team-marketplace-updates' }
  ];
  for (const sample of samples) {
    const hint = applyHint({ ...sample, summary: sample.title });
    assert.equal(hint.startsWith('Review this official'), false, sample.title);
  }
});

test('cited X posts never claim an X fetch', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/intelligence/x-watch/CITED_X_POSTS.json'), 'utf8'));
  const result = validateCitedXPosts(doc);
  assert.equal(result.valid, true);
  assert.equal(doc.citations.every((row) => row.fetched_from_x === false), true);
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
