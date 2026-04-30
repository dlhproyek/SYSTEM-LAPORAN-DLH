"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ArrowLeft, Loader2, Fuel, MapPin, Truck, Users, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { FuelSpj } from '@/types/fuelSpj';
import { fuelSpjService } from '@/services/fuelSpjService';
import { auditLogService } from '@/services/auditLogService';
import { useAuth } from '@/context/AuthContext';
import { medanDistricts } from '@/data/medan-districts';

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  spj_number: z.string().min(1, "No. SPJ wajib diisi"),
  vehicle: z.string().min(1, "Kendaraan wajib diisi"),
  usage_pertamax: z.coerce.number().min(0),
  usage_dexlite: z.coerce.number().min(0),
  usage_solar: z.coerce.number().min(0),
  usage_oil: z.coerce.number().min(0),
  location_street: z.string().min(1, "Nama jalan wajib diisi"),
  location_village: z.string().min(1, "Kelurahan wajib diisi"),
  location_district: z.string().min(1, "Kecamatan wajib diisi"),
  team: z.enum(["Tim Pohon", "Tim Siram", "Tim Babat"]),
  region: z.enum(["Wilayah 1 Utara", "Wilayah 2 Barat", "Wilayah 3 Timur", "Wilayah 4", "Wilayah 5 Selatan"]),
  remarks: z.string().optional().default(""),
});

interface FuelSpjFormProps {
  initialData?: FuelSpj;
  isEditing?: boolean;
}

const FuelSpjForm = ({ initialData, isEditing = false }: FuelSpjFormProps) => {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      date: initialData.date,
      spj_number: initialData.spj_number,
      vehicle: initialData.vehicle,
      usage_pertamax: initialData.usage_pertamax,
      usage_dexlite: initialData.usage_dexlite,
      usage_solar: initialData.usage_solar,
      usage_oil: initialData.usage_oil,
      location_street: initialData.location_street,
      location_village: initialData.location_village,
      location_district: initialData.location_district,
      team: initialData.team,
      region: initialData.region,
      remarks: initialData.remarks,
    } : {
      date: new Date().toISOString().split('T')[0],
      spj_number: "",
      vehicle: "",
      usage_pertamax: 0,
      usage_dexlite: 0,
      usage_solar: 0,
      usage_oil: 0,
      location_street: "",
      location_village: "",
      location_district: "",
      team: "Tim Pohon",
      region: "Wilayah 4",
      remarks: "",
    },
  });

  const selectedDistrict = form.watch("location_district");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (isEditing && initialData) {
        await fuelSpjService.update(initialData.id, values);
        if (session?.user) {
          await auditLogService.logAction({
            action: 'UPDATE',
            entityType: 'REPORT',
            entityId: initialData.id,
            details: { title: `Update SPJ BBM: ${values.spj_number}`, date: values.date },
            userId: session.user.id,
            username: profile?.username || session.user.email || "User"
          });
        }
        showSuccess("SPJ BBM diperbarui!");
      } else {
        const result = await fuelSpjService.create(values);
        if (session?.user) {
          await auditLogService.logAction({
            action: 'CREATE',
            entityType: 'REPORT',
            entityId: result.id,
            details: { title: `Input SPJ BBM: ${values.spj_number}`, date: values.date },
            userId: session.user.id,
            username: profile?.username || session.user.email || "User"
          });
        }
        showSuccess("SPJ BBM disimpan!");
      }
      navigate('/fuel-spj');
    } catch (error) {
      console.error(error);
      showError("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate('/fuel-spj')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
          <h1 className="text-2xl font-bold text-blue-600">{isEditing ? "Edit SPJ BBM" : "Input SPJ BBM Baru"}</h1>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Simpan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5 text-blue-500" /> Informasi Dasar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="spj_number" render={({ field }) => (<FormItem><FormLabel>No. SPJ (Manual)</FormLabel><FormControl><Input placeholder="Contoh: 001/SPJ/BBM/2024" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="vehicle" render={({ field }) => (<FormItem><FormLabel>Kendaraan / Alat Operasional</FormLabel><FormControl><Input placeholder="Contoh: BK 1234 XX / Mesin Babat" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Fuel className="h-5 w-5 text-orange-500" /> Pemakaian BBM & Oli</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="usage_pertamax" render={({ field }) => (<FormItem><FormLabel>Pertamax (Rp)</FormLabel><FormControl><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span><Input type="number" className="pl-9" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="usage_dexlite" render={({ field }) => (<FormItem><FormLabel>Dexlite (Rp)</FormLabel><FormControl><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span><Input type="number" className="pl-9" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="usage_solar" render={({ field }) => (<FormItem><FormLabel>Solar (Rp)</FormLabel><FormControl><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span><Input type="number" className="pl-9" {...field} /></div></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="usage_oil" render={({ field }) => (<FormItem><FormLabel>Oli (Liter)</FormLabel><FormControl><div className="relative"><Input type="number" step="0.01" className="pr-8" {...field} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">L</span></div></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-green-500 md:col-span-2">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-green-500" /> Lokasi Kerja</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="location_street" render={({ field }) => (<FormItem><FormLabel>Nama Jalan</FormLabel><FormControl><Input placeholder="Jl. ..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="location_district" render={({ field }) => (
                <FormItem><FormLabel>Kecamatan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kecamatan" /></SelectTrigger></FormControl>
                    <SelectContent>{Object.keys(medanDistricts).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location_village" render={({ field }) => (
                <FormItem><FormLabel>Kelurahan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kelurahan" /></SelectTrigger></FormControl>
                    <SelectContent>{selectedDistrict && medanDistricts[selectedDistrict]?.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-500">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-purple-500" /> Tim & Wilayah</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="team" render={({ field }) => (
                <FormItem><FormLabel>Tim</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Tim" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Tim Pohon">Tim Pohon</SelectItem>
                      <SelectItem value="Tim Siram">Tim Siram</SelectItem>
                      <SelectItem value="Tim Babat">Tim Babat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem><FormLabel>Wilayah</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Wilayah" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Wilayah 1 Utara">Wilayah 1 Utara</SelectItem>
                      <SelectItem value="Wilayah 2 Barat">Wilayah 2 Barat</SelectItem>
                      <SelectItem value="Wilayah 3 Timur">Wilayah 3 Timur</SelectItem>
                      <SelectItem value="Wilayah 4">Wilayah 4</SelectItem>
                      <SelectItem value="Wilayah 5 Selatan">Wilayah 5 Selatan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-slate-500">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-slate-500" /> Keterangan</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Catatan Tambahan</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
};

export default FuelSpjForm;