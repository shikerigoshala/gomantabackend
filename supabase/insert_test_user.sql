-- SQL query to insert a test user into the users table
INSERT INTO users (
  email,
  name,
  phone,
  created_at
)
VALUES (
  'test@example.com',
  'Test User',
  '1234567890',
  NOW()
)
RETURNING *;

-- Alternative query using the auth.users table first (which triggers the handle_new_user function)
-- This is closer to how Supabase auth actually works
/*
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at
)
VALUES (
  'test2@example.com',
  'some_encrypted_password_hash',
  NOW()
)
RETURNING *;
*/
