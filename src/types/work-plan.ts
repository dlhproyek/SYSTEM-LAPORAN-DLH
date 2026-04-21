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
}

export interface WorkPlan {
  id: string;
  date: string;
  category: string;
  description: string;
  locations: WorkPlanLocation[];
  coordinator: string; // Global untuk seluruh rencana kerja
  personnel: number;   // Global untuk seluruh rencana kerja
  basis: string;
  remarks: string;
  created_at?: string;
  user_id?: string;
  // Legacy fields
  street?: string;
  sub_district?: string;
  villages?: string[];
  equipment?: WorkPlanEquipment[];
}