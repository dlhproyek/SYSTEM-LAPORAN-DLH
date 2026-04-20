"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { reportService } from '@/services/reportService';
import { getUnitByCategory } from '@/utils/report-helpers';
import { ArrowLeft, Printer, Fuel, FileText, ChevronsUpDown, Table, Image as ImageIcon, LogOut, LogIn, CloudUpload, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/lib/supabase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import DriveUploadDialog from '@/components/DriveUploadDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const allCategories = [
  "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
];

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

type RecapMode = "with-fuel" | "without-fuel";

const MonthlyRecap = () => {
  const navigate = useNavigate();
  const { session, profile, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDriveDialogOpen, setIsDriveDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [recapMode, setRecapMode] = useState<RecapMode>("without-fuel");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const printRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!session;

  useEffect(() => {
    if (isLoggedIn && profile) {
      if (profile.role !== 'admin' && profile.category) {
        setSelectedCategories([profile.category]);
      } else {
        setSelectedCategories(['semua']);
      }
    } else {
      // Default untuk publik: Semua Kategori
      setSelectedCategories(['semua']);
    }
  }, [profile, isLoggedIn]);

  useEffect(() => {
    if (selectedCategories.length > 0) {
      loadData();
    }
  }, [selectedMonth, selectedYear, selectedCategories]);

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
        if (!isLoggedIn || profile?.role === 'admin') {
          matchCategory = selectedCategories.includes('semua') || selectedCategories.includes(r.category);
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

  const handleLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      try {
        await signOut();
        navigate('/login');
      } catch (error) {
        showError("Gagal keluar");
      }
    }
  };

  const handleDriveUpload = async (config: { fileName: string; folderId: string; accessToken: string }) => {
    if (!printRef.current) return;
    
    const toastId = showLoading("Menyiapkan PDF Multi-Halaman A3...");
    
    try {
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1600,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage('a3', 'landscape');
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      const { error } = await supabase.functions.invoke('upload-to-drive', {
        body: { 
          pdfBase64, 
          fileName: config.fileName.endsWith('.pdf') ? config.fileName : `${config.fileName}.pdf`,
          folderId: config.folderId,
          userAccessToken: config.accessToken
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error(error);
      throw error;
    } finally {
      dismissToast(toastId);
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

  const handleExportExcel = async () => {
    if (flatTasks.length === 0) {
      showError("Tidak ada data untuk diekspor");
      return;
    }
    const toastId = showLoading("Sedang menyiapkan file Excel dengan foto...");
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Laporan');
      const columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Hari / Tgl', key: 'date', width: 15 },
        { header: 'Uraian Kegiatan', key: 'desc', width: 30 },
        { header: 'Lokasi', key: 'loc', width: 40 },
        { header: '0%', key: 'p0', width: 22 },
        { header: '50%', key: 'p50', width: 22 },
        { header: '100%', key: 'p100', width: 22 },
        { header: 'Vol', key: 'vol', width: 10 },
        { header: 'Peralatan', key: 'eq', width: 25 },
        { header: 'Alat Berat', key: 'he', width: 25 },
      ];
      if (recapMode === "with-fuel") {
        columns.push({ header: 'P', key: 'fp', width: 6 }, { header: 'D', key: 'fd', width: 6 }, { header: 'S', key: 'fs', width: 6 });
      }
      columns.push({ header: 'Koordinator', key: 'coord', width: 20 }, { header: 'Keterangan', key: 'rem', width: 35 });
      worksheet.columns = columns;
      worksheet.mergeCells('A1:M1');
      const title1 = worksheet.getCell('A1');
      title1.value = 'PEMERINTAH KOTA MEDAN';
      title1.font = { bold: true, size: 14 };
      title1.alignment = { horizontal: 'center' };
      worksheet.mergeCells('A2:M2');
      const title2 = worksheet.getCell('A2');
      title2.value = 'DINAS LINGKUNGAN HIDUP';
      title2.font = { bold: true, size: 16 };
      title2.alignment = { horizontal: 'center' };
      worksheet.mergeCells('A3:M3');
      const title3 = worksheet.getCell('A3');
      title3.value = 'LAPORAN BULANAN PEKERJAAN TAMAN, PENGHIJAUAN, POHON DAN PEMBABATAN';
      title3.font = { bold: true, underline: true };
      title3.alignment = { horizontal: 'center' };
      worksheet.mergeCells('A4:M4');
      const title4 = worksheet.getCell('A4');
      title4.value = `BULAN: ${months[parseInt(selectedMonth)-1].toUpperCase()} ${selectedYear}`;
      title4.font = { bold: true };
      title4.alignment = { horizontal: 'center' };
      worksheet.addRow([]);
      worksheet.addRow([]);
      const headerRow1 = worksheet.addRow(columns.map(c => c.header));
      headerRow1.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
      });
      for (const task of flatTasks) {
        const villages = Array.isArray(task.location.village) ? task.location.village.join(", ") : task.location.village;
        const rowData: any = {
          no: task.isFirstInReport ? task.displayIdx : '',
          date: task.isFirstInReport ? new Date(task.reportDate).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' }) : '',
          desc: task.description,
          loc: `${task.location.street}, ${villages}`,
          vol: `${task.volume} ${getUnitByCategory(task.reportCategory)}`,
          eq: task.equipment?.map(e => `${e.type} (${e.quantity})`).join("\n"),
          he: task.heavyEquipment?.map(he => `${he.type} ${he.vehicle || ""}`).join("\n"),
          coord: task.personnel.coordinator,
          rem: [task.remarks, task.isFirstInReport ? task.reportRemarks : ""].filter(Boolean).join(" | ")
        };
        if (recapMode === "with-fuel") {
          rowData.fp = task.heavyEquipment?.reduce((acc, he) => acc + (he.fuel?.pertamax || 0), 0) || 0;
          rowData.fd = task.heavyEquipment?.reduce((acc, he) => acc + (he.fuel?.dexlite || 0), 0) || 0;
          rowData.fs = task.heavyEquipment?.reduce((acc, he) => acc + (he.fuel?.solar || 0), 0) || 0;
        }
        const row = worksheet.addRow(rowData);
        row.height = 120;
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
        const addImageToCell = async (url: string, colIndex: number) => {
          if (!url) return;
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const imageId = workbook.addImage({ buffer: arrayBuffer, extension: 'jpeg' });
            worksheet.addImage(imageId, { tl: { col: colIndex - 1, row: row.number - 1 }, ext: { width: 150, height: 150 }, editAs: 'oneCell' });
          } catch (e) { console.error(e); }
        };
        await addImageToCell(task.photos.zero, 5);
        await addImageToCell(task.photos.fifty, 6);
        await addImageToCell(task.photos.hundred, 7);
      }
      const addLogoToExcel = async (url: string, col: number, row: number) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return;
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const imageId = workbook.addImage({ buffer: arrayBuffer, extension: 'jpeg' });
          worksheet.addImage(imageId, { tl: { col: col, row: row }, ext: { width: 60, height: 60 }, editAs: 'oneCell' });
        } catch (e) { console.error(e); }
      };
      await addLogoToExcel(LOGO_MEDAN_URL, 0, 0);
      await addLogoToExcel(LOGO_DLH_URL, columns.length - 1, 0);
      worksheet.addRow([]);
      const signRow = worksheet.addRow([]);
      worksheet.mergeCells(`K${signRow.number}:M${signRow.number}`);
      worksheet.getCell(`K${signRow.number}`).value = `Medan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      worksheet.getCell(`K${signRow.number}`).alignment = { horizontal: 'center' };
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Rekap_A3_DLH_${months[parseInt(selectedMonth)-1]}_${selectedYear}.xlsx`);
      dismissToast(toastId);
      showSuccess("Rekap Excel berhasil diunduh");
    } catch (error) {
      console.error(error);
      dismissToast(toastId);
      showError("Gagal membuat file Excel");
    }
  };

  const toggleCategory = (category: string) => {
    if (category === 'semua') { setSelectedCategories(['semua']); return; }
    let newSelected = [...selectedCategories].filter(c => c !== 'semua');
    if (newSelected.includes(category)) { newSelected = newSelected.filter(c => c !== category); }
    else { newSelected.push(category); }
    if (newSelected.length === 0) { setSelectedCategories(['semua']); }
    else { setSelectedCategories(newSelected); }
  };

  const isUserRestricted = isLoggedIn && profile?.role !== 'admin';
  const showSignatory4 = selectedCategories.includes('semua') || selectedCategories.some(c => ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram"].includes(c));
  const showSignatory5 = selectedCategories.includes('semua') || selectedCategories.includes("Tim Pohon");

  const headerStyle = { backgroundColor: '#f1f5f9', color: '#000000', fontWeight: 'bold', textAlign: 'center' as const, verticalAlign: 'middle' as const };
  const subHeaderStyle = { backgroundColor: '#f8fafc', color: '#000000', fontWeight: 'bold', textAlign: 'center' as const, verticalAlign: 'middle' as const };

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            {isLoggedIn ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"><LogOut className="h-5 w-5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Keluar Sistem</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="text-blue-600 border-blue-600">
                <LogIn className="mr-2 h-4 w-4" /> Masuk
              </Button>
            )}
          </div>
          
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
                  <Button variant="outline" role="combobox" disabled={isUserRestricted} className={cn("w-[220px] justify-between font-normal", isUserRestricted && "bg-slate-50 text-slate-500")}>
                    <span className="truncate">{selectedCategories.includes('semua') ? "Semua Kategori" : selectedCategories.length > 1 ? `${selectedCategories.length} Kategori Terpilih` : selectedCategories[0]}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <div className="p-2 space-y-1">
                    <div className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md cursor-pointer" onClick={() => toggleCategory('semua')}><Checkbox checked={selectedCategories.includes('semua')} /><label className="text-sm font-medium leading-none cursor-pointer">Semua Kategori</label></div>
                    <div className="h-px bg-slate-200 my-1" />
                    {allCategories.map((cat) => (<div key={cat} className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md cursor-pointer" onClick={() => toggleCategory(cat)}><Checkbox checked={selectedCategories.includes(cat)} /><label className="text-sm font-medium leading-none cursor-pointer">{cat}</label></div>))}
                  </div>
                </PopoverContent>
              </Popover>
              {isUserRestricted && <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 p-1 rounded-full border border-amber-200 shadow-sm"><Lock size={10} /></div>}
            </div>
            <Select value={recapMode} onValueChange={(v) => setRecapMode(v as RecapMode)}>
              <SelectTrigger className="w-[200px] bg-blue-50 border-blue-200 text-blue-700 font-medium"><SelectValue placeholder="Mode Rekap" /></SelectTrigger>
              <SelectContent><SelectItem value="with-fuel"><div className="flex items-center gap-2"><Fuel size={14} /> Rekap Dengan BBM</div></SelectItem><SelectItem value="without-fuel"><div className="flex items-center gap-2"><FileText size={14} /> Rekap Tanpa BBM</div></SelectItem></SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <Button onClick={() => setIsDriveDialogOpen(true)} disabled={reports.length === 0} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <CloudUpload className="mr-2 h-4 w-4" /> Simpan ke Drive
              </Button>
            )}
            <Button onClick={handleExportExcel} variant="outline" className="bg-green-50 text-green-700 border-green-200"><Table className="mr-2 h-4 w-4" /> Rekap Excel</Button>
            <Button onClick={() => window.print()} className="bg-blue-600"><Printer className="mr-2 h-4 w-4" /> Cetak Rekap A3</Button>
          </div>
        </div>
      </div>

      <DriveUploadDialog 
        isOpen={isDriveDialogOpen}
        onClose={() => setIsDriveDialogOpen(false)}
        onUpload={handleDriveUpload}
        defaultFileName={`Rekap_${months[parseInt(selectedMonth)-1]}_${selectedYear}`}
      />

      <div ref={printRef} className="print-area bg-white p-10 mx-auto shadow-lg border min-h-[297mm] w-full max-w-[420mm]">
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden"><img src={LOGO_MEDAN_URL} className="max-h-full max-w-full object-contain" alt="Logo Medan" /></div>
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-3xl font-black uppercase">Dinas LIngkungan Hidup</h2>
            <p className="text-sm italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden"><img src={LOGO_DLH_URL} className="max-h-full max-w-full object-contain" alt="Logo DLH" /></div>
        </div>

        <div className="text-center mb-8 space-y-1">
          <h3 className="text-xl font-bold underline uppercase">LAPORAN BULANAN PEKERJAAN TAMAN, PENGHIJAUAN, POHON DAN PEMBABATAN</h3>
          <p className="text-xl font-bold uppercase">WILAYAH 4 MEDAN KOTA</p>
          <p className="text-xl font-bold uppercase">Bulan: {months[parseInt(selectedMonth)-1]} {selectedYear}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-[11px] table-fixed">
            <thead>
              <tr style={{ height: '40px' }}>
                <th style={headerStyle} className="border-2 border-black p-2 w-[35px]" rowSpan={2}><div className="flex items-center justify-center h-full">No</div></th>
                <th style={headerStyle} className="border-2 border-black p-2 w-[70px]" rowSpan={2}><div className="flex items-center justify-center h-full">Hari / Tgl</div></th>
                <th style={headerStyle} className="border-2 border-black p-2 w-[110px]" rowSpan={2}><div className="flex items-center justify-center h-full">Uraian Kegiatan</div></th>
                <th style={headerStyle} className="border-2 border-black p-2 w-[150px]" rowSpan={2}><div className="flex items-center justify-center h-full">Lokasi</div></th>
                <th style={headerStyle} className="border-2 border-black p-2" colSpan={3}>Dokumentasi</th>
                <th style={headerStyle} className="border-2 border-black p-2 w-[65px]" rowSpan={2}><div className="flex items-center justify-center h-full">Vol</div></th>
                <th style={headerStyle} className="border-2 border-black p-2 w-[115px]" rowSpan={2}><div className="flex items-center justify-center h-full">Peralatan</div></th>
                <th style={headerStyle} className="border-2 border-black p-2 w-[115px]" rowSpan={2}><div className="flex items-center justify-center h-full">Alat Berat</div></th>
                {recapMode === "with-fuel" && (<th style={headerStyle} className="border-2 border-black p-2 w-[120px]" colSpan={3}>BBM (Liter)</th>)}
                <th style={headerStyle} className="border-2 border-black p-2 w-[100px]" rowSpan={2}><div className="flex items-center justify-center h-full">Koordinator</div></th>
                <th style={headerStyle} className="border-2 border-black p-2 w-[170px]" rowSpan={2}><div className="flex items-center justify-center h-full">Keterangan</div></th>
              </tr>
              <tr style={{ height: '30px' }}>
                <th style={subHeaderStyle} className="border-2 border-black p-1 w-[142px]">0%</th>
                <th style={subHeaderStyle} className="border-2 border-black p-1 w-[142px]">50%</th>
                <th style={subHeaderStyle} className="border-2 border-black p-1 w-[142px]">100%</th>
                {recapMode === "with-fuel" && (<><th style={subHeaderStyle} className="border-2 border-black p-1 text-[9px] w-[40px]">P</th><th style={subHeaderStyle} className="border-2 border-black p-1 text-[9px] w-[40px]">D</th><th style={subHeaderStyle} className="border-2 border-black p-1 text-[9px] w-[40px]">S</th></>)}
              </tr>
            </thead>
            <tbody>
              {flatTasks.length > 0 ? flatTasks.map((task, idx) => {
                const villages = Array.isArray(task.location.village) ? task.location.village.join(", ") : task.location.village;
                return (
                  <tr key={`${task.reportId}-${idx}`}>
                    {task.isFirstInReport ? (<><td className="border-2 border-black p-2 text-center align-top font-bold" rowSpan={task.taskCount}>{task.displayIdx}</td><td className="border-2 border-black p-2 text-center align-top font-medium" rowSpan={task.taskCount}>{new Date(task.reportDate).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td></>) : null}
                    <td className="border-2 border-black p-2 align-top whitespace-normal break-words leading-tight">{task.description}</td>
                    <td className="border-2 border-black p-2 align-top whitespace-normal break-words leading-tight">{`${task.location.street}, ${villages}, ${task.location.subDistrict}`}</td>
                    <td className="border-2 border-black p-1 align-middle"><div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">{task.photos?.zero ? <img src={task.photos.zero} className="w-full h-full object-fill" alt="0%" /> : null}</div></td>
                    <td className="border-2 border-black p-1 align-middle"><div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">{task.photos?.fifty ? <img src={task.photos.fifty} className="w-full h-full object-fill" alt="50%" /> : null}</div></td>
                    <td className="border-2 border-black p-1 align-middle"><div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">{task.photos?.hundred ? <img src={task.photos.hundred} className="w-full h-full object-fill" alt="100%" /> : null}</div></td>
                    <td className="border-2 border-black p-2 text-center font-bold align-top">{task.volume} {getUnitByCategory(task.reportCategory)}</td>
                    <td className="border-2 border-black p-1.5 align-top text-[10px] leading-tight">{task.equipment?.map((e, i) => (<div key={i} className="mb-0.5 whitespace-nowrap">• {e.type} ({e.quantity})</div>))}</td>
                    <td className="border-2 border-black p-1.5 align-top text-[10px] leading-tight overflow-hidden">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5 whitespace-nowrap">• {he.type} {he.vehicle || ""}</div>))}</td>
                    {recapMode === "with-fuel" && (<><td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5">{he.fuel?.pertamax || 0}</div>))}</td><td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5">{he.fuel?.dexlite || 0}</div>))}</td><td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5">{he.fuel?.solar || 0}</div>))}</td></>)}
                    <td className="border-2 border-black p-2 text-center align-top font-medium">{task.personnel.coordinator}</td>
                    <td className="border-2 border-black p-2 align-top whitespace-normal break-words italic">{task.remarks && <div className="mb-1 text-slate-700">{task.remarks}</div>}{task.isFirstInReport && task.reportRemarks && (<div className="text-blue-700 font-medium border-t border-slate-200 mt-1 pt-1">Catatan: {task.reportRemarks}</div>)}{!task.remarks && (!task.isFirstInReport || !task.reportRemarks) && "-"}</td>
                  </tr>
                );
              }) : (<tr><td colSpan={recapMode === "with-fuel" ? 15 : 12} className="border-2 border-black p-12 text-center text-slate-400 italic text-lg">Tidak ada data laporan untuk periode ini</td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="mt-12">
          <div className="flex justify-end mb-4 text-[11px]"><p className="w-1/4 text-center">Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
          <div className="grid grid-cols-4 gap-4 text-[11px] leading-tight">
            <div className="text-center flex flex-col justify-between h-48"><div><p>Mengetahui :</p><p className="font-bold">Kabid Tata Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Heni Rustati, ST, M.Si</p><p>NIP. 19720223 200604 2 002</p></div></div>
            <div className="text-center flex flex-col justify-between h-48"><div><p>Diketahui :</p><p className="font-bold">Ketua Tim Pemeliharaan Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p><p>NIP. 19811128 201001 2 011</p></div></div>
            <div className="text-center flex flex-col justify-between h-48"><div><p>Diketahui :</p><p className="font-bold">Pengawas Taman Penghijauan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Jhosua Sibarani, S.T</p><p>NIP. 19740907 200903 1 002</p></div></div>
            <div className="text-center flex flex-col justify-between h-48"><div><p>Diketahui :</p>{showSignatory4 && !showSignatory5 && (<><p className="font-bold">Kepala Koordinator Taman</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}{showSignatory5 && !showSignatory4 && (<><p className="font-bold">Kepala Koordinator Tim Pohon</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}{showSignatory4 && showSignatory5 && (<><p className="font-bold">Koordinator Taman & Tim Pohon</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}</div><div>{showSignatory4 && !showSignatory5 && (<><p className="font-bold underline">Tiurmaida Silitonga</p><p>NIP. 19690507 200701 2 042</p></>)}{showSignatory5 && !showSignatory4 && (<><p className="font-bold underline">Ardiansyah Siregar</p><p>NIP. 19860404 201001 1 015</p></>)}{showSignatory4 && showSignatory5 && (<div className="flex justify-around gap-2"><div><p className="font-bold underline">Tiurmaida Silitonga</p><p className="text-[9px]">NIP. 19690507 200701 2 042</p></div><div><p className="font-bold underline">Ardiansyah Siregar</p><p className="text-[9px]">NIP. 19860404 201001 1 015</p></div></div>)}</div></div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          @page { size: A3 landscape; margin: 1.5cm; }
          table { page-break-inside: auto; width: 100% !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}} />
    </div>
  );
};

export default MonthlyRecap;