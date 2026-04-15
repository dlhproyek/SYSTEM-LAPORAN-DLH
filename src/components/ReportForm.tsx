"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, FileText, Fuel, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Report, ReportCategory, Task, FuelUsage } from '@/types/report';
import { medanDistricts } from '@/data/medan-districts';
import ImageUpload from './ImageUpload';
import { Badge } from "@/components/ui/badge";
import { getUnitByCategory } from '@/utils/report-helpers';
import { reportService } from '@/services/reportService';

const categories: ReportCategory[] = [
  "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
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

const photosSchema = z.object({
  zero: z.string().optional().default(""),
  fifty: z.string().optional().default(""),
  hundred: z.string().optional().default(""),
});

const taskSchema = z.object({
  description: z.string().min(1, "Uraian wajib diisi"),
  location: locationSchema,
  photos: photosSchema,
  volume: z.coerce.number().int().min(0),
});

const fuelSchema = z.object({
  pertamax: z.coerce.number().int().default(0),
  dexlite: z.coerce.number().int().default(0),
  solar: z.coerce.number().int().default(0),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  tasks: z.array(taskSchema).min(1),
  equipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat wajib diisi"),
    quantity: z.coerce.number().int().min(1),
  })),
  heavyEquipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat berat wajib diisi"),
    quantity: z.coerce.number().int().min(1),
    fuel: fuelSchema,
  })),
  personnel: z.object({
    coordinator: z.string().min(1, "Nama koordinator wajib diisi"),
    members: z.coerce.number().int().min(0),
  }),
  remarks: z.string().optional().default(""),
});

interface ReportFormProps {
  initialData?: Report;
  isEditing?: boolean;
}

const ReportForm = ({ initialData, isEditing = false }: ReportFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      tasks: initialData.tasks || [],
    } : {
      date: new Date().toISOString().split('T')[0],
      category: "",
      tasks: [{ 
        description: "", 
        location: { street: "", village: "", subDistrict: "" },
        photos: { zero: "", fifty: "", hundred: "" },
        volume: 0
      }],
      equipment: [{ type: "", quantity: 1 }],
      heavyEquipment: [],
      personnel: { coordinator: "", members: 0 },
      remarks: "",
    },
  });

  const selectedCategory = form.watch("category");
  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({ control: form.control, name: "tasks" });
  const { fields: equipFields, append: appendEquip, remove: removeEquip } = useFieldArray({ control: form.control, name: "equipment" });
  const { fields: heavyFields, append: appendHeavy, remove: removeHeavy } = useFieldArray({ control: form.control, name: "heavyEquipment" });

  useEffect(() => {
    if (!isEditing && selectedCategory) {
      const coordinatorName = coordinatorMapping[selectedCategory];
      if (coordinatorName) form.setValue("personnel.coordinator", coordinatorName);
    }
  }, [selectedCategory, form, isEditing]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const totalFuel: FuelUsage = values.heavyEquipment.reduce((acc, curr) => ({
        pertamax: acc.pertamax + curr.fuel.pertamax,
        dexlite: acc.dexlite + curr.fuel.dexlite,
        solar: acc.solar + curr.fuel.solar,
        remarks: ""
      }), { pertamax: 0, dexlite: 0, solar: 0, remarks: "" });

      const totalVolume = values.tasks.reduce((acc, curr) => acc + curr.volume, 0);

      const reportData: Omit<Report, 'id' | 'createdAt' | 'syncStatus'> = {
        date: values.date,
        category: values.category as ReportCategory,
        description: values.tasks[0].description,
        location: values.tasks[0].location,
        tasks: values.tasks as Task[],
        volume: totalVolume,
        unit: getUnitByCategory(values.category),
        equipment: values.equipment.map(e => ({ type: e.type, quantity: Math.round(e.quantity) })),
        heavyEquipment: values.heavyEquipment.map(he => ({ 
          type: he.type,
          quantity: Math.round(he.quantity),
          fuel: {
            pertamax: Math.round(he.fuel.pertamax),
            dexlite: Math.round(he.fuel.dexlite),
            solar: Math.round(he.fuel.solar)
          }
        })),
        fuel: totalFuel,
        personnel: {
          coordinator: values.personnel.coordinator,
          members: Math.round(values.personnel.members)
        },
        remarks: values.remarks || "",
      };

      if (isEditing && initialData) {
        await reportService.updateReport(initialData.id, reportData);
        showSuccess("Laporan diperbarui!");
      } else {
        await reportService.createReport(reportData);
        showSuccess("Laporan disimpan!");
      }
      navigate('/');
    } catch (error) {
      showError("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <h1 className="text-2xl font-bold text-primary">{isEditing ? "Edit Laporan" : "Input Laporan Baru"}</h1>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Simpan</Button>
        </div>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader><CardTitle className="text-lg">Informasi Dasar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Hari / Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Kategori / Tim</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
                  <SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Daftar Kegiatan, Lokasi & Dokumentasi</h2>
          {taskFields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-blue-400 overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">Kegiatan #{index + 1}</Badge>
                  {taskFields.length > 1 && <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeTask(index)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
                
                <div className="space-y-4">
                  <FormField control={form.control} name={`tasks.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Uraian Kegiatan</FormLabel><FormControl><Input {...field} placeholder="Contoh: Pemangkasan pohon mahoni..." /></FormControl></FormItem>)} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`tasks.${index}.location.street`} render={({ field }) => (<FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
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

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700"><ImageIcon size={16} className="text-blue-500" /> Foto Dokumentasi & Volume</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <FormField control={form.control} name={`tasks.${index}.photos.zero`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 0%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name={`tasks.${index}.photos.fifty`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 50%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name={`tasks.${index}.photos.hundred`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 100%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
                    </div>
                    <FormField control={form.control} name={`tasks.${index}.volume`} render={({ field }) => (
                      <FormItem className="max-w-[200px]">
                        <FormLabel>Volume ({getUnitByCategory(selectedCategory)})</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed py-6 bg-white" onClick={() => appendTask({ description: "", location: { street: "", village: "", subDistrict: "" }, photos: { zero: "", fifty: "", hundred: "" }, volume: 0 })}><Plus className="mr-2 h-4 w-4" /> Tambah Kegiatan & Lokasi Baru</Button>
        </div>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader><CardTitle className="text-lg">Operasional Alat Berat & BBM</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {heavyFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg bg-slate-50 space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <FormField control={form.control} name={`heavyEquipment.${index}.type`} render={({ field }) => (<FormItem><FormLabel>Jenis Alat Berat</FormLabel><FormControl><Input {...field} placeholder="Contoh: Excavator, Crane..." /></FormControl></FormItem>)} />
                  </div>
                  <div className="w-24">
                    <FormField control={form.control} name={`heavyEquipment.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                  </div>
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeHeavy(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded border border-red-100">
                  <FormField control={form.control} name={`heavyEquipment.${index}.fuel.pertamax`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1"><Fuel size={10} /> Pertamax (Rp)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name={`heavyEquipment.${index}.fuel.dexlite`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1"><Fuel size={10} /> Dexlite (L)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name={`heavyEquipment.${index}.fuel.solar`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1"><Fuel size={10} /> Solar (L)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full border-dashed bg-white" onClick={() => appendHeavy({ type: "", quantity: 1, fuel: { pertamax: 0, dexlite: 0, solar: 0 } })}><Plus className="h-4 w-4 mr-2" /> Tambah Alat Berat</Button>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader><CardTitle className="text-lg">Peralatan Lainnya</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {equipFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-<dyad-write path="src/components/ReportForm.tsx"<dyad-write path="src/components/ReportForm.tsx" description="Melanjutkan penulisan file ReportForm.tsx yang terputus">
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, FileText, Fuel, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Report, ReportCategory, Task, FuelUsage } from '@/types/report';
import { medanDistricts } from '@/data/medan-districts';
import ImageUpload from './ImageUpload';
import { Badge } from "@/components/ui/badge";
import { getUnitByCategory } from '@/utils/report-helpers';
import { reportService } from '@/services/reportService';

const categories: ReportCategory[] = [
  "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
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

const photosSchema = z.object({
  zero: z.string().optional().default(""),
  fifty: z.string().optional().default(""),
  hundred: z.string().optional().default(""),
});

const taskSchema = z.object({
  description: z.string().min(1, "Uraian wajib diisi"),
  location: locationSchema,
  photos: photosSchema,
  volume: z.coerce.number().int().min(0),
});

const fuelSchema = z.object({
  pertamax: z.coerce.number().int().default(0),
  dexlite: z.coerce.number().int().default(0),
  solar: z.coerce.number().int().default(0),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  tasks: z.array(taskSchema).min(1),
  equipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat wajib diisi"),
    quantity: z.coerce.number().int().min(1),
  })),
  heavyEquipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat berat wajib diisi"),
    quantity: z.coerce.number().int().min(1),
    fuel: fuelSchema,
  })),
  personnel: z.object({
    coordinator: z.string().min(1, "Nama koordinator wajib diisi"),
    members: z.coerce.number().int().min(0),
  }),
  remarks: z.string().optional().default(""),
});

interface ReportFormProps {
  initialData?: Report;
  isEditing?: boolean;
}

const ReportForm = ({ initialData, isEditing = false }: ReportFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      tasks: initialData.tasks || [],
    } : {
      date: new Date().toISOString().split('T')[0],
      category: "",
      tasks: [{ 
        description: "", 
        location: { street: "", village: "", subDistrict: "" },
        photos: { zero: "", fifty: "", hundred: "" },
        volume: 0
      }],
      equipment: [{ type: "", quantity: 1 }],
      heavyEquipment: [],
      personnel: { coordinator: "", members: 0 },
      remarks: "",
    },
  });

  const selectedCategory = form.watch("category");
  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({ control: form.control, name: "tasks" });
  const { fields: equipFields, append: appendEquip, remove: removeEquip } = useFieldArray({ control: form.control, name: "equipment" });
  const { fields: heavyFields, append: appendHeavy, remove: removeHeavy } = useFieldArray({ control: form.control, name: "heavyEquipment" });

  useEffect(() => {
    if (!isEditing && selectedCategory) {
      const coordinatorName = coordinatorMapping[selectedCategory];
      if (coordinatorName) form.setValue("personnel.coordinator", coordinatorName);
    }
  }, [selectedCategory, form, isEditing]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const totalFuel: FuelUsage = values.heavyEquipment.reduce((acc, curr) => ({
        pertamax: acc.pertamax + curr.fuel.pertamax,
        dexlite: acc.dexlite + curr.fuel.dexlite,
        solar: acc.solar + curr.fuel.solar,
        remarks: ""
      }), { pertamax: 0, dexlite: 0, solar: 0, remarks: "" });

      const totalVolume = values.tasks.reduce((acc, curr) => acc + curr.volume, 0);

      const reportData: Omit<Report, 'id' | 'createdAt' | 'syncStatus'> = {
        date: values.date,
        category: values.category as ReportCategory,
        description: values.tasks[0].description,
        location: values.tasks[0].location,
        tasks: values.tasks as Task[],
        volume: totalVolume,
        unit: getUnitByCategory(values.category),
        equipment: values.equipment.map(e => ({ type: e.type, quantity: Math.round(e.quantity) })),
        heavyEquipment: values.heavyEquipment.map(he => ({ 
          type: he.type,
          quantity: Math.round(he.quantity),
          fuel: {
            pertamax: Math.round(he.fuel.pertamax),
            dexlite: Math.round(he.fuel.dexlite),
            solar: Math.round(he.fuel.solar)
          }
        })),
        fuel: totalFuel,
        personnel: {
          coordinator: values.personnel.coordinator,
          members: Math.round(values.personnel.members)
        },
        remarks: values.remarks || "",
      };

      if (isEditing && initialData) {
        await reportService.updateReport(initialData.id, reportData);
        showSuccess("Laporan diperbarui!");
      } else {
        await reportService.createReport(reportData);
        showSuccess("Laporan disimpan!");
      }
      navigate('/');
    } catch (error) {
      showError("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <h1 className="text-2xl font-bold text-primary">{isEditing ? "Edit Laporan" : "Input Laporan Baru"}</h1>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Simpan</Button>
        </div>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader><CardTitle className="text-lg">Informasi Dasar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Hari / Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Kategori / Tim</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
                  <SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Daftar Kegiatan, Lokasi & Dokumentasi</h2>
          {taskFields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-blue-400 overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">Kegiatan #{index + 1}</Badge>
                  {taskFields.length > 1 && <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeTask(index)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
                
                <div className="space-y-4">
                  <FormField control={form.control} name={`tasks.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Uraian Kegiatan</FormLabel><FormControl><Input {...field} placeholder="Contoh: Pemangkasan pohon mahoni..." /></FormControl></FormItem>)} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`tasks.${index}.location.street`} render={({ field }) => (<FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
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

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700"><ImageIcon size={16} className="text-blue-500" /> Foto Dokumentasi & Volume</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <FormField control={form.control} name={`tasks.${index}.photos.zero`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 0%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name={`tasks.${index}.photos.fifty`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 50%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name={`tasks.${index}.photos.hundred`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 100%" value={field.value} onChange={field.onChange} /></FormControl></FormItem>)} />
                    </div>
                    <FormField control={form.control} name={`tasks.${index}.volume`} render={({ field }) => (
                      <FormItem className="max-w-[200px]">
                        <FormLabel>Volume ({getUnitByCategory(selectedCategory)})</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed py-6 bg-white" onClick={() => appendTask({ description: "", location: { street: "", village: "", subDistrict: "" }, photos: { zero: "", fifty: "", hundred: "" }, volume: 0 })}><Plus className="mr-2 h-4 w-4" /> Tambah Kegiatan & Lokasi Baru</Button>
        </div>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader><CardTitle className="text-lg">Operasional Alat Berat & BBM</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {heavyFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg bg-slate-50 space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <FormField control={form.control} name={`heavyEquipment.${index}.type`} render={({ field }) => (<FormItem><FormLabel>Jenis Alat Berat</FormLabel><FormControl><Input {...field} placeholder="Contoh: Excavator, Crane..." /></FormControl></FormItem>)} />
                  </div>
                  <div className="w-24">
                    <FormField control={form.control} name={`heavyEquipment.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                  </div>
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeHeavy(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded border border-red-100">
                  <FormField control={form.control} name={`heavyEquipment.${index}.fuel.pertamax`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1"><Fuel size={10} /> Pertamax (Rp)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name={`heavyEquipment.${index}.fuel.dexlite`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1"><Fuel size={10} /> Dexlite (L)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name={`heavyEquipment.${index}.fuel.solar`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1"><Fuel size={10} /> Solar (L)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full border-dashed bg-white" onClick={() => appendHeavy({ type: "", quantity: 1, fuel: { pertamax: 0, dexlite: 0, solar: 0 } })}><Plus className="h-4 w-4 mr-2" /> Tambah Alat Berat</Button>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader><CardTitle className="text-lg">Peralatan Lainnya</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {equipFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1"><FormField control={form.control} name={`equipment.${index}.type`} render={({ field }) => (<FormItem><FormLabel>Jenis Alat</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} /></div>
                <div className="w-24"><FormField control={form.control} name={`equipment.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} /></div>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeEquip(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full border-dashed bg-white" onClick={() => appendEquip({ type: "", quantity: 1 })}><Plus className="h-4 w-4 mr-2" /> Tambah Alat</Button>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-cyan-500">
          <CardHeader><CardTitle className="text-lg">Personil & Keterangan</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="personnel.coordinator" render={({ field }) => (<FormItem><FormLabel>Koordinator</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="personnel.members" render={({ field }) => (<FormItem><FormLabel>Anggota</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
            <div className="md:col-span-2">
              <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Keterangan Tambahan</FormLabel><FormControl><Input {...field} placeholder="Catatan jika ada..." /></FormControl></FormItem>)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 px-8">{isSubmitting ? "Menyimpan..." : "Simpan Laporan"}</Button>
        </div>
      </form>
    </Form>
  );
};

export default ReportForm;