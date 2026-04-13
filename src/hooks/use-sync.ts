"use client";

import { useState, useEffect } from 'react';
import { Report } from '@/types/report';
import { showSuccess, showError } from '@/utils/toast';

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
    const reports: Report[] = JSON.parse(localStorage.getItem('reports') || '[]');
    const pendingReports = reports.filter(r => r.syncStatus === 'pending');

    if (pendingReports.length === 0) return;

    setIsSyncing(true);
    try {
      // Logika pengiriman ke Cloud (Supabase) akan diletakkan di sini
      console.log("Mensinkronisasi data ke cloud...", pendingReports);
      
      // Simulasi berhasil sinkron (nanti diganti dengan real API call)
      const updatedReports = reports.map(r => ({
        ...r,
        syncStatus: 'synced' as const
      }));
      
      localStorage.setItem('reports', JSON.stringify(updatedReports));
      showSuccess(`${pendingReports.length} laporan berhasil disinkronkan ke cloud!`);
    } catch (error) {
      console.error("Gagal sinkronisasi:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isOnline, isSyncing, syncData };
}