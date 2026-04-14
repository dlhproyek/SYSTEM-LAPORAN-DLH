"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, MapPin, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess } from '@/utils/toast';
import { Report, ReportCategory, Equipment } from '@/types/report';
import { medanDistricts } from '@/data/medan-districts';
import ImageUpload from './ImageUpload';
import { Badge } from "@/components/ui/badge";
import { getUnitByCategory } from '@/utils/report-helpers';

const categories: ReportCategory[] = [
  "Taman Kota", 
  "Taman Amplas", 
  "Taman Area", 
  "Tim Babat", 
  "Tim Siram", 
  "Tim Pohon"
];

const coordinatorMapping: Record<string, string> = {
  "Tim Pohon": "Budi",
  "Taman Kota": "Mhd. Said",
  "Taman Area": "Ismail Siregar",
  "Taman Amplas": "Erwinsyah",
  "Tim Babat": "Benget Simanjuntak",
  "Tim Siram": "Aluddin Siregar / M. Irwan Syahputra, SE" 
};

const locationSchema = z.object({
  street: z.string().min(1, "Jalan wajib diisi"),
  village: z.string().min(1, "Kelurahan wajib diisi"),
  subDistrict: z.string().min(1, "Kecamatan wajib diisi"),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  description: z.string().optional().default(""),
  location: locationSchema.optional(),
  tasks: z.array(z.object({
    description: z.string().min(1, "Uraian wajib diisi"),
    location: locationSchema,
  })).min(1, "Minimal harus ada satu kegiatan"),
  photos: z.object({
    zero: z.string().optional().default(""),
    fifty: z.string().optional().default(""),
    hundred: z.string().optional().default(""),
  }),
  volume: z.coerce.number().min(0),
  unit: z.string().optional().default(""),
  equipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat wajib diisi"),
    quantity: z.coerce.number().min(1),
  })),
  heavyEquipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat berat wajib diisi"),
    quantity: z.coerce.number().min(1),
  })),
  fuel: z.object({
    pertamax: z.coerce.number().refine((val) => val === 0 || val >= 10000, {
      message: "Minimal Rp. 10.000 jika diisi",
    }).default(0),
    dexlite: z.coerce.number().default(0),
    solar: z.coerce.number().default(0),
    remarks: z.string().optional().default(""),
  }),
  personnel: z.object({
    coordinator: z.string().min(1, "Nama koordinator wajib diisi"),
    members: z.coerce.number().min(0),
  }),
  remarks: z.string().optional().default(""),
});

interface ReportFormProps {
  initialData?: Report;
  isEditing?: boolean;
}

const ReportForm = ({ initialData, isEditing = false }: ReportFormProps) => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<{
    equipment: string[];
    heavyEquipment: string[];
  }>({ equipment: [], heavyEquipment: [] });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      tasks: initialData.tasks || [],
    } : {
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      tasks: [{ description: "", location: { street: "", village: "", subDistrict: "" } }],
      photos: { zero: "", fifty: "", hundred: "" },
      volume: 0,
      unit: "",
      equipment: [{ type: "", quantity: 1 }],
      heavyEquipment: [],
      fuel: { pertamax: 0, dexlite: 0, solar: 0, remarks: "" },
      personnel: { coordinator: "", members: 0 },
      remarks: "",
    },
  });

  const selectedCategory = form.watch("category");
  const heavyEquipmentList = form.watch("heavyEquipment");

  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  useEffect(() => {
    const reports: Report[] = JSON.parse(localStorage.getItem('reports') || '[]');
    const equipTypes = new Set<string>();
    const heavyEquipTypes = new Set<string>();

    reports.forEach(r => {
      r.equipment?.forEach(e => e.type && equipTypes.add(e.type));
      r.heavyEquipment?.forEach(h => h.type && heavyEquipTypes.add(h.type));
    });

    setSuggestions({
      equipment: Array.from(equipTypes),
      heavyEquipment: Array.from(heavyEquipTypes)
    });

    if (!isEditing && selectedCategory) {
      const coordinatorName = coordinatorMapping[selectedCategory];
      if (coordinatorName) {
        form.setValue("personnel.coordinator", coordinatorName);
      }
    }
  }, [selectedCategory, form, isEditing]);

  const { fields: equipFields, append: appendEquip, remove: removeEquip } = useFieldArray({
    control: form.control,
    name: "equipment",
  });

  const { fields: heavyFields, append: appendHeavy, remove: removeHeavy } = useFieldArray({
    control: form.control,
    name: "heavyEquipment",
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const mainLocation = values.tasks[0].location;
    const mainDescription = values.tasks[0].description;

    const reportData = {
      ...values,
      description: mainDescription,
      location: mainLocation,
      category: values.category as ReportCategory,
      unit: getUnitByCategory(values.category),
      syncStatus: 'pending' as const,
    };

    if (isEditing && initialData) {
      const updatedReport: Report = {
        ...reportData,
        id: initialData.id,
        createdAt: initialData.createdAt,
      } as Report;

      const updatedReports = reports.map((r: Report) => 
        r.id === initialData.id ? updatedReport : r
      );
      localStorage.setItem('reports', JSON.stringify(updatedReports));
      showSuccess("Laporan berhasil diperbarui!");
    } else {
      const newReport: Report = {
        ...reportData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      } as Report;
      localStorage.setItem('reports', JSON.stringify([newReport, ...reports]));
      showSuccess("Laporan berhasil disimpan!");
    }
    navigate('/');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
        <datalist id="equipment-suggestions">
          {suggestions.equipment.map(s => <option key={s} value={s} />)}
        </datalist>
        <datalist id="heavy-equipment-suggestions">
          {suggestions.heavyEquipment.map(s => <option key={s} value={s} />)}
        </datalist>

        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <h1 className="text-2xl font-bold text-primary">
            {isEditing ? "Edit Laporan" : "Input Laporan Baru"}
          </h1>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" /> Simpan
          </Button>
        </div>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader><CardTitle className="text-lg">Informasi Dasar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem><FormLabel>Hari / Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Kategori / Tim</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
                  <SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Daftar Kegiatan & Lokasi</h2>
          </div>
          {taskFields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-blue-400 relative">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">Kegiatan #{index + 1}</Badge>
                  {taskFields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeTask(index)}><Trash2 className="h-4 w-4 mr-1" /> Hapus</Button>
                  )}
                </div>
                <FormField control={form.control} name={`tasks.${index}.description`} render={({ field }) => (
                  <FormItem><FormLabel>Uraian Kegiatan</FormLabel><FormControl><Input placeholder="Contoh: Pemangkasan pohon, penyiraman, dll..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name={`tasks.${index}.location.street`} render={({ field }) => (
                    <FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input placeholder="Jl. ..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`tasks.${index}.location.subDistrict`} render={({ field }) => (
                    <FormItem><FormLabel>Kecamatan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger></FormControl>
                        <SelectContent>{Object.keys(medanDistricts).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`tasks.${index}.location.village`} render={({ field }) => (
                    <FormItem><FormLabel>Kelurahan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger></FormControl>
                        <SelectContent>{form.watch(`tasks.${index}.location.subDistrict`) && medanDistricts[form.watch(`tasks.${index}.location.subDistrict`)].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed py-6" onClick={() => appendTask({ description: "", location: { street: "", village: "", subDistrict: "" } })}><Plus className="mr-2 h-4 w-4" /> Tambah Kegiatan & Lokasi Baru</Button>
        </div>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader><CardTitle className="text-lg">Volume Pekerjaan</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="volume" render={({ field }) => (
              <FormItem>
                <FormLabel>Volume / Jumlah</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500">
          <CardHeader><CardTitle className="text-lg">Foto Dokumentasi</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="photos.zero" render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 0%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="photos.fifty" render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 50%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="photos.hundred" render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 100%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader><CardTitle className="text-lg">Peralatan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {equipFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <FormField control={form.control} name={`equipment.${index}.type`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Alat</FormLabel>
                      <FormControl>
                        <Input {...field} list="equipment-suggestions" placeholder="Ketik atau pilih..." />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="w-24"><FormField control={form.control} name={`equipment.${index}.quantity`} render={({ field }) => (
                  <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} /></div>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeEquip(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => appendEquip({ type: "", quantity: 1 })}><Plus className="h-4 w-4 mr-2" /> Tambah Alat</Button>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader><CardTitle className="text-lg">Operasional Alat Berat</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {heavyFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <FormField control={form.control} name={`heavyEquipment.${index}.type`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Alat Berat</FormLabel>
                      <FormControl>
                        <Input {...field} list="heavy-equipment-suggestions" placeholder="Ketik atau pilih..." />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="w-24"><FormField control={form.control} name={`heavyEquipment.${index}.quantity`} render={({ field }) => (
                  <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} /></div>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeHeavy(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => appendHeavy({ type: "", quantity: 1 })}><Plus className="h-4 w-4 mr-2" /> Tambah Alat Berat</Button>
          </CardContent>
        </Card>

        {heavyEquipmentList.length > 0 && (
          <Card className="border-t-4 border-t-yellow-500">
            <CardHeader><CardTitle className="text-lg">Bahan Bakar</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="fuel.pertamax" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pertamax (Rp)</FormLabel>
                  <FormControl><Input type="number" placeholder="Min Rp. 10.000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fuel.dexlite" render={({ field }) => (<FormItem><FormLabel>Dexlite (Liter)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="fuel.solar" render={({ field }) => (<FormItem><FormLabel>Solar (Liter)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
              <div className="md:col-span-3"><FormField control={form.control} name="fuel.remarks" render={({ field }) => (<FormItem><FormLabel>Keterangan BBM</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} /></div>
            </CardContent>
          </Card>
        )}

        <Card className="border-t-4 border-t-cyan-500">
          <CardHeader><CardTitle className="text-lg">Jumlah Personil</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="personnel.coordinator" render={({ field }) => (<FormItem><FormLabel>Koordinator</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="personnel.members" render={({ field }) => (<FormItem><FormLabel>Anggota</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-gray-500">
          <CardHeader><CardTitle className="text-lg">Keterangan Tambahan</CardTitle></CardHeader>
          <CardContent><FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormControl><Textarea {...field} /></FormControl></FormItem>)} /></CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8">Simpan Laporan</Button>
        </div>
      </form>
    </Form>
  );
};

export default ReportForm;