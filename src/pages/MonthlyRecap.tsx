"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { reportService } from '@/services/reportService';
import { getUnitByCategory } from '@/utils/report-helpers';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const MonthlyRecap = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedCategory, setSelectedCategory] = useState("semua");

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      let data = await reportService.getAllReports();
      
      data = data.filter(r => {
        const reportDate = new Date(r.date);
        const m = (reportDate.getMonth() + 1).toString();
        const y = reportDate.getFullYear().toString();
        
        const matchMonth = m === selectedMonth;
        const matchYear = y === selectedYear;
        const matchCategory = selectedCategory === "semua" || r.category === selectedCategory;
        
        return matchMonth && matchYear && matchCategory;
      });
      
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setReports(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kategori</SelectItem>
                <SelectItem value="Taman Kota">Taman Kota</SelectItem>
                <SelectItem value="Taman Amplas">Taman Amplas</SelectItem>
                <SelectItem value="Taman Area">Taman Area</SelectItem>
                <SelectItem value="Tim Babat">Tim Babat</SelectItem>
                <SelectItem value="Tim Siram">Tim Siram</SelectItem>
                <SelectItem value="Tim Pohon">Tim Pohon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Rekap
          </Button>
        </div>
      </div>

      <div className="print-area bg-white p-8 mx-auto shadow-lg border min-h-[297mm]">
        <div className="text-center border-b-4 border-double border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase">Pemerintah Kota Medan</h1>
          <h2 className="text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2>
          <p className="text-sm italic">Jl. Sidorame No.12, Kec. Medan Perjuangan, Kota Medan, Sumatera Utara</p>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-lg font-bold underline uppercase">REKAPITULASI LAPORAN KEGIATAN HARIAN</h3>
          <p className="font-medium">Bulan: {months[parseInt(selectedMonth)-1]} {selectedYear}</p>
          {selectedCategory !== "semua" && <p className="font-bold">Kategori: {selectedCategory.toUpperCase()}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-[10px] table-fixed">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-1 w-[25px]" rowSpan={2}>No</th>
                <th className="border-2 border-black p-1 w-[80px]" rowSpan={2}>Hari / Tgl</th>
                <th className="border-2 border-black p-1 w-[130px]" rowSpan={2}>Uraian Kegiatan</th>
                <th className="border-2 border-black p-1 w-[150px]" rowSpan={2}>Lokasi</th>
                <th className="border-2 border-black p-1" colSpan={3}>Dokumentasi</th>
                <th className="border-2 border-black p-1 w-[60px]" rowSpan={2}>Vol</th>
                <th className="border-2 border-black p-1 w-[80px]" rowSpan={2}>Peralatan</th>
                <th className="border-2 border-black p-1 w-[80px]" rowSpan={2}>Alat Berat</th>
                <th className="border-2 border-black p-1 w-[105px]" colSpan={3}>BBM (Liter)</th>
                <th className="border-2 border-black p-1 w-[80px]" rowSpan={2}>Koordinator</th>
                <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Keterangan</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-1 w-[210px]">0%</th>
                <th className="border-2 border-black p-1 w-[210px]">50%</th>
                <th className="border-2 border-black p-1 w-[210px]">100%</th>
                <th className="border-2 border-black p-1 text-[8px] w-[35px]">P</th>
                <th className="border-2 border-black p-1 text-[8px] w-[35px]">D</th>
                <th className="border-2 border-black p-1 text-[8px] w-[35px]">S</th>
              </tr>
            </thead>
            <tbody>
              {reports.length > 0 ? reports.map((r, idx) => {
                const firstTask = r.tasks?.[0];
                return (
                  <tr key={r.id}>
                    <td className="border-2 border-black p-1 text-center align-top">{idx + 1}</td>
                    <td className="border-2 border-black p-1 text-center align-top whitespace-normal break-words">
                      {new Date(r.date).toLocaleDateString('id-ID', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="border-2 border-black p-1 align-top whitespace-normal break-words">{r.description}</td>
                    <td className="border-2 border-black p-1 align-top whitespace-normal break-words">
                      {`${r.location.street}, ${r.location.village}, ${r.location.subDistrict}`}
                    </td>
                    <td className="border-2 border-black p-0.5 align-middle">
                      <div className="w-full h-[260px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {firstTask?.photos?.zero ? <img src={firstTask.photos.zero} className="w-full h-full object-cover" alt="0%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-0.5 align-middle">
                      <div className="w-full h-[260px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {firstTask?.photos?.fifty ? <img src={firstTask.photos.fifty} className="w-full h-full object-cover" alt="50%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-0.5 align-middle">
                      <div className="w-full h-[260px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {firstTask?.photos?.hundred ? <img src={firstTask.photos.hundred} className="w-full h-full object-cover" alt="100%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-1 text-center font-bold align-top">
                      {r.volume} {getUnitByCategory(r.category)}
                    </td>
                    <td className="border-2 border-black p-1 align-top text-[9px]">
                      {r.equipment?.map((e, i) => (
                        <div key={i} className="mb-1 border-b border-slate-200 last:border-0 pb-1">
                          {e.type} ({e.quantity})
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-1 align-top text-[9px]">
                      {r.heavyEquipment?.map((he, i) => (
                        <div key={i} className="mb-1 border-b border-slate-200 last:border-0 pb-1">
                          {he.type} ({he.quantity})
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-1 text-center align-top">{r.fuel?.pertamax || 0}</td>
                    <td className="border-2 border-black p-1 text-center align-top">{r.fuel?.dexlite || 0}</td>
                    <td className="border-2 border-black p-1 text-center align-top">{r.fuel?.solar || 0}</td>
                    <td className="border-2 border-black p-1 text-center align-top whitespace-normal break-words">{r.personnel.coordinator}</td>
                    <td className="border-2 border-black p-1 align-top whitespace-normal break-words">{r.remarks || "-"}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={15} className="border-2 border-black p-8 text-center text-slate-400 italic">Tidak ada data laporan untuk periode ini</td>
                </tr>
              )}
            </tbody>
            {reports.length > 0 && (
              <tfoot className="font-bold bg-slate-50">
                <tr>
                  <td colSpan={10} className="border-2 border-black p-1 text-right">TOTAL PENGGUNAAN BBM</td>
                  <td className="border-2 border-black p-1 text-center">{reports.reduce((acc, r) => acc + (r.fuel?.pertamax || 0), 0)}</td>
                  <td className="border-2 border-black p-1 text-center">{reports.reduce((acc, r) => acc + (r.fuel?.dexlite || 0), 0)}</td>
                  <td className="border-2 border-black p-1 text-center">{reports.reduce((acc, r) => acc + (r.fuel?.solar || 0), 0)}</td>
                  <td colSpan={2} className="border-2 border-black p-1"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Bidang / Kasi</p>
            <div className="h-24"></div>
            <p className="font-bold underline">( ............................................ )</p>
            <p>NIP. ............................................</p>
          </div>
          <div className="text-center">
            <p>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Dibuat Oleh,</p>
            <div className="h-24"></div>
            <p className="font-bold underline">( ............................................ )</p>
            <p>Koordinator Lapangan</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { 
            box-shadow: none !important; 
            border: none !important; 
            padding: 0 !important; 
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            zoom: 0.52;
          }
          @page { 
            size: A3 landscape; 
            margin: 0.5cm;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}} />
    </div>
  );
};

export default MonthlyRecap;