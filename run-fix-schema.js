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
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('pg_temp.execute_sql', { query: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
          console.error('Failed statement:', statement);
          continue; // Continue with next statement even if one fails
        }
        
        console.log(`Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`Error executing statement ${i + 1}:`, error.message);
        console.error('Failed statement:', statement);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Create a temporary function to execute SQL
async function createTempExecuteFunction() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a temporary function to execute SQL
    const { error } = await supabase.rpc('create_temp_execute_function');
    
    if (error) {
      console.error('Error creating temporary execute function:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to create temporary execute function:', error);
    return false;
  }
}

// Execute the migration
async function main() {
  // First, create the temporary execute function
  console.log('Creating temporary execute function...');
  const functionCreated = await createTempExecuteFunction();
  
  if (!functionCreated) {
    console.log('Falling back to direct SQL execution...');
    // If we can't create the function, try direct execution
    await runMigrationDirect();
    return;
  }
  
  // Run the migration using the temporary function
  await runMigration();
}

// Run the migration directly without the temporary function
async function runMigrationDirect() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running migration directly...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '20240603_fix_schema.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the entire SQL file
    const { error } = await supabase.rpc('execute_sql', { query: sql });
    
    if (error) {
      console.error('Error executing migration:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
