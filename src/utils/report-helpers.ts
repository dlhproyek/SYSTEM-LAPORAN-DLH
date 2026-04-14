import { ReportCategory } from "@/types/report";

export const getUnitByCategory = (category: ReportCategory | string): string => {
  if (category === "Tim Pohon") return "Pohon";
  return "m2";
};