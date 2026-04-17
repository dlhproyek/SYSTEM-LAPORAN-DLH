"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { Report } from '../types/report';
import { Button } from '../components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { getUnitByCategory } from '../utils/report-helpers';

const PrintRekap = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get('category') || 'semua';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const filter = category === 'semua' ? null : category;
        const data = await reportService.getAllReports(filter);
        setReports(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [category]);

  if (loading) return <div className="p-10 text-center">Menyiapkan dokumen...</div>;

  return (
    <div className="min-h-screen bg-white p-4 md:p-10">
      <div className="max-w-6xl mx-auto print:p-0">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-blue-600">
            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>

        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold uppercase">Laporan Harian Kegiatan</h1>
          <h2 className="text-xl font-bold uppercase">Dinas Lingkungan Hidup</h2>
          <p className="text-sm mt-2">Kategori: {category === 'semua' ? 'Semua Tim' : category}</p>
        </div>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 w-8">No</th>
              <th className="border border-black p-2 w-20">Tanggal</th>
              <th className="border border-black p-2">Uraian Kegiatan</th>
              <th className="border border-black p-2">Lokasi</th>
              <th className="border border-black p-2 w-16">Volume</th>
              <th className="border border-black p-2 w-24">Koordinator</th>
              <th className="border border-black p-2 w-32">Foto</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={r.id}>
                <td className="border border-black p-2 text-center">{i + 1}</td>
                <td className="border border-black p-2">{new Date(r.date).toLocaleDateString('id-ID')}</td>
                <td className="border border-black p-2">{r.description}</td>
                <td className="border border-black p-2">{r.location.street}</td>
                <td className="border border-black p-2 text-center">{r.volume} {getUnitByCategory(r.category)}</td>
                <td className="border border-black p-2">{r.personnel.coordinator}</td>
                <td className="border border-black p-2">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {r.photos && r.photos.length > 0 ? (
                      r.photos.slice(0, 2).map((url, idx) => (
                        <img key={idx} src={url} alt="Doc" className="w-10 h-10 object-cover border" />
                      ))
                    ) : (
                      <span className="text-[8px] text-slate-400 italic">No Photo</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-64">
            <p>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="mt-2 font-bold">Mengetahui,</p>
            <div className="h-20"></div>
            <p className="font-bold underline">( ____________________ )</p>
            <p className="text-[10px]">Kepala Bidang / Koordinator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintRekap;