import { runMigrations } from './run-migrations.js';

runMigrations()
  .then(() => {
    console.log('✅ Database migrations applied successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
