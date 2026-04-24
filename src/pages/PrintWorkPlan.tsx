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

  const hasRemarks = plan.items.some(item => item.remarks && item.remarks.trim() !== "");
  const isTimPohon = plan.category === "Tim Pohon";

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
          <h3 className="text-lg font-bold underline uppercase">RENCANA KERJA WILAYAH 4 DLH MEDAN KOTA</h3>
          <p className="font-bold">Tanggal: {new Date(plan.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[10px] table-fixed">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-1 w-[30px]">No</th>
              <th className="border-2 border-black p-1 w-[60px]">Tim/ Kec</th>
              <th className="border-2 border-black p-1 w-[120px]">Detail Kegiatan</th>
              <th className="border-2 border-black p-1 w-[140px]">Lokasi (Jalan + Kel + Kec)</th>
              <th className="border-2 border-black p-1 w-[110px]">Alat Operasional</th>
              <th className="border-2 border-black p-1 w-[40px]">Unit</th>
              <th className="border-2 border-black p-1 w-[100px]">Kegunaan</th>
              <th className="border-2 border-black p-1 w-[80px]">Koordinator</th>
              <th className="border-2 border-black p-1 w-[50px]">Personil</th>
              <th className="border-2 border-black p-1 w-[100px]">Dasar Pengerjaan</th>
              {hasRemarks && <th className="border-2 border-black p-1 w-[100px]">Keterangan</th>}
            </tr>
          </thead>
          <tbody>
            {isTimPohon ? (
              // Logika khusus Tim Pohon: Menggabungkan baris
              (() => {
                const allTools = plan.items[0].tools;
                const allItems = plan.items;
                const totalRows = Math.max(1, allTools.length);

                const combinedDesc = allItems.map((it, idx) => `${idx + 1}. ${it.description}`).join("\n\n");
                const combinedLoc = allItems.map((it) => `${it.location.street}, ${Array.isArray(it.location.village) ? it.location.village.join(", ") : it.location.village}, ${it.location.subDistrict}`).join("\n\n");

                return Array.from({ length: totalRows }).map((_, rowIndex) => {
                  const tool = allTools[rowIndex];

                  return (
                    <tr key={`pohon-${rowIndex}`}>
                      {rowIndex === 0 && (
                        <>
                          <td className="border-2 border-black p-1 text-center align-top" rowSpan={totalRows}>1</td>
                          <td className="border-2 border-black p-1 text-center font-bold align-top" rowSpan={totalRows}>{plan.category}</td>
                          <td className="border-2 border-black p-1 align-top whitespace-pre-line" rowSpan={totalRows}>{combinedDesc}</td>
                          <td className="border-2 border-black p-1 align-top whitespace-pre-line" rowSpan={totalRows}>{combinedLoc}</td>
                        </>
                      )}
                      <td className="border-2 border-black p-1 align-top break-words">{tool?.name ? `• ${tool.name}` : "-"}</td>
                      <td className="border-2 border-black p-1 text-center align-top">{tool?.unit || "-"}</td>
                      <td className="border-2 border-black p-1 align-top break-words">{tool?.usage || "-"}</td>
                      {rowIndex === 0 && (
                        <>
                          <td className="border-2 border-black p-1 text-center align-top" rowSpan={totalRows}>{plan.items[0].coordinator}</td>
                          <td className="border-2 border-black p-1 text-center align-top" rowSpan={totalRows}>{plan.items[0].personnel.members} Org</td>
                          <td className="border-2 border-black p-1 align-top break-words" rowSpan={totalRows}>{plan.items[0].basis}</td>
                          {hasRemarks && <td className="border-2 border-black p-1 italic align-top break-words" rowSpan={totalRows}>{plan.items[0].remarks || "-"}</td>}
                        </>
                      )}
                    </tr>
                  );
                });
              })()
            ) : (
              // Logika standar
              plan.items.map((item, itemIdx) => {
                const toolsToRender = item.tools.length > 0 ? item.tools : [{ name: "", unit: "", usage: "" }];
                const rowCount = toolsToRender.length;
                
                return toolsToRender.map((tool, toolIdx) => (
                  <tr key={`${itemIdx}-${toolIdx}`}>
                    {toolIdx === 0 && (
                      <>
                        <td className="border-2 border-black p-1 text-center align-top" rowSpan={rowCount}>{itemIdx + 1}</td>
                        <td className="border-2 border-black p-1 text-center font-bold align-top" rowSpan={rowCount}>{plan.category}</td>
                        <td className="border-2 border-black p-1 align-top break-words" rowSpan={rowCount}>{item.description}</td>
                        <td className="border-2 border-black p-1 align-top break-words">
                          {item.location.street}, {Array.isArray(item.location.village) ? item.location.village.join(", ") : item.location.village}, {item.location.subDistrict}
                        </td>
                      </>
                    )}
                    <td className="border-2 border-black p-1 align-top break-words">{tool.name ? `• ${tool.name}` : "-"}</td>
                    <td className="border-2 border-black p-1 text-center align-top">{tool.unit || "-"}</td>
                    <td className="border-2 border-black p-1 align-top break-words">{tool.usage || "-"}</td>
                    {toolIdx === 0 && (
                      <>
                        <td className="border-2 border-black p-1 text-center align-top" rowSpan={rowCount}>{item.coordinator}</td>
                        <td className="border-2 border-black p-1 text-center align-top" rowSpan={rowCount}>{item.personnel.members} Org</td>
                        <td className="border-2 border-black p-1 align-top break-words" rowSpan={rowCount}>{item.basis}</td>
                        {hasRemarks && <td className="border-2 border-black p-1 italic align-top break-words" rowSpan={rowCount}>{item.remarks || "-"}</td>}
                      </>
                    )}
                  </tr>
                ));
              })
            )}
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