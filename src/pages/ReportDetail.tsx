"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, Trash2, MapPin, Calendar, Users, Fuel, HardHat, Truck } from 'lucide-react';
import { Report } from '@/types/report';
import { showSuccess, showError } from '@/utils/toast';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const found = reports.find((r: Report) => r.id === id);
    if (found) {
      setReport(found);
    } else {
      showError("Laporan tidak ditemukan");
      navigate('/');
    }
  }, [id, navigate]);

  const handleDelete = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus laporan ini?")) {
      const reports = JSON.parse(localStorage.getItem('reports') || '[]');
      const filtered = reports.filter((r: Report) => r.id !== id);
      localStorage.setItem('reports', JSON.stringify(filtered));
      showSuccess("Laporan berhasil dihapus");
      navigate('/');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!report) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Actions - Hidden on Print */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </Button>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none print:border-none">
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">LAPORAN KEGIATAN HARIAN</h1>
              <p className="opacity-90">ID Laporan: {report.id.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Section 1: Description & Location */}
            <section>
              <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> Uraian & Lokasi
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Kegiatan</p>
                  <p className="text-lg mt-1">{report.description}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Lokasi</p>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-medium">{report.location.street}</p>
                      <p className="text-slate-600">Kel. {report.location.village}, Kec. {report.location.subDistrict}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Photos */}
            <section className="print:break-inside-avoid">
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">Dokumentasi Foto</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-center text-xs font-bold text-slate-500">0%</p>
                  <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border flex items-center justify-center">
                    {report.photos.zero ? <img src={report.photos.zero} alt="0%" className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs">Tidak ada foto</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-center text-xs font-bold text-slate-500">50%</p>
                  <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border flex items-center justify-center">
                    {report.photos.fifty ? <img src={report.photos.fifty} alt="50%" className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs">Tidak ada foto</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-center text-xs font-bold text-slate-500">100%</p>
                  <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border flex items-center justify-center">
                    {report.photos.hundred ? <img src={report.photos.hundred} alt="100%" className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs">Tidak ada foto</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Resources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                  <HardHat className="h-5 w-5 text-purple-600" /> Peralatan & Personil
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Peralatan</p>
                    <ul className="divide-y border rounded-lg">
                      {report.equipment.map((item, i) => (
                        <li key={i} className="p-2 flex justify-between text-sm">
                          <span>{item.type}</span>
                          <span className="font-bold">{item.quantity} Unit</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Personil</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-xs text-slate-500">Koordinator</p>
                        <p className="text-lg font-bold">{report.personnel.coordinator}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-xs text-slate-500">Anggota</p>
                        <p className="text-lg font-bold">{report.personnel.members}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-yellow-600" /> Alat Berat & BBM
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Alat Berat</p>
                    {report.heavyEquipment.length > 0 ? (
                      <ul className="divide-y border rounded-lg">
                        {report.heavyEquipment.map((item, i) => (
                          <li key={i} className="p-2 flex justify-between text-sm">
                            <span>{item.type}</span>
                            <span className="font-bold">{item.quantity} Unit</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-slate-400 italic">Tidak ada penggunaan alat berat</p>}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Bahan Bakar (Liter)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500">Pertamax</p>
                        <p className="font-bold">{report.fuel.pertamax}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500">Dexlite</p>
                        <p className="font-bold">{report.fuel.dexlite}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500">Solar</p>
                        <p className="font-bold">{report.fuel.solar}</p>
                      </div>
                    </div>
                    {report.fuel.remarks && (
                      <p className="text-xs mt-2 text-slate-600 italic">Ket: {report.fuel.remarks}</p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Section 4: Volume & Remarks */}
            <section className="bg-slate-50 p-4 rounded-lg border border-dashed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Volume Pekerjaan</p>
                  <p className="text-xl font-bold text-blue-700">{report.volume} {report.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Keterangan Tambahan</p>
                  <p className="text-sm mt-1">{report.remarks || "-"}</p>
                </div>
              </div>
            </section>
          </div>
          
          <div className="bg-slate-100 p-4 text-center text-[10px] text-slate-400 uppercase tracking-widest">
            Dicetak pada: {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  );
};

import { FileText } from 'lucide-react';
export default ReportDetail;