"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { Report } from '../types/report';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

const EditReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState<Partial<Report>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const data = await reportService.getReportById(id);
        setFormData(data);
      } catch (error) {
        showError("Gagal memuat data");
      } finally {
        setFetching(false);
      }
    };
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    try {
      await reportService.updateReport(id, formData);
      showSuccess("Laporan berhasil diperbarui");
      navigate('/');
    } catch (error) {
      showError("Gagal memperbarui laporan");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-10 text-center">Memuat data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Batal
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold">Tanggal</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">Volume</label>
                  <Input type="number" value={formData.volume} onChange={e => setFormData({...formData, volume: Number(e.target.value)})} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold">Uraian Kegiatan</label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold">Lokasi (Jalan)</label>
                <Input value={formData.location?.street} onChange={e => setFormData({...formData, location: {...formData.location!, street: e.target.value}})} required />
              </div>

              <Button type="submit" className="w-full bg-blue-600" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Simpan Perubahan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditReport;