"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, MapPin, Calendar, Users, Fuel, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess } from '@/utils/toast';

const Index = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
    setReports(savedReports);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Hapus laporan ini?")) {
      const updated = reports.filter(r => r.id !== id);
      localStorage.setItem('reports', JSON.stringify(updated));
      setReports(updated);
      showSuccess("Laporan dihapus");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="text-white h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Sistem Laporan Kegiatan</h1>
          </div>
          <Button onClick={() => navigate('/create')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Laporan Baru
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-700">Daftar Laporan Terkini</h2>
          <p className="text-sm text-slate-500">{reports.length} Laporan ditemukan</p>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Belum ada laporan</h3>
            <p className="text-slate-500 mt-1">Mulai dengan membuat laporan kegiatan pertama Anda.</p>
            <Button onClick={() => navigate('/create')} variant="outline" className="mt-6">
              Buat Laporan Sekarang
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <Card 
                key={report.id} 
                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-4 border-l-blue-500 relative"
                onClick={() => navigate(`/report/${report.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center text-sm text-slate-500 mb-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">{report.description}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                    <span className="line-clamp-2">{report.location.street}, {report.location.village}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-slate-50 p-2 rounded flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium">{report.personnel.coordinator + report.personnel.members} Orang</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs font-medium">{report.fuel.pertamax + report.fuel.dexlite + report.fuel.solar} L</span>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between items-center border-t text-xs">
                    <span className="text-slate-400">Vol: {report.volume} {report.unit}</span>
                    <div className="flex items-center text-blue-600 font-medium">
                      Lihat Detail <Eye className="ml-1 h-3 w-3" />
                    </div>
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