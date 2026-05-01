"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  User, Shield, Tag, Trash2, Search, Loader2, AlertCircle, RefreshCw, Clock
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const roles = ['admin', 'user', 'pimpinan', 'admin_harian', 'admin_bbm'];
const categories = ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat", "Tim Siram", "Tim Pohon"];

interface Profile {
  id: string;
  username: string | null;
  role: string;
  category: string | null;
  updated_at: string;
}

const UserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      showError("Gagal memuat daftar pengguna: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (id: string, updates: Partial<Profile>) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
      showSuccess("Profil berhasil diperbarui");
    } catch (error: any) {
      showError("Gagal memperbarui profil: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteProfile = async (id: string, username: string) => {
    if (!confirm(`Hapus profil "${username}"? Pengguna ini tidak akan bisa mengakses fitur khusus role lagi.`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProfiles(profiles.filter(p => p.id !== id));
      showSuccess("Profil dihapus");
    } catch (error: any) {
      showError("Gagal menghapus profil: " + error.message);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    (p.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (p.role?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  if (loading && profiles.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-slate-500 font-medium">Memuat data pengguna...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari username atau role..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchProfiles} 
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 h-9 px-4">
          Total: {profiles.length} Pengguna Terdaftar
        </Badge>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[200px]">Username</TableHead>
                <TableHead className="w-[180px]">Role / Peran</TableHead>
                <TableHead className="w-[220px]">Kategori (Khusus User)</TableHead>
                <TableHead className="w-[180px]">Update Terakhir</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <User size={16} />
                        </div>
                        <span className="truncate max-w-[150px]">{profile.username || "Tanpa Nama"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={profile.role} 
                        onValueChange={(val) => handleUpdateProfile(profile.id, { role: val })}
                        disabled={updatingId === profile.id}
                      >
                        <SelectTrigger className={cn(
                          "h-9 text-[10px] font-bold uppercase",
                          profile.role === 'admin' ? "text-red-600 border-red-200 bg-red-50" :
                          profile.role === 'pimpinan' ? "text-amber-600 border-amber-200 bg-amber-50" :
                          profile.role === 'admin_harian' ? "text-purple-600 border-purple-200 bg-purple-50" :
                          profile.role === 'admin_bbm' ? "text-orange-600 border-orange-200 bg-orange-50" :
                          "text-blue-600 border-blue-200 bg-blue-50"
                        )}>
                          <div className="flex items-center gap-2">
                            <Shield size={12} />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(r => <SelectItem key={r} value={r} className="text-xs uppercase font-bold">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={profile.category || "none"} 
                        onValueChange={(val) => handleUpdateProfile(profile.id, { category: val === "none" ? null : val })}
                        disabled={updatingId === profile.id || profile.role !== 'user'}
                      >
                        <SelectTrigger className={cn(
                          "h-9 text-xs",
                          !profile.category && "text-slate-400 italic"
                        )}>
                          <div className="flex items-center gap-2">
                            <Tag size={12} />
                            <SelectValue placeholder="Pilih Kategori" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa Kategori</SelectItem>
                          {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Clock size={12} />
                        {profile.updated_at ? format(new Date(profile.updated_at), 'dd MMM yyyy, HH:mm', { locale: localeId }) : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteProfile(profile.id, profile.username || "User")}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                    Tidak ada pengguna ditemukan
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 text-amber-800 text-xs">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-bold">Catatan Penting:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Daftar ini menampilkan semua pengguna yang memiliki profil di sistem.</li>
            <li>Perubahan <strong>Role</strong> akan langsung berdampak pada hak akses pengguna tersebut.</li>
            <li>Role <strong>Admin BBM</strong> hanya dapat mengelola Laporan BBM & Oli.</li>
            <li>Menghapus profil di sini hanya menghapus data tambahan (role/kategori), bukan akun login Supabase-nya.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;