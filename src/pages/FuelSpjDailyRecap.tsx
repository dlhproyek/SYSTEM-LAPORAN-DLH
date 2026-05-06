"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fuelSpjService } from '@/services/fuelSpjService';
import { FuelSpjReport } from '@/types/fuelSpjReport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Printer, Calendar as CalendarIcon, PenTool } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const FuelSpjDailyRecap = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [reports, setReports] = useState<FuelSpjReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const isAllowed = profile?.role === 'admin' || profile?.role === 'admin_spj_bbm';

  useEffect(() => {
    if (isAllowed) loadData();
  }, [selectedDate, isAllowed]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fuelSpjService.getAllReports();
      const filtered = data.filter(r => r.date === selectedDate);
      setReports(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const flatItems = reports.flatMap(r => 
    r.entries.flatMap(entry => 
      entry.locations.map((loc, locIdx) => ({
        date: r.date,
        region: r.region,
        spj_no: entry.spj_no,
        vehicle: entry.vehicle_operator,
        receiver: entry.receiver_name,
        ...loc,
        isFirstInEntry: locIdx === 0,
        entrySpan: entry.locations.length
      }))
    )
  );

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-4 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/fuel-reports/spj')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-10 w-[200px]" />
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600"><Printer className="mr-2 h-4 w-4" /> Cetak Rekap</Button>
        </div>
      </div>

      <div className="print-area bg-white p-4 md:p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-16 w-16 object-contain" alt="Logo Medan" />
          <div className="text-center">
            <h1 className="text-lg font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-xl font-black uppercase">Dinas Lingkungan Hidup</h2>
            <p className="text-[10px] italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <img src={LOGO_DLH_URL} className="h-16 w-16 object-contain" alt="Logo DLH" />
        </div>

        <div className="text-center mb-8">
          <h3 className="text-lg font-bold underline uppercase text-blue-800">REKAP HARIAN SPJ PEMAKAIAN BBM & OLI</h3>
          <p className="text-sm font-bold">Tanggal: {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy', { locale: localeId })}</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-[9px] table-fixed">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-1 w-[30px]" rowSpan={2}>No</th>
                <th className="border-2 border-black p-1 w-[70px]" rowSpan={2}>Tanggal</th>
                <th className="border-2 border-black p-1 w-[80px]" rowSpan={2}>No. SPJ</th>
                <th className="border-2 border-black p-1 w-[70px]" rowSpan={2}>Wilayah</th>
                <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Kendaraan / Alat Operasional</th>
                <th className="border-2 border-black p-1" colSpan={5}>Jenis BBM / Oli</th>
                <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Ket. BBM/ Oli</th>
                <th className="border-2 border-black p-1 w-[80px]" rowSpan={2}>Penerima / Operator</th>
                <th className="border-2 border-black p-1 w-[120px]" rowSpan={2}>Lokasi Kerja</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-1 w-[50px]">Pertamax (Rp)</th>
                <th className="border-2 border-black p-1 w-[35px]">Ltr</th>
                <th className="border-2 border-black p-1 w-[50px]">Dexlite (Rp)</th>
                <th className="border-2 border-black p-1 w-[35px]">Ltr</th>
                <th className="border-2 border-black p-1 w-[30px]">Oli (L)</th>
              </tr>
            </thead>
            <tbody>
              {flatItems.length > 0 ? flatItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="border-2 border-black p-1 text-center">{idx + 1}</td>
                  <td className="border-2 border-black p-1 text-center whitespace-normal break-words leading-tight">
                    {format(parseISO(item.date), 'eee, d MMM yyyy', { locale: localeId })}
                  </td>
                  <td className="border-2 border-black p-1 text-center font-bold">{item.spj_no}</td>
                  <td className="border-2 border-black p-1 text-center">{item.region}</td>
                  <td className="border-2 border-black p-1 font-medium">{item.vehicle}</td>
                  
                  {/* BBM Columns */}
                  <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Pertamax' ? item.amount_rp.toLocaleString('id-ID') : "-"}</td>
                  <td className="border-2 border-black p-1 text-center">{item.fuel_type === 'Pertamax' ? item.amount_liter : "-"}</td>
                  <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Dexlite' ? item.amount_rp.toLocaleString('id-ID') : "-"}</td>
                  <td className="border-2 border-black p-1 text-center">{item.fuel_type === 'Dexlite' ? item.amount_liter : "-"}</td>
                  <td className="border-2 border-black p-1 text-center">{item.fuel_type === 'Oli' ? item.amount_liter : "-"}</td>

                  <td className="border-2 border-black p-1 italic whitespace-normal break-words leading-tight">{item.remarks || "-"}</td>
                  <td className="border-2 border-black p-1 whitespace-normal break-words leading-tight">{item.receiver}</td>
                  <td className="border-2 border-black p-1 whitespace-normal break-words leading-tight">
                    {item.street}{item.subDistrict ? `, ${item.subDistrict}` : ""}{item.village ? `, ${item.village}` : ""}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={13} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data untuk tanggal ini</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[10px] leading-normal max-w-[700px] mx-auto">
          <div className="text-center flex flex-col justify-between min-h-[150px]">
            <div><p>Mengetahui :</p><p className="font-bold">Kabid Tata Lingkungan</p></div>
            <div><p className="font-bold underline">Heni Rustati, ST, M.Si</p><p>NIP. 19720223 200604 2 002</p></div>
          </div>
          <div className="text-center flex flex-col justify-between min-h-[150px]">
            <div><p>Diketahui :</p><p className="font-bold">Ketua Tim Pemeliharaan Lingkungan</p></div>
            <div><p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p><p>NIP. 19811128 201001 2 011</p></div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          @page { size: landscape; margin: 1cm; }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100% !important; min-width: 0 !important; }
        }
      `}} />
    </div>
  );
};

export default FuelSpjDailyRecap;