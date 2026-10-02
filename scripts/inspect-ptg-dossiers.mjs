import fs from 'node:fs';
import path from 'node:path';

const ptgDir = 'C:\\Users\\valen\\Documents\\agencia de representacion de jugadores - ptg';
const dossiersDir = path.join(ptgDir, 'dossiers');

const files = fs.readdirSync(dossiersDir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(dossiersDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`=== ${file} (${(content.length / 1024).toFixed(1)} KB) ===`);
  
  // Find all img tags
  const imgMatches = content.match(/<img[^>]+>/g) || [];
  console.log(`  Img tags count: ${imgMatches.length}`);
  imgMatches.forEach((tag, idx) => {
    const isBase64 = tag.includes('data:image');
    const altMatch = tag.match(/alt="([^"]+)"/) || tag.match(/alt='([^']+)'/);
    const classMatch = tag.match(/class="([^"]+)"/) || tag.match(/class='([^']+)'/);
    const alt = altMatch ? altMatch[1] : 'no-alt';
    const cls = classMatch ? classMatch[1] : 'no-class';
    console.log(`    [${idx}] ${isBase64 ? 'BASE64 (' + tag.length + ' chars)' : 'LINK'}: class="${cls}" alt="${alt}"`);
  });
}
