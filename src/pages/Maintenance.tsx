"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Trash2, RefreshCw, ShieldAlert, 
  CheckCircle2, FileWarning, Loader2, Database, 
  Eye, HardDrive, AlertTriangle, Users, Info, Clock, Zap, Activity,
  CalendarDays, BarChart3, TrendingUp, Globe, Cpu, ArrowUpCircle,
  ExternalLink, BarChart, Calendar, PowerOff, BellRing
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserManagement from '@/components/UserManagement';
import { isSameDay, isSameMonth, parseISO } from 'date-fns';

const Maintenance = () => {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [orphanedFiles, setOrphanedFiles] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalStorageCount: 0, 
    totalStorageSize: 0, 
    usedInDb: 0, 
    orphaned: 0,
    dbRecordCount: 0,
    reportsToday: 0,
    reportsThisMonth: 0,
    photosToday: 0,
    photosThisMonth: 0
  });
  const [isCleaned, setIsCleaned] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB Supabase
  const VERCEL_BANDWIDTH_LIMIT = 100 * 1024 * 1024 * 1024; // 100GB Vercel
  
  const isAdmin = profile?.role === 'admin' || session?.user?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!isAdmin && session) {
      showError("Akses ditolak. Hanya Admin yang dapat melakukan pemeliharaan.");
      navigate('/');
    }
  }, [isAdmin, session]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const analyzeStorage = async () => {
    setAnalyzing(true);
    setIsCleaned(false);
    try {
      const now = new Date();
      
      const { data: reports, error: dbError, count: reportCount } = await supabase
        .from('reports')
        .select('tasks, date, createdAt', { count: 'exact' });
      
      if (dbError) throw dbError;

      const usedFileNames = new Set<string>();
      let reportsToday = 0;
      let reportsThisMonth = 0;
      let photosToday = 0;
      let photosThisMonth = 0;

      reports?.forEach(report => {
        const reportDate = parseISO(report.date);

        if (isSameDay(reportDate, now)) reportsToday++;
        if (isSameMonth(reportDate, now)) reportsThisMonth++;

        report.tasks?.forEach((task: any) => {
          let taskPhotoCount = 0;
          ['zero', 'fifty', 'hundred'].forEach(key => {
            const url = task.photos?.[key];
            if (url && url.includes('report-photos/')) {
              taskPhotoCount++;
              const fileName = url.split('report-photos/').pop();
              if (fileName) usedFileNames.add(fileName);
            }
          });

          if (isSameDay(reportDate, now)) photosToday += taskPhotoCount;
          if (isSameMonth(reportDate, now)) photosThisMonth += taskPhotoCount;
        });
      });

      const { data: storageFiles, error: storageError } = await supabase
        .storage
        .from('report-photos')
        .list('', { limit: 1000 });

      if (storageError) throw storageError;

      let totalSize = 0;
      storageFiles?.forEach(file => {
        totalSize += file.metadata?.size || 0;
      });

      const orphaned = storageFiles?.filter(file => !usedFileNames.has(file.name)) || [];
      
      setOrphanedFiles(orphaned);
      setStats({
        totalStorageCount: storageFiles?.length || 0,
        totalStorageSize: totalSize,
        usedInDb: usedFileNames.size,
        orphaned: orphaned.length,
        dbRecordCount: reportCount || 0,
        reportsToday,
        reportsThisMonth,
        photosToday,
        photosThisMonth
      });

      showSuccess(`Analisis selesai: Data penggunaan telah diperbarui.`);
    } catch (error: any) {
      console.error(error);
      showError("Gagal menganalisis sistem: " + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePreview = (fileName: string) => {
    const { data } = supabase.storage.from('report-photos').getPublicUrl(fileName);
    setPreviewUrl(data.publicUrl);
    setPreviewName(fileName);
  };

  const cleanStorage = async () => {
    if (orphanedFiles.length === 0) return;
    if (!confirm(`Hapus ${orphanedFiles.length} file sampah secara permanen?`)) return;

    setLoading(true);
    try {
      const fileNamesToDelete = orphanedFiles.map(f => f.name);
      const { error } = await supabase
        .storage
        .from('report-photos')
        .remove(fileNamesToDelete);

      if (error) throw error;

      showSuccess(`${fileNamesToDelete.length} file berhasil dihapus.`);
      await analyzeStorage();
      setIsCleaned(true);
    } catch (error: any) {
      console.error(error);
      showError("Gagal membersihkan storage: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const storageUsagePercent = (stats.totalStorageSize / STORAGE_LIMIT_BYTES) * 100;
  
  // Estimasi Bandwidth Vercel: (Total Ukuran Foto * Rata-rata 10x View per bulan) + Overhead API
  const estimatedBandwidthUsed = (stats.totalStorageSize * 10) + (stats.dbRecordCount * 1024 * 50);
  const bandwidthUsagePercent = (estimatedBandwidthUsed / VERCEL_BANDWIDTH_LIMIT) * 100;

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="text-blue-600" /> Pemeliharaan Sistem
          </h1>
          <Button onClick={analyzeStorage} disabled={analyzing} variant="outline" className="bg-white border-blue-200 text-blue-600">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} 
            Refresh Data
          </Button>
        </div>

        <Tabs defaultValue="storage" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-white border shadow-sm p-1">
            <TabsTrigger value="storage" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2">
              <HardDrive size={16} /> Storage & Kuota
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2">
              <Users size={16} /> Manajemen Pengguna
            </TabsTrigger>
          </TabsList>

          <TabsContent value="storage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white border-l-4 border-l-blue-600 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700">
                    <TrendingUp size={16} /> Aktivitas Hari Ini
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Laporan Baru</p>
                      <p className="text-2xl font-black text-slate-900">{stats.reportsToday}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Foto Diunggah</p>
                      <p className="text-2xl font-black text-slate-900">{stats.photosToday}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-purple-600 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-700">
                    <BarChart3 size={16} /> Aktivitas Bulan Ini
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Total Laporan</p>
                      <p className="text-2xl font-black text-slate-900">{stats.reportsThisMonth}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Total Foto</p>
                      <p className="text-2xl font-black text-slate-900">{stats.photosThisMonth}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={cn("bg-white border-t-4", storageUsagePercent > 80 ? "border-t-red-500" : "border-t-blue-500")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-blue-500" /> Kapasitas Storage (Supabase)</span>
                    <Badge variant={storageUsagePercent > 80 ? "destructive" : "outline"}>{storageUsagePercent.toFixed(1)}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={storageUsagePercent} className={cn("h-2", storageUsagePercent > 80 ? "bg-red-100" : "bg-blue-100")} />
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <span>Terpakai: {formatSize(stats.totalStorageSize)}</span>
                    <span>Limit: 1 GB</span>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn("bg-white border-t-4", bandwidthUsagePercent > 80 ? "border-t-red-500" : "border-t-blue-500")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> Estimasi Bandwidth (Vercel)</span>
                    <Badge variant={bandwidthUsagePercent > 80 ? "destructive" : "outline"}>{bandwidthUsagePercent.toFixed(1)}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={bandwidthUsagePercent} className={cn("h-2", bandwidthUsagePercent > 80 ? "bg-red-100" : "bg-blue-100")} />
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                    <span>Estimasi: {formatSize(estimatedBandwidthUsed)}</span>
                    <span>Limit: 100 GB</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informasi Batasan Supabase */}
              <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-700">
                    <Info className="h-5 w-5" /> Batasan Supabase (Free Tier)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-100 p-2 rounded-lg shrink-0"><Zap className="h-4 w-4 text-amber-600" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Transfer Data (Egress)</p>
                        <p className="text-sm font-medium">Limit: 2 GB / Bulan</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-100 p-2 rounded-lg shrink-0"><Calendar className="h-4 w-4 text-amber-600" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Masa Aktif Database</p>
                        <p className="text-sm font-medium">Pause otomatis setelah 7 hari inaktif</p>
                        <p className="text-[10px] text-slate-400 italic">* Inaktif = Tidak ada akses API/Login sama sekali.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-100 p-2 rounded-lg shrink-0"><Activity className="h-4 w-4 text-amber-600" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Pengguna Aktif (MAU)</p>
                        <p className="text-sm font-medium">Limit: 50.000 Pengguna / Bulan</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informasi Batasan Vercel */}
              <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-700">
                    <Globe className="h-5 w-5" /> Batasan Vercel (Hobby Plan)
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-blue-600" asChild>
                    <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">
                      Dashboard Vercel <ExternalLink size={10} className="ml-1" />
                    </a>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg shrink-0"><Calendar className="h-4 w-4 text-blue-600" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Masa Aktif Hosting</p>
                        <p className="text-sm font-medium">Selamanya (Tanpa Kedaluwarsa)</p>
                        <p className="text-[10px] text-slate-400 italic">* Kuota Bandwidth direset setiap tanggal 1.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg shrink-0"><ArrowUpCircle className="h-4 w-4 text-blue-600" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Bandwidth</p>
                        <p className="text-sm font-medium">Limit: 100 GB / Bulan</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg shrink-0"><Cpu className="h-4 w-4 text-blue-600" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Build Minutes</p>
                        <p className="text-sm font-medium">Limit: 6.000 Menit / Bulan</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-green-50 border-l-4 border-l-green-600 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-700">
                  <BellRing size={16} /> Tips: Agar Database Tidak Pernah Mati (Keep-Alive)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-green-800 space-y-3">
                <p>Supabase akan menonaktifkan database jika tidak ada aktivitas selama 7 hari. Untuk mencegahnya:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Gunakan layanan gratis seperti <strong>UptimeRobot</strong> atau <strong>Cron-job.org</strong>.</li>
                  <li>Masukkan URL website Anda (Vercel) ke layanan tersebut.</li>
                  <li>Atur pengecekan (ping) setiap 24 jam sekali.</li>
                  <li>Sistem akan otomatis "membangunkan" database Anda setiap hari sehingga tidak akan pernah di-pause.</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-l-4 border-l-red-600 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                  <PowerOff size={16} /> Apa yang terjadi jika Supabase Nonaktif (Paused)?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-red-800 space-y-2">
                <p>Jika database di-pause oleh Supabase karena inaktivitas:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Aplikasi di Vercel <strong>tetap bisa dibuka</strong> (tampilan muncul).</li>
                  <li>Namun, <strong>data laporan tidak akan muncul</strong> (kosong/error).</li>
                  <li>Fitur <strong>Login akan gagal</strong>.</li>
                  <li>Foto-foto di laporan tidak akan tampil.</li>
                </ul>
                <p className="font-bold mt-2 italic">Solusi: Masuk ke Dashboard Supabase dan klik "Resume Project".</p>
              </CardContent>
            </Card>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2 text-amber-800 text-[11px] font-medium">
              <AlertTriangle size={14} className="shrink-0" />
              PENTING: Statistik Vercel di atas adalah **estimasi**. Silakan cek Dashboard Vercel untuk data penggunaan yang akurat.
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
                  <p>Sistem akan membandingkan nama file di Storage dengan URL foto yang tersimpan di database laporan. File yang tidak ditemukan referensinya akan dianggap sebagai "sampah".</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={analyzeStorage} disabled={analyzing || loading} className="bg-blue-600 hover:bg-blue-700">
                    {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menganalisis...</> : <><RefreshCw className="mr-2 h-4 w-4" /> Mulai Analisis</>}
                  </Button>
                  {orphanedFiles.length > 0 && (
                    <Button onClick={cleanStorage} disabled={loading} variant="destructive">
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
                    <div className="max-h-[400px] overflow-y-auto border rounded-lg divide-y bg-slate-50">
                      {orphanedFiles.map((file, i) => (
                        <div key={i} className="p-3 flex items-center justify-between text-xs hover:bg-blue-50 cursor-pointer transition-colors group" onClick={() => handlePreview(file.name)}>
                          <div className="flex items-center gap-2">
                            <Eye className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
                            <span className="font-mono text-slate-600 group-hover:text-blue-700 group-hover:font-bold">{file.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{formatSize(file.metadata?.size || 0)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="shadow-md border-t-4 border-t-blue-600">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="text-blue-600" /> Manajemen Pengguna & Hak Akses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-white border-b">
            <DialogTitle className="text-sm truncate pr-8">{previewName}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-[2.26/2.95] w-full flex items-center justify-center bg-slate-900">
            {previewUrl && <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />}
          </div>
          <div className="p-4 bg-white flex justify-end">
            <Button variant="outline" onClick={() => setPreviewUrl(null)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;