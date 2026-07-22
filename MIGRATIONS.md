# Harikson/Neuravolt Database Migration System & Governance

This document establishes the architecture, standards, and integrity safeguards governing database schema migrations across the Harikson/Neuravolt platform.

---

## 1. Directory & Naming Conventions

All SQL migration files reside in:
`harikson/tenant-api/src/migrations/`

Migration filenames **MUST** strictly follow the 3-digit zero-padded sequential prefix format:
`NNN_short_descriptive_name.sql`

### Examples
- `001_initial_schema.sql`
- `002_add_subscriptions.sql`
- `017_remove_container_id.sql`
- `022_add_tax_system.sql`

---

## 2. Migration Execution & Checksum Integrity

Migrations are automatically tracked and executed using the transaction-safe runner script:
`node scripts/run-migrations.js`

### How the Runner Operates
1. **Idempotent Tracking Table (`migrations_meta`):**
   Maintains an immutable ledger recording:
   - `id`: UUID primary key
   - `filename`: Unique migration filename
   - `checksum`: SHA-256 hash of the `.sql` file contents
   - `executed_at`: Timestamp of execution

2. **Sequential Transaction Execution:**
   Migrations execute in strict numerical order. Each unexecuted migration runs inside an isolated database transaction (`BEGIN` ... `COMMIT`). If an error occurs, the transaction rolls back cleanly without leaving partial schema changes.

3. **Tamper Prevention (SHA-256 Validation):**
   Before running, the runner calculates the SHA-256 checksum of every migration file and compares it to `migrations_meta`. If a previously executed migration file has been modified or tampered with after deployment, execution immediately halts with a fatal checksum mismatch error.

---

## 3. Automated CI & Pre-Commit Rules

A CI validation script runs automatically on every pull request and pre-commit hook:
`node scripts/check-migrations.js`

### Enforced Rule Checks
- **No Duplicate Prefixes:** CI fails immediately if two migration files share the same numerical prefix (e.g. `005_a.sql` and `005_b.sql`).
- **Sequential Gap Verification:** Ensures prefix numbers increase continuously.

---

## 4. Developer Policy & Best Practices

1. **Immutability of Committed Migrations:**
   Once a migration file is merged into `main` or executed in any environment, **NEVER edit or delete it**. If schema changes are required, create a new sequential migration file (e.g., `023_modify_user_settings.sql`).

2. **Idempotent DDL Constructs:**
   Write migration SQL statements using safe DDL patterns:
   - `CREATE TABLE IF NOT EXISTS ...`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
   - `CREATE INDEX IF NOT EXISTS ...`
   - `DROP TABLE IF EXISTS ...`

3. **Pull Request Code Review Mandatory:**
   All PRs containing database migration files require explicit approval from a database administrator or senior lead engineer.
