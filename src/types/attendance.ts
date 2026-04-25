"use client";

export type AttendanceStatus = "Hadir" | "Sakit" | "Izin" | "Alpa";

export interface AttendanceRecord {
  id: string;
  date: string;
  category: string;
  personnel_name: string;
  position: string;
  status: AttendanceStatus;
  remarks?: string;
  created_at: string;
}