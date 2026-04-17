import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ffgksqjznamthsdbkstu.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2tzcWp6bmFtdGhzZGJrc3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTc0NjEsImV4cCI6MjA5MTc3MzQ2MX0.4Go520hgy0N_GB9pppoGloj6JQtOpTtdjxfLqiLIFpg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);