import pg from 'pg';

const DB_URL = process.env.DATABASE_URL || 'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt';

async function main() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  console.log('🔍 [INTEGRITY AUDIT] Scanning for orphaned records and foreign key violations...');

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' AND table_schema = 'public';
  `);
  const tenantTables = tablesRes.rows.map(r => r.table_name);

  let totalOrphans = 0;
  for (const tbl of tenantTables) {
    if (tbl === 'tenants') continue;
    try {
      const res = await client.query(`
        SELECT COUNT(*)::int as count 
        FROM "${tbl}" t 
        LEFT JOIN tenants p ON t.tenant_id = p.id 
        WHERE p.id IS NULL AND t.tenant_id IS NOT NULL;
      `);
      const count = res.rows[0]?.count || 0;
      if (count > 0) {
        console.log(`  🚨 Orphaned tenant records in "${tbl}": ${count}`);
        totalOrphans += count;
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Could not check table ${tbl}: ${err.message}`);
    }
  }

  // Conversation -> Messages
  const msgRes = await client.query(`
    SELECT COUNT(*)::int as count 
    FROM messages m 
    LEFT JOIN conversations c ON m.conversation_id = c.id 
    WHERE c.id IS NULL AND m.conversation_id IS NOT NULL;
  `);
  const msgOrphans = msgRes.rows[0]?.count || 0;
  if (msgOrphans > 0) {
    console.log(`  🚨 Orphaned messages (conversation missing): ${msgOrphans}`);
    totalOrphans += msgOrphans;
  }

  // Knowledge Document -> Document Embeddings
  const embRes = await client.query(`
    SELECT COUNT(*)::int as count 
    FROM document_embeddings de 
    LEFT JOIN knowledge_documents kd ON de.knowledge_document_id = kd.id 
    WHERE kd.id IS NULL AND de.knowledge_document_id IS NOT NULL;
  `);
  const embOrphans = embRes.rows[0]?.count || 0;
  if (embOrphans > 0) {
    console.log(`  🚨 Orphaned document_embeddings (document missing): ${embOrphans}`);
    totalOrphans += embOrphans;
  }

  // User -> Sessions
  const sessRes = await client.query(`
    SELECT COUNT(*)::int as count 
    FROM user_sessions s 
    LEFT JOIN users u ON s.user_id = u.id 
    WHERE u.id IS NULL AND s.user_id IS NOT NULL;
  `);
  const sessOrphans = sessRes.rows[0]?.count || 0;
  if (sessOrphans > 0) {
    console.log(`  🚨 Orphaned user_sessions (user missing): ${sessOrphans}`);
    totalOrphans += sessOrphans;
  }

  if (totalOrphans === 0) {
    console.log('  ✓ Clean scan: 0 orphaned records found across all tested relational paths.');
  }

  // Check for duplicate user emails
  const dupEmailRes = await client.query(`
    SELECT email, COUNT(*)::int as count 
    FROM users 
    WHERE email IS NOT NULL 
    GROUP BY email 
    HAVING COUNT(*) > 1;
  `);
  if (dupEmailRes.rows.length > 0) {
    console.log(`  🚨 Duplicate user emails found: ${dupEmailRes.rows.length}`);
    for (const r of dupEmailRes.rows) {
      console.log(`     - Email: ${r.email} (${r.count} occurrences)`);
    }
  } else {
    console.log('  ✓ Clean scan: 0 duplicate user emails found.');
  }

  // Check for duplicate tenant slugs
  const dupSlugRes = await client.query(`
    SELECT LOWER(slug) as slug, COUNT(*)::int as count 
    FROM tenants 
    WHERE slug IS NOT NULL 
    GROUP BY LOWER(slug) 
    HAVING COUNT(*) > 1;
  `);
  if (dupSlugRes.rows.length > 0) {
    console.log(`  🚨 Duplicate tenant slugs found: ${dupSlugRes.rows.length}`);
    for (const r of dupSlugRes.rows) {
      console.log(`     - Slug: ${r.slug} (${r.count} occurrences)`);
    }
  } else {
    console.log('  ✓ Clean scan: 0 duplicate tenant slugs found.');
  }

  await client.end();
}

main().catch(err => {
  console.error('Scan error:', err);
  process.exit(1);
});
