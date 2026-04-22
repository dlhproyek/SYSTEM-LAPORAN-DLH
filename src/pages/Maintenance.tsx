"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, RefreshCw, ShieldAlert, CheckCircle2, FileWarning, Loader2, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from "@/components/ui/badge";

const Maintenance = () => {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [orphanedFiles, setOrphanedFiles] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalStorage: 0, usedInDb: 0, orphaned: 0 });
  const [isCleaned, setIsCleaned] = useState(false);

  // Hanya Admin yang bisa akses
  const isAdmin = profile?.role === 'admin' || session?.user?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!isAdmin && session) {
      showError("Akses ditolak. Hanya Admin yang dapat melakukan pemeliharaan.");
      navigate('/');
    }
  }, [isAdmin, session]);

  const analyzeStorage = async () => {
    setAnalyzing(true);
    setIsCleaned(false);
    try {
      // 1. Ambil semua foto yang ada di database (tabel reports)
      const { data: reports, error: dbError } = await supabase
        .from('reports')
        .select('tasks');
      
      if (dbError) throw dbError;

      const usedFileNames = new Set<string>();
      reports?.forEach(report => {
        report.tasks?.forEach((task: any) => {
          ['zero', 'fifty', 'hundred'].forEach(key => {
            const url = task.photos?.[key];
            if (url && url.includes('report-photos/')) {
              const fileName = url.split('report-photos/').pop();
              if (fileName) usedFileNames.add(fileName);
            }
          });
        });
      });

      // 2. Ambil semua file yang ada di Storage Bucket
      const { data: storageFiles, error: storageError } = await supabase
        .storage
        .from('report-photos')
        .list('', { limit: 1000 });

      if (storageError) throw storageError;

      // 3. Bandingkan
      const orphaned = storageFiles?.filter(file => !usedFileNames.has(file.name)) || [];
      
      setOrphanedFiles(orphaned);
      setStats({
        totalStorage: storageFiles?.length || 0,
        usedInDb: usedFileNames.size,
        orphaned: orphaned.length
      });

      showSuccess(`Analisis selesai: Ditemukan ${orphaned.length} file tidak terpakai.`);
    } catch (error: any) {
      console.error(error);
      showError("Gagal menganalisis storage: " + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const cleanStorage = async () => {
    if (orphanedFiles.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${orphanedFiles.length} file secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;

    setLoading(true);
    try {
      const fileNamesToDelete = orphanedFiles.map(f => f.name);
      
      // Supabase storage remove menerima array nama file
      const { error } = await supabase
        .storage
        .from('report-photos')
        .remove(fileNamesToDelete);

      if (error) throw error;

      showSuccess(`${fileNamesToDelete.length} file berhasil dihapus.`);
      setOrphanedFiles([]);
      setStats(prev => ({ ...prev, orphaned: 0 }));
      setIsCleaned(true);
    } catch (error: any) {
      console.error(error);
      showError("Gagal membersihkan storage: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="text-blue-600" /> Pemeliharaan Storage
          </h1>
          <div className="w-20"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-blue-100">
            <CardContent className="pt-6 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total File di Storage</p>
              <p className="text-3xl font-black text-blue-600">{stats.totalStorage}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-green-100">
            <CardContent className="pt-6 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Foto Terhubung (Aktif)</p>
              <p className="text-3xl font-black text-green-600">{stats.usedInDb}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-red-100">
            <CardContent className="pt-6 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Foto Tidak Terpakai</p>
              <p className="text-3xl font-black text-red-600">{stats.orphaned}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="text-amber-500" /> Analisis Keamanan Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <p className="font-bold mb-1">Cara Kerja:</p>
              <p>Sistem akan membandingkan nama file di Storage dengan URL foto yang tersimpan di database laporan. File yang tidak ditemukan referensinya di database akan dianggap sebagai "sampah" dan aman untuk dihapus.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={analyzeStorage} 
                disabled={analyzing || loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menganalisis...</> : <><RefreshCw className="mr-2 h-4 w-4" /> Mulai Analisis</>}
              </Button>

              {orphanedFiles.length > 0 && (
                <Button 
                  onClick={cleanStorage} 
                  disabled={loading}
                  variant="destructive"
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...</> : <><Trash2 className="mr-2 h-4 w-4" /> Hapus {orphanedFiles.length} File Sampah</>}
                </Button>
              )}
            </div>

            {isCleaned && (
              <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 p-4 rounded-lg border border-green-200">
                <CheckCircle2 className="h-5 w-5" /> Storage sudah bersih dan optimal!
              </div>
            )}

            {orphanedFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <FileWarning className="text-red-500 h-4 w-4" /> Daftar File Tidak Terpakai:
                </h3>
                <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y bg-slate-50">
                  {orphanedFiles.map((file, i) => (
                    <div key={i} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600">{file.name}</span>
                      <Badge variant="outline" className="text-[10px]">{Math.round(file.metadata?.size / 1024)} KB</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Maintenance;