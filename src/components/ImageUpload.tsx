"use client";

import React, { useCallback, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/utils/image-processor';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  label: string;
}

const ImageUpload = ({ value, onChange, label }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const originalBase64 = e.target?.result as string;
      // Proses Resize & Compress: Width 2.26", Height 2.95", JPG, Quality 70%
      const processedBase64 = await compressImage(originalBase64, 2.26, 2.95, 0.7);
      onChange(processedBase64);
      setIsProcessing(false);
    };
    
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [onChange]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) handleFile(file);
    }
  }, [onChange]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onPaste={onPaste}
        className={cn(
          "relative group aspect-[2.26/2.95] rounded-xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50",
          value ? "border-none" : ""
        )}
        onClick={() => !value && !isProcessing && document.getElementById(`file-${label}`)?.click()}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            <p className="text-[10px] font-medium text-slate-500">Memproses...</p>
          </div>
        ) : value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
              <Upload size={20} className="text-slate-500 group-hover:text-blue-600" />
            </div>
            <p className="text-xs font-medium text-slate-600">Klik atau Paste</p>
            <p className="text-[10px] text-slate-400 mt-1">Ukuran: 2.26" x 2.95"</p>
          </div>
        )}
        <input
          id={`file-${label}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
};

export default ImageUpload;