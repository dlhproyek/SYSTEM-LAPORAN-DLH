"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Trash2, RefreshCw, ShieldAlert, 
  Loader2, Database, Users, History,
  FileText, ClipboardList, Pencil, PlusCircle,
  RotateCcw, AlertTriangle, HardDrive, TrendingUp, BarChart3, Eye, Info, X,
  Zap, Activity
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
import { auditLogService } from '@/services/auditLogService';
import { reportService } from '@/services/reportService';
import { workPlanService } from '@/services/workPlanService';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const Maintenance = () => {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [orphanedFiles, setOrphanedFiles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [deletedReports, setDeletedReports] = useState<any[]>([]);
  const [deletedWorkPlans, setDeletedWorkPlans] = useState<any[]>([]);
  
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
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB
  const isAdmin = profile?.role === 'admin' || session?.user?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!isAdmin && session) {
      showError("Akses ditolak.");
      navigate('/');
    } else {
      fetchData();
    }
  }, [isAdmin, session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, delReports, delPlans] = await Promise.all([
        auditLogService.getLogs(),
        reportService.getAllReports('semua', true),
        workPlanService.getAllWorkPlans('semua', true)
      ]);
      setLogs(logsData);
      setDeletedReports(delReports);
      setDeletedWorkPlans(delPlans);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (type: 'REPORT' | 'WORK_PLAN', id: string) => {
    try {
      if (type === 'REPORT') await reportService.restoreReport(id);
      else await workPlanService.restoreWorkPlan(id);
      
      showSuccess("Data berhasil dipulihkan");
      fetchData();
    } catch (e) {
      showError("Gagal memulihkan data");
    }
  };

  const handlePermanentDelete = async (type: 'REPORT' | 'WORK_PLAN', id: string) => {
    if (!confirm("Hapus permanen? Data tidak bisa dikembalikan lagi.")) return;
    try {
      if (type === 'REPORT') await reportService.hardDeleteReport(id);
      else await workPlanService.hardDeleteWorkPlan(id);
      
      showSuccess("Data dihapus permanen");
      fetchData();
    } catch (e) {
      showError("Gagal menghapus permanen");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const analyzeStorage = async () => {
    setAnalyzing(true);
    try {
      const now = new Date();
      const { data: reports, error: dbError } = await supabase
        .from('reports')
        .select('tasks, date, createdAt');
      
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

      const { data: storageFiles, error: storageError } = await supabase.storage.from('report-photos').list('', { limit: 5000 });
      if (storageError) throw storageError;

      let totalSize = 0;
      storageFiles?.forEach(file => { totalSize += file.metadata?.size || 0; });
      
      const orphaned = storageFiles?.filter(file => !usedFileNames.has(file.name)) || [];
      
      setOrphanedFiles(orphaned);
      setStats({
        totalStorageCount: storageFiles?.length || 0,
        totalStorageSize: totalSize,
        usedInDb: usedFileNames.size,
        orphaned: orphaned.length,
        dbRecordCount: reports?.length || 0,
        reportsToday,
        reportsThisMonth,
        photosToday,
        photosThisMonth
      });
      showSuccess(`Analisis selesai. Ditemukan ${orphaned.length} file tidak terpakai.`);
    } catch (error: any) {
      showError("Gagal menganalisis: " + error.message);
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
    if (!confirm(`Hapus ${orphanedFiles.length} file sampah? Tindakan ini tidak dapat dibatalkan.`)) return;
    setLoading(true);
    try {
      const fileNamesToDelete = orphanedFiles.map(f => f.name);
      const { error } = await supabase.storage.from('report-photos').remove(fileNamesToDelete);
      if (error) throw error;
      showSuccess(`${fileNamesToDelete.length} file berhasil dibersihkan.`);
      await analyzeStorage();
    } catch (error: any) {
      showError("Gagal membersihkan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const storageUsagePercent = (stats.totalStorageSize / STORAGE_LIMIT_BYTES) * 100;

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="text-blue-600" /> Pemeliharaan Sistem</h1>
          <Button onClick={fetchData} disabled={loading} variant="outline" className="bg-white border-blue-200 text-blue-600">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} Refresh
          </Button>
        </div>

        <Tabs defaultValue="storage" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-12 bg-white border shadow-sm p-1">
            <TabsTrigger value="storage" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"><HardDrive size={16} /> Storage</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"><Users size={16} /> Pengguna</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"><History size={16} /> Riwayat</TabsTrigger>
            <TabsTrigger value="trash" className="data-[state=active]:bg-red-600 data-[state=active]:text-white flex items-center gap-2"><Trash2 size={16} /> Tempat Sampah</TabsTrigger>
          </TabsList>

          <TabsContent value="storage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-l-4 border-l-blue-600 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700"><TrendingUp size={16} /> Aktivitas Hari Ini</CardTitle></CardHeader>
                <CardContent><div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] font-bold uppercase text-slate-400">Laporan Baru</p><p className="text-2xl font-black text-slate-900">{stats.reportsToday}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Foto Diunggah</p><p className="text-2xl font-black text-slate-900">{stats.photosToday}</p></div></div></CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-purple-600 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-700"><BarChart3 size={16} /> Aktivitas Bulan Ini</CardTitle></CardHeader>
                <CardContent><div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] font-bold uppercase text-slate-400">Total Laporan</p><p className="text-2xl font-black text-slate-900">{stats.reportsThisMonth}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Total Foto</p><p className="text-2xl font-black text-slate-900">{stats.photosThisMonth}</p></div></div></CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700"><Zap size={16} /> Info Limit Gratis</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Database:</span><span className="font-bold">500 MB</span></div>
                  <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Bandwidth:</span><span className="font-bold">2 GB / bln</span></div>
                  <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Edge Func:</span><span className="font-bold">500k / bln</span></div>
                </CardContent>
              </Card>
            </div>

            <Card className={cn("bg-white border-t-4", storageUsagePercent > 80 ? "border-t-red-500" : "border-t-blue-500")}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center justify-between"><span className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-blue-500" /> Kapasitas File Storage (Foto)</span><Badge variant={storageUsagePercent > 80 ? "destructive" : "outline"}>{storageUsagePercent.toFixed(1)}%</Badge></CardTitle></CardHeader>
              <CardContent className="space-y-3"><Progress value={storageUsagePercent} className="h-2" /><div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase"><span>Terpakai: {formatSize(stats.totalStorageSize)}</span><span>Limit Gratis: 1 GB</span></div></CardContent>
            </Card>

            <Card className="shadow-md border-t-4 border-t-blue-600">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ShieldAlert className="text-amber-500" /> Analisis Keamanan Storage</CardTitle>
                <p className="text-xs text-slate-500">Sistem akan membandingkan file di Storage dengan data di Database. File yang tidak memiliki referensi di database dianggap sebagai file sampah.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <Button onClick={analyzeStorage} disabled={analyzing || loading} className="bg-blue-600">{analyzing ? "Menganalisis..." : "Mulai Analisis"}</Button>
                  {orphanedFiles.length > 0 && <Button onClick={cleanStorage} disabled={loading} variant="destructive">Hapus {orphanedFiles.length} File Sampah</Button>}
                </div>

                {orphanedFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3 text-amber-800 text-xs">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <p><strong>Mengapa file ini ada?</strong> File sampah biasanya berasal dari foto yang diganti saat edit laporan, laporan yang dihapus permanen, atau kegagalan koneksi saat proses unggah. Klik nama file untuk melihat isinya.</p>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto border rounded-lg divide-y bg-slate-50">
                      {orphanedFiles.map((file, i) => (
                        <div 
                          key={i} 
                          className="p-3 flex items-center justify-between text-xs hover:bg-blue-50 cursor-pointer transition-colors group"
                          onClick={() => handlePreview(file.name)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-slate-200 rounded flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500">
                              <Eye size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">{file.name}</span>
                              <span className="text-[10px] text-slate-400">Klik untuk preview</span>
                            </div>
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

          <TabsContent value="users"><Card className="shadow-md border-t-4 border-t-blue-600"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="text-blue-600" /> Manajemen Pengguna</CardTitle></CardHeader><CardContent><UserManagement /></CardContent></Card></TabsContent>

          <TabsContent value="history">
            <Card className="shadow-md border-t-4 border-t-blue-600">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><History className="text-blue-600" /> Riwayat Aktivitas Pengguna</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">Pengguna</th>
                        <th className="px-4 py-3">Aksi</th>
                        <th className="px-4 py-3">Entitas</th>
                        <th className="px-4 py-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.length > 0 ? logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">{format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: localeId })}</td>
                          <td className="px-4 py-3 font-medium">{log.username || "System"}</td>
                          <td className="px-4 py-3">
                            <Badge className={cn(
                              "text-[9px] font-bold",
                              log.action === 'DELETE' ? "bg-red-100 text-red-700" : 
                              log.action === 'UPDATE' ? "bg-amber-100 text-amber-700" : 
                              "bg-green-100 text-green-700"
                            )}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                              {log.entity_type === 'REPORT' ? <FileText size={12} className="text-blue-500" /> : <ClipboardList size={12} className="text-green-500" />}
                              {log.entity_type}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-600 italic">{log.details?.title || log.details?.description || "-"}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">Belum ada riwayat aktivitas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trash">
            <div className="space-y-6">
              <Card className="shadow-md border-t-4 border-t-red-600">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-700"><FileText size={20} /> Laporan Terhapus</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Tanggal Laporan</th>
                          <th className="px-4 py-3">Uraian</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {deletedReports.length > 0 ? deletedReports.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">{r.date}</td>
                            <td className="px-4 py-3 font-medium">{r.description}</td>
                            <td className="px-4 py-3"><Badge variant="outline">{r.category}</Badge></td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => handleRestore('REPORT', r.id)}><RotateCcw size={14} className="mr-1" /> Pulihkan</Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handlePermanentDelete('REPORT', r.id)}><Trash2 size={14} /></Button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic">Tempat sampah laporan kosong</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-t-4 border-t-red-600">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-700"><ClipboardList size={20} /> Rencana Kerja Terhapus</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Tanggal Rencana</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Jumlah Lokasi</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {deletedWorkPlans.length > 0 ? deletedWorkPlans.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">{p.date}</td>
                            <td className="px-4 py-3 font-medium">{p.category}</td>
                            <td className="px-4 py-3">{p.items?.length || 0} Lokasi</td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => handleRestore('WORK_PLAN', p.id)}><RotateCcw size={14} className="mr-1" /> Pulihkan</Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handlePermanentDelete('WORK_PLAN', p.id)}><Trash2 size={14} /></Button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic">Tempat sampah rencana kerja kosong</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Preview Gambar */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-black/95 border-none">
          <DialogHeader className="p-4 bg-white/10 backdrop-blur text-white flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm font-medium truncate pr-4">{previewName}</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setPreviewUrl(null)}>
              <X size={18} />
            </Button>
          </DialogHeader>
          <div className="aspect-square w-full flex items-center justify-center p-4">
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
              />
            )}
          </div>
          <div className="p-4 bg-white/10 backdrop-blur text-center">
            <p className="text-[10px] text-white/60 uppercase font-bold tracking-widest">Verifikasi File Sampah</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;