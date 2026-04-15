export interface Equipment {
  type: string;
  quantity: number;
}

export interface FuelUsage {
  pertamax: number;
  dexlite: number;
  solar: number;
  remarks?: string;
}

export interface HeavyEquipment extends Equipment {
  fuel: FuelUsage;
}

export interface Personnel {
  coordinator: string;
  members: number;
}

export interface Location {
  street: string;
  village: string;
  subDistrict: string;
}

export interface Task {
  description: string;
  location: Location;
}

export interface Photos {
  zero: string;
  fifty: string;
  hundred: string;
}

export type ReportCategory = 
  | "Taman Kota" 
  | "Taman Amplas" 
  | "Taman Area" 
  | "Tim Babat" 
  | "Tim Siram" 
  | "Tim Pohon";

export interface Report {
  id: string;
  date: string;
  category: ReportCategory;
  description: string;
  location: Location;
  tasks?: Task[];
  photos: Photos;
  volume: number;
  unit: string;
  equipment: Equipment[];
  heavyEquipment: HeavyEquipment[];
  fuel: FuelUsage; // Tetap ada untuk kompatibilitas/total
  personnel: Personnel;
  remarks: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending';
}