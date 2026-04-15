"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Edit, FileDown, FileSpreadsheet, Fuel } from 'lucide-react';
import { Report } from '@/types/report';
import { showSuccess, showError } from '@/utils/toast';
import { getUnitByCategory } from '@/utils/report-helpers';
import { reportService } from '@/services/reportService';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-slate-500">Tanggal</p><p className="font-bold">{report.date}</p></div>
            <div><p className="text-slate-500">Koordinator</p><p className="font-bold">{report.personnel.coordinator}</p></div>
            <div><p className="text-slate-500">Personil</p><p className="font-bold">{report.personnel.members} Orang</p></div>
          </div>

          <table className="w-full border-collapse border-2 border-black">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-2 border-black p-2 w-12">NO</th>
                <th className="border-2 border-black p-2 text-left">URAIAN KEGIATAN</th>
                <th className="border-2 border-black p-2 text-left">LOKASI</th>
              </tr>
            </thead>
            <tbody>
              {report.tasks?.map((task, i) => (
                <tr key={i}>
                  <td className="border-2 border-black p-2 text-center">{i + 1}</td>
                  <td className="border-2 border-black p-2">{task.description}</td>
                  <td className="border-2 border-black p-2">{task.location.street}, {task.location.village}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-4">
            {['0%', '50%', '100%'].map((label, i) => {
              const img = i === 0 ? report.photos.zero : i === 1 ? report.photos.fifty : report.photos.hundred;
              return (
                <div key={i} className="space-y-1">
                  <div className="aspect-video border-2 border-black bg-slate-50 overflow-hidden">
                    {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300">No Photo</div>}
                  </div>
                  <p className="text-center font-bold text-xs border-2 border-black py-1">{label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-black p-4 space-y-4">
              <h4 className="font-bold border-b-2 border-black pb-1">OPERASIONAL ALAT BERAT & BBM</h4>
              {report.heavyEquipment?.length > 0 ? (
                <div className="space-y-3">
                  {report.heavyEquipment.map((he, i) => (
                    <div key={i} className="text-sm border-b border-dashed pb-2 last:border-0">
                      <p className="font-bold">{he.type} ({he.quantity} Unit)</p>
                      <div className="grid grid-cols-3 gap-2 mt-1 text-[11px] text-slate-600">
                        <span className="flex items-center gap-1"><Fuel size={10} /> P: {he.fuel.pertamax}</span>
                        <span className="flex items-center gap-1"><Fuel size={10} /> D: {he.fuel.dexlite} L</span>
                        <span className="flex items-center gap-1"><Fuel size={10} /> S: {he.fuel.solar} L</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 italic text-sm">Tidak ada alat berat</p>}
            </div>

            <div className="border-2 border-black p-4 space-y-4">
              <h4 className="font-bold border-b-2 border-black pb-1">PERALATAN LAIN & VOLUME</h4>
              <div className="text-sm space-y-1">
                {report.equipment.map((e, i) => <p key={i}>{e.type}: <strong>{e.quantity}</strong></p>)}
                <div className="mt-4 pt-2 border-t border-black">
                  <p>Total Volume: <strong>{report.volume} {getUnitByCategory(report.category)}</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;