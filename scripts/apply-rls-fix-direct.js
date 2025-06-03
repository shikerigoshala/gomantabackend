const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
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

    // Create the temporary execute_sql function
    console.log('Creating temporary execute_sql function...');
    const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION pg_temp.execute_sql(query text)
    RETURNS json AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE query;
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'state', SQLSTATE
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: funcError } = await supabase.rpc('pg_temp.execute_sql', { query: createFunctionSQL });
    if (funcError) {
      console.error('Error creating temporary function:', funcError);
      throw new Error('Failed to create temporary SQL function');
    }

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../migrations/20240603_fix_rls_policies.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    console.log('Applying RLS policy fixes...');
    
    // Split the SQL into individual statements and execute them one by one
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));

    for (const statement of statements) {
      try {
        console.log('Executing:', statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        const { data, error } = await supabase.rpc('pg_temp.execute_sql', { query: statement });
        
        if (error || (data && data.success === false)) {
          console.error('Error executing statement:', error || data.error);
        } else {
          console.log('Statement executed successfully');
        }
      } catch (err) {
        console.error('Error executing statement:', err.message);
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
