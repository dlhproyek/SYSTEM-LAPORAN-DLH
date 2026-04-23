"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkPlan } from '@/types/workPlan';
import { workPlanService } from '@/services/workPlanService';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const PrintWorkPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<WorkPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadPlan(id);
  }, [id]);

  const loadPlan = async (planId: string) => {
    try {
      setLoading(true);
      const data = await workPlanService.getWorkPlanById(planId);
      setPlan(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center">Menyiapkan dokumen...</div>;
  if (!plan) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/work-plans')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <h1 className="font-bold">Preview Cetak Rencana Kerja</h1>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>
      </div>

      <div className="print-container bg-white p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        {/* Header */}
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-20 w-20 object-contain" alt="Logo Medan" />
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2>
            <p className="text-xs italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <img src={LOGO_DLH_URL} className="h-20 w-20 object-contain" alt="Logo DLH" />
        </div>

        <div className="text-center mb-6">
          <h3 className="text-lg font-bold underline uppercase">RENCANA KERJA HARIAN</h3>
          <p className="font-bold">Tanggal: {new Date(plan.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[10px] table-fixed">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-1 w-[30px]">No</th>
              <th className="border-2 border-black p-1 w-[80px]">Tim/ Kec</th>
              <th className="border-2 border-black p-1 w-[120px]">Detail Kegiatan</th>
              <th className="border-2 border-black p-1 w-[150px]">Lokasi (Jalan + Kel + Kec)</th>
              <th className="border-2 border-black p-1 w-[100px]">Alat Operasional</th>
              <th className="border-2 border-black p-1 w-[40px]">Unit</th>
              <th className="border-2 border-black p-1 w-[100px]">Kegunaan</th>
              <th className="border-2 border-black p-1 w-[80px]">Koordinator</th>
              <th className="border-2 border-black p-1 w-[50px]">Personil</th>
              <th className="border-2 border-black p-1 w-[100px]">Dasar Pengerjaan</th>
              <th className="border-2 border-black p-1 w-[100px]">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item, idx) => (
              <tr key={idx}>
                <td className="border-2 border-black p-1 text-center align-top">{idx + 1}</td>
                <td className="border-2 border-black p-1 text-center font-bold align-top">{plan.category}</td>
                <td className="border-2 border-black p-1 align-top break-words">{item.description}</td>
                <td className="border-2 border-black p-1 align-top break-words">
                  {item.location.street}, {Array.isArray(item.location.village) ? item.location.village.join(", ") : item.location.village}, {item.location.subDistrict}
                </td>
                
                <td colSpan={3} className="border-2 border-black p-0 align-top">
                  <table className="w-full border-collapse border-none">
                    <tbody>
                      {item.tools.map((t, i) => (
                        <tr key={i} className={i !== item.tools.length - 1 ? "border-b-2 border-black" : ""}>
                          <td className="p-1 w-[100px] border-r-2 border-black align-top break-words">• {t.name}</td>
                          <td className="p-1 w-[40px] border-r-2 border-black text-center align-top">{t.unit}</td>
                          <td className="p-1 w-[100px] align-top break-words">{t.usage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>

                <td className="border-2 border-black p-1 text-center align-top">{item.coordinator}</td>
                <td className="border-2 border-black p-1 text-center align-top">{item.personnel.members} Org</td>
                <td className="border-2 border-black p-1 align-top break-words">{item.basis}</td>
                <td className="border-2 border-black p-1 italic align-top break-words">{item.remarks || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-64">
            <p>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold mt-1">Koordinator Wilayah 4</p>
            <div className="h-20"></div>
            <p className="font-bold underline">( ............................................ )</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-container { 
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
          .border-black { border-color: black !important; }
        }
      `}} />
    </div>
  );
};

export default PrintWorkPlan;