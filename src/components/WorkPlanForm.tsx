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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, ArrowLeft, Loader2, MapPin, Wrench, Users, FileText, Eye, RefreshCw, Edit, Printer, MapPinned } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { medanDistricts } from '@/data/medan-districts';
import { workPlanService } from '@/services/workPlanService';
import { WorkPlan } from '@/types/work-plan';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const categories = ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"];

const coordinatorMapping: Record<string, string> = {
  "Taman Kota": "Mhd. Said",
  "Taman Area": "Ismail Siregar",
  "Taman Amplas": "Erwinsyah",
  "Tim Babat": "Benget Simanjuntak",
  "Tim Siram": "M. Irwan Syahputra, SE",
  "Tim Pohon": "Ardiansyah Siregar"
};

const locationSchema = z.object({
  street: z.string().min(1, "Nama jalan wajib diisi"),
  sub_district: z.string().min(1, "Kecamatan wajib diisi"),
  villages: z.array(z.string().min(1, "Kelurahan wajib diisi")).min(1),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  description: z.string().min(1, "Uraian wajib diisi"),
  locations: z.array(locationSchema).min(1, "Minimal satu lokasi"),
  equipment: z.array(z.object({
    name: z.string().min(1, "Nama alat wajib diisi"),
    quantity: z.coerce.number().min(1, "Minimal 1 unit")
  })).default([]),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyPlans, setDailyPlans] = useState<WorkPlan[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      date: initialData.date,
      category: initialData.category,
      description: initialData.description,
      locations: initialData.locations || [{ 
        street: initialData.street || "", 
        sub_district: initialData.sub_district || "", 
        villages: Array.isArray(initialData.villages) ? initialData.villages : [""] 
      }],
      equipment: initialData.equipment || [],
      coordinator: initialData.coordinator,
      personnel: initialData.personnel,
      basis: initialData.basis,
      remarks: initialData.remarks || "",
    } : {
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      locations: [{ street: "", sub_district: "", villages: [""] }],
      equipment: [],
      coordinator: "",
      personnel: 0,
      basis: "Laporan Masyarakat / Rutin",
      remarks: "",
    },
  });

  const { fields: locationFields, append: appendLocation, remove: removeLocation } = useFieldArray({
    control: form.control,
    name: "locations"
  });

  const { fields: equipmentFields, append: appendEquipment, remove: removeEquipment } = useFieldArray({
    control: form.control,
    name: "equipment"
  });

  const selectedDate = form.watch("date");
  const selectedCategory = form.watch("category");

  const loadDailyPlans = async (date: string) => {
    if (!date) return;
    try {
      setLoadingDaily(true);
      const allPlans = await workPlanService.getAllWorkPlans();
      const filtered = allPlans.filter(p => p.date === date);
      setDailyPlans(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    loadDailyPlans(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedCategory && !isEditing) {
      form.setValue("coordinator", coordinatorMapping[selectedCategory] || "");
    }
  }, [selectedCategory, form, isEditing]);

  async function onSubmit(values: z.infer<typeof formSchema>, shouldAddAnother = false) {
    setIsSubmitting(true);
    try {
      const firstLoc = values.locations[0];
      
      // Payload yang bersih (hanya kolom yang pasti ada di DB)
      const payload = {
        date: values.date,
        category: values.category,
        description: values.description,
        street: firstLoc.street,
        sub_district: firstLoc.sub_district,
        villages: firstLoc.villages,
        locations: values.locations, // Pastikan kolom ini sudah ditambah di Supabase
        equipment: values.equipment,
        coordinator: values.coordinator,
        personnel: values.personnel,
        basis: values.basis,
        remarks: values.remarks,
      };

      if (isEditing && initialData) {
        await workPlanService.updateWorkPlan(initialData.id, payload as any);
        showSuccess("Rencana kerja diperbarui");
        navigate('/work-plans');
      } else {
        await workPlanService.createWorkPlan(payload as any);
        showSuccess("Rencana kerja berhasil disimpan");
        
        if (shouldAddAnother) {
          const currentDate = values.date;
          form.reset({
            date: currentDate,
            category: "",
            description: "",
            locations: [{ street: "", sub_district: "", villages: [""] }],
            equipment: [],
            coordinator: "",
            personnel: 0,
            basis: "Laporan Masyarakat / Rutin",
            remarks: "",
          });
          loadDailyPlans(currentDate);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          navigate('/work-plans');
        }
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      showError(error.message || "Gagal menyimpan data. Pastikan kolom 'locations' sudah ditambahkan di database.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-10 pb-20">
      <Form {...form}>
        <form className="space-y-6">
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate('/work-plans')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <h1 className="text-xl font-bold">{isEditing ? "Edit Rencana Kerja" : "Buat Rencana Kerja"}</h1>
            <div className="flex gap-2">
              {!isEditing && (
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={isSubmitting} 
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 font-bold"
                  onClick={form.handleSubmit((data) => onSubmit(data, true))}
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                  Simpan & Tambah Kategori Lain
                </Button>
              )}
              <Button 
                type="button"
                disabled={isSubmitting} 
                className="bg-blue-600 font-bold"
                onClick={form.handleSubmit((data) => onSubmit(data, false))}
              >
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Perbarui" : "Simpan & Selesai"}
              </Button>
            </div>
          </div>

          <Card className="border-t-4 border-t-blue-500 shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Informasi Utama</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Tanggal Rencana</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><MapPinned className="text-red-500" /> Lokasi Pengerjaan</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => appendLocation({ street: "", sub_district: "", villages: [""] })} className="border-dashed border-red-200 text-red-600 hover:bg-red-50">
                <Plus className="h-4 w-4 mr-2" /> Tambah Lokasi Lain
              </Button>
            </div>

            {locationFields.map((locField, locIndex) => (
              <Card key={locField.id} className="shadow-sm border-l-4 border-l-red-400">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-slate-50/50">
                  <Badge variant="secondary" className="bg-red-100 text-red-700">Lokasi #{locIndex + 1}</Badge>
                  {locationFields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLocation(locIndex)} className="text-red-500 h-8 hover:bg-red-50">
                      <Trash2 size={14} className="mr-1" /> Hapus Lokasi
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <FormField control={form.control} name={`locations.${locIndex}.street`} render={({ field }) => (
                    <FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input placeholder="Jl. Contoh No. 123" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`locations.${locIndex}.sub_district`} render={({ field }) => (
                      <FormItem><FormLabel>Kecamatan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih kecamatan" /></SelectTrigger></FormControl>
                          <SelectContent>{Object.keys(medanDistricts).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="space-y-3">
                      <FormLabel>Kelurahan</FormLabel>
                      {form.watch(`locations.${locIndex}.villages`)?.map((_, vIdx) => (
                        <div key={vIdx} className="flex gap-2">
                          <FormField control={form.control} name={`locations.${locIndex}.villages.${vIdx}`} render={({ field }) => (
                            <FormItem className="flex-1">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Pilih kelurahan" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {form.watch(`locations.${locIndex}.sub_district`) && medanDistricts[form.watch(`locations.${locIndex}.sub_district`)]?.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                          {form.watch(`locations.${locIndex}.villages`).length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => {
                              const current = form.getValues(`locations.${locIndex}.villages`);
                              form.setValue(`locations.${locIndex}.villages`, current.filter((_, i) => i !== vIdx));
                            }} className="text-red-500"><Trash2 size={16} /></Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const current = form.getValues(`locations.${locIndex}.villages`);
                        form.setValue(`locations.${locIndex}.villages`, [...current, ""]);
                      }} className="w-full border-dashed text-[10px] h-7"><Plus size={12} className="mr-1" /> Tambah Kelurahan</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Wrench className="h-5 w-5 text-orange-500" /> Alat Operasional</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {equipmentFields.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-sm italic border rounded-lg border-dashed">
                  Tidak ada alat operasional yang ditambahkan
                </div>
              )}
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEquipment(index)} className="text-red-500"><Trash2 size={18} /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendEquipment({ name: "", quantity: 1 })} className="w-full border-dashed"><Plus size={14} className="mr-2" /> Tambah Alat</Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
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

          <Card className="shadow-sm">
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

      {/* Tabel Rekap Harian */}
      <Card className="border-t-4 border-t-green-500 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className={cn("h-5 w-5 text-green-600", loadingDaily && "animate-spin")} /> 
              Rekap Rencana Kerja: {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-blue-50 text-blue-700 border-blue-200"
              onClick={() => navigate(`/work-plans/print-rekap?date=${selectedDate}`)}
              disabled={dailyPlans.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" /> Cetak Rekap Tabel
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadDailyPlans(selectedDate)}>Segarkan</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[50px] text-center">No</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Uraian Kegiatan</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-center">Personil</TableHead>
                  <TableHead>Koordinator</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDaily ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10">Memuat data rekap...</TableCell></TableRow>
                ) : dailyPlans.length > 0 ? (
                  dailyPlans.map((plan, idx) => (
                    <TableRow key={plan.id}>
                      <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{plan.category}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{plan.description}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {plan.locations?.length > 0 ? (
                          <div className="space-y-1">
                            {plan.locations.map((loc, i) => (
                              <div key={i} className="text-[10px] leading-tight">• {loc.street}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="truncate">{plan.street}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{plan.personnel} Orang</TableCell>
                      <TableCell>{plan.coordinator}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => navigate(`/work-plans/${plan.id}`)}><Eye size={14} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => navigate(`/work-plans/edit/${plan.id}`)}><Edit size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400 italic">Belum ada rencana kerja untuk tanggal ini</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkPlanForm;