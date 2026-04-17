"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-blue-600 p-3 rounded-2xl w-fit">
            <FileText className="text-white h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Sistem Laporan DLH</CardTitle>
          <p className="text-slate-500 text-sm">Silakan masuk untuk mengelola laporan</p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                  }
                }
              }
            }}
            providers={[]}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Kata Sandi',
                  button_label: 'Masuk',
                  loading_button_label: 'Masuk...',
                  email_input_placeholder: 'Alamat email Anda',
                  password_input_placeholder: 'Kata sandi Anda',
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Kata Sandi',
                  button_label: 'Daftar',
                  loading_button_label: 'Mendaftar...',
                }
              }
            }}
          />
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
              <strong>Catatan:</strong> Jika Anda mendaftar akun baru, hubungi Administrator untuk mengatur peran (Admin/User) dan Kategori Tim Anda di database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;