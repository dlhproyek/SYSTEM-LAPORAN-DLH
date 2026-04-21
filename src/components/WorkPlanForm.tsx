"use client";

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, Loader2, MapPin, Wrench, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { medanDistricts } from '@/data/medan-districts';
import { workPlanService } from '@/services/workPlanService';
import { WorkPlan } from '@/types/work-plan';

const categories = ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"];

const coordinatorMapping: Record<string, string> = {
  "Taman Kota": "Mhd. Said",
  "Taman Area": "Ismail Siregar",
  "Taman Amplas": "Erwinsyah",
  "Tim Babat": "Benget Simanjuntak",
  "Tim Siram": "M. Irwan Syahputra, SE",
  "Tim Pohon": "Ardiansyah Siregar"
};

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  description: z.string().min(1, "Uraian wajib diisi"),
  street: z.string().min(1, "Nama jalan wajib diisi"),
  sub_district: z.string().min(1, "Kecamatan wajib diisi"),
  villages: z.array(z.string().min(1, "Kelurahan wajib diisi")).min(1),
  equipment: z.array(z.object({
    name: z.string().min(1, "Nama alat wajib diisi"),
    quantity: z.coerce.number().min(1, "Minimal 1 unit")
  })).min(1),
  coordinator: z.string().min(1, "Koordinator wajib diisi"),
  personnel: z.coerce.number().min(0),
  basis: z.string().min(1, "Dasar pengerjaan wajib diisi"),
  remarks: z.string().optional().default(""),
});

interface WorkPlanFormProps {
  initialData?: WorkPlan;
  isEditing?: boolean;
}

const WorkPlanForm = ({ initialData, isEditing = false }: WorkPlanFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      villages: Array.isArray(initialData.villages) ? initialData.villages : [initialData.villages as any]
    } : {
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      street: "",
      sub_district: "",
      villages: [""],
      equipment: [{ name: "", quantity: 1 }],
      coordinator: "",
      personnel: 0,
      basis: "Laporan Masyarakat / Rutin",
      remarks: "",
    },
  });

  const { fields: villageFields, append: appendVillage, remove: removeVillage } = useFieldArray({
    control: form.control,
    name: "villages" as any
  });

  const { fields: equipmentFields, append: appendEquipment, remove: removeEquipment } = useFieldArray({
    control: form.control,
    name: "equipment"
  });

  const selectedCategory = form.watch("category");
  const selectedDistrict = form.watch("sub_district");

  useEffect(() => {
    if (selectedCategory && !isEditing) {
      form.setValue("coordinator", coordinatorMapping[selectedCategory] || "");
    }
  }, [selectedCategory, form, isEditing]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (isEditing && initialData) {
        await workPlanService.updateWorkPlan(initialData.id, values as Partial<WorkPlan>);
        showSuccess("Rencana kerja diperbarui");
      } else {
        await workPlanService.createWorkPlan(values as Omit<WorkPlan, 'id' | 'created_at'>);
        showSuccess("Rencana kerja berhasil dibuat");
      }
      navigate('/work-plans');
    } catch (error) {
      showError("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <h1 className="text-xl font-bold">{isEditing ? "Edit Rencana Kerja" : "Buat Rencana Kerja"}</h1>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600">
            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Informasi Utama</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem><FormLabel>Tanggal Rencana</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Kategori</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                  <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="md:col-span-2">
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Uraian Kegiatan</FormLabel><FormControl><Input placeholder="Contoh: Pemangkasan pohon rawan tumbang" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-red-500" /> Lokasi Pengerjaan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="street" render={({ field }) => (
              <FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input placeholder="Jl. Contoh No. 123" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="sub_district" render={({ field }) => (
                <FormItem><FormLabel>Kecamatan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih kecamatan" /></SelectTrigger></FormControl>
                    <SelectContent>{Object.keys(medanDistricts).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-3">
                <FormLabel>Kelurahan</FormLabel>
                {villageFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <FormField control={form.control} name={`villages.${index}` as any} render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih kelurahan" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {selectedDistrict && medanDistricts[selectedDistrict]?.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    {villageFields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeVillage(index)} className="text-red-500"><Trash2 size={18} /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendVillage("")} className="w-full border-dashed"><Plus size={14} className="mr-2" /> Tambah Kelurahan</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Wrench className="h-5 w-5 text-orange-500" /> Alat Operasional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {equipmentFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-7">
                  <FormField control={form.control} name={`equipment.${index}.name`} render={({ field }) => (
                    <FormItem><FormLabel>Nama Alat</FormLabel><FormControl><Input placeholder="Contoh: Chainsaw" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="md:col-span-3">
                  <FormField control={form.control} name={`equipment.${index}.quantity`} render={({ field }) => (
                    <FormItem><FormLabel>Unit</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="md:col-span-2">
                  {equipmentFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEquipment(index)} className="text-red-500"><Trash2 size={18} /></Button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendEquipment({ name: "", quantity: 1 })} className="w-full border-dashed"><Plus size={14} className="mr-2" /> Tambah Alat</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-green-600" /> Sumber Daya Manusia</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="coordinator" render={({ field }) => (
              <FormItem><FormLabel>Koordinator Lapangan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="personnel" render={({ field }) => (
              <FormItem><FormLabel>Jumlah Personil</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Lain-lain</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="basis" render={({ field }) => (
              <FormItem><FormLabel>Dasar Pengerjaan</FormLabel><FormControl><Input placeholder="Contoh: Laporan Masyarakat" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="remarks" render={({ field }) => (
              <FormItem><FormLabel>Keterangan</FormLabel><FormControl><Input placeholder="Catatan tambahan..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};

export default WorkPlanForm;