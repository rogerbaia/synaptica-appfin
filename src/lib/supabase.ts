import { createClient } from '@supabase/supabase-js';

// Hardcoded for now to match legacy db.js and avoid gitignore issues with .env.local
// In a production environment, these should be moved to environment variables.
const SUPABASE_URL = "https://hmhyihenczvkeqmptxsh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaHlpaGVuY3p2a2VxbXB0eHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzM1MzIsImV4cCI6MjA4MjIwOTUzMn0._2AgnDWS3eeYsXanCMAXSSpTIAZtjmXKTENNgFC7zh4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});
