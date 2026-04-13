export interface Equipment {
  type: string;
  quantity: number;
}

export interface FuelUsage {
  pertamax: number;
  dexlite: number;
  solar: number;
  remarks: string;
}

export interface Personnel {
  coordinator: number;
  members: number;
}

export interface Location {
  street: string;
  village: string;
  subDistrict: string;
}

export interface Photos {
  zero: string;
  fifty: string;
  hundred: string;
}

export interface Report {
  id: string;
  date: string;
  description: string;
  location: Location;
  photos: Photos;
  volume: number;
  unit: string;
  equipment: Equipment[];
  heavyEquipment: Equipment[];
  fuel: FuelUsage;
  personnel: Personnel;
  remarks: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending'; // Status sinkronisasi
}