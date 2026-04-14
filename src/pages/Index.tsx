"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, FileText, MapPin, Calendar, Users, Fuel, 
  Trash2, Eye, Search, Edit, Cloud, CloudOff, Tag, Table 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess } from '@/utils/toast';
import { useSync } from '@/hooks/use-sync';
import * as XLSX from 'xlsx';
import { getUnitByCategory } from '@/utils/report-helpers';

const Index = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { isOnline } = useSync();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
    setReports(savedReports);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Hapus laporan ini?")) {
      const updated = reports.filter(r => r.id !== id);
      localStorage.setItem('reports', JSON.stringify(updated));
      setReports(updated);
      showSuccess("Laporan dihapus");
    }
  };

  const handleExportExcel = () => {
    if (reports.length === 0) return;

    // Menyiapkan Header Judul
    const header = [
      ["REKAPITULASI LAPORAN KEGIATAN HARIAN"],
      ["DINAS LINGKUNGAN HIDUP KOTA MEDAN"],
      ["Tanggal Cetak: " + new Date().toLocaleDateString('id-ID')],
      [], // Baris kosong
      [
        "NO", 
        "HARI / TANGGAL", 
        "KATEGORI / TIM", 
        "URAIAN KEGIATAN", 
        "LOKASI (JALAN)", 
        "KELURAHAN", 
        "KECAMATAN", 
        "VOLUME", 
        "SATUAN", 
        "KOORDINATOR", 
        "ANGGOTA", 
        "PERTAMAX (RP)", 
        "DEXLITE (L)", 
        "SOLAR (L)",
        "KETERANGAN"
      ]
    ];

    // Menyiapkan Data
    const rows = reports.map((r, index) => [
      index + 1,
      new Date(r.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      r.category,
      r.description,
      r.location.street,
      r.location.village,
      r.location.subDistrict,
      r.volume,
      getUnitByCategory(r.category),
      r.personnel.coordinator,
      r.personnel.members,
      r.fuel.pertamax,
      r.fuel.dexlite,
      r.fuel.solar,
      r.remarks || "-"
    ]);

    // Menggabungkan Header dan Data
    const worksheetData = [...header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Mengatur lebar kolom (opsional tapi membantu tampilan)
    const wscols = [
      { wch: 5 },  // NO
      { wch: 25 }, // TANGGAL
      { wch: 15 }, // KATEGORI
      { wch: 40 }, // URAIAN
      { wch: 30 }, // JALAN
      { wch: 20 }, // KELURAHAN
      { wch: 20 }, // KECAMATAN
      { wch: 10 }, // VOLUME
      { wch: 10 }, // SATUAN
      { wch: 20 }, // KOORDINATOR
      { wch: 10 }, // ANGGOTA
      { wch: 15 }, // PERTAMAX
      { wch: 12 }, // DEXLITE
      { wch: 12 }, // SOLAR
      { wch: 30 }  // KETERANGAN
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Laporan");
    
    // Download file
    XLSX.writeFile(wb, `Rekap_Laporan_DLH_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess("Rekap Excel berhasil diunduh");
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

  const stats = {
    total: reports.length,
    totalFuel: reports.reduce((acc, r) => acc + (r.fuel?.pertamax || 0) + (r.fuel?.dexlite || 0) + (r.fuel?.solar || 0), 0),
    totalPersonnel: reports.reduce((acc, r) => acc + (r.personnel?.coordinator ? 1 : 0) + (r.personnel?.members || 0), 0),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg"><FileText className="text-white h-6 w-6" /></div>
              <h1 className="text-xl font-bold text-slate-900 hidden md:block">Sistem Laporan</h1>
            </div>
            <Badge variant={isOnline ? "outline" : "destructive"} className="flex gap-1 items-center">
              {isOnline ? <><Cloud className="h-3 w-3 text-green-500" /> Online</> : <><CloudOff className="h-3 w-3" /> Offline</>}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="hidden sm:flex bg-green-50 text-green-700 border-green-200">
              <Table className="h-4 w-4 mr-2" /> Rekap Excel
            </Button>
            <Button onClick={() => navigate('/create')} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Laporan Baru
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full text-blue-600"><FileText className="h-6 w-6" /></div>
              <div><p className="text-sm text-slate-500">Total Laporan</p><p className="text-2xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><Fuel className="h-6 w-6" /></div>
              <div><p className="text-sm text-slate-500">Total BBM</p><p className="text-2xl font-bold">{stats.totalFuel} L</p></div>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-cyan-100 p-3 rounded-full text-cyan-600"><Users className="h-6 w-6" /></div>
              <div><p className="text-sm text-slate-500">Total Personil</p><p className="text-2xl font-bold">{stats.totalPersonnel}</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari uraian, lokasi, atau kategori..." className="pl-10 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <p className="text-sm text-slate-500">{filteredReports.length} Laporan ditemukan</p>
        </div>

        {filteredReports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Tidak ada laporan</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <Card key={report.id} className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-4 border-l-blue-500 relative" onClick={() => navigate(`/report/${report.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm text-slate-500"><Calendar className="h-3 w-3 mr-1" />{new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <Badge variant="outline" className="w-fit text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200"><Tag className="h-2 w-2 mr-1" /> {report.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.syncStatus === 'pending' ? <Badge variant="secondary" className="text-[10px] h-5">Pending</Badge> : <Cloud className="h-3 w-3 text-green-500" />}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); navigate(`/edit/${report.id}`); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={(e) => handleDelete(e, report.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-lg line-clamp-1 group-hover:text-blue-600 transition-colors mt-2">
                    {report.category === "Tim Siram" && report.tasks ? `${report.tasks.length} Lokasi Penyiraman` : report.description}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                    <span className="line-clamp-2">
                      {report.category === "Tim Siram" && report.tasks?.[0] 
                        ? `${report.tasks[0].location.street} (+${report.tasks.length - 1} lainnya)` 
                        : `${report.location.street}, ${report.location.village}`}
                    </span>
                  </div>
                  <div className="pt-3 flex justify-between items-center border-t text-xs">
                    <span className="text-slate-400">Vol: {report.volume} {getUnitByCategory(report.category)}</span>
                    <div className="flex items-center text-blue-600 font-medium">Lihat Detail <Eye className="ml-1 h-3 w-3" /></div>
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