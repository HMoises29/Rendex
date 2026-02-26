// Servidor de Gestión de Reservas + Notificaciones por TELEGRAM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { client_name, client_phone, service, booking_date, booking_time } = await req.json()

        // 1. Guardar en Base de Datos para que quede el registro
        const { error: dbError } = await supabaseClient
            .from('reservations')
            .insert([{ client_name, client_phone, service, booking_date, booking_time }])

        if (dbError) throw dbError

        // 2. Enviar Notificación por TELEGRAM
        const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const message = `
⚡ *NUEVA RESERVA RECIBIDA* ⚡
────────────────────
👤 *Cliente:* ${client_name}
📞 *Teléfono:* ${client_phone}
🛠️ *Servicio:* ${service}
📅 *Fecha:* ${booking_date}
⏰ *Hora:* ${booking_time}
────────────────────
_Gestiona esta reserva en tu panel admin._
      `;

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown',
                }),
            })
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
