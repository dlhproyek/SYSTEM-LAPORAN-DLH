"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fuelService } from '@/services/fuelService';
import { FuelReport } from '@/types/fuelReport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Printer, Calendar as CalendarIcon, Table } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
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

const FuelWeeklyRecap = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<FuelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllReports();
      const filtered = data.filter(r => {
        const rDate = parseISO(r.date);
        return isWithinInterval(rDate, { start: weekStart, end: weekEnd });
      });
      filtered.sort((a, b) => a.date.localeCompare(b.date) || a.region.localeCompare(b.region) || a.team.localeCompare(b.team));
      setReports(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTableSpans = () => {
    const noSpans: number[] = [];
    const dateSpans: number[] = [];
    const regionSpans: number[] = [];
    const teamSpans: number[] = [];
    const remarksSpans: number[] = [];
    let currentNo = 0;
    let lastDate = "";
    let currentRegionKey = "";
    let currentTeamKey = "";
    let currentRemarksKey = "";

    const flatItems = reports.flatMap(r => r.items.map(item => ({ 
      ...item, 
      date: r.date, 
      region: r.region, 
      team: r.team, 
      remarks: r.remarks,
      reportId: r.id
    })));

    flatItems.forEach((item, index) => {
      if (item.date !== lastDate) {
        currentNo++;
        lastDate = item.date;
        const sameDateItems = flatItems.filter(it => it.date === item.date);
        noSpans[index] = sameDateItems.length;
        dateSpans[index] = sameDateItems.length;
      } else {
        noSpans[index] = 0;
        dateSpans[index] = 0;
      }

      const regionKey = `${item.date}-${item.region}`;
      if (regionKey !== currentRegionKey) {
        const sameRegionItems = flatItems.filter(it => it.date === item.date && it.region === item.region);
        regionSpans[index] = sameRegionItems.length;
        currentRegionKey = regionKey;
      } else {
        regionSpans[index] = 0;
      }

      const teamKey = `${item.date}-${item.region}-${item.team}`;
      if (teamKey !== currentTeamKey) {
        const sameTeamItems = flatItems.filter(it => it.date === item.date && it.region === item.region && it.team === item.team);
        teamSpans[index] = sameTeamItems.length;
        currentTeamKey = teamKey;
      } else {
        teamSpans[index] = 0;
      }

      const remarksKey = item.reportId;
      if (remarksKey !== currentRemarksKey) {
        const sameReportItems = flatItems.filter(it => it.reportId === item.reportId);
        remarksSpans[index] = sameReportItems.length;
        currentRemarksKey = remarksKey;
      } else {
        remarksSpans[index] = 0;
      }
    });

    return { flatItems, noSpans, dateSpans, regionSpans, teamSpans, remarksSpans };
  };

  const { flatItems, noSpans, dateSpans, regionSpans, teamSpans, remarksSpans } = getTableSpans();

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
      const worksheet = workbook.addWorksheet('Rekap Mingguan BBM');
      const columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Tanggal', key: 'date', width: 15 },
        { header: 'Wilayah', key: 'region', width: 15 },
        { header: 'Tim / Operator', key: 'team', width: 20 },
        { header: 'Kendaraan / Alat Operasional', key: 'vehicle', width: 25 },
        { header: 'Pertamax (Rp)', key: 'pertamax', width: 12 },
        { header: 'Dexlite (Rp)', key: 'dexlite', width: 12 },
        { header: 'Oli (L)', key: 'oli', width: 8 },
        { header: 'Keterangan Item', key: 'item_remarks', width: 20 },
        { header: 'Lokasi Kerja', key: 'location', width: 35 },
        { header: 'Keterangan Tambahan', key: 'remarks', width: 25 },
      ];
      worksheet.columns = columns;
      worksheet.mergeCells('A1:K1');
      worksheet.getCell('A1').value = 'PEMERINTAH KOTA MEDAN - DINAS LINGKUNGAN HIDUP';
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      worksheet.mergeCells('A2:K2');
      worksheet.getCell('A2').value = `REKAP MINGGUAN PEMAKAIAN BBM & OLI - PERIODE: ${format(weekStart, 'dd MMM')} s/d ${format(weekEnd, 'dd MMM yyyy')}`;
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

      let currentNo = 0;
      let lastDate = "";
      flatItems.forEach((item) => {
        if (item.date !== lastDate) { currentNo++; lastDate = item.date; }
        const row = worksheet.addRow({
          no: item.date === lastDate && flatItems.find(it => it.date === item.date) === item ? currentNo : '',
          date: format(parseISO(item.date), 'eee, d MMM yyyy', { locale: localeId }),
          region: item.region,
          team: item.team,
          vehicle: item.vehicle_operator,
          pertamax: item.fuel_type === 'Pertamax' ? item.amount : 0,
          dexlite: item.fuel_type === 'Dexlite' ? item.amount : 0,
          oli: item.fuel_type === 'Oli' ? item.amount : 0,
          item_remarks: item.item_remarks || "-",
          location: `${item.location.street}${item.location.subDistrict ? ', ' + item.location.subDistrict : ''}`,
          remarks: item.remarks || "-"
        });
        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });
      const totalRow = worksheet.addRow({ vehicle: 'TOTAL PEMAKAIAN:', pertamax: totalPertamax, dexlite: totalDexlite, oli: totalOli });
      totalRow.eachCell(cell => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } }; cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } }; });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Rekap_Mingguan_BBM_DLH_${format(weekStart, 'yyyy-MM-dd')}.xlsx`);
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
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <Button variant="ghost" onClick={() => navigate('/fuel-reports')} className="px-2 md:px-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
            <div className="relative flex-1 md:flex-none"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-10 w-full md:w-[200px]" /></div>
            <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-100 w-full md:w-auto text-center">{format(weekStart, 'dd MMM', { locale: localeId })} - {format(weekEnd, 'dd MMM yyyy', { locale: localeId })}</div>
          </div>
          <div className="flex gap-2"><Button variant="outline" onClick={handleExportExcel} className="bg-white border-green-600 text-green-600 hover:bg-green-50"><Table className="mr-2 h-4 w-4" /> Rekap Excel</Button><Button onClick={() => window.print()} className="bg-blue-600 w-full md:w-auto"><Printer className="mr-2 h-4 w-4" /> Cetak Rekap</Button></div>
        </div>
      </div>

      <div className="print-area bg-white p-4 md:p-10 mx-auto shadow-lg border min-h-[210mm] w-full max-w-[297mm]">
        <div className="flex items-center justify-center gap-8 border-b-4 border-double border-black pb-4 mb-6">
          <img src={LOGO_MEDAN_URL} className="h-12 w-12 md:h-20 md:w-20 object-contain" alt="Logo Medan" />
          <div className="text-center"><h1 className="text-sm md:text-xl font-bold uppercase">Pemerintah Kota Medan</h1><h2 className="text-base md:text-2xl font-black uppercase">Dinas Lingkungan Hidup</h2><p className="text-[8px] md:text-xs italic">Jl. Pinang Baris, Lalang Kec. Medan Sunggal, Kota Medan, Sumatera Utara</p></div>
          <img src={LOGO_DLH_URL} className="h-12 w-12 md:h-20 md:w-20 object-contain" alt="Logo DLH" />
        </div>
        <div className="text-center mb-8"><h3 className="text-base md:text-xl font-bold underline uppercase text-orange-700">REKAP MINGGUAN PEMAKAIAN BBM & OLI</h3><p className="text-sm md:text-lg font-bold">Periode: {format(weekStart, 'dd MMMM', { locale: localeId })} s/d {format(weekEnd, 'dd MMMM yyyy', { locale: localeId })}</p></div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse border-2 border-black text-[9px] table-fixed">
            <colgroup>
              <col style={{ width: '30px' }} />
              <col style={{ width: '58px' }} />
              <col style={{ width: '75px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: 'auto' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '25px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '120px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-1" rowSpan={2}>No</th>
                <th className="border-2 border-black p-1" rowSpan={2}>Tanggal</th>
                <th className="border-2 border-black p-1" rowSpan={2}>Wilayah</th>
                <th className="border-2 border-black p-1" rowSpan={2}>Tim / Operator</th>
                <th className="border-2 border-black p-1" rowSpan={2}>Kendaraan / Alat Operasional</th>
                <th className="border-2 border-black p-1" colSpan={3}>Jenis BBM / Oli</th>
                <th className="border-2 border-black p-1" rowSpan={2}>Keterangan Item</th>
                <th className="border-2 border-black p-1" rowSpan={2}>Lokasi Kerja</th>
                <th className="border-2 border-black p-1" rowSpan={2}>Keterangan Tambahan</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-1">Pertamax</th>
                <th className="border-2 border-black p-1">Dexlite</th>
                <th className="border-2 border-black p-1">Oli</th>
              </tr>
            </thead>
            <tbody>
              {flatItems.length > 0 ? (
                <>
                  {(() => {
                    let currentNo = 0;
                    let lastDate = "";
                    return flatItems.map((item, idx) => {
                      if (item.date !== lastDate) { currentNo++; lastDate = item.date; }
                      return (
                        <tr key={idx}>
                          {noSpans[idx] > 0 && (<td className="border-2 border-black p-1 text-center align-top font-bold" rowSpan={noSpans[idx]}>{currentNo}</td>)}
                          {dateSpans[idx] > 0 && (<td className="border-2 border-black p-1 text-center align-middle whitespace-normal break-words leading-tight" rowSpan={dateSpans[idx]}>{format(parseISO(item.date), 'eee, d MMM yyyy', { locale: localeId })}</td>)}
                          {regionSpans[idx] > 0 && (<td className="border-2 border-black p-1 text-center font-bold align-middle whitespace-normal break-words leading-tight" rowSpan={regionSpans[idx]}>{item.region}</td>)}
                          {teamSpans[idx] > 0 && (<td className="border-2 border-black p-1 text-center align-middle whitespace-normal break-words leading-tight" rowSpan={teamSpans[idx]}>{item.team}</td>)}
                          <td className="border-2 border-black p-1 whitespace-normal font-medium">{item.vehicle_operator}</td>
                          <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Pertamax' ? item.amount.toLocaleString('id-ID') : "-"}</td>
                          <td className="border-2 border-black p-1 text-right">{item.fuel_type === 'Dexlite' ? item.amount.toLocaleString('id-ID') : "-"}</td>
                          <td className="border-2 border-black p-1 text-center">{item.fuel_type === 'Oli' ? item.amount : "-"}</td>
                          <td className="border-2 border-black p-1 italic break-words">{item.item_remarks || "-"}</td>
                          <td className="border-2 border-black p-1 break-words">{item.location.street}{item.location.subDistrict && item.location.subDistrict !== " " ? `, ${item.location.subDistrict}` : ""}{item.location.village && item.location.village !== " " ? `, ${item.location.village}` : ""}</td>
                          {remarksSpans[idx] > 0 && (<td className="border-2 border-black p-1 italic align-middle break-words" rowSpan={remarksSpans[idx]}>{item.remarks || "-"}</td>)}
                        </tr>
                      );
                    });
                  })()}
                  <tr className="bg-slate-100 font-black">
                    <td className="border-2 border-black p-1 text-right" colSpan={5}>TOTAL PEMAKAIAN:</td>
                    <td className="border-2 border-black p-1 text-right">{totalPertamax.toLocaleString('id-ID')}</td>
                    <td className="border-2 border-black p-1 text-right">{totalDexlite.toLocaleString('id-ID')}</td>
                    <td className="border-2 border-black p-1 text-center">{totalOli}</td>
                    <td className="border-2 border-black p-1" colSpan={3}></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan={11} className="border-2 border-black p-8 text-center italic text-slate-400">Tidak ada data untuk periode ini</td></tr>
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

export default FuelWeeklyRecap;