"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fuelService } from '@/services/fuelService';
import { FuelReport } from '@/types/fuelReport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Printer, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const FuelDailyRecap = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllReports();
      const filtered = data.filter(r => r.date === selectedDate);
      // Urutkan berdasarkan wilayah agar mudah digabung
      filtered.sort((a, b) => a.region.localeCompare(b.region));
      setReports(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Hitung rowspan untuk Wilayah
  const getRegionSpans = () => {
    const spans: number[] = [];
    let currentRegion = "";
    let count = 0;
    let startIndex = 0;

    const flatItems = reports.flatMap(r => r.items.map(item => ({ ...item, region: r.region, team: r.team, remarks: r.remarks })));

    flatItems.forEach((item, index) => {
      if (item.region !== currentRegion) {
        if (count > 0) spans[startIndex] = count;
        currentRegion = item.region;
        count = 1;
        startIndex = index;
      } else {
        count++;
        spans[index] = 0;
      }
    });
    if (count > 0) spans[startIndex] = count;
    return { flatItems, spans };
  };

  const { flatItems, spans } = getRegionSpans();

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-4 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/fuel-reports')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-10 w-[200px]" />
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600"><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
        </div>
      </div>

      <div className="print-area bg-white p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-20 w-20 object-contain" alt="Logo Medan" />
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2>
            <p className="text-xs italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <img src={LOGO_DLH_URL} className="h-20 w-20 object-contain" alt="Logo DLH" />
        </div>

        <div className="text-center mb-8">
          <h3 className="text-xl font-bold underline uppercase text-orange-700">REKAP HARIAN PEMAKAIAN BBM & OLI</h3>
          <p className="text-lg font-bold">Tanggal: {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeId })}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[10px] table-fixed">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-1 w-[30px]" rowSpan={2}>No</th>
              <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Wilayah</th>
              <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Tim / Operator</th>
              <th className="border-2 border-black p-1 w-auto" rowSpan={2} style={{ width: 'max-content' }}>Kendaraan / Alat Operasional</th>
              <th className="border-2 border-black p-1" colSpan={3}>Jenis BBM / Oli</th>
              <th className="border-2 border-black p-1 w-[200px]" rowSpan={2}>Lokasi Kerja</th>
              <th className="border-2 border-black p-1 w-[120px]" rowSpan={2}>Keterangan</th>
            </tr>
            <tr className="bg-slate-50">
              <th className="border-2 border-black p-1 w-[70px]">Pertamax</th>
              <th className="border-2 border-black p-1 w-[70px]">Dexlite</th>
              <th className="border-2 border-black p-1 w-[35px]">Oli</th>
            </tr>
          </thead>
          <tbody>
            {flatItems.length > 0 ? (
              flatItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="border-2 border-black p-1 text-center">{idx + 1}</td>
                  {spans[idx] > 0 && (
                    <td className="border-2 border-black p-1 text-center font-bold align-middle" rowSpan={spans[idx]}>
                      {item.region}
                    </td>
                  )}
                  {spans[idx] === undefined && null}
                  <td className="border-2 border-black p-1 text-center">{item.team}</td>
                  <td className="border-2 border-black p-1 whitespace-nowrap overflow-visible font-medium">
                    {item.vehicle_operator}
                  </td>
                  <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Pertamax' ? item.amount.toLocaleString('id-ID') : "-"}</td>
                  <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Dexlite' ? item.amount.toLocaleString('id-ID') : "-"}</td>
                  <td className="border-2 border-black p-1 text-center">{item.fuel_type === 'Oli' ? item.amount : "-"}</td>
                  <td className="border-2 border-black p-1 break-words">
                    {item.location.street}{item.location.subDistrict && item.location.subDistrict !== " " ? `, ${item.location.subDistrict}` : ""}{item.location.village && item.location.village !== " " ? `, ${item.location.village}` : ""}
                  </td>
                  <td className="border-2 border-black p-1 italic">
                    {item.item_remarks || item.remarks || "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={9} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data untuk tanggal ini</td></tr>
            )}
          </tbody>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-64">
            <p>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold mt-1">Administrator Sistem</p>
            <div className="h-20"></div>
            <p className="font-bold underline">( ............................................ )</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          @page { size: landscape; margin: 1cm; }
          table { width: 100% !important; }
        }
      `}} />
    </div>
  );
};

export default FuelDailyRecap;