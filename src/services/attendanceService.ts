import { supabase } from '@/lib/supabase';
import { AttendanceRecord } from '@/types/attendance';

export const attendanceService = {
  async getAttendanceByDate(date: string, category: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date)
      .eq('category', category)
      .order('personnel_name', { ascending: true });
    
    if (error) throw error;
    return data as AttendanceRecord[];
  },

  async saveAttendance(records: Omit<AttendanceRecord, 'id' | 'created_at'>[]) {
    // Hapus data lama di tanggal & kategori yang sama untuk menghindari duplikasi saat update
    if (records.length > 0) {
      await supabase
        .from('attendance')
        .delete()
        .eq('date', records[0].date)
        .eq('category', records[0].category);
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert(records)
      .select();
    
    if (error) throw error;
    return data;
  },

  async deleteRecord(id: string) {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};