import { supabase } from '@/lib/supabase';

export const storageService = {
  async uploadPhoto(base64: string, fileName: string): Promise<string> {
    // Konversi Base64 ke Blob
    const base64Data = base64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const filePath = `${Date.now()}_${fileName}.jpg`;

    const { data, error } = await supabase.storage
      .from('report-photos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error("Error uploading to storage:", error);
      throw error;
    }

    // Ambil Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('report-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  }
};