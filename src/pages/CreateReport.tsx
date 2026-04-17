"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/reportService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

const CreateReport = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    location: { street: '', village: '', subDistrict: '' },
    volume: 0,
    personnel: { coordinator: profile?.username || '', members: 0 },
    remarks: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reportService.createReport({
        ...formData,
        category: profile?.category || 'Umum'
      });
      showSuccess("Laporan berhasil disimpan");
      navigate('/');
    } catch (error) {
      showError("Gagal menyimpan laporan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Batal
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Buat Laporan Baru - {profile?.category}</CardTitle>
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
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Apa yang dikerjakan hari ini?" required />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold">Lokasi (Jalan)</label>
                <Input value={formData.location.street} onChange={e => setFormData({...formData, location: {...formData.location, street: e.target.value}})} placeholder="Nama Jalan" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold">Kelurahan</label>
                  <Input value={formData.location.village} onChange={e => setFormData({...formData, location: {...formData.location, village: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">Kecamatan</label>
                  <Input value={formData.location.subDistrict} onChange={e => setFormData({...formData, location: {...formData.location, subDistrict: e.target.value}})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold">Koordinator</label>
                  <Input value={formData.personnel.coordinator} onChange={e => setFormData({...formData, personnel: {...formData.personnel, coordinator: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">Jumlah Anggota</label>
                  <Input type="number" value={formData.personnel.members} onChange={e => setFormData({...formData, personnel: {...formData.personnel, members: Number(e.target.value)}})} />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Simpan Laporan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateReport;