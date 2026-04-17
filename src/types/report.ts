export interface Report {
  id: string;
  date: string;
  category: string;
  description: string;
  location: {
    street: string;
    village: string;
    subDistrict: string;
  };
  volume: number;
  unit?: string;
  personnel: {
    coordinator: string;
    members: number;
  };
  fuel?: {
    pertamax: number;
    dexlite: number;
    solar: number;
  };
  tasks?: Array<{
    description: string;
    location: {
      street: string;
    };
  }>;
  remarks?: string;
  createdAt?: string;
}