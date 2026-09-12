import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HighSpeedWebScrapingEngine } from '../src/core/scraping/high-speed-web-scraping-engine.js';

describe('HighSpeedWebScrapingEngine', () => {
  it('throws an error if input is not a string', () => {
    const engine = new HighSpeedWebScrapingEngine();
    assert.throws(() => engine.scrapeHtml(null), /Scrape target must be a valid HTML string/);
    assert.throws(() => engine.scrapeHtml(123), /Scrape target must be a valid HTML string/);
    assert.throws(() => engine.scrapeHtml({}), /Scrape target must be a valid HTML string/);
  });

  it('extracts the title', () => {
    const engine = new HighSpeedWebScrapingEngine();
    const result = engine.scrapeHtml('<html><head><title> My Awesome Title </title></head></html>');
    assert.equal(result.title, 'My Awesome Title');
  });

  it('extracts meta tags and OpenGraph tags', () => {
    const engine = new HighSpeedWebScrapingEngine();
    const html = `
      <meta name="description" content="A test page">
      <meta property="og:title" content="OG Title Test">
      <meta name="author" content='John Doe'>
    `;
    const result = engine.scrapeHtml(html);
    assert.equal(result.meta.description, 'A test page');
    assert.equal(result.meta['og:title'], 'OG Title Test');
    assert.equal(result.meta.author, 'John Doe');
  });

  it('extracts JSON-LD blocks and gracefully handles malformed JSON', () => {
    const engine = new HighSpeedWebScrapingEngine();
    const html = `
      <script type="application/ld+json">
        { "@context": "http://schema.org", "@type": "WebSite", "name": "Valid JSON" }
      </script>
      <script type="application/ld+json">
        { invalid json }
      </script>
      <script type='application/ld+json'>
        {"test": 123}
      </script>
    `;
    const result = engine.scrapeHtml(html);
    assert.equal(result.json_ld.length, 2);
    assert.equal(result.json_ld[0].name, 'Valid JSON');
    assert.equal(result.json_ld[1].test, 123);
  });

  it('extracts headings (h1-h6)', () => {
    const engine = new HighSpeedWebScrapingEngine();
    const html = `
      <h1>Main Title</h1>
      <h2>Sub Title <span>with span</span></h2>
      <h6>Small title</h6>
    `;
    const result = engine.scrapeHtml(html);
    assert.equal(result.headings.length, 3);
    assert.deepEqual(result.headings[0], { level: 1, text: 'Main Title' });
    assert.deepEqual(result.headings[1], { level: 2, text: 'Sub Title with span' });
    assert.deepEqual(result.headings[2], { level: 6, text: 'Small title' });
  });

  it('extracts links, filtering javascript: and limiting to top 100', () => {
    const engine = new HighSpeedWebScrapingEngine();
    let html = '<a href="https://example.com">Example</a>';
    html += '<a href="javascript:alert(1)">No JS</a>';
    html += '<a href="/relative">Relative</a>';

    // Add 100 more valid links to test the limit
    for (let i = 0; i < 100; i++) {
        html += `<a href="/link${i}">Link ${i}</a>`;
    }

    const result = engine.scrapeHtml(html);
    assert.equal(result.links.length, 100);
    assert.equal(result.links[0].href, 'https://example.com');
    assert.equal(result.links[0].text, 'Example');
    assert.equal(result.links[1].href, '/relative');
    assert.equal(result.links[1].text, 'Relative');

    // Ensure javascript: link is not present
    const hasJsLink = result.links.some(l => l.href.startsWith('javascript:'));
    assert.equal(hasJsLink, false);
  });

  it('performs semantic markdown distillation', () => {
    const engine = new HighSpeedWebScrapingEngine();
    const html = `
      <html>
        <head>
          <script>console.log("hide this");</script>
          <style>body { color: red; }</style>
        </head>
        <body>
          <nav>Should be hidden</nav>
          <h1>Heading 1</h1>
          <p>This is a paragraph with &nbsp; space and &amp; and &lt; and &gt;.</p>
          <h2>Heading 2</h2>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <h3>Heading 3</h3>
          <footer>Hidden footer</footer>
          <noscript>Hidden noscript</noscript>
        </body>
      </html>
    `;

    const result = engine.scrapeHtml(html);
    const md = result.distilled_markdown;

    assert.ok(!md.includes('hide this'), 'script tags should be removed');
    assert.ok(!md.includes('color: red'), 'style tags should be removed');
    assert.ok(!md.includes('Should be hidden'), 'nav tags should be removed');
    assert.ok(!md.includes('Hidden footer'), 'footer tags should be removed');
    assert.ok(!md.includes('Hidden noscript'), 'noscript tags should be removed');

    assert.ok(md.includes('# Heading 1'), 'h1 should convert to markdown');
    assert.ok(md.includes('## Heading 2'), 'h2 should convert to markdown');
    assert.ok(md.includes('### Heading 3'), 'h3 should convert to markdown');
    assert.ok(md.includes('* Item 1'), 'li should convert to markdown');
    assert.ok(md.includes('This is a paragraph with   space and & and < and >.'), 'entities should be decoded');
  });

  it('validates cache hit functionality and telemetry', () => {
    const engine = new HighSpeedWebScrapingEngine();
    const html = '<html><body><h1>Test</h1><p>Content here.</p></body></html>';

    const result1 = engine.scrapeHtml(html, { url: 'https://test.com' });
    assert.equal(result1.cache_hit, false);
    assert.ok(result1.telemetry.raw_bytes > 0);
    assert.ok(result1.telemetry.distilled_bytes > 0);
    assert.ok(typeof result1.telemetry.parse_time_ms === 'number');
    assert.ok(typeof result1.telemetry.token_compression_ratio_percent === 'number');
    assert.equal(result1.url, 'https://test.com');

    const result2 = engine.scrapeHtml(html, { url: 'https://test.com' });
    assert.equal(result2.cache_hit, true);
    assert.equal(result2.parse_time_ms, 0.05);
    assert.equal(result2.title, result1.title);
  });
});
