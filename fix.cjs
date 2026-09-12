const fs = require('fs');

const filePath = 'scripts/engine/x-learning-watch.js';
let content = fs.readFileSync(filePath, 'utf8');

// The original content had long strings returned within if conditions
const regex = /return '([^']{100,})';/g;

content = content.replace(regex, (match, p1) => {
    // Only process the ones that are just long plain English strings
    if (p1.includes('http')) return match;

    const words = p1.split(' ');
    let lines = [];
    let currentLine = '';

    for (const word of words) {
        if (currentLine.length + word.length + 1 > 80) {
            lines.push(`'${currentLine} '`);
            currentLine = word;
        } else {
            if (currentLine === '') {
                currentLine = word;
            } else {
                currentLine += ' ' + word;
            }
        }
    }
    if (currentLine !== '') {
        lines.push(`'${currentLine}'`);
    }

    return 'return ' + lines.join(' +\n      ') + ';';
});

fs.writeFileSync(filePath, content, 'utf8');
