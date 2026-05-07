"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Calendar, MapPin, Fuel, Trash2, Edit, 
  Search, FilterX, ArrowLeft, RefreshCw, Printer, ChevronDown,
  Table, FileText, CalendarDays, LogOut, Eye, MessageSquare, ArrowRight, Settings2
} from 'lucide-react';
import { FuelReport } from '@/types/fuelReport';
import { fuelService } from '@/services/fuelService';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FuelPriceSettings from '@/components/FuelPriceSettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const FuelReportList = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPriceSettingsOpen, setIsPriceSettingsOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("semua");
  const [selectedYear, setSelectedYear] = useState("semua");

  const isAdminBbm = profile?.role === 'admin_bbm';
  const isAdmin = profile?.role === 'admin';
  const isAllowed = isAdmin || isAdminBbm;

  useEffect(() => {
    if (!isAllowed && profile) {
      showError("Akses ditolak. Hanya Administrator yang dapat mengakses halaman ini.");
      navigate('/');
      return;
    }
    loadReports();
  }, [profile, isAllowed]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllReports();
      setReports(data);
    } catch (error) {
      showError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      try {
        await signOut();
        navigate('/login');
        showSuccess("Berhasil keluar");
      } catch (error) {
        showError("Gagal keluar");
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Hapus laporan ini?")) return;
    try {
      await fuelService.deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      showSuccess("Laporan dihapus");
    } catch (error) {
      showError("Gagal menghapus");
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDate("");
    setSelectedMonth("semua");
    setSelectedYear("semua");
  };

  const filteredReports = reports.filter(r => {
    const search = searchQuery.toLowerCase();
    const reportDate = new Date(r.date);
    const m = (reportDate.getMonth() + 1).toString();
    const y = reportDate.getFullYear().toString();

    const matchSearch = r.team.toLowerCase().includes(search) ||
      r.region.toLowerCase().includes(search) ||
      r.items?.some(item => item.location.street.toLowerCase().includes(search));

    const matchSpecificDate = !selectedDate || r.date === selectedDate;
    const matchMonth = selectedMonth === "semua" || m === selectedMonth;
    const matchYear = selectedYear === "semua" || y === selectedYear;

    if (selectedDate) {
      return matchSearch && matchSpecificDate;
    }

    return matchSearch && matchMonth && matchYear;
  });

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex flex-col">
                <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                  <Fuel className="text-orange-600 h-5 w-5 md:h-6 md:w-6" /> Laporan BBM & Oli
                  {!loading && <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700 text-[10px] md:text-xs">{filteredReports.length}</Badge>}
                </h1>
              </div>
            </div>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-full">
              <LogOut size={20} />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/fuel-reports/spj')} className="bg-blue-50 text-blue-700 border-blue-200 h-10 px-3 flex-1 md:flex-none font-bold">
                <FileText className="h-4 w-4 mr-2" /> Ke Laporan SPJ <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            <Button variant="outline" onClick={() => setIsPriceSettingsOpen(true)} className="bg-white border-slate-200 h-10 px-3 flex-1 md:flex-none font-bold">
              <Settings2 className="mr-2 h-4 w-4 text-blue-600" /> Master Harga BBM
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white border-slate-200 h-10 px-3 flex-1 md:flex-none justify-between md:justify-center">
                  <div className="flex items-center">
                    <Printer className="h-4 w-4 mr-2" /> 
                    <span className="text-xs md:text-sm">Cetak Rekap</span>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/daily-rekap')} className="cursor-pointer py-2">
                  <Calendar className="mr-2 h-4 w-4 text-blue-600" /> Rekap Harian
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/weekly-rekap')} className="cursor-pointer py-2">
                  <Table className="mr-2 h-4 w-4 text-green-600" /> Rekap Mingguan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/monthly-rekap')} className="cursor-pointer py-2">
                  <FileText className="mr-2 h-4 w-4 text-purple-600" /> Rekap Bulanan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/yearly-rekap')} className="cursor-pointer py-2">
                  <CalendarDays className="mr-2 h-4 w-4 text-orange-600" /> Rekap Tahunan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={loadReports} disabled={loading} className="h-10 w-10 bg-white border-slate-200 shrink-0">
                    <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Segarkan Data</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button onClick={() => navigate('/fuel-reports/create')} className="bg-blue-600 hover:bg-blue-700 h-10 px-4 flex-1 md:flex-none font-bold shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> <span className="text-xs md:text-sm">Input Baru</span>
            </Button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cari Tim / Wilayah / Lokasi</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Ketik kata kunci..." 
                  className="pl-10 bg-slate-50 border-slate-200 h-10 text-sm" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tanggal Spesifik</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  type="date" 
                  className="pl-10 bg-slate-50 border-slate-200 h-10 text-sm" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Bulan</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!!selectedDate}>
                <SelectTrigger className={cn("bg-slate-50 border-slate-200 h-10 text-sm", selectedDate && "opacity-50")}>
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Bulan</SelectItem>
                  {months.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tahun</label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!!selectedDate}>
                <SelectTrigger className={cn("bg-slate-50 border-slate-200 h-10 text-sm", selectedDate && "opacity-50")}>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tahun</SelectItem>
                  {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1 flex justify-end">
              <Button variant="ghost" size="icon" onClick={resetFilters} className="h-10 w-full md:w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 border border-dashed md:border-none">
                <FilterX className="h-5 w-5 md:mr-0 mr-2" />
                <span className="md:hidden text-xs font-bold">Reset Filter</span>
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-slate-500 font-medium animate-pulse">Memuat data...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-all border-l-4 border-l-orange-500 cursor-pointer group" onClick={() => navigate(`/fuel-reports/${report.id}`)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center text-[10px] text-slate-500 font-medium"><Calendar className="h-3 w-3 mr-1" /> {report.date}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{report.region}</Badge>
                        {report.pimpinan_note && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px]"><MessageSquare size={8} className="mr-1" /> Ada Catatan</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); navigate(`/fuel-reports/edit/${report.id}`); }}><Edit size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={(e) => handleDelete(e, report.id)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2 group-hover:text-orange-600 transition-colors">{report.team}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Daftar Pemakaian & Lokasi ({report.items?.length || 0})</p>
                    {report.items?.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-700">{item.vehicle_operator} ({item.fuel_type})</span>
                          <span className="font-black text-orange-700">
                            {item.fuel_type === 'Oli' ? `${item.amount_liter || item.amount} L` : `Rp ${(item.amount_rp || item.amount).toLocaleString('id-ID')}`}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-[10px] text-slate-500">
                          <MapPin size={10} className="mt-0.5 shrink-0 text-red-400" />
                          <span className="line-clamp-1">{item.location.street}</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 italic">Klik untuk detail & catatan</span>
                      <div className="flex items-center text-blue-600 font-bold">Lihat <Eye className="ml-1 h-3 w-3" /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Search className="text-slate-300 h-6 w-6" />
            </div>
            <p className="font-medium">Tidak ada laporan ditemukan</p>
            <p className="text-xs mt-1">Coba ubah filter pencarian atau klik tombol reset</p>
            <Button variant="link" onClick={resetFilters} className="mt-2 text-blue-600">Reset Semua Filter</Button>
          </div>
        )}
      </div>

      <FuelPriceSettings 
        isOpen={isPriceSettingsOpen} 
        onClose={() => setIsPriceSettingsOpen(false)} 
      />
    </div>
  );
};

export default FuelReportList;