import pg from 'pg';
import crypto from 'crypto';
import assert from 'assert';

const { Pool } = pg;

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5435/neuravolt';

console.log('🧪 Connecting to test database at:', dbUrl);

const pool = new Pool({
  connectionString: dbUrl,
  max: 2,
  idleTimeoutMillis: 1000,
});

async function runTests() {
  console.log(
    '\n🚀 Starting RAG Document Database Mapping Verification Tests...'
  );

  try {
    const tenantId = '00000000-0000-0000-0000-000000000010';
    const userId = '00000000-0000-0000-0000-000000000100';

    console.log('🔹 Setting up temporary tenant and user...');
    await pool.query('SET row_security = off;');
    await pool.query('DELETE FROM knowledge_documents WHERE tenant_id = $1', [
      tenantId,
    ]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);

    await pool.query(
      "INSERT INTO tenants (id, name, slug, plan) VALUES ($1, 'Test Tenant', 'test-rag-tenant', 'starter')",
      [tenantId]
    );
    await pool.query(
      "INSERT INTO users (id, tenant_id, email, password_hash, role, settings) VALUES ($1, $2, 'rag-user@test.com', 'pwd', 'user', '{\"presets\":[]}')",
      [userId, tenantId]
    );

    // Test 1: Verify users table doesn't have duplicate columns
    console.log(
      '\n🔹 Test 1: Verifying duplicate JSONB columns have been dropped from users...'
    );
    const usersColCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('activity_logs', 'connected_devices', 'developer_keys')
    `);
    assert.strictEqual(
      usersColCheck.rows.length,
      0,
      'Should not find activity_logs, connected_devices, or developer_keys columns in users table'
    );
    console.log(
      '   ✓ Verified: Duplicate JSONB columns are completely removed from users table.'
    );

    // Test 2: Verify settings does not contain RAG files array anymore
    console.log(
      '\n🔹 Test 2: Verifying settings column does not contain rag_files...'
    );
    const userSettingsCheck = await pool.query(
      'SELECT settings FROM users WHERE id = $1',
      [userId]
    );
    const settingsObj = userSettingsCheck.rows[0].settings || {};
    assert.strictEqual(
      settingsObj.rag_files,
      undefined,
      'settings JSONB should not contain rag_files array'
    );
    console.log('   ✓ Verified: rag_files removed from users.settings.');

    // Test 3: Insert RAG file to knowledge_documents and verify attributes
    console.log('\n🔹 Test 3: Inserting RAG file into knowledge_documents...');
    const docId = crypto.randomUUID();
    const docName = 'rag-test-document.txt';
    const docContent = 'This is a test content for RAG matching.';

    await pool.query(
      `
      INSERT INTO knowledge_documents (id, tenant_id, user_id, filename, file_type, file_size_bytes, content, is_active, status)
      VALUES ($1, $2, $3, $4, 'txt', $5, $6, true, 'indexed')
    `,
      [docId, tenantId, userId, docName, docContent.length, docContent]
    );

    // Fetch and assert
    const docRecord = await pool.query(
      'SELECT * FROM knowledge_documents WHERE id = $1',
      [docId]
    );
    assert.strictEqual(docRecord.rows.length, 1);
    assert.strictEqual(
      docRecord.rows[0].user_id,
      userId,
      'RAG document should be mapped to the user'
    );
    assert.strictEqual(docRecord.rows[0].filename, docName);
    assert.strictEqual(docRecord.rows[0].content, docContent);
    assert.strictEqual(docRecord.rows[0].is_active, true);
    console.log(
      '   ✓ Verified: RAG document successfully saved with content, user_id, and is_active in knowledge_documents table.'
    );

    // Test 4: Toggle active state
    console.log('\n🔹 Test 4: Toggling active state...');
    await pool.query(
      `
      UPDATE knowledge_documents SET is_active = false WHERE id = $1
    `,
      [docId]
    );
    const docRecordToggled = await pool.query(
      'SELECT is_active FROM knowledge_documents WHERE id = $1',
      [docId]
    );
    assert.strictEqual(docRecordToggled.rows[0].is_active, false);
    console.log('   ✓ Verified: Active state successfully toggled.');

    // Test 5: pgvector table structure and embeddings mapping
    console.log(
      '\n🔹 Test 5: Verifying document_embeddings schema and pgvector table creation...'
    );
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_embeddings' 
      ORDER BY ordinal_position
    `);
    assert.ok(
      tableCheck.rows.length > 0,
      'document_embeddings table should exist'
    );
    const hasEmbeddingCol = tableCheck.rows.some(
      (r) =>
        r.column_name === 'embedding' &&
        (r.data_type === 'USER-DEFINED' || r.data_type === 'vector')
    );
    assert.ok(
      hasEmbeddingCol,
      'embedding column should exist with vector data type'
    );
    console.log(
      '   ✓ Verified: document_embeddings table exists with vector column.'
    );

    // Test 6: Insert chunk and vector embedding, and run similarity search
    console.log(
      '\n🔹 Test 6: Inserting chunk, vector embedding, and performing similarity search...'
    );
    const docId2 = crypto.randomUUID();
    const docName2 = 'vector-test-doc.txt';
    const docContent2 =
      'This is vector database content for matching semantic embeddings.';

    await pool.query(
      `
      INSERT INTO knowledge_documents (id, tenant_id, user_id, filename, file_type, file_size_bytes, content, is_active, status)
      VALUES ($1, $2, $3, $4, 'txt', $5, $6, true, 'indexed')
    `,
      [docId2, tenantId, userId, docName2, docContent2.length, docContent2]
    );

    // Insert mock 1536-dimensional embedding
    const mockVector = new Array(1536).fill(0.0);
    mockVector[0] = 0.5;
    mockVector[10] = -0.3;
    mockVector[100] = 0.8;
    const mockVectorStr = `[${mockVector.join(',')}]`;

    const embId = crypto.randomUUID();
    await pool.query(
      `
      INSERT INTO document_embeddings (id, tenant_id, knowledge_document_id, content, embedding)
      VALUES ($1, $2, $3, $4, $5::vector)
    `,
      [
        embId,
        tenantId,
        docId2,
        'semantic query chunk text content',
        mockVectorStr,
      ]
    );

    // Query using cosine similarity
    const searchRes = await pool.query(
      `
      SELECT content, 1 - (embedding <=> $1::vector) AS similarity
      FROM document_embeddings
      WHERE tenant_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT 1
    `,
      [mockVectorStr, tenantId]
    );

    assert.strictEqual(searchRes.rows.length, 1);
    assert.ok(
      searchRes.rows[0].similarity > 0.99,
      'Similarity should be near 1.0 for the identical vector'
    );
    assert.strictEqual(
      searchRes.rows[0].content,
      'semantic query chunk text content'
    );
    console.log(
      '   ✓ Verified: pgvector cosine similarity search executed correctly with expected result.'
    );

    // Test 7: Verify cascade deletion
    console.log(
      '\n🔹 Test 7: Verifying cascade deletion of embeddings on document delete...'
    );
    await pool.query('DELETE FROM knowledge_documents WHERE id = $1', [docId2]);
    const embRecordCheck = await pool.query(
      'SELECT COUNT(*)::int FROM document_embeddings WHERE id = $1',
      [embId]
    );
    assert.strictEqual(
      embRecordCheck.rows[0].count,
      0,
      'Associated document embedding should be deleted automatically via cascade reference'
    );
    console.log(
      '   ✓ Verified: Cascade deletion removed associated embeddings when the knowledge document was removed.'
    );

    // Cleanup
    console.log('\n🔹 Cleaning up test database records...');
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.query('SET row_security = on;');

    console.log('\n✅ All tests passed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
