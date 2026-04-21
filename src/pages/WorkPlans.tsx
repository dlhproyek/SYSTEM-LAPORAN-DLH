"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Plus, Calendar, MapPin, Eye, 
  Trash2, Edit, ArrowLeft, Search, FilterX, 
  Table as TableIcon, ClipboardList, User
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { workPlanService } from '@/services/workPlanService';
import { WorkPlan } from '@/types/work-plan';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"];

const WorkPlans = () => {
  const navigate = useNavigate();
  const [workPlans, setWorkPlans] = useState<WorkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await workPlanService.getAllWorkPlans();
      setWorkPlans(data);
    } catch (error) {
      showError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Hapus rencana kerja ini?")) {
      try {
        await workPlanService.deleteWorkPlan(id);
        setWorkPlans(workPlans.filter(wp => wp.id !== id));
        showSuccess("Berhasil dihapus");
      } catch (error) {
        showError("Gagal menghapus");
      }
    }
  };

  const resetFilters = () => {
    setSelectedCategory("semua");
    setSelectedDate("");
    setSearchQuery("");
  };

  const filteredPlans = workPlans.filter(plan => {
    const matchCategory = selectedCategory === "semua" || plan.category === selectedCategory;
    const matchDate = !selectedDate || plan.date === selectedDate;
    const matchSearch = !searchQuery || 
      plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.street?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchCategory && matchDate && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')} className="hover:bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" /> Beranda
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <ClipboardList className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Rekap Rencana Kerja</h1>
                <p className="text-xs text-slate-500">Daftar seluruh rencana kegiatan operasional</p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate('/work-plans/create')} className="bg-blue-600 hover:bg-blue-700 shadow-md font-bold">
            <Plus className="mr-2 h-4 w-4" /> Buat Rencana Baru
          </Button>
        </div>

        {/* Filter Bar */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-4 bg-white">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Cari Kegiatan / Lokasi</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Ketik uraian kegiatan atau jalan..." 
                    className="pl-10 bg-slate-50 border-slate-200 h-10 focus:bg-white transition-colors" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Kategori Tim</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Kategori</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-44 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Filter Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input 
                    type="date" 
                    className="pl-10 bg-slate-50 border-slate-200 h-10" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={resetFilters}
                className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                title="Reset Filter"
              >
                <FilterX className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table Section */}
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-slate-500 text-sm font-medium">Memuat data rekap...</p>
              </div>
            ) : filteredPlans.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[60px] text-center font-bold text-slate-700">No</TableHead>
                      <TableHead className="w-[120px] font-bold text-slate-700">Tanggal</TableHead>
                      <TableHead className="w-[140px] font-bold text-slate-700">Kategori</TableHead>
                      <TableHead className="min-w-[200px] font-bold text-slate-700">Uraian Kegiatan</TableHead>
                      <TableHead className="min-w-[200px] font-bold text-slate-700">Lokasi</TableHead>
                      <TableHead className="w-[100px] text-center font-bold text-slate-700">Personil</TableHead>
                      <TableHead className="w-[150px] font-bold text-slate-700">Koordinator</TableHead>
                      <TableHead className="w-[120px] text-right font-bold text-slate-700 pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan, idx) => (
                      <TableRow key={plan.id} className="hover:bg-blue-50/30 transition-colors group">
                        <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">
                              {new Date(plan.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(plan.date).toLocaleDateString('id-ID', { year: 'numeric' })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] whitespace-nowrap">
                            {plan.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 max-w-[250px]">
                          <div className="line-clamp-2 leading-tight">{plan.description}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {plan.locations?.length > 0 ? (
                              plan.locations.map((loc, i) => (
                                <div key={i} className="flex items-start gap-1 text-[11px] text-slate-600 leading-tight">
                                  <MapPin className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />
                                  <span>{loc.street} ({loc.sub_district})</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-start gap-1 text-[11px] text-slate-600 leading-tight">
                                <MapPin className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />
                                <span>{plan.street} ({plan.sub_district})</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-700">{plan.personnel}</span>
                            <span className="text-[9px] text-slate-400 uppercase">Orang</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[11px] text-slate-600">
                            <User className="h-3 w-3 text-blue-500" />
                            <span className="font-medium">{plan.coordinator}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:bg-blue-100" 
                              onClick={() => navigate(`/work-plans/${plan.id}`)}
                              title="Lihat Detail"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-500 hover:bg-slate-100" 
                              onClick={() => navigate(`/work-plans/edit/${plan.id}`)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:bg-red-100" 
                              onClick={(e) => handleDelete(e, plan.id)}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-24 bg-white">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TableIcon className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold">Tidak ada data rekap ditemukan</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                  Coba ubah filter kategori atau tanggal untuk menemukan data yang Anda cari.
                </p>
                <Button variant="link" onClick={resetFilters} className="mt-4 text-blue-600 font-bold">
                  Reset Semua Filter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkPlans;