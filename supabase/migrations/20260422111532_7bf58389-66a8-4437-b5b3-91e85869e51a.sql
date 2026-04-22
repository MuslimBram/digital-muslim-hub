-- Move pgvector from public to dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Make sure the extensions schema is in the search path so vector type resolves
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;