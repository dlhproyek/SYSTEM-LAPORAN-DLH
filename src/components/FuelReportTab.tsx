"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Calendar, MapPin, Fuel, Trash2, Edit, 
  Search, RefreshCw, ArrowRight, FilterX, CalendarDays, Printer, ChevronDown, Table, FileText
} from 'lucide-react';
import { FuelReport } from '@/types/fuelReport';
import { fuelService } from '@/services/fuelService';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FuelReportTab = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllReports();
      setReports(data);
    } catch (error) {
      showError("Gagal memuat data BBM");
    } finally {
      setLoading(false);
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

  const filteredReports = reports.filter(r => {
    const matchSearch = r.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       r.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDate = !selectedDate || r.date === selectedDate;
    return matchSearch && matchDate;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-5 space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cari Tim / Wilayah</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Ketik nama tim..." 
                className="pl-10 bg-slate-50 border-slate-200 h-10 text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Filter Tanggal</label>
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
          <div className="lg:col-span-4 flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => { setSearchQuery(""); setSelectedDate(""); }}
              className="h-10 w-10 shrink-0 border-slate-200 text-slate-400 hover:text-red-500"
            >
              <FilterX size={18} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 border-slate-200 bg-white px-3">
                  <Printer className="h-4 w-4 mr-2" /> Cetak <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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

            <Button variant="outline" size="icon" onClick={loadReports} disabled={loading} className="h-10 w-10 shrink-0 border-slate-200">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button onClick={() => navigate('/fuel-reports/create')} className="bg-orange-600 hover:bg-orange-700 h-10 flex-1 font-bold text-xs md:text-sm">
              <Fuel className="mr-2 h-4 w-4" /> Input BBM Baru
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-slate-500 text-sm font-medium">Memuat data BBM...</p>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-all border-l-4 border-l-orange-500 cursor-pointer group" onClick={() => navigate(`/fuel-reports/${report.id}`)}>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center text-[10px] text-slate-500 font-medium"><Calendar className="h-3 w-3 mr-1" /> {report.date}</div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-100 text-[10px]">{report.region}</Badge>
                  </div>
                  <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); navigate(`/fuel-reports/edit/${report.id}`); }}><Edit size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={(e) => handleDelete(e, report.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
                <CardTitle className="text-base mt-2 group-hover:text-orange-600 transition-colors">{report.team}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="pt-2 border-t flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 italic">{report.items?.length || 0} Item Pemakaian</span>
                  <div className="flex items-center text-blue-600 font-bold">Lihat Detail <ArrowRight className="ml-1 h-3 w-3" /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
          <Search className="mx-auto h-8 w-8 text-slate-200 mb-2" />
          <p className="text-sm">Tidak ada laporan BBM ditemukan</p>
        </div>
      )}
    </div>
  );
};

export default FuelReportTab;