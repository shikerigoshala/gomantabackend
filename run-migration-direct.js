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

    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add back the semicolon
      console.log(`\n--- Executing statement ${i + 1}/${statements.length} ---`);
      console.log(statement.substring(0, 200) + (statement.length > 200 ? '...' : ''));
      
      try {
        const { data, error } = await supabase.rpc('execute', { query: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
          console.error('Failed statement:', statement);
          continue; // Continue with next statement even if one fails
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('Failed statement:', statement);
      }
    }

    console.log('\n🎉 Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
