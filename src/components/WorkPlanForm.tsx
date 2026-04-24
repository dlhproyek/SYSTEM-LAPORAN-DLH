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
import { Plus, Trash2, Save, ArrowLeft, Loader2, MapPin, Users, Wrench, FileText, MessageSquare, ClipboardList, ShieldAlert, Check, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { WorkPlan, WorkPlanItem } from '@/types/workPlan';
import { medanDistricts } from '@/data/medan-districts';
import { workPlanService } from '@/services/workPlanService';
import { useAuth } from '@/context/AuthContext';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const categories = ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"];

const toolUsageMapping: Record<string, string> = {
  "Mobil Tangga (BK 9044 J)": "Alat Bantu Untuk Menjangkau Ranting Yang Tinggi",
  "Dump Truck (BK8559 J)": "Pengangkut Sampah Pemangkasan Pohon",
  "Chainsaw": "Alat Pemotong Pohon dan Ranting",
  "Truk Siram (BK 8128 A)": "Penyiraman Tanaman Median Jalan",
  "Truk Siram (BK 9031 J)": "Penyiraman Tanaman Median Jalan",
  "Mesin Babat": "Memotong Rumput"
};

const toolSchema = z.object({
  name: z.string().optional().default(""),
  unit: z.coerce.number().default(0),
  usage: z.string().optional().default(""),
});

const itemSchema = z.object({
  description: z.string().min(1, "Detail kegiatan wajib diisi"),
  location: z.object({
    street: z.string().min(1, "Jalan wajib diisi"),
    village: z.array(z.string()).default([""]),
    subDistrict: z.string().default(""),
  }),
  tools: z.array(toolSchema).default([]),
  coordinator: z.string().optional().default(""),
  personnel: z.object({
    members: z.coerce.number().min(0),
  }),
  basis: z.string().min(1, "Dasar pengerjaan wajib diisi"),
  remarks: z.string().optional().default(""),
  // Field internal untuk UI saja
  uiMode: z.enum(['full', 'activity_location', 'location_only']).default('full'),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  items: z.array(itemSchema).min(1),
  globalTools: z.array(toolSchema).optional().default([{ name: "", unit: 1, usage: "" }]),
  globalCoordinator: z.string().optional().default(""),
  globalMembers: z.coerce.number().optional().default(0),
}).superRefine((data, ctx) => {
  const isGlobalStyle = data.category === "Tim Pohon";
  const isToolsOptional = ["Taman Kota", "Taman Amplas", "Taman Area"].includes(data.category);

  if (isGlobalStyle) {
    if (!data.globalCoordinator || data.globalCoordinator.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Koordinator tim wajib diisi", path: ['globalCoordinator'] });
    }
  }

  data.items.forEach((item, index) => {
    if (data.category !== "Tim Siram" && data.category !== "Tim Babat") {
      if (!item.location.subDistrict || item.location.subDistrict.trim() === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Kecamatan wajib diisi", path: ['items', index, 'location', 'subDistrict'] });
      }
    }
    if (!isGlobalStyle && !isToolsOptional && item.uiMode === 'full') {
      if (item.tools.length === 0 || !item.tools[0].name || item.tools[0].name.trim() === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimal satu alat operasional wajib diisi", path: ['items', index, 'tools', 0, 'name'] });
      }
    }
  });
});

const WorkPlanForm = ({ initialData, isEditing = false }: { initialData?: WorkPlan; isEditing?: boolean }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk Wizard (Tim Siram & Tim Babat)
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Tanya Alat, 2: Tanya Kegiatan

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      date: initialData.date,
      category: initialData.category,
      items: initialData.items.map(item => ({ ...item, uiMode: 'full' })),
      globalTools: initialData.category === "Tim Pohon" ? initialData.items[0].tools : [{ name: "", unit: 1, usage: "" }],
      globalCoordinator: initialData.category === "Tim Pohon" ? initialData.items[0].coordinator : "",
      globalMembers: initialData.category === "Tim Pohon" ? initialData.items[0].personnel.members : 0,
    } : {
      date: new Date().toISOString().split('T')[0],
      category: profile?.role === 'user' ? (profile?.category || "") : "",
      items: [{
        description: "",
        location: { street: "", village: [""], subDistrict: "" },
        tools: [{ name: "", unit: 1, usage: "" }],
        coordinator: "",
        personnel: { members: 0 },
        basis: "",
        remarks: "",
        uiMode: 'full'
      }],
      globalTools: [{ name: "", unit: 1, usage: "" }],
      globalCoordinator: "",
      globalMembers: 0,
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const selectedCategory = form.watch("category");
  const isGlobalStyle = selectedCategory === "Tim Pohon";
  const isToolsOptional = ["Taman Kota", "Taman Amplas", "Taman Area"].includes(selectedCategory);
  const useWizard = selectedCategory === "Tim Siram" || selectedCategory === "Tim Babat";

  const handleAddClick = () => {
    if (useWizard) {
      setWizardStep(1);
      setShowWizard(true);
    } else {
      performAppend('full');
    }
  };

  const performAppend = (mode: 'full' | 'activity_location' | 'location_only') => {
    const items = form.getValues("items");
    const lastItem = items[items.length - 1];
    
    if (mode === 'full') {
      appendItem({
        description: "",
        location: { street: "", village: [""], subDistrict: lastItem?.location.subDistrict || "" },
        tools: isGlobalStyle ? [] : [{ name: "", unit: 1, usage: "" }],
        coordinator: isGlobalStyle ? form.getValues("globalCoordinator") : lastItem?.coordinator || "",
        personnel: { members: isGlobalStyle ? form.getValues("globalMembers") : lastItem?.personnel.members || 0 },
        basis: lastItem?.basis || "",
        remarks: "",
        uiMode: 'full'
      });
    } else if (mode === 'activity_location') {
      appendItem({
        description: "",
        location: { street: "", village: [""], subDistrict: lastItem?.location.subDistrict || "" },
        tools: lastItem.tools.map(t => ({ ...t })),
        coordinator: lastItem.coordinator,
        personnel: { ...lastItem.personnel },
        basis: lastItem.basis,
        remarks: lastItem.remarks,
        uiMode: 'activity_location'
      });
    } else if (mode === 'location_only') {
      appendItem({
        description: lastItem.description,
        location: { street: "", village: [""], subDistrict: lastItem?.location.subDistrict || "" },
        tools: lastItem.tools.map(t => ({ ...t })),
        coordinator: lastItem.coordinator,
        personnel: { ...lastItem.personnel },
        basis: lastItem.basis,
        remarks: lastItem.remarks,
        uiMode: 'location_only'
      });
    }
    setShowWizard(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const cleanGlobalTools = values.globalTools?.filter(t => t.name && t.name.trim() !== "") || [];
      const processedItems = values.items.map(item => {
        const { uiMode, ...rest } = item; // Hapus uiMode sebelum simpan ke DB
        if (isGlobalStyle) {
          return { ...rest, tools: cleanGlobalTools, coordinator: values.globalCoordinator || "", personnel: { members: values.globalMembers || 0 } };
        } else {
          return { ...rest, tools: item.tools.filter(t => t.name && t.name.trim() !== "") };
        }
      });

      const finalValues = { date: values.date, category: values.category, items: processedItems };
      if (isEditing && initialData) {
        await workPlanService.updateWorkPlan(initialData.id, finalValues as Partial<WorkPlan>);
        showSuccess("Rencana Kerja diperbarui!");
      } else {
        await workPlanService.createWorkPlan(finalValues as Omit<WorkPlan, 'id' | 'createdAt'>);
        showSuccess("Rencana Kerja disimpan!");
      }
      navigate('/work-plans');
    } catch (error) {
      console.error(error);
      showError("Gagal menyimpan rencana kerja");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto pb-20">
        <datalist id="workplan-tools">
          {Object.keys(toolUsageMapping).map(tool => <option key={tool} value={tool} />)}
        </datalist>

        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <h1 className="text-2xl font-bold text-primary">{isEditing ? "Edit Rencana Kerja" : "Buat Rencana Kerja Baru"}</h1>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Simpan
          </Button>
        </div>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader><CardTitle className="text-lg">Informasi Umum</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Tanggal Rencana</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Kategori / Tim</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={profile?.role === 'user'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
                  <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {isGlobalStyle && (
          <Card className="border-t-4 border-t-orange-500 bg-orange-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700"><ShieldAlert className="h-5 w-5" /> Sumber Daya Tim (Global)</CardTitle>
              <p className="text-xs text-slate-500 italic">Khusus {selectedCategory}, alat dan personil diatur secara global untuk seluruh lokasi.</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="globalCoordinator" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Users size={16} /> Koordinator Tim</FormLabel><FormControl><Input {...field} placeholder="Nama Koordinator..." /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="globalMembers" render={({ field }) => (<FormItem><FormLabel>Jumlah Anggota Tim</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="space-y-4 pt-4 border-t border-orange-200">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-2 text-orange-700 font-bold"><Wrench size={16} /> Alat Operasional Tim</FormLabel>
                  <Button type="button" variant="outline" size="sm" className="h-8 border-orange-200 text-orange-700 hover:bg-orange-100" onClick={() => { const current = form.getValues("globalTools") || []; form.setValue("globalTools", [...current, { name: "", unit: 1, usage: "" }]); }}><Plus size={14} className="mr-1" /> Tambah Alat</Button>
                </div>
                {form.watch("globalTools")?.map((_, toolIdx) => (
                  <div key={toolIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg border border-orange-100">
                    <div className="md:col-span-5">
                      <FormField control={form.control} name={`globalTools.${toolIdx}.name`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] uppercase">Nama Alat</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-9" 
                              {...field} 
                              list="workplan-tools"
                              onChange={(e) => {
                                field.onChange(e);
                                const usage = toolUsageMapping[e.target.value];
                                if (usage) form.setValue(`globalTools.${toolIdx}.usage`, usage);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="md:col-span-2"><FormField control={form.control} name={`globalTools.${toolIdx}.unit`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase">Unit</FormLabel><FormControl><Input type="number" className="h-9" {...field} /></FormControl></FormItem>)} /></div>
                    <div className="md:col-span-4"><FormField control={form.control} name={`globalTools.${toolIdx}.usage`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase">Kegunaan</FormLabel><FormControl><Input className="h-9" {...field} /></FormControl></FormItem>)} /></div>
                    <div className="md:col-span-1 flex justify-end"><Button type="button" variant="ghost" size="icon" className="text-red-400 h-9 w-9" onClick={() => { const current = form.getValues("globalTools") || []; form.setValue("globalTools", current.filter((_, i) => i !== toolIdx)); }}><Trash2 size={16} /></Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="text-blue-600" /> Daftar Lokasi & Kegiatan</h2>
          </div>
          {itemFields.map((item, index) => {
            const uiMode = form.watch(`items.${index}.uiMode`);
            return (
              <Card key={item.id} className="border-l-4 border-l-blue-400 shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-600">Lokasi #{index + 1}</Badge>
                    {uiMode !== 'full' && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                        <Check size={10} className="mr-1" /> {uiMode === 'location_only' ? 'Alat & Kegiatan Sama' : 'Alat Sama'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {uiMode !== 'full' && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] text-blue-600" onClick={() => form.setValue(`items.${index}.uiMode`, 'full')}>
                        Tampilkan Semua Field
                      </Button>
                    )}
                    {itemFields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {uiMode !== 'location_only' && (
                    <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (<FormItem><FormLabel className="font-bold">Detail Kegiatan</FormLabel><FormControl><Input {...field} placeholder="Contoh: Pembabatan rumput..." /></FormControl><FormMessage /></FormItem>)} />
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`items.${index}.location.street`} render={({ field }) => (<FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`items.${index}.location.subDistrict`} render={({ field }) => (
                      <FormItem><FormLabel>Kecamatan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value=" ">Abaikan / Kosong</SelectItem>{Object.keys(medanDistricts).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.location.village.0`} render={({ field }) => (
                      <FormItem><FormLabel>Kelurahan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value=" ">Abaikan / Kosong</SelectItem>{form.watch(`items.${index}.location.subDistrict`) && form.watch(`items.${index}.location.subDistrict`) !== " " && medanDistricts[form.watch(`items.${index}.location.subDistrict`)].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {uiMode === 'full' && !isGlobalStyle && (
                    <>
                      <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center justify-between">
                          <FormLabel className="flex items-center gap-2 text-blue-700 font-bold"><Wrench size={16} /> Alat Operasional</FormLabel>
                          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => { const current = form.getValues(`items.${index}.tools`); form.setValue(`items.${index}.tools`, [...current, { name: "", unit: 1, usage: "" }]); }}><Plus size={14} className="mr-1" /> Tambah Alat</Button>
                        </div>
                        {form.watch(`items.${index}.tools`)?.map((_, toolIdx) => (
                          <div key={toolIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-lg border">
                            <div className="md:col-span-5">
                              <FormField control={form.control} name={`items.${index}.tools.${toolIdx}.name`} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px] uppercase">Nama Alat</FormLabel>
                                  <FormControl>
                                    <Input 
                                      className="h-9" 
                                      {...field} 
                                      list="workplan-tools"
                                      onChange={(e) => {
                                        field.onChange(e);
                                        const usage = toolUsageMapping[e.target.value];
                                        if (usage) form.setValue(`items.${index}.tools.${toolIdx}.usage`, usage);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>
                            <div className="md:col-span-2"><FormField control={form.control} name={`items.${index}.tools.${toolIdx}.unit`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase">Unit</FormLabel><FormControl><Input type="number" className="h-9" {...field} /></FormControl></FormItem>)} /></div>
                            <div className="md:col-span-4"><FormField control={form.control} name={`items.${index}.tools.${toolIdx}.usage`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase">Kegunaan</FormLabel><FormControl><Input className="h-9" {...field} /></FormControl></FormItem>)} /></div>
                            <div className="md:col-span-1 flex justify-end"><Button type="button" variant="ghost" size="icon" className="text-red-400 h-9 w-9" onClick={() => { const current = form.getValues(`items.${index}.tools`); form.setValue(`items.${index}.tools`, current.filter((_, i) => i !== toolIdx)); }}><Trash2 size={16} /></Button></div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <FormField control={form.control} name={`items.${index}.coordinator`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Users size={16} /> Koordinator</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`items.${index}.personnel.members`} render={({ field }) => (<FormItem><FormLabel>Jumlah Personil (Anggota)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </>
                  )}

                  {uiMode === 'full' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <FormField control={form.control} name={`items.${index}.basis`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><FileText size={16} /> Dasar Pengerjaan</FormLabel><FormControl><Input {...field} placeholder="Contoh: SPT No. 123..." /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`items.${index}.remarks`} render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><MessageSquare size={16} /> Keterangan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          <Button type="button" variant="outline" className="w-full border-dashed py-8 text-blue-600 font-bold bg-white hover:bg-blue-50" onClick={handleAddClick}><Plus className="mr-2 h-5 w-5" /> Tambah Lokasi Kerja Baru</Button>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 px-8">{isSubmitting ? "Menyimpan..." : "Simpan Rencana Kerja"}</Button>
        </div>
      </form>

      {/* Wizard Dialog (Tim Siram & Tim Babat) */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="text-blue-600 h-5 w-5" /> 
              {wizardStep === 1 ? "Alat Operasional" : "Detail Kegiatan"}
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1 
                ? "Apakah lokasi baru ini menggunakan Alat Operasional yang sama dengan lokasi sebelumnya?" 
                : "Apakah Detail Kegiatannya juga sama dengan lokasi sebelumnya?"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col gap-3">
            {wizardStep === 1 ? (
              <>
                <Button onClick={() => setWizardStep(2)} className="h-12 justify-start px-6 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                  <Check className="mr-3 h-5 w-5" /> Ya, Alat Sama
                </Button>
                <Button onClick={() => performAppend('full')} variant="outline" className="h-12 justify-start px-6">
                  <Plus className="mr-3 h-5 w-5" /> Tidak, Alat Berbeda (Input Semua)
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => performAppend('location_only')} className="h-12 justify-start px-6 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">
                  <Check className="mr-3 h-5 w-5" /> Ya, Kegiatan Sama (Input Lokasi Saja)
                </Button>
                <Button onClick={() => performAppend('activity_location')} variant="outline" className="h-12 justify-start px-6">
                  <Plus className="mr-3 h-5 w-5" /> Tidak, Kegiatan Berbeda (Input Kegiatan & Lokasi)
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowWizard(false)}>Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};

export default WorkPlanForm;