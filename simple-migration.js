require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Connected to Supabase');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '20240603_fix_schema.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    // Execute the entire SQL file directly
    console.log('Executing migration...');
    const { data, error } = await supabase.rpc('execute', { query: sql });
    
    if (error) {
      console.error('Error executing migration:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully');
    console.log(data);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
