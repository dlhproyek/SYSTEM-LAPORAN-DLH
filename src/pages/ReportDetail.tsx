"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Edit, Fuel, Users, Wrench, MessageSquare, Truck } from 'lucide-react';
import { Report } from '@/types/report';
import { showError } from '@/utils/toast';
import { getUnitByCategory } from '@/utils/report-helpers';
import { reportService } from '@/services/reportService';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadReport(id); }, [id]);

  const loadReport = async (reportId: string) => {
    try {
      setLoading(true);
      const data = await reportService.getReportById(reportId);
      setReport(data);
    } catch (error) {
      showError("Laporan tidak ditemukan");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const cleanDescription = (desc: string) => {
    return desc.replace(/^\[BK\s\d+\s[A-Z]+\]\s*/, '');
  };

  if (loading) return <div className="p-20 text-center">Memuat data...</div>;
  if (!report) return null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/edit/${report.id}`)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            <Button variant="destructive" onClick={async () => { if(confirm("Hapus?")) { await reportService.deleteReport(report.id); navigate('/'); } }}><Trash2 className="mr-2 h-4 w-4" /> Hapus</Button>
          </div>
        </div>

        <div id="report-content" className="bg-white border shadow-lg p-8 space-y-8">
          <div className="border-b-2 border-black pb-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">PEMERINTAH KOTA MEDAN</h1>
              <h2 className="text-2xl font-black">DINAS LINGKUNGAN HIDUP</h2>
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold underline">LAPORAN KEGIATAN HARIAN</h3>
              <p className="font-bold">{report.category.toUpperCase()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Tanggal</p><p className="font-bold">{report.date}</p></div>
            <div><p className="text-slate-500">Total Volume</p><p className="font-bold">{report.volume} {getUnitByCategory(report.category)}</p></div>
          </div>

          <div className="space-y-12">
            {report.tasks?.map((task, i) => (
              <div key={i} className="space-y-6 border-b-2 border-slate-100 pb-12 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="bg-black text-white w-8 h-8 flex items-center justify-center font-bold rounded-full">{i + 1}</div>
                  <h3 className="text-lg font-bold">Kegiatan: {cleanDescription(task.description)}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded border">
                      <p className="text-slate-500 text-xs uppercase font-bold mb-1">Lokasi & Volume</p>
                      <p className="font-bold">{task.location.street}</p>
                      <p className="text-xs text-slate-600">
                        Kel: {Array.isArray(task.location.village) ? task.location.village.join(", ") : task.location.village}, Kec: {task.location.subDistrict}
                      </p>
                      <p className="text-blue-600 font-bold mt-2">Volume: {task.volume} {getUnitByCategory(report.category)}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded border space-y-3">
                      <p className="text-slate-500 text-xs uppercase font-bold mb-1">Sumber Daya & Personil</p>
                      
                      {task.vehicle && (
                        <div className="mb-3 p-2 bg-orange-50 border border-orange-100 rounded flex items-center gap-2 text-orange-700 font-bold text-xs">
                          <Truck size={14} /> PLAT: {task.vehicle}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="flex items-center gap-1 font-bold"><Users size={12} /> Koordinator:</p>
                          <p>{task.personnel.coordinator}</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1 font-bold"><Users size={12} /> Anggota:</p>
                          <p>{task.personnel.members} Orang</p>
                        </div>
                      </div>
                      
                      {task.heavyEquipment?.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="font-bold text-[10px] mb-1">ALAT BERAT & BBM:</p>
                          {task.heavyEquipment.map((he, idx) => (
                            <div key={idx} className="mb-1 text-[10px]">
                              {he.type} {he.vehicle ? `- ${he.vehicle}` : ""} - P:{he.fuel.pertamax}L, D:{he.fuel.dexlite}L, S:{he.fuel.solar}L
                            </div>
                          ))}
                        </div>
                      )}

                      {task.equipment?.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="font-bold text-[10px] mb-1">PERALATAN:</p>
                          <div className="flex flex-wrap gap-2">
                            {task.equipment.map((e, idx) => (
                              <span key={idx} className="bg-white border px-2 py-0.5 rounded text-[10px]">{e.type} ({e.quantity})</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {task.remarks && (
                        <div className="pt-2 border-t">
                          <p className="font-bold text-[10px] mb-1 flex items-center gap-1"><MessageSquare size={10} /> KETERANGAN KEGIATAN:</p>
                          <p className="text-[10px] italic">{task.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['0%', '50%', '100%'].map((label, idx) => {
                      const img = idx === 0 ? task.photos.zero : idx === 1 ? task.photos.fifty : task.photos.hundred;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="aspect-[2.26/2.95] border-2 border-black bg-slate-50 overflow-hidden">
                            {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">No Photo</div>}
                          </div>
                          <p className="text-center font-bold text-[10px] border-2 border-black py-1">{label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {report.remarks && (
            <div className="pt-6 border-t-2 border-black">
              <p className="text-slate-500 text-xs uppercase font-bold mb-1">Keterangan Tambahan (Umum)</p>
              <p className="text-sm italic">{report.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;