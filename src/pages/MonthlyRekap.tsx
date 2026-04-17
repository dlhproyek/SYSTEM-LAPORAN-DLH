"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/reportService';
import { Report } from '../types/report';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, FileBarChart, Calendar } from 'lucide-react';
import { getUnitByCategory } from '../utils/report-helpers';

const MonthlyRekap = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoryFilter = profile?.role === 'admin' ? null : profile?.category;
        const data = await reportService.getAllReports(categoryFilter);
        setReports(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (profile) loadData();
  }, [profile]);

  // Group by Month
  const groupedData = reports.reduce((acc: any, report) => {
    const date = new Date(report.date);
    const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = { count: 0, volume: 0, reports: [] };
    acc[monthYear].count += 1;
    acc[monthYear].volume += report.volume;
    acc[monthYear].reports.push(report);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-purple-600 p-3 rounded-xl">
            <FileBarChart className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rekap Bulanan</h1>
            <p className="text-slate-500 text-sm">Ringkasan laporan berdasarkan bulan</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">Memuat data...</div>
        ) : Object.keys(groupedData).length === 0 ? (
          <Card><CardContent className="p-10 text-center text-slate-500">Belum ada data laporan.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedData).map(([month, data]: [string, any]) => (
              <Card key={month} className="overflow-hidden border-l-4 border-l-purple-500">
                <CardHeader className="bg-white pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    {month}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-purple-600">Total Laporan</p>
                    <p className="text-2xl font-bold text-purple-900">{data.count}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-blue-600">Total Volume</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {data.volume} <span className="text-sm font-medium">{getUnitByCategory(profile?.category || '')}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyRekap;