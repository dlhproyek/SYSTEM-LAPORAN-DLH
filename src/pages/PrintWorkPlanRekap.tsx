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
            <h1 className="font-bold">Preview Cetak Rekap Rencana Kerja</h1>
            <p className="text-xs text-slate-500">Tanggal: {date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>
      </div>

      <div className="print-area bg-white p-10 mx-auto shadow-none border-none w-full max-w-[1400px]">
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

        <table className="w-full border-collapse border-2 border-black text-[10px]">
          <thead>
            <tr className="bg-[#FFFF00]">
              <th className="border-2 border-black p-2 w-[30px] text-center">No</th>
              <th className="border-2 border-black p-2 w-[100px] text-center">Tim/ Kecamatan</th>
              <th className="border-2 border-black p-2 w-[180px] text-center">Detail Kegiatan</th>
              <th className="border-2 border-black p-2 w-[200px] text-center">Lokasi</th>
              <th className="border-2 border-black p-2 w-[120px] text-center">Alat Operasional</th>
              <th className="border-2 border-black p-2 w-[40px] text-center">(Unit)</th>
              <th className="border-2 border-black p-2 w-[150px] text-center">Kegunaan</th>
              <th className="border-2 border-black p-2 w-[100px] text-center">Koordinator Lapangan</th>
              <th className="border-2 border-black p-2 w-[60px] text-center">Personil (Jlh. Org)</th>
              <th className="border-2 border-black p-2 w-[150px] text-center">Dasar Pengerjaan</th>
              <th className="border-2 border-black p-2 w-[100px] text-center">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {plans.length > 0 ? plans.map((plan, idx) => {
              const eqCount = plan.equipment?.length || 1;
              return (
                <React.Fragment key={plan.id}>
                  {/* Baris Pertama untuk setiap rencana kerja */}
                  <tr>
                    <td className="border-2 border-black p-2 text-center align-middle" rowSpan={eqCount}>{idx + 1}</td>
                    <td className="border-2 border-black p-2 text-center align-middle" rowSpan={eqCount}>{plan.category}</td>
                    <td className="border-2 border-black p-2 align-middle" rowSpan={eqCount}>{plan.description}</td>
                    <td className="border-2 border-black p-2 align-middle" rowSpan={eqCount}>
                      {plan.locations?.length > 0 ? (
                        <div className="space-y-1">
                          {plan.locations.map((loc, i) => (
                            <div key={i}>{i + 1}. {loc.street}</div>
                          ))}
                        </div>
                      ) : (
                        <div>1. {plan.street}</div>
                      )}
                    </td>
                    
                    {/* Kolom Alat Operasional (Baris Pertama) */}
                    <td className="border-2 border-black p-2 text-center align-middle">{plan.equipment?.[0]?.name || "-"}</td>
                    <td className="border-2 border-black p-2 text-center align-middle">{plan.equipment?.[0]?.quantity || "-"}</td>
                    <td className="border-2 border-black p-2 align-middle">{plan.equipment?.[0]?.purpose || "-"}</td>

                    <td className="border-2 border-black p-2 text-center align-middle" rowSpan={eqCount}>{plan.coordinator}</td>
                    <td className="border-2 border-black p-2 text-center align-middle" rowSpan={eqCount}>{plan.personnel}</td>
                    <td className="border-2 border-black p-2 align-middle whitespace-pre-wrap" rowSpan={eqCount}>{plan.basis}</td>
                    <td className="border-2 border-black p-2 align-middle" rowSpan={eqCount}>{plan.remarks || ""}</td>
                  </tr>

                  {/* Baris Tambahan jika ada lebih dari 1 alat */}
                  {plan.equipment?.slice(1).map((eq, eqIdx) => (
                    <tr key={`${plan.id}-eq-${eqIdx}`}>
                      <td className="border-2 border-black p-2 text-center align-middle">{eq.name}</td>
                      <td className="border-2 border-black p-2 text-center align-middle">{eq.quantity}</td>
                      <td className="border-2 border-black p-2 align-middle">{eq.purpose}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan={11} className="border-2 border-black p-10 text-center italic text-slate-400">
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
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          @page { size: landscape; margin: 0.5cm; }
          table { page-break-inside: auto; width: 100% !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          .bg-[#FFFF00] { background-color: #FFFF00 !important; -webkit-print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
};

export default PrintWorkPlanRekap;