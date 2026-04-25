"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkPlan } from '@/types/workPlan';
import { workPlanService } from '@/services/workPlanService';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, FileText, PenTool, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { sortByCategory } from '@/utils/report-helpers';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

type SignatureMode = "with-signature" | "without-signature";

const WorkPlanMonthlyRecap = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("with-signature");

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await workPlanService.getAllWorkPlans();
      const filtered = data.filter(p => {
        const pDate = parseISO(p.date);
        return (pDate.getMonth() + 1).toString() === selectedMonth && 
               pDate.getFullYear().toString() === selectedYear;
      });
      
      // Urutkan: Tanggal (asc) lalu Kategori (sesuai urutan prioritas)
      filtered.sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return sortByCategory(a.category, b.category);
      });
      
      setPlans(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const hasRemarks = plans.some(plan => plan.items.some(item => item.remarks && item.remarks.trim() !== ""));
  
  const categoriesInPlans = Array.from(new Set(plans.map(p => p.category)));
  const showSignatory4 = categoriesInPlans.some(c => ["Taman Kota", "Taman Amplas", "Taman Area", "Tim Babat"].includes(c));
  const showSignatory5 = categoriesInPlans.some(c => ["Tim Pohon", "Tim Siram"].includes(c));

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/work-plans')}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={signatureMode} onValueChange={(v) => setSignatureMode(v as SignatureMode)}>
              <SelectTrigger className="w-[180px] bg-amber-50 border-amber-200 h-10 text-amber-700 font-medium">
                <SelectValue placeholder="Tanda Tangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="with-signature"><div className="flex items-center gap-2"><PenTool size={14} /> Ada Tanda Tangan</div></SelectItem>
                <SelectItem value="without-signature"><div className="flex items-center gap-2"><PenTool size={14} className="opacity-40" /> Tanpa Tanda Tangan</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/work-plans/create')} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Plus className="mr-2 h-4 w-4" /> Tambah Rencana Baru
            </Button>
            <Button onClick={() => window.print()} className="bg-blue-600">
              <Printer className="mr-2 h-4 w-4" /> Cetak Rekap
            </Button>
          </div>
        </div>
      </div>

      <div className="print-area bg-white p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
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
          <h3 className="text-xl font-bold underline uppercase">RENCANA KERJA WILAYAH 4 DLH MEDAN KOTA</h3>
          <p className="text-lg font-bold">Bulan: {months[parseInt(selectedMonth)-1]} {selectedYear}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[8px] table-fixed">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-black p-1 w-[25px]">No</th>
              <th className="border-2 border-black p-1 w-[60px]">Hari / Tgl</th>
              <th className="border-2 border-black p-1 w-[50px]">Tim/ Kec</th>
              <th className="border-2 border-black p-1 w-[110px]">Detail Kegiatan</th>
              <th className="border-2 border-black p-1 w-[120px]">Lokasi</th>
              <th className="border-2 border-black p-1 w-[100px]">Alat Operasional</th>
              <th className="border-2 border-black p-1 w-[25px]">Unit</th>
              <th className="border-2 border-black p-1 w-[90px]">Kegunaan</th>
              <th className="border-2 border-black p-1 w-[70px]">Koordinator</th>
              <th className="border-2 border-black p-1 w-[35px]">Pers</th>
              <th className="border-2 border-black p-1 w-[90px]">Dasar Pengerjaan</th>
              {hasRemarks && <th className="border-2 border-black p-1 w-[90px]">Keterangan</th>}
            </tr>
          </thead>
          <tbody>
            {plans.length > 0 ? (
              plans.flatMap((plan, pIdx) => {
                const isGlobalStyle = plan.category === "Tim Pohon" || plan.category === "Tim Siram";
                
                if (isGlobalStyle) {
                  const allItems = plan.items;
                  const totalRows = allItems.length;
                  const allTools = Array.from(new Set(plan.items.flatMap(it => it.tools.map(t => JSON.stringify(t))))).map(s => JSON.parse(s));

                  return allItems.map((item, rowIndex) => (
                    <tr key={`${plan.id}-${rowIndex}`}>
                      {rowIndex === 0 && (
                        <>
                          <td className="border-2 border-black p-1 text-center align-top font-bold" rowSpan={totalRows}>{pIdx + 1}</td>
                          <td className="border-2 border-black p-1 text-center align-top" rowSpan={totalRows}>
                            {format(parseISO(plan.date), 'dd/MM/yy')}
                          </td>
                          <td className="border-2 border-black p-1 text-center font-bold align-top" rowSpan={totalRows}>{plan.category}</td>
                        </>
                      )}
                      
                      <td className="border-2 border-black p-1 align-top break-words">{item.description}</td>
                      <td className="border-2 border-black p-1 align-top break-words">
                        {item.location.street}, {Array.isArray(item.location.village) ? item.location.village.join(", ") : item.location.village}, {item.location.subDistrict}
                      </td>

                      {rowIndex === 0 && (
                        <>
                          <td className="border-2 border-black p-1 align-top break-words" rowSpan={totalRows}>
                            {allTools.map((t, i) => (
                              <div key={i} className={i > 0 ? "mt-1 border-t border-slate-200 pt-1" : ""}>
                                {t.name ? `• ${t.name}` : "-"}
                              </div>
                            ))}
                          </td>
                          <td className="border-2 border-black p-1 text-center align-top" rowSpan={totalRows}>
                            {allTools.map((t, i) => (
                              <div key={i} className={i > 0 ? "mt-1 border-t border-slate-200 pt-1" : ""}>
                                {t.unit || "-"}
                              </div>
                            ))}
                          </td>
                          <td className="border-2 border-black p-1 align-top break-words" rowSpan={totalRows}>
                            {allTools.map((t, i) => (
                              <div key={i} className={i > 0 ? "mt-1 border-t border-slate-200 pt-1" : ""}>
                                {t.usage || "-"}
                              </div>
                            ))}
                          </td>
                          <td className="border-2 border-black p-1 text-center align-top" rowSpan={totalRows}>{plan.items[0].coordinator}</td>
                          <td className="border-2 border-black p-1 text-center align-top" rowSpan={totalRows}>{plan.items[0].personnel.members}</td>
                          <td className="border-2 border-black p-1 align-top break-words" rowSpan={totalRows}>{plan.items[0].basis}</td>
                          {hasRemarks && <td className="border-2 border-black p-1 italic align-top break-words" rowSpan={totalRows}>{plan.items[0].remarks || "-"}</td>}
                        </>
                      )}
                    </tr>
                  ));
                } else {
                  const planTotalRows = plan.items.reduce((acc, item) => acc + Math.max(item.tools.length, 1), 0);
                  return plan.items.flatMap((item, iIdx) => {
                    const toolsToRender = item.tools.length > 0 ? item.tools : [{ name: "", unit: "", usage: "" }];
                    const itemRowCount = toolsToRender.length;
                    
                    return toolsToRender.map((tool, tIdx) => (
                      <tr key={`${plan.id}-${iIdx}-${tIdx}`}>
                        {iIdx === 0 && tIdx === 0 && (
                          <>
                            <td className="border-2 border-black p-1 text-center align-top font-bold" rowSpan={planTotalRows}>{pIdx + 1}</td>
                            <td className="border-2 border-black p-1 text-center align-top" rowSpan={planTotalRows}>
                              {format(parseISO(plan.date), 'dd/MM/yy')}
                            </td>
                            <td className="border-2 border-black p-1 text-center font-bold align-top" rowSpan={planTotalRows}>{plan.category}</td>
                          </>
                        )}
                        {tIdx === 0 && (
                          <>
                            <td className="border-2 border-black p-1 align-top break-words" rowSpan={itemRowCount}>{item.description}</td>
                            <td className="border-2 border-black p-1 align-top break-words">
                              {item.location.street}, {Array.isArray(item.location.village) ? item.location.village.join(", ") : item.location.village}, {item.location.subDistrict}
                            </td>
                          </>
                        )}
                        <td className="border-2 border-black p-1 align-top break-words">{tool.name ? `• ${tool.name}` : "-"}</td>
                        <td className="border-2 border-black p-1 text-center align-top">{tool.unit || "-"}</td>
                        <td className="border-2 border-black p-1 align-top break-words">{tool.usage || "-"}</td>
                        {tIdx === 0 && (
                          <>
                            <td className="border-2 border-black p-1 text-center align-top" rowSpan={itemRowCount}>{item.coordinator}</td>
                            <td className="border-2 border-black p-1 text-center align-top" rowSpan={itemRowCount}>{item.personnel.members}</td>
                            <td className="border-2 border-black p-1 align-top break-words" rowSpan={itemRowCount}>{item.basis}</td>
                            {hasRemarks && <td className="border-2 border-black p-1 italic align-top break-words" rowSpan={itemRowCount}>{item.remarks || "-"}</td>}
                          </>
                        )}
                      </tr>
                    ));
                  });
                }
              })
            ) : (
              <tr><td colSpan={hasRemarks ? 12 : 11} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada rencana kerja untuk periode ini</td></tr>
            )}
          </tbody>
        </table>

        {signatureMode === "with-signature" && (
          <div className="pdf-footer mt-12">
            <div className="flex justify-end mb-4 text-[11px]"><p className="w-1/4 text-center">Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
            <div className="grid grid-cols-4 gap-4 text-[11px] leading-normal">
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Mengetahui :</p><p className="font-bold">Kabid Tata Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Heni Rustati, ST, M.Si</p><p>NIP. 19720223 200604 2 002</p></div></div>
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Diketahui :</p><p className="font-bold">Ketua Tim Pemeliharaan Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p><p>NIP. 19811128 201001 2 011</p></div></div>
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Diketahui :</p><p className="font-bold">Pengawas Taman Penghijauan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Jhosua Sibarani, S.T</p><p>NIP. 19740907 200903 1 002</p></div></div>
              <div className="text-center flex flex-col justify-between min-h-[200px] pb-4"><div><p>Diketahui :</p>{showSignatory4 && !showSignatory5 && (<><p className="font-bold">Kepala Koordinator Taman</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}{showSignatory5 && !showSignatory4 && (<><p className="font-bold">Koordinator Tim Pohon & Siram</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}{showSignatory4 && showSignatory5 && (<><p className="font-bold">Koordinator Taman & Tim Pohon/Siram</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></>)}</div><div>{showSignatory4 && !showSignatory5 && (<><p className="font-bold underline">Tiurmaida Silitonga</p><p>NIP. 19690507 200701 2 042</p></>)}{showSignatory5 && !showSignatory4 && (<div className="flex justify-around gap-2"><div><p className="font-bold underline">Tiurmaida Silitonga</p><p className="text-[9px]">NIP. 19690507 200701 2 042</p></div><div><p className="font-bold underline">Ardiansyah Siregar</p><p className="text-[9px]">NIP. 19860404 201001 1 015</p></div></div>)}{showSignatory4 && showSignatory5 && (<div className="flex justify-around gap-2"><div><p className="font-bold underline">Tiurmaida Silitonga</p><p className="text-[9px]">NIP. 19690507 200701 2 042</p></div><div><p className="font-bold underline">Ardiansyah Siregar</p><p className="text-[9px]">NIP. 19860404 201001 1 015</p></div></div>)}</div></div>
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
        }
      `}} />
    </div>
  );
};

export default WorkPlanMonthlyRecap;