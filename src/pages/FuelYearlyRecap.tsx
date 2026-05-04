"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fuelService } from '@/services/fuelService';
import { FuelReport } from '@/types/fuelReport';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Table, Filter, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const regions = ["Pusat", "Wilayah 1 Utara", "Wilayah 2 Barat", "Wilayah 3 Timur", "Wilayah 4 Kota", "Wilayah 5 Selatan"];

const FuelYearlyRecap = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedRegion, setSelectedRegion] = useState("semua");

  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    region: true,
    team: true,
    vehicle: true,
    pertamax: true,
    dexlite: true,
    oli: true,
    item_remarks: true,
    location: true,
    remarks: true
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllReports();
      const filtered = data.filter(r => {
        const rDate = parseISO(r.date);
        return rDate.getFullYear().toString() === selectedYear;
      });
      filtered.sort((a, b) => a.date.localeCompare(b.date) || a.region.localeCompare(b.region) || a.team.localeCompare(b.team));
      setReports(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    const flat = reports.flatMap(r => r.items.map(item => ({ ...item, date: r.date, region: r.region, team: r.team, remarks: r.remarks, reportId: r.id })));
    if (selectedRegion === "semua") return flat;
    return flat.filter(item => item.region === selectedRegion);
  };

  const flatItems = getFilteredItems();

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const handleExportExcel = async () => {
    if (flatItems.length === 0) { showError("Tidak ada data untuk diekspor"); return; }
    const toastId = showLoading("Menyiapkan file Excel...");
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Tahunan BBM');
      const columns: any[] = [{ header: 'No', key: 'no', width: 5 }];
      if (visibleColumns.date) columns.push({ header: 'Tanggal', key: 'date', width: 15 });
      if (visibleColumns.region) columns.push({ header: 'Wilayah', key: 'region', width: 15 });
      if (visibleColumns.team) columns.push({ header: 'Tim', key: 'team', width: 20 });
      if (visibleColumns.vehicle) columns.push({ header: 'Kendaraan', key: 'vehicle', width: 20 });
      if (visibleColumns.pertamax) columns.push({ header: 'Pertamax', key: 'pertamax', width: 14 });
      if (visibleColumns.dexlite) columns.push({ header: 'Dexlite', key: 'dexlite', width: 14 });
      if (visibleColumns.oli) columns.push({ header: 'Oli', key: 'oli', width: 8 });
      if (visibleColumns.item_remarks) columns.push({ header: 'Ket. Item', key: 'item_remarks', width: 20 });
      if (visibleColumns.location) columns.push({ header: 'Lokasi', key: 'location', width: 35 });
      if (visibleColumns.remarks) columns.push({ header: 'Ket. Umum', key: 'remarks', width: 25 });
      
      worksheet.columns = columns;
      const lastColLetter = String.fromCharCode(64 + columns.length);
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      worksheet.getCell('A1').value = 'PEMERINTAH KOTA MEDAN - DINAS LINGKUNGAN HIDUP';
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      worksheet.mergeCells(`A2:${lastColLetter}2`);
      worksheet.getCell('A2').value = `REKAP TAHUNAN BBM - TAHUN: ${selectedYear}`;
      worksheet.getCell('A2').font = { bold: true, size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      worksheet.addRow([]);
      
      const headerRow = worksheet.addRow(columns.map(c => c.header));
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
      });

      flatItems.forEach((item, idx) => {
        const rowData: any = { no: idx + 1 };
        if (visibleColumns.date) rowData.date = format(parseISO(item.date), 'dd/MM/yy');
        if (visibleColumns.region) rowData.region = item.region;
        if (visibleColumns.team) rowData.team = item.team;
        if (visibleColumns.vehicle) rowData.vehicle = item.vehicle_operator;
        if (visibleColumns.pertamax) rowData.pertamax = item.fuel_type === 'Pertamax' ? item.amount : 0;
        if (visibleColumns.dexlite) rowData.dexlite = item.fuel_type === 'Dexlite' ? item.amount : 0;
        if (visibleColumns.oli) rowData.oli = item.fuel_type === 'Oli' ? item.amount : 0;
        if (visibleColumns.item_remarks) rowData.item_remarks = item.item_remarks || "-";
        if (visibleColumns.location) rowData.location = `${item.location.street}${item.location.subDistrict ? ', ' + item.location.subDistrict : ''}`;
        if (visibleColumns.remarks) rowData.remarks = item.remarks || "-";

        const row = worksheet.addRow(rowData);
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Rekap_Tahunan_BBM_DLH_${selectedYear}.xlsx`);
      dismissToast(toastId);
      showSuccess("Excel berhasil diunduh");
    } catch (error) {
      console.error(error);
      dismissToast(toastId);
      showError("Gagal membuat file Excel");
    }
  };

  const groupedByRegion: Record<string, any[]> = {};
  flatItems.forEach(item => {
    if (!groupedByRegion[item.region]) groupedByRegion[item.region] = [];
    groupedByRegion[item.region].push(item);
  });

  const totalPertamaxAll = flatItems.reduce((acc, item) => acc + (item.fuel_type === 'Pertamax' ? item.amount : 0), 0);
  const totalDexliteAll = flatItems.reduce((acc, item) => acc + (item.fuel_type === 'Dexlite' ? item.amount : 0), 0);
  const totalOliAll = flatItems.reduce((acc, item) => acc + (item.fuel_type === 'Oli' ? item.amount : 0), 0);

  const bbmColCount = (visibleColumns.pertamax ? 1 : 0) + (visibleColumns.dexlite ? 1 : 0) + (visibleColumns.oli ? 1 : 0);
  const leadingCols = 1 + (visibleColumns.date ? 1 : 0) + (visibleColumns.region ? 1 : 0) + (visibleColumns.team ? 1 : 0) + (visibleColumns.vehicle ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-4 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <Button variant="ghost" onClick={() => navigate('/fuel-reports')} className="px-2 md:px-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[120px] md:w-[150px]"><SelectValue placeholder="Tahun" /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200"><Filter className="mr-2 h-4 w-4 text-slate-400" /><SelectValue placeholder="Pilih Wilayah" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Wilayah</SelectItem>
                {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50"><Settings2 className="mr-2 h-4 w-4" /> Pilih Kolom</Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="end">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tampilkan Kolom:</p>
                    {Object.entries({ date: "Tanggal", region: "Wilayah", team: "Tim", vehicle: "Kendaraan", pertamax: "Pertamax", dexlite: "Dexlite", oli: "Oli", item_remarks: "Ket. Item", location: "Lokasi", remarks: "Ket. Umum" }).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2"><Checkbox id={`col-${key}`} checked={visibleColumns[key as keyof typeof visibleColumns]} onCheckedChange={() => toggleColumn(key as keyof typeof visibleColumns)} /><Label htmlFor={`col-${key}`} className="text-sm cursor-pointer">{label}</Label></div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button variant="outline" onClick={handleExportExcel} className="bg-white border-green-600 text-green-600 hover:bg-green-50"><Table className="mr-2 h-4 w-4" /> Rekap Excel</Button>
            <Button onClick={() => window.print()} className="bg-blue-600 w-full md:w-auto"><Printer className="mr-2 h-4 w-4" /> Cetak Rekap</Button>
          </div>
        </div>
      </div>

      <div className="print-area bg-white p-4 md:p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-12 w-12 md:h-20 md:w-20 object-contain" alt="Logo Medan" />
          <div className="text-center"><h1 className="text-sm md:text-xl font-bold uppercase">Pemerintah Kota Medan</h1><h2 className="text-base md:text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2><p className="text-[8px] md:text-xs italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p></div>
          <img src={LOGO_DLH_URL} className="h-12 w-12 md:h-20 md:w-20 object-contain" alt="Logo DLH" />
        </div>
        <div className="text-center mb-8"><h3 className="text-base md:text-xl font-bold underline uppercase text-orange-700">REKAP TAHUNAN PEMAKAIAN BBM & OLI</h3><p className="text-sm md:text-lg font-bold">Tahun: {selectedYear}</p>{selectedRegion !== "semua" && <p className="text-sm font-bold uppercase text-slate-500">{selectedRegion}</p>}</div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse border-2 border-black text-[9px] table-fixed">
            <colgroup>
              <col style={{ width: '35px' }} />
              {visibleColumns.date && <col style={{ width: '60px' }} />}
              {visibleColumns.region && <col style={{ width: '80px' }} />}
              {visibleColumns.team && <col style={{ width: '100px' }} />}
              {visibleColumns.vehicle && <col style={{ width: '130px' }} />}
              {visibleColumns.pertamax && <col style={{ width: '110px' }} />}
              {visibleColumns.dexlite && <col style={{ width: '110px' }} />}
              {visibleColumns.oli && <col style={{ width: '30px' }} />}
              {visibleColumns.item_remarks && <col style={{ width: '100px' }} />}
              {visibleColumns.location && <col style={{ width: '180px' }} />}
              {visibleColumns.remarks && <col style={{ width: '120px' }} />}
            </colgroup>
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>No</th>
                {visibleColumns.date && <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>Tanggal</th>}
                {visibleColumns.region && <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>Wilayah</th>}
                {visibleColumns.team && <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>Tim / Operator</th>}
                {visibleColumns.vehicle && <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>Kendaraan / Alat Operasional</th>}
                {bbmColCount > 0 && <th className="border-2 border-black p-1" colSpan={bbmColCount}>Jenis BBM / Oli</th>}
                {visibleColumns.item_remarks && <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>Ket. Item</th>}
                {visibleColumns.location && <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>Lokasi Kerja</th>}
                {visibleColumns.remarks && <th className="border-2 border-black p-1" rowSpan={bbmColCount > 0 ? 2 : 1}>Ket. Umum</th>}
              </tr>
              {bbmColCount > 0 && (
                <tr className="bg-slate-50">
                  {visibleColumns.pertamax && <th className="border-2 border-black p-1">Pertamax</th>}
                  {visibleColumns.dexlite && <th className="border-2 border-black p-1">Dexlite</th>}
                  {visibleColumns.oli && <th className="border-2 border-black p-1">Oli</th>}
                </tr>
              )}
            </thead>
            <tbody>
              {Object.keys(groupedByRegion).length > 0 ? (
                <>
                  {Object.entries(groupedByRegion).map(([regionName, items], rIdx) => {
                    const subPertamax = items.reduce((acc, it) => acc + (it.fuel_type === 'Pertamax' ? it.amount : 0), 0);
                    const subDexlite = items.reduce((acc, it) => acc + (it.fuel_type === 'Dexlite' ? it.amount : 0), 0);
                    const subOli = items.reduce((acc, it) => acc + (it.fuel_type === 'Oli' ? it.amount : 0), 0);

                    return (
                      <React.Fragment key={regionName}>
                        {items.map((item, idx) => (
                          <tr key={`${regionName}-${idx}`}>
                            <td className="border-2 border-black p-1 text-center">{idx + 1}</td>
                            {visibleColumns.date && <td className="border-2 border-black p-1 text-center leading-tight">{format(parseISO(item.date), 'dd/MM/yy')}</td>}
                            {visibleColumns.region && idx === 0 && (<td className="border-2 border-black p-1 text-center font-bold align-middle" rowSpan={items.length}>{item.region}</td>)}
                            {visibleColumns.team && <td className="border-2 border-black p-1 text-center align-middle">{item.team}</td>}
                            {visibleColumns.vehicle && <td className="border-2 border-black p-1 whitespace-normal break-words font-medium leading-tight">{item.vehicle_operator}</td>}
                            {visibleColumns.pertamax && <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Pertamax' ? item.amount.toLocaleString('id-ID') : "-"}</td>}
                            {visibleColumns.dexlite && <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Dexlite' ? item.amount.toLocaleString('id-ID') : "-"}</td>}
                            {visibleColumns.oli && <td className="border-2 border-black p-1 text-center">{item.fuel_type === 'Oli' ? item.amount : "-"}</td>}
                            {visibleColumns.item_remarks && <td className="border-2 border-black p-1 italic">{item.item_remarks || "-"}</td>}
                            {visibleColumns.location && <td className="border-2 border-black p-1 break-words leading-tight">{item.location.street}{item.location.subDistrict && item.location.subDistrict !== " " ? `, ${item.location.subDistrict}` : ""}</td>}
                            {visibleColumns.remarks && <td className="border-2 border-black p-1 italic align-middle break-words">{item.remarks || "-"}</td>}
                          </tr>
                        ))}
                        {selectedRegion === "semua" && (
                          <tr className="bg-slate-50 font-bold italic">
                            <td className="border-2 border-black p-1 text-right" colSpan={leadingCols}>SUB-TOTAL {regionName.toUpperCase()}:</td>
                            {visibleColumns.pertamax && <td className="border-2 border-black p-1 text-right">{subPertamax.toLocaleString('id-ID')}</td>}
                            {visibleColumns.dexlite && <td className="border-2 border-black p-1 text-right">{subDexlite.toLocaleString('id-ID')}</td>}
                            {visibleColumns.oli && <td className="border-2 border-black p-1 text-center">{subOli}</td>}
                            <td className="border-2 border-black p-1" colSpan={(visibleColumns.item_remarks ? 1 : 0) + (visibleColumns.location ? 1 : 0) + (visibleColumns.remarks ? 1 : 0)}></td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-slate-100 font-black text-sm">
                    <td className="border-2 border-black p-2 text-right" colSpan={leadingCols}>TOTAL KESELURUHAN:</td>
                    {visibleColumns.pertamax && <td className="border-2 border-black p-2 text-right">{totalPertamaxAll.toLocaleString('id-ID')}</td>}
                    {visibleColumns.dexlite && <td className="border-2 border-black p-2 text-right">{totalDexliteAll.toLocaleString('id-ID')}</td>}
                    {visibleColumns.oli && <td className="border-2 border-black p-2 text-center">{totalOliAll}</td>}
                    <td className="border-2 border-black p-2" colSpan={(visibleColumns.item_remarks ? 1 : 0) + (visibleColumns.location ? 1 : 0) + (visibleColumns.remarks ? 1 : 0)}></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan={11} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data untuk periode ini</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12">
          <div className="flex justify-end mb-4 text-[10px]"><p className="w-1/4 text-center">Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
          <div className="grid grid-cols-4 gap-4 text-[10px] leading-normal">
            <div className="text-center flex flex-col justify-between min-h-[180px] pb-4"><div><p>Mengetahui :</p><p className="font-bold">Kabid Tata Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Heni Rustati, ST, M.Si</p><p>NIP. 19720223 200604 2 002</p></div></div>
            <div className="text-center flex flex-col justify-between min-h-[180px] pb-4"><div><p>Diketahui :</p><p className="font-bold">Ketua Tim Pemeliharaan Lingkungan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Anitha Florida Ginting, ST, M. Si</p><p>NIP. 19811128 201001 2 011</p></div></div>
            <div className="text-center flex flex-col justify-between min-h-[180px] pb-4"><div><p>Diketahui :</p><p className="font-bold">Pengawas Taman Penghijauan</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Jhosua Sibarani, S.T</p><p>NIP. 19740907 200903 1 002</p></div></div>
            <div className="text-center flex flex-col justify-between min-h-[180px] pb-4"><div><p>Diketahui :</p><p className="font-bold">Koordinator Laporan BBM</p><p>Dinas Lingkungan Hidup</p><p>Kota Medan</p></div><div><p className="font-bold underline">Ardiansyah Siregar</p><p>NIP. 19860404 201001 1 015</p></div></div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          @page { size: landscape; margin: 1cm; }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100% !important; min-width: 0 !important; }
        }
      `}} />
    </div>
  );
};

export default FuelYearlyRecap;