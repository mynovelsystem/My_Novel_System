const fs = require('fs');

const bg = fs.readFileSync('background.js', 'utf8');
const pop = fs.readFileSync('popup.js', 'utf8');
const cnt = fs.readFileSync('content.js', 'utf8');

function getMessageTypes(str) {
  const regex = /type:\s*["']([A-Z0-9_]+)["']/g;
  const types = new Set();
  let match;
  while ((match = regex.exec(str)) !== null) {
    types.add(match[1]);
  }
  return Array.from(types);
}

const popTypes = getMessageTypes(pop);
const cntTypes = getMessageTypes(cnt);

console.log('Popup types:', popTypes);
console.log('Content types:', cntTypes);

// Extract GROUP_1 and GROUP_2 from background.js
const g1Match = bg.match(/const GROUP_1_CONTENT_SCRIPT_MESSAGES = new Set\(\[([\s\S]*?)\]\);/);
const g2Match = bg.match(/const GROUP_2_ADMIN_MESSAGES = new Set\(\[([\s\S]*?)\]\);/);

const g1 = g1Match ? g1Match[1].match(/"([A-Z0-9_]+)"/g).map(s => s.replace(/"/g, '')) : [];
const g2 = g2Match ? g2Match[1].match(/"([A-Z0-9_]+)"/g).map(s => s.replace(/"/g, '')) : [];

console.log('GROUP_1 in bg:', g1);
console.log('GROUP_2 in bg:', g2);

const allWhitelisted = new Set([...g1, ...g2]);

console.log('\nPopup types NOT in whitelist:');
popTypes.forEach(t => {
  if (!allWhitelisted.has(t)) console.log(' - ' + t);
});

console.log('\nContent types NOT in whitelist:');
cntTypes.forEach(t => {
  if (!allWhitelisted.has(t)) console.log(' - ' + t);
});
