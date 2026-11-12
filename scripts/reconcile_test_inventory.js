import fs from 'fs';
import path from 'path';

function findTestFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        results = results.concat(findTestFiles(fullPath));
      }
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const tenantTestFiles = findTestFiles('harikson/tenant-api/tests');
const adminTestFiles = findTestFiles('admin-api/tests');
const allTestFiles = [...tenantTestFiles, ...adminTestFiles];

console.log('========================================================================');
console.log('🧪 Xarwiz Platform Comprehensive Test Inventory Reconciliation');
console.log('========================================================================');

let totalUniqueTests = 0;
const inventory = [];
const seenTestTitles = new Set();
let duplicatesCount = 0;

for (const filePath of allTestFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Match it('...' or test('...' or it("..." or test("..."
  const regex = /(?:it|test)\s*\(\s*['"`](.*?)['"`]/g;
  let match;
  const fileTests = [];
  while ((match = regex.exec(content)) !== null) {
    const title = match[1];
    fileTests.push(title);
    if (seenTestTitles.has(title)) {
      duplicatesCount++;
    } else {
      seenTestTitles.add(title);
    }
  }
  totalUniqueTests += fileTests.length;
  inventory.push({ filePath, count: fileTests.length, tests: fileTests });
}

inventory.sort((a, b) => b.count - a.count);

console.log(`Discovered ${allTestFiles.length} test files with ${totalUniqueTests} total declared test cases.`);
console.log(`Unique test titles across all files: ${seenTestTitles.size}`);
console.log(`Duplicate test titles across different suites: ${duplicatesCount}\n`);

console.log('--- Top Test Suites by Test Case Count ---');
for (const item of inventory.slice(0, 25)) {
  console.log(` - ${item.filePath.padEnd(65)} : ${String(item.count).padStart(3)} tests`);
}

