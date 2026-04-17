"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, FileText, MapPin, Calendar, Users, Fuel, 
  Trash2, Eye, Search, Edit, Cloud, Tag, Table, Printer, FileBarChart,
  LogOut, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError } from '@/utils/toast';
import { reportService } from '@/services/reportService';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import { getUnitByCategory } from '@/utils/report-helpers';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const categories: string[] = [
  "semua", "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
];

const Index = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrintCategory, setSelectedPrintCategory] = useState("semua");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) loadReports();
  }, [profile]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const categoryFilter = profile?.role === 'admin' ? null : profile?.category;
      const data = await reportService.getAllReports(categoryFilter);
      setReports(data);
    } catch (error) {
      console.error(error);
      showError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Hapus laporan ini?")) {
      try {
        await reportService.deleteReport(id);
        setReports(reports.filter(r => r.id !== id));
        showSuccess("Laporan dihapus");
      } catch (error) {
        showError("Gagal menghapus");
      }
    }
  };

  const handleExportExcel = () => {
    if (reports.length === 0) return;
    const data = reports.map((r, index) => ({
      "No": index + 1,
      "Tanggal": r.date,
      "Kategori": r.category,
      "Uraian": r.description,
      "Lokasi": r.location.street,
      "Volume": r.volume,
      "Koordinator": r.personnel.coordinator,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    XLSX.writeFile(wb, `Rekap_DLH_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredReports = reports.filter(report => {
    const search = searchQuery.toLowerCase();
    return (
      report.description.toLowerCase().includes(search) ||
      report.location.street.toLowerCase().includes(search) ||
      report.category?.toLowerCase().includes(search)
    );
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-fit text-[8px] md:text-[10px] py-0 h-4 bg-green-50 text-green-600 border-green-200">
                  <Cloud className="h-2 w-2 mr-1" /> Cloud
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/monthly-rekap')} className="bg-purple-50 text-purple-700 border-purple-200">
                <FileBarChart className="h-4 w-4 mr-2" /> Rekap Bulanan
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-green-50 text-green-700 border-green-200">
                <Table className="h-4 w-4 mr-2" /> Excel
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 rounded-full border-blue-200 bg-blue-50 text-blue-600 px-3">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-bold hidden sm:inline">{profile?.username || 'User'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 px-3">
                  <p className="text-xs font-bold text-slate-900">{profile?.username || 'User'}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    {profile?.role === 'admin' ? 'Administrator' : (profile?.category || 'User Tim')}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => navigate('/create')} size="sm" className="bg-blue-600 hover:bg-blue-700 h-9">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari laporan..." className="pl-10 bg-white h-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Memuat...</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500">Tidak ada laporan ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500" onClick={() => navigate(`/report/${report.id}`)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-[10px] text-slate-500 font-medium">
                        <Calendar className="h-3 w-3 mr-1" />
                        {report.date}
                      </div>
                      <Badge variant="outline" className="w-fit text-[9px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                        {report.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={(e) => handleDelete(e, report.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base line-clamp-1 mt-2">{report.description}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
                    <span className="line-clamp-1">{report.location.street}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Index;