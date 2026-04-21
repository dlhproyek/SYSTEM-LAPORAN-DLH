"use client";

export interface WorkPlanEquipment {
  name: string;
  quantity: number;
  purpose?: string;
  vehicle?: string;
}

export interface WorkPlanLocation {
  description: string;
  street: string;
  sub_district: string;
  villages: string[];
  equipment: WorkPlanEquipment[];
  coordinator: string;
  personnel: number;
  basis: string; // Dasar pengerjaan sekarang per lokasi
}

export interface WorkPlan {
  id: string;
  date: string;
  category: string;
  description: string;
  locations: WorkPlanLocation[];
  coordinator: string;
  personnel: number;
  basis: string; // Tetap ada untuk kompatibilitas data lama
  remarks: string;
  created_at?: string;
  user_id?: string;
  // Legacy fields
  street?: string;
  sub_district?: string;
  villages?: string[];
  equipment?: WorkPlanEquipment[];
}