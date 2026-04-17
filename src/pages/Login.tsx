"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, User } from 'lucide-react';
import { showError } from '@/utils/toast';

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showError("Username dan Password wajib diisi");
      return;
    }

    setLoading(true);
    try {
      // Otomatis menambahkan @gmail.com di belakang username
      const email = username.includes('@') ? username : `${username}@gmail.com`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Navigasi akan ditangani oleh useEffect saat session berubah
    } catch (error: any) {
      console.error("Login error:", error);
      showError(error.message === "Invalid login credentials" 
        ? "Username atau Password salah" 
        : "Gagal masuk ke sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img 
              src="/logo-dlh.png" 
              alt="Logo Dinas Lingkungan Hidup Kota Medan" 
              className="h-28 w-28 object-contain mx-auto drop-shadow-sm"
              onError={(e) => {
                // Fallback jika gambar belum diunggah
                e.currentTarget.src = "https://pasted-image-2026-04-17T07-29-39-497Z.png";
              }}
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-bold leading-tight">
              Sistem Laporan Wilayah Medan Kota
            </CardTitle>
            <p className="text-sm md:text-base font-semibold text-blue-700">
              Dinas Lingkungan Hidup Kota Medan
            </p>
          </div>
          <p className="text-slate-500 text-xs mt-2">Silakan masuk untuk mengelola laporan</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Ketik username Anda"
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Ketik kata sandi"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold mt-2"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
              <strong>Catatan:</strong> Masukkan username yang telah didaftarkan oleh Admin. Sistem akan otomatis mengenali akun Anda.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;