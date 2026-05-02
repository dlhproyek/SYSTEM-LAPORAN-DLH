"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fuelService } from '@/services/fuelService';
import { FuelReport } from '@/types/fuelReport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Printer, Calendar as CalendarIcon, Table } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const getLogoUrl = (fileName: string) => {
  const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_MEDAN_URL = getLogoUrl('logo-medan.jpg');
const LOGO_DLH_URL = getLogoUrl('logo-dlh.jpg');

const FuelDailyRecap = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllReports();
      const filtered = data.filter(r => r.date === selectedDate);
      filtered.sort((a, b) => {
        const regionCompare = a.region.localeCompare(b.region);
        if (regionCompare !== 0) return regionCompare;
        return a.team.localeCompare(b.team);
      });
      setReports(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTableSpans = () => {
    const regionSpans: number[] = [];
    const teamSpans: number[] = [];
    let currentRegion = "";
    let currentTeamKey = "";
    let regionCount = 0;
    let regionStartIndex = 0;
    let teamCount = 0;
    let teamStartIndex = 0;

    const flatItems = reports.flatMap(r => r.items.map(item => ({ 
      ...item, 
      region: r.region, 
      team: r.team, 
      remarks: r.remarks 
    })));

    flatItems.forEach((item, index) => {
      if (item.region !== currentRegion) {
        if (regionCount > 0) regionSpans[regionStartIndex] = regionCount;
        currentRegion = item.region;
        regionCount = 1;
        regionStartIndex = index;
      } else {
        regionCount++;
        regionSpans[index] = 0;
      }
      const teamKey = `${item.region}-${item.team}`;
      if (teamKey !== currentTeamKey) {
        if (teamCount > 0) teamSpans[teamStartIndex] = teamCount;
        currentTeamKey = teamKey;
        teamCount = 1;
        teamStartIndex = index;
      } else {
        teamCount++;
        teamSpans[index] = 0;
      }
    });
    if (regionCount > 0) regionSpans[regionStartIndex] = regionCount;
    if (teamCount > 0) teamSpans[teamStartIndex] = teamCount;
    return { flatItems, regionSpans, teamSpans };
  };

  const { flatItems, regionSpans, teamSpans } = getTableSpans();

  // Hitung Total
  const totalPertamax = flatItems.reduce((acc, item) => acc + (item.fuel_type === 'Pertamax' ? item.amount : 0), 0);
  const totalDexlite = flatItems.reduce((acc, item) => acc + (item.fuel_type === 'Dexlite' ? item.amount : 0), 0);
  const totalOli = flatItems.reduce((acc, item) => acc + (item.fuel_type === 'Oli' ? item.amount : 0), 0);

  const handleExportExcel = async () => {
    if (flatItems.length === 0) {
      showError("Tidak ada data untuk diekspor");
      return;
    }
    const toastId = showLoading("Menyiapkan file Excel...");
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Harian BBM');

      const columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Wilayah', key: 'region', width: 15 },
        { header: 'Tim / Operator', key: 'team', width: 20 },
        { header: 'Kendaraan / Alat Operasional', key: 'vehicle', width: 30 },
        { header: 'Pertamax (Rp)', key: 'pertamax', width: 15 },
        { header: 'Dexlite (Rp)', key: 'dexlite', width: 15 },
        { header: 'Oli (L)', key: 'oli', width: 10 },
        { header: 'Lokasi Kerja', key: 'location', width: 40 },
        { header: 'Keterangan', key: 'remarks', width: 30 },
      ];

      worksheet.columns = columns;

      // Header Instansi
      worksheet.mergeCells('A1:I1');
      worksheet.getCell('A1').value = 'PEMERINTAH KOTA MEDAN - DINAS LINGKUNGAN HIDUP';
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:I2');
      worksheet.getCell('A2').value = `REKAP HARIAN PEMAKAIAN BBM & OLI - TANGGAL: ${selectedDate}`;
      worksheet.getCell('A2').font = { bold: true, size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      worksheet.addRow([]); // Baris kosong

      // Header Tabel
      const headerRow = worksheet.addRow(columns.map(c => c.header));
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
      });

      // Data
      flatItems.forEach((item, idx) => {
        const row = worksheet.addRow({
          no: idx + 1,
          region: item.region,
          team: item.team,
          vehicle: item.vehicle_operator,
          pertamax: item.fuel_type === 'Pertamax' ? item.amount : 0,
          dexlite: item.fuel_type === 'Dexlite' ? item.amount : 0,
          oli: item.fuel_type === 'Oli' ? item.amount : 0,
          location: `${item.location.street}${item.location.subDistrict ? ', ' + item.location.subDistrict : ''}`,
          remarks: item.item_remarks || item.remarks || "-"
        });

        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });

      // Baris Total Excel
      const totalRow = worksheet.addRow({
        vehicle: 'TOTAL PEMAKAIAN:',
        pertamax: totalPertamax,
        dexlite: totalDexlite,
        oli: totalOli
      });
      totalRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Rekap_Harian_BBM_DLH_${selectedDate}.xlsx`);
      dismissToast(toastId);
      showSuccess("Excel berhasil diunduh");
    } catch (error) {
      console.error(error);
      dismissToast(toastId);
      showError("Gagal membuat file Excel");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-0 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-4 no-print mb-8 p-4 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/fuel-reports')} className="px-2 md:px-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <div className="relative flex-1 md:flex-none">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-10 w-full md:w-[200px]" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel} className="bg-white border-green-600 text-green-600 hover:bg-green-50">
              <Table className="mr-2 h-4 w-4" /> Rekap Excel
            </Button>
            <Button onClick={() => window.print()} className="bg-blue-600">
              <Printer className="mr-2 h-4 w-4" /> Cetak Rekap
            </Button>
          </div>
        </div>
      </div>

      <div className="print-area bg-white p-4 md:p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-12 w-12 md:h-20 md:w-20 object-contain" alt="Logo Medan" />
          <div className="text-center">
            <h1 className="text-sm md:text-xl font-bold uppercase">Pemerintah Kota Medan</h1>
            <h2 className="text-base md:text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2>
            <p className="text-[8px] md:text-xs italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p>
          </div>
          <img src={LOGO_DLH_URL} className="h-12 w-12 md:h-20 md:w-20 object-contain" alt="Logo DLH" />
        </div>
        <div className="text-center mb-8">
          <h3 className="text-base md:text-xl font-bold underline uppercase text-orange-700">REKAP HARIAN PEMAKAIAN BBM & OLI</h3>
          <p className="text-sm md:text-lg font-bold">Tanggal: {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeId })}</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse border-2 border-black text-[10px] table-fixed">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-1 w-[35px]" rowSpan={2}>No</th>
                <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Wilayah</th>
                <th className="border-2 border-black p-1 w-[100px]" rowSpan={2}>Tim / Operator</th>
                <th className="border-2 border-black p-1 w-auto" rowSpan={2}>Kendaraan / Alat Operasional</th>
                <th className="border-2 border-black p-1" colSpan={3}>Jenis BBM / Oli</th>
                <th className="border-2 border-black p-1 w-[200px]" rowSpan={2}>Lokasi Kerja</th>
                <th className="border-2 border-black p-1 w-[120px]" rowSpan={2}>Keterangan</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-1 w-[75px]">Pertamax</th>
                <th className="border-2 border-black p-1 w-[75px]">Dexlite</th>
                <th className="border-2 border-black p-1 w-[40px]">Oli</th>
              </tr>
            </thead>
            <tbody>
              {flatItems.length > 0 ? (
                <>
                  {flatItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border-2 border-black p-1 text-center">{idx + 1}</td>
                      {regionSpans[idx] > 0 && (<td className="border-2 border-black p-1 text-center font-bold align-middle" rowSpan={regionSpans[idx]}>{item.region}</td>)}
                      {teamSpans[idx] > 0 && (<td className="border-2 border-black p-1 text-center align-middle" rowSpan={teamSpans[idx]}>{item.team}</td>)}
                      <td className="border-2 border-black p-1 whitespace-normal font-medium">{item.vehicle_operator}</td>
                      <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Pertamax' ? item.amount.toLocaleString('id-ID') : "-"}</td>
                      <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Dexlite' ? item.amount.toLocaleString('id-ID') : "-"}</td>
                      <td className="border-2 border-black p-1 text-center">{item.fuel_type === 'Oli' ? item.amount : "-"}</td>
                      <td className="border-2 border-black p-1 break-words">{item.location.street}{item.location.subDistrict && item.location.subDistrict !== " " ? `, ${item.location.subDistrict}` : ""}{item.location.village && item.location.village !== " " ? `, ${item.location.village}` : ""}</td>
                      <td className="border-2 border-black p-1 italic">{item.item_remarks || item.remarks || "-"}</td>
                    </tr>
                  ))}
                  {/* Baris Total */}
                  <tr className="bg-slate-100 font-black">
                    <td className="border-2 border-black p-1 text-right" colSpan={4}>TOTAL PEMAKAIAN:</td>
                    <td className="border-2 border-black p-1 text-right">{totalPertamax.toLocaleString('id-ID')}</td>
                    <td className="border-2 border-black p-1 text-right">{totalDexlite.toLocaleString('id-ID')}</td>
                    <td className="border-2 border-black p-1 text-center">{totalOli}</td>
                    <td className="border-2 border-black p-1" colSpan={2}></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan={9} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data untuk tanggal ini</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-64">
            <p className="text-xs md:text-sm">Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold mt-1 text-xs md:text-sm">Administrator Sistem</p>
            <div className="h-16 md:h-20"></div>
            <p className="font-bold underline text-xs md:text-sm">( ............................................ )</p>
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

export default FuelDailyRecap;