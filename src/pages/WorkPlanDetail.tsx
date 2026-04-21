"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Edit, MapPin, Calendar, Wrench, Users, FileText, Info, Truck } from 'lucide-react';
import { workPlanService } from '@/services/workPlanService';
import { WorkPlan } from '@/types/work-plan';
import { showError } from '@/utils/toast';
import { supabase } from '@/lib/supabase';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const WorkPlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<WorkPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadData(id); }, [id]);

  const loadData = async (planId: string) => {
    try {
      const result = await workPlanService.getWorkPlanById(planId);
      setData(result);
    } catch (error) {
      showError("Data tidak ditemukan");
      navigate('/work-plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="p-20 text-center">Memuat data...</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-[900px] mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" onClick={() => navigate('/work-plans')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/work-plans/edit/${data.id}`)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            <Button onClick={handlePrint} className="bg-blue-600"><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
          </div>
        </div>

        <div className="bg-white border shadow-lg p-10 space-y-8 print:shadow-none print:border-none">
          <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden"><img src={LOGO_MEDAN_URL} className="max-h-full max-w-full object-contain" alt="Logo Medan" /></div>
            <div className="text-center px-4">
              <h1 className="text-lg font-bold uppercase">Pemerintah Kota Medan</h1>
              <h2 className="text-xl font-black uppercase">Dinas Lingkungan Hidup</h2>
              <p className="text-[10px] italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
            </div>
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden"><img src={LOGO_DLH_URL} className="max-h-full max-w-full object-contain" alt="Logo DLH" /></div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold underline uppercase">RENCANA KERJA HARIAN</h3>
            <p className="font-bold uppercase">{data.category}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 text-sm">
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="font-bold flex items-center gap-2"><Calendar size={14} /> Tanggal</span>
              <span className="col-span-2">: {new Date(data.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="font-bold flex items-center gap-2"><MapPin size={14} /> Lokasi & Kegiatan</span>
              <div className="col-span-2 space-y-6">
                {data.locations?.map((loc, i) => (
                  <div key={i} className="flex gap-2">
                    <span>:</span>
                    <div className="space-y-2 flex-1">
                      <div>
                        <p className="font-bold text-blue-700">{loc.description}</p>
                        <p className="font-medium">{loc.street}</p>
                        <p className="text-xs text-slate-500">Kel. {loc.villages.join(", ")}, Kec. {loc.sub_district}</p>
                      </div>
                      
                      {loc.equipment?.length > 0 && (
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <p className="text-[10px] font-bold text-orange-600 uppercase mb-1 flex items-center gap-1"><Wrench size={10} /> Alat Operasional Lokasi:</p>
                          <div className="space-y-1">
                            {loc.equipment.map((eq, eqIdx) => (
                              <div key={eqIdx} className="text-[11px] flex items-center gap-2">
                                • {eq.name} ({eq.quantity} Unit) {eq.vehicle && <span className="text-blue-600 font-bold flex items-center gap-1"><Truck size={10} /> {eq.vehicle}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 border-b pb-2">
              <span className="font-bold flex items-center gap-2"><Users size={14} /> Koordinator</span>
              <span className="col-span-2">: {data.coordinator}</span>
            </div>
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="font-bold flex items-center gap-2"><Users size={14} /> Personil</span>
              <span className="col-span-2">: {data.personnel} Orang</span>
            </div>
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="font-bold flex items-center gap-2"><Info size={14} /> Dasar Pengerjaan</span>
              <span className="col-span-2 whitespace-pre-wrap">: {data.basis}</span>
            </div>
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="font-bold flex items-center gap-2"><FileText size={14} /> Keterangan</span>
              <span className="col-span-2">: {data.remarks || "-"}</span>
            </div>
          </div>

          <div className="mt-16 space-y-8">
            <div className="flex justify-end text-sm">
              <div className="w-1/3 text-center">
                <p>Medan, {new Date(data.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold">Pengawas Taman Penghijauan</p>
                <div className="h-20"></div>
                <p className="font-bold underline">Jhosua Sibarani, S.T</p>
                <p className="text-xs">NIP. 19740907 200903 1 002</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="text-center space-y-20">
                <div>
                  <p>Mengetahui :</p>
                  <p className="font-bold">Kabid Tata Lingkungan</p>
                </div>
                <div>
                  <p className="font-bold underline">Heni Rustati, ST, M.Si</p>
                  <p className="text-xs">NIP. 19720223 200604 2 002</p>
                </div>
              </div>
              <div className="text-center space-y-20">
                <div>
                  <p>Diketahui :</p>
                  <p className="font-bold">Ketua Tim Pemeliharaan Lingkungan</p>
                </div>
                <div>
                  <p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p>
                  <p className="text-xs">NIP. 19811128 201001 2 011</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; }
          @page { size: portrait; margin: 1.5cm; }
        }
      `}} />
    </div>
  );
};

export default WorkPlanDetail;