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
import { Plus, Trash2, Save, ArrowLeft, Loader2, MapPin, Wrench, Users, FileText, Eye, RefreshCw, Edit, MapPinned, ClipboardCheck, Truck, Printer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const basisMapping: Record<string, string> = {
  "Tim Babat": "Hasil Survey Lapangan",
};

const vehicleKeywords = ["mobil", "motor", "truck", "truk", "pick up", "pickup"];

const getAutoPurpose = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("chainsaw")) return "Alat Pemotong Pohon dan Ranting.";
  if (lowerName.includes("mobil tangga")) return "Alat Bantu Untuk Menjangkau Ranting Yang Tinggi";
  if (lowerName.includes("dump truck")) return "Pengangkut Sampah Pemangkasan Pohon";
  if (lowerName.includes("truk siram") || lowerName.includes("truck siram")) return "Penyiraman Tanaman Median Jalan";
  if (lowerName.includes("mesin babat")) return "Memotong Rumput";
  return "";
};

const equipmentSchema = z.object({
  name: z.string().min(1, "Nama alat wajib diisi"),
  quantity: z.coerce.number().min(1, "Minimal 1 unit"),
  purpose: z.string().optional().default(""),
  vehicle: z.string().optional().default(""),
});

const locationSchema = z.object({
  description: z.string().min(1, "Uraian kegiatan wajib diisi"),
  street: z.string().min(1, "Nama jalan wajib diisi"),
  sub_district: z.string().min(1, "Kecamatan wajib diisi"),
  villages: z.array(z.string().min(1, "Kelurahan wajib diisi")).min(1),
  equipment: z.array(equipmentSchema).default([]),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  locations: z.array(locationSchema).min(1, "Minimal satu lokasi"),
  coordinator: z.string().min(1, "Koordinator wajib diisi"),
  personnel: z.coerce.number().min(0),
  basis: z.array(z.object({ value: z.string().min(1, "Dasar wajib diisi") })).min(1, "Minimal satu dasar pengerjaan"),
  remarks: z.string().optional().default(""),
});

interface WorkPlanFormProps {
  initialData?: WorkPlan;
  isEditing?: boolean;
}

const WorkPlanForm = ({ initialData, isEditing = false }: WorkPlanFormProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlDate = searchParams.get('date');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyPlans, setDailyPlans] = useState<WorkPlan[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [existingVehicles] = useState<string[]>(["BK 8128 A", "BK 9031 J", "BK 8265 A", "BK 8266 A", "BK 8451 J"]);

  const processInitialBasis = (basisStr: string) => {
    if (!basisStr) return [{ value: "Laporan Masyarakat / Rutin" }];
    if (basisStr.includes('• ')) {
      return basisStr.split('\n').map(s => ({ value: s.replace('• ', '').trim() }));
    }
    return [{ value: basisStr }];
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      date: initialData.date,
      category: initialData.category,
      locations: initialData.locations?.map(loc => ({
        ...loc,
        villages: Array.isArray(loc.villages) ? loc.villages : [""],
        equipment: loc.equipment || []
      })) || [{ 
        description: initialData.description || "",
        street: initialData.street || "", 
        sub_district: initialData.sub_district || "", 
        villages: Array.isArray(initialData.villages) ? initialData.villages : [""],
        equipment: initialData.equipment || []
      }],
      coordinator: initialData.coordinator || "",
      personnel: initialData.personnel || 0,
      basis: processInitialBasis(initialData.basis),
      remarks: initialData.remarks || "",
    } : {
      date: urlDate || new Date().toISOString().split('T')[0],
      category: "",
      locations: [{ description: "", street: "", sub_district: "", villages: [""], equipment: [] }],
      coordinator: "",
      personnel: 0,
      basis: [{ value: "Laporan Masyarakat / Rutin" }],
      remarks: "",
    },
  });

  const { fields: locationFields, append: appendLocation, remove: removeLocation } = useFieldArray({ control: form.control, name: "locations" });
  const { fields: basisFields, append: appendBasis, remove: removeBasis } = useFieldArray({ control: form.control, name: "basis" });

  const selectedDate = form.watch("date");
  const selectedCategory = form.watch("category");

  const loadDailyPlans = async (date: string) => {
    if (!date) return;
    try {
      setLoadingDaily(true);
      const allPlans = await workPlanService.getAllWorkPlans();
      const filtered = allPlans.filter(p => p.date === date);
      setDailyPlans(filtered);
    } catch (error) { console.error(error); } finally { setLoadingDaily(false); }
  };

  useEffect(() => { loadDailyPlans(selectedDate); }, [selectedDate]);

  useEffect(() => {
    if (selectedCategory && !isEditing) {
      form.setValue("coordinator", coordinatorMapping[selectedCategory] || "");
      const defaultBasis = basisMapping[selectedCategory] || "Laporan Masyarakat / Rutin";
      form.setValue("basis", [{ value: defaultBasis }]);
    }
  }, [selectedCategory, form, isEditing]);

  async function onSubmit(values: z.infer<typeof formSchema>, shouldAddAnother = false) {
    setIsSubmitting(true);
    try {
      const firstLoc = values.locations[0];
      const basisString = values.basis.length > 1 
        ? values.basis.map(b => `• ${b.value}`).join('\n')
        : values.basis[0].value;

      const payload = {
        date: values.date,
        category: values.category,
        description: firstLoc.description,
        street: firstLoc.street,
        sub_district: firstLoc.sub_district,
        villages: firstLoc.villages,
        equipment: [], 
        locations: values.locations,
        coordinator: values.coordinator,
        personnel: values.personnel,
        basis: basisString,
        remarks: values.remarks,
      };

      if (isEditing && initialData) {
        await workPlanService.updateWorkPlan(initialData.id, payload as any);
        showSuccess("Rencana kerja diperbarui");
        if (shouldAddAnother) navigate(`/work-plans/create?date=${values.date}`);
        else navigate('/work-plans');
      } else {
        await workPlanService.createWorkPlan(payload as any);
        showSuccess("Rencana kerja berhasil disimpan");
        if (shouldAddAnother) {
          const currentDate = values.date;
          form.reset({
            date: currentDate,
            category: "",
            locations: [{ description: "", street: "", sub_district: "", villages: [""], equipment: [] }],
            coordinator: "",
            personnel: 0,
            basis: [{ value: "Laporan Masyarakat / Rutin" }],
            remarks: "",
          });
          loadDailyPlans(currentDate);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else { navigate('/work-plans'); }
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      showError(error.message || "Gagal menyimpan data.");
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="space-y-10 pb-20">
      <Form {...form}>
        <form className="space-y-6">
          <datalist id="vehicle-list">
            {existingVehicles.map(v => <option key={v} value={v} />)}
          </datalist>

          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate('/work-plans')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <h1 className="text-xl font-bold">{isEditing ? "Edit Rencana Kerja" : "Buat Rencana Kerja"}</h1>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting} className="border-blue-600 text-blue-600 hover:bg-blue-50 font-bold" onClick={form.handleSubmit((data) => onSubmit(data, true))}>
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="mr-2 h-4 w-4" />} Simpan & Tambah Tim Lain
              </Button>
              <Button type="button" disabled={isSubmitting} className="bg-blue-600 font-bold" onClick={form.handleSubmit((data) => onSubmit(data, false))}>
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />} {isEditing ? "Perbarui & Selesai" : "Simpan & Selesai"}
              </Button>
            </div>
          </div>

          <Card className="border-t-4 border-t-blue-500 shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Informasi Utama</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Tanggal Rencana</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                    <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><MapPinned className="text-red-500" /> Lokasi Pengerjaan & Alat</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => appendLocation({ description: "", street: "", sub_district: "", villages: [""], equipment: [] })} className="border-dashed border-red-200 text-red-600 hover:bg-red-50"><Plus className="h-4 w-4 mr-2" /> Tambah Lokasi Lain</Button>
            </div>
            {locationFields.map((locField, locIndex) => (
              <Card key={locField.id} className="shadow-sm border-l-4 border-l-red-400">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-slate-50/50">
                  <Badge variant="secondary" className="bg-red-100 text-red-700">Lokasi #{locIndex + 1}</Badge>
                  {locationFields.length > 1 && (<Button type="button" variant="ghost" size="sm" onClick={() => removeLocation(locIndex)} className="text-red-500 h-8 hover:bg-red-50"><Trash2 size={14} className="mr-1" /> Hapus Lokasi</Button>)}
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  <div className="space-y-4">
                    <FormField control={form.control} name={`locations.${locIndex}.description`} render={({ field }) => (<FormItem><FormLabel className="font-bold">Uraian Kegiatan</FormLabel><FormControl><Input placeholder="Contoh: Pemangkasan pohon rawan tumbang" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`locations.${locIndex}.street`} render={({ field }) => (<FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input placeholder="Jl. Contoh No. 123" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                                  <SelectContent>{form.watch(`locations.${locIndex}.sub_district`) && medanDistricts[form.watch(`locations.${locIndex}.sub_district`)]?.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            {form.watch(`locations.${locIndex}.villages`).length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => { const current = form.getValues(`locations.${locIndex}.villages`); form.setValue(`locations.${locIndex}.villages`, current.filter((_, i) => i !== vIdx)); }} className="text-red-500"><Trash2 size={16} /></Button>)}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => { const current = form.getValues(`locations.${locIndex}.villages`); form.setValue(`locations.${locIndex}.villages`, [...current, ""]); }} className="w-full border-dashed text-[10px] h-7"><Plus size={12} className="mr-1" /> Tambah Kelurahan</Button>
                      </div>
                    </div>
                  </div>

                  {/* Alat Operasional per Lokasi */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-orange-600"><Wrench size={14} /> Alat Operasional Lokasi #{locIndex + 1}</h3>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] border-orange-200 text-orange-600" onClick={() => {
                        const current = form.getValues(`locations.${locIndex}.equipment`) || [];
                        form.setValue(`locations.${locIndex}.equipment`, [...current, { name: "", quantity: 1, purpose: "", vehicle: "" }]);
                      }}><Plus size={12} className="mr-1" /> Tambah Alat</Button>
                    </div>
                    
                    <div className="space-y-3">
                      {form.watch(`locations.${locIndex}.equipment`)?.length === 0 && (
                        <div className="text-center py-3 text-[10px] text-slate-400 italic border rounded-lg border-dashed">Belum ada alat untuk lokasi ini</div>
                      )}
                      {form.watch(`locations.${locIndex}.equipment`)?.map((_, eqIdx) => {
                        const nameValue = form.watch(`locations.${locIndex}.equipment.${eqIdx}.name`) || "";
                        const isVehicle = vehicleKeywords.some(k => nameValue.toLowerCase().includes(k));
                        
                        return (
                          <div key={eqIdx} className="p-3 border rounded-lg bg-slate-50/50 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              <div className={cn("md:col-span-7", isVehicle ? "md:col-span-4" : "md:col-span-7")}>
                                <FormField control={form.control} name={`locations.${locIndex}.equipment.${eqIdx}.name`} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Nama Alat</FormLabel>
                                    <FormControl>
                                      <Input 
                                        className="h-8 text-xs"
                                        placeholder="Contoh: Chainsaw" 
                                        {...field} 
                                        onChange={(e) => {
                                          field.onChange(e);
                                          const autoPurpose = getAutoPurpose(e.target.value);
                                          if (autoPurpose) form.setValue(`locations.${locIndex}.equipment.${eqIdx}.purpose`, autoPurpose);
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )} />
                              </div>
                              
                              {isVehicle && (
                                <div className="md:col-span-3">
                                  <FormField control={form.control} name={`locations.${locIndex}.equipment.${eqIdx}.vehicle`} render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs flex items-center gap-1"><Truck size={10} /> Plat Nomor</FormLabel>
                                      <FormControl><Input className="h-8 text-xs" placeholder="BK 1234 XX" list="vehicle-list" {...field} /></FormControl>
                                    </FormItem>
                                  )} />
                                </div>
                              )}

                              <div className="md:col-span-3">
                                <FormField control={form.control} name={`locations.${locIndex}.equipment.${eqIdx}.quantity`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Unit</FormLabel><FormControl><Input type="number" className="h-8 text-xs" {...field} /></FormControl></FormItem>)} />
                              </div>
                              <div className="md:col-span-2 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => {
                                  const current = form.getValues(`locations.${locIndex}.equipment`);
                                  form.setValue(`locations.${locIndex}.equipment`, current.filter((_, i) => i !== eqIdx));
                                }} className="text-red-500 h-8 w-8"><Trash2 size={14} /></Button>
                              </div>
                            </div>
                            <FormField control={form.control} name={`locations.${locIndex}.equipment.${eqIdx}.purpose`} render={({ field }) => (<FormItem><FormLabel className="text-[10px]">Kegunaan Alat</FormLabel><FormControl><Input className="h-8 text-xs" placeholder="Contoh: Alat Pemotong Pohon" {...field} /></FormControl></FormItem>)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-green-600" /> Sumber Daya Manusia</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="coordinator" render={({ field }) => (<FormItem><FormLabel>Koordinator Lapangan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="personnel" render={({ field }) => (<FormItem><FormLabel>Jumlah Personil (Orang)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-blue-500" /> Dasar Pengerjaan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {basisFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <FormField control={form.control} name={`basis.${index}.value`} render={({ field }) => (<FormItem><FormLabel className={index > 0 ? "hidden" : ""}>Dasar Pengerjaan</FormLabel><FormControl><Input placeholder="Contoh: Laporan Masyarakat" {...field} /></FormControl></FormItem>)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeBasis(index)} className={cn("text-red-500", basisFields.length === 1 && "hidden")}><Trash2 size={18} /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendBasis({ value: "" })} className="w-full border-dashed"><Plus size={14} className="mr-2" /> Tambah Dasar Lain</Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-lg">Keterangan</CardTitle></CardHeader>
            <CardContent><FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Catatan Tambahan</FormLabel><FormControl><Input placeholder="Catatan tambahan..." {...field} /></FormControl><FormMessage /></FormItem>)} /></CardContent>
          </Card>
        </form>
      </Form>

      <Card className="border-t-4 border-t-green-500 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-lg flex items-center gap-2"><RefreshCw className={cn("h-5 w-5 text-green-600", loadingDaily && "animate-spin")} /> Rekap Rencana Kerja: {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-200" onClick={() => navigate(`/work-plans/print-rekap?date=${selectedDate}`)} disabled={dailyPlans.length === 0}><Printer className="mr-2 h-4 w-4" /> Cetak Rekap Tabel</Button>
            <Button variant="outline" size="sm" onClick={() => loadDailyPlans(selectedDate)}>Segarkan</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[50px] text-center">No</TableHead><TableHead>Kategori</TableHead><TableHead>Uraian Kegiatan</TableHead><TableHead>Lokasi</TableHead><TableHead className="text-center">Personil</TableHead><TableHead>Koordinator</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {loadingDaily ? (<TableRow><TableCell colSpan={7} className="text-center py-10">Memuat data rekap...</TableCell></TableRow>) : dailyPlans.length > 0 ? (dailyPlans.map((plan, idx) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{plan.category}</Badge></TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="space-y-1">
                        {plan.locations?.length > 0 ? (
                          plan.locations.map((loc, i) => (
                            <div key={i} className="text-[10px] leading-tight">• {loc.description}</div>
                          ))
                        ) : (
                          <span className="truncate">{plan.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {plan.locations?.length > 0 ? (
                        <div className="space-y-1">
                          {plan.locations.map((loc, i) => (
                            <div key={i} className="text-[10px] leading-tight">
                              • {loc.street} ({loc.sub_district})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="truncate">{plan.street} ({plan.sub_district})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{plan.personnel} Orang</TableCell>
                    <TableCell>{plan.coordinator}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => navigate(`/work-plans/${plan.id}`)}><Eye size={14} /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => navigate(`/work-plans/edit/${plan.id}`)}><Edit size={14} /></Button></div></TableCell>
                  </TableRow>
                ))) : (<TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400 italic">Belum ada rencana kerja untuk tanggal ini</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkPlanForm;