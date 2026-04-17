"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { FileText, User, Lock, Loader2 } from 'lucide-react';
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
      if (!email.includes('@')) {
        email = `${email.toLowerCase().replace(/\s+/g, '_')}@gmail.com`;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      showSuccess("Berhasil masuk");
      navigate('/');
    } catch (error: any) {
      showError("Username/Email atau Password salah");
      console.error(error);
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
          <p className="text-slate-500 text-sm">Masuk dengan Username atau Email</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Username atau email lengkap" 
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

          <div className="mt-4 flex flex-col gap-3 items-center">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline font-medium">
              Lupa Kata Sandi?
            </Link>
            <div className="text-sm text-slate-500">
              Belum punya akun? <Link to="/register" className="text-blue-600 hover:underline font-bold">Daftar Sekarang</Link>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-[10px] text-blue-700 font-medium leading-relaxed text-center">
              Anda bisa masuk menggunakan Username tim atau Email Administrator yang sudah terdaftar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;