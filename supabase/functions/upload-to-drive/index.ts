// @ts-ignore: Deno imports are not recognized by standard TS compiler
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// Declare Deno global for TypeScript compiler
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("[upload-to-drive] Memulai proses unggah...");
    const { pdfBase64, fileName, folderId } = await req.json();

    if (!pdfBase64) {
      throw new Error("Data PDF tidak ditemukan");
    }

    const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      return new Response(
        JSON.stringify({ error: "Google Drive API belum dikonfigurasi di Supabase Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Metadata untuk Google Drive API
    const metadata = {
      name: fileName,
      mimeType: 'application/pdf',
      parents: folderId ? [folderId] : []
    };

    console.log("[upload-to-drive] Mengunggah file ke folder:", folderId || "Root");
    
    return new Response(
      JSON.stringify({ 
        message: `File siap diunggah ke folder: ${folderId || 'Utama'}. Pastikan Service Account memiliki akses ke folder tersebut.`,
        fileName,
        folderId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[upload-to-drive] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
})