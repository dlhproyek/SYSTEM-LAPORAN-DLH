"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, FileText, MapPin, Calendar, 
  Trash2, Eye, Search, Edit, Cloud, Printer, FileBarChart,
  LogOut, LogIn, FilterX, ShieldCheck, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError } from '@/utils/toast';
import { reportService } from '@/services/reportService';
import { useAuth } from '@/context/AuthContext';
import { getUnitByCategory } from '@/utils/report-helpers';
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories: string[] = [
  "semua", "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
];

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const Index = () => {
  const navigate = useNavigate();
  const { session, profile, signOut, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedMonth, setSelectedMonth] = useState("semua");
  const [selectedYear, setSelectedYear] = useState("semua");
  const [selectedCategory, setSelectedCategory] = useState("semua");
  
  const [selectedPrintCategory, setSelectedPrintCategory] = useState("semua");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const isLoggedIn = !!session;
  const isPimpinan = profile?.role === 'pimpinan' || (session?.user?.email === 'pimpinan@gmail.com');
  const isAdmin = profile?.role === 'admin' || (session?.user?.email === 'admin@gmail.com');
  const isUserRestricted = isLoggedIn && profile?.role === 'user' && !isPimpinan;

  useEffect(() => {
    loadReports();
    if (isUserRestricted && profile?.category) {
      setSelectedCategory(profile.category);
      setSelectedPrintCategory(profile.category);
    }
  }, [profile, isLoggedIn]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await reportService.getAllReports();
      setReports(data);
    } catch (error) {
      console.error(error);
      showError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      try {
        await signOut();
        showSuccess("Berhasil keluar");
      } catch (error) {
        showError("Gagal keluar");
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isPimpinan) {
      showError("Akun Pimpinan tidak memiliki izin untuk menghapus data");
      return;
    }
    if (window.confirm("Hapus laporan ini secara permanen?")) {
      try {
        await reportService.deleteReport(id);
        setReports(reports.filter(r => r.id !== id));
        showSuccess("Laporan dihapus");
      } catch (error) {
        showError("Gagal menghapus");
      }
    }
  };

  const resetFilters = () => {
    setSelectedMonth("semua");
    setSelectedYear("semua");
    setSelectedCategory(isUserRestricted ? (profile?.category || "semua") : "semua");
    setSearchQuery("");
  };

  const filteredReports = reports.filter(report => {
    const search = searchQuery.toLowerCase();
    const reportDate = new Date(report.date);
    const m = (reportDate.getMonth() + 1).toString();
    const y = reportDate.getFullYear().toString();

    const matchSearch = report.description.toLowerCase().includes(search) ||
                       report.location.street.toLowerCase().includes(search);
    
    const matchMonth = selectedMonth === "semua" || m === selectedMonth;
    const matchYear = selectedYear === "semua" || y === selectedYear;
    const matchCategory = selectedCategory === "semua" || report.category === selectedCategory;

    const restrictionMatch = !isUserRestricted || report.category === profile?.category;

    return matchSearch && matchMonth && matchYear && matchCategory && restrictionMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <FileText className="text-white h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-bold text-slate-900 leading-tight">Sistem Laporan</h1>
              <Badge variant="outline" className="w-fit text-[8px] md:text-[10px] py-0 h-4 bg-green-50 text-green-600 border-green-200">
                <Cloud className="h-2 w-2 mr-1" /> Cloud DLH
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/maintenance')} className="bg-amber-50 text-amber-700 border-amber-200">
                <Database className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Maintenance</span>
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => navigate('/monthly-rekap')} className="bg-purple-50 text-purple-700 border-purple-200">
              <FileBarChart className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Rekap Bulanan</span>
            </Button>

            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-2">
                  <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-slate-50 text-slate-700 border-slate-200">
                        <Printer className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Cetak Harian</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cetak Rekap Laporan</DialogTitle>
                        <DialogDescription>Pilih kategori laporan yang ingin dicetak.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Select onValueChange={setSelectedPrintCategory} value={selectedPrintCategory} disabled={isUserRestricted}>
                          <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                          <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat === 'semua' ? 'Semua Kategori' : cat}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => { setIsPrintDialogOpen(false); navigate(`/print-rekap?category=${selectedPrintCategory}`); }} className="w-full bg-blue-600">Buka Preview Cetak</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center gap-1 border-l pl-2 ml-1">
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <p className="text-[10px] font-bold text-slate-900 leading-none">
                      {isPimpinan ? 'Pimpinan' : isAdmin ? 'Admin' : 'User'}
                    </p>
                    <p className="text-[8px] text-slate-500">{isPimpinan ? 'Semua Kategori' : (profile?.category || 'Semua')}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-full"><LogOut className="h-5 w-5" /></Button>
                </div>

                <Button 
                  onClick={() => navigate('/create')} 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 h-9 px-3 md:px-4 ml-1"
                >
                  <Plus className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Laporan Baru</span>
                </Button>
                
                {isPimpinan && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-2 hidden md:flex">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Mode Pantau
                  </Badge>
                )}
              </>
            ) : (
              !authLoading && (
                <Button onClick={() => navigate('/login')} size="sm" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  <LogIn className="mr-2 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Masuk Sistem</span>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cari Uraian / Lokasi</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Ketik kata kunci..." 
                  className="pl-10 bg-slate-50 border-slate-200 h-10" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>

            <div className="w-full md:w-48 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Kategori</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isUserRestricted}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat === 'semua' ? 'Semua Kategori' : cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-40 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Bulan</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Bulan</SelectItem>
                  {months.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-32 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tahun</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tahun</SelectItem>
                  {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" onClick={resetFilters} className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0">
              <FilterX className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Memuat data...</div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="group hover:shadow-md transition-all cursor-pointer overflow-hidden border-l-4 border-l-blue-500 relative" onClick={() => navigate(`/report/${report.id}`)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-[10px] text-slate-500 font-medium">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <Badge variant="outline" className="w-fit text-[9px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">{report.category}</Badge>
                    </div>
                    
                    {isLoggedIn && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-blue-600" 
                          onClick={(e) => { e.stopPropagation(); navigate(`/edit/${report.id}`); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("h-8 w-8 text-slate-400 hover:text-red-500", isPimpinan && "opacity-50 cursor-not-allowed")}
                          disabled={isPimpinan}
                          onClick={(e) => handleDelete(e, report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-base line-clamp-1 group-hover:text-blue-600 transition-colors mt-2">{report.description}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
                    <span className="line-clamp-2">{report.location.street}, {Array.isArray(report.location.village) ? report.location.village.join(", ") : report.location.village}</span>
                  </div>
                  <div className="pt-3 flex justify-between items-center border-t text-[10px]">
                    <span className="text-slate-400 font-medium">Vol: {report.volume} {getUnitByCategory(report.category)}</span>
                    <div className="flex items-center text-blue-600 font-bold">Lihat Detail <Eye className="ml-1 h-3 w-3" /></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Search className="text-slate-300 h-6 w-6" />
            </div>
            <p className="text-slate-500 font-medium">Tidak ada laporan ditemukan</p>
            <p className="text-slate-400 text-xs mt-1">Coba ubah filter atau kata kunci pencarian Anda</p>
            <Button variant="link" onClick={resetFilters} className="mt-2 text-blue-600">Reset Semua Filter</Button>
          </div>
        )}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Index;