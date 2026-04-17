"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { FileText, User, Lock, Loader2, Info } from 'lucide-react';
import { showError, showSuccess } from '../utils/toast';

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (session) navigate('/');
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showError("Username/Email dan Password harus diisi");
      return;
    }

    setLoading(true);
    try {
      let email = username.trim();
      // Jika tidak ada '@', otomatis tambah @dlh.id (untuk tim lapangan)
      if (!email.includes('@')) {
        email = `${email.toLowerCase().replace(/\s+/g, '_')}@dlh.id`;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      showSuccess("Berhasil masuk");
      navigate('/');
    } catch (error: any) {
      showError("Gagal masuk. Periksa kembali Username/Email dan Password.");
      console.error("Login error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-blue-600 p-3 rounded-2xl w-fit">
            <FileText className="text-white h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Sistem Laporan DLH</CardTitle>
          <p className="text-slate-500 text-sm">Masuk ke akun Anda</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Contoh: tim_babat atau email@gmail.com" 
                  className="pl-10 h-11"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  className="pl-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-bold"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Masuk Sekarang"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">Informasi Login:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li><strong>Tim Lapangan:</strong> Cukup ketik username (otomatis menggunakan @dlh.id).</li>
                <li><strong>Admin/Gmail:</strong> Wajib mengetik email lengkap (contoh: nama@gmail.com).</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;