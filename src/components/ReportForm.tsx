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
import { Plus, Trash2, Save, ArrowLeft, FileText, Fuel, Image as ImageIcon, Truck, Users, Wrench, Loader2, MessageSquare, MapPin, Lock, ClipboardCheck, HelpCircle, Copy, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Report, ReportCategory, Task, FuelUsage, Location, Equipment, HeavyEquipment } from '@/types/report';
import { WorkPlan } from '@/types/workPlan';
import { medanDistricts } from '@/data/medan-districts';
import ImageUpload from './ImageUpload';
import { Badge } from "@/components/ui/badge";
import { getUnitByCategory } from '@/utils/report-helpers';
import { reportService } from '@/services/reportService';
import { workPlanService } from '@/services/workPlanService';
import { storageService } from '@/services/storageService';
import { auditLogService } from '@/services/auditLogService';
import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const categories: ReportCategory[] = [
  "Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"
];

const coordinatorMapping: Record<string, string> = {
  "Taman Kota": "Mhd. Said",
  "Taman Area": "Ismail Siregar",
  "Taman Amplas": "Erwinsyah",
  "Tim Babat": "Benget Simanjuntak",
};

const defaultActivityMapping: Record<string, string> = {
  "Taman Kota": "Perawatan dan Pembersihan Taman Media ",
  "Taman Area": "Perawatan dan Pembersihan Taman Media ",
  "Taman Amplas": "Perawatan dan Pembersihan Taman Media ",
};

const vehicleCoordinatorMapping: Record<string, string> = {
  "BK 8128 A": "M. Irwan Syahputra, SE",
  "BK 9031 J": "Aluddin Gultom",
  "BK 8265 A": "Budi",
  "BK 8266 A": "Sutrisno",
  "BK 8451 J": "Mhd. Said"
};

const locationSchema = z.object({
  street: z.string().min(1, "Jalan wajib diisi"),
  village: z.array(z.string()).default([""]),
  subDistrict: z.string().default(""),
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
    vehicle: z.string().optional().default(""),
    fuel: fuelSchema,
  })),
  personnel: z.object({
    coordinator: z.string().min(1, "Nama koordinator wajib diisi"),
    members: z.coerce.number().int().min(0),
  }),
  vehicle: z.string().optional(),
  remarks: z.string().optional().default(""),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  tasks: z.array(taskSchema).min(1),
  remarks: z.string().optional().default(""),
}).superRefine((data, ctx) => {
  if (data.category !== "Tim Siram") {
    data.tasks.forEach((task, index) => {
      if (!task.location.subDistrict || task.location.subDistrict.trim() === "" || task.location.subDistrict === " ") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Kecamatan wajib diisi", path: ['tasks', index, 'location', 'subDistrict'] });
      }
      if (!task.location.village || task.location.village.some(v => !v || v.trim() === "" || v === " ")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Kelurahan wajib diisi", path: ['tasks', index, 'location', 'village', 0] });
      }
    });
  }
});

interface ReportFormProps {
  initialData?: Report;
  isEditing?: boolean;
}

const ReportForm = ({ initialData, isEditing = false }: ReportFormProps) => {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [existingVehicles, setExistingVehicles] = useState<string[]>(["BK 8128 A", "BK 9031 J", "BK 8265 A", "BK 8266 A", "BK 8451 J"]);
  const [matchingWorkPlan, setMatchingWorkPlan] = useState<WorkPlan | null>(null);
  const [showWorkPlanPrompt, setShowWorkPlanPrompt] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  const isPimpinan = profile?.role === 'pimpinan' || (session?.user?.email === 'pimpinan@gmail.com');
  const isAdminHarian = profile?.role === 'admin_harian' || (session?.user?.email === 'sakinah@gmail.com');
  const isUserRestricted = profile?.role === 'user' && !isPimpinan && !isAdminHarian;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      date: initialData.date,
      category: initialData.category,
      tasks: initialData.tasks.map(t => ({ ...t, location: { ...t.location, village: Array.isArray(t.location.village) ? t.location.village : [t.location.village] } })),
      remarks: initialData.remarks,
    } : {
      date: new Date().toISOString().split('T')[0],
      category: isUserRestricted ? (profile?.category || "") : "",
      tasks: [{ description: "", location: { street: "", village: [""], subDistrict: "" }, photos: { zero: "", fifty: "", hundred: "" }, volume: 0, equipment: [{ type: "", quantity: 1 }], heavyEquipment: [], personnel: { coordinator: "", members: 0 }, vehicle: "", remarks: "" }],
      remarks: "",
    },
  });

  const selectedCategory = form.watch("category");
  const selectedDate = form.watch("date");
  const { fields: taskFields, append: appendTask, remove: removeTask, replace: replaceTasks } = useFieldArray({ control: form.control, name: "tasks" });

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const reports = await reportService.getAllReports();
        const vehicles = new Set(existingVehicles);
        reports.forEach(r => {
          r.tasks?.forEach(t => {
            if (t.vehicle) vehicles.add(t.vehicle);
            t.heavyEquipment?.forEach(he => { if (he.vehicle) vehicles.add(he.vehicle); });
          });
        });
        setExistingVehicles(Array.from(vehicles));
      } catch (e) { console.error(e); }
    };
    fetchVehicles();
  }, []);

  useEffect(() => {
    const checkWorkPlan = async () => {
      if (!isEditing && !isDuplicateMode && selectedDate && selectedCategory && selectedCategory !== "") {
        try {
          const plans = await workPlanService.getAllWorkPlans();
          const match = plans.find(p => p.date === selectedDate && p.category === selectedCategory);
          if (match) { setMatchingWorkPlan(match); setShowWorkPlanPrompt(true); }
          else { setMatchingWorkPlan(null); }
        } catch (e) { console.error(e); }
      }
    };
    checkWorkPlan();
  }, [selectedDate, selectedCategory, isEditing, isDuplicateMode]);

  useEffect(() => {
    if (!isEditing && !isDuplicateMode && selectedCategory) {
      const tasks = form.getValues("tasks");
      const defaultDesc = defaultActivityMapping[selectedCategory] || "";
      
      const updatedTasks = tasks.map(task => {
        let coordinator = task.personnel.coordinator;
        if (selectedCategory === "Tim Siram" || selectedCategory === "Tim Pohon") {
          const firstVehicle = task.heavyEquipment?.[0]?.vehicle || task.vehicle;
          coordinator = firstVehicle ? vehicleCoordinatorMapping[firstVehicle] || "" : "";
        } else {
          coordinator = coordinatorMapping[selectedCategory] || "";
        }
        
        return { 
          ...task, 
          personnel: { ...task.personnel, coordinator },
          description: task.description === "" ? defaultDesc : task.description
        };
      });
      form.setValue("tasks", updatedTasks);
    }
  }, [selectedCategory, form, isEditing, isDuplicateMode]);

  const applyWorkPlan = () => {
    if (!matchingWorkPlan) return;
    const newTasks = matchingWorkPlan.items.map(item => ({
      description: item.description,
      location: { street: item.location.street, village: Array.isArray(item.location.village) ? item.location.village : [item.location.village], subDistrict: item.location.subDistrict },
      photos: { zero: "", fifty: "", hundred: "" },
      volume: 0,
      equipment: [],
      heavyEquipment: item.tools.map(tool => ({ type: tool.name, vehicle: "", fuel: { pertamax: 0, dexlite: 0, solar: 0 } })),
      personnel: { coordinator: item.coordinator, members: item.personnel.members },
      vehicle: "",
      remarks: item.basis
    }));
    replaceTasks(newTasks);
    setShowWorkPlanPrompt(false);
    showSuccess("Data disinkronkan");
  };

  const uploadTaskPhotos = async (tasks: any[]) => {
    const updatedTasks = [...tasks];
    for (let i = 0; i < updatedTasks.length; i++) {
      const task = updatedTasks[i];
      setUploadProgress(`Mengunggah foto #${i + 1}...`);
      if (task.photos.zero?.startsWith('data:image')) {
        if (isEditing && !isDuplicateMode && initialData?.tasks[i]?.photos.zero) await storageService.deletePhotoByUrl(initialData.tasks[i].photos.zero);
        task.photos.zero = await storageService.uploadPhoto(task.photos.zero, `task_${i}_0`);
      }
      if (task.photos.fifty?.startsWith('data:image')) {
        if (isEditing && !isDuplicateMode && initialData?.tasks[i]?.photos.fifty) await storageService.deletePhotoByUrl(initialData.tasks[i].photos.fifty);
        task.photos.fifty = await storageService.uploadPhoto(task.photos.fifty, `task_${i}_50`);
      }
      if (task.photos.hundred?.startsWith('data:image')) {
        if (isEditing && !isDuplicateMode && initialData?.tasks[i]?.photos.hundred) await storageService.deletePhotoByUrl(initialData.tasks[i].photos.hundred);
        task.photos.hundred = await storageService.uploadPhoto(task.photos.hundred, `task_${i}_100`);
      }
    }
    return updatedTasks;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isPimpinan) { showError("Akses ditolak"); return; }
    setIsSubmitting(true);
    try {
      const processedTasksWithUrls = await uploadTaskPhotos(values.tasks);
      let totalVolume = 0;
      let totalFuel: FuelUsage = { pertamax: 0, dexlite: 0, solar: 0 };
      let allEquipment: Equipment[] = [];
      let allHeavyEquipment: HeavyEquipment[] = [];
      let totalMembers = 0;

      const finalTasks = processedTasksWithUrls.map(task => {
        totalVolume += task.volume;
        task.heavyEquipment.forEach((he: any) => {
          totalFuel.pertamax += he.fuel.pertamax;
          totalFuel.dexlite += he.fuel.dexlite;
          totalFuel.solar += he.fuel.solar;
          allHeavyEquipment.push(he as HeavyEquipment);
        });
        task.equipment.forEach((e: any) => allEquipment.push(e as Equipment));
        totalMembers += task.personnel.members;
        return task;
      });

      const reportData: Omit<Report, 'id' | 'createdAt'> = {
        date: values.date,
        category: values.category as ReportCategory,
        vehicle: finalTasks[0].heavyEquipment?.[0]?.vehicle || finalTasks[0].vehicle,
        description: finalTasks[0].description,
        location: finalTasks[0].location as Location,
        tasks: finalTasks as Task[],
        volume: totalVolume,
        unit: getUnitByCategory(values.category),
        equipment: allEquipment,
        heavyEquipment: allHeavyEquipment,
        fuel: totalFuel,
        personnel: { coordinator: finalTasks[0].personnel.coordinator, members: totalMembers },
        remarks: values.remarks || "",
      };

      let result;
      if (isEditing && initialData && !isDuplicateMode) {
        result = await reportService.updateReport(initialData.id, reportData);
        if (session?.user) {
          await auditLogService.logAction({
            action: 'UPDATE',
            entityType: 'REPORT',
            entityId: initialData.id,
            details: { title: reportData.description, date: reportData.date },
            userId: session.user.id,
            username: profile?.username || session.user.email || "User"
          });
        }
        showSuccess("Laporan diperbarui!");
      } else {
        result = await reportService.createReport(reportData);
        if (session?.user) {
          await auditLogService.logAction({
            action: 'CREATE',
            entityType: 'REPORT',
            entityId: result.id,
            details: { title: isDuplicateMode ? `(Duplikat) ${reportData.description}` : reportData.description, date: reportData.date },
            userId: session.user.id,
            username: profile?.username || session.user.email || "User"
          });
        }
        showSuccess(isDuplicateMode ? "Laporan baru berhasil dibuat dari duplikat!" : "Laporan disimpan!");
      }
      navigate('/');
    } catch (error) {
      console.error(error);
      showError("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  }

  const handleDuplicate = () => {
    if (!duplicateDate) { showError("Pilih tanggal"); return; }
    form.setValue("date", duplicateDate);
    setIsDuplicateMode(true);
    showSuccess(`Data disalin ke tanggal ${duplicateDate}. Silakan periksa dan klik Simpan.`);
    setShowDuplicateDialog(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
        <datalist id="vehicle-list">{existingVehicles.map(v => <option key={v} value={v} />)}</datalist>
        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold text-primary">{isEditing && !isDuplicateMode ? "Edit Laporan" : "Input Laporan Baru"}</h1>
            {isDuplicateMode && <Badge className="bg-amber-100 text-amber-700 border-amber-200 mt-1 animate-pulse"><Copy size={10} className="mr-1" /> Mode Duplikat: Belum Tersimpan</Badge>}
          </div>
          <div className="flex gap-2">
            {isEditing && !isDuplicateMode && <Button type="button" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50" onClick={() => { setDuplicateDate(new Date().toISOString().split('T')[0]); setShowDuplicateDialog(true); }}><Copy className="mr-2 h-4 w-4" /> Duplikat</Button>}
            <Button type="submit" disabled={isSubmitting || isPimpinan} className={cn("bg-blue-600 hover:bg-blue-700", isPimpinan && "opacity-50 cursor-not-allowed")}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploadProgress || "Menyimpan..."}</> : <><Save className="mr-2 h-4 w-4" /> {isDuplicateMode ? "Simpan Sebagai Baru" : "Simpan"}</>}
            </Button>
          </div>
        </div>

        {isDuplicateMode && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-800 shadow-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Perhatian: Mode Duplikat Aktif</p>
              <p className="text-xs opacity-90">Data laporan telah disalin ke tanggal baru. Perubahan yang Anda buat sekarang tidak akan mengubah laporan asli, melainkan akan disimpan sebagai <strong>Laporan Baru</strong> saat Anda menekan tombol Simpan.</p>
            </div>
          </div>
        )}

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader><CardTitle className="text-lg">Informasi Dasar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Hari / Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2">Kategori / Tim {isUserRestricted && <Lock size={12} className="text-amber-500" />}</FormLabel>
                <div className="relative"><Select onValueChange={field.onChange} value={field.value} disabled={isUserRestricted}><FormControl><SelectTrigger className={isUserRestricted ? "bg-slate-50 text-slate-500" : ""}><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl><SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select>{isUserRestricted && <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 p-1 rounded-full border border-amber-200 shadow-sm z-10"><Lock size={10} /></div>}</div>
              </FormItem>
            )} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Daftar Kegiatan & Sumber Daya</h2>
          {taskFields.map((taskField, taskIndex) => (
            <Card key={taskField.id} className="border-l-4 border-l-blue-400 overflow-hidden shadow-md">
              <CardContent className="p-6 space-y-8">
                <div className="flex justify-between items-center border-b pb-4"><Badge variant="secondary" className="bg-blue-600 text-white px-3 py-1">Kegiatan #{taskIndex + 1}</Badge>{taskFields.length > 1 && <Button type="button" variant="ghost" size="sm" className={cn("text-red-500 hover:bg-red-50", isPimpinan && "opacity-50 cursor-not-allowed")} disabled={isPimpinan} onClick={() => removeTask(taskIndex)}><Trash2 className="h-4 w-4 mr-1" /> Hapus Kegiatan</Button>}</div>
                <div className="space-y-4">
                  <FormField control={form.control} name={`tasks.${taskIndex}.description`} render={({ field }) => (<FormItem><FormLabel className="font-bold">Uraian Kegiatan</FormLabel><FormControl><Input {...field} placeholder="Contoh: Pemangkasan pohon mahoni..." /></FormControl></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`tasks.${taskIndex}.location.street`} render={({ field }) => (<FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name={`tasks.${taskIndex}.location.subDistrict`} render={({ field }) => (<FormItem><FormLabel>Kecamatan {selectedCategory === "Tim Siram" && <span className="text-[10px] text-slate-400 font-normal ml-1">(Opsional)</span>}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger></FormControl><SelectContent><SelectItem value=" ">Abaikan / Kosong</SelectItem>{Object.keys(medanDistricts).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between"><FormLabel className="flex items-center gap-2"><MapPin size={14} className="text-red-500" /> Daftar Kelurahan {selectedCategory === "Tim Siram" && <span className="text-[10px] text-slate-400 font-normal ml-1">(Opsional)</span>}</FormLabel><Button type="button" variant="outline" size="sm" className="h-7 text-[10px] bg-white" onClick={() => { const current = form.getValues(`tasks.${taskIndex}.location.village`); form.setValue(`tasks.${taskIndex}.location.village`, [...current, ""]); }}><Plus size={12} className="mr-1" /> Tambah Kelurahan</Button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{form.watch(`tasks.${taskIndex}.location.village`)?.map((_, vIdx) => (<div key={vIdx} className="flex gap-2 items-center"><FormField control={form.control} name={`tasks.${taskIndex}.location.village.${vIdx}`} render={({ field }) => (<FormItem className="flex-1"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="Pilih Kelurahan..." /></SelectTrigger></FormControl><SelectContent><SelectItem value=" ">Abaikan / Kosong</SelectItem>{form.watch(`tasks.${taskIndex}.location.subDistrict`) && form.watch(`tasks.${taskIndex}.location.subDistrict`) !== " " && medanDistricts[form.watch(`tasks.${taskIndex}.location.subDistrict`)].map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />{form.watch(`tasks.${taskIndex}.location.village`).length > 1 && <Button type="button" variant="ghost" size="icon" className={cn("h-9 w-9 text-red-400 hover:text-red-600", isPimpinan && "opacity-50 cursor-not-allowed")} disabled={isPimpinan} onClick={() => { const current = form.getValues(`tasks.${taskIndex}.location.village`); form.setValue(`tasks.${taskIndex}.location.village`, current.filter((_, i) => i !== vIdx)); }}><Trash2 size={14} /></Button>}</div>))}</div>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700"><ImageIcon size={16} className="text-blue-500" /> Dokumentasi & Volume</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <FormField control={form.control} name={`tasks.${taskIndex}.photos.zero`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 0%" value={field.value} onChange={field.onChange} disabled={isPimpinan} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name={`tasks.${taskIndex}.photos.fifty`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 50%" value={field.value} onChange={field.onChange} disabled={isPimpinan} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name={`tasks.${taskIndex}.photos.hundred`} render={({ field }) => (<FormItem><FormControl><ImageUpload label="Foto 100%" value={field.value} onChange={field.onChange} disabled={isPimpinan} /></FormControl></FormItem>)} />
                  </div>
                  <FormField control={form.control} name={`tasks.${taskIndex}.volume`} render={({ field }) => (<FormItem className="max-w-[200px]"><FormLabel>Volume ({getUnitByCategory(selectedCategory)})</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                </div>
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-600"><Fuel size={16} /> Operasional Alat Berat & BBM</div>
                  <div className="space-y-4">
                    {form.watch(`tasks.${taskIndex}.heavyEquipment`)?.map((_, heIdx) => (
                      <div key={heIdx} className="p-4 border rounded-lg bg-slate-50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="md:col-span-6"><FormField control={form.control} name={`tasks.${taskIndex}.heavyEquipment.${heIdx}.type`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Jenis Alat Berat</FormLabel><FormControl><Input {...field} placeholder="Contoh: Mesin Robin, Excavator..." /></FormControl></FormItem>)} /></div>
                          <div className="md:col-span-5"><FormField control={form.control} name={`tasks.${taskIndex}.heavyEquipment.${heIdx}.vehicle`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Plat Kendaraan (Opsional)</FormLabel><FormControl><Input {...field} list="vehicle-list" placeholder="BK 1234 XX" onChange={(e) => { field.onChange(e); if (heIdx === 0 && (selectedCategory === "Tim Siram" || selectedCategory === "Tim Pohon")) { const coordinator = vehicleCoordinatorMapping[e.target.value] || ""; if (coordinator) form.setValue(`tasks.${taskIndex}.personnel.coordinator`, coordinator); } }} /></FormControl></FormItem>)} /></div>
                          <div className="md:col-span-1 flex justify-end"><Button type="button" variant="destructive" size="icon" className={cn("h-10 w-10", isPimpinan && "opacity-50 cursor-not-allowed")} disabled={isPimpinan} onClick={() => { const current = form.getValues(`tasks.${taskIndex}.heavyEquipment`); form.setValue(`tasks.${taskIndex}.heavyEquipment`, current.filter((_, i) => i !== heIdx)); }}><Trash2 className="h-4 w-4" /></Button></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded border border-red-100">
                          <FormField control={form.control} name={`tasks.${taskIndex}.heavyEquipment.${heIdx}.fuel.pertamax`} render={({ field }) => (<FormItem><FormLabel className="text-[10px]">Pertamax (Rp)</FormLabel><FormControl><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span><Input type="number" className="h-8 text-xs pl-6" {...field} /></div></FormControl></FormItem>)} />
                          <FormField control={form.control} name={`tasks.${taskIndex}.heavyEquipment.${heIdx}.fuel.dexlite`} render={({ field }) => (<FormItem><FormLabel className="text-[10px]">Dexlite (Rp)</FormLabel><FormControl><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span><Input type="number" className="h-8 text-xs pl-6" {...field} /></div></FormControl></FormItem>)} />
                          <FormField control={form.control} name={`tasks.${taskIndex}.heavyEquipment.${heIdx}.fuel.solar`} render={({ field }) => (<FormItem><FormLabel className="text-[10px]">Solar (Rp)</FormLabel><FormControl><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span><Input type="number" className="h-8 text-xs pl-6" {...field} /></div></FormControl></FormItem>)} />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => { const current = form.getValues(`tasks.${taskIndex}.heavyEquipment`) || []; form.setValue(`tasks.${taskIndex}.heavyEquipment`, [...current, { type: "", vehicle: "", fuel: { pertamax: 0, dexlite: 0, solar: 0 } }]); }}><Plus className="h-3 w-3 mr-2" /> Tambah Alat Berat</Button>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-600"><Wrench size={16} /> Peralatan Lainnya</div>
                  <div className="space-y-3">
                    {form.watch(`tasks.${taskIndex}.equipment`)?.map((_, eqIdx) => (<div key={eqIdx} className="flex gap-4 items-end"><div className="flex-1"><FormField control={form.control} name={`tasks.${taskIndex}.equipment.${eqIdx}.type`} render={({ field }) => (<FormItem><FormLabel>Jenis Alat</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} /></div><div className="w-24"><FormField control={form.control} name={`tasks.${taskIndex}.equipment.${eqIdx}.quantity`} render={({ field }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} /></div><Button type="button" variant="destructive" size="icon" className={cn(isPimpinan && "opacity-50 cursor-not-allowed")} disabled={isPimpinan} onClick={() => { const current = form.getValues(`tasks.${taskIndex}.equipment`); form.setValue(`tasks.${taskIndex}.equipment`, current.filter((_, i) => i !== eqIdx)); }}><Trash2 className="h-4 w-4" /></Button></div>))}
                    <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => { const current = form.getValues(`tasks.${taskIndex}.equipment`) || []; form.setValue(`tasks.${taskIndex}.equipment`, [...current, { type: "", quantity: 1 }]); }}><Plus className="h-3 w-3 mr-2" /> Tambah Alat</Button>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-cyan-600"><Users size={16} /> Personil Kegiatan</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name={`tasks.${taskIndex}.personnel.coordinator`} render={({ field }) => (<FormItem><FormLabel>Koordinator</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} /><FormField control={form.control} name={`tasks.${taskIndex}.personnel.members`} render={({ field }) => (<FormItem><FormLabel>Jumlah Anggota</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} /></div>
                </div>
                <div className="pt-6 border-t border-slate-100 space-y-4"><div className="flex items-center gap-2 text-sm font-bold text-slate-600"><MessageSquare size={16} /> Keterangan Kegiatan</div><FormField control={form.control} name={`tasks.${taskIndex}.remarks`} render={({ field }) => (<FormItem><FormControl><Input {...field} placeholder="Catatan khusus..." /></FormControl></FormItem>)} /></div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed py-8 bg-white text-blue-600 font-bold border-blue-200 hover:bg-blue-50" onClick={() => {
            const defaultDesc = defaultActivityMapping[selectedCategory] || "";
            appendTask({ description: defaultDesc, location: { street: "", village: [""], subDistrict: "" }, photos: { zero: "", fifty: "", hundred: "" }, volume: 0, equipment: [{ type: "", quantity: 1 }], heavyEquipment: [], personnel: { coordinator: form.getValues("tasks.0.personnel.coordinator") || "", members: 0 }, vehicle: "", remarks: "" });
          }}><Plus className="mr-2 h-5 w-5" /> Tambah Kegiatan & Lokasi Baru</Button>
        </div>
        <Card className="border-t-4 border-t-slate-400"><CardHeader><CardTitle className="text-lg">Keterangan Tambahan</CardTitle></CardHeader><CardContent><FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Catatan Laporan (Opsional)</FormLabel><FormControl><Input {...field} placeholder="Catatan umum..." /></FormControl></FormItem>)} /></CardContent></Card>
        <div className="flex justify-end gap-4"><Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button><Button type="submit" disabled={isSubmitting || isPimpinan} className={cn("bg-blue-600 hover:bg-blue-700 px-8", isPimpinan && "opacity-50 cursor-not-allowed")}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploadProgress || "Menyimpan..."}</> : isDuplicateMode ? "Simpan Sebagai Baru" : "Simpan Laporan"}</Button></div>
      </form>
      
      <Dialog open={showWorkPlanPrompt} onOpenChange={setShowWorkPlanPrompt}><DialogContent className="sm:max-w-[450px]"><DialogHeader><DialogTitle className="flex items-center gap-2 text-blue-600"><ClipboardCheck className="h-6 w-6" /> Sinkronisasi Rencana Kerja</DialogTitle><DialogDescription className="pt-2">Ditemukan Rencana Kerja untuk kategori {selectedCategory} pada tanggal {selectedDate}. Apakah Anda ingin mengisi data laporan secara otomatis?</DialogDescription></DialogHeader><div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2"><p className="text-[10px] font-bold text-blue-700 uppercase">Data yang akan disinkronkan:</p><ul className="text-[11px] text-blue-800 space-y-1"><li>• Uraian Kegiatan & Lokasi</li><li>• Jenis Alat Berat</li><li>• Koordinator & Jumlah Anggota</li><li>• Keterangan Kegiatan</li></ul></div><DialogFooter className="gap-2 sm:gap-0"><Button variant="ghost" onClick={() => setShowWorkPlanPrompt(false)}>Tidak, Input Manual</Button><Button onClick={applyWorkPlan} className="bg-blue-600 hover:bg-blue-700"><HelpCircle className="mr-2 h-4 w-4" /> Ya, Sinkronkan Data</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}><DialogContent className="sm:max-w-[400px]"><DialogHeader><DialogTitle className="flex items-center gap-2"><Copy className="text-blue-600 h-5 w-5" /> Duplikat Laporan</DialogTitle><DialogDescription>Pilih tanggal baru untuk menyalin data laporan ini ke formulir.</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><FormLabel>Tanggal Baru</FormLabel><Input type="date" value={duplicateDate} onChange={(e) => setDuplicateDate(e.target.value)} className="h-11" /></div></div><DialogFooter className="gap-2 sm:gap-0"><Button variant="ghost" onClick={() => setShowDuplicateDialog(false)}>Batal</Button><Button onClick={handleDuplicate} disabled={!duplicateDate} className="bg-blue-600 hover:bg-blue-700"><Copy className="h-4 w-4 mr-2" /> Salin ke Form</Button></DialogFooter></DialogContent></Dialog>
    </Form>
  );
};

export default ReportForm;