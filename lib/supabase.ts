import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djblynczvbdrzdugodjr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqYmx5bmN6dmJkcnpkdWdvZGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwNjA4NDEsImV4cCI6MjExMDYzNjg0MX0.z6qsWalDJyPLdKxciTdWZjpEN4mUIx_HRcRKzfp-pxY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)