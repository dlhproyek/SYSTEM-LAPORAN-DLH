import localforage from 'localforage';
import { Report } from '@/types/report';

// Konfigurasi IndexedDB
localforage.config({
  name: 'DLH_Report_App',
  storeName: 'reports_offline'
});

export const localService = {
  // Menyimpan atau memperbarui laporan di lokal
  async saveReport(report: Report) {
    const reports = await this.getAllReports();
    const index = reports.findIndex(r => r.id === report.id);
    
    if (index > -1) {
      reports[index] = report;
    } else {
      reports.push(report);
    }
    
    return await localforage.setItem('reports', reports);
  },

  // Mengambil semua laporan lokal
  async getAllReports(): Promise<Report[]> {
    const reports = await localforage.getItem<Report[]>('reports');
    return reports || [];
  },

  // Menghapus laporan dari lokal
  async deleteReport(id: string) {
    const reports = await this.getAllReports();
    const filtered = reports.filter(r => r.id !== id);
    return await localforage.setItem('reports', filtered);
  },

  // Membersihkan semua data lokal
  async clearAll() {
    return await localforage.clear();
  }
};