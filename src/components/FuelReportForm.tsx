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
import { ArrowLeft, Save, Loader2, Fuel, MapPin, Info, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { FuelReport, FuelType } from '@/types/fuelReport';
import { fuelService } from '@/services/fuelService';
import { medanDistricts } from '@/data/medan-districts';
import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils";

const regions = [
  "Pusat", "Wilayah 1 Utara", "Wilayah 2 Barat", "Wilayah 3 Timur", "Wilayah 4 Kota", "Wilayah 5 Selatan"
];

const teamOptions: Record<string, string[]> = {
  "Pusat": ["Mobil Crane", "Mobil Tangga 30m", "Beco Loader"],
  "Wilayah 1 Utara": ["Tim Babat", "Tim Siram", "Tim Pohon", "Becak Siram", "Becak Sampah"],
  "Wilayah 2 Barat": ["Tim Babat", "Tim Siram", "Tim Pohon", "Becak Siram", "Becak Sampah"],
  "Wilayah 3 Timur": ["Tim Babat", "Tim Siram", "Tim Pohon", "Becak Siram", "Becak Sampah"],
  "Wilayah 4 Kota": ["Tim Babat", "Tim Siram", "Tim Pohon"],
  "Wilayah 5 Selatan": ["Tim Babat", "Tim Siram", "Tim Pohon", "Becak Siram", "Becak Sampah"],
};

const usageItemSchema = z.object({
  vehicle_operator: z.string().default("-"),
  fuel_type: z.string().min(1, "Jenis wajib dipilih"),
  amount: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
});

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  region: z.string().min(1, "Wilayah wajib dipilih"),
  team: z.string().min(1, "Tim wajib dipilih"),
  customTeam: z.string().optional(),
  items: z.array(usageItemSchema).min(1, "Minimal satu detail pemakaian"),
  location: z.object({
    street: z.string().min(1, "Jalan wajib diisi"),
    subDistrict: z.string().optional().default(""),
    village: z.string().optional().default(""),
  }),
  remarks: z.string().optional().default(""),
});

interface FuelReportFormProps {
  initialData?: FuelReport;
  isEditing?: boolean;
}

const FuelReportForm = ({ initialData, isEditing = false }: FuelReportFormProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTeamMode, setCustomTeamMode] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      items: initialData.items.map(item => ({ ...item, fuel_type: item.fuel_type as string })),
    } : {
      date: new Date().toISOString().split('T')[0],
      region: "",
      team: "",
      items: [{ vehicle_operator: "", fuel_type: "Pertamax", amount: 0 }],
      location: { street: "", subDistrict: "", village: "" },
      remarks: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const selectedRegion = form.watch("region");
  const selectedTeam = form.watch("team");
  const selectedSubDistrict = form.watch("location.subDistrict");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (profile?.role !== 'admin') {
      showError("Hanya Administrator yang dapat menyimpan laporan ini");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalData = {
        date: values.date,
        region: values.region,
        team: customTeamMode ? values.customTeam || values.team : values.team,
        items: values.items.map(item => ({
          ...item,
          fuel_type: item.fuel_type as FuelType,
          vehicle_operator: item.vehicle_operator || "-"
        })),
        location: values.location,
        remarks: values.remarks,
      };

      if (isEditing && initialData) {
        await fuelService.updateReport(initialData.id, finalData);
        showSuccess("Laporan BBM diperbarui");
      } else {
        await fuelService.createReport(finalData);
        showSuccess("Laporan BBM disimpan");
      }
      navigate('/fuel-reports');
    } catch (error) {
      showError("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
          </Button>
          <h1 className="text-2xl font-bold text-primary">
            {isEditing ? "Edit Laporan BBM & Oli" : "Input Laporan BBM & Oli"}
          </h1>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan
          </Button>
        </div>

        <Card className="border-t-4 border-t-blue-600">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-blue-500" /> Informasi Wilayah & Tim</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem><FormLabel>Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="region" render={({ field }) => (
              <FormItem>
                <FormLabel>Wilayah</FormLabel>
                <Select onValueChange={(val) => { field.onChange(val); form.setValue("team", ""); setCustomTeamMode(false); }} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Wilayah" /></SelectTrigger></FormControl>
                  <SelectContent>{regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="team" render={({ field }) => (
              <FormItem>
                <FormLabel>Tim / Operator Utama</FormLabel>
                <Select onValueChange={(val) => { 
                  if (val === "custom") { setCustomTeamMode(true); field.onChange(""); }
                  else { setCustomTeamMode(false); field.onChange(val); }
                }} value={customTeamMode ? "custom" : field.value} disabled={!selectedRegion}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Tim" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {selectedRegion && teamOptions[selectedRegion]?.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="custom" className="text-blue-600 font-bold">+ Tambah Manual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {customTeamMode && (
              <FormField control={form.control} name="customTeam" render={({ field }) => (
                <FormItem><FormLabel>Nama Tim Baru</FormLabel><FormControl><Input placeholder="Ketik nama tim..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><Fuel className="text-orange-600" /> Detail Pemakaian</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ vehicle_operator: "", fuel_type: "Pertamax", amount: 0 })} className="border-blue-600 text-blue-600">
              <Plus className="h-4 w-4 mr-1" /> Tambah Pemakaian
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-orange-500 relative">
              <CardContent className="pt-6 space-y-4">
                {fields.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name={`items.${index}.fuel_type`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis BBM / Oli</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Pertamax">Pertamax (Voucher)</SelectItem>
                          <SelectItem value="Dexlite">Dexlite (Voucher)</SelectItem>
                          <SelectItem value="Oli">Oli (Liter)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name={`items.${index}.amount`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{form.watch(`items.${index}.fuel_type`) === "Oli" ? "Jumlah (Liter)" : "Jumlah Voucher (Rp)"}</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name={`items.${index}.vehicle_operator`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kendaraan / Operator {selectedTeam === "Tim Babat" && <span className="text-[10px] text-slate-400">(Opsional)</span>}</FormLabel>
                      <FormControl><Input placeholder="BK 1234 XX / Nama" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-green-500" /> Lokasi Kerja</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="location.street" render={({ field }) => (
              <FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="location.subDistrict" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kecamatan <span className="text-[10px] text-slate-400">(Opsional)</span></FormLabel>
                  <Select onValueChange={(val) => { field.onChange(val); form.setValue("location.village", ""); }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kecamatan (Opsional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value=" ">Abaikan / Kosong</SelectItem>
                      {Object.keys(medanDistricts).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location.village" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelurahan <span className="text-[10px] text-slate-400">(Opsional)</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubDistrict || selectedSubDistrict === " "}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kelurahan (Opsional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value=" ">Abaikan / Kosong</SelectItem>
                      {selectedSubDistrict && selectedSubDistrict !== " " && medanDistricts[selectedSubDistrict]?.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Keterangan Tambahan</CardTitle></CardHeader>
          <CardContent>
            <FormField control={form.control} name="remarks" render={({ field }) => (
              <FormItem><FormControl><Input placeholder="Catatan tambahan..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};

export default FuelReportForm;