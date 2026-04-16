"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, FileText, Fuel, Image as ImageIcon, Truck, Users, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Report, ReportCategory, Task, FuelUsage, Location, Equipment, HeavyEquipment, Personnel } from '@/types/report';
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
};

const siramCoordinatorMapping: Record<string, string> = {
  "BK 8128 A": "M. Irwan Syahputra, SE",
  "BK 9031 J": "Aluddin Gultom"
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

const fuelSchema = z.object({
  pertamax: z.coerce.number().int().default(0),
  dexlite: z.coerce.number().int().default(0),
  solar: z.coerce.number().int().default(0),
});

const taskSchema = z.object({
  description: z.string().min(1, "Uraian wajib diisi"),
  location: locationSchema,
  photos: photosSchema,
  volume: z.coerce.number().int().min(0),
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
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  vehicle: z.string().optional(),
  tasks: z.array(taskSchema).min(1),
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
      date: initialData.date,
      category: initialData.category,
      vehicle: initialData.vehicle || "",
      tasks: initialData.tasks,
      remarks: initialData.remarks,
    } : {
      date: new Date().toISOString().split('T')[0],
      category: "",
      vehicle: "",
      tasks: [{ 
        description: "", 
        location: { street: "", village: "", subDistrict: "" },
        photos: { zero: "", fifty: "", hundred: "" },
        volume: 0,
        equipment: [{ type: "", quantity: 1 }],
        heavyEquipment: [],
        personnel: { coordinator: "", members: 0 }
      }],
      remarks: "",
    },
  });

  const selectedCategory = form.watch("category");
  const selectedVehicle = form.watch("vehicle");
  
  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({ control: form.control, name: "tasks" });

  useEffect(() => {
    if (!isEditing && selectedCategory) {
      const tasks = form.getValues("tasks");
      const updatedTasks = tasks.map(task => {
        let coordinator = task.personnel.coordinator;
        if (selectedCategory === "Tim Siram") {
          coordinator = selectedVehicle ? siramCoordinatorMapping[selectedVehicle] || "" : "";
        } else {
          coordinator = coordinatorMapping[selectedCategory] || "";
        }
        return { ...task, personnel: { ...task.personnel, coordinator } };
      });
      form.setValue("tasks", updatedTasks);
    }
  }, [selectedCategory, selectedVehicle, form, isEditing]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      let totalVolume = 0;
      let totalFuel: FuelUsage = { pertamax: 0, dexlite: 0, solar: 0 };
      let allEquipment: Equipment[] = [];
      let allHeavyEquipment: HeavyEquipment[] = [];
      let totalMembers = 0;

      const processedTasks = values.tasks.map(task => {
        totalVolume += task.volume;
        task.heavyEquipment.forEach(he => {
          totalFuel.pertamax += he.fuel.pertamax;
          totalFuel.dexlite += he.fuel.dexlite;
          totalFuel.solar += he.fuel.solar;
          allHeavyEquipment.push(he as HeavyEquipment);
        });
        task.equipment.forEach(e => allEquipment.push(e as Equipment));
        totalMembers += task.personnel.members;

        if (values.category === "Tim Siram" && values.vehicle) {
          const platePrefix = `[${values.vehicle}] `;
          const cleanDescription = task.description.startsWith(platePrefix) 
            ? task.description.slice(platePrefix.length) 
            : task.description;
          
          return { ...task, description: `${platePrefix}${cleanDescription}` };
        }
        return task;
      });

      const reportData: Omit<Report, 'id' | 'createdAt' | 'syncStatus'> = {
        date: values.date,
        category: values.category as ReportCategory,
        vehicle: values.vehicle,
        description: processedTasks[0].description,
        location: processedTasks[0].location as Location,
        tasks: processedTasks as Task[],
        volume: totalVolume,
        unit: getUnitByCategory(values.category),
        equipment: allEquipment,
        heavyEquipment: allHeavyEquipment,
        fuel: totalFuel,
        personnel: {
          coordinator: processedTasks[0].personnel.coordinator,
          members: totalMembers
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

        {selectedCategory === "Tim Siram" && (
          <Card className="border-l-4 border-l-orange-500 bg-orange-50/30">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Truck size={16} /> Kendaraan Operasional</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="vehicle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilih Plat Kendaraan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Plat..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="BK 8128 A">BK 8128 A</SelectItem>
                      <SelectItem value="BK 9031 J">BK 9031 J</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Daftar Kegiatan & Sumber Daya</h2>
          
          {taskFields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-blue-400 overflow-hidden shadow-md">
              <CardContent className="p-6 space-y-8">
                <div className="flex justify-between items-center border-b pb-4">
                  <Badge variant="secondary" className="bg-blue-600 text-white px-3 py-1">Kegiatan #{index + 1}</Badge>
                  {taskFields.length > 1 && <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => removeTask(index)}><Trash2 className="h-4 w-4 mr-1" /> Hapus Kegiatan</Button>}
                </div>
                
                <div className="space-y-4">
                  <FormField control={form.control} name={`tasks.${index}.description`} render={({ field }) => (<FormItem><FormLabel className="font-bold">Uraian Kegiatan</FormLabel><FormControl><Input {...field} placeholder="Contoh: Pemangkasan pohon mahoni..." /></FormControl></FormItem>)} />
                  
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
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700"><ImageIcon size={16} className="text-blue-500" /> Dokumentasi & Volume</div>
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

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-600"><Fuel size={16} /> Operasional Alat Berat & BBM</div>
                  <div className="space-y-4">
                    {form.watch(`tasks.${index}.heavyEquipment`)?.map((_, heIdx) => (
                      <div key={heIdx} className="p-4 border rounded-lg bg-slate-50 space-y-4">
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <FormField control={form.control} name={`tasks.${index}.heavyEquipment.${heIdx}.type`} render={({ field }) => (<FormItem><FormLabel>Jenis Alat Berat</FormLabel><FormControl><Input {...field} placeholder="Contoh: Excavator..." /></FormControl></FormItem>)} />
                          </div>
                          <div className="w-24">
                            <FormField control={form.control} name={`tasks.${index}.heavyEquipment.${heIdx}.quantity`} render={({ field }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                          </div>
                          <Button type="button" variant="destructive" size="icon" onClick={() => {
                            const current = form.getValues(`tasks.${index}.heavyEquipment`);
                            form.setValue(`tasks.${index}.heavyEquipment`, current.filter((_, i) => i !== heIdx));
                          }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded border border-red-100">
                          <FormField control={form.control} name={`tasks.${index}.heavyEquipment.${heIdx}.fuel.pertamax`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1">Pertamax (L)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                          <FormField control={form.control} name={`tasks.${index}.heavyEquipment.${heIdx}.fuel.dexlite`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1">Dexlite (L)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                          <FormField control={form.control} name={`tasks.${index}.heavyEquipment.${heIdx}.fuel.solar`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] flex items-center gap-1">Solar (L)</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => {
                      const current = form.getValues(`tasks.${index}.heavyEquipment`) || [];
                      form.setValue(`tasks.${index}.heavyEquipment`, [...current, { type: "", quantity: 1, fuel: { pertamax: 0, dexlite: 0, solar: 0 } }]);
                    }}><Plus className="h-3 w-3 mr-2" /> Tambah Alat Berat</Button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-600"><Wrench size={16} /> Peralatan Lainnya</div>
                  <div className="space-y-3">
                    {form.watch(`tasks.${index}.equipment`)?.map((_, eqIdx) => (
                      <div key={eqIdx} className="flex gap-4 items-end">
                        <div className="flex-1"><FormField control={form.control} name={`tasks.${index}.equipment.${eqIdx}.type`} render={({ field }) => (<FormItem><FormLabel>Jenis Alat</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} /></div>
                        <div className="w-24"><FormField control={form.control} name={`tasks.${index}.equipment.${eqIdx}.quantity`} render={({ field }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} /></div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => {
                          const current = form.getValues(`tasks.${index}.equipment`);
                          form.setValue(`tasks.${index}.equipment`, current.filter((_, i) => i !== eqIdx));
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => {
                      const current = form.getValues(`tasks.${index}.equipment`) || [];
                      form.setValue(`tasks.${index}.equipment`, [...current, { type: "", quantity: 1 }]);
                    }}><Plus className="h-3 w-3 mr-2" /> Tambah Alat</Button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-cyan-600"><Users size={16} /> Personil Kegiatan</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`tasks.${index}.personnel.coordinator`} render={({ field }) => (<FormItem><FormLabel>Koordinator</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name={`tasks.${index}.personnel.members`} render={({ field }) => (<FormItem><FormLabel>Jumlah Anggota</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed py-8 bg-white text-blue-600 font-bold border-blue-200 hover:bg-blue-50" onClick={() => appendTask({ 
            description: "", 
            location: { street: "", village: "", subDistrict: "" }, 
            photos: { zero: "", fifty: "", hundred: "" }, 
            volume: 0,
            equipment: [{ type: "", quantity: 1 }],
            heavyEquipment: [],
            personnel: { coordinator: form.getValues("tasks.0.personnel.coordinator") || "", members: 0 }
          })}><Plus className="mr-2 h-5 w-5" /> Tambah Kegiatan & Lokasi Baru</Button>
        </div>

        <Card className="border-t-4 border-t-slate-400">
          <CardHeader><CardTitle className="text-lg">Keterangan Tambahan</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Catatan Laporan (Opsional)</FormLabel><FormControl><Input {...field} placeholder="Catatan umum untuk seluruh kegiatan hari ini..." /></FormControl></FormItem>)} />
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