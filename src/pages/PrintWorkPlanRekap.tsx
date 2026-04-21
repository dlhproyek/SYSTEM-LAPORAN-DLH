"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WorkPlan } from '@/types/work-plan';
import { workPlanService } from '@/services/workPlanService';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

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
      // Urutkan berdasarkan kategori agar rapi
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
      <div className="max-w-[1200px] mx-auto space-y-6 no-print mb-8 p-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div className="text-center">
            <h1 className="font-bold">Preview Cetak Rekap Rencana Kerja</h1>
            <p className="text-xs text-slate-500">Tanggal: {date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>
      </div>

      <div className="print-area bg-white p-10 mx-auto shadow-none border-none w-full max-w-[1200px]">
        {/* Header Kop Surat */}
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
            <img src={LOGO_MEDAN_URL} className="max-h-full max-w-full object-contain" alt="Logo Medan" />
          </div>
          <div className="text-center px-4">
            <h1 className="text-xl font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2>
            <p className="text-xs italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
            <img src={LOGO_DLH_URL} className="max-h-full max-w-full object-contain" alt="Logo DLH" />
          </div>
        </div>

        <div className="text-center mb-8 space-y-1">
          <h3 className="text-lg font-bold underline uppercase">REKAPITULASI RENCANA KERJA HARIAN</h3>
          <p className="font-bold">TANGGAL: {date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : '-'}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-2 w-[40px]">No</th>
              <th className="border-2 border-black p-2 w-[120px]">Kategori</th>
              <th className="border-2 border-black p-2">Uraian Kegiatan</th>
              <th className="border-2 border-black p-2">Lokasi</th>
              <th className="border-2 border-black p-2 w-[150px]">Alat Operasional</th>
              <th className="border-2 border-black p-2 w-[60px]">Pers</th>
              <th className="border-2 border-black p-2 w-[120px]">Koordinator</th>
              <th className="border-2 border-black p-2 w-[120px]">Dasar</th>
            </tr>
          </thead>
          <tbody>
            {plans.length > 0 ? plans.map((plan, idx) => (
              <tr key={plan.id}>
                <td className="border-2 border-black p-2 text-center font-bold">{idx + 1}</td>
                <td className="border-2 border-black p-2 font-bold">{plan.category}</td>
                <td className="border-2 border-black p-2">{plan.description}</td>
                <td className="border-2 border-black p-2">
                  {plan.street}, Kel. {plan.villages.join(", ")}, Kec. {plan.sub_district}
                </td>
                <td className="border-2 border-black p-2">
                  {plan.equipment.map((eq, i) => (
                    <div key={i}>• {eq.name} ({eq.quantity})</div>
                  ))}
                </td>
                <td className="border-2 border-black p-2 text-center">{plan.personnel}</td>
                <td className="border-2 border-black p-2 text-center">{plan.coordinator}</td>
                <td className="border-2 border-black p-2">{plan.basis}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="border-2 border-black p-10 text-center italic text-slate-400">
                  Tidak ada data rencana kerja untuk tanggal ini
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Tanda Tangan */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-[11px]">
          <div className="text-center space-y-16">
            <div>
              <p>Mengetahui :</p>
              <p className="font-bold">Kabid Tata Lingkungan</p>
            </div>
            <div>
              <p className="font-bold underline">Heni Rustati, ST, M.Si</p>
              <p>NIP. 19720223 200604 2 002</p>
            </div>
          </div>
          <div className="text-center space-y-16">
            <div>
              <p>Diketahui :</p>
              <p className="font-bold">Ketua Tim Pemeliharaan Lingkungan</p>
            </div>
            <div>
              <p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p>
              <p>NIP. 19811128 201001 2 011</p>
            </div>
          </div>
          <div className="text-center space-y-16">
            <div>
              <p>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Dibuat Oleh :</p>
              <p className="font-bold">Pengawas Taman Penghijauan</p>
            </div>
            <div>
              <p className="font-bold underline">Jhosua Sibarani, S.T</p>
              <p>NIP. 19740907 200903 1 002</p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page { size: landscape; margin: 1cm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}} />
    </div>
  );
};

export default PrintWorkPlanRekap;