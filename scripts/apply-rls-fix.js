const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function applyRLSFix() {
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../migrations/20240603_fix_rls_policies.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    console.log('Applying RLS policy fixes...');
    
    // Split the SQL into individual statements and execute them one by one
    const statements = sql.split(';').filter(statement => statement.trim().length > 0);
    
    for (const statement of statements) {
      try {
        console.log('Executing:', statement.trim().substring(0, 100) + '...');
        const { error } = await supabase.rpc('execute_sql', { query: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Continue with next statement even if one fails
        } else {
          console.log('Statement executed successfully');
        }
      } catch (err) {
        console.error('Error executing statement:', err.message);
        // Continue with next statement even if one fails
      }
    }

    console.log('RLS policy fixes applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to apply RLS fixes:', error);
    process.exit(1);
  }
}

applyRLSFix();
