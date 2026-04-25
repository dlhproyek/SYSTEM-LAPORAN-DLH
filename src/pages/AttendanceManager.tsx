"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Save, Printer, Plus, Trash2, 
  Users, Calendar as CalendarIcon, Loader2, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { attendanceService } from '@/services/attendanceService';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { showSuccess, showError } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_PERSONNEL = [
  "Mhd. Said", "Ismail Siregar", "Erwinsyah", "Benget Simanjuntak", 
  "Budi", "Sutrisno", "M. Irwan Syahputra, SE", "Aluddin Gultom"
];

const AttendanceManager = () => {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState("Taman Kota");
  const [records, setRecords] = useState<Partial<AttendanceRecord>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLoggedIn = !!session;
  const isPimpinan = profile?.role === 'pimpinan';

  useEffect(() => {
    loadAttendance();
  }, [date, category]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceByDate(date, category);
      if (data.length > 0) {
        setRecords(data);
      } else {
        // Jika data kosong, buat list default
        setRecords(DEFAULT_PERSONNEL.map(name => ({
          personnel_name: name,
          position: "PHL",
          status: "Hadir" as AttendanceStatus,
          date,
          category
        })));
      }
    } catch (error) {
      showError("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPersonnel = () => {
    setRecords([...records, { 
      personnel_name: "", 
      position: "PHL", 
      status: "Hadir", 
      date, 
      category 
    }]);
  };

  const handleRemovePersonnel = (index: number) => {
    setRecords(records.filter((_, i) => i !== index));
  };

  const updateRecord = (index: number, field: string, value: any) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], [field]: value };
    setRecords(newRecords);
  };

  const handleSave = async () => {
    if (!isLoggedIn || isPimpinan) return;
    try {
      setSaving(true);
      const validRecords = records.filter(r => r.personnel_name?.trim() !== "");
      await attendanceService.saveAttendance(validRecords.map(r => ({
        date,
        category,
        personnel_name: r.personnel_name!,
        position: r.position || "PHL",
        status: r.status as AttendanceStatus,
        remarks: r.remarks || ""
      })));
      showSuccess("Absensi berhasil disimpan");
    } catch (error) {
      showError("Gagal menyimpan absensi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="text-blue-600" /> Absensi PHL
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open(`/attendance/print?date=${date}&category=${category}`, '_blank')}>
              <Printer className="mr-2 h-4 w-4" /> Cetak PDF
            </Button>
            {isLoggedIn && !isPimpinan && (
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600">
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />} Simpan
              </Button>
            )}
          </div>
        </div>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Tanggal Absensi</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Tim / Kategori</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tim" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Taman Kota">Taman Kota</SelectItem>
                    <SelectItem value="Taman Amplas">Taman Amplas</SelectItem>
                    <SelectItem value="Taman Area">Taman Area</SelectItem>
                    <SelectItem value="Tim Babat">Tim Babat</SelectItem>
                    <SelectItem value="Tim Siram">Tim Siram</SelectItem>
                    <SelectItem value="Tim Pohon">Tim Pohon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 text-center text-slate-500">Memuat data...</div>
            ) : (
              <div className="space-y-4">
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 rounded-t-lg text-[10px] font-bold uppercase text-slate-600">
                  <div className="col-span-1">No</div>
                  <div className="col-span-4">Nama Personil</div>
                  <div className="col-span-3">Jabatan/Tugas</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>
                <div className="divide-y border rounded-lg bg-white">
                  {records.map((record, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                      <div className="col-span-1 font-bold text-slate-400 md:text-center">{index + 1}</div>
                      <div className="col-span-4">
                        <Input 
                          placeholder="Nama Lengkap" 
                          value={record.personnel_name} 
                          onChange={(e) => updateRecord(index, 'personnel_name', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input 
                          placeholder="PHL / Koordinator" 
                          value={record.position} 
                          onChange={(e) => updateRecord(index, 'position', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-3">
                        <Select value={record.status} onValueChange={(v) => updateRecord(index, 'status', v)}>
                          <SelectTrigger className={cn(
                            "h-9 font-bold",
                            record.status === 'Hadir' ? "text-green-600" : "text-red-600"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hadir">Hadir</SelectItem>
                            <SelectItem value="Sakit">Sakit</SelectItem>
                            <SelectItem value="Izin">Izin</SelectItem>
                            <SelectItem value="Alpa">Alpa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-400 hover:text-red-600"
                          onClick={() => handleRemovePersonnel(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={handleAddPersonnel} className="w-full border-dashed py-6 text-blue-600">
                  <Plus className="mr-2 h-4 w-4" /> Tambah Personil Baru
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceManager;