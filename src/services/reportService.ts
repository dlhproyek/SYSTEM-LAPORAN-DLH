import { supabase } from '@/lib/supabase';
import { Report } from '@/types/report';

export const reportService = {
  async getAllReports(categoryFilter?: string | null) {
    let query = supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });
    
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as Report[];
  },

  async getReportById(id: string) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Report;
  },

  async createReport(report: Omit<Report, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('reports')
      .insert([report])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateReport(id: string, report: Partial<Report>) {
    const { data, error } = await supabase
      .from('reports')
      .update(report)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteReport(id: string) {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};