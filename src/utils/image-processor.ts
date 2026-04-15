/**
 * Mengompres dan meresize gambar sebelum diunggah
 * Max Width: 800px
 * Format: JPG
 * Quality: 0.7 (70%)
 */
export const compressImage = (base64: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Hitung dimensi baru jika lebar melebihi batas
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      // Gambar ulang ke canvas dengan dimensi baru
      ctx.drawImage(img, 0, 0, width, height);

      // Ekspor sebagai JPG dengan kualitas yang ditentukan
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => {
      resolve(base64);
    };
  });
};