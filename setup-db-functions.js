require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function setupDatabaseFunctions() {
  try {
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

    console.log('Setting up database functions...');

    // Create or replace the execute_sql function
    const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.execute_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE query;
      RETURN json_build_object('success', true, 'message', 'Query executed successfully');
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'message', SQLERRM,
        'detail', SQLSTATE,
        'context', PG_EXCEPTION_CONTEXT
      );
    END;
    $$;
    `;

    // Create a temporary function that can be called without RLS
    const createTempFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.pg_temp.execute_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE query;
      RETURN json_build_object('success', true, 'message', 'Query executed successfully');
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'message', SQLERRM,
        'detail', SQLSTATE,
        'context', PG_EXCEPTION_CONTEXT
      );
    END;
    $$;
    `;

    // Execute the function creation
    console.log('Creating execute_sql function...');
    const { error: createError } = await supabase.rpc('execute_sql', {
      query: createFunctionSQL
    });

    if (createError) {
      console.error('Error creating execute_sql function:', createError);
      return false;
    }
    console.log('Successfully created execute_sql function');

    // Execute the temporary function creation
    console.log('Creating temporary execute_sql function...');
    const { error: tempError } = await supabase.rpc('execute_sql', {
      query: createTempFunctionSQL
    });

    if (tempError) {
      console.error('Error creating temporary execute_sql function:', tempError);
      return false;
    }
    console.log('Successfully created temporary execute_sql function');

    console.log('Database functions setup completed');
  } catch (error) {
    console.error('Error setting up database functions:', error);
    process.exit(1);
  }
}

setupDatabaseFunctions().catch(console.error);
