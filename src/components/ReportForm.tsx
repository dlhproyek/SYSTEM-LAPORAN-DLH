"use client";

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess } from '@/utils/toast';
import { Report, ReportCategory, Equipment } from '@/types/report';
import { medanDistricts } from '@/data/medan-districts';
import ImageUpload from './ImageUpload';

const categories: ReportCategory[] = [
  "Taman Kota", 
  "Taman Amplas", 
  "Taman Area", 
  "Tim Babat", 
  "Penyiraman Taman", 
  "Tim Pohon"
];

const formSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  description: z.string().min(5, "Uraian kegiatan minimal 5 karakter"),
  location: z.object({
    street: z.string().min(1, "Jalan wajib diisi"),
    village: z.string().min(1, "Kelurahan wajib diisi"),
    subDistrict: z.string().min(1, "Kecamatan wajib diisi"),
  }),
  photos: z.object({
    zero: z.string().optional().default(""),
    fifty: z.string().optional().default(""),
    hundred: z.string().optional().default(""),
  }),
  volume: z.coerce.number().min(0),
  unit: z.string().min(1, "Satuan wajib diisi"),
  equipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat wajib diisi"),
    quantity: z.coerce.number().min(1),
  })),
  heavyEquipment: z.array(z.object({
    type: z.string().min(1, "Jenis alat berat wajib diisi"),
    quantity: z.coerce.number().min(1),
  })),
  fuel: z.object({
    pertamax: z.coerce.number().default(0),
    dexlite: z.coerce.number().default(0),
    solar: z.coerce.number().default(0),
    remarks: z.string().optional().default(""),
  }),
  personnel: z.object({
    coordinator: z.coerce.number().min(0),
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
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      photos: {
        zero: initialData.photos.zero || "",
        fifty: initialData.photos.fifty || "",
        hundred: initialData.photos.hundred || "",
      },
      fuel: {
        ...initialData.fuel,
        remarks: initialData.fuel.remarks || "",
      },
      remarks: initialData.remarks || "",
    } : {
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      location: { street: "", village: "", subDistrict: "" },
      photos: { zero: "", fifty: "", hundred: "" },
      volume: 0,
      unit: "",
      equipment: [{ type: "", quantity: 1 }],
      heavyEquipment: [],
      fuel: { pertamax: 0, dexlite: 0, solar: 0, remarks: "" },
      personnel: { coordinator: 0, members: 0 },
      remarks: "",
    },
  });

  const selectedCategory = form.watch("category");
  const selectedSubDistrict = form.watch("location.subDistrict");
  const heavyEquipmentList = form.watch("heavyEquipment");

  useEffect(() => {
    if (!isEditing) {
      if (selectedCategory === "Tim Pohon") {
        form.setValue("unit", "Pohon");
      } else if (selectedCategory !== "") {
        form.setValue("unit", "M2");
      }
    }
  }, [selectedCategory, form, isEditing]);

  const handleSubDistrictChange = (value: string) => {
    form.setValue("location.subDistrict", value);
    form.setValue("location.village", "");
  };

  const handleVillageChange = (value: string) => {
    form.setValue("location.village", value);
    const district = Object.keys(medanDistricts).find(d => 
      medanDistricts[d].includes(value)
    );
    if (district) {
      form.setValue("location.subDistrict", district);
    }
  };

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
    
    const mappedEquipment: Equipment[] = values.equipment.map(e => ({
      type: e.type,
      quantity: e.quantity
    }));

    const mappedHeavyEquipment: Equipment[] = values.heavyEquipment.map(e => ({
      type: e.type,
      quantity: e.quantity
    }));

    const reportData = {
      date: values.date,
      category: values.category as ReportCategory,
      description: values.description,
      location: {
        street: values.location.street,
        village: values.location.village,
        subDistrict: values.location.subDistrict,
      },
      photos: {
        zero: values.photos.zero || "",
        fifty: values.photos.fifty || "",
        hundred: values.photos.hundred || "",
      },
      volume: values.volume,
      unit: values.unit,
      equipment: mappedEquipment,
      heavyEquipment: mappedHeavyEquipment,
      fuel: {
        pertamax: values.fuel.pertamax,
        dexlite: values.fuel.dexlite,
        solar: values.fuel.solar,
        remarks: values.fuel.remarks || "",
      },
      personnel: {
        coordinator: values.personnel.coordinator,
        members: values.personnel.members,
      },
      remarks: values.remarks || "",
      syncStatus: 'pending' as const,
    };

    if (isEditing && initialData) {
      const updatedReport: Report = {
        ...reportData,
        id: initialData.id,
        createdAt: initialData.createdAt,
      };

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
      };
      localStorage.setItem('reports', JSON.stringify([newReport, ...reports]));
      showSuccess("Laporan berhasil disimpan secara lokal!");
    }
    navigate('/');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <h1 className="text-2xl font-bold text-primary">
            {isEditing ? "Edit Laporan" : "Input Laporan Baru"}
          </h1>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" /> {isEditing ? "Simpan Perubahan" : "Simpan Laporan"}
          </Button>
        </div>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-lg">Informasi Dasar & Lokasi</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hari / Tanggal</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori / Tim</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uraian Kegiatan</FormLabel>
                    <FormControl><Textarea placeholder="Jelaskan kegiatan yang dilakukan..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="location.street"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nama Jalan</FormLabel>
                  <FormControl><Input placeholder="Jl. Contoh No. 123" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location.subDistrict"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kecamatan</FormLabel>
                  <Select onValueChange={handleSubDistrictChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kecamatan..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(medanDistricts).map((district) => (
                        <SelectItem key={district} value={district}>{district}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location.village"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelurahan</FormLabel>
                  <Select onValueChange={handleVillageChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kelurahan..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedSubDistrict ? (
                        medanDistricts[selectedSubDistrict].map((village) => (
                          <SelectItem key={village} value={village}>{village}</SelectItem>
                        ))
                      ) : (
                        (Object.values(medanDistricts).flat() as string[]).sort().map((village) => (
                          <SelectItem key={village} value={village}>{village}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader>
            <CardTitle className="text-lg">Volume Pekerjaan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{selectedCategory === "Tim Pohon" ? "Jumlah" : "Volume"}</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Satuan</FormLabel>
                  <FormControl><Input placeholder="Satuan..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500">
          <CardHeader>
            <CardTitle className="text-lg">Foto Dokumentasi</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="photos.zero"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload 
                      label="Foto 0%" 
                      value={field.value} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photos.fifty"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload 
                      label="Foto 50%" 
                      value={field.value} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photos.hundred"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload 
                      label="Foto 100%" 
                      value={field.value} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader>
            <CardTitle className="text-lg">Peralatan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {equipFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`equipment.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Alat</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-24">
                  <FormField
                    control={form.control}
                    name={`equipment.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeEquip(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full mt-2 border-dashed" 
              onClick={() => appendEquip({ type: "", quantity: 1 })}
            >
              <Plus className="h-4 w-4 mr-2" /> Tambah Alat
            </Button>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500">
          <CardHeader>
            <CardTitle className="text-lg">Operasional Alat Berat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {heavyFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`heavyEquipment.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Alat Berat</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-24">
                  <FormField
                    control={form.control}
                    name={`heavyEquipment.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeHeavy(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full mt-2 border-dashed" 
              onClick={() => appendHeavy({ type: "", quantity: 1 })}
            >
              <Plus className="h-4 w-4 mr-2" /> Tambah Alat Berat
            </Button>
          </CardContent>
        </Card>

        {heavyEquipmentList.length > 0 && (
          <Card className="border-t-4 border-t-yellow-500">
            <CardHeader>
              <CardTitle className="text-lg">Bahan Bakar (Liter)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="fuel.pertamax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pertamax</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuel.dexlite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dexlite</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuel.solar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solar</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="fuel.remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keterangan BBM</FormLabel>
                      <FormControl><Input placeholder="Catatan penggunaan BBM..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-t-4 border-t-cyan-500">
          <CardHeader>
            <CardTitle className="text-lg">Jumlah Personil</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="personnel.coordinator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Koordinator</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personnel.members"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anggota</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-gray-500">
          <CardHeader>
            <CardTitle className="text-lg">Keterangan Tambahan</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea placeholder="Catatan tambahan lainnya..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8">
            {isEditing ? "Simpan Perubahan" : "Simpan Laporan"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ReportForm;