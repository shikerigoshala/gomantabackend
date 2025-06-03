# Supabase Setup Instructions

This document provides instructions for setting up the Supabase database for the donation system.

## Prerequisites

1. A Supabase account (sign up at [https://supabase.com](https://supabase.com))
2. A Supabase project created

## Setup Steps

### 1. Create Tables and Functions

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor section
3. Copy the contents of `schema.sql` from this directory
4. Paste it into a new SQL query in the Supabase SQL Editor
5. Run the query to create all necessary tables, indexes, and functions

### 2. Configure RLS (Row Level Security)

The SQL script already includes Row Level Security policies, but you should verify they are working:

1. Go to the Authentication → Policies section in your Supabase dashboard
2. Ensure that RLS is enabled for both the `users` and `donations` tables
3. Verify that the policies have been created as specified in the SQL script

### 3. Update Environment Variables

Make sure your application is configured with the correct Supabase URL and API key:

1. Go to Project Settings → API in your Supabase dashboard
2. Copy the URL and anon/public API key
3. Update the values in `server/config/supabase.js` and `src/services/supabase.js`

## Table Structure

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | User's email (unique) |
| name | TEXT | User's full name |
| phone | TEXT | User's phone number |
| address | TEXT | User's address |
| city | TEXT | User's city |
| state | TEXT | User's state |
| country | TEXT | User's country (default: India) |
| pincode | TEXT | User's postal code |
| pan | TEXT | User's PAN (Permanent Account Number) |
| created_at | TIMESTAMP | When the user was created |
| updated_at | TIMESTAMP | When the user was last updated |
| last_login_at | TIMESTAMP | When the user last logged in |

### Donations Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | ID of the user (or 'GUEST') |
| type | TEXT | Type of donation (individual, family, etc.) |
| amount | NUMERIC | Donation amount |
| frequency | TEXT | Donation frequency (yearly, monthly, etc.) |
| status | TEXT | Payment status (pending, completed, failed) |
| payment_id | TEXT | External payment transaction ID |
| payment_url | TEXT | URL for payment processing |
| donor_info | JSONB | JSON with donor information |
| family_info | JSONB | JSON with family information (if applicable) |
| payment_details | JSONB | JSON with payment details |
| created_at | TIMESTAMP | When the donation was created |
| updated_at | TIMESTAMP | When the donation was last updated |

## Automatic Triggers

The schema includes two automatic triggers:

1. **on_auth_user_created**: Creates a user record when a new authentication user is created
2. **link_guest_donations**: Links any guest donations to a user when they create an account with the same email

## Testing

After setting up the database, you can test it by:

1. Making a donation as a guest
2. Creating an account with the same email
3. Verifying that the donation is now linked to your account
