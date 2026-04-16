"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Report } from '@/types/report';
import { reportService } from '@/services/reportService';
import { getUnitByCategory } from '@/utils/report-helpers';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrintRekap = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  
  const category = searchParams.get('category');

  useEffect(() => {
    loadData();
  }, [category]);

  const loadData = async () => {
    try {
      setLoading(true);
      let data = await reportService.getAllReports();
      if (category && category !== 'semua') {
        data = data.filter(r => r.category === category);
      }
      setReports(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center">Menyiapkan data cetak...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1000px] mx-auto space-y-6 no-print mb-8 p-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div className="text-center">
            <h1 className="font-bold">Preview Cetak Rekap</h1>
            <p className="text-xs text-slate-500">Kategori: {category === 'semua' ? 'Semua Kategori' : category}</p>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>
      </div>

      <div className="print-container space-y-8">
        {reports.map((report) => (
          <div key={report.id} className="bg-white border-2 border-black p-8 shadow-none break-after-page mb-10 last:mb-0 mx-auto max-w-[900px]">
            <div className="border-b-2 border-black pb-4 flex justify-between items-center mb-6">
              <div>
                <h1 className="text-lg font-bold">PEMERINTAH KOTA MEDAN</h1>
                <h2 className="text-xl font-black">DINAS LINGKUNGAN HIDUP</h2>
              </div>
              <div className="text-right">
                <h3 className="text-md font-bold underline">LAPORAN KEGIATAN HARIAN</h3>
                <p className="font-bold text-sm">{report.category.toUpperCase()}</p>
                {report.vehicle && <p className="text-[10px] font-bold">PLAT: {report.vehicle}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px] mb-6 border-b border-black pb-4">
              <div><p className="text-slate-500">Tanggal</p><p className="font-bold">{report.date}</p></div>
              <div><p className="text-slate-500">Total Volume</p><p className="font-bold">{report.volume} {getUnitByCategory(report.category)}</p></div>
            </div>

            <div className="space-y-8">
              {report.tasks?.map((task, i) => (
                <div key={i} className="space-y-3 border-b border-dashed border-slate-300 pb-6 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="bg-black text-white w-6 h-6 flex items-center justify-center font-bold rounded-full text-xs">{i + 1}</div>
                    <h3 className="text-sm font-bold">Kegiatan: {task.description}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="bg-slate-50 p-2 border border-black text-[10px]">
                        <p className="text-slate-500">Lokasi & Volume</p>
                        <p className="font-bold">{task.location.street}, {task.location.village}, {task.location.subDistrict}</p>
                        <p className="font-bold mt-1">Vol: {task.volume} {getUnitByCategory(report.category)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 border border-black text-[10px]">
                        <p className="text-slate-500">Personil & Operasional</p>
                        <p>Koord: <strong>{task.personnel.coordinator}</strong> | Anggota: <strong>{task.personnel.members}</strong></p>
                        {task.heavyEquipment?.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-slate-300">
                            {task.heavyEquipment.map((he, idx) => (
                              <p key={idx}>{he.type} ({he.quantity}) - P:{he.fuel.pertamax}L, D:{he.fuel.dexlite}L, S:{he.fuel.solar}L</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {['0%', '50%', '100%'].map((label, idx) => {
                        const img = idx === 0 ? task.photos.zero : idx === 1 ? task.photos.fifty : task.photos.hundred;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="aspect-[2.26/2.95] border border-black bg-slate-50 overflow-hidden">
                              {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-300">No Photo</div>}
                            </div>
                            <p className="text-center font-bold text-[8px] border border-black py-0.5">{label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {report.remarks && (
              <div className="mt-4 text-[10px] italic border-t border-black pt-2">
                <strong>Keterangan:</strong> {report.remarks}
              </div>
            )}
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-container { padding: 0 !important; margin: 0 !important; }
          .break-after-page { page-break-after: always; }
          @page { margin: 1cm; }
        }
      `}} />
    </div>
  );
};

export default PrintRekap;