"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { Report } from '../types/report';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Calendar, MapPin, Users, Tag, Edit } from 'lucide-react';
import { getUnitByCategory } from '../utils/report-helpers';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const data = await reportService.getReportById(id);
        setReport(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Memuat detail...</div>;
  if (!report) return <div className="p-10 text-center">Laporan tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <Button variant="outline" onClick={() => navigate(`/edit/${report.id}`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Laporan
          </Button>
        </div>

        <Card className="overflow-hidden border-t-4 border-t-blue-600">
          <CardHeader className="bg-white border-b">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{report.category}</span>
                </div>
                <CardTitle className="text-2xl font-bold">{report.description}</CardTitle>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-slate-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Volume Pekerjaan</p>
                <p className="text-xl font-bold text-slate-900">{report.volume} {getUnitByCategory(report.category)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Koordinator</p>
                <p className="text-xl font-bold text-slate-900">{report.personnel.coordinator}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Jumlah Anggota</p>
                <p className="text-xl font-bold text-slate-900">{report.personnel.members} Orang</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-50 p-2 rounded-lg"><MapPin className="h-5 w-5 text-red-600" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Lokasi Kegiatan</p>
                  <p className="text-lg font-medium text-slate-900">{report.location.street}</p>
                  <p className="text-sm text-slate-500">{report.location.village}, {report.location.subDistrict}</p>
                </div>
              </div>
            </div>

            {report.remarks && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Keterangan Tambahan</p>
                <p className="text-slate-700 italic">"{report.remarks}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportDetail;