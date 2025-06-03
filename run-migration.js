const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Error: Supabase URL and Service Role Key must be set in environment variables');
      process.exit(1);
    }

    console.log('Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations/20240603_add_user_roles_and_family_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Running ${statements.length} SQL statements...`);
    
    // Execute each statement one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 100) + '...'); // Log first 100 chars of the statement
      
      try {
        // Test connection by fetching a single user
        const { error: connectionError } = await supabase
          .from('users')
          .select('*')
          .limit(1);
        
        if (connectionError) throw connectionError;
        
        // Execute the actual statement
        const { error: execError } = await supabase.rpc('execute_sql', { 
          query: statement 
        });
        
        if (execError) {
          console.error(`Error in statement ${i + 1}:`, execError);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        console.error(`Error executing statement ${i + 1}:`, error.message);
      }
      
      // Add a small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();
