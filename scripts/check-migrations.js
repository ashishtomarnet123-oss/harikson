import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const migrationsDir = path.join(projectRoot, 'harikson/tenant-api/src/migrations');

export function checkMigrationNumbers() {
  console.log('🔍 Checking migration numbers for duplicates...');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const prefixMap = new Map();
  let hasDuplicates = false;

  for (const filename of files) {
    const match = filename.match(/^(\d{3})_/);
    if (!match) {
      console.warn(`⚠️ Warning: Migration file "${filename}" does not follow 3-digit prefix naming (e.g. 001_name.sql)`);
      continue;
    }

    const prefix = match[1];
    if (prefixMap.has(prefix)) {
      console.error(
        `❌ DUPLICATE MIGRATION NUMBER DETECTED: Prefix "${prefix}" is used by both:`
      );
      console.error(`   - ${prefixMap.get(prefix)}`);
      console.error(`   - ${filename}`);
      hasDuplicates = true;
    } else {
      prefixMap.set(prefix, filename);
    }
  }

  if (hasDuplicates) {
    console.error('\n❌ Migration check failed! Duplicate migration numbers are strictly forbidden.');
    process.exit(1);
  }

  console.log(`✅ Migration check passed: ${files.length} unique sequential migration files verified.`);
}

export function checkInlineSchemaChanges() {
  console.log('🔍 Checking for illegal inline CREATE/ALTER TABLE statements in application code...');
  const disallowedExtensions = ['.ts', '.js'];
  const ignoredDirs = ['node_modules', '.next', 'dist', 'build', '.git', 'migrations', 'scripts', 'tests', '__tests__'];
  const ignoredFiles = ['migrate.ts', 'migrate.js', 'run-migrations.js'];
  const violations = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirs.includes(entry.name)) {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && disallowedExtensions.includes(path.extname(entry.name))) {
        if (ignoredFiles.includes(entry.name) || entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.ts')) {
          continue;
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (/\b(CREATE|ALTER)\s+TABLE\b/i.test(line) && !line.includes('// ignore-schema-check')) {
            violations.push({ file: fullPath, line: idx + 1, text: line.trim() });
          }
        });
      }
    }
  }

  scanDir(projectRoot);

  if (violations.length > 0) {
    console.error('❌ ILLEGAL INLINE SCHEMA MODIFICATIONS DETECTED IN APPLICATION CODE:');
    violations.forEach((v) => {
      console.error(`   - ${path.relative(projectRoot, v.file)}:${v.line} -> ${v.text}`);
    });
    console.error('   Schema modifications MUST strictly reside inside harikson/tenant-api/src/migrations/*.sql');
    process.exit(1);
  }

  console.log('✅ Inline schema check passed: No illegal runtime DDL statements found.');
}

if (process.argv[1] === __filename) {
  checkMigrationNumbers();
  checkInlineSchemaChanges();
}
