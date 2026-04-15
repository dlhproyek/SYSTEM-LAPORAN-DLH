import { createClient } from '@supabase/supabase-js';

// Mengambil variabel dari environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validasi sederhana untuk mencegah error 'supabaseUrl is required'
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "PERINGATAN: Supabase URL atau Anon Key belum terkonfigurasi. " +
    "Pastikan integrasi Supabase sudah aktif dan coba klik tombol 'Restart' di atas chat."
  );
}

// Inisialisasi hanya jika variabel tersedia, jika tidak gunakan string kosong 
// (Supabase akan memberikan error yang lebih bersahabat saat dipanggil nanti)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);