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
import { Folder, User, FileText, Loader2, CloudUpload, FolderPlus, Check, X, Search, Copy, ExternalLink } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from "@/lib/utils";

const CLIENT_ID = "323264526689-91gea696tm6ftv49jt4lb4tqjo5a1947.apps.googleusercontent.com"; 
const API_KEY = "AIzaSyDzRtvJVVWSYJ1e9VGKBhA1CxRYtlda1PY";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";

interface DriveUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (config: { fileName: string; folderId: string; accessToken: string }) => Promise<any>;
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
  
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // State untuk hasil upload
  const [uploadResult, setUploadResult] = useState<{ link: string; name: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state saat dialog ditutup
      setUploadResult(null);
      return;
    }

    if (!document.getElementById('google-gis')) {
      const script = document.createElement("script");
      script.id = 'google-gis';
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const loadGapi = () => {
      const gapi = (window as any).gapi;
      if (gapi) {
        gapi.load('picker', {
          callback: () => {
            setIsPickerApiLoaded(true);
          }
        });
      }
    };

    if (!document.getElementById('google-gapi')) {
      const gapiScript = document.createElement("script");
      gapiScript.id = 'google-gapi';
      gapiScript.src = "https://apis.google.com/js/api.js";
      gapiScript.onload = loadGapi;
      document.body.appendChild(gapiScript);
    } else {
      loadGapi();
    }
  }, [isOpen]);

  const handleAuth = () => {
    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${response.access_token}`)
              .then(res => res.json())
              .then(data => {
                if (data.email) setUserEmail(data.email);
                else setUserEmail("Akun Terhubung");
              })
              .catch(() => setUserEmail("Akun Terhubung"));
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
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
      const origin = window.location.origin;
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setIncludeFolders(true);

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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showError("Nama folder tidak boleh kosong");
      return;
    }

    setIsCreatingFolder(true);
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [folderId],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Gagal membuat folder");

      setFolderName(data.name);
      setFolderId(data.id);
      setShowNewFolderInput(false);
      setNewFolderName("");
      showSuccess(`Folder "${data.name}" berhasil dibuat`);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFinalUpload = async () => {
    if (!accessToken) {
      showError("Akun belum terhubung");
      return;
    }
    setIsUploading(true);
    try {
      const result = await onUpload({ fileName, folderId, accessToken });
      if (result && result.webViewLink) {
        setUploadResult({
          link: result.webViewLink,
          name: fileName
        });
        showSuccess("Berhasil diunggah dan diatur publik!");
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Upload error:", error);
      showError("Gagal mengunggah ke Drive");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (uploadResult?.link) {
      navigator.clipboard.writeText(uploadResult.link);
      showSuccess("Link berhasil disalin!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isUploading && !isCreatingFolder) onClose();
    }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CloudUpload className="text-blue-600 h-6 w-6" /> 
            {uploadResult ? "Berhasil Diunggah" : "Simpan ke Drive"}
          </DialogTitle>
          <DialogDescription>
            {uploadResult 
              ? "File Anda sekarang tersedia secara publik bagi siapa saja yang memiliki link." 
              : "Pilih akun Google dan tentukan lokasi penyimpanan PDF."}
          </DialogDescription>
        </DialogHeader>

        {uploadResult ? (
          <div className="py-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                <Check className="h-5 w-5" /> File Berhasil Diatur Publik
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-green-600">Link Berbagi</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={uploadResult.link} 
                    className="bg-white border-green-200 text-xs h-9"
                  />
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0 border-green-200 text-green-600" onClick={copyToClipboard}>
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button variant="link" className="text-blue-600 text-xs" asChild>
                <a href={uploadResult.link} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} className="mr-1" /> Buka di Google Drive
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 py-4">
            {/* Nama File */}
            <div className="grid gap-2">
              <Label htmlFor="filename" className="text-xs font-bold uppercase text-slate-500">Nama File PDF</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="filename"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="pl-10 h-11"
                  placeholder="Contoh: Rekap_Januari_2024"
                  disabled={isUploading || isCreatingFolder}
                />
              </div>
            </div>

            {/* Akun Google */}
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Akun Google</Label>
              <Button 
                variant="outline" 
                onClick={handleAuth}
                disabled={isUploading || isCreatingFolder}
                className={cn(
                  "justify-start h-11 border-slate-200 relative px-10",
                  userEmail ? "border-blue-200 bg-blue-50" : ""
                )}
              >
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                {userEmail ? (
                  <span className="text-blue-700 font-bold truncate">{userEmail}</span>
                ) : (
                  <span className="text-slate-500">Hubungkan Akun Google...</span>
                )}
              </Button>
            </div>

            {/* Lokasi Penyimpanan */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-500">Lokasi Penyimpanan</Label>
                {accessToken && !showNewFolderInput && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-blue-600 text-xs font-bold"
                    onClick={() => setShowNewFolderInput(true)}
                    disabled={isUploading || isCreatingFolder}
                  >
                    <FolderPlus size={14} className="mr-1" /> Tambah Folder
                  </Button>
                )}
              </div>

              {showNewFolderInput ? (
                <div className="flex gap-2 items-center p-2 bg-slate-50 rounded-lg border border-dashed border-blue-300 animate-in zoom-in-95">
                  <Input 
                    placeholder="Nama folder baru..." 
                    className="h-9 text-sm bg-white"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                    disabled={isCreatingFolder}
                  />
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      className="h-9 w-9 bg-green-600 hover:bg-green-700"
                      onClick={handleCreateFolder}
                      disabled={isCreatingFolder}
                    >
                      {isCreatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={18} />}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-9 w-9 text-slate-400"
                      onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}
                      disabled={isCreatingFolder}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                    <div className="h-11 w-full border border-slate-200 rounded-md flex items-center pl-10 pr-3 text-sm bg-slate-50 text-slate-600 truncate">
                      {folderName}
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    onClick={openPicker}
                    disabled={!accessToken || isUploading || isCreatingFolder}
                    className="h-11 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                  >
                    <Search size={16} className="mr-2" /> Pilih
                  </Button>
                </div>
              )}
              {!accessToken && <p className="text-[10px] text-amber-600 italic font-medium"> Hubungkan akun terlebih dahulu untuk memilih lokasi.</p>}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {uploadResult ? (
            <Button onClick={onClose} className="w-full bg-slate-900">Selesai</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={isUploading || isCreatingFolder}>Batal</Button>
              <Button 
                onClick={handleFinalUpload} 
                disabled={isUploading || isCreatingFolder || !accessToken || showNewFolderInput}
                className="bg-blue-600 hover:bg-blue-700 min-w-[120px] h-11 font-bold"
              >
                {isUploading ? (
                  <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Mengunggah...</>
                ) : (
                  "Mulai Unggah"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriveUploadDialog;