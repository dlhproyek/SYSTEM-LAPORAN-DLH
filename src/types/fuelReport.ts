"use client";

export type FuelType = "Pertamax" | "Dexlite" | "Oli";

export interface FuelUsageItem {
  vehicle_operator: string;
  fuel_type: FuelType;
  amount: number;
  item_remarks?: string; // Keterangan khusus per item
  location: {
    street: string;
    subDistrict?: string;
    village?: string;
  };
}

export interface FuelReport {
  id: string;
  date: string;
  region: string;
  team: string;
  items: FuelUsageItem[];
  remarks: string; // Keterangan umum laporan
  created_at?: string;
  deleted_at?: string | null;
}