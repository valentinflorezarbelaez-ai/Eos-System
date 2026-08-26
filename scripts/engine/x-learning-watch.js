import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOCKED_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .trim();
}

function stripTags(value) {
  return decodeXmlEntities(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstTag(xml, names) {
  for (const name of names) {
    const cdata = xml.match(new RegExp(`<${name}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${name}>`, 'i'));
    if (cdata) return decodeXmlEntities(cdata[1]);
    const tagged = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    if (tagged) return decodeXmlEntities(tagged[1]);
    const attr = xml.match(new RegExp(`<${name}[^>]*href=["']([^"']+)["'][^>]*/>`, 'i'));
    if (attr) return decodeXmlEntities(attr[1]);
  }
  return '';
}

function chunkByTag(xml, tag) {
  const chunks = [];
  const re = new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi');
  let match;
  while ((match = re.exec(xml))) chunks.push(match[0]);
  return chunks;
}

export function isBlockedFetchUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_HOSTS.has(host);
  } catch {
    return true;
  }
}

export function validateWatchlist(watchlist) {
  if (!watchlist || typeof watchlist !== 'object') {
    return { valid: false, reason: 'Watchlist missing', handles: [] };
  }
  if (!Array.isArray(watchlist.accounts) || watchlist.accounts.length === 0) {
    return { valid: false, reason: 'Watchlist missing accounts', handles: [] };
  }
  if (!Array.isArray(watchlist.feeds) || watchlist.feeds.length === 0) {
    return { valid: false, reason: 'Watchlist missing feeds', handles: [] };
  }
  const handles = watchlist.accounts.map((account) => account.handle).filter(Boolean);
  if (handles.length === 0) {
    return { valid: false, reason: 'Watchlist accounts missing handle', handles: [] };
  }
  return { valid: true, handles };
}

export function parseFeed(xml) {
  const text = String(xml || '');
  if (/<entry\b/i.test(text) && /<feed\b/i.test(text)) {
    return chunkByTag(text, 'entry').map((entry) => {
      const id = firstTag(entry, ['id', 'guid']) || firstTag(entry, ['link']);
      const link = firstTag(entry, ['link']) || id;
      return {
        id,
        title: stripTags(firstTag(entry, ['title'])),
        link,
        publishedAt: firstTag(entry, ['updated', 'published', 'pubDate']),
        summary: stripTags(firstTag(entry, ['summary', 'content', 'description']))
      };
    }).filter((item) => item.id);
  }
  return chunkByTag(text, 'item').map((itemXml) => {
    const id = firstTag(itemXml, ['guid', 'id']) || firstTag(itemXml, ['link']);
    const link = firstTag(itemXml, ['link']) || id;
    const encoded = firstTag(itemXml, ['content:encoded']);
    const description = firstTag(itemXml, ['description', 'summary']);
    const summarySource = (encoded && encoded.length > (description || '').length) ? encoded : description;
    return {
      id,
      title: stripTags(firstTag(itemXml, ['title'])),
      link,
      publishedAt: firstTag(itemXml, ['pubDate', 'updated', 'published']),
      summary: stripTags(summarySource)
    };
  }).filter((item) => item.id);
}

export function computeNewItems(items, seenIds) {
  const seen = new Set(seenIds || []);
  return (items || []).filter((item) => item && item.id && !seen.has(item.id));
}

function truncate(value, max = 400) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function learningIdFromUrl(url) {
  const slug = String(url || '')
    .replace(/^https?:\/\/(www\.)?cursor\.com\/changelog\//i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `LRN-CURSOR-${slug || 'UNKNOWN'}`;
}

export function applyHint(item) {
  const title = (item?.title || '').toLowerCase();
  const link = (item?.link || '').toLowerCase();
  const blob = `${title} ${item?.summary || ''} ${link}`.toLowerCase();
  const titleOrLink = `${title} ${link}`;

  if (blob.includes('subscri') || link.includes('changelog/08-19-26')) {
    return 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS.';
  }
  if (blob.includes('/goal') || (link.includes('changelog/08-19-26') && blob.includes('goal'))) {
    return 'Keep long-lived EOS objectives in /goal instead of one-shot prompts.';
  }
  if (/\borigin\b/.test(blob) && (blob.includes('host') || blob.includes('codebase') || blob.includes('git'))) {
    return 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.';
  }
  if (title.includes('builds') || link.includes('changelog/08-13-26') || blob.includes('3x faster with builds')) {
    return 'Enable Cloud Agent Builds so ingest and other agents boot from a ready environment.';
  }
  if (title.includes('subagent') || link.includes('changelog/cloud-in-agents-window')) {
    return 'Run isolated subagents on their own VMs when work must not collide with the parent branch.';
  }
  if (blob.includes('custom mode') || blob.includes('sticky skill')) {
    return 'Pin an EOS skill as a Custom Mode when a session must stay on one playbook.';
  }
  if (blob.includes('steering') || blob.includes('follow-ups wait')) {
    return 'Steer running agents with follow-ups that wait for the next tool call.';
  }
  if (titleOrLink.includes('google workspace') || titleOrLink.includes('gmail') || link.includes('google-workspace')) {
    return 'Gmail/Drive plugins are optional Workspace context. Authenticate them only if EOS needs mail/docs; they do not replace this changelog watch.';
  }
  if (titleOrLink.includes('ipad') || titleOrLink.includes('ios-mobile') || title.includes('for ios')) {
    return 'iPad/iOS can launch Cloud Agents; this watch still runs in the Cloud Agent VM, not on the tablet.';
  }
  if (titleOrLink.includes('cursor start') || link.includes('cursor-start')) {
    return 'Cursor Start is India regional pricing. No EOS governance change.';
  }
  if (title.includes('router') || link.includes('/router')) {
    return 'Cursor Router picks models for Auto mode. EOS rules still bind model and governance choices.';
  }
  if (titleOrLink.includes('slack')) {
    return 'Slack is a native Cloud Agent subscription. Reconnect Slack MCP to watch threads; X is still not a trigger.';
  }
  if (titleOrLink.includes('side chat') || titleOrLink.includes('side-chat')) {
    return 'Park tangents in /side chats. Keep the Cursor/X learning goal on the main thread.';
  }
  if (titleOrLink.includes('marketplace') || titleOrLink.includes('team mcp')) {
    return 'Team MCP marketplace is vendor distribution. EOS MCP catalog stays evidence-gated.';
  }
  if (title.includes('customize')) {
    return 'Manage skills/plugins on Customize. Pin EOS skills; do not copy marketplace defaults blindly.';
  }
  if (titleOrLink.includes('automation') || blob.includes('/automate')) {
    return 'Automations trigger on GitHub/Slack, not X. This daily changelog timer already covers ingest.';
  }
  if (title.includes('bugbot')) {
    return 'Bugbot is optional PR review. EOS TDD evidence remains required.';
  }
  if (titleOrLink.includes('design mode')) {
    return 'Design Mode annotates UI in the Cursor browser. EOS still verifies web changes in a real browser.';
  }
  if (titleOrLink.includes('sdk')) {
    return 'Cursor SDK is a vendor runtime. Do not replace the EOS Control Plane with it.';
  }
  if (titleOrLink.includes('enterprise')) {
    return 'Enterprise org features are out of scope unless EOS is run as an Enterprise org.';
  }
  if (titleOrLink.includes('auto-review')) {
    return 'Auto-review reduces approval prompts. FUNDACION HITL gates still apply.';
  }
  if (titleOrLink.includes('/loop') || titleOrLink.includes('shared canvas')) {
    return '/loop is a recurring check-in. This watch already uses a daily timer.';
  }
  if (title.includes('jira')) {
    return 'Jira plugin exists; this run has no Jira connector. Do not invent Jira writes.';
  }
  if (title.includes('composer')) {
    return 'Composer is a vendor model family. Do not treat marketing metrics as EOS evidence.';
  }
  if (titleOrLink.includes('microsoft teams') || titleOrLink.includes('teams')) {
    return 'Teams plugin is optional. Slack remains the native subscription if MCP auth works.';
  }
  if (titleOrLink.includes('self-hosted')) {
    return 'Self-hosted Cloud Agents are optional private workers. This run is public cloud.';
  }
  if (title.includes('canvas')) {
    return 'Canvases are shareable artifacts, not a substitute for git evidence.';
  }
  if (titleOrLink.includes('worktree') || titleOrLink.includes('multi-root') || title.includes('multitask')) {
    return 'Use isolated worktrees/branches for parallel agents so this watch branch does not collide.';
  }
  if (titleOrLink.includes('computer use')) {
    return 'Computer-use agents are optional GUI control. This watch stays on official RSS, not desktop scraping.';
  }
  if (titleOrLink.includes('security review')) {
    return 'Cursor Security Review is a vendor PR reviewer. EOS security-auditor skill remains the Control Plane check.';
  }
  if (titleOrLink.includes('jetbrains')) {
    return 'JetBrains plugin is out of scope for this Cloud Agent workspace.';
  }
  if (titleOrLink.includes('/btw') || titleOrLink.includes('cli debug')) {
    return '/btw is a side-channel. Keep changelog ingest on the main Cloud Agent thread.';
  }
  return `Review this official Cursor changelog item against EOS governance before adopting: ${item?.title || 'untitled'}.`;
}

export function extractActionableLearnings(items) {
  return (items || []).filter((item) => item && (item.link || item.id)).map((item) => ({
    learning_id: learningIdFromUrl(item.link || item.id),
    title: item.title || 'Untitled official item',
    source_url: item.link || item.id,
    published_at: item.publishedAt || null,
    summary: truncate(item.summary),
    apply_in_eos: applyHint(item),
    epistemic_status: 'OBSERVED',
    x_timeline_verified: false
  }));
}

export function mergeLearnings(store, incoming) {
  const byUrl = new Map((store?.learnings || []).map((learning) => [learning.source_url, learning]));
  let added = 0;
  for (const learning of incoming || []) {
    if (!learning?.source_url) continue;
    const previous = byUrl.get(learning.source_url);
    if (!previous) {
      byUrl.set(learning.source_url, learning);
      added += 1;
      continue;
    }
    byUrl.set(learning.source_url, { ...previous, ...learning });
  }
  const publishedMs = (value) => {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? 0 : ms;
  };
  const learnings = [...byUrl.values()].sort((left, right) => {
    const byDate = publishedMs(right.published_at) - publishedMs(left.published_at);
    return byDate !== 0 ? byDate : String(left.source_url).localeCompare(String(right.source_url));
  });
  return {
    added,
    store: {
      version: '1.0.0',
      updated_at: new Date().toISOString(),
      learnings
    }
  };
}

export function normalizeHandle(raw) {
  let value = String(raw || '').trim();
  if (!value) return null;
  value = value.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com)\//i, '');
  value = value.replace(/^@/, '').split(/[/?#]/)[0];
  if (!/^[A-Za-z0-9_]{1,15}$/.test(value)) return null;
  return value;
}

export function validateCitedXPosts(doc) {
  if (!doc || !Array.isArray(doc.citations) || doc.citations.length === 0) {
    return { valid: false, reason: 'Citations missing' };
  }
  for (const row of doc.citations) {
    if (row.fetched_from_x !== false) {
      return { valid: false, reason: 'Citation must not claim an X fetch' };
    }
    if (row.epistemic_status !== 'CITED_NOT_FETCHED') {
      return { valid: false, reason: 'Citation epistemic_status must be CITED_NOT_FETCHED' };
    }
    if (!row.x_url || !/^https:\/\/x\.com\/cursor_ai\/status\/\d+/.test(row.x_url)) {
      return { valid: false, reason: 'Citation missing cursor_ai status URL' };
    }
    if (!row.cited_by || !/^https:\/\//.test(row.cited_by)) {
      return { valid: false, reason: 'Citation missing citing article URL' };
    }
    if (isBlockedFetchUrl(row.cited_by)) {
      return { valid: false, reason: 'Citing article cannot be an X URL' };
    }
  }
  return { valid: true };
}

export function addWatchedHandles(watchlist, rawHandles) {
  const next = {
    ...watchlist,
    accounts: [...(watchlist?.accounts || [])]
  };
  const added = [];
  const skipped = [];
  for (const raw of rawHandles || []) {
    const handle = normalizeHandle(raw);
    if (!handle) {
      skipped.push({ raw, reason: 'INVALID' });
      continue;
    }
    if (next.accounts.some((account) => String(account.handle).toLowerCase() === handle.toLowerCase())) {
      skipped.push({ handle, reason: 'DUPLICATE' });
      continue;
    }
    next.accounts.push({
      handle,
      url: `https://x.com/${handle}`,
      priority: 'SECONDARY',
      timeline_access: 'BLOCKED',
      notes: 'Added from operator-supplied handle. Timeline remains BLOCKED.'
    });
    added.push(handle);
  }
  return { watchlist: next, added, skipped };
}

export function renderBriefing(result, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  const handles = (result.watchlist?.accounts || []).map((account) => `@${account.handle}`).join(', ') || '(none)';
  const blocked = (result.blocked || [])
    .map((entry) => `- ${entry.url} — ${entry.reason}`)
    .join('\n') || '- none';
  const learnings = (result.learnings || [])
    .map((learning) => `- **${learning.title}** — ${learning.apply_in_eos}\n  ${learning.source_url}`)
    .join('\n');
  const items = (result.newItems || [])
    .map((item) => `- **${item.title}** (${item.publishedAt || 'date unknown'})\n  ${item.link}\n  ${item.summary || ''}`.trim())
    .join('\n');
  return [
    `# X / Cursor learning briefing — ${date}`,
    '',
    'Epistemic status: `TARGETS = WATCHLIST` | `RESULTS = OFFICIAL_FEEDS_ONLY`. X timelines are not connected.',
    '',
    `Watched handles: ${handles}`,
    '',
    '## Learnings to apply',
    learnings || '- No new official learnings in this ingest.',
    '',
    '## Blocked X fetches',
    blocked,
    '',
    '## New official items',
    items || '- No new official items in this ingest.',
    ''
  ].join('\n');
}

async function defaultFetch(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'EOS-X-Learning-Watch/1.0' },
    redirect: 'follow'
  });
  const text = await response.text();
  return { ok: response.ok, text, status: response.status };
}

export async function ingest({ watchlist, state = { seen_ids: [] }, fetchImpl = defaultFetch } = {}) {
  const validation = validateWatchlist(watchlist);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const blocked = [];
  const items = [];

  for (const feed of watchlist.feeds) {
    if (!feed?.url || isBlockedFetchUrl(feed.url)) {
      blocked.push({
        feed_id: feed?.feed_id || null,
        url: feed?.url || null,
        reason: 'X_OR_TWITTER_HOST_NOT_FETCHED'
      });
      continue;
    }
    if (feed.fetchable === false) {
      blocked.push({
        feed_id: feed.feed_id,
        url: feed.url,
        reason: 'FEED_MARKED_NOT_FETCHABLE'
      });
      continue;
    }
    const response = await fetchImpl(feed.url);
    if (!response?.ok) {
      blocked.push({
        feed_id: feed.feed_id,
        url: feed.url,
        reason: `HTTP_${response?.status || 'FETCH_FAILED'}`
      });
      continue;
    }
    for (const item of parseFeed(response.text)) {
      items.push({ ...item, feed_id: feed.feed_id });
    }
  }

  const newItems = computeNewItems(items, state.seen_ids);
  const seen = new Set(state.seen_ids || []);
  for (const item of items) seen.add(item.id);
  const learnings = extractActionableLearnings(newItems);

  const nextState = {
    seen_ids: [...seen].sort(),
    last_ingest_at: new Date().toISOString(),
    last_item_count: items.length,
    last_new_item_count: newItems.length
  };

  const result = {
    ok: true,
    watchlist,
    blocked,
    items,
    newItems,
    learnings,
    nextState
  };
  result.briefingMarkdown = renderBriefing(result);
  return result;
}

export function loadWatchlist(rootDir) {
  const file = path.join(rootDir, 'docs/intelligence/x-watch/WATCHLIST.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadState(rootDir) {
  const file = path.join(rootDir, 'docs/intelligence/x-watch/STATE.json');
  if (!fs.existsSync(file)) return { seen_ids: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadLearnings(rootDir) {
  const file = path.join(rootDir, 'docs/intelligence/x-watch/LEARNINGS.json');
  if (!fs.existsSync(file)) return { version: '1.0.0', learnings: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeWatchlist(rootDir, watchlist) {
  const file = path.join(rootDir, 'docs/intelligence/x-watch/WATCHLIST.json');
  fs.writeFileSync(file, `${JSON.stringify(watchlist, null, 2)}\n`);
}

export function writeIngestArtifacts(rootDir, result, now = new Date()) {
  const dir = path.join(rootDir, 'docs/intelligence/x-watch');
  fs.mkdirSync(path.join(dir, 'briefings'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'STATE.json'), `${JSON.stringify(result.nextState, null, 2)}\n`);
  const existing = loadLearnings(rootDir);
  const incoming = extractActionableLearnings(result.items || []);
  const merged = mergeLearnings(existing, incoming);
  fs.writeFileSync(path.join(dir, 'LEARNINGS.json'), `${JSON.stringify(merged.store, null, 2)}\n`);
  result.learningsAdded = merged.added;
  result.learningsStore = merged.store;
  const latest = (merged.store.learnings || []).slice(0, 10);
  const citationsFile = path.join(dir, 'CITED_X_POSTS.json');
  let citationLines = ['- none recorded'];
  if (fs.existsSync(citationsFile)) {
    const cited = JSON.parse(fs.readFileSync(citationsFile, 'utf8'));
    if (validateCitedXPosts(cited).valid) {
      citationLines = cited.citations.map((row) => `- ${row.about} — cited by ${row.cited_by} (not fetched from X)\n  ${row.x_url}`);
    }
  }
  const currentMd = [
    '# Cursor / X watch — current learnings',
    '',
    'Epistemic status: `TARGETS = WATCHLIST` | `RESULTS = OFFICIAL_FEEDS_ONLY`. `x_timeline_verified = false` for every row.',
    '',
    `Updated: ${merged.store.updated_at}`,
    `Store size: ${merged.store.learnings.length}`,
    '',
    '## Official changelog actions',
    ...latest.map((learning) => `- **${learning.title}** — ${learning.apply_in_eos}\n  ${learning.source_url}`),
    '',
    '## @cursor_ai posts cited by third parties (not fetched)',
    ...citationLines,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'CURRENT.md'), `${currentMd}\n`);
  if (result.newItems.length > 0) {
    const date = now.toISOString().slice(0, 10);
    fs.writeFileSync(path.join(dir, 'briefings', `${date}.md`), result.briefingMarkdown);
  }
  return result;
}

async function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const addIdx = process.argv.indexOf('--add-handles');
  if (addIdx !== -1) {
    const rawHandles = process.argv.slice(addIdx + 1).filter((arg) => !arg.startsWith('--'));
    const current = loadWatchlist(rootDir);
    const result = addWatchedHandles(current, rawHandles);
    writeWatchlist(rootDir, result.watchlist);
    process.stdout.write(`${JSON.stringify({ added: result.added, skipped: result.skipped }, null, 2)}\n`);
  }
  if (!process.argv.includes('--ingest')) return;
  const watchlist = loadWatchlist(rootDir);
  const state = loadState(rootDir);
  const result = await ingest({ watchlist, state });
  writeIngestArtifacts(rootDir, result);
  process.stdout.write(JSON.stringify({
    newItems: result.newItems.length,
    learningsAdded: result.learningsAdded,
    blocked: result.blocked,
    briefingWritten: result.newItems.length > 0
  }, null, 2) + '\n');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
