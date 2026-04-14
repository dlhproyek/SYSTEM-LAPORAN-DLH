"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, Trash2, MapPin, Calendar, Users, Fuel, HardHat, FileText, CheckCircle2, FileDown, Table } from 'lucide-react';
import { Report } from '@/types/report';
import { showSuccess, showError } from '@/utils/toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  const exportToPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Laporan_${report?.category}_${report?.date}.pdf`);
      showSuccess("PDF berhasil diunduh");
    } catch (error) {
      showError("Gagal membuat PDF");
    }
  };

  const exportToExcel = () => {
    if (!report) return;

    const data = [
      ["LAPORAN KEGIATAN HARIAN"],
      ["ID Laporan", report.id],
      ["Tanggal", report.date],
      ["Kategori", report.category],
      ["Koordinator", report.personnel.coordinator],
      ["Jumlah Anggota", report.personnel.members],
      [""],
      ["DAFTAR KEGIATAN"],
      ["No", "Uraian", "Jalan", "Kelurahan", "Kecamatan"]
    ];

    report.tasks?.forEach((task, index) => {
      data.push([
        index + 1,
        task.description,
        task.location.street,
        task.location.village,
        task.location.subDistrict
      ]);
    });

    data.push([""]);
    data.push(["VOLUME PEKERJAAN", report.volume]);
    data.push(["BBM PERTAMAX", report.fuel.pertamax]);
    data.push(["BBM DEXLITE", report.fuel.dexlite]);
    data.push(["BBM SOLAR", report.fuel.solar]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_${report.category}_${report.date}.xlsx`);
    showSuccess("Excel berhasil diunduh");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!report) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportToExcel} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
              <Table className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={exportToPDF} className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
              <FileDown className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </Button>
          </div>
        </div>

        <div id="report-content" className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none print:border-none">
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">LAPORAN KEGIATAN HARIAN</h1>
              <p className="opacity-90">{report.category} | ID: {report.id.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {report.tasks && report.tasks.length > 0 ? (
              <section>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" /> Daftar Kegiatan & Lokasi
                </h2>
                <div className="space-y-4">
                  {report.tasks.map((task, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Kegiatan #{i+1}</p>
                        <p className="font-medium text-slate-900">{task.description}</p>
                      </div>
                      <div className="flex items-start gap-2 md:w-1/2">
                        <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-1" />
                        <div className="text-sm">
                          <p className="font-medium">{task.location.street}</p>
                          <p className="text-slate-500">Kel. {task.location.village}, Kec. {task.location.subDistrict}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
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
                        <p className="font-medium">{report.location?.street}</p>
                        <p className="text-slate-600">Kel. {report.location?.village}, Kec. {report.location?.subDistrict}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="print:break-inside-avoid">
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">Dokumentasi Foto</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: '0%', img: report.photos.zero },
                  { label: '50%', img: report.photos.fifty },
                  { label: '100%', img: report.photos.hundred }
                ].map((p, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-center text-xs font-bold text-slate-500">{p.label}</p>
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border flex items-center justify-center">
                      {p.img ? <img src={p.img} alt={p.label} className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs">Tidak ada foto</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

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
                          <span className="font-bold">{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Personil</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-xs text-slate-500">Koordinator</p>
                        <p className="text-sm font-bold">{report.personnel.coordinator}</p>
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
                            <span className="font-bold">{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-slate-400 italic">Tidak ada penggunaan alat berat</p>}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Bahan Bakar</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500">Pertamax</p>
                        <p className="font-bold text-[10px]">{formatCurrency(report.fuel.pertamax)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500">Dexlite</p>
                        <p className="font-bold">{report.fuel.dexlite} L</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border text-center">
                        <p className="text-[10px] text-slate-500">Solar</p>
                        <p className="font-bold">{report.fuel.solar} L</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="bg-slate-50 p-4 rounded-lg border border-dashed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Volume Pekerjaan</p>
                  <p className="text-xl font-bold text-blue-700">{report.volume}</p>
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

export default ReportDetail;