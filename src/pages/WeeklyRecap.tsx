"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Report } from '@/types/report';
import { reportService } from '@/services/reportService';
import { getUnitByCategory, sortByCategory } from '@/utils/report-helpers';
import { 
  ArrowLeft, Printer, Fuel, FileText, ChevronsUpDown, 
  Table, LogOut, LogIn, CloudUpload, 
  Loader2, Lock, ChevronDown, Calendar as CalendarIcon,
  Image as ImageIcon, ImageOff, PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
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
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
type PhotoMode = "with-photo" | "without-photo";
type SignatureMode = "with-signature" | "without-signature";

const WeeklyRecap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, profile, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDriveDialogOpen, setIsDriveDialogOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [recapMode, setRecapMode] = useState<RecapMode>("without-fuel");
  const [photoMode, setPhotoMode] = useState<PhotoMode>("with-photo");
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("with-signature");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasSetDefaults, setHasSetDefaults] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!session;
  
  const isPimpinan = profile?.role === 'pimpinan' || (session?.user?.email === 'pimpinan@gmail.com');
  const isAdminHarian = profile?.role === 'admin_harian' || (session?.user?.email === 'sakinah@gmail.com');
  const isUserRestricted = isLoggedIn && profile?.role === 'user' && !isPimpinan && !isAdminHarian;

  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });

  useEffect(() => {
    if (profile && !hasSetDefaults) {
      if (isAdminHarian) {
        setPhotoMode("without-photo");
        setSignatureMode("without-signature");
      }
      setHasSetDefaults(true);
    }
  }, [profile, isAdminHarian, hasSetDefaults]);

  useEffect(() => {
    const catsParam = searchParams.get('categories');
    if (catsParam) {
      setSelectedCategories(catsParam.split(','));
    } else if (isLoggedIn && profile) {
      if (isUserRestricted && profile.category) {
        setSelectedCategories([profile.category]);
      } else {
        setSelectedCategories(['semua']);
      }
    } else {
      setSelectedCategories(['semua']);
    }
  }, [profile, isLoggedIn, isUserRestricted, searchParams]);

  useEffect(() => {
    if (selectedCategories.length > 0) {
      loadData();
    }
  }, [selectedDate, selectedCategories]);

  const loadData = async () => {
    try {
      setLoading(true);
      let data = await reportService.getAllReports();
      data = data.filter(r => {
        const reportDate = parseISO(r.date);
        const matchDate = isWithinInterval(reportDate, { start: weekStart, end: weekEnd });
        
        let matchCategory = false;
        if (!isLoggedIn || profile?.role === 'admin' || isPimpinan || isAdminHarian) {
          matchCategory = selectedCategories.includes('semua') || selectedCategories.includes(r.category);
        } else {
          matchCategory = r.category === profile?.category;
        }
        return matchDate && matchCategory;
      });
      
      data.sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return sortByCategory(a.category, b.category);
      });
      
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

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDriveUpload = async (config: { fileName: string; folderId: string; accessToken: string }) => {
    if (!printRef.current) return;
    const toastId = showLoading("Menyiapkan PDF A3...");
    try {
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      let currentY = margin;

      const headerEl = document.querySelector('.pdf-header') as HTMLElement;
      if (headerEl) {
        const canvas = await html2canvas(headerEl, { scale: 2, useCORS: true });
        const headerImg = canvas.toDataURL('image/jpeg', 0.95);
        const headerHeight = (canvas.height * contentWidth) / canvas.width;
        pdf.addImage(headerImg, 'JPEG', margin, currentY, contentWidth, headerHeight);
        currentY += headerHeight + 5;
      }

      const tableHeaderEl = document.querySelector('.pdf-table-header') as HTMLElement;
      let tableHeaderImg = "";
      let tableHeaderHeight = 0;
      if (tableHeaderEl) {
        const canvas = await html2canvas(tableHeaderEl, { scale: 2, useCORS: true });
        tableHeaderImg = canvas.toDataURL('image/jpeg', 0.95);
        tableHeaderHeight = (canvas.height * contentWidth) / canvas.width;
        pdf.addImage(tableHeaderImg, 'JPEG', margin, currentY, contentWidth, tableHeaderHeight);
        currentY += tableHeaderHeight;
      }

      const footerEl = document.querySelector('.pdf-footer') as HTMLElement;
      let footerImg = "";
      let footerHeight = 0;
      if (footerEl && signatureMode === "with-signature") {
        const canvas = await html2canvas(footerEl, { scale: 2, useCORS: true });
        footerImg = canvas.toDataURL('image/jpeg', 0.95);
        footerHeight = (canvas.height * contentWidth) / canvas.width;
      }

      const reportBlocks = document.querySelectorAll('.pdf-report-block');
      for (let i = 0; i < reportBlocks.length; i++) {
        const block = reportBlocks[i] as HTMLElement;
        const canvas = await html2canvas(block, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        const isLastBlock = i === reportBlocks.length - 1;
        if (isLastBlock && signatureMode === "with-signature") {
          if (currentY + imgHeight + footerHeight > pdfHeight - margin) {
            pdf.addPage('a3', 'landscape');
            currentY = margin;
            if (tableHeaderImg) {
              pdf.addImage(tableHeaderImg, 'JPEG', margin, currentY, contentWidth, tableHeaderHeight);
              currentY += tableHeaderHeight;
            }
          }
        } else {
          if (currentY + imgHeight > pdfHeight - margin - 20) {
            pdf.addPage('a3', 'landscape');
            currentY = margin;
            if (tableHeaderImg) {
              pdf.addImage(tableHeaderImg, 'JPEG', margin, currentY, contentWidth, tableHeaderHeight);
              currentY += tableHeaderHeight;
            }
          }
        }
        pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight);
        currentY += imgHeight;
      }

      if (footerImg && signatureMode === "with-signature") {
        if (currentY + footerHeight > pdfHeight - margin) {
          pdf.addPage('a3', 'landscape');
          currentY = margin;
        }
        pdf.addImage(footerImg, 'JPEG', margin, currentY, contentWidth, footerHeight);
      }
      
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const { data, error } = await supabase.functions.invoke('upload-to-drive', {
        body: { 
          pdfBase64, 
          fileName: config.fileName.endsWith('.pdf') ? config.fileName : `${config.fileName}.pdf`,
          folderId: config.folderId,
          userAccessToken: config.accessToken
        }
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error(error);
      showError("Gagal mengunggah: " + error.message);
      throw error;
    } finally {
      dismissToast(toastId);
    }
  };

  const handleExportExcel = async () => {
    if (reports.length === 0) {
      showError("Tidak ada data untuk diekspor");
      return;
    }
    const toastId = showLoading("Menyiapkan file Excel...");
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Mingguan');
      const columns: any[] = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Hari / Tgl', key: 'date', width: 15 },
        { header: 'Tim/Kec.', key: 'cat', width: 15 },
        { header: 'Uraian Kegiatan', key: 'desc', width: 30 },
        { header: 'Lokasi', key: 'loc', width: 40 },
      ];
      if (photoMode === "with-photo") {
        columns.push({ header: '0%', key: 'p0', width: 22 }, { header: '50%', key: 'p50', width: 22 }, { header: '100%', key: 'p100', width: 22 });
      }
      columns.push({ header: 'Vol', key: 'vol', width: 10 }, { header: 'Jenis Alat', key: 'eq_type', width: 20 }, { header: 'Jumlah Alat', key: 'eq_qty', width: 10 }, { header: 'Alat Berat', key: 'he', width: 25 });
      if (recapMode === "with-fuel") {
        columns.push({ header: 'P', key: 'fp', width: 6 }, { header: 'D', key: 'fd', width: 6 }, { header: 'S', key: 'fs', width: 6 });
      }
      columns.push({ header: 'Koordinator', key: 'coord', width: 20 }, { header: 'Anggota', key: 'members', width: 10 }, { header: 'Keterangan', key: 'rem', width: 35 });
      worksheet.columns = columns;
      const lastColLetter = String.fromCharCode(64 + columns.length);
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      worksheet.getCell('A1').value = 'PEMERINTAH KOTA MEDAN';
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      worksheet.mergeCells(`A2:${lastColLetter}2`);
      worksheet.getCell('A2').value = 'DINAS LINGKUNGAN HIDUP';
      worksheet.getCell('A2').font = { bold: true, size: 16 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      worksheet.addRow([]);
      const headerRow = worksheet.addRow(columns.map((c: any) => c.header));
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
      });
      let displayIdx = 1;
      for (const report of reports) {
        for (let i = 0; i < report.tasks.length; i++) {
          const task = report.tasks[i];
          const villages = Array.isArray(task.location.village) ? task.location.village.join(", ") : task.location.village;
          const rowData: any = {
            no: i === 0 ? displayIdx : '',
            date: i === 0 ? new Date(report.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' }) : '',
            cat: i === 0 ? report.category : '',
            desc: task.description,
            loc: `${task.location.street}, ${villages}`,
            vol: `${task.volume} ${getUnitByCategory(report.category)}`,
            eq_type: task.equipment?.map(e => e.type).join("\n"),
            eq_qty: task.equipment?.map(e => e.quantity).join("\n"),
            he: task.heavyEquipment?.map(he => `${he.type} ${he.vehicle || ""}`).join("\n"),
            coord: task.personnel.coordinator,
            members: task.personnel.members,
            rem: [task.remarks, i === 0 ? report.remarks : ""].filter(Boolean).join(" | ")
          };
          if (recapMode === "with-fuel") {
            rowData.fp = task.heavyEquipment?.reduce((acc, he) => acc + (he.fuel?.pertamax || 0), 0) || 0;
            rowData.fd = task.heavyEquipment?.reduce((acc, he) => acc + (he.fuel?.dexlite || 0), 0) || 0;
            rowData.fs = task.heavyEquipment?.reduce((acc, he) => acc + (he.fuel?.solar || 0), 0) || 0;
          }
          const row = worksheet.addRow(rowData);
          if (photoMode === "with-photo") row.height = 100;
          row.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', wrapText: true };
          });
          if (photoMode === "with-photo") {
            const addImageToCell = async (url: string, colIndex: number) => {
              if (!url) return;
              try {
                const response = await fetch(url);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const imageId = workbook.addImage({ buffer: arrayBuffer, extension: 'jpeg' });
                worksheet.addImage(imageId, { tl: { col: colIndex - 1, row: row.number - 1 }, ext: { width: 140, height: 130 }, editAs: 'oneCell' });
              } catch (e) { console.error(e); }
            };
            await addImageToCell(task.photos.zero, 6);
            await addImageToCell(task.photos.fifty, 7);
            await addImageToCell(task.photos.hundred, 8);
          }
        }
        displayIdx++;
      }
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Rekap_Mingguan_DLH_${format(weekStart, 'yyyy-MM-dd')}_sd_${format(weekEnd, 'yyyy-MM-dd')}.xlsx`);
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

  const showSignatory4 = selectedCategories.includes('semua') || selectedCategories.some(c => ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram"].includes(c));
  const showSignatory5 = selectedCategories.includes('semua') || selectedCategories.includes("Tim Pohon");

  const headerStyle = { backgroundColor: '#f1f5f9', color: '#000000', fontWeight: 'bold', textAlign: 'center' as const, verticalAlign: 'middle' as const };
  const subHeaderStyle = { backgroundColor: '#f8fafc', color: '#000000', fontWeight: 'bold', textAlign: 'center' as const, verticalAlign: 'middle' as const };

  const totalCols = 12 + (photoMode === "with-photo" ? 3 : 0) + (recapMode === "with-fuel" ? 3 : 0);

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 md:mr-2" /> 
              <span className="hidden md:inline">Kembali</span>
            </Button>
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
                <LogIn className="mr-2 h-4 w-4 md:mr-2" /> 
                <span className="hidden md:inline">Masuk</span>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <CalendarIcon className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-slate-400" />
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-7 md:pl-10 w-[130px] md:w-[180px] h-10 text-xs md:text-sm" />
              </div>
              <div className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-100 px-2 md:px-3 py-2 rounded-md border">
                {format(weekStart, 'dd MMM', { locale: localeId })} - {format(weekEnd, 'dd MMM yyyy', { locale: localeId })}
              </div>
            </div>
            <div className="relative">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" disabled={isUserRestricted} className={cn("w-[160px] md:w-[220px] justify-between font-normal h-10 text-xs md:text-sm", isUserRestricted && "bg-slate-50 text-slate-500")}>
                    <span className="truncate">{selectedCategories.includes('semua') ? "Semua Kategori" : selectedCategories.length > 1 ? `${selectedCategories.length} Kategori` : selectedCategories[0]}</span>
                    <ChevronsUpDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 shrink-0 opacity-50" />
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
            <Select value={photoMode} onValueChange={(v) => setPhotoMode(v as PhotoMode)}>
              <SelectTrigger className="w-[40px] md:w-[160px] bg-slate-50 border-slate-200 h-10 text-slate-700 font-medium p-0 md:px-3 flex justify-center">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} />
                  <span className="hidden md:inline"><SelectValue placeholder="Mode Foto" /></span>
                </div>
              </SelectTrigger>
              <SelectContent><SelectItem value="with-photo">Dengan Foto</SelectItem><SelectItem value="without-photo">Tanpa Foto</SelectItem></SelectContent>
            </Select>
            <Select value={recapMode} onValueChange={(v) => setRecapMode(v as RecapMode)}>
              <SelectTrigger className="w-[40px] md:w-[180px] bg-blue-50 border-blue-200 h-10 text-blue-700 font-medium p-0 md:px-3 flex justify-center">
                <div className="flex items-center gap-2">
                  <Fuel size={16} />
                  <span className="hidden md:inline"><SelectValue placeholder="Mode Rekap" /></span>
                </div>
              </SelectTrigger>
              <SelectContent><SelectItem value="with-fuel">Rekap Dengan BBM</SelectItem><SelectItem value="without-fuel">Rekap Tanpa BBM</SelectItem></SelectContent>
            </Select>
            <Select value={signatureMode} onValueChange={(v) => setSignatureMode(v as SignatureMode)}>
              <SelectTrigger className="w-[40px] md:w-[180px] bg-amber-50 border-amber-200 h-10 text-amber-700 font-medium p-0 md:px-3 flex justify-center">
                <div className="flex items-center gap-2">
                  <PenTool size={16} />
                  <span className="hidden md:inline"><SelectValue placeholder="Tanda Tangan" /></span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="with-signature">Ada Tanda Tangan</SelectItem>
                <SelectItem value="without-signature">Tanpa Tanda Tangan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <Button onClick={() => setIsDriveDialogOpen(true)} disabled={reports.length === 0} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 h-10 px-2 md:px-4">
                <CloudUpload className="h-4 w-4 md:mr-2" /> 
                <span className="hidden md:inline">Simpan ke Drive</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 h-10 px-2 md:px-4">
                  <Printer className="h-4 w-4 md:mr-2" /> 
                  <span className="hidden md:inline">Cetak</span>
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handlePrint} className="cursor-pointer py-2">
                  <Printer className="mr-2 h-4 w-4 text-blue-600" /> Cetak Rekap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer py-2">
                  <Table className="mr-2 h-4 w-4 text-green-600" /> Rekap Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <DriveUploadDialog 
        isOpen={isDriveDialogOpen}
        onClose={() => setIsDriveDialogOpen(false)}
        onUpload={handleDriveUpload}
        defaultFileName={`Rekap_Mingguan_DLH_${format(weekStart, 'yyyy-MM-dd')}`}
      />

      <div ref={printRef} className="print-area bg-white p-4 md:p-10 mx-auto shadow-lg border min-h-[297mm] w-full max-w-[420mm]">
        <div className="pdf-header">
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
            <h3 className="text-xl font-bold underline uppercase">LAPORAN MINGGUAN PEKERJAAN TAMAN, PENGHIJAUAN, POHON DAN PEMBABATAN</h3>
            <p className="text-xl font-bold uppercase">WILAYAH 4 MEDAN KOTA</p>
            <p className="text-xl font-bold uppercase">Minggu: {format(weekStart, 'dd MMMM', { locale: localeId })} s/d {format(weekEnd, 'dd MMMM yyyy', { locale: localeId })}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse border-2 border-black text-[11px] table-fixed">
            <colgroup>
              <col style={{ width: '35px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '75px' }} />
              <col style={{ width: '105px' }} />
              <col style={{ width: '110px' }} />
              {photoMode === "with-photo" && (
                <>
                  <col style={{ width: '145px' }} />
                  <col style={{ width: '145px' }} />
                  <col style={{ width: '145px' }} />
                </>
              )}
              <col style={{ width: '65px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '25px' }} />
              <col style={{ width: '120px' }} />
              {recapMode === "with-fuel" && (
                <>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '40px' }} />
                </>
              )}
              <col style={{ width: '90px' }} />
              <col style={{ width: '50px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>
            <thead className="pdf-table-header">
              <tr style={{ height: '40px' }}>
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">No</div></th>
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">Hari / Tgl</div></th>
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">Tim/Kec.</div></th>
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">Uraian Kegiatan</div></th>
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">Lokasi</div></th>
                {photoMode === "with-photo" && (<th style={headerStyle} className="border-2 border-black p-2" colSpan={3}>Dokumentasi</th>)}
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">Vol</div></th>
                <th style={headerStyle} className="border-2 border-black p-2" colSpan={2}>Peralatan</th>
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">Alat Berat</div></th>
                {recapMode === "with-fuel" && (<th style={headerStyle} className="border-2 border-black p-2" colSpan={3}>BBM (Liter)</th>)}
                <th style={headerStyle} className="border-2 border-black p-2" colSpan={2}>Personil</th>
                <th style={headerStyle} className="border-2 border-black p-2" rowSpan={2}><div className="flex items-center justify-center h-full">Keterangan</div></th>
              </tr>
              <tr style={{ height: '30px' }}>
                {photoMode === "with-photo" && (<><th style={subHeaderStyle} className="border-2 border-black p-1">0%</th><th style={subHeaderStyle} className="border-2 border-black p-1">50%</th><th style={subHeaderStyle} className="border-2 border-black p-1">100%</th></>)}
                <th style={subHeaderStyle} className="border-2 border-black p-1">Jenis Alat</th>
                <th style={subHeaderStyle} className="border-2 border-black p-1 px-0">Jml</th>
                {recapMode === "with-fuel" && (<><th style={subHeaderStyle} className="border-2 border-black p-1 text-[9px]">P</th><th style={subHeaderStyle} className="border-2 border-black p-1 text-[9px]">D</th><th style={subHeaderStyle} className="border-2 border-black p-1 text-[9px]">S</th></>)}
                <th style={subHeaderStyle} className="border-2 border-black p-1">Koordinator</th>
                <th style={subHeaderStyle} className="border-2 border-black p-1">Anggota</th>
              </tr>
            </thead>
            {reports.length > 0 ? (
              <>
                {reports.map((report, reportIdx) => (
                  <tbody key={report.id} className="pdf-report-block border-b-2 border-black">
                    {report.tasks.map((task, taskIdx) => {
                      const villages = Array.isArray(task.location.village) ? task.location.village.join(", ") : task.location.village;
                      return (
                        <tr key={`${report.id}-${taskIdx}`}>
                          {taskIdx === 0 ? (
                            <>
                              <td className="border-2 border-black p-2 text-center align-top font-bold" rowSpan={report.tasks.length}>{reportIdx + 1}</td>
                              <td className="border-2 border-black p-2 text-center align-top font-medium" rowSpan={report.tasks.length}>
                                {new Date(report.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}
                              </td>
                              <td className="border-2 border-black p-2 text-center align-top font-bold text-blue-700" rowSpan={report.tasks.length}>
                                {report.category}
                              </td>
                            </>
                          ) : null}
                          <td className="border-2 border-black p-2 align-top whitespace-normal break-words leading-tight">{task.description}</td>
                          <td className="border-2 border-black p-2 align-top whitespace-normal break-words leading-tight">{`${task.location.street}, ${villages}, ${task.location.subDistrict}`}</td>
                          {photoMode === "with-photo" && (
                            <>
                              <td className="border-2 border-black p-1 align-middle"><div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">{task.photos?.zero ? <img src={task.photos.zero} className="w-full h-full object-fill" alt="0%" /> : null}</div></td>
                              <td className="border-2 border-black p-1 align-middle"><div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">{task.photos?.fifty ? <img src={task.photos.fifty} className="w-full h-full object-fill" alt="50%" /> : null}</div></td>
                              <td className="border-2 border-black p-1 align-middle"><div className="w-full h-[110px] bg-slate-100 border border-slate-300 overflow-hidden">{task.photos?.hundred ? <img src={task.photos.hundred} className="w-full h-full object-fill" alt="100%" /> : null}</div></td>
                            </>
                          )}
                          <td className="border-2 border-black p-2 text-center font-bold align-top">{task.volume} {getUnitByCategory(report.category)}</td>
                          <td className="border-2 border-black p-1.5 align-top text-[10px] leading-tight">{task.equipment?.map((e, i) => (<div key={i} className="mb-0.5 whitespace-nowrap">• {e.type}</div>))}</td>
                          <td className="border-2 border-black p-1.5 px-0 align-top text-[10px] text-center leading-tight">{task.equipment?.map((e, i) => (<div key={i} className="mb-0.5">{e.quantity}</div>))}</td>
                          <td className="border-2 border-black p-1.5 align-top text-[10px] leading-tight overflow-hidden">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5 whitespace-nowrap">• {he.type} {he.vehicle || ""}</div>))}</td>
                          {recapMode === "with-fuel" && (
                            <>
                              <td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5">{he.fuel?.pertamax || 0}</div>))}</td>
                              <td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5">{he.fuel?.dexlite || 0}</div>))}</td>
                              <td className="border-2 border-black p-1.5 align-top text-[10px] text-center leading-tight">{task.heavyEquipment?.map((he, i) => (<div key={i} className="mb-0.5">{he.fuel?.solar || 0}</div>))}</td>
                            </>
                          )}
                          <td className="border-2 border-black p-2 text-center align-top font-medium">{task.personnel.coordinator}</td>
                          <td className="border-2 border-black p-2 text-center align-top font-medium">{task.personnel.members}</td>
                          <td className="border-2 border-black p-2 align-top whitespace-normal break-words italic">
                            <div className="space-y-1">
                              {task.remarks && <div>{task.remarks}</div>}
                              {taskIdx === 0 && report.remarks && (
                                <div className={cn("text-blue-700 font-medium", task.remarks && "border-t border-slate-200 pt-1")}>
                                  Catatan: {report.remarks}
                                </div>
                              )}
                              {!task.remarks && (taskIdx !== 0 || !report.remarks) && "-"}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </>
            ) : (
              <tbody>
                <tr><td colSpan={totalCols} className="border-2 border-black p-12 text-center text-slate-400 italic text-lg">Tidak ada data laporan untuk periode ini</td></tr>
              </tbody>
            )}
          </table>
        </div>

        {signatureMode === "with-signature" && (
          <div className="pdf-footer mt-12">
            <div className="flex justify-end mb-4 text-[11px]"><p className="w-1/4 text-center">Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
            <div className="grid grid-cols-4 gap-4 text-[11px] leading-normal">
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Mengetahui :</p><p className="font-bold">Kabid Tata Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Heni Rustati, ST, M.Si</p><p>NIP. 19720223 200604 2 002</p></div></div>
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Diketahui :</p><p className="font-bold">Ketua Tim Pemeliharaan Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p><p>NIP. 19811128 201001 2 011</p></div></div>
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Diketahui :</p><p className="font-bold">Pengawas Taman Penghijauan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Jhosua Sibarani, S.T</p><p>NIP. 19740907 200903 1 002</p></div></div>
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Diketahui :</p>{showSignatory4 && !showSignatory5 && (<><p className="font-bold">Kepala Koordinator Taman</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}{showSignatory5 && !showSignatory4 && (<><p className="font-bold">Kepala Koordinator Tim Pohon</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}{showSignatory4 && showSignatory5 && (<><p className="font-bold">Koordinator Taman & Tim Pohon</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}</div><div>{showSignatory4 && !showSignatory5 && (<><p className="font-bold underline">Tiurmaida Silitonga</p><p>NIP. 19690507 200701 2 042</p></>)}{showSignatory5 && !showSignatory4 && (<div className="flex justify-around gap-2"><div><p className="font-bold underline">Tiurmaida Silitonga</p><p className="text-[9px]">NIP. 19690507 200701 2 042</p></div><div><p className="font-bold underline">Ardiansyah Siregar</p><p className="text-[9px]">NIP. 19860404 201001 1 015</p></div></div>)}{showSignatory4 && showSignatory5 && (<div className="flex justify-around gap-2"><div><p className="font-bold underline">Tiurmaida Silitonga</p><p className="text-[9px]">NIP. 19690507 200701 2 042</p></div><div><p className="font-bold underline">Ardiansyah Siregar</p><p className="text-[9px]">NIP. 19860404 201001 1 015</p></div></div>)}</div></div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .no-print, 
          [data-radix-portal], 
          [role="menu"], 
          [data-radix-popper-content-wrapper] { 
            display: none !important; 
            visibility: hidden !important;
            opacity: 0 !important;
          }
          .print-area { 
            box-shadow: none !important; 
            border: none !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: none !important; 
            background-color: white !important;
          }
          @page { size: A3 landscape; margin: 1.5cm; }
          table { page-break-inside: auto; width: 100% !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .pdf-report-block { page-break-inside: avoid; }
          .bg-slate-50, .bg-slate-100 { background-color: white !important; }
        }
      `}} />
    </div>
  );
};

export default WeeklyRecap;