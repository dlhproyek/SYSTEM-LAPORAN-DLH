"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Users, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { reportService } from '@/services/reportService';
import { Report } from '@/types/report';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const categories = ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"];
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const AttendancePrint = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || categories[0]);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await reportService.getAllReports(selectedCategory);
      const filtered = data.filter(r => {
        const d = parseISO(r.date);
        return (d.getMonth() + 1).toString() === selectedMonth && d.getFullYear().toString() === selectedYear;
      });
      setReports(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Ambil daftar personil unik dari laporan
  const personnelList = useMemo(() => {
    const names = new Set<string>();
    reports.forEach(r => {
      if (r.personnel?.coordinator) names.add(r.personnel.coordinator);
      r.tasks?.forEach(t => {
        if (t.personnel?.coordinator) names.add(t.personnel.coordinator);
      });
    });
    return Array.from(names).sort();
  }, [reports]);

  const daysCount = getDaysInMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih Tim" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Absensi
          </Button>
        </div>
      </div>

      <div className="print-area bg-white p-8 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        {/* Header */}
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-16 w-16 object-contain" alt="Logo Medan" />
          <div className="text-center">
            <h1 className="text-lg font-bold uppercase leading-tight">Pemerintah Kota Medan</h1>
            <h2 className="text-xl font-black uppercase leading-tight">Dinas Lingkungan Hidup</h2>
            <p className="text-[10px] italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <img src={LOGO_DLH_URL} className="h-16 w-16 object-contain" alt="Logo DLH" />
        </div>

        <div className="text-center mb-6">
          <h3 className="text-md font-bold underline uppercase">DAFTAR HADIR PERSONIL LAPANGAN</h3>
          <div className="flex justify-center gap-8 text-[11px] mt-1 font-bold">
            <p>TIM/KATEGORI: {selectedCategory.toUpperCase()}</p>
            <p>BULAN: {months[parseInt(selectedMonth)-1].toUpperCase()} {selectedYear}</p>
          </div>
        </div>

        <table className="w-full border-collapse border-[1.5px] border-black text-[9px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-[1.5px] border-black p-1 w-8" rowSpan={2}>NO</th>
              <th className="border-[1.5px] border-black p-1 w-48" rowSpan={2}>NAMA PERSONIL</th>
              <th className="border-[1.5px] border-black p-1" colSpan={31}>TANGGAL</th>
              <th className="border-[1.5px] border-black p-1 w-12" rowSpan={2}>KET</th>
            </tr>
            <tr>
              {daysArray.map(d => (
                <th key={d} className={cn(
                  "border-[1.5px] border-black p-0.5 w-5 text-[8px]",
                  d > daysCount && "bg-slate-200"
                )}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personnelList.length > 0 ? (
              personnelList.map((name, idx) => (
                <tr key={idx} className="h-7">
                  <td className="border-[1.5px] border-black text-center">{idx + 1}</td>
                  <td className="border-[1.5px] border-black px-2 font-medium">{name}</td>
                  {daysArray.map(d => (
                    <td key={d} className={cn(
                      "border-[1.5px] border-black",
                      d > daysCount && "bg-slate-200"
                    )}></td>
                  ))}
                  <td className="border-[1.5px] border-black"></td>
                </tr>
              ))
            ) : (
              Array.from({ length: 15 }).map((_, i) => (
                <tr key={i} className="h-7">
                  <td className="border-[1.5px] border-black text-center">{i + 1}</td>
                  <td className="border-[1.5px] border-black px-2"></td>
                  {daysArray.map(d => (
                    <td key={d} className={cn(
                      "border-[1.5px] border-black",
                      d > daysCount && "bg-slate-200"
                    )}></td>
                  ))}
                  <td className="border-[1.5px] border-black"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer / Signatures */}
        <div className="mt-10 grid grid-cols-3 gap-4 text-[11px]">
          <div className="text-center space-y-16">
            <div>
              <p>Mengetahui:</p>
              <p className="font-bold">Pengawas Lapangan</p>
            </div>
            <p className="font-bold underline">( ............................................ )</p>
          </div>
          <div className="text-center">
            {/* Empty middle column */}
          </div>
          <div className="text-center space-y-16">
            <div>
              <p>Medan, {format(new Date(), 'dd MMMM yyyy', { locale: localeId })}</p>
              <p className="font-bold">Koordinator Tim</p>
            </div>
            <p className="font-bold underline">( ............................................ )</p>
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
          @page { size: landscape; margin: 1cm; }
          table { border-color: black !important; }
          th, td { border-color: black !important; }
        }
      `}} />
    </div>
  );
};

export default AttendancePrint;