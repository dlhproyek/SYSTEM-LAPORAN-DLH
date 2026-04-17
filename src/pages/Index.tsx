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
      const lokasiJalan = r.category === "Tim Siram" && r.tasks 
        ? r.tasks.map(t => t.location.street).join(", ")
        : r.location.street;

      return {
        "No": index + 1,
        "Tanggal": r.date,
        "Kategori / Tim": r.category,
        "Uraian Kegiatan": r.description,
        "Lokasi (Jalan)": lokasiJalan,
        "Kelurahan": r.location.village,
        "Kecamatan": r.location.subDistrict,
        "Volume": r.volume,
        "Satuan": getUnitByCategory(r.category),
        "Koordinator": r.personnel.coordinator,
        "Jumlah Anggota": r.personnel.members,
        "BBM Pertamax (L)": r.fuel?.pertamax || 0,
        "BBM Dexlite (L)": r.fuel?.dexlite || 0,
        "BBM Solar (L)": r.fuel?.solar || 0,
        "Keterangan": r.remarks || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wscols = [
      {wch: 5}, {wch: 12}, {wch: 15}, {wch: 30}, {wch: 30}, 
      {wch: 15}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 20}, 
      {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Laporan");
    const fileName = `Rekap_Laporan_DLH_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showSuccess("Rekap Excel berhasil diunduh");
  };

  const handlePrintAction = () => {
    setIsPrintDialogOpen(false);
    navigate(`/print-rekap?category=${selectedPrintCategory}`);
  };

  const filteredReports = reports.filter(report => {
    const search = searchQuery.toLowerCase();
    const inTasks = report.tasks?.some(t => 
      t.description.toLowerCase().includes(search) || 
      t.location.street.toLowerCase().includes(search)
    );
    return (
      report.description.toLowerCase().includes(search) ||
      report.location.street.toLowerCase().includes(search) ||
      report.category?.toLowerCase().includes(search) ||
      inTasks
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

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
                {profile && (
                  <Badge variant="secondary" className="text-[8px] md:text-[10px] py-0 h-4 bg-blue-50 text-blue-600 border-blue-100">
                    {profile.role === 'admin' ? 'Administrator' : profile.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol-tombol ini sekarang muncul mulai dari ukuran tablet (md) */}
            <div className="hidden md:flex items-center gap-2">
              {profile?.role === 'admin' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')} className="bg-blue-50 text-blue-700 border-blue-200">
                  <Users className="h-4 w-4 mr-2" /> Manajemen User
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={() => navigate('/monthly-rekap')} className="bg-purple-50 text-purple-700 border-purple-200">
                <FileBarChart className="h-4 w-4 mr-2" /> Rekap Bulanan
              </Button>

              <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-slate-50 text-slate-700 border-slate-200">
                    <Printer className="h-4 w-4 mr-2" /> Cetak Harian
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
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
                          <SelectItem key={cat} value={cat}>
                            {cat === 'semua' ? 'Semua Kategori' : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button onClick={handlePrintAction} className="w-full bg-blue-600">Buka Preview Cetak</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-green-50 text-green-700 border-green-200">
                <Table className="h-4 w-4 mr-2" /> Rekap Excel
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
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{profile?.role === 'admin' ? 'Administrator' : profile?.category}</p>
                </div>
                <DropdownMenuSeparator />
                {/* Menu ini hanya muncul di HP (di bawah ukuran tablet) */}
                <div className="md:hidden">
                  {profile?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                      <Users className="h-4 w-4 mr-2 text-blue-600" /> Manajemen User
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/monthly-rekap')}>
                    <FileBarChart className="h-4 w-4 mr-2 text-purple-600" /> Rekap Bulanan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPrintDialogOpen(true)}>
                    <Printer className="h-4 w-4 mr-2 text-slate-600" /> Cetak Harian
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <Table className="h-4 w-4 mr-2 text-green-600" /> Rekap Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="h-4 w-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => navigate('/create')} size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 px-3 md:px-4">
              <Plus className="md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Laporan Baru</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Card className="bg-white border-none shadow-sm max-w-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600"><FileText className="h-5 w-5" /></div>
              <div><p className="text-[10px] uppercase font-bold text-slate-400">Total Laporan</p><p className="text-lg font-bold">{reports.length}</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari uraian, lokasi, atau kategori..." className="pl-10 bg-white h-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <p className="text-xs text-slate-500 self-start md:self-center">{filteredReports.length} Laporan ditemukan</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Memuat data dari cloud...</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Tidak ada laporan</h3>
            <p className="text-sm text-slate-500 mt-1">
              {profile?.role === 'user' ? `Menampilkan laporan untuk kategori: ${profile.category}` : 'Belum ada data laporan.'}
            </p>
          </div>
        ) : (
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
                      <Badge variant="outline" className="w-fit text-[9px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                        <Tag className="h-2 w-2 mr-1" /> {report.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); navigate(`/edit/${report.id}`); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={(e) => handleDelete(e, report.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base line-clamp-1 group-hover:text-blue-600 transition-colors mt-2">
                    {report.category === "Tim Siram" && report.tasks ? `${report.tasks.length} Lokasi Penyiraman` : report.description}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
                    <span className="line-clamp-2">
                      {report.category === "Tim Siram" && report.tasks?.[0] 
                        ? `${report.tasks[0].location.street} (+${report.tasks.length - 1} lainnya)` 
                        : `${report.location.street}, ${report.location.village}`}
                    </span>
                  </div>
                  <div className="pt-3 flex justify-between items-center border-t text-[10px]">
                    <span className="text-slate-400 font-medium">Vol: {report.volume} {getUnitByCategory(report.category)}</span>
                    <div className="flex items-center text-blue-600 font-bold">Detail <Eye className="ml-1 h-3 w-3" /></div>
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