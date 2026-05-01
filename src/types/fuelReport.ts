"use client";

export type FuelType = "Pertamax" | "Dexlite" | "Oli";

export interface FuelUsageItem {
  vehicle_operator: string;
  fuel_type: FuelType;
  amount: number;
}

export interface FuelReport {
  id: string;
  date: string;
  region: string;
  team: string;
  items: FuelUsageItem[];
  location: {
    street: string;
    subDistrict?: string;
    village?: string;
  };
  remarks: string;
  created_at?: string;
  deleted_at?: string | null;
}