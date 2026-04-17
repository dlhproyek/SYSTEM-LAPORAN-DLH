"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { 
  Plus, FileText, MapPin, Calendar, Users, 
  Trash2, Eye, Search, Edit, Cloud, Tag, Table, Printer, FileBarChart,
  LogOut, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '../types/report';
import { MadeWithDyad } from "../components/made-with-dyad";
import { showSuccess, showError } from '../utils/toast';
import { reportService } from '../services/reportService';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { getUnitByCategory } from '../utils/report-helpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";

const categories: string[] = [
  "semua", "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
];

const Index = () => {
  const navigate = useNavigate();
  const { profile, session, loading: authLoading, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrintCategory, setSelectedPrintCategory] = useState("semua");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    }
  }, [session, authLoading, navigate]);

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
      showError("Gagal memuat data dari database");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Hapus laporan ini secara permanen dari database?")) {
      try {
        await reportService.deleteReport(id);
        setReports(reports.filter(r => r.id !== id));
        showSuccess("Laporan berhasil dihapus");
      } catch (error) {
        showError("Gagal menghapus laporan");
      }
    }
  };

  const handleExportExcel = () => {
    if (reports.length === 0) {
      showError("Tidak ada data untuk diekspor");
      return;
    }

    const data = reports.map((r, index) => {
      return {
        "No": index + 1,
        "Tanggal": r.date,
        "Kategori / Tim": r.category,
        "Uraian Kegiatan": r.description,
        "Lokasi (Jalan)": r.location.street,
        "Kelurahan": r.location.village,
        "Kecamatan": r.location.subDistrict,
        "Volume": r.volume,
        "Satuan": getUnitByCategory(r.category),
        "Koordinator": r.personnel.coordinator,
        "Jumlah Anggota": r.personnel.members,
        "Keterangan": r.remarks || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Laporan");
    XLSX.writeFile(wb, `Rekap_Laporan_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess("Rekap Excel berhasil diunduh");
  };

  const handlePrintAction = () => {
    setIsPrintDialogOpen(false);
    navigate(`/print-rekap?category=${selectedPrintCategory}`);
  };

  const filteredReports = reports.filter(report => {
    const search = searchQuery.toLowerCase();
    return (
      report.description.toLowerCase().includes(search) ||
      report.location.street.toLowerCase().includes(search) ||
      report.category?.toLowerCase().includes(search)
    );
  });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Sistem Laporan</h1>
              <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600">
                {profile?.role === 'admin' ? 'Administrator' : profile?.category}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {profile?.role === 'admin' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                  <Users className="h-4 w-4 mr-2" /> User
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/monthly-rekap')} className="bg-purple-50 text-purple-700 border-purple-200">
                <FileBarChart className="h-4 w-4 mr-2" /> Rekap Bulanan
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsPrintDialogOpen(true)} className="bg-slate-50 text-slate-700 border-slate-200">
                <Printer className="h-4 w-4 mr-2" /> Cetak Harian
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-green-50 text-green-700 border-green-200">
                <Table className="h-4 w-4 mr-2" /> Excel
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 rounded-full border-blue-200 bg-blue-50 text-blue-600">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-bold hidden sm:inline">{profile?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 px-3">
                  <p className="text-xs font-bold">{profile?.username}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{profile?.category}</p>
                </div>
                <DropdownMenuSeparator />
                <div className="md:hidden">
                  <DropdownMenuItem onClick={() => navigate('/monthly-rekap')}>
                    <FileBarChart className="h-4 w-4 mr-2" /> Rekap Bulanan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPrintDialogOpen(true)}>
                    <Printer className="h-4 w-4 mr-2" /> Cetak Harian
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <Table className="h-4 w-4 mr-2" /> Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem onClick={signOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => navigate('/create')} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Laporan Baru</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari laporan..." className="pl-10 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">Memuat data...</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">Belum ada laporan untuk kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500" onClick={() => navigate(`/report/${report.id}`)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center text-[10px] text-slate-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(report.date).toLocaleDateString('id-ID')}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/edit/${report.id}`); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={(e) => handleDelete(e, report.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{report.description}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                    <span className="line-clamp-1">{report.location.street}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center text-[10px]">
                    <span className="font-bold">Vol: {report.volume} {getUnitByCategory(report.category)}</span>
                    <span className="text-blue-600 font-bold flex items-center">Detail <Eye className="ml-1 h-3 w-3" /></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cetak Rekap Laporan</DialogTitle>
            <DialogDescription>Pilih kategori laporan yang ingin dicetak.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedPrintCategory} defaultValue={selectedPrintCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat === 'semua' ? 'Semua Kategori' : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handlePrintAction} className="w-full bg-blue-600">Buka Preview Cetak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MadeWithDyad />
    </div>
  );
};

export default Index;