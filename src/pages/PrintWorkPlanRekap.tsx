"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WorkPlan } from '@/types/work-plan';
import { workPlanService } from '@/services/workPlanService';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrintWorkPlanRekap = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const date = searchParams.get('date');

  useEffect(() => {
    if (date) loadData();
  }, [date]);

  const loadData = async () => {
    try {
      setLoading(true);
      const allPlans = await workPlanService.getAllWorkPlans();
      const filtered = allPlans.filter(p => p.date === date);
      filtered.sort((a, b) => a.category.localeCompare(b.category));
      setPlans(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center">Menyiapkan data cetak...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6 no-print mb-8 p-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div className="text-center">
            <h1 className="font-bold">Preview Cetak Rencana Kerja</h1>
            <p className="text-xs text-slate-500">Tanggal: {date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>
      </div>

      <div className="print-area bg-white p-4 mx-auto shadow-none border-none w-full max-w-[1600px]">
        <div className="text-center mb-6 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">RENCANA KERJA WILAYAH 4 DLH MEDAN KOTA</h1>
          <h2 className="text-3xl font-black uppercase tracking-tight">
            TANGGAL : {date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : '-'}
          </h2>
        </div>

        <table className="w-full border-collapse border-[1.5px] border-black text-[12px] table-fixed">
          <thead>
            <tr className="bg-[#FFFF00]">
              <th className="border-[1.5px] border-black p-2 w-[40px] text-center font-bold" rowSpan={2}>No</th>
              <th className="border-[1.5px] border-black p-2 w-[120px] text-center font-bold" rowSpan={2}>Tim/ Kecamatan</th>
              <th className="border-[1.5px] border-black p-2 w-[250px] text-center font-bold" rowSpan={2}>Detail Kegiatan</th>
              <th className="border-[1.5px] border-black p-2 w-[250px] text-center font-bold" rowSpan={2}>Lokasi</th>
              <th className="border-[1.5px] border-black p-2 text-center font-bold" colSpan={3}>Alat/ Bahan Yang Dibutuhkan</th>
              <th className="border-[1.5px] border-black p-2 w-[120px] text-center font-bold" rowSpan={2}>Koordinator Lapangan</th>
              <th className="border-[1.5px] border-black p-2 w-[80px] text-center font-bold" rowSpan={2}>Personil (Jlh. Org)</th>
              <th className="border-[1.5px] border-black p-2 w-[180px] text-center font-bold" rowSpan={2}>Dasar Pengerjaan</th>
              <th className="border-[1.5px] border-black p-2 w-[150px] text-center font-bold" rowSpan={2}>Keterangan</th>
            </tr>
            <tr className="bg-[#FFFF00]">
              <th className="border-[1.5px] border-black p-2 w-[150px] text-center font-bold">Kendaraan/ Alat</th>
              <th className="border-[1.5px] border-black p-2 w-[60px] text-center font-bold">(Unit)</th>
              <th className="border-[1.5px] border-black p-2 w-[180px] text-center font-bold">Kegunaan</th>
            </tr>
          </thead>
          <tbody>
            {plans.length > 0 ? plans.map((plan, idx) => (
              <tr key={plan.id} className="align-top">
                <td className="border-[1.5px] border-black p-3 text-center font-medium">{idx + 1}</td>
                <td className="border-[1.5px] border-black p-3 text-center font-medium">{plan.category}</td>
                <td className="border-[1.5px] border-black p-3 text-left leading-relaxed">{plan.description}</td>
                <td className="border-[1.5px] border-black p-3 text-left leading-relaxed">
                  {plan.street}, Kel. {plan.villages.join(", ")}, Kec. {plan.sub_district}
                </td>
                
                {/* Kolom Alat/Bahan (Nested Table Style) */}
                <td className="border-[1.5px] border-black p-0" colSpan={3}>
                  <table className="w-full border-collapse">
                    <tbody>
                      {plan.equipment.length > 0 ? plan.equipment.map((eq, i) => (
                        <tr key={i} className={i === plan.equipment.length - 1 ? "" : "border-b-[1.5px] border-black"}>
                          <td className="p-3 w-[150px] text-center border-r-[1.5px] border-black break-words">{eq.name}</td>
                          <td className="p-3 w-[60px] text-center border-r-[1.5px] border-black">{eq.quantity}</td>
                          <td className="p-3 w-[180px] text-center break-words">{eq.usage || "-"}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td className="p-3 w-[150px] text-center border-r-[1.5px] border-black">-</td>
                          <td className="p-3 w-[60px] text-center border-r-[1.5px] border-black">-</td>
                          <td className="p-3 w-[180px] text-center">-</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </td>

                <td className="border-[1.5px] border-black p-3 text-center font-medium">{plan.coordinator}</td>
                <td className="border-[1.5px] border-black p-3 text-center font-medium">{plan.personnel}</td>
                <td className="border-[1.5px] border-black p-3 text-center leading-relaxed">{plan.basis}</td>
                <td className="border-[1.5px] border-black p-3 text-center italic">{plan.remarks || "-"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={11} className="border-[1.5px] border-black p-10 text-center italic text-slate-400">
                  Tidak ada data rencana kerja untuk tanggal ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page { size: landscape; margin: 0.5cm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}} />
    </div>
  );
};

export default PrintWorkPlanRekap;