import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOCKED_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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

export function parseCursorBlogIndex(html, origin = 'https://cursor.com') {
  const text = String(html || '');
  const byPath = new Map();
  const re = /<a\b[^>]*href="(\/blog\/(?!topic\/)(?!page\/)[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(text))) {
    const blogPath = match[1];
    const inner = match[2] || '';
    const previous = byPath.get(blogPath);
    if (previous && previous.innerLength >= inner.length) continue;
    const alt = inner.match(/<img\b[^>]*\balt="([^"]*)"/i);
    const pretty = inner.match(/<p\b[^>]*text-pretty[^>]*>([\s\S]*?)<\/p>/i);
    const title = stripTags((alt && alt[1]) || (pretty && pretty[1]) || '');
    const time = inner.match(/<time\b[^>]*dateTime="([^"]+)"/i);
    byPath.set(blogPath, {
      innerLength: inner.length,
      title,
      publishedAt: time ? time[1] : '',
      summary: stripTags((pretty && pretty[1]) || (alt && alt[1]) || title)
    });
  }
  return [...byPath.entries()]
    .map(([blogPath, row]) => {
      const link = `${origin}${blogPath}`;
      const fallbackTitle = blogPath.split('/').pop().replace(/-/g, ' ');
      return {
        id: link,
        title: row.title || fallbackTitle,
        link,
        publishedAt: row.publishedAt,
        summary: row.summary || row.title || fallbackTitle
      };
    });
}

export function parseOfficialHtmlPage(html, sourceUrl) {
  const link = String(sourceUrl || '').trim();
  if (!link) return [];
  const article = parseCursorBlogArticle(html);
  return [{
    id: link,
    title: article.title || link,
    link,
    publishedAt: article.publishedAt || '',
    summary: article.summary || article.title || link
  }];
}

export function cursorOfficialMarkdownUrl(url) {
  if (!url || isBlockedFetchUrl(url)) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'cursor.com' && host !== 'www.cursor.com') return null;
    const pathname = parsed.pathname.replace(/\/$/, '');
    if (!pathname.startsWith('/docs/') && !pathname.startsWith('/help/')) return null;
    if (pathname.endsWith('.md')) return `${parsed.origin}${pathname}`;
    return `${parsed.origin}${pathname}.md`;
  } catch {
    return null;
  }
}

export function looksLikeOfficialMarkdown(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  if (/^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) return false;
  return /^#\s+\S/m.test(trimmed);
}

function keepInlineCodeToken(trimmed) {
  return /^\/[A-Za-z][\w:-]*$/.test(trimmed)
    || /^\.[A-Za-z0-9]+$/.test(trimmed)
    || /^[A-Za-z][\w-]*\.[A-Za-z0-9]+$/.test(trimmed)
    || /^\.[\w-]+(?:\/[\w.-]+)+$/.test(trimmed)
    || trimmed === '[REDACTED]'
    || trimmed === '~/.cursor/mcp.json'
    || trimmed === '~/.cursor/plugins/local'
    || trimmed === 'CURSOR_AGENT'
    || trimmed === '.cursor/keys'
    || /^\*\.[A-Za-z0-9.-]+$/.test(trimmed);
}

function stripMarkdown(value) {
  const kept = [];
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, (_, code) => {
      const trimmed = String(code || '').trim();
      if (!keepInlineCodeToken(trimmed)) return ' ';
      const idx = kept.push(trimmed) - 1;
      return ` \u0000KEEP${idx} `;
    })
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*\|.*\|$/gm, ' ')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\*\./g, '\u0000DOTSTAR.')
    .replace(/[*_#]+/g, ' ')
    .replace(/\u0000DOTSTAR\./g, '*.')
    .replace(/\u0000KEEP(\d+)/g, (_, idx) => kept[Number(idx)])
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(value) {
  const clean = stripMarkdown(value);
  if (!clean) return '';
  const body = clean.replace(/^\d+\.\s+/, '');
  const match = body.match(/^.{1,220}?(?:[.!?](?:\s|$)|$)/);
  return (match ? match[0] : body.slice(0, 220)).trim();
}

function headingBodySummary(body) {
  const first = firstSentence(body);
  if (!first) return '';
  const clean = stripMarkdown(body);
  const extras = [];
  for (const cmd of ['/goal', '/automate', '/create-rule', '/worktree', '/best-of-n', '/apply-worktree', '/delete-worktree']) {
    const token = new RegExp(`(?:^|[^\\w/])${cmd}(?=$|[^\\w-])`, 'i');
    if (token.test(clean) && !first.toLowerCase().includes(cmd)) {
      extras.push(cmd);
    }
  }
  if (/\bOIDC\b/i.test(clean) && !/\bOIDC\b/i.test(first)) extras.push('OIDC');
  if (/\bJWKS\b/i.test(clean) && !/\bJWKS\b/i.test(first)) extras.push('JWKS');
  if (/\.cursor\/hooks\.json/i.test(clean) && !/\.cursor\/hooks\.json/i.test(first)) extras.push('.cursor/hooks.json');
  if (/\.cursor\/mcp\.json/i.test(clean) && !/\.cursor\/mcp\.json/i.test(first)) extras.push('.cursor/mcp.json');
  if (/\.cursor-plugin\/plugin\.json/i.test(clean) && !/\.cursor-plugin\/plugin\.json/i.test(first)) extras.push('.cursor-plugin/plugin.json');
  if (/\bplugin\.json\b/i.test(clean) && !/\bplugin\.json\b/i.test(first)) extras.push('plugin.json');
  if (/\[REDACTED\]/i.test(clean) && !/\[REDACTED\]/i.test(first)) extras.push('[REDACTED]');
  if (/\.cursorignore\b/i.test(clean) && !/\.cursorignore\b/i.test(first)) extras.push('.cursorignore');
  if (/\.cursor\/environment\.json/i.test(clean) && !/\.cursor\/environment\.json/i.test(first)) extras.push('.cursor/environment.json');
  if (/\bnever widened\b/i.test(clean) && !/\bnever widened\b/i.test(first)) extras.push('never widened');
  if (/\bAWS PrivateLink\b/i.test(clean) && !/\bAWS PrivateLink\b/i.test(first)) extras.push('AWS PrivateLink');
  if (/\bCloudflare Tunnel\b/i.test(clean) && !/\bCloudflare Tunnel\b/i.test(first)) extras.push('Cloudflare Tunnel');
  if (/\/review-bugbot/i.test(clean) && !/\/review-bugbot/i.test(first)) extras.push('/review-bugbot');
  if (/\/review-security/i.test(clean) && !/\/review-security/i.test(first)) extras.push('/review-security');
  if (/\/agent-review/i.test(clean) && !/\/agent-review/i.test(first)) extras.push('/agent-review');
  if (/\.cursor\/BUGBOT\.md/i.test(clean) && !/\.cursor\/BUGBOT\.md/i.test(first)) extras.push('.cursor/BUGBOT.md');
  if (/\bSecurity Reviewer\b/i.test(clean) && !/\bSecurity Reviewer\b/i.test(first)) extras.push('Security Reviewer');
  if (/\bVulnerability Scanner\b/i.test(clean) && !/\bVulnerability Scanner\b/i.test(first)) extras.push('Vulnerability Scanner');
  if (/APPROVAL_POLICY\.md/.test(body) && !/APPROVAL_POLICY\.md/.test(first)) extras.push('APPROVAL_POLICY.md');
  if (/\.cursor\/approval-policies\/ROUTING\.md/.test(body) && !/\.cursor\/approval-policies\/ROUTING\.md/.test(first)) extras.push('.cursor/approval-policies/ROUTING.md');
  if (/\/remote-control/i.test(clean) && !/\/remote-control/i.test(first)) extras.push('/remote-control');
  if (/Privacy Mode \(Legacy\)/i.test(clean) && !/Privacy Mode \(Legacy\)/i.test(first)) extras.push('Privacy Mode (Legacy)');
  if (/source:\s*iosApp/i.test(body) && !/source:\s*iosApp/i.test(first)) extras.push('source: iosApp');
  if (/\/in-cloud/i.test(clean) && !/\/in-cloud/i.test(first)) extras.push('/in-cloud');
  if (/\/babysit/i.test(clean) && !/\/babysit/i.test(first)) extras.push('/babysit');
  if (/\/autopilot/i.test(clean) && !/\/autopilot/i.test(first)) extras.push('/autopilot');
  if (/\bCURSOR_AGENT\b/.test(clean) && !/\bCURSOR_AGENT\b/.test(first)) extras.push('CURSOR_AGENT');
  if (/\bsandbox\.json\b/i.test(clean) && !/\bsandbox\.json\b/i.test(first)) extras.push('sandbox.json');
  if (/\.cursor\/keys\b/i.test(clean) && !/\.cursor\/keys\b/i.test(first)) extras.push('.cursor/keys');
  if (/\bOpen Canvas\b/i.test(clean) && !/\bOpen Canvas\b/i.test(first)) extras.push('Open Canvas');
  if (/\.cursor\/worktrees\.json/i.test(clean) && !/\.cursor\/worktrees\.json/i.test(first)) extras.push('.cursor/worktrees.json');
  if (/\bRun Modes\b/i.test(clean) && !/\bRun Modes\b/i.test(first)) extras.push('Run Modes');
  if (/\bAuto-review\b/i.test(clean) && !/\bAuto-review\b/i.test(first)) extras.push('Auto-review');
  if (/\bSKILL\.md\b/.test(clean) && !/\bSKILL\.md\b/.test(first)) extras.push('SKILL.md');
  if (/\bAGENTS\.md\b/.test(clean) && !/\bAGENTS\.md\b/.test(first)) extras.push('AGENTS.md');
  if (extras.length === 0) return first;
  return `${first} ${extras.join(' ')}`.trim();
}

function shouldSkipMarkdownHeading(heading, body) {
  const key = String(heading || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return key === 'sitemap'
    || key === 'related'
    || key === 'related pages'
    || key === 'command palette'
    || key === 'get started'
    || key === 'getting started'
    || key === 'before you start'
    || key === 'team controls'
    || key === 'was this article helpful'
    || key === 'faq'
    || key === 'examples'
    || key === 'example setup configurations'
    || key === 'debugging'
    || key === 'workspace trust'
    || key === 'responsible disclosure'
    || key === 'learn more'
    || key === 'marketplace leaderboard'
    || key === 'push your first commit'
    || key === 'preview'
    || key === 'quickstart'
    || key === 'partner integrations'
    || key === 'reference'
    || (key === 'troubleshooting' && !/\bCURSOR_AGENT\b/.test(String(body || '')))
    || key === 'environment variables'
    || key === 'team distribution'
    || key === 'hook types'
    || key === 'hook categories'
    || key === 'configuration'
    || key === 'what you should know'
    || key === 'data retention'
    || key === 'protected git scopes'
    || key === 'private network access'
    || key === 'egress ip ranges'
    || key === 'user level settings'
    || key === 'environment level settings'
    || key === 'team level settings'
    || key === 'locking the setting'
    || key.startsWith('locking the setting ')
    || key === 'relationship to sandbox network policy'
    || key === 'api endpoint'
    || key === 'using the ip ranges'
    || key === 'git egress proxy and ip allow list'
    || key === 'cursor review ips'
    || key === 'one click installation'
    || key === 'using the extension api'
    || key === 'extension api reference'
    || key === 'mcp apps'
    || key === 'using mcp in chat'
    || key === 'real world examples'
    || key === 'static oauth for remote servers'
    || key === 'cursor plugin canvases'
    || key === 'the marketplace'
    || key === 'how does scim work'
    || key === 'marketplace access'
    || key === 'plugin installation modes'
    || key === 'add a team marketplace'
    || key === 'keep plugins up to date'
    || key === 'where developers find team marketplaces'
    || key === 'installing plugins'
    || key === 'managing installed plugins'
    || key === 'mcp servers'
    || key === 'mcp apps deeplinks'
    || key === 'using the workspaceopen hook'
    || key === 'test plugins locally'
    || key === 'migrate existing team mcps'
    || key === 'team and enterprise marketplaces'
    || key === 'how cloud agents work'
    || key === 'encryption'
    || key === 'what data is stored where and for how long'
    || key === 'risk considerations'
    || key === 'auditability'
    || key === 'data deletion'
    || key === 'default settings'
    || key === 'security settings'
    || key === 'aws privatelink'
    || key === 'cloudflare tunnel'
    || key === 'complete the source control connection'
    || key === 'check the private webhook path'
    || key === 'google private service connect'
    || key === 'what to send cursor'
    || key === 'further reading'
    || key === 'prerequisites'
    || key === 'setup'
    || key === 'ci check statuses'
    || key === 'analytics'
    || key === 'api'
    || key === 'admin configuration api'
    || key === 'pricing'
    || key === 'billing'
    || key === 'viewing runs'
    || key === 'endpoints'
    || key === 'open the agents window'
    || key === 'switch back to the ide'
    || key === 'enterprise access'
    || key === 'switching modes'
    || key === 'keyboard shortcuts'
    || key === 'open design mode'
    || key === 'recommended models'
    || key === 'enterprise usage'
    || key === 'role comparison'
    || key === 'managing members'
    || key === 'domain settings'
    || key === 'security sso'
    || key === 'how do i upgrade my plan'
    || key === 'how do i downgrade my plan'
    || key === 'where do i manage my subscription'
    || key === 'what if i move from an individual plan to a teams plan'
    || key === 'can i switch between monthly and yearly billing'
    || key === 'how do i switch models';
}

function isProductSubheading(heading) {
  const key = String(heading || '').toLowerCase();
  return /\bsteer\b|custom mode|\/goal|\bsubscription|ci fail|which build|using a skill|\btriggers?\b|agent-driven setup|install script|\bsecrets?\b|oidc|agents\.md|repo rules|project rules|creating a rule|what to avoid|when claims appear|when keys appear|supported hooks|hooks not available|configuration sources|execution type limits|access modes|artifact uploads|mcp\.json|project configuration|global configuration|config interpolation|team mcp|default team marketplace|plugin\.json|team follow-ups|lateral movement|\/review-bugbot|\/review-security|\/agent-review|approval policy|routing polic|risk-based approval|reviewer assignment|policy precedence|ai reviewer|risk scoring|\/remote-control|how your code stays|\/in-cloud|\/babysit|\/autopilot|select an element|select multiple elements|draw on the page|narrate by voice|console output|network traffic|tool approval|allow and block lists|browser context|authentication and isolation|^navigate$|^click$|^type$|^scroll$|^screenshot$|cursor_agent|disable heavy prompts|sandbox\.json|instant grep|explore subagent|path encryption|multi-root|open canvas|sharing canvases|packaging in skills|worktrees\.json|setup-worktree|\/worktree|\/best-of-n|\/apply-worktree|\/delete-worktree|configuration options|auto-review|run modes|mcp allowlist|customize page|extension components|skill\.md|create in the ui|sync from github|create with a cursor agent|pull request list|open a pull request|pull request page|mirrored github|files changed|folders and files|branch history and commits|go to file|sync status|detach from github|rules and protections/.test(key);
}

function appendHeadingChunk(chunks, heading, body) {
  if (shouldSkipMarkdownHeading(heading, body)) return;
  const sentence = headingBodySummary(body);
  if (heading && sentence) chunks.push(`${heading} — ${sentence}`);
  else if (heading) chunks.push(heading);
}

export function parseOfficialMarkdown(md) {
  const original = String(md || '');
  let raw = original.replace(/^\uFEFF/, '');
  raw = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  raw = raw.replace(/```[\s\S]*?```/g, '\n');
  const title = stripTags((raw.match(/^#\s+(.+)$/m) || [])[1] || '').trim();
  const chunks = [];
  const parts = raw.split(/^##\s+/m);
  const intro = firstSentence(parts[0].replace(/^#\s+.+$/m, ''));
  if (intro) chunks.push(intro);
  for (const part of parts.slice(1)) {
    const newline = part.indexOf('\n');
    const heading = stripMarkdown(newline === -1 ? part : part.slice(0, newline));
    const body = newline === -1 ? '' : part.slice(newline + 1);
    if (shouldSkipMarkdownHeading(heading, body)) continue;
    const h3parts = body.split(/^###\s+/m);
    appendHeadingChunk(chunks, heading, h3parts[0]);
    for (const h3part of h3parts.slice(1)) {
      const h3break = h3part.indexOf('\n');
      const h3heading = stripMarkdown(h3break === -1 ? h3part : h3part.slice(0, h3break));
      if (!isProductSubheading(h3heading)) continue;
      const h3body = h3break === -1 ? '' : h3part.slice(h3break + 1);
      appendHeadingChunk(chunks, h3heading, h3body);
    }
  }
  let summary = chunks.join(' ');
  const fenceTokens = [];
  if (/APPROVAL_POLICY\.md/.test(original) && !/APPROVAL_POLICY\.md/.test(summary)) {
    fenceTokens.push('APPROVAL_POLICY.md');
  }
  if (/\.cursor\/approval-policies\/ROUTING\.md/.test(original) && !/\.cursor\/approval-policies\/ROUTING\.md/.test(summary)) {
    fenceTokens.push('.cursor/approval-policies/ROUTING.md');
  }
  if (/\bBUGBOT\.md\b/.test(original) && !/\bBUGBOT\.md\b/.test(summary)) {
    fenceTokens.push('BUGBOT.md');
  }
  if (fenceTokens.length) summary = `${summary} ${fenceTokens.join(' ')}`.trim();
  return { title, summary };
}

export async function enrichOfficialHtmlPages(items, fetchImpl) {
  const out = [];
  for (const item of items || []) {
    const mdUrl = cursorOfficialMarkdownUrl(item?.link);
    if (!mdUrl || mdUrl === item.link) {
      out.push(item);
      continue;
    }
    const response = await fetchImpl(mdUrl);
    if (!response?.ok || !looksLikeOfficialMarkdown(response.text)) {
      out.push(item);
      continue;
    }
    const parsed = parseOfficialMarkdown(response.text);
    const current = String(item.summary || '');
    const summary = parsed.summary && parsed.summary.length > current.length ? parsed.summary : item.summary;
    out.push({ ...item, title: parsed.title || item.title, summary });
  }
  return out;
}

export function parseOfficialSource(text, kind, sourceUrl) {
  const normalized = String(kind || '').toLowerCase();
  if (normalized === 'html-page') {
    return parseOfficialHtmlPage(text, sourceUrl);
  }
  if (normalized === 'html') {
    return parseCursorBlogIndex(text);
  }
  return parseFeed(text);
}

export function parseCursorBlogArticle(html) {
  const text = String(html || '');
  const metaContent = (property) => {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const named = text.match(new RegExp(`<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'));
    if (named) return decodeXmlEntities(named[1]);
    const reversed = text.match(new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'));
    return reversed ? decodeXmlEntities(reversed[1]) : '';
  };
  const stripBrand = (value) => stripTags(value).replace(/\s*[·|]\s*Cursor(?:\s+Docs|\s+Documentation)?\s*$/i, '').trim();
  const titleTag = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const time = text.match(/<time\b[^>]*dateTime=["']([^"']+)["']/i);
  return {
    title: stripBrand(metaContent('og:title') || (titleTag ? titleTag[1] : '')),
    summary: stripTags(metaContent('og:description') || metaContent('description')),
    publishedAt: time ? time[1] : ''
  };
}

export async function enrichOfficialBlogItems(items, fetchImpl) {
  const out = [];
  for (const item of items || []) {
    if (!item?.link || isBlockedFetchUrl(item.link)) {
      out.push(item);
      continue;
    }
    const response = await fetchImpl(item.link);
    if (!response?.ok) {
      out.push(item);
      continue;
    }
    const article = parseCursorBlogArticle(response.text);
    out.push({
      ...item,
      title: article.title || item.title,
      summary: article.summary || item.summary,
      publishedAt: article.publishedAt || item.publishedAt
    });
  }
  return out;
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

  if (title.includes('harness') || link.includes('changelog/08-19-26')) {
    return 'Use Cloud Agent timers, GitHub PR subscriptions, or Slack — not X — to wake EOS. Honor auto-CI-fix on PRs this agent opens.';
  }
  if (isCloudAgentOverviewUrl(item?.link)) {
    return 'Cloud Agents run on isolated VMs. Use environment.json + Builds; keep this watch on official feeds, not X.';
  }
  if (isCloudAgentCapabilitiesUrl(item?.link)) {
    return 'Honor Cloud Agent subscriptions (GitHub PR, Slack, timers) and auto-CI-fix on PRs this agent opens. Do not scrape X.';
  }
  if (isAgentOverviewUrl(item?.link)) {
    return 'Keep long-lived EOS objectives in /goal. Steer running agents with follow-ups that wait for the next tool call.';
  }
  if (isPlanModeDocUrl(item?.link)) {
    return 'Plan Mode is optional desktop planning before code. Keep this watch on the standing /goal; do not rotate this Cloud Agent into Plan Mode for daily ingest. EOS TDD remains required. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isDebugModeDocUrl(item?.link)) {
    return 'Debug Mode is optional desktop debugging with a local Cursor extension. This watch already uses EOS TDD in the Cloud Agent VM; do not rotate this Cloud Agent into Debug Mode for daily ingest. Keep the standing /goal. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorCliOverviewUrl(item?.link)) {
    return 'Cursor CLI is optional local terminal agent. This Cloud Agent VM already runs ingest without the local agent CLI. Do not install Cursor CLI or rotate this watch into print mode, sandbox, or Cloud Agent handoff for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorCliUsingUrl(item?.link)) {
    return 'Using Agent in CLI is optional local terminal agent. This Cloud Agent VM already runs ingest without the local agent CLI. Do not rotate this watch into print mode, worktrees, ACP, or Cloud Agent handoff for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorCliShellModeUrl(item?.link)) {
    return 'Shell Mode is optional local Cursor CLI. This Cloud Agent VM already runs shell commands. Do not rotate this watch into Cursor CLI Shell Mode for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorCliAcpUrl(item?.link)) {
    return 'ACP is optional local Cursor CLI protocol for custom clients. This Cloud Agent VM already runs ingest without an ACP client. Do not rotate this watch into agent acp, custom stdio clients, or IDE integrations for daily ingest. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorCliHeadlessUrl(item?.link)) {
    return 'Headless CLI is optional local Cursor CLI for scripts. This Cloud Agent VM already runs ingest without print mode. Do not rotate this watch into print mode, --force, or install Cursor CLI for daily ingest. Do not put CURSOR_API_KEY in git. Keep the standing /goal. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorSdkTypescriptUrl(item?.link)) {
    return 'The TypeScript SDK is optional agent scripting. This watch uses official feeds, not @cursor/sdk or api.cursor.com. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorSdkPythonUrl(item?.link)) {
    return 'The Python SDK is optional agent scripting. This watch uses official feeds, not cursor-sdk or api.cursor.com. Do not install cursor-sdk or rotate this watch into SDK scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCursorSdkBridgeUrl(item?.link)) {
    return 'The SDK Bridge is optional local protocol for languages without a first-party SDK. This watch uses official feeds, not cursor-sdk-bridge or api.cursor.com. Do not install the SDK Bridge or rotate this watch into adapter scripts for daily ingest. Do not put CURSOR_API_KEY in git. Keep GitHub as source of truth. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isTeamPricingUrl(item?.link)) {
    return 'Team Pricing is vendor Teams and Enterprise billing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor team seat prices as EOS budget evidence. This Cloud Agent is not a Teams admin dashboard. Keep environment.json + Builds.';
  }
  if (isTeamMembersUrl(item?.link)) {
    return 'Members, roles, and seat types are vendor Teams admin config. Honor included quota. Do not switch this watch to on-demand. This Cloud Agent is not a Teams admin dashboard. Do not ingest Teams setup or SSO pages. Keep environment.json + Builds.';
  }
  if (isHelpPricingUrl(item?.link)) {
    return 'Help Pricing and plans lists vendor individual and Teams plan names. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor plan prices as EOS budget evidence. Do not change this Cloud Agent billing from the dashboard. Keep environment.json + Builds.';
  }
  if (isHelpAvailableModelsUrl(item?.link)) {
    return 'Help Available models lists vendor model names and Auto routing. Honor included quota. Do not switch this watch to on-demand. Do not treat vendor model rates as EOS budget evidence. Do not put API keys in git. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Keep environment.json + Builds.';
  }
  if (isHelpCursorRouterUrl(item?.link)) {
    return 'Help Cursor Router is vendor Auto routing with Cost, Balance, and Intelligence modes. EOS rules still bind model and governance choices. Honor included quota. Do not switch this watch to on-demand. Do not install @cursor/sdk or rotate this watch into SDK scripts for daily ingest. Do not put API keys in git. Keep environment.json + Builds.';
  }
  if (isHelpGrok45Url(item?.link)) {
    return 'Help Grok 4.5 is a prior vendor Cursor Model. Honor Auto vs Composer pool and included-credit treatment from official help. Do not treat vendor quality claims as EOS evidence. Honor included quota. Do not switch this watch to on-demand. Do not install @cursor/sdk. Do not put API keys in git. Keep environment.json + Builds.';
  }
  if (isRulesDocUrl(item?.link)) {
    return 'Commit EOS conventions as .cursor/rules/*.mdc (plain .md is ignored). Use AGENTS.md for simple instructions. Prefer /create-rule over dumping style guides. Team dashboard rules are not EOS governance.';
  }
  if (isSkillsDocUrl(item?.link) || isPromptingDocUrl(item?.link)) {
    return 'Pin an EOS skill as a Custom Mode when a session must stay on one playbook.';
  }
  if (title.includes('share your thoughts')) {
    return 'Vendor feedback thread. Do not treat forum sentiment as EOS evidence.';
  }
  if (title.includes('campus')) {
    return 'Campus community is vendor outreach. No EOS Control Plane change.';
  }
  if (titleOrLink.includes('spacex') || link.includes('joining-spacex')) {
    return 'Org/acquisition news. Do not change EOS governance from vendor ownership claims; keep FUNDACION frozen.';
  }
  if (link.includes('git-at-any-scale') || title.includes('git at any scale')) {
    return 'Vendor git-scale narrative. GitHub remains source of truth for this repo unless Origin is explicitly adopted.';
  }
  if (link.includes('cloud-agent-environment') || titleOrLink.includes('cloud agent environment')) {
    return 'Put install work in environment.json install and keep start for live services. Builds consume that split.';
  }
  if (link.includes('mixture-of-kittens') || title.includes('kitten')) {
    return 'Vendor research post. Do not treat model-training writeups as EOS production evidence.';
  }
  if (link.includes('self-driving-codebases') || title.includes('self-driving')) {
    return 'Vendor multi-agent research preview. Do not treat research harness writeups as EOS production evidence.';
  }
  if (blob.includes('/goal') || (link.includes('changelog/08-19-26') && blob.includes('goal'))) {
    return 'Keep long-lived EOS objectives in /goal instead of one-shot prompts.';
  }
  if (isOriginMirrorUrl(item?.link)) {
    return 'Keep GitHub as the source of truth for this synced repo. Do not Detach from GitHub. Origin is an optional mirror; Bugbot and Cursor Review do not require it.';
  }
  if (isOriginCreateRepositoryUrl(item?.link)) {
    return 'Creating an Origin repository is optional paid git hosting. GitHub remains source of truth for this synced repo. Do not create an Origin repo or Detach from GitHub for this watch. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isOriginPullRequestsUrl(item?.link)) {
    return 'Origin pull requests are optional Origin hosting. GitHub remains source of truth for this synced repo. Do not open Origin PRs or Detach from GitHub for this watch. This Cloud Agent VM already opens GitHub PRs. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isOriginBrowseUrl(item?.link)) {
    return 'Origin browse and search are optional Origin hosting. GitHub remains source of truth for this synced repo. Do not use Origin browse or Detach from GitHub for this watch. This Cloud Agent VM already searches its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isOriginSettingsUrl(item?.link)) {
    return 'Origin repository settings are optional Origin hosting. GitHub remains source of truth for this synced repo. Do not Detach from GitHub or manage Origin Apps for this watch. This Cloud Agent VM already uses its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isOriginCodebaseSettingsUrl(item?.link)) {
    return 'Origin codebase settings are optional team-level Origin hosting. GitHub remains source of truth for this synced repo. Do not claim a codebase name, turn Origin on or off, or manage Origin Apps for this watch. Do not put Origin API tokens in git. This Cloud Agent VM already uses its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCloudAgentBestPracticesUrl(item?.link)) {
    return 'Honor Cloud Agent setup (environment.json + Builds). Prefer OIDC over long-lived secrets. Use skills, AGENTS.md, and .cursor/rules for repo conventions. Do not put secrets in git.';
  }
  if (isCloudAgentIdentityUrl(item?.link)) {
    return 'Prefer short-lived OIDC JWTs minted in the Cloud Agent VM over long-lived secrets. Point agents at docs/cloud-agent/identity. Do not treat this socket as the Cloud Agents API. Verifiers must reject unexpected aud.';
  }
  if (isCloudAgentMetadataUrl(item?.link)) {
    return 'Read Cloud Agent run metadata from the VM socket; it is not a credential. Use OIDC JWTs when something outside the VM must verify identity. Do not confuse this with SDK/Cloud Agents API metadata tags.';
  }
  if (isHooksDocUrl(item?.link)) {
    return 'Commit command-based hooks as .cursor/hooks.json at the repo root so Cloud Agents pick them up. User-level ~/.cursor/hooks.json is not available in Cloud Agents. Do not rely on Tab, sessionStart, or prompt-based hooks in this environment.';
  }
  if (isCloudAgentSecurityNetworkUrl(item?.link)) {
    return 'Prefer Runtime Secrets or short-lived OIDC over long-lived keys in git. Treat [REDACTED] in transcripts as expected, not a missing secret. Honor Cloud Agent network allowlists; do not open *.s3 wildcards. Privacy Mode (Legacy) is not supported for Cloud Agents.';
  }
  if (isCloudAgentSecurityOverviewUrl(item?.link)) {
    return 'Treat this page as the Cloud Agent security model, not the config reference. Honor isolated VMs, access that is never widened past the triggering user, Runtime Secrets/OIDC, network allowlists, .cursorignore, and draft-PR handoff. Privacy Mode (Legacy) is not supported. Do not treat SOC 2 or Trust Center claims as EOS evidence.';
  }
  if (isCloudAgentSettingsUrl(item?.link)) {
    return 'Treat Cloud Agents dashboard settings as team-admin config, not EOS governance. Keep environment.json + Builds as the start path and honor network allowlists. Do not turn on team follow-ups: a teammate can drive an agent that holds another user\'s secrets.';
  }
  if (isCloudAgentPrivateConnectivityUrl(item?.link)) {
    return 'This Cloud Agent run is public cloud. Private Connectivity is Enterprise-only (AWS PrivateLink or Cloudflare Tunnel) for private Git/registries. It is not required for this watch. Keep GitHub as source of truth. Do not put tunnel tokens in git.';
  }
  if (isBugbotDocUrl(item?.link)) {
    return 'Bugbot is optional PR review. EOS TDD evidence remains required. /review-bugbot is in-agent review, not a substitute for tests. Keep GitHub as source of truth; do not ingest GitHub/GitLab/Bitbucket integration setup pages. Do not put Bugbot API keys in git.';
  }
  if (isAgentReviewDocUrl(item?.link)) {
    return 'Agent Review is optional in-editor review of local changes. EOS TDD evidence remains required. /agent-review is not a substitute for tests. Keep BUGBOT.md if this repo uses Bugbot rules. This watch already runs in the Cloud Agent VM, not the desktop Agents Window. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isSecurityAgentsDocUrl(item?.link)) {
    return 'Cursor Security Review is a vendor PR reviewer. EOS security-auditor skill remains the Control Plane check. /review-security is in-agent review, not a substitute for that check. Do not treat vendor finding counts as EOS evidence. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isApprovalAgentsDocUrl(item?.link)) {
    return 'PR Routing & Approval is optional vendor automation. It does not replace EOS TDD or human review. Keep exact APPROVAL_POLICY.md and .cursor/approval-policies/ROUTING.md if this repo uses them. Do not treat vendor auto-approve as EOS evidence. Keep GitHub as source of truth; do not ingest Slack or Teams setup. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCloudAgentMobileUrl(item?.link)) {
    return 'This watch runs in the Cloud Agent VM, not on iPhone or iPad. Cursor for iOS is an optional beta client. Keep environment.json + Builds on the web. /remote-control hands a local session to the cloud; tool calls stay on the computer. Privacy Mode (Legacy) is not supported. Do not ingest GitHub or GitLab setup pages. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCloudAgentApiEndpointsUrl(item?.link)) {
    return 'This watch uses official feeds, not the Cloud Agents API. Do not treat api.cursor.com as this ingest path. Do not put API keys in git. Keep GitHub as source of truth. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isAgentsWindowDocUrl(item?.link)) {
    return 'This watch already runs in the Cloud Agent VM, not in the desktop Agents Window. Use /in-cloud or /autopilot when a local session must hand work to its own VM. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isDesignModeDocUrl(item?.link)) {
    return 'Design Mode is optional desktop visual prompting in the Agents Window. This watch already runs in the Cloud Agent VM, not the desktop Agents Window. Do not rotate this Cloud Agent into Design Mode for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isBrowserToolDocUrl(item?.link)) {
    return 'Browser is optional desktop browser control. This watch already runs in the Cloud Agent VM and uses official feeds, not live sites. Do not rotate this Cloud Agent into Browser for daily ingest. Keep environment.json + Builds. Team MCP dashboard controls are not EOS governance. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isTerminalToolDocUrl(item?.link)) {
    return 'Terminal is optional desktop shell control with Run Mode and sandbox.json. This Cloud Agent VM already runs shell commands. Do not rotate this Cloud Agent into desktop Terminal for daily ingest. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isSearchToolDocUrl(item?.link)) {
    return 'Search is optional desktop Instant Grep and Explore subagent. This Cloud Agent VM already searches the workspace. Do not rotate this Cloud Agent into desktop Search for daily ingest. Keep environment.json + Builds. Do not put .cursor/keys in git. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isCanvasToolDocUrl(item?.link)) {
    return 'Canvases are optional desktop interactive artifacts in the Agents Window. This watch already runs in the Cloud Agent VM. Do not rotate this Cloud Agent into desktop Canvases for daily ingest. Keep environment.json + Builds. Shared canvases and team dashboard controls are not EOS governance. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isWorktreesDocUrl(item?.link)) {
    return 'Worktrees are optional desktop isolated Git checkouts in the Agents Window. This Cloud Agent VM already has its own checkout. Do not rotate this Cloud Agent into desktop worktrees for daily ingest. Keep environment.json + Builds. Do not put secrets in .cursor/worktrees.json. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isAgentSecurityDocUrl(item?.link)) {
    return 'Agent Security is optional desktop guardrails for first-party tools, MCP, and network. This Cloud Agent VM already honors EOS TDD and .cursorignore. Do not rotate this Cloud Agent into desktop Agent Security settings for daily ingest. Keep environment.json + Builds. Run Modes are best-effort, not a hard security boundary. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isMcpDocUrl(item?.link)) {
    return 'Commit project MCP servers as .cursor/mcp.json. User-level ~/.cursor/mcp.json is local IDE config, not this Cloud Agent environment. Team dashboard MCP can reach Cloud Agents but is not EOS governance. Do not put API keys in git.';
  }
  if (isPluginsDocUrl(item?.link)) {
    return 'Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Team marketplace plugins and ~/.cursor/plugins/local are not EOS governance and are not this Cloud Agent environment. Do not delete a team marketplace without reviewing Cloud Agent MCP impact.';
  }
  if (isCustomizeCursorDocUrl(item?.link)) {
    return 'Customize Cursor is optional desktop sidebar for plugins, skills, MCP, rules, and hooks. Keep EOS playbooks as repo skills, rules, hooks, and .cursor/mcp.json. Do not rotate this Cloud Agent into desktop Customize for daily ingest. Keep environment.json + Builds. Team marketplace and dashboard Customize are not EOS governance. Honor included quota; do not switch this watch to on-demand.';
  }
  if (isStartFromScratchUrl(item?.link) || title.includes('start from scratch')) {
    return 'Start from scratch creates an Origin repo without GitHub. GitHub remains source of truth for this synced repo. Do not Start from scratch or create an Origin repo for this watch. This Cloud Agent VM already has its GitHub checkout. Keep environment.json + Builds. Honor included quota; do not switch this watch to on-demand.';
  }
  if (/\borigin\b/.test(title) || (/\borigin\b/.test(blob) && (blob.includes('host') || blob.includes('codebase') || blob.includes('git')))) {
    return 'Treat Origin as optional paid git hosting; GitHub remains source of truth for synced repos.';
  }
  if (title.includes('builds') || link.includes('changelog/08-13-26') || blob.includes('3x faster with builds') || isCloudAgentSetupUrl(item?.link)) {
    return 'Treat Cloud Agent Builds as the default start path. Keep install idempotent in environment.json; use start for live services.';
  }
  if (title.includes('subagent') || link.includes('changelog/cloud-in-agents-window') || link.includes('/docs/subagents')) {
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
  if (titleOrLink.includes('development environment')) {
    return 'Put install work in environment.json install and keep start for live services. Builds consume that split.';
  }
  if (titleOrLink.includes('full-screen') || titleOrLink.includes('compact chat') || title.includes('new cursor interface') || titleOrLink.includes('tiled layout') || titleOrLink.includes('voice input')) {
    return 'Editor chrome only. No EOS Control Plane change.';
  }
  if (titleOrLink.includes('split pr') || titleOrLink.includes('build plan in parallel')) {
    return 'Parallel plans/PRs are optional. EOS still prefers one purpose per branch and evidence-gated commits.';
  }
  if (titleOrLink.includes('context usage')) {
    return 'Inspect context usage before stuffing the prompt. This watch should stay on changelog + citations, not full-thread dumps.';
  }
  if (titleOrLink.includes('spend') || titleOrLink.includes('usage analytics') || titleOrLink.includes('model control') || link.includes('usage-limits') || title.includes('usage and limits')) {
    return 'Honor included quota. Stop this daily watch rather than switching to paid on-demand.';
  }
  if (titleOrLink.includes('mermaid')) {
    return 'Mermaid in CLI is optional documentation. LEARNINGS.json remains the evidence store for this watch.';
  }
  if (link.includes('/help/models-and-usage/grok-4-6') || link.includes('cursor.com/help/models-and-usage/grok')) {
    return 'Honor Auto vs Composer pool and Grok 4.6 included-credit treatment from official help. Do not treat vendor quality claims as EOS evidence.';
  }
  if (link.includes('cursor.com/docs/models-and-pricing') || title.includes('models & pricing')) {
    return 'Honor included Cursor Models vs Other Models pools. Do not treat vendor rates as EOS budget evidence.';
  }
  if (title.includes('grok bot')) {
    return 'Grok Bot is a separate vendor product. This Cloud Agent watch stays on changelog + forum announcements, not Grok Bot.';
  }
  if (title.includes('grok')) {
    return 'Grok model availability is vendor catalog news. EOS still evidence-gates quality claims.';
  }
  if (title.includes('opus') || title.includes('claude')) {
    return 'Claude/Opus availability is vendor catalog news. Do not treat a forum post as a production-quality certificate.';
  }
  if (title.includes('gpt-5') || title.includes('gpt 5') || title.includes('gpt-5.6')) {
    return 'GPT availability is vendor catalog news. EOS model policy stays in workspace rules.';
  }
  if (title.includes('mindgard')) {
    return 'Vendor security-response post. Run EOS security-auditor on our diffs; do not treat the forum thread as VERIFIED.';
  }
  if (link.includes('aiuc-1') || title.includes('aiuc')) {
    return 'Vendor security certification marketing. EOS security-auditor on our diffs remains the Control Plane check.';
  }
  if (link.includes('cursor.com/blog/')) {
    return 'Official Cursor blog post. Adopt only tooling we already run; customer/press stories are not EOS evidence.';
  }
  return `Review this official Cursor item against EOS governance before adopting: ${item?.title || 'untitled'}.`;
}

export function extractActionableLearnings(items) {
  return (items || []).filter((item) => item && (item.link || item.id)).map((item) => ({
    learning_id: learningIdFromUrl(item.link || item.id),
    title: item.title || 'Untitled official item',
    source_url: item.link || item.id,
    published_at: item.publishedAt || null,
    summary: truncate(item.summary, isLivingOfficialDoc(item.link || item.id) ? 800 : 400),
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

function publishedMs(value) {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function sourcePriority(url) {
  const value = String(url || '');
  if (value.includes('cursor.com/changelog/')) return 0;
  if (value.includes('cursor.com/docs/') || value.includes('cursor.com/help/')) return 1;
  if (value.includes('cursor.com/blog/')) return 2;
  if (value.includes('forum.cursor.com')) return 3;
  return 4;
}

function clusterRowPriority(url) {
  if (isPromptingDocUrl(url) || isRulesDocUrl(url) || isMcpDocUrl(url) || isPluginsDocUrl(url) || isCustomizeCursorDocUrl(url) || isCloudAgentApiEndpointsUrl(url) || isCursorSdkTypescriptUrl(url) || isCursorSdkPythonUrl(url) || isCursorSdkBridgeUrl(url) || isTeamPricingUrl(url) || isTeamMembersUrl(url) || isHelpPricingUrl(url) || isHelpAvailableModelsUrl(url) || isHelpCursorRouterUrl(url) || isHelpGrok45Url(url) || isAgentReviewDocUrl(url) || isPlanModeDocUrl(url) || isDebugModeDocUrl(url) || isCursorCliOverviewUrl(url) || isCursorCliUsingUrl(url) || isCursorCliShellModeUrl(url) || isCursorCliAcpUrl(url) || isCursorCliHeadlessUrl(url) || isDesignModeDocUrl(url) || isBrowserToolDocUrl(url) || isTerminalToolDocUrl(url) || isSearchToolDocUrl(url) || isCanvasToolDocUrl(url) || isWorktreesDocUrl(url) || isAgentSecurityDocUrl(url) || isOriginCreateRepositoryUrl(url) || isOriginPullRequestsUrl(url) || isOriginBrowseUrl(url) || isOriginSettingsUrl(url) || isOriginCodebaseSettingsUrl(url)) {
    return sourcePriority(url) + 0.5;
  }
  return sourcePriority(url);
}

function isLivingOfficialDoc(url) {
  const value = String(url || '');
  return value.includes('cursor.com/docs/') || value.includes('cursor.com/help/');
}

function isCloudAgentOverviewUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent' || value === 'https://www.cursor.com/docs/cloud-agent';
}

function isCloudAgentCapabilitiesUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/capabilities'
    || value === 'https://www.cursor.com/docs/cloud-agent/capabilities';
}

function isCloudAgentSetupUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/setup'
    || value === 'https://www.cursor.com/docs/cloud-agent/setup';
}

function isStartFromScratchUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '').toLowerCase();
  return value.includes('changelog/start-from-scratch');
}

function isOriginMirrorUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/origin/mirror-github'
    || value === 'https://www.cursor.com/docs/origin/mirror-github';
}

function isOriginCreateRepositoryUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/origin/create-repository'
    || value === 'https://www.cursor.com/docs/origin/create-repository';
}

function isOriginPullRequestsUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/origin/pull-requests'
    || value === 'https://www.cursor.com/docs/origin/pull-requests';
}

function isOriginBrowseUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/origin/browse'
    || value === 'https://www.cursor.com/docs/origin/browse';
}

function isOriginSettingsUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/origin/settings'
    || value === 'https://www.cursor.com/docs/origin/settings';
}

function isOriginCodebaseSettingsUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/origin/codebase-settings'
    || value === 'https://www.cursor.com/docs/origin/codebase-settings';
}

function isCursorCliOverviewUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cli/overview'
    || value === 'https://www.cursor.com/docs/cli/overview';
}

function isCursorCliUsingUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cli/using'
    || value === 'https://www.cursor.com/docs/cli/using';
}

function isCursorCliShellModeUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cli/shell-mode'
    || value === 'https://www.cursor.com/docs/cli/shell-mode';
}

function isCursorCliAcpUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cli/acp'
    || value === 'https://www.cursor.com/docs/cli/acp';
}

function isCursorCliHeadlessUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cli/headless'
    || value === 'https://www.cursor.com/docs/cli/headless';
}

function isCursorSdkTypescriptUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/sdk/typescript'
    || value === 'https://www.cursor.com/docs/sdk/typescript';
}

function isCursorSdkPythonUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/sdk/python'
    || value === 'https://www.cursor.com/docs/sdk/python';
}

function isCursorSdkBridgeUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/sdk/bridge'
    || value === 'https://www.cursor.com/docs/sdk/bridge';
}

function isModelsAndPricingUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/models-and-pricing'
    || value === 'https://www.cursor.com/docs/models-and-pricing';
}

function isTeamPricingUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/account/teams/pricing'
    || value === 'https://www.cursor.com/docs/account/teams/pricing';
}

function isTeamMembersUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/account/teams/members'
    || value === 'https://www.cursor.com/docs/account/teams/members';
}

function isHelpPricingUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/help/account-and-billing/pricing'
    || value === 'https://www.cursor.com/help/account-and-billing/pricing';
}

function isHelpAvailableModelsUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/help/models-and-usage/available-models'
    || value === 'https://www.cursor.com/help/models-and-usage/available-models';
}

function isHelpCursorRouterUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/help/models-and-usage/cursor-router'
    || value === 'https://www.cursor.com/help/models-and-usage/cursor-router';
}

function isHelpGrok45Url(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/help/models-and-usage/grok-4-5'
    || value === 'https://www.cursor.com/help/models-and-usage/grok-4-5';
}

function isCloudAgentBestPracticesUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/best-practices'
    || value === 'https://www.cursor.com/docs/cloud-agent/best-practices';
}

function isCloudAgentIdentityUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/identity'
    || value === 'https://www.cursor.com/docs/cloud-agent/identity';
}

function isCloudAgentMetadataUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/metadata'
    || value === 'https://www.cursor.com/docs/cloud-agent/metadata';
}

function isHooksDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/hooks' || value === 'https://www.cursor.com/docs/hooks';
}

function isCloudAgentSecurityNetworkUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/security-network'
    || value === 'https://www.cursor.com/docs/cloud-agent/security-network';
}

function isCloudAgentSecurityOverviewUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/security'
    || value === 'https://www.cursor.com/docs/cloud-agent/security';
}

function isCloudAgentSettingsUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/settings'
    || value === 'https://www.cursor.com/docs/cloud-agent/settings';
}

function isCloudAgentPrivateConnectivityUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/private-connectivity'
    || value === 'https://www.cursor.com/docs/cloud-agent/private-connectivity';
}

function isAgentReviewDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/agent-review'
    || value === 'https://www.cursor.com/docs/agent/agent-review';
}

function isBugbotDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/bugbot'
    || value === 'https://www.cursor.com/docs/bugbot';
}

function isSecurityAgentsDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/security-agents'
    || value === 'https://www.cursor.com/docs/security-agents';
}

function isApprovalAgentsDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/approval-agents'
    || value === 'https://www.cursor.com/docs/approval-agents';
}

function isCloudAgentMobileUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/mobile'
    || value === 'https://www.cursor.com/docs/cloud-agent/mobile';
}

function isCloudAgentApiEndpointsUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/cloud-agent/api/endpoints'
    || value === 'https://www.cursor.com/docs/cloud-agent/api/endpoints';
}

function isAgentsWindowDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/agents-window'
    || value === 'https://www.cursor.com/docs/agent/agents-window';
}

function isDesignModeDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/design-mode'
    || value === 'https://www.cursor.com/docs/agent/design-mode';
}

function isBrowserToolDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/tools/browser'
    || value === 'https://www.cursor.com/docs/agent/tools/browser';
}

function isTerminalToolDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/tools/terminal'
    || value === 'https://www.cursor.com/docs/agent/tools/terminal';
}

function isSearchToolDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/tools/search'
    || value === 'https://www.cursor.com/docs/agent/tools/search';
}

function isCanvasToolDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/tools/canvas'
    || value === 'https://www.cursor.com/docs/agent/tools/canvas';
}

function isWorktreesDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/configuration/worktrees'
    || value === 'https://www.cursor.com/docs/configuration/worktrees';
}

function isAgentSecurityDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/security'
    || value === 'https://www.cursor.com/docs/agent/security';
}

function isAgentOverviewUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/overview' || value === 'https://www.cursor.com/docs/agent/overview';
}

function isPlanModeDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/plan-mode'
    || value === 'https://www.cursor.com/docs/agent/plan-mode';
}

function isDebugModeDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/debug-mode'
    || value === 'https://www.cursor.com/docs/agent/debug-mode';
}

function isSkillsDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/skills' || value === 'https://www.cursor.com/docs/skills';
}

function isPromptingDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/agent/prompting'
    || value === 'https://www.cursor.com/docs/agent/prompting';
}

function isRulesDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/rules' || value === 'https://www.cursor.com/docs/rules';
}

function isMcpDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/mcp' || value === 'https://www.cursor.com/docs/mcp';
}

function isPluginsDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/plugins' || value === 'https://www.cursor.com/docs/plugins';
}

function isCustomizeCursorDocUrl(url) {
  const value = String(url || '').split('?')[0].replace(/\/$/, '');
  return value === 'https://cursor.com/docs/customize-cursor'
    || value === 'https://www.cursor.com/docs/customize-cursor';
}

function isLowPriorityBriefing(row) {
  const hint = String(row?.apply_in_eos || '');
  return hint.includes('customer/press stories') || hint.includes('feedback thread') || hint.includes('Campus community');
}

function normalizeTitleKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function currentClusterKey(learning) {
  const url = String(learning?.source_url || '').toLowerCase();
  const title = String(learning?.title || '').toLowerCase();
  if (title.includes('grok 4.6') || url.includes('grok-4-6') || isHelpGrok45Url(learning?.source_url)) {
    return 'cluster:grok-4-6';
  }
  if (
    url.includes('changelog/08-19-26')
    || url.includes('cloud-agent/automations')
    || url.includes('cloud-agent/capabilities')
    || url.includes('help/ai-features/automations')
    || url.includes('/docs/subagents')
    || isHooksDocUrl(learning?.source_url)
    || isApprovalAgentsDocUrl(learning?.source_url)
    || isAgentsWindowDocUrl(learning?.source_url)
    || isDesignModeDocUrl(learning?.source_url)
    || isBrowserToolDocUrl(learning?.source_url)
    || isTerminalToolDocUrl(learning?.source_url)
    || isSearchToolDocUrl(learning?.source_url)
    || isCanvasToolDocUrl(learning?.source_url)
    || isWorktreesDocUrl(learning?.source_url)
    || isAgentSecurityDocUrl(learning?.source_url)
    || url.includes('changelog/cloud-in-agents-window')
    || title === 'automations'
    || title === 'subagents'
  ) {
    return 'cluster:cloud-agent-harness';
  }
  if (
    url.includes('changelog/08-13-26')
    || url.includes('cloud-agent/builds')
    || url.includes('cloud-agent/setup')
    || url.includes('cloud-agent/best-practices')
    || url.includes('cloud-agent/identity')
    || url.includes('cloud-agent/metadata')
    || url.includes('cloud-agent/security-network')
    || isCloudAgentSecurityOverviewUrl(learning?.source_url)
    || isCloudAgentSettingsUrl(learning?.source_url)
    || isCloudAgentPrivateConnectivityUrl(learning?.source_url)
    || url.includes('cursor.com/blog/builds')
  ) {
    return 'cluster:cloud-agent-builds';
  }
  if (
    url.includes('origin-code-hosting')
    || url.includes('changelog/start-from-scratch')
    || isStartFromScratchUrl(learning?.source_url)
    || url.includes('cursor.com/docs/origin')
    || title.includes('origin code hosting')
    || (title === 'origin' && url.includes('/origin'))
  ) {
    return 'cluster:origin';
  }
  if (
    url.includes('changelog/router')
    || url.includes('docs/cursor-router')
    || url.includes('help/models-and-usage/cursor-router')
    || url.includes('blog/how-cursor-router-works')
    || url.includes('blog/router')
    || title.includes('cursor router')
  ) {
    return 'cluster:cursor-router';
  }
  if (isSkillsDocUrl(learning?.source_url) || isPromptingDocUrl(learning?.source_url) || isRulesDocUrl(learning?.source_url) || isMcpDocUrl(learning?.source_url) || isPluginsDocUrl(learning?.source_url) || isCustomizeCursorDocUrl(learning?.source_url) || title === 'agent skills' || title === 'prompting agents' || title === 'rules' || title === 'model context protocol (mcp)' || title === 'plugins') {
    return 'cluster:skills-custom-modes';
  }
  if (isAgentOverviewUrl(learning?.source_url) || isPlanModeDocUrl(learning?.source_url) || isDebugModeDocUrl(learning?.source_url) || isCursorCliOverviewUrl(learning?.source_url) || isCursorCliUsingUrl(learning?.source_url) || isCursorCliShellModeUrl(learning?.source_url) || isCursorCliAcpUrl(learning?.source_url) || isCursorCliHeadlessUrl(learning?.source_url)) {
    return 'cluster:agent-overview';
  }
  if (
    isBugbotDocUrl(learning?.source_url)
    || isAgentReviewDocUrl(learning?.source_url)
    || url.includes('changelog/bugbot-updates-june-2026')
    || url.includes('help/ai-features/bugbot')
  ) {
    return 'cluster:bugbot';
  }
  if (
    isSecurityAgentsDocUrl(learning?.source_url)
    || url.includes('changelog/04-30-26')
  ) {
    return 'cluster:security-agents';
  }
  if (
    isCloudAgentMobileUrl(learning?.source_url)
    || url.includes('changelog/ios-mobile-app')
    || url.includes('changelog/ipad')
    || url.includes('forum.cursor.com/t/cursor-mobile-app-for-ios')
  ) {
    return 'cluster:cursor-ios';
  }
  if (isCloudAgentOverviewUrl(learning?.source_url) || isCloudAgentApiEndpointsUrl(learning?.source_url) || isCursorSdkTypescriptUrl(learning?.source_url) || isCursorSdkPythonUrl(learning?.source_url) || isCursorSdkBridgeUrl(learning?.source_url)) {
    return 'cluster:cloud-agent-overview';
  }
  if (isModelsAndPricingUrl(learning?.source_url) || isTeamPricingUrl(learning?.source_url) || isTeamMembersUrl(learning?.source_url) || isHelpPricingUrl(learning?.source_url) || isHelpAvailableModelsUrl(learning?.source_url)) {
    return 'cluster:models-and-pricing';
  }
  return normalizeTitleKey(learning?.title);
}

export function selectCurrentLearnings(learnings, limit = 10) {
  const byKey = new Map();
  for (const row of learnings || []) {
    const key = currentClusterKey(row);
    if (!key) continue;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, { row, clusterPublished: publishedMs(row.published_at) });
      continue;
    }
    const clusterPublished = Math.max(previous.clusterPublished, publishedMs(row.published_at));
    const bySource = clusterRowPriority(row.source_url) - clusterRowPriority(previous.row.source_url);
    if (bySource < 0 || (bySource === 0 && publishedMs(row.published_at) > publishedMs(previous.row.published_at))) {
      byKey.set(key, { row, clusterPublished });
    } else {
      previous.clusterPublished = clusterPublished;
    }
  }
  const ranked = [...byKey.values()]
    .sort((left, right) => {
      const priorityDelta = Number(isLowPriorityBriefing(left.row)) - Number(isLowPriorityBriefing(right.row));
      if (priorityDelta !== 0) return priorityDelta;
      return right.clusterPublished - left.clusterPublished;
    })
    .map((entry) => entry.row);
  const top = ranked.slice(0, limit);
  const living = ranked.filter((row) => isLivingOfficialDoc(row.source_url)).slice(0, Math.min(6, limit));
  const livingUrls = new Set(living.map((row) => row.source_url));
  const changelogKeep = top.filter((row) => sourcePriority(row.source_url) === 0);
  const fill = ranked.filter((row) => sourcePriority(row.source_url) !== 0 && !livingUrls.has(row.source_url));
  const picked = [];
  const used = new Set();
  const push = (row) => {
    if (!row || used.has(row.source_url) || picked.length >= limit) return;
    used.add(row.source_url);
    picked.push(row);
  };
  const livingBudget = Math.min(living.length, limit);
  const otherBudget = Math.max(0, limit - livingBudget);
  for (const row of changelogKeep) {
    if (picked.length >= otherBudget) break;
    push(row);
  }
  for (const row of fill) {
    if (picked.length >= otherBudget) break;
    push(row);
  }
  for (const row of living) push(row);
  return picked;
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
    const kind = String(feed.kind || '').toLowerCase();
    let parsed = parseOfficialSource(response.text, kind, feed.url);
    if (kind === 'html') {
      parsed = await enrichOfficialBlogItems(parsed, fetchImpl);
    }
    if (kind === 'html-page') {
      parsed = await enrichOfficialHtmlPages(parsed, fetchImpl);
    }
    for (const item of parsed) {
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

function learningContentFingerprint(store) {
  return JSON.stringify((store?.learnings || []).map((row) => ({
    source_url: row.source_url,
    title: row.title,
    summary: row.summary,
    apply_in_eos: row.apply_in_eos
  })));
}

function currentContentFingerprint(markdown) {
  return String(markdown || '').replace(/^Updated: .*$/m, 'Updated: STABLE');
}

function isNoopIngestWrite(existingStore, mergedStore, existingCurrent, nextCurrent, existingState, nextState, newItemCount, added) {
  if (newItemCount > 0 || added > 0) return false;
  if (learningContentFingerprint(existingStore) !== learningContentFingerprint(mergedStore)) return false;
  if (currentContentFingerprint(existingCurrent) !== currentContentFingerprint(nextCurrent)) return false;
  const prevSeen = [...(existingState?.seen_ids || [])].map(String).sort();
  const nextSeen = [...(nextState?.seen_ids || [])].map(String).sort();
  if (JSON.stringify(prevSeen) !== JSON.stringify(nextSeen)) return false;
  if (Number(existingState?.last_item_count || 0) !== Number(nextState?.last_item_count || 0)) return false;
  return true;
}

export function writeWatchlist(rootDir, watchlist) {
  const file = path.join(rootDir, 'docs/intelligence/x-watch/WATCHLIST.json');
  fs.writeFileSync(file, `${JSON.stringify(watchlist, null, 2)}\n`);
}

export function writeIngestArtifacts(rootDir, result, now = new Date()) {
  const dir = path.join(rootDir, 'docs/intelligence/x-watch');
  fs.mkdirSync(path.join(dir, 'briefings'), { recursive: true });
  const existing = loadLearnings(rootDir);
  const existingState = fs.existsSync(path.join(dir, 'STATE.json'))
    ? JSON.parse(fs.readFileSync(path.join(dir, 'STATE.json'), 'utf8'))
    : { seen_ids: [] };
  const existingCurrent = fs.existsSync(path.join(dir, 'CURRENT.md'))
    ? fs.readFileSync(path.join(dir, 'CURRENT.md'), 'utf8')
    : '';
  const incoming = extractActionableLearnings(result.items || []);
  const merged = mergeLearnings(existing, incoming);
  result.learningsAdded = merged.added;
  result.learningsStore = merged.store;
  const latest = selectCurrentLearnings(merged.store.learnings, 10);
  const citationsFile = path.join(dir, 'CITED_X_POSTS.json');
  let citationLines = ['- none recorded'];
  if (fs.existsSync(citationsFile)) {
    const cited = JSON.parse(fs.readFileSync(citationsFile, 'utf8'));
    if (validateCitedXPosts(cited).valid) {
      citationLines = cited.citations.map((row) => {
        const note = row.eos_note ? `\n  ${row.eos_note}` : '';
        return `- ${row.about} — cited by ${row.cited_by} (not fetched from X)${note}\n  ${row.x_url}`;
      });
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
    '## Official product actions',
    ...latest.map((learning) => `- **${learning.title}** — ${learning.apply_in_eos}\n  ${learning.source_url}`),
    '',
    '## @cursor_ai posts cited by third parties (not fetched)',
    ...citationLines,
    ''
  ].join('\n');
  const newItemCount = (result.newItems || []).length;
  if (isNoopIngestWrite(existing, merged.store, existingCurrent, `${currentMd}\n`, existingState, result.nextState, newItemCount, merged.added)) {
    result.artifactsWritten = false;
    return result;
  }
  fs.writeFileSync(path.join(dir, 'STATE.json'), `${JSON.stringify(result.nextState, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'LEARNINGS.json'), `${JSON.stringify(merged.store, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'CURRENT.md'), `${currentMd}\n`);
  if (newItemCount > 0) {
    const date = now.toISOString().slice(0, 10);
    fs.writeFileSync(path.join(dir, 'briefings', `${date}.md`), result.briefingMarkdown);
  }
  result.artifactsWritten = true;
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
    briefingWritten: result.newItems.length > 0,
    artifactsWritten: result.artifactsWritten !== false
  }, null, 2) + '\n');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
