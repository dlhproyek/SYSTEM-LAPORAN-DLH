"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fuelService } from '@/services/fuelService';
import { FuelReport } from '@/types/fuelReport';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseISO } from 'date-fns';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const FuelYearlyRecap = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllReports();
      const filtered = data.filter(r => {
        const rDate = parseISO(r.date);
        return rDate.getFullYear().toString() === selectedYear;
      });
      filtered.sort((a, b) => a.date.localeCompare(b.date) || a.region.localeCompare(b.region));
      setReports(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFlatData = () => {
    const flatItems = reports.flatMap(r => r.items.map(item => ({ ...item, date: r.date, region: r.region, team: r.team, remarks: r.remarks })));
    const spans: number[] = [];
    let currentRegion = "";
    let count = 0;
    let startIndex = 0;

    flatItems.forEach((item, index) => {
      const key = `${item.date}-${item.region}`;
      if (key !== currentRegion) {
        if (count > 0) spans[startIndex] = count;
        currentRegion = key;
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

  const { flatItems, spans } = getFlatData();

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-4 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/fuel-reports')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
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
          <h3 className="text-xl font-bold underline uppercase text-orange-700">REKAP TAHUNAN PEMAKAIAN BBM & OLI</h3>
          <p className="text-lg font-bold">Tahun: {selectedYear}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[10px] table-fixed">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-1 w-[30px]" rowSpan={2}>No</th>
              <th className="border-2 border-black p-1 w-[65px]" rowSpan={2}>Tanggal</th>
              <th className="border-2 border-black p-1 w-[85px]" rowSpan={2}>Wilayah</th>
              <th className="border-2 border-black p-1 w-[90px]" rowSpan={2}>Tim / Operator</th>
              <th className="border-2 border-black p-1 w-auto" rowSpan={2}>Kendaraan / Alat Operasional</th>
              <th className="border-2 border-black p-1" colSpan={3}>Jenis BBM / Oli</th>
              <th className="border-2 border-black p-1 w-[180px]" rowSpan={2}>Lokasi Kerja</th>
              <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Keterangan</th>
            </tr>
            <tr className="bg-slate-50">
              <th className="border-2 border-black p-1 w-[65px]">Pertamax</th>
              <th className="border-2 border-black p-1 w-[65px]">Dexlite</th>
              <th className="border-2 border-black p-1 w-[35px]">Oli</th>
            </tr>
          </thead>
          <tbody>
            {flatItems.length > 0 ? (
              flatItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="border-2 border-black p-1 text-center">{idx + 1}</td>
                  <td className="border-2 border-black p-1 text-center">{item.date}</td>
                  {spans[idx] > 0 && (
                    <td className="border-2 border-black p-1 text-center font-bold align-middle" rowSpan={spans[idx]}>
                      {item.region}
                    </td>
                  )}
                  <td className="border-2 border-black p-1 text-center">{item.team}</td>
                  <td className="border-2 border-black p-1 whitespace-nowrap overflow-visible font-medium">{item.vehicle_operator}</td>
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
              <tr><td colSpan={10} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data untuk tahun ini</td></tr>
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
        }
      `}} />
    </div>
  );
};

export default FuelYearlyRecap;