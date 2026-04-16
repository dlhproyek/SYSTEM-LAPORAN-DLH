"use client";

import { useState, useEffect } from 'react';
import { Report } from '@/types/report';
import { showSuccess, showError } from '@/utils/toast';
import { localService } from '@/services/localService';
import { reportService } from '@/services/reportService';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncData = async () => {
    const reports = await localService.getAllReports();
    const pendingReports = reports.filter(r => r.syncStatus === 'pending');

    if (pendingReports.length === 0) return;

    setIsSyncing(true);
    try {
      for (const report of pendingReports) {
        // Kirim ke Supabase
        const { id, createdAt, syncStatus, ...dataToSave } = report;
        await reportService.createReport(dataToSave);
        
        // Tandai sebagai tersinkron di lokal atau hapus jika sudah di cloud
        await localService.deleteReport(report.id);
      }
      
      showSuccess(`${pendingReports.length} laporan offline berhasil diunggah ke cloud!`);
    } catch (error) {
      console.error("Gagal sinkronisasi:", error);
      showError("Gagal mengunggah beberapa laporan offline");
    } finally {
      setIsSyncing(false);
    }
  };

  return { isOnline, isSyncing, syncData };
}