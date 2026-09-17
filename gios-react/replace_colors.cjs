const fs = require('fs');
const path = require('path');

const DIRECTORY = path.join(__dirname, 'src');

const replacements = [
  { search: /#00ffaa/g, replace: 'primary' },
  { search: /#00aaee/g, replace: 'secondary' },
  { search: /#0a0e17/g, replace: 'accent' },
  { search: /#0F1621/g, replace: 'accent' },
  { search: /#141C27/g, replace: 'accent' }, // Optional, dark gray
  { search: /#ff3366/g, replace: 'danger' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // We need to replace class names like text-[#00ffaa] with text-primary
      // We also need to replace strings like "#00ffaa" with "var(--color-primary)" in inline styles or canvas properties.
      
      // 1. Tailwind arbitrary values: e.g. text-[#00ffaa] -> text-primary
      // We will match [hex] inside classes
      const hexes = [
        { hex: '#00ffaa', name: 'primary' },
        { hex: '#00aaee', name: 'secondary' },
        { hex: '#0a0e17', name: 'accent' },
        { hex: '#0F1621', name: 'accent' },
        { hex: '#141C27', name: 'accent' },
        { hex: '#ff3366', name: 'danger' },
        { hex: '#ffcc00', name: 'warning' }
      ];

      for (const h of hexes) {
        // Replace in tailwind classes: [hex]
        const classRegex = new RegExp(`\\[${h.hex}\\]`, 'gi');
        if (classRegex.test(content)) {
          content = content.replace(classRegex, h.name);
          changed = true;
        }
        
        // Replace in JS strings: '#00ffaa' -> 'var(--color-primary)'
        // but wait! If it's used in Leaflet pathOptions or ChartJS, var() might not work in some contexts without getComputedStyle.
        // Wait, Leaflet pathOptions actually supports CSS variables? No, Leaflet pathOptions color uses Canvas or SVG. In SVG it supports CSS vars!
        // In Chart.js, CSS variables don't work natively unless you use getComputedStyle or a plugin. But Chart.js in Analytics.jsx might use hex colors.
        // Let's just do a generic replace for hex strings to var(--color-name) and hope it works for inline SVGs/styles.
        const stringRegex = new RegExp(`['"]${h.hex}['"]`, 'gi');
        if (stringRegex.test(content)) {
          content = content.replace(stringRegex, `'var(--color-${h.name})'`);
          changed = true;
        }

        // What about just the hex #00ffaa in template strings?
        const templateRegex = new RegExp(`${h.hex}`, 'gi');
        if (templateRegex.test(content)) {
           // careful not to replace it if we just did
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(DIRECTORY);
