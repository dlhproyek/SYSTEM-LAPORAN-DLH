"use client";

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { UserPlus, User, Lock, Loader2, Tag, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { showError, showSuccess } from '../utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const categories = ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"];

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    category: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.category) {
      showError("Semua kolom harus diisi");
      return;
    }

    setLoading(true);
    try {
      const email = `${formData.username.toLowerCase().replace(/\s+/g, '_')}@gmail.com`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            category: formData.category,
            role: 'user'
          }
        }
      });

      if (error) throw error;
      
      showSuccess("Pendaftaran berhasil! Silakan masuk.");
      navigate('/login');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-green-600">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-green-600 p-3 rounded-2xl w-fit">
            <UserPlus className="text-white h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Daftar Akun Baru</CardTitle>
          <p className="text-slate-500 text-sm">Lengkapi data tim Anda untuk mendaftar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Username Tim</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Contoh: tim_babat_a" 
                  className="pl-10 h-11"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Kategori / Tim</label>
              <Select onValueChange={(val) => setFormData({...formData, category: val})} disabled={loading}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 karakter" 
                  className="pl-10 pr-10 h-11"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 h-11 text-base font-bold"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Daftar Sekarang"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;