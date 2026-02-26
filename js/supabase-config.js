const SUPABASE_URL = 'https://mlcylqxuoemcaeanbqni.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sY3lscXh1b2VtY2FlYW5icW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTkzMTQsImV4cCI6MjA4NzYzNTMxNH0.Pp2JKyZg0dOkePDEWRo9wOdIGsCJWLm6kxB-cUkRvDg';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
