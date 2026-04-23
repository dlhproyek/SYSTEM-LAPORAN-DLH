"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkPlan } from '@/types/workPlan';
import { workPlanService } from '@/services/workPlanService';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Calendar as CalendarIcon, FileText, ChevronDown, PenTool, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

type SignatureMode = "with-signature" | "without-signature";

const WorkPlanDailyRecap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<WorkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || "semua");
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("with-signature");
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await workPlanService.getAllWorkPlans();
      const filtered = data.filter(p => selectedDate === "semua" || p.date === selectedDate);
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.category.localeCompare(b.category));
      setPlans(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/work-plans')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            
            <div className="flex items-center gap-2">
              <Select value={selectedDate === "semua" ? "semua" : "custom"} onValueChange={(v) => {
                if (v === "semua") setSelectedDate("semua");
                else setSelectedDate(new Date().toISOString().split('T')[0]);
              }}>
                <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 h-10">
                  <SelectValue placeholder="Pilih Tanggal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tanggal</SelectItem>
                  <SelectItem value="custom">Pilih Tanggal...</SelectItem>
                </SelectContent>
              </Select>
              {selectedDate !== "semua" && (
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-10 w-[180px] h-10" />
                </div>
              )}
            </div>

            <Select value={signatureMode} onValueChange={(v) => setSignatureMode(v as SignatureMode)}>
              <SelectTrigger className="w-[180px] bg-amber-50 border-amber-200 h-10 text-amber-700 font-medium">
                <SelectValue placeholder="Tanda Tangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="with-signature"><div className="flex items-center gap-2"><PenTool size={14} /> Ada Tanda Tangan</div></SelectItem>
                <SelectItem value="without-signature"><div className="flex items-center gap-2"><PenTool size={14} className="opacity-40" /> Tanpa Tanda Tangan</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/work-plans/create')} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Plus className="mr-2 h-4 w-4" /> Tambah Rencana Baru
            </Button>
            <Button onClick={() => window.print()} className="bg-blue-600">
              <Printer className="mr-2 h-4 w-4" /> Cetak Rekap
            </Button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="print-area bg-white p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
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
          <h3 className="text-xl font-bold underline uppercase">REKAP RENCANA KERJA HARIAN</h3>
          <p className="text-lg font-bold">
            Tanggal: {selectedDate === "semua" ? "Semua Tanggal" : format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeId })}
          </p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[9px] table-fixed">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-1 w-[30px]">No</th>
              <th className="border-2 border-black p-1 w-[80px]">Tim/ Kec</th>
              <th className="border-2 border-black p-1 w-[120px]">Detail Kegiatan</th>
              <th className="border-2 border-black p-1 w-[150px]">Lokasi</th>
              <th className="border-2 border-black p-1 w-[100px]">Alat Operasional</th>
              <th className="border-2 border-black p-1 w-[30px]">Unit</th>
              <th className="border-2 border-black p-1 w-[100px]">Kegunaan</th>
              <th className="border-2 border-black p-1 w-[80px]">Koordinator</th>
              <th className="border-2 border-black p-1 w-[40px]">Pers</th>
              <th className="border-2 border-black p-1 w-[100px]">Dasar</th>
              <th className="border-2 border-black p-1 w-[100px]">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {plans.length > 0 ? (
              plans.flatMap((plan, pIdx) => 
                plan.items.map((item, iIdx) => (
                  <tr key={`${plan.id}-${iIdx}`}>
                    {iIdx === 0 ? (
                      <>
                        <td className="border-2 border-black p-1 text-center align-top font-bold" rowSpan={plan.items.length}>{pIdx + 1}</td>
                        <td className="border-2 border-black p-1 text-center font-bold align-top" rowSpan={plan.items.length}>{plan.category}</td>
                      </>
                    ) : null}
                    <td className="border-2 border-black p-1 align-top break-words">{item.description}</td>
                    <td className="border-2 border-black p-1 align-top break-words">
                      {item.location.street}, {Array.isArray(item.location.village) ? item.location.village.join(", ") : item.location.village}, {item.location.subDistrict}
                    </td>
                    <td colSpan={3} className="border-2 border-black p-0 align-top">
                      <table className="w-full border-collapse border-none">
                        <tbody>
                          {item.tools.map((t, tIdx) => (
                            <tr key={tIdx} className={tIdx !== item.tools.length - 1 ? "border-b-2 border-black" : ""}>
                              <td className="p-1 w-[100px] border-r-2 border-black align-top break-words">• {t.name}</td>
                              <td className="p-1 w-[30px] border-r-2 border-black text-center align-top">{t.unit}</td>
                              <td className="p-1 w-[100px] align-top break-words">{t.usage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                    <td className="border-2 border-black p-1 text-center align-top">{item.coordinator}</td>
                    <td className="border-2 border-black p-1 text-center align-top">{item.personnel.members}</td>
                    <td className="border-2 border-black p-1 align-top break-words">{item.basis}</td>
                    <td className="border-2 border-black p-1 italic align-top break-words">{item.remarks || "-"}</td>
                  </tr>
                ))
              )
            ) : (
              <tr><td colSpan={11} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada rencana kerja untuk periode ini</td></tr>
            )}
          </tbody>
        </table>

        {signatureMode === "with-signature" && (
          <div className="mt-12 flex justify-end">
            <div className="text-center w-64">
              <p>Medan, {format(new Date(), 'dd MMMM yyyy', { locale: localeId })}</p>
              <p className="font-bold mt-1">Koordinator Wilayah 4</p>
              <div className="h-20"></div>
              <p className="font-bold underline">( ............................................ )</p>
            </div>
          </div>
        )}
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
        }
      `}} />
    </div>
  );
};

export default WorkPlanDailyRecap;