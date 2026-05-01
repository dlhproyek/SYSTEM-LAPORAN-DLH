"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Calendar, MapPin, Fuel, Trash2, Edit, 
  Search, FilterX, ArrowLeft, RefreshCw, Truck, User, ChevronRight
} from 'lucide-react';
import { FuelReport } from '@/types/fuelReport';
import { fuelService } from '@/services/fuelService';
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from "@/components/ui/input";

const FuelReportList = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin && profile) {
      showError("Akses ditolak. Hanya Administrator yang dapat mengakses halaman ini.");
      navigate('/');
      return;
    }
    loadReports();
  }, [profile]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus laporan ini?")) return;
    try {
      await fuelService.deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      showSuccess("Laporan dihapus");
    } catch (error) {
      showError("Gagal menghapus");
    }
  };

  const filteredReports = reports.filter(r => 
    r.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.location.street.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Beranda</Button>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Fuel className="text-orange-600" /> Laporan BBM & Oli</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadReports} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} size={18} /></Button>
            <Button onClick={() => navigate('/fuel-reports/create')} className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> Input Baru</Button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari tim, wilayah, atau lokasi..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="ghost" onClick={() => setSearchQuery("")}><FilterX className="mr-2 h-4 w-4" /> Reset</Button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Memuat data...</div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-all border-l-4 border-l-orange-500">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center text-[10px] text-slate-500 font-medium"><Calendar className="h-3 w-3 mr-1" /> {report.date}</div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{report.region}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => navigate(`/fuel-reports/edit/${report.id}`)}><Edit size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(report.id)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{report.team}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">
                      {report.location.street}
                      {report.location.village && report.location.village !== " " && `, ${report.location.village}`}
                    </span>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Daftar Pemakaian ({report.items?.length || 0})</p>
                    {report.items?.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{item.vehicle_operator}</span>
                          <span className="text-slate-500">{item.fuel_type}</span>
                        </div>
                        <span className="font-black text-orange-700">
                          {item.fuel_type === 'Oli' ? `${item.amount} L` : `Rp ${item.amount.toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    ))}
                    {report.items?.length > 2 && (
                      <p className="text-[10px] text-center text-blue-600 font-medium italic">+{report.items.length - 2} item lainnya...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            Tidak ada laporan ditemukan
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelReportList;