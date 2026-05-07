"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Calendar, MapPin, Fuel, Trash2, Edit, 
  Search, FilterX, ArrowLeft, RefreshCw, Printer, ChevronDown,
  Table, FileText, Settings2, Eye, LogOut
} from 'lucide-react';
import { fuelSpjService } from '@/services/fuelSpjService';
import { FuelSpjReport } from '@/types/fuelSpjReport';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from "@/components/ui/input";
import FuelPriceSettings from '@/components/FuelPriceSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FuelSpjReportList = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [reports, setReports] = useState<FuelSpjReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPriceSettingsOpen, setIsPriceSettingsOpen] = useState(false);

  const isAllowed = profile?.role === 'admin' || profile?.role === 'admin_spj_bbm';

  useEffect(() => {
    if (!isAllowed && profile) {
      showError("Akses ditolak.");
      navigate('/');
      return;
    }
    loadReports();
  }, [profile, isAllowed]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await fuelSpjService.getAllReports();
      setReports(data);
    } catch (error) {
      showError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Hapus laporan SPJ ini?")) return;
    try {
      await fuelSpjService.deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      showSuccess("Laporan dihapus");
    } catch (error) {
      showError("Gagal menghapus");
    }
  };

  const filteredReports = reports.filter(r => {
    const search = searchQuery.toLowerCase();
    return r.region.toLowerCase().includes(search) || 
           r.entries.some(e => e.spj_no.toLowerCase().includes(search) || e.vehicle_operator.toLowerCase().includes(search));
  });

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="text-blue-600" /> Laporan SPJ BBM
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{filteredReports.length}</Badge>
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-red-500"><LogOut size={20} /></Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsPriceSettingsOpen(true)} className="bg-white border-slate-200">
              <Settings2 className="mr-2 h-4 w-4" /> Master Harga BBM
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white border-slate-200">
                  <Printer className="h-4 w-4 mr-2" /> Cetak Rekap <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/spj/daily-rekap')} className="cursor-pointer py-2">
                  <Calendar className="mr-2 h-4 w-4 text-blue-600" /> Rekap Harian
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/spj/weekly-rekap')} className="cursor-pointer py-2">
                  <Table className="mr-2 h-4 w-4 text-green-600" /> Rekap Mingguan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/spj/monthly-rekap')} className="cursor-pointer py-2">
                  <FileText className="mr-2 h-4 w-4 text-purple-600" /> Rekap Bulanan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/fuel-reports/spj/yearly-rekap')} className="cursor-pointer py-2">
                  <Calendar className="mr-2 h-4 w-4 text-orange-600" /> Rekap Tahunan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => navigate('/fuel-reports/spj/create')} className="bg-blue-600 font-bold shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Input SPJ Baru
            </Button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari No. SPJ, Kendaraan, atau Wilayah..." 
              className="pl-10 bg-slate-50 border-slate-200 h-11" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-slate-500 font-medium">Memuat data SPJ...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-all border-l-4 border-l-blue-600 cursor-pointer group" onClick={() => navigate(`/fuel-reports/spj/edit/${report.id}`)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center text-[10px] text-slate-500 font-medium"><Calendar className="h-3 w-3 mr-1" /> {report.date}</div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{report.region}</Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={(e) => handleDelete(e, report.id)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">Laporan SPJ - {report.entries.length} Kendaraan / Alat</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="space-y-2">
                    {report.entries.slice(0, 2).map((entry, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px]">
                        <div className="flex justify-between font-bold text-blue-700">
                          <span>{entry.spj_no}</span>
                          <span>{entry.vehicle_operator}</span>
                        </div>
                        <div className="text-slate-500 italic mt-1">Penerima: {entry.receiver_name}</div>
                      </div>
                    ))}
                    {report.entries.length > 2 && <div className="text-[10px] text-center text-slate-400">+{report.entries.length - 2} item lainnya</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            <p className="font-medium">Tidak ada laporan SPJ ditemukan</p>
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

export default FuelSpjReportList;