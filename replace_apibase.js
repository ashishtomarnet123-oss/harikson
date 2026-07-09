const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('admin-panel/app');
let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the useState
  if (content.includes("useState('http://localhost:4008')")) {
    content = content.replace(/const\s+\[apiBase,\s*setApiBase\]\s*=\s*useState\('http:\/\/localhost:4008'\);/g, "const apiBase = '/api-proxy';");
    content = content.replace(/const\s+apiBase\s*=\s*window\.location\.hostname\s*===\s*'localhost'\s*\?\s*'http:\/\/localhost:4008'\s*:\s*`http:\/\/\$\{window\.location\.hostname\}:4008`;/g, "const apiBase = '/api-proxy';");
    content = content.replace(/const\s+apiBase\s*=\s*typeof window\s*!==\s*'undefined'\s*&&\s*window\.location\.hostname\s*===\s*'localhost'\s*\?\s*'http:\/\/localhost:4008'\s*:\s*`http:\/\/\$\{window\.location\.hostname\}:4008`;/g, "const apiBase = '/api-proxy';");
    
    // Remove the useEffect that sets apiBase
    const effectRegex1 = /useEffect\(\(\)\s*=>\s*\{\s*if\s*\(typeof window !== 'undefined'\)\s*\{\s*const hostname = window\.location\.hostname;\s*if\s*\(hostname !== 'localhost' && hostname !== '127\.0\.0\.1'\)\s*\{\s*setApiBase\(`http:\/\/\$\{hostname\}:4008`\);\s*\}\s*\}\s*\}\,\s*\[\]\);/g;
    content = content.replace(effectRegex1, "");
    
    const effectRegex2 = /useEffect\(\(\)\s*=>\s*\{\s*if\s*\(typeof window !== 'undefined'\)\s*\{\s*const h = window\.location\.hostname;\s*if\s*\(h !== 'localhost' && h !== '127\.0\.0\.1'\)\s*setApiBase\(`http:\/\/\$\{h\}:4008`\);\s*\}\s*\}\,\s*\[\]\);/g;
    content = content.replace(effectRegex2, "");
    
    fs.writeFileSync(file, content);
    modifiedFiles++;
    console.log('Updated:', file);
  } else if (content.includes("window.location.hostname") && content.includes("4008")) {
    // Catch cases in founder/page.tsx
    content = content.replace(/const apiBase = window\.location\.hostname === 'localhost' \? 'http:\/\/localhost:4008' : `http:\/\/\$\{window\.location\.hostname\}:4008`;/g, "const apiBase = '/api-proxy';");
    content = content.replace(/\? 'http:\/\/localhost:4008' \n\s*: `http:\/\/\$\{window\.location\.hostname\}:4008`;/g, "? '/api-proxy' : '/api-proxy';");
    fs.writeFileSync(file, content);
    modifiedFiles++;
    console.log('Updated founder edgecase:', file);
  }
});
console.log('Total files modified:', modifiedFiles);
