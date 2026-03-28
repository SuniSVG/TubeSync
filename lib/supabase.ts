import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pspbqpqmtsedcvzajspq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcGJxcHFtdHNlZGN2emFqc3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjIwMjIsImV4cCI6MjA4OTkzODAyMn0.fAcm3NgypmoTlV8fR-uRS4Jw3upgEHnW1ehxzuzOD5Y';

export const supabase = createClient(supabaseUrl, supabaseKey);

