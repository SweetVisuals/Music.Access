-- DEBUG: List all tables in the public schema
-- Run this to verify the correct table names

SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
