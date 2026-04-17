"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { reportService } from '@/services/reportService';
import { getUnitByCategory } from '@/utils/report-helpers';
import { ArrowLeft, Printer, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/AuthContext';

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const MonthlyRecap = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Default category berdasarkan profil user jika bukan admin
  const [selectedCategory, setSelectedCategory] = useState("semua");

  useEffect(() => {
    if (profile) {
      if (profile.role !== 'admin' && profile.category) {
        setSelectedCategory(profile.category);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [selectedMonth, selectedYear, selectedCategory, profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Gunakan service untuk ambil data, filter kategori dilakukan di sisi klien untuk rekap ini
      let data = await reportService.getAllReports();
      
      data = data.filter(r => {
        const reportDate = new Date(r.date);
        const m = (reportDate.getMonth() + 1).toString();
        const y = reportDate.getFullYear().toString();
        
        const matchMonth = m === selectedMonth;
        const matchYear = y === selectedYear;
        
        // Logika Filter Kategori:
        // 1. Jika admin, ikuti pilihan dropdown (bisa "semua")
        // 2. Jika user, paksa hanya kategori timnya sendiri
        let matchCategory = false;
        if (profile?.role === 'admin') {
          matchCategory = selectedCategory === "semua" || r.category === selectedCategory;
        } else {
          matchCategory = r.category === profile?.category;
        }
        
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

  const flatTasks = reports.flatMap((report, reportIdx) => 
    report.tasks.map((task, taskIdx) => ({
      ...task,
      reportId: report.id,
      reportDate: report.date,
      reportCategory: report.category,
      reportRemarks: report.remarks,
      isFirstInReport: taskIdx === 0,
      taskCount: report.tasks.length,
      displayIdx: reportIdx + 1
    }))
  );

  const isUserRestricted = profile?.role !== 'admin';

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
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

            <div className="relative">
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
                disabled={isUserRestricted}
              >
                <SelectTrigger className={`w-[180px] ${isUserRestricted ? 'bg-slate-50 text-slate-500' : ''}`}>
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
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
              {isUserRestricted && (
                <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 p-1 rounded-full border border-amber-200 shadow-sm" title="Akses Terbatas">
                  <Lock size={10} />
                </div>
              )}
            </div>
          </div>

          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Rekap A3
          </Button>
        </div>
      </div>

      <div className="print-area bg-white p-10 mx-auto shadow-lg border min-h-[297mm] w-full max-w-[420mm]">
        <div className="text-center border-b-4 border-double border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase">Pemerintah Kota Medan</h1>
          <h2 className="text-3xl font-black uppercase">Dinas Lingkungan Hidup</h2>
          <p className="text-sm italic">Jl. Sidorame No.12, Kec. Medan Perjuangan, Kota Medan, Sumatera Utara</p>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-xl font-bold underline uppercase">LAPORAN BULANAN PEKERJAAN TAMAN, PENGHIJAUAN, POHON DAN PEMBABATAN</h3>
          <p className="text-lg font-medium">Bulan: {months[parseInt(selectedMonth)-1]} {selectedYear}</p>
          <p className="text-lg font-bold uppercase">WILAYAH 4 MEDAN KOTA</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-[11px] table-fixed">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-2 w-[35px]" rowSpan={2}>No</th>
                <th className="border-2 border-black p-2 w-[100px]" rowSpan={2}>Hari / Tgl</th>
                <th className="border-2 border-black p-2 w-[140px]" rowSpan={2}>Uraian Kegiatan</th>
                <th className="border-2 border-black p-2 w-[180px]" rowSpan={2}>Lokasi</th>
                <th className="border-2 border-black p-2" colSpan={3}>Dokumentasi</th>
                <th className="border-2 border-black p-2 w-[70px]" rowSpan={2}>Vol</th>
                <th className="border-2 border-black p-2 w-[100px]" rowSpan={2}>Peralatan</th>
                <th className="border-2 border-black p-2 w-[180px]" rowSpan={2}>Alat Berat</th>
                <th className="border-2 border-black p-2 w-[120px]" colSpan={3}>BBM (Liter)</th>
                <th className="border-2 border-black p-2 w-[100px]" rowSpan={2}>Koordinator</th>
                <th className="border-2 border-black p-2 w-[120px]" rowSpan={2}>Keterangan</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-1 w-[110px]">0%</th>
                <th className="border-2 border-black p-1 w-[110px]">50%</th>
                <th className="border-2 border-black p-1 w-[110px]">100%</th>
                <th className="border-2 border-black p-1 text-[9px] w-[40px]">P</th>
                <th className="border-2 border-black p-1 text-[9px] w-[40px]">D</th>
                <th className="border-2 border-black p-1 text-[9px] w-[40px]">S</th>
              </tr>
            </thead>
            <tbody>
              {flatTasks.length > 0 ? flatTasks.map((task, idx) => {
                const villages = Array.isArray(task.location.village) 
                  ? task.location.village.join(", ") 
                  : task.location.village;
                
                return (
                  <tr key={`${task.reportId}-${idx}`}>
                    {task.isFirstInReport ? (
                      <>
                        <td className="border-2 border-black p-2 text-center align-top font-bold" rowSpan={task.taskCount}>{task.displayIdx}</td>
                        <td className="border-2 border-black p-2 text-center align-top font-medium" rowSpan={task.taskCount}>
                          {new Date(task.reportDate).toLocaleDateString('id-ID', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </td>
                      </>
                    ) : null}
                    
                    <td className="border-2 border-black p-2 align-top whitespace-normal break-words leading-tight">{task.description}</td>
                    <td className="border-2 border-black p-2 align-top whitespace-normal break-words leading-tight">
                      {`${task.location.street}, ${villages}, ${task.location.subDistrict}`}
                    </td>
                    <td className="border-2 border-black p-1 align-middle">
                      <div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {task.photos?.zero ? <img src={task.photos.zero} className="w-full h-full object-cover" alt="0%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-1 align-middle">
                      <div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {task.photos?.fifty ? <img src={task.photos.fifty} className="w-full h-full object-cover" alt="50%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-1 align-middle">
                      <div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {task.photos?.hundred ? <img src={task.photos.hundred} className="w-full h-full object-cover" alt="100%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-2 text-center font-bold align-top">
                      {task.volume} {getUnitByCategory(task.reportCategory)}
                    </td>
                    <td className="border-2 border-black p-2 align-top text-[10px]">
                      {task.equipment?.map((e, i) => (
                        <div key={i} className="mb-1 border-b border-slate-200 last:border-0 pb-1">
                          {e.type} ({e.quantity})
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-2 align-top text-[10px] overflow-hidden">
                      {task.heavyEquipment?.map((he, i) => (
                        <div key={i} className="mb-1 border-b border-slate-200 last:border-0 pb-1 whitespace-nowrap">
                          {he.type} {he.vehicle || ""}
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-2 align-top text-[10px] text-center">
                      {task.heavyEquipment?.map((he, i) => (
                        <div key={i} className="mb-1 border-b border-slate-200 last:border-0 pb-1">
                          {he.fuel?.pertamax || 0}
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-2 align-top text-[10px] text-center">
                      {task.heavyEquipment?.map((he, i) => (
                        <div key={i} className="mb-1 border-b border-slate-200 last:border-0 pb-1">
                          {he.fuel?.dexlite || 0}
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-2 align-top text-[10px] text-center">
                      {task.heavyEquipment?.map((he, i) => (
                        <div key={i} className="mb-1 border-b border-slate-200 last:border-0 pb-1">
                          {he.fuel?.solar || 0}
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-2 text-center align-top font-medium">{task.personnel.coordinator}</td>
                    
                    {task.isFirstInReport ? (
                      <td className="border-2 border-black p-2 align-top whitespace-normal break-words italic" rowSpan={task.taskCount}>
                        {task.reportRemarks || "-"}
                      </td>
                    ) : null}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={15} className="border-2 border-black p-12 text-center text-slate-400 italic text-lg">Tidak ada data laporan untuk periode ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-20 text-base">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Bidang / Kasi</p>
            <div className="h-32"></div>
            <p className="font-bold underline text-lg">( ............................................ )</p>
            <p>NIP. ............................................</p>
          </div>
          <div className="text-center">
            <p>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Dibuat Oleh,</p>
            <div className="h-32"></div>
            <p className="font-bold underline text-lg">( ............................................ )</p>
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
          }
          @page { 
            size: A3 landscape; 
            margin: 1.5cm;
          }
          table { 
            page-break-inside: auto; 
            width: 100% !important;
          }
          tr { 
            page-break-inside: avoid; 
            page-break-after: auto; 
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}} />
    </div>
  );
};

export default MonthlyRecap;