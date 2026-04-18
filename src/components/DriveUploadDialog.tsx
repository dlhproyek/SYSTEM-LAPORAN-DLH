"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder, User, FileText, Loader2, CloudUpload } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from "@/lib/utils";

const CLIENT_ID = "323264526689-91gea696tm6ftv49jt4lb4tqjo5a1947.apps.googleusercontent.com"; 
const API_KEY = "AIzaSyDzRtvJVVWSYJ1e9VGKBhA1CxRYtlda1PY";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

interface DriveUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (config: { fileName: string; folderId: string; accessToken: string }) => Promise<void>;
  defaultFileName: string;
}

const DriveUploadDialog = ({ isOpen, onClose, onUpload, defaultFileName }: DriveUploadDialogProps) => {
  const [fileName, setFileName] = useState(defaultFileName);
  const [folderName, setFolderName] = useState("Drive Saya (Root)");
  const [folderId, setFolderId] = useState("root");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load Google Identity Services (GIS)
    if (!document.getElementById('google-gis')) {
      const script = document.createElement("script");
      script.id = 'google-gis';
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Load Google API Client (GAPI) for Picker
    if (!document.getElementById('google-gapi')) {
      const gapiScript = document.createElement("script");
      gapiScript.id = 'google-gapi';
      gapiScript.src = "https://apis.google.com/js/api.js";
      gapiScript.onload = () => {
        (window as any).gapi.load('picker', {
          callback: () => setIsPickerApiLoaded(true)
        });
      };
      document.body.appendChild(gapiScript);
    } else if ((window as any).gapi) {
      (window as any).gapi.load('picker', {
        callback: () => setIsPickerApiLoaded(true)
      });
    }
  }, [isOpen]);

  const handleAuth = () => {
    try {
      const origin = window.location.protocol + '//' + window.location.host;
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        ux_mode: 'popup',
        origin: origin,
        callback: async (response: any) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            try {
              const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${response.access_token}`);
              const data = await res.json();
              setUserEmail(data.email || "Akun Terhubung");
            } catch (e) {
              setUserEmail("Akun Terhubung");
            }
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      console.error("Auth error:", err);
      showError("Gagal memulai autentikasi Google");
    }
  };

  const openPicker = () => {
    if (!accessToken) {
      showError("Silakan pilih akun terlebih dahulu");
      return;
    }

    const google = (window as any).google;
    if (!isPickerApiLoaded || !google || !google.picker) {
      showError("Modul pemilih folder belum siap. Silakan tunggu sebentar...");
      return;
    }

    try {
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setIncludeFolders(true);

      const origin = window.location.protocol + '//' + window.location.host;

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setOrigin(origin)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            setFolderName(doc.name);
            setFolderId(doc.id);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err: any) {
      console.error("Picker error:", err);
      showError(`Gagal membuka pemilih: ${err.message}`);
    }
  };

  const handleFinalUpload = async () => {
    if (!accessToken) {
      showError("Akun belum terhubung");
      return;
    }
    setIsUploading(true);
    try {
      await onUpload({ fileName, folderId, accessToken });
      showSuccess("Berhasil diunggah ke Google Drive");
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      showError("Gagal mengunggah ke Drive");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isUploading && onClose()}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="text-blue-600" /> Simpan ke Drive
          </DialogTitle>
          <DialogDescription>
            Atur lokasi dan nama file untuk laporan PDF Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="filename" className="flex items-center gap-2">
              <FileText size={14} /> Nama File
            </Label>
            <Input
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Masukkan nama file..."
              disabled={isUploading}
            />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <User size={14} /> Akun Google
            </Label>
            <Button 
              variant="outline" 
              onClick={handleAuth}
              disabled={isUploading}
              className={cn(
                "justify-start font-normal h-10 border-slate-200",
                userEmail && "text-blue-600 border-blue-200 bg-blue-50"
              )}
            >
              {userEmail ? (
                <span className="font-bold truncate">{userEmail}</span>
              ) : (
                <span className="text-slate-500">Klik untuk pilih akun...</span>
              )}
            </Button>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Folder size={14} /> Lokasi Penyimpanan
            </Label>
            <Button 
              variant="outline" 
              onClick={openPicker}
              disabled={!accessToken || isUploading}
              className={cn(
                "justify-start font-normal h-10 border-slate-200",
                folderId !== "root" && "text-green-600 border-green-200 bg-green-50"
              )}
            >
              <span className="truncate font-medium">{folderName}</span>
              {!isPickerApiLoaded && accessToken && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
            </Button>
            {!accessToken && <p className="text-[10px] text-amber-600 italic">* Pilih akun dulu untuk memilih folder</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>Batal</Button>
          <Button 
            onClick={handleFinalUpload} 
            disabled={isUploading || !accessToken}
            className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
          >
            {isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriveUploadDialog;