"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, FileText, MapPin, Calendar, 
  Trash2, Eye, Search, Edit, Cloud, Printer,
  LogOut, LogIn, FilterX, Database, ChevronDown,
  Table, ClipboardList, EyeOff, ArrowRight, CalendarDays, Fuel, Truck, Users, Globe, RefreshCw,
  Megaphone, Send, X, ShieldCheck, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { WorkPlan } from '@/types/workPlan';
import { FuelSpj } from '@/types/fuelSpj';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError } from '@/utils/toast';
import { reportService } from '@/services/reportService';
import { workPlanService } from '@/services/workPlanService';
import { fuelSpjService } from '@/services/fuelSpjService';
import { announcementService, Announcement } from '@/services/announcementService';
import { useAuth } from '@/context/AuthContext';
import { getUnitByCategory, sortByCategory } from '@/utils/report-helpers';
import { auditLogService } from '@/services/auditLogService';
import TrashDialog from '@/components/TrashDialog';
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  const [workPlans, setWorkPlans] = useState<WorkPlan[]>([]);
  const [spjs, setSpjs] = useState<FuelSpj[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("semua");
  const [selectedYear, setSelectedYear] = useState("semua");
  const [selectedCategory, setSelectedCategory] = useState("semua");

  const isLoggedIn = !!session;
  const isPimpinan = profile?.role === 'pimpinan' || (session?.user?.email === 'pimpinan@gmail.com');
  const isAdmin = profile?.role === 'admin' || (session?.user?.email === 'admin@gmail.com');
  const isAdminHarian = profile?.role === 'admin_harian' || (session?.user?.email === 'sakinah@gmail.com');
  const isSpjBbm = profile?.role === 'spjbbm' || profile?.category === 'Admin BBM' || (session?.user?.email === 'spjbbm@gmail.com');
  const isUserRestricted = isLoggedIn && profile?.role === 'user' && !isPimpinan && !isAdminHarian && !isSpjBbm;

  const [activeTab, setActiveTab] = useState("reports");

  useEffect(() => {
    if (profile) {
      if (isSpjBbm && !isAdmin) {
        setActiveTab("fuel_spj");
      } else {
        setActiveTab("reports");
      }
      
      if (isUserRestricted && profile.category) {
        setSelectedCategory(profile.category);
      }
    }
  }, [profile, isSpjBbm, isAdmin, isUserRestricted]);

  useEffect(() => {
    loadData();
  }, [isLoggedIn, profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [
        reportService.getAllReports(),
        workPlanService.getAllWorkPlans(),
        announcementService.getLatest()
      ];
      
      if (isAdmin || isSpjBbm || isPimpinan) {
        promises.push(fuelSpjService.getAll());
      }

      const results = await Promise.all(promises);
      setReports(results[0]);
      setWorkPlans(results[1]);
      setAnnouncement(results[2]);
      if (results[3]) setSpjs(results[3]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!session?.user?.id) return;
    setIsSavingNote(true);
    try {
      if (!noteContent.trim()) {
        await announcementService.clear();
        setAnnouncement(null);
        showSuccess("Catatan dibersihkan");
      } else {
        const newNote = await announcementService.create(noteContent, session.user.id);
        setAnnouncement(newNote);
        showSuccess("Catatan berhasil dikirim ke semua user");
      }
      setIsNoteDialogOpen(false);
    } catch (e) {
      showError("Gagal menyimpan catatan");
    } finally {
      setIsSavingNote(false);
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

  const handleDeleteReport = async (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    if (isPimpinan || isSpjBbm) return;
    if (window.confirm(`Pindahkan laporan "${report.description}" ke tempat sampah?`)) {
      try {
        await reportService.deleteReport(report.id);
        if (session?.user) {
          await auditLogService.logAction({
            action: 'DELETE', entityType: 'REPORT', entityId: report.id,
            details: { title: report.description, date: report.date, category: report.category },
            userId: session.user.id, username: profile?.username || session.user.email || "User"
          });
        }
        setReports(reports.filter(r => r.id !== report.id));
        showSuccess("Laporan dipindahkan ke tempat sampah");
      } catch (error) { showError("Gagal menghapus"); }
    }
  };

  const handleToggleWorkPlanVisibility = async (e: React.MouseEvent, plan: WorkPlan) => {
    e.stopPropagation();
    if (!isLoggedIn || isPimpinan || isSpjBbm) return;
    const newVisibility = plan.is_visible === false ? true : false;
    try {
      await workPlanService.updateWorkPlan(plan.id, { is_visible: newVisibility });
      setWorkPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_visible: newVisibility } : p));
      showSuccess(newVisibility ? "Rencana akan muncul di rekap" : "Rencana disembunyikan dari rekap");
    } catch (error) { showError("Gagal mengubah status visibilitas"); }
  };

  const handleDeleteWorkPlan = async (e: React.MouseEvent, plan: WorkPlan) => {
    e.stopPropagation();
    if (!isLoggedIn || isPimpinan || isSpjBbm) return;
    if (window.confirm(`Pindahkan rencana kerja "${plan.items[0]?.description}" ke tempat sampah?`)) {
      try {
        await workPlanService.deleteWorkPlan(plan.id);
        if (session?.user) {
          await auditLogService.logAction({
            action: 'DELETE', entityType: 'WORK_PLAN', entityId: plan.id,
            details: { title: plan.items[0]?.description, date: plan.date, category: plan.category },
            userId: session.user.id, username: profile?.username || session.user.email || "User"
          });
        }
        setWorkPlans(prev => prev.filter(p => p.id !== plan.id));
        showSuccess("Rencana kerja dipindahkan ke tempat sampah");
      } catch (error) { showError("Gagal menghapus data"); }
    }
  };

  const handleDeleteSpj = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isPimpinan) return;
    if (!confirm("Pindahkan ke tempat sampah?")) return;
    try {
      await fuelSpjService.delete(id);
      setSpjs(prev => prev.filter(s => s.id !== id));
      showSuccess("Data dipindahkan ke tempat sampah");
    } catch (error) { showError("Gagal menghapus data"); }
  };

  const resetFilters = () => {
    setSelectedDate("");
    setSelectedMonth("semua");
    setSelectedYear("semua");
    setSelectedCategory(isUserRestricted ? (profile?.category || "semua") : "semua");
    setSearchQuery("");
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const filteredReports = reports.filter(report => {
    const search = searchQuery.toLowerCase();
    const reportDate = new Date(report.date);
    const m = (reportDate.getMonth() + 1).toString();
    const y = reportDate.getFullYear().toString();
    const matchSearch = report.description.toLowerCase().includes(search) || report.location.street.toLowerCase().includes(search);
    const matchSpecificDate = !selectedDate || report.date === selectedDate;
    const matchMonth = selectedMonth === "semua" || m === selectedMonth;
    const matchYear = selectedYear === "semua" || y === selectedYear;
    const matchCategory = selectedCategory === "semua" || report.category === selectedCategory;
    const restrictionMatch = !isUserRestricted || report.category === profile?.category;
    return selectedDate ? (matchSearch && matchSpecificDate && matchCategory && restrictionMatch) : (matchSearch && matchMonth && matchYear && matchCategory && restrictionMatch);
  });

  const filteredWorkPlans = workPlans.filter(plan => {
    const search = searchQuery.toLowerCase();
    const planDate = new Date(plan.date);
    const m = (planDate.getMonth() + 1).toString();
    const y = planDate.getFullYear().toString();
    const matchSearch = plan.items?.some(item => item.description.toLowerCase().includes(search) || item.location.street.toLowerCase().includes(search));
    const matchSpecificDate = !selectedDate || plan.date === selectedDate;
    const matchMonth = selectedMonth === "semua" || m === selectedMonth;
    const matchYear = selectedYear === "semua" || y === selectedYear;
    const matchCategory = selectedCategory === "semua" || plan.category === selectedCategory;
    const restrictionMatch = !isUserRestricted || plan.category === profile?.category;
    return selectedDate ? (matchSearch && matchSpecificDate && matchCategory && restrictionMatch) : (matchSearch && matchMonth && matchYear && matchCategory && restrictionMatch);
  });

  const filteredSpjs = spjs.filter(spj => {
    const search = searchQuery.toLowerCase();
    const spjDate = new Date(spj.date);
    const m = (spjDate.getMonth() + 1).toString();
    const y = spjDate.getFullYear().toString();
    const matchSearch = spj.spj_number.toLowerCase().includes(search) || spj.vehicle.toLowerCase().includes(search) || spj.location_street.toLowerCase().includes(search);
    const matchSpecificDate = !selectedDate || spj.date === selectedDate;
    const matchMonth = selectedMonth === "semua" || m === selectedMonth;
    const matchYear = selectedYear === "semua" || y === selectedYear;
    return selectedDate ? (matchSearch && matchSpecificDate) : (matchSearch && matchMonth && matchYear);
  });

  const activeTabCount = (!isSpjBbm ? 2 : 0) + (isAdmin || isSpjBbm || isPimpinan ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0"><FileText className="text-white h-5 w-5" /></div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-bold text-slate-900 leading-tight">Sistem Laporan</h1>
              <Badge variant="outline" className="w-fit text-[8px] md:text-[10px] py-0 h-4 bg-green-50 text-green-600 border-green-200"><Cloud className="h-2 w-2 mr-1" /> Cloud DLH</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <TooltipProvider>
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => navigate('/maintenance')} className="bg-amber-50 text-amber-700 border-amber-200 px-2 md:px-3">
                      <Database className="h-4 w-4 md:mr-2" /> 
                      <span className="hidden md:inline">Maintenance</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden"><p>Maintenance</p></TooltipContent>
                </Tooltip>
              )}
              
              {isLoggedIn && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setIsTrashOpen(true)} className="h-8 w-8 md:h-9 md:w-9 text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Tempat Sampah</p></TooltipContent>
                </Tooltip>
              )}

              {!isSpjBbm && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-slate-50 text-slate-700 border-slate-200 px-2 md:px-3">
                      <Printer className="h-4 w-4 md:mr-2" /> 
                      <span className="hidden md:inline">Cetak {activeTab === "reports" ? "Laporan" : activeTab === "workplans" ? "Rencana" : "SPJ BBM"}</span>
                      <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {activeTab === "reports" ? (
                      <><DropdownMenuItem onClick={() => navigate(`/print-rekap?category=semua`)} className="cursor-pointer py-2"><Printer className="mr-2 h-4 w-4 text-blue-600" /> Cetak Harian Laporan</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/daily-rekap?categories=semua&date=semua`)} className="cursor-pointer py-2"><Table className="mr-2 h-4 w-4 text-green-600" /> Rekap Harian Laporan</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/weekly-rekap?categories=semua&date=${new Date().toISOString().split('T')[0]}`)} className="cursor-pointer py-2"><Table className="mr-2 h-4 w-4 text-purple-600" /> Rekap Mingguan Laporan</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/monthly-rekap`)} className="cursor-pointer py-2"><FileText className="mr-2 h-4 w-4 text-orange-600" /> Rekap Bulanan Laporan</DropdownMenuItem></>
                    ) : activeTab === "workplans" ? (
                      <><DropdownMenuItem onClick={() => navigate('/work-plans/daily-rekap')} className="cursor-pointer py-2"><Calendar className="mr-2 h-4 w-4 text-blue-600" /> Rekap Harian Rencana</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/work-plans/weekly-rekap')} className="cursor-pointer py-2"><Table className="mr-2 h-4 w-4 text-green-600" /> Rekap Mingguan Rencana</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/work-plans/monthly-rekap')} className="cursor-pointer py-2"><FileText className="mr-2 h-4 w-4 text-purple-600" /> Rekap Bulanan Rencana</DropdownMenuItem></>
                    ) : (
                      <><DropdownMenuItem onClick={() => navigate(`/fuel-spj/recap?range=daily&date=${new Date().toISOString().split('T')[0]}`)} className="cursor-pointer py-2"><Printer className="mr-2 h-4 w-4 text-blue-600" /> Rekap Harian SPJ</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/fuel-spj/recap?range=weekly&date=${new Date().toISOString().split('T')[0]}`)} className="cursor-pointer py-2"><Table className="mr-2 h-4 w-4 text-green-600" /> Rekap Mingguan SPJ</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/fuel-spj/recap?range=monthly&date=${new Date().toISOString().split('T')[0]}`)} className="cursor-pointer py-2"><FileText className="mr-2 h-4 w-4 text-orange-600" /> Rekap Bulanan SPJ</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/fuel-spj/recap?range=yearly&date=${new Date().toISOString().split('T')[0]}`)} className="cursor-pointer py-2"><Calendar className="mr-2 h-4 w-4 text-purple-600" /> Rekap Tahunan SPJ</DropdownMenuItem></>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isLoggedIn ? (
                <div className="flex items-center gap-1 border-l pl-1.5 md:pl-2 ml-0.5 md:ml-1">
                  <div className="hidden sm:flex flex-col items-end mr-2"><p className="text-[10px] font-bold text-slate-900 leading-none">{isSpjBbm ? 'Admin BBM' : isAdminHarian ? 'Admin Harian' : isPimpinan ? 'Pimpinan' : isAdmin ? 'Admin' : 'User'}</p><p className="text-[8px] text-slate-500">{isPimpinan || isAdminHarian || isSpjBbm ? 'Semua Kategori' : (profile?.category || 'Semua')}</p></div>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 md:h-9 md:w-9 text-red-500 hover:bg-red-50 rounded-full"><LogOut className="h-4 w-4 md:h-5 md:w-5" /></Button></TooltipTrigger><TooltipContent><p>Keluar Sistem</p></TooltipContent></Tooltip>
                </div>
              ) : (
                !authLoading && <Button onClick={() => navigate('/login')} size="sm" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 h-8 md:h-9 px-2 md:px-4"><LogIn className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Masuk Sistem</span></Button>
              )}
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Announcement Banner */}
        {announcement && (
          <div className="mb-6 bg-blue-600 text-white p-4 rounded-xl shadow-md flex items-start gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Megaphone size={80} /></div>
            <div className="bg-white/20 p-2 rounded-lg shrink-0"><Megaphone className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Catatan Pimpinan</p>
              <p className="text-sm md:text-base font-medium leading-relaxed">{announcement.content}</p>
            </div>
            {isPimpinan && (
              <Button variant="ghost" size="icon" onClick={() => { setNoteContent(announcement.content); setIsNoteDialogOpen(true); }} className="text-white hover:bg-white/20 shrink-0"><Edit size={18} /></Button>
            )}
          </div>
        )}

        {isPimpinan && !announcement && (
          <div className="mb-6 border-2 border-dashed border-blue-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 bg-blue-50/30">
            <p className="text-xs text-blue-600 font-medium">Belum ada catatan pimpinan aktif.</p>
            <Button onClick={() => { setNoteContent(""); setIsNoteDialogOpen(true); }} size="sm" className="bg-blue-600"><Plus size={14} className="mr-2" /> Buat Catatan Baru</Button>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cari Uraian / Lokasi</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Ketik kata kunci..." className="pl-10 bg-slate-50 border-slate-200 h-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            {!isSpjBbm && (
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Kategori</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isUserRestricted}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                  <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat === 'semua' ? 'Semua Kategori' : cat}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className={cn("space-y-1.5", isSpjBbm ? "md:col-span-3" : "md:col-span-2")}>
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tanggal</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="date" className="pl-10 bg-slate-50 border-slate-200 h-10" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            </div>
            <div className={cn("space-y-1.5", isSpjBbm ? "md:col-span-3" : "md:col-span-2")}>
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Bulan</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!!selectedDate}>
                <SelectTrigger className={cn("bg-slate-50 border-slate-200 h-10", selectedDate && "opacity-50")}>
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent><SelectItem value="semua">Semua Bulan</SelectItem>{months.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tahun</label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!!selectedDate}>
                <SelectTrigger className={cn("bg-slate-50 border-slate-200 h-10", selectedDate && "opacity-50")}>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent><SelectItem value="semua">Semua Tahun</SelectItem>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex justify-end">
              <Button variant="ghost" size="icon" onClick={resetFilters} className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"><FilterX className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className={cn(
              "grid h-12 bg-white border shadow-sm p-1", 
              isAdmin || isPimpinan ? "w-[600px] grid-cols-3" : "w-[400px] grid-cols-2"
            )}>
              <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"><FileText size={16} /> Laporan Harian</TabsTrigger>
              <TabsTrigger value="workplans" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"><ClipboardList size={16} /> Rencana Kerja</TabsTrigger>
              {(isAdmin || isSpjBbm || isPimpinan) && <TabsTrigger value="fuel_spj" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"><Fuel size={16} /> Manajemen SPJ BBM</TabsTrigger>}
            </TabsList>
            {isLoggedIn && !isPimpinan && (
              <div className="flex gap-2">
                {activeTab === "fuel_spj" ? (
                  <Button onClick={() => navigate('/fuel-spj/create')} className="bg-blue-600 hover:bg-blue-700 h-10 font-bold shadow-sm flex-1 md:flex-none">
                    <Plus className="h-4 w-4 md:mr-2" /> 
                    <span className="hidden md:inline">Input SPJ Baru</span>
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => navigate('/create')} className="bg-blue-600 hover:bg-blue-700 h-10 font-bold shadow-sm flex-1 md:flex-none">
                      <Plus className="h-4 w-4 md:mr-2" /> 
                      <span className="hidden md:inline">Input Laporan</span>
                    </Button>
                    <Button onClick={() => navigate('/work-plans/create')} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 h-10 font-bold flex-1 md:flex-none">
                      <Plus className="h-4 w-4 md:mr-2" /> 
                      <span className="hidden md:inline">Buat Rencana</span>
                    </Button>
                  </>
                )}
              </div>
            )}
            {isPimpinan && (
              <Button onClick={() => setIsNoteDialogOpen(true)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 h-10 font-bold">
                <Megaphone className="h-4 w-4 md:mr-2" /> 
                <span className="hidden md:inline">Kelola Catatan Pimpinan</span>
              </Button>
            )}
          </div>

          <TabsContent value="reports" className="space-y-4">
            {loading ? <div className="text-center py-20 text-slate-500">Memuat data...</div> : filteredReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="group hover:shadow-md transition-all cursor-pointer overflow-hidden border-l-4 border-l-blue-500 relative" onClick={() => navigate(`/report/${report.id}`)}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1"><div className="flex items-center text-[10px] text-slate-500 font-medium"><Calendar className="h-3 w-3 mr-1" />{new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div><Badge variant="outline" className="w-fit text-[9px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">{report.category}</Badge></div>
                        {isLoggedIn && !isPimpinan && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); navigate(`/edit/${report.id}`); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-slate-400 hover:text-red-500", isPimpinan && "opacity-50 cursor-not-allowed")} disabled={isPimpinan} onClick={(e) => handleDeleteReport(e, report)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        )}
                        {isPimpinan && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px]"><ShieldCheck size={10} className="mr-1" /> Pantau</Badge>}
                      </div>
                      <CardTitle className="text-base line-clamp-1 group-hover:text-blue-600 transition-colors mt-2">{report.description}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3"><div className="flex items-start gap-2 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" /><span className="line-clamp-2">{report.location.street}, {Array.isArray(report.location.village) ? report.location.village.join(", ") : report.location.village}</span></div><div className="pt-3 flex justify-between items-center border-t text-[10px]"><span className="text-slate-400 font-medium">Vol: {report.volume} {getUnitByCategory(report.category)}</span><div className="flex items-center text-blue-600 font-bold">Lihat Detail <Eye className="ml-1 h-3 w-3" /></div></div></CardContent>
                  </Card>
                ))}
              </div>
            ) : <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"><p className="text-slate-500 font-medium">Tidak ada laporan ditemukan</p><Button variant="link" onClick={resetFilters} className="mt-2 text-blue-600">Reset Filter</Button></div>}
          </TabsContent>

          <TabsContent value="workplans" className="space-y-4">
            {loading ? <div className="text-center py-20 text-slate-500">Memuat data...</div> : filteredWorkPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkPlans.map((plan) => (
                  <Card key={plan.id} className={cn("group hover:shadow-md transition-all cursor-pointer border-l-4 overflow-hidden relative", plan.is_visible === false ? "border-l-slate-300 opacity-75" : "border-l-green-500")} onClick={() => navigate(`/work-plans/print/${plan.id}`)}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1"><div className="flex items-center text-[10px] text-slate-500 font-medium"><Calendar className="h-3 w-3 mr-1" />{new Date(plan.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div><div className="flex items-center gap-2"><Badge variant="outline" className="w-fit text-[9px] py-0 h-4 bg-green-50 text-green-700 border-green-200">{plan.category}</Badge>{plan.is_visible === false && <Badge variant="outline" className="text-[8px] bg-red-50 text-red-600 border-red-100">Sembunyi</Badge>}</div></div>
                        {isLoggedIn && !isPimpinan && (
                          <div className="flex items-center gap-1">
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-8 w-8", plan.is_visible === false ? "text-slate-400 hover:text-blue-600" : "text-blue-600 hover:bg-blue-50")} onClick={(e) => handleToggleWorkPlanVisibility(e, plan)} disabled={isPimpinan}>{plan.is_visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent><p>{plan.is_visible === false ? "Tampilkan di Rekap" : "Sembunyikan dari Rekap"}</p></TooltipContent></Tooltip></TooltipProvider>
                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-slate-400 hover:text-blue-600", isPimpinan && "opacity-50 cursor-not-allowed")} disabled={isPimpinan} onClick={(e) => { e.stopPropagation(); if(!isPimpinan) navigate(`/work-plans/edit/${plan.id}`); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-slate-400 hover:text-red-500", isPimpinan && "opacity-50 cursor-not-allowed")} disabled={isPimpinan} onClick={(e) => handleDeleteWorkPlan(e, plan)}><Trash2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); navigate(`/work-plans/print/${plan.id}`); }}><Printer className="h-4 w-4" /></Button>
                          </div>
                        )}
                        {isPimpinan && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px]"><ShieldCheck size={10} className="mr-1" /> Pantau</Badge>}
                      </div>
                      <CardTitle className="text-base line-clamp-1 group-hover:text-green-600 transition-colors mt-2">{plan.items?.[0]?.description || "Rencana Kerja"}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3"><div className="flex items-start gap-2 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" /><span className="line-clamp-1">{plan.items?.[0]?.location?.street || "Lokasi Kerja"}</span></div><div className="pt-3 flex justify-between items-center border-t text-[10px]"><span className="text-slate-400 font-medium">Vol: {plan.items?.length || 0} Lokasi Kerja</span><div className="flex items-center text-green-600 font-bold">Lihat Rencana <ArrowRight className="ml-1 h-3 w-3" /></div></div></CardContent>
                  </Card>
                ))}
              </div>
            ) : <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"><p className="text-slate-500 font-medium">Tidak ada rencana kerja ditemukan</p><Button variant="link" onClick={resetFilters} className="mt-2 text-blue-600">Reset Filter</Button></div>}
            <div className="flex justify-center pt-4"><Button variant="outline" onClick={() => navigate('/work-plans')} className="text-blue-600 border-blue-200">Lihat Semua Rencana Kerja <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </TabsContent>

          {(isAdmin || isSpjBbm || isPimpinan) && (
            <TabsContent value="fuel_spj" className="space-y-4">
              {loading ? <div className="text-center py-20 text-slate-500">Memuat data...</div> : filteredSpjs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSpjs.map((spj) => (
                    <Card key={spj.id} className="hover:shadow-md transition-all border-l-4 border-l-blue-500 group">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase"><Calendar className="h-3 w-3 mr-1" /> {spj.date}</div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">{spj.spj_number}</Badge>
                          </div>
                          {!isPimpinan && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => navigate(`/fuel-spj/edit/${spj.id}`)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={(e) => handleDeleteSpj(e, spj.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          )}
                          {isPimpinan && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px]"><ShieldCheck size={10} className="mr-1" /> Pantau</Badge>}
                        </div>
                        <CardTitle className="text-base mt-2 flex items-center gap-2"><Truck size={16} className="text-slate-400" /> {spj.vehicle}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="text-xs text-slate-600 flex items-start gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" /> <span className="line-clamp-1">{spj.location_street}, {spj.location_village}</span></div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Users size={12} /> {spj.team}</div>
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Globe size={12} /> {spj.region}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded space-y-2 mt-2">
                          <div className="grid grid-cols-1 gap-1 text-[10px]">
                            {spj.usage_pertamax > 0 && <div className="flex justify-between"><span>Pertamax:</span><span className="font-black text-blue-600">{formatRupiah(spj.usage_pertamax)}</span></div>}
                            {spj.usage_dexlite > 0 && <div className="flex justify-between"><span>Dexlite:</span><span className="font-black text-orange-600">{formatRupiah(spj.usage_dexlite)}</span></div>}
                            {spj.usage_solar > 0 && <div className="flex justify-between"><span>Solar:</span><span className="font-black text-green-600">{formatRupiah(spj.usage_solar)}</span></div>}
                            {spj.usage_oil > 0 && <div className="flex justify-between border-t pt-1 mt-1"><span>Oli:</span><span className="font-black text-purple-600">{spj.usage_oil} L</span></div>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"><p className="text-slate-500 font-medium">Tidak ada data SPJ BBM ditemukan</p></div>}
            </TabsContent>
          )}
        </Tabs>
      </main>
      
      <TrashDialog 
        isOpen={isTrashOpen} 
        onClose={() => setIsTrashOpen(false)} 
        onRefresh={loadData} 
      />

      {/* Pimpinan Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600"><Megaphone className="h-5 w-5" /> Kelola Catatan Pimpinan</DialogTitle>
            <DialogDescription>Pesan ini akan muncul di Dashboard semua pengguna yang login.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Isi Pesan / Catatan</label>
              <Textarea 
                placeholder="Ketik pesan untuk semua user..." 
                className="min-h-[120px] resize-none"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 italic">* Kosongkan pesan dan simpan untuk menghapus catatan aktif.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsNoteDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveNote} disabled={isSavingNote} className="bg-blue-600 hover:bg-blue-700">
              {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Simpan & Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <MadeWithDyad />
    </div>
  );
};

export default Index;