-- Query to examine the structure of auth.users table
SELECT id, email, raw_user_meta_data 
FROM auth.users 
LIMIT 5;

-- Check if raw_user_meta_data is accessible and has the expected structure
SELECT 
  id, 
  email, 
  raw_user_meta_data,
  raw_user_meta_data->>'name' as extracted_name,
  raw_user_meta_data->>'phone' as extracted_phone
FROM auth.users 
LIMIT 5;
