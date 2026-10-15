const fs = require('fs');

const files = ['background.js', 'content.js', 'popup.js'];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/type\s*:\s*["'][^"']+["']/g) || [];
  const unique = [...new Set(matches.map(m => m.replace(/type\s*:\s*["']/, '').replace(/["']/, '')))];
  console.log(file + ':', unique);
}
