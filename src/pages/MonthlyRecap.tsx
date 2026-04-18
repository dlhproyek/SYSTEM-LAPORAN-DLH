"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { reportService } from '@/services/reportService';
import { getUnitByCategory } from '@/utils/report-helpers';
import { ArrowLeft, Printer, Lock, Fuel, FileText, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const allCategories = [
  "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
];

type RecapMode = "with-fuel" | "without-fuel";

const MonthlyRecap = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [recapMode, setRecapMode] = useState<RecapMode>("without-fuel");
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      if (profile.role !== 'admin' && profile.category) {
        setSelectedCategories([profile.category]);
      } else {
        setSelectedCategories(['semua']);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (profile && selectedCategories.length > 0) {
      loadData();
    }
  }, [selectedMonth, selectedYear, selectedCategories, profile]);

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
        
        let matchCategory = false;
        if (profile?.role === 'admin') {
          if (selectedCategories.includes('semua')) {
            matchCategory = true;
          } else {
            matchCategory = selectedCategories.includes(r.category);
          }
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

  const toggleCategory = (category: string) => {
    if (category === 'semua') {
      setSelectedCategories(['semua']);
      return;
    }

    let newSelected = [...selectedCategories].filter(c => c !== 'semua');
    if (newSelected.includes(category)) {
      newSelected = newSelected.filter(c => c !== category);
    } else {
      newSelected.push(category);
    }

    if (newSelected.length === 0) {
      setSelectedCategories(['semua']);
    } else {
      setSelectedCategories(newSelected);
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    role="combobox" 
                    disabled={isUserRestricted}
                    className={cn(
                      "w-[220px] justify-between font-normal",
                      isUserRestricted && "bg-slate-50 text-slate-500"
                    )}
                  >
                    <span className="truncate">
                      {selectedCategories.includes('semua') 
                        ? "Semua Kategori" 
                        : selectedCategories.length > 1 
                          ? `${selectedCategories.length} Kategori Terpilih` 
                          : selectedCategories[0]}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <div className="p-2 space-y-1">
                    <div 
                      className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md cursor-pointer"
                      onClick={() => toggleCategory('semua')}
                    >
                      <Checkbox checked={selectedCategories.includes('semua')} />
                      <label className="text-sm font-medium leading-none cursor-pointer">Semua Kategori</label>
                    </div>
                    <div className="h-px bg-slate-200 my-1" />
                    {allCategories.map((cat) => (
                      <div 
                        key={cat} 
                        className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md cursor-pointer"
                        onClick={() => toggleCategory(cat)}
                      >
                        <Checkbox checked={selectedCategories.includes(cat)} />
                        <label className="text-sm font-medium leading-none cursor-pointer">{cat}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {isUserRestricted && (
                <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 p-1 rounded-full border border-amber-200 shadow-sm" title="Akses Terbatas">
                  <Lock size={10} />
                </div>
              )}
            </div>

            <Select value={recapMode} onValueChange={(v) => setRecapMode(v as RecapMode)}>
              <SelectTrigger className="w-[200px] bg-blue-50 border-blue-200 text-blue-700 font-medium">
                <SelectValue placeholder="Mode Rekap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="with-fuel">
                  <div className="flex items-center gap-2"><Fuel size={14} /> Rekap Dengan BBM</div>
                </SelectItem>
                <SelectItem value="without-fuel">
                  <div className="flex items-center gap-2"><FileText size={14} /> Rekap Tanpa BBM</div>
                </SelectItem>
              </SelectContent>
            </Select>
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
          <p className="text-sm italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
        </div>

        <div className="text-center mb-8 space-y-1">
          <h3 className="text-xl font-bold underline uppercase">LAPORAN BULANAN PEKERJAAN TAMAN, PENGHIJAUAN, POHON DAN PEMBABATAN</h3>
          <p className="text-xl font-bold uppercase">WILAYAH 4 MEDAN KOTA</p>
          <p className="text-xl font-bold uppercase">Bulan: {months[parseInt(selectedMonth)-1]} {selectedYear}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-[11px] table-fixed">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-2 w-[35px]" rowSpan={2}>No</th>
                <th className="border-2 border-black p-2 w-[70px]" rowSpan={2}>Hari / Tgl</th>
                <th className="border-2 border-black p-2 w-[110px]" rowSpan={2}>Uraian Kegiatan</th>
                <th className="border-2 border-black p-2 w-[150px]" rowSpan={2}>Lokasi</th>
                <th className="border-2 border-black p-2" colSpan={3}>Dokumentasi</th>
                <th className="border-2 border-black p-2 w-[65px]" rowSpan={2}>Vol</th>
                <th className="border-2 border-black p-2 w-[115px]" rowSpan={2}>Peralatan</th>
                <th className="border-2 border-black p-2 w-[115px]" rowSpan={2}>Alat Berat</th>
                {recapMode === "with-fuel" && (
                  <th className="border-2 border-black p-2 w-[120px]" colSpan={3}>BBM (Liter)</th>
                )}
                <th className="border-2 border-black p-2 w-[100px]" rowSpan={2}>Koordinator</th>
                <th className="border-2 border-black p-2 w-[170px]" rowSpan={2}>Keterangan</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-1 w-[142px]">0%</th>
                <th className="border-2 border-black p-1 w-[142px]">50%</th>
                <th className="border-2 border-black p-1 w-[142px]">100%</th>
                {recapMode === "with-fuel" && (
                  <>
                    <th className="border-2 border-black p-1 text-[9px] w-[40px]">P</th>
                    <th className="border-2 border-black p-1 text-[9px] w-[40px]">D</th>
                    <th className="border-2 border-black p-1 text-[9px] w-[40px]">S</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {flatTasks.length > 0 ? flatTasks.map((task, idx) => {
                const villages = Array.isArray(task.location.village) 
                  ? task.location.village.join(", ") 
                  : task.location.village;
                
                return (
                  <tr key={`${task.reportId}-${idx}`} className="page-break-avoid">
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
                        {task.photos?.zero ? <img src={task.photos.zero} className="w-full h-full object-fill" alt="0%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-1 align-middle">
                      <div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {task.photos?.fifty ? <img src={task.photos.fifty} className="w-full h-full object-fill" alt="50%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-1 align-middle">
                      <div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">
                        {task.photos?.hundred ? <img src={task.photos.hundred} className="w-full h-full object-fill" alt="100%" /> : null}
                      </div>
                    </td>
                    <td className="border-2 border-black p-2 text-center font-bold align-top">
                      {task.volume} {getUnitByCategory(task.reportCategory)}
                    </td>
                    <td className="border-2 border-black p-1.5 align-top text-[10px] leading-tight">
                      {task.equipment?.map((e, i) => (
                        <div key={i} className="mb-0.5 whitespace-nowrap">
                          • {e.type} ({e.quantity})
                        </div>
                      ))}
                    </td>
                    <td className="border-2 border-black p-1.5 align-top text-[10px] leading-tight overflow-hidden">
                      {task.heavyEquipment?.map((he, i) => (
                        <div key={i} className="mb-0.5 whitespace-nowrap">
                          • {he.type} {he.vehicle || ""}
                        </div>
                      ))}
                    </td>
                    {recapMode === "with-fuel" && (
                      <>
                        <td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">
                          {task.heavyEquipment?.map((he, i) => (
                            <div key={i} className="mb-0.5">
                              {he.fuel?.pertamax || 0}
                            </div>
                          ))}
                        </td>
                        <td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">
                          {task.heavyEquipment?.map((he, i) => (
                            <div key={i} className="mb-0.5">
                              {he.fuel?.dexlite || 0}
                            </div>
                          ))}
                        </td>
                        <td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">
                          {task.heavyEquipment?.map((he, i) => (
                            <div key={i} className="mb-0.5">
                              {he.fuel?.solar || 0}
                            </div>
                          ))}
                        </td>
                      </>
                    )}
                    <td className="border-2 border-black p-2 text-center align-top font-medium">{task.personnel.coordinator}</td>
                    
                    <td className="border-2 border-black p-2 align-top whitespace-normal break-words italic">
                      {task.remarks && <div className="mb-1 text-slate-700">{task.remarks}</div>}
                      {task.isFirstInReport && task.reportRemarks && (
                        <div className="text-blue-700 font-medium border-t border-slate-200 mt-1 pt-1">
                          Catatan: {task.reportRemarks}
                        </div>
                      )}
                      {!task.remarks && (!task.isFirstInReport || !task.reportRemarks) && "-"}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={recapMode === "with-fuel" ? 15 : 12} className="border-2 border-black p-12 text-center text-slate-400 italic text-lg">Tidak ada data laporan untuk periode ini</td>
                </tr>
              )}
            </tbody>
            {/* Footer Tabel untuk Keterangan Bersambung */}
            <tfoot className="continuation-footer">
              <tr>
                <td colSpan={recapMode === "with-fuel" ? 15 : 12} className="border-none p-2 text-right italic text-[10px] font-bold text-slate-500">
                  Bersambung ke halaman berikutnya...
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bagian Tanda Tangan - Diberi background putih dan z-index agar menutupi footer tfoot di halaman terakhir */}
        <div className="signature-section mt-16 grid grid-cols-2 gap-20 text-base relative bg-white z-10">
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
          .page-break-avoid { 
            page-break-inside: avoid !important; 
            break-inside: avoid !important;
          }
          thead { display: table-header-group; }
          
          /* Menampilkan tfoot di setiap akhir halaman cetak */
          tfoot.continuation-footer { 
            display: table-footer-group; 
          }
          
          /* Trik untuk menyembunyikan tfoot di halaman terakhir: 
             Bagian tanda tangan akan menutupi area footer karena z-index dan background putih */
          .signature-section {
            page-break-inside: avoid;
            margin-top: 2cm;
          }
        }
      `}} />
    </div>
  );
};

export default MonthlyRecap;