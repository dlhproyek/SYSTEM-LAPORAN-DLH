"use client";

import { Location } from "./report";

export interface WorkPlanTool {
  name: string;
  unit: number;
  usage: string;
}

export interface WorkPlanItem {
  description: string;
  location: Location;
  tools: WorkPlanTool[];
  coordinator: string;
  personnel: {
    members: number;
  };
  basis: string;
  remarks: string;
}

export interface WorkPlan {
  id: string;
  date: string;
  category: string;
  items: WorkPlanItem[];
  created_at: string;
}