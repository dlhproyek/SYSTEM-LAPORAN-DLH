"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Edit, CheckCircle2, HardHat, FileText, Calendar, Users, FileSpreadsheet, FileDown } from 'lucide-react';
import { Report } from '@/types/report';
import { showSuccess, showError } from '@/utils/toast';
import { getUnitByCategory } from '@/utils/report-helpers';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const found = reports.find((r: Report) => r.id === id);
    if (found) {
      setReport(found);
    } else {
      showError("Laporan tidak ditemukan");
      navigate('/');
    }
  }, [id, navigate]);

  const handleDelete = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus laporan ini?")) {
      const reports = JSON.parse(localStorage.getItem('reports') || '[]');
      const filtered = reports.filter((r: Report) => r.id !== id);
      localStorage.setItem('reports', JSON.stringify(filtered));
      showSuccess("Laporan berhasil dihapus");
      navigate('/');
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element || !report) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Meningkatkan kualitas gambar
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Laporan_${report.category}_${report.date}.pdf`);
      showSuccess("PDF berhasil diunduh!");
    } catch (error) {
      console.error("Gagal ekspor PDF:", error);
      showError("Gagal membuat PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    if (!report) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Laporan', {
      pageSetup: { 
        paperSize: 8 as any, 
        orientation: 'landscape',
        scale: 65,
        horizontalCentered: true,
        margins: { 
          left: 0.3, 
          right: 0.3, 
          top: 1.0, 
          bottom: 1.0,
          header: 0,
          footer: 0
        }
      }
    });

    worksheet.columns = [
      { key: 'no', width: 3.73 },
      { key: 'tgl', width: 11.18 },
      { key: 'uraian', width: 17.82 },
      { key: 'lokasi', width: 27.91 },
      { key: 'foto0', width: 27.82 },
      { key: 'foto50', width: 27.82 },
      { key: 'foto100', width: 27.82 },
      { key: 'vol', width: 10.09 },
      { key: 'alat_jns', width: 13.82 },
      { key: 'alat_jlh', width: 9.91 },
      { key: 'berat_jns', width: 12.36 },
      { key: 'berat_jlh', width: 6 },
      { key: 'bbm_p', width: 12.73 },
      { key: 'bbm_d', width: 9.73 },
      { key: 'bbm_s', width: 12.73 },
      { key: 'pers_k', width: 17.18 },
      { key: 'pers_p', width: 7.73 },
      { key: 'ket', width: 24.64 },
    ];

    const titles = [
      "PEMERINTAH KOTA MEDAN",
      "DINAS LINGKUNGAN HIDUP",
      "Jl. S. Parman No. 16 Medan, Sumatera Utara",
      "LAPORAN KEGIATAN HARIAN",
      report.category.toUpperCase()
    ];

    titles.forEach((text, i) => {
      const row = worksheet.getRow(i + 1);
      row.getCell(1).value = text;
      worksheet.mergeCells(i + 1, 1, i + 1, 18); 
      row.getCell(1).font = { name: 'Times New Roman', size: 12, bold: true };
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const headerRow6 = worksheet.getRow(6);
    const headerRow7 = worksheet.getRow(7);

    worksheet.mergeCells('A6:A7');
    worksheet.mergeCells('B6:B7');
    worksheet.mergeCells('C6:C7');
    worksheet.mergeCells('D6:D7');
    worksheet.mergeCells('E6:G6');
    worksheet.mergeCells('H6:H7');
    worksheet.mergeCells('I6:J6');
    worksheet.mergeCells('K6:L6');
    worksheet.mergeCells('M6:O6');
    worksheet.mergeCells('P6:Q6');
    worksheet.mergeCells('R6:R7');

    headerRow6.getCell(1).value = 'NO';
    headerRow6.getCell(2).value = 'HARI/TANGGAL';
    headerRow6.getCell(3).value = 'URAIAN';
    headerRow6.getCell(4).value = 'LOKASI';
    headerRow6.getCell(5).value = 'FOTO DOKUMENTASI';
    headerRow6.getCell(8).value = 'VOLUME';
    headerRow6.getCell(9).value = 'PERALATAN';
    headerRow6.getCell(11).value = 'OPERASIONAL ALAT BERAT';
    headerRow6.getCell(13).value = 'BAHAN BAKAR YANG DIGUNAKAN';
    headerRow6.getCell(16).value = 'JUMLAH PERSONIL';
    headerRow6.getCell(18).value = 'KETERANGAN';

    headerRow7.getCell(5).value = "0%";
    headerRow7.getCell(6).value = "50%";
    headerRow7.getCell(7).value = "100%";
    headerRow7.getCell(9).value = "JENIS";
    headerRow7.getCell(10).value = "JUMLAH";
    headerRow7.getCell(11).value = "JENIS";
    headerRow7.getCell(12).value = "JLH";
    headerRow7.getCell(13).value = "PERTAMAX";
    headerRow7.getCell(14).value = "DEXLITE";
    headerRow7.getCell(15).value = "SOLAR";
    headerRow7.getCell(16).value = "KOORDINATOR";
    headerRow7.getCell(17).value = "PERSONIL";

    [6, 7].forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      row.eachCell((cell) => {
        cell.font = { name: 'Times New Roman', size: 11, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      });
    });

    const startRow = 8;
    const dataRow = worksheet.getRow(startRow);
    dataRow.height = 133.92;

    dataRow.getCell(1).value = 1;
    dataRow.getCell(2).value = new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const fullDescription = report.tasks?.map(t => t.description).join('\n') || report.description;
    const fullLocation = report.tasks?.map(t => `${t.location.street}, ${t.location.village}`).join('\n') || `${report.location.street}, ${report.location.village}`;
    
    dataRow.getCell(3).value = fullDescription;
    dataRow.getCell(4).value = fullLocation;
    dataRow.getCell(8).value = `${report.volume} ${getUnitByCategory(report.category)}`;
    
    dataRow.getCell(9).value = report.equipment.map(e => e.type).join('\n');
    dataRow.getCell(10).value = report.equipment.map(e => e.quantity).join('\n');
    
    dataRow.getCell(11).value = report.heavyEquipment.map(e => e.type).join('\n');
    dataRow.getCell(12).value = report.heavyEquipment.map(e => e.quantity).join('\n');
    
    dataRow.getCell(13).value = report.fuel.pertamax || 0;
    dataRow.getCell(14).value = report.fuel.dexlite || 0;
    dataRow.getCell(15).value = report.fuel.solar || 0;
    
    dataRow.getCell(16).value = report.personnel.coordinator;
    dataRow.getCell(17).value = report.personnel.members;
    
    dataRow.getCell(18).value = report.remarks;

    dataRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    const addImage = async (base64: string, col: number) => {
      if (!base64) return;
      try {
        const imageId = workbook.addImage({
          base64: base64,
          extension: 'png',
        });
        worksheet.addImage(imageId, {
          tl: { col: col - 1, row: startRow - 1 },
          ext: { width: 199, height: 178 },
          editAs: 'oneCell'
        });
      } catch (e) {
        console.error("Gagal memuat gambar", e);
      }
    };

    await addImage(report.photos.zero, 5);
    await addImage(report.photos.fifty, 6);
    await addImage(report.photos.hundred, 7);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Rekap_Laporan_${report.category}_${report.date}.xlsx`);
    showSuccess("Excel berhasil diunduh!");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!report) return null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white">
      <style>
        {`
          @media print {
            @page {
              size: A3 landscape;
              margin: 1cm 0.3cm 1cm 0.3cm;
            }
            body {
              background: white;
            }
            .no-print {
              display: none !important;
            }
            #report-content {
              width: 100% !important;
              transform: scale(0.65);
              transform-origin: top left;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>

      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 no-print">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportToPDF} disabled={isExporting} className="bg-red-600 hover:bg-red-700 text-white">
              <FileDown className="mr-2 h-4 w-4" /> {isExporting ? "Memproses..." : "Export PDF"}
            </Button>
            <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Rekap Excel
            </Button>
            <Button variant="outline" onClick={() => navigate(`/edit/${report.id}`)} className="bg-blue-50 text-blue-700 border-blue-200">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </Button>
          </div>
        </div>

        <div id="report-content" className="bg-white border shadow-lg overflow-hidden print:border-none print:shadow-none">
          <div className="p-8 border-b-2 border-black flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-slate-200 rounded flex items-center justify-center border-2 border-slate-300">
                <span className="text-[10px] text-slate-400 font-bold text-center">LOGO<br/>PEMKO</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tighter">PEMERINTAH KOTA MEDAN</h1>
                <h2 className="text-3xl font-black tracking-tight">DINAS LINGKUNGAN HIDUP</h2>
                <p className="text-sm font-medium">Jl. S. Parman No. 16 Medan, Sumatera Utara</p>
              </div>
            </div>
            <div className="text-right border-l-2 border-black pl-8">
              <h3 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">LAPORAN KEGIATAN HARIAN</h3>
              <p className="text-lg font-bold mt-2">{report.category.toUpperCase()}</p>
              <p className="text-sm font-medium">ID: {report.id.toUpperCase()}</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Waktu Pelaksanaan</p>
                <div className="flex items-center gap-2 text-lg font-bold">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  {new Date(report.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Koordinator Lapangan</p>
                <div className="flex items-center gap-2 text-lg font-bold">
                  <Users className="h-5 w-5 text-blue-600" />
                  {report.personnel.coordinator}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jumlah Personil</p>
                <div className="flex items-center gap-2 text-lg font-bold">
                  <HardHat className="h-5 w-5 text-blue-600" />
                  {report.personnel.members} Orang
                </div>
              </div>
            </div>

            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 bg-slate-100 p-2 border-l-4 border-blue-600">
                <CheckCircle2 className="h-5 w-5 text-blue-600" /> DAFTAR KEGIATAN DAN LOKASI
              </h3>
              <table className="w-full border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="border-2 border-black p-2 text-center w-12">NO</th>
                    <th className="border-2 border-black p-2 text-left">URAIAN KEGIATAN</th>
                    <th className="border-2 border-black p-2 text-left">LOKASI (JALAN)</th>
                    <th className="border-2 border-black p-2 text-left">KELURAHAN</th>
                    <th className="border-2 border-black p-2 text-left">KECAMATAN</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tasks?.map((task, i) => (
                    <tr key={i}>
                      <td className="border-2 border-black p-2 text-center font-bold">{i + 1}</td>
                      <td className="border-2 border-black p-2 font-medium">{task.description}</td>
                      <td className="border-2 border-black p-2">{task.location.street}</td>
                      <td className="border-2 border-black p-2">{task.location.village}</td>
                      <td className="border-2 border-black p-2">{task.location.subDistrict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="print:break-inside-avoid">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 bg-slate-100 p-2 border-l-4 border-blue-600">
                <FileText className="h-5 w-5 text-blue-600" /> DOKUMENTASI FOTO PEKERJAAN
              </h3>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'KONDISI 0%', img: report.photos.zero },
                  { label: 'KONDISI 50%', img: report.photos.fifty },
                  { label: 'KONDISI 100%', img: report.photos.hundred }
                ].map((p, i) => (
                  <div key={i} className="space-y-3">
                    <div className="aspect-[4/3] bg-slate-50 border-2 border-black overflow-hidden flex items-center justify-center">
                      {p.img ? (
                        <img src={p.img} alt={p.label} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-300 font-bold italic">TIDAK ADA FOTO</span>
                      )}
                    </div>
                    <p className="text-center font-black text-sm border-2 border-black bg-slate-100 py-1">{p.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-8 print:break-inside-avoid">
              <section>
                <h3 className="text-md font-bold mb-3 uppercase border-b-2 border-black pb-1">Peralatan & Alat Berat</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500">PERALATAN KERJA</p>
                    <ul className="text-sm space-y-1">
                      {report.equipment.map((item, i) => (
                        <li key={i} className="flex justify-between border-b border-slate-200 pb-1">
                          <span>{item.type}</span>
                          <span className="font-bold">{item.quantity} Unit</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500">ALAT BERAT</p>
                    <ul className="text-sm space-y-1">
                      {report.heavyEquipment.length > 0 ? report.heavyEquipment.map((item, i) => (
                        <li key={i} className="flex justify-between border-b border-slate-200 pb-1">
                          <span>{item.type}</span>
                          <span className="font-bold">{item.quantity} Unit</span>
                        </li>
                      )) : <li className="text-slate-400 italic">Nihil</li>}
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-md font-bold mb-3 uppercase border-b-2 border-black pb-1">Volume & Operasional BBM</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-blue-50 p-3 border-2 border-blue-200 rounded">
                    <span className="font-bold text-blue-900">VOLUME PEKERJAAN</span>
                    <span className="text-2xl font-black text-blue-700">{report.volume} {getUnitByCategory(report.category)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border-2 border-black p-2 text-center">
                      <p className="text-[10px] font-bold">PERTAMAX</p>
                      <p className="font-black">{formatCurrency(report.fuel.pertamax)}</p>
                    </div>
                    <div className="border-2 border-black p-2 text-center">
                      <p className="text-[10px] font-bold">DEXLITE</p>
                      <p className="font-black">{report.fuel.dexlite} L</p>
                    </div>
                    <div className="border-2 border-black p-2 text-center">
                      <p className="text-[10px] font-bold">SOLAR</p>
                      <p className="font-black">{report.fuel.solar} L</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="pt-12 grid grid-cols-3 gap-8 print:break-inside-avoid">
              <div className="text-center space-y-20">
                <p className="font-bold">Mengetahui,<br/>Kepala Bidang</p>
                <div className="space-y-1">
                  <p className="font-bold underline decoration-1 underline-offset-2">( ............................................ )</p>
                  <p className="text-xs">NIP. ............................................</p>
                </div>
              </div>
              <div className="text-center space-y-20">
                <p className="font-bold">Diperiksa Oleh,<br/>Pengawas Lapangan</p>
                <div className="space-y-1">
                  <p className="font-bold underline decoration-1 underline-offset-2">( ............................................ )</p>
                  <p className="text-xs">NIP. ............................................</p>
                </div>
              </div>
              <div className="text-center space-y-20">
                <p className="font-bold">Medan, {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Koordinator Lapangan</p>
                <div className="space-y-1">
                  <p className="font-bold underline decoration-1 underline-offset-2">{report.personnel.coordinator}</p>
                  <p className="text-xs">ID Personil: {report.id.slice(0, 6)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 p-2 text-center text-[8px] text-white uppercase tracking-[0.5em] no-print">
            Sistem Informasi Laporan Harian Dinas Lingkungan Hidup Kota Medan
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;