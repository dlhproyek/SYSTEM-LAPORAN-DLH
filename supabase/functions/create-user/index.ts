// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { username, password, category, role } = await req.json()
    
    // Buat email otomatis dari username (misal: user123@dlh.id)
    const generatedEmail = `${username.toLowerCase().replace(/\s+/g, '_')}@dlh.id`;

    console.log(`[create-user] Membuat user: ${username} dengan email: ${generatedEmail}`);

    const { data, error } = await supabaseClient.auth.admin.createUser({
      email: generatedEmail,
      password,
      email_confirm: true,
      user_metadata: { 
        username, 
        category, 
        role: role || 'user' 
      }
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'User berhasil dibuat', user: data.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("[create-user] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})