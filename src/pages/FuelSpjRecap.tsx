"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FuelSpj } from '@/types/fuelSpj';
import { fuelSpjService } from '@/services/fuelSpjService';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Calendar as CalendarIcon, PenTool, Fuel, FileText, Table } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils";

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

type RecapRange = "daily" | "weekly" | "monthly" | "yearly";
type SignatureMode = "with-signature" | "without-signature";

const FuelSpjRecap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [data, setData] = useState<FuelSpj[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [range, setRange] = useState<RecapRange>((searchParams.get('range') as RecapRange) || "daily");
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("with-signature");
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [range, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const allSpjs = await fuelSpjService.getAll();
      const targetDate = parseISO(selectedDate);
      
      let filtered = allSpjs;

      if (range === "daily") {
        filtered = allSpjs.filter(s => s.date === selectedDate);
      } else if (range === "weekly") {
        const start = startOfWeek(targetDate, { weekStartsOn: 1 });
        const end = endOfWeek(targetDate, { weekStartsOn: 1 });
        filtered = allSpjs.filter(s => isWithinInterval(parseISO(s.date), { start, end }));
      } else if (range === "monthly") {
        const start = startOfMonth(targetDate);
        const end = endOfMonth(targetDate);
        filtered = allSpjs.filter(s => isWithinInterval(parseISO(s.date), { start, end }));
      } else if (range === "yearly") {
        const start = startOfYear(targetDate);
        const end = endOfYear(targetDate);
        filtered = allSpjs.filter(s => isWithinInterval(parseISO(s.date), { start, end }));
      }

      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setData(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getTitle = () => {
    const dateObj = parseISO(selectedDate);
    if (range === "daily") return `Harian - ${format(dateObj, 'dd MMMM yyyy', { locale: localeId })}`;
    if (range === "weekly") return `Mingguan - ${format(startOfWeek(dateObj, { weekStartsOn: 1 }), 'dd MMM')} s/d ${format(endOfWeek(dateObj, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: localeId })}`;
    if (range === "monthly") return `Bulanan - ${format(dateObj, 'MMMM yyyy', { locale: localeId })}`;
    if (range === "yearly") return `Tahunan - ${format(dateObj, 'yyyy')}`;
    return "";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/')} className="px-2 md:px-4">
              <ArrowLeft className="h-4 w-4 md:mr-2" /> 
              <span className="hidden md:inline">Kembali</span>
            </Button>
            
            <Select value={range} onValueChange={(v) => setRange(v as RecapRange)}>
              <SelectTrigger className="w-[110px] md:w-[150px] h-10 text-xs md:text-sm">
                <SelectValue placeholder="Rentang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <CalendarIcon className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-slate-400" />
              <Input 
                type={range === "yearly" ? "number" : range === "monthly" ? "month" : "date"} 
                value={range === "yearly" ? selectedDate.split('-')[0] : range === "monthly" ? selectedDate.substring(0, 7) : selectedDate} 
                onChange={(e) => {
                  let val = e.target.value;
                  if (range === "yearly") val = `${val}-01-01`;
                  if (range === "monthly") val = `${val}-01`;
                  setSelectedDate(val);
                }} 
                className="pl-7 md:pl-10 w-[130px] md:w-[180px] h-10 text-xs md:text-sm" 
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={signatureMode} onValueChange={(v) => setSignatureMode(v as SignatureMode)}>
              <SelectTrigger className="w-[40px] md:w-[180px] bg-amber-50 border-amber-200 h-10 text-amber-700 font-medium p-0 md:px-3 flex justify-center">
                <div className="flex items-center gap-2">
                  <PenTool size={16} />
                  <span className="hidden md:inline"><SelectValue placeholder="Tanda Tangan" /></span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="with-signature">Ada Tanda Tangan</SelectItem>
                <SelectItem value="without-signature">Tanpa Tanda Tangan</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => window.print()} className="bg-blue-600 px-2 md:px-4 h-10">
              <Printer className="h-4 w-4 md:mr-2" /> 
              <span className="hidden md:inline">Cetak Rekap</span>
            </Button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="print-area bg-white p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-20 w-20 object-contain" alt="Logo Medan" />
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2>
            <p className="text-xs italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <img src={LOGO_DLH_URL} className="h-20 w-20 object-contain" alt="Logo DLH" />
        </div>

        <div className="text-center mb-8">
          <h3 className="text-xl font-bold underline uppercase">REKAPITULASI SURAT PERTANGGUNG JAWABAN (SPJ) BBM</h3>
          <p className="text-lg font-bold uppercase">WILAYAH 4 MEDAN KOTA</p>
          <p className="text-md font-bold">{getTitle()}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[10px] table-fixed">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-1 w-[30px]">No</th>
              <th className="border-2 border-black p-1 w-[70px]">Tanggal</th>
              <th className="border-2 border-black p-1 w-[100px]">NO. SPJ</th>
              <th className="border-2 border-black p-1 w-[120px]">Kendaraan/ Operasional</th>
              <th className="border-2 border-black p-1 w-[180px]">Jenis (P, D, S, Oli)</th>
              <th className="border-2 border-black p-1 w-[150px]">Lokasi Kerja</th>
              <th className="border-2 border-black p-1 w-[80px]">Nama Tim</th>
              <th className="border-2 border-black p-1 w-[80px]">Wilayah</th>
              <th className="border-2 border-black p-1 w-[100px]">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border-2 border-black p-1 text-center">{idx + 1}</td>
                  <td className="border-2 border-black p-1 text-center">{format(parseISO(item.date), 'dd/MM/yyyy')}</td>
                  <td className="border-2 border-black p-1 font-bold">{item.spj_number}</td>
                  <td className="border-2 border-black p-1">{item.vehicle}</td>
                  <td className="border-2 border-black p-1">
                    <div className="grid grid-cols-1 gap-0.5 text-[9px]">
                      {item.usage_pertamax > 0 && <div>• Pertamax: {formatRupiah(item.usage_pertamax)}</div>}
                      {item.usage_dexlite > 0 && <div>• Dexlite: {formatRupiah(item.usage_dexlite)}</div>}
                      {item.usage_solar > 0 && <div>• Solar: {formatRupiah(item.usage_solar)}</div>}
                      {item.usage_oil > 0 && <div>• Oli: {item.usage_oil} L</div>}
                    </div>
                  </td>
                  <td className="border-2 border-black p-1 break-words">{item.location_street}, {item.location_village}</td>
                  <td className="border-2 border-black p-1 text-center">{item.team}</td>
                  <td className="border-2 border-black p-1 text-center">{item.region}</td>
                  <td className="border-2 border-black p-1 italic">{item.remarks || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data SPJ BBM untuk periode ini</td>
              </tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={4} className="border-2 border-black p-1 text-right">TOTAL PEMAKAIAN:</td>
                <td className="border-2 border-black p-1">
                  <div className="text-[9px]">
                    <div>P: {formatRupiah(data.reduce((acc, curr) => acc + (curr.usage_pertamax || 0), 0))}</div>
                    <div>D: {formatRupiah(data.reduce((acc, curr) => acc + (curr.usage_dexlite || 0), 0))}</div>
                    <div>S: {formatRupiah(data.reduce((acc, curr) => acc + (curr.usage_solar || 0), 0))}</div>
                    <div>Oli: {data.reduce((acc, curr) => acc + (curr.usage_oil || 0), 0).toFixed(2)} L</div>
                  </div>
                </td>
                <td colSpan={4} className="border-2 border-black"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {signatureMode === "with-signature" && (
          <div className="pdf-footer mt-12">
            <div className="flex justify-end mb-4 text-[11px]"><p className="w-1/4 text-center">Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
            <div className="grid grid-cols-3 gap-4 text-[11px] leading-normal">
              <div className="text-center flex flex-col justify-between min-h-[150px] pb-4">
                <div><p>Mengetahui :</p><p className="font-bold">Kabid Tata Lingkungan</p></div>
                <div><p className="font-bold underline">Heni Rustati, ST, M.Si</p><p>NIP. 19720223 200604 2 002</p></div>
              </div>
              <div className="text-center flex flex-col justify-between min-h-[150px] pb-4">
                <div><p>Diketahui :</p><p className="font-bold">Ketua Tim Pemeliharaan</p></div>
                <div><p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p><p>NIP. 19811128 201001 2 011</p></div>
              </div>
              <div className="text-center flex flex-col justify-between min-h-[150px] pb-4">
                <div><p>Dibuat Oleh :</p><p className="font-bold">Admin BBM Wilayah 4</p></div>
                <div><p className="font-bold underline">( ............................................ )</p></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { 
            box-shadow: none !important; 
            border: none !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: none !important; 
          }
          @page { size: landscape; margin: 1cm; }
          table { border-color: black !important; }
          th, td { border-color: black !important; }
        }
      `}} />
    </div>
  );
};

export default FuelSpjRecap;