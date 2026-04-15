"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { Database, Plus, ClipboardList, Loader2 } from "lucide-react";

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    volume: 0,
    unit: 'm3'
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching:", error);
    } else {
      setReports(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('reports')
        .insert([
          {
            ...formData,
            volume: parseInt(formData.volume.toString()),
            syncStatus: 'synced'
          }
        ]);

      if (error) throw error;

      showSuccess("Laporan berhasil disimpan!");
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        volume: 0,
        unit: 'm3'
      });
      fetchReports();
    } catch (error: any) {
      showError("Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sistem Laporan</h1>
            <p className="text-slate-500">Kelola data proyek dengan efisien</p>
          </div>
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            <Database size={16} />
            Terhubung ke Supabase
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="text-blue-600" />
                Buat Laporan Baru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Input 
                    id="category" 
                    placeholder="Contoh: Drainase, Jalan, dll" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume</Label>
                    <Input 
                      id="volume" 
                      type="number" 
                      value={formData.volume}
                      onChange={(e) => setFormData({...formData, volume: parseInt(e.target.value) || 0})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Satuan</Label>
                    <Input 
                      id="unit" 
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Keterangan</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Detail pekerjaan..." 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                  Simpan Laporan
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* List Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardList className="text-slate-600" />
              Laporan Terakhir
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {reports.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300 text-slate-400">
                  Belum ada data laporan
                </div>
              ) : (
                reports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {report.category}
                        </span>
                        <span className="text-xs text-slate-400">{report.date}</span>
                      </div>
                      <p className="font-medium text-slate-800">{report.description || 'Tanpa keterangan'}</p>
                      <div className="mt-2 text-sm text-slate-600">
                        Volume: <span className="font-semibold">{report.volume} {report.unit}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;