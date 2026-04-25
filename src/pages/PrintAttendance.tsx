"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { attendanceService } from '@/services/attendanceService';
import { AttendanceRecord } from '@/types/attendance';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const PrintAttendance = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const date = searchParams.get('date') || "";
  const category = searchParams.get('category') || "";

  useEffect(() => {
    if (date && category) loadData();
  }, [date, category]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceByDate(date, category);
      setRecords(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center">Menyiapkan dokumen...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[900px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.close()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Tutup
          </Button>
          <h1 className="font-bold">Preview Cetak Absensi</h1>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>
      </div>

      <div className="print-area bg-white p-12 mx-auto shadow-lg border min-h-[297mm] w-full max-w-[210mm]">
        {/* Header Resmi */}
        <div className="flex items-center justify-center gap-6 border-b-4 border-double border-black pb-4 mb-8">
          <img src={LOGO_MEDAN_URL} className="h-20 w-20 object-contain" alt="Logo Medan" />
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2>
            <p className="text-[10px] italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <img src={LOGO_DLH_URL} className="h-20 w-20 object-contain" alt="Logo DLH" />
        </div>

        <div className="text-center mb-8">
          <h3 className="text-lg font-bold underline uppercase">DAFTAR HADIR PEKERJA HARIAN LEPAS (PHL)</h3>
          <div className="flex justify-center gap-8 mt-2 font-bold text-sm">
            <p>TIM: {category.toUpperCase()}</p>
            <p>TANGGAL: {format(new Date(date), 'dd MMMM yyyy', { locale: localeId })}</p>
          </div>
        </div>

        <table className="w-full border-collapse border-2 border-black text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-2 w-[50px]">NO</th>
              <th className="border-2 border-black p-2 text-left">NAMA LENGKAP</th>
              <th className="border-2 border-black p-2 w-[150px]">JABATAN/TUGAS</th>
              <th className="border-2 border-black p-2 w-[180px]" colSpan={2}>TANDA TANGAN</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record, i) => (
                <tr key={record.id} className="h-12">
                  <td className="border-2 border-black p-2 text-center">{i + 1}</td>
                  <td className="border-2 border-black p-2 font-medium">{record.personnel_name}</td>
                  <td className="border-2 border-black p-2 text-center">{record.position}</td>
                  <td className="border-2 border-black p-2 w-[90px] relative">
                    {i % 2 === 0 && (
                      <div className="absolute left-2 top-1 text-[10px] text-slate-400">{i + 1}. ...........</div>
                    )}
                    {record.status !== 'Hadir' && (
                      <div className="text-center font-bold text-red-600 text-[10px]">{record.status.toUpperCase()}</div>
                    )}
                  </td>
                  <td className="border-2 border-black p-2 w-[90px] relative">
                    {i % 2 !== 0 && (
                      <div className="absolute left-2 top-1 text-[10px] text-slate-400">{i + 1}. ...........</div>
                    )}
                    {record.status !== 'Hadir' && (
                      <div className="text-center font-bold text-red-600 text-[10px]">{record.status.toUpperCase()}</div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data personil</td></tr>
            )}
          </tbody>
        </table>

        {/* Tanda Tangan Pengawas */}
        <div className="mt-16 flex justify-end">
          <div className="text-center w-64">
            <p>Medan, {format(new Date(), 'dd MMMM yyyy', { locale: localeId })}</p>
            <p className="font-bold mt-1">Koordinator {category}</p>
            <div className="h-24"></div>
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
          @page { size: portrait; margin: 1.5cm; }
        }
      `}} />
    </div>
  );
};

export default PrintAttendance;