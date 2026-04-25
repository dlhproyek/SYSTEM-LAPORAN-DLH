"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Calendar, MapPin, FileText, Trash2, Edit, 
  Printer, Search, FilterX, ArrowLeft, ChevronDown,
  Table, CalendarDays, Clock
} from 'lucide-react';
import { WorkPlan } from '@/types/workPlan';
import { workPlanService } from '@/services/workPlanService';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const WorkPlanList = () => {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [plans, setPlans] = useState<WorkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [selectedDate, setSelectedDate] = useState("");
  const [isWeeklyMode, setIsWeeklyMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("semua");
  const [selectedYear, setSelectedYear] = useState("semua");

  const isLoggedIn = !!session;
  const isPimpinan = profile?.role === 'pimpinan' || (session?.user?.email === 'pimpinan@gmail.com');
  const isUserRestricted = isLoggedIn && profile?.role === 'user' && profile?.category && !isPimpinan;

  useEffect(() => {
    loadPlans();
    if (isUserRestricted) setSelectedCategory(profile.category!);
  }, [profile]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await workPlanService.getAllWorkPlans();
      setPlans(data);
    } catch (error) {
      showError("Gagal memuat rencana kerja");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isPimpinan) {
      showError("Akun Pimpinan tidak diizinkan menghapus data");
      return;
    }
    if (window.confirm("Hapus rencana kerja ini?")) {
      try {
        await workPlanService.deleteWorkPlan(id);
        setPlans(plans.filter(p => p.id !== id));
        showSuccess("Rencana kerja dihapus");
      } catch (error) {
        showError("Gagal menghapus");
      }
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(isUserRestricted ? profile.category! : "semua");
    setSelectedDate("");
    setIsWeeklyMode(false);
    setSelectedMonth("semua");
    setSelectedYear("semua");
  };

  const filteredPlans = plans.filter(plan => {
    const planDate = parseISO(plan.date);
    const matchSearch = plan.items.some(item => 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.street.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchCategory = selectedCategory === "semua" || plan.category === selectedCategory;
    let matchDate = true;
    if (selectedDate) {
      if (isWeeklyMode) {
        const start = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
        const end = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
        matchDate = isWithinInterval(planDate, { start, end });
      } else {
        matchDate = plan.date === selectedDate;
      }
    }
    let matchMonthYear = true;
    if (!selectedDate) {
      const m = (planDate.getMonth() + 1).toString();
      const y = planDate.getFullYear().toString();
      const matchMonth = selectedMonth === "semua" || m === selectedMonth;
      const matchYear = selectedYear === "semua" || y === selectedYear;
      matchMonthYear = matchMonth && matchYear;
    }
    return matchSearch && matchCategory && matchDate && matchMonthYear;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" onClick={() => navigate('/')} className="px-2 md:px-3">
                    <ArrowLeft className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Beranda</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="md:hidden"><p>Beranda</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <FileText className="text-blue-600 h-5 w-5 md:h-6 md:w-6" /> Rencana Kerja
            </h1>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white px-2 md:px-3 h-8 md:h-10">
                  <Printer className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Cetak Rekap</span> <ChevronDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/work-plans/daily-rekap')} className="cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4 text-blue-600" /> Rekap Harian
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/work-plans/weekly-rekap')} className="cursor-pointer">
                  <Table className="mr-2 h-4 w-4 text-green-600" /> Rekap Mingguan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/work-plans/monthly-rekap')} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4 text-purple-600" /> Rekap Bulanan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => navigate('/work-plans/create')} className="bg-blue-600 px-2 md:px-4 h-8 md:h-10">
                    <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Buat Rencana Baru</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="md:hidden"><p>Buat Rencana Baru</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cari Kegiatan / Lokasi</label>
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

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Kategori</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!!isUserRestricted}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Kategori</SelectItem>
                  {["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"].map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Filter Tanggal / Minggu</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="date" 
                    className="pl-10 bg-slate-50 border-slate-200 h-10" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                {selectedDate && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 rounded-md border border-blue-100 h-10">
                    <Checkbox 
                      id="weekly" 
                      checked={isWeeklyMode} 
                      onCheckedChange={(val) => setIsWeeklyMode(!!val)} 
                    />
                    <label htmlFor="weekly" className="text-[10px] font-bold text-blue-700 cursor-pointer whitespace-nowrap">PER MINGGU</label>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button variant="ghost" onClick={resetFilters} className="h-10 text-slate-400 hover:text-red-500 hover:bg-red-50 w-full md:w-auto">
                <FilterX className="h-4 w-4 mr-2" /> Reset Filter
              </Button>
            </div>
          </div>

          {!selectedDate && (
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Atau Filter Bulan:</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-50">
                    <SelectValue placeholder="Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Bulan</SelectItem>
                    {months.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-50">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Tahun</SelectItem>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">Memuat data...</div>
        ) : filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500" onClick={() => navigate(`/work-plans/print/${plan.id}`)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-xs text-slate-500 font-medium">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(plan.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-fit text-[10px] bg-blue-50 text-blue-700">{plan.category}</Badge>
                        <div className="flex items-center text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {format(parseISO(plan.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-8 w-8", isPimpinan && "opacity-50 cursor-not-allowed")} 
                        disabled={isPimpinan}
                        onClick={(e) => { e.stopPropagation(); if(!isPimpinan) navigate(`/work-plans/edit/${plan.id}`); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-8 w-8 text-red-500", isPimpinan && "opacity-50 cursor-not-allowed")} 
                        disabled={isPimpinan}
                        onClick={(e) => handleDelete(e, plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2 line-clamp-1">{plan.items[0].description}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="text-xs text-slate-600 flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />
                    <span className="line-clamp-1">{plan.items[0].location.street}</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">{plan.items.length} Lokasi Kerja</span>
                    <div className="flex items-center text-blue-600 font-bold">Preview Cetak <Printer className="ml-1 h-3 w-3" /></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Search className="text-slate-300 h-6 w-6" />
            </div>
            <p className="text-slate-500 font-medium">Tidak ada rencana kerja ditemukan</p>
            <p className="text-slate-400 text-xs mt-1">Coba ubah filter pencarian Anda</p>
            <Button variant="link" onClick={resetFilters} className="mt-2 text-blue-600">Reset Semua Filter</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkPlanList;