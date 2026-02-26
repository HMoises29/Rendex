const bookingForm = document.getElementById('booking-form');

let fp;
if (document.getElementById('date')) {
    fp = flatpickr("#date", {
        locale: "es",
        minDate: "today",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "j F, Y",
        placeholder: "Selecciona una fecha"
    });
}

async function loadBusyDates() {
    try {
        const { data: busyDates } = await window.supabaseClient
            .from('reservations')
            .select('booking_date')
            .neq('status', 'cancelled');

        if (busyDates && fp) {
            const disabledDates = busyDates.map(d => d.booking_date);
            fp.set('disable', disabledDates);
        }
    } catch (e) {
        console.warn(e);
    }
}

loadBusyDates();

if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('submit-btn');
        const msg = document.getElementById('response-msg');

        const data = {
            client_name: document.getElementById('name').value,
            client_phone: document.getElementById('client_phone').value,
            service: document.getElementById('service').value,
            booking_date: document.getElementById('date').value,
            booking_time: document.getElementById('time').value,
            status: 'pending'
        };

        btn.disabled = true;
        btn.textContent = 'Enviando...';
        try {
            const { error } = await window.supabaseClient
                .from('reservations')
                .insert([data]);

            if (error) throw error;

            msg.textContent = "¡Solicitud guardada! Redirigiendo a WhatsApp...";
            msg.style.color = "var(--primary)";

            const { data: setts } = await window.supabaseClient.from('settings').select('*').eq('key', 'whatsapp_number').single();
            const adminPhone = setts ? setts.value : "584121234567";

            const text = `*Nueva Solicitud de Servicio*\n\n` +
                `*Cliente:* ${data.client_name}\n` +
                `*Teléfono:* ${data.client_phone}\n` +
                `*Servicio:* ${data.service}\n` +
                `*Fecha:* ${data.booking_date}\n` +
                `*Hora:* ${data.booking_time}\n\n` +
                `_Hola, me gustaría confirmar mi solicitud._`;

            const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(text)}`;

            setTimeout(() => {
                window.open(waUrl, '_blank');
                bookingForm.reset();
                msg.textContent = "¡Listo! Ya puedes hablar con nosotros por WhatsApp.";
                btn.textContent = 'Reserva Enviada';
                btn.disabled = false;
            }, 1500);

        } catch (error) {
            msg.style.color = '#c0392b';
            msg.textContent = 'Error: ' + error.message;
            btn.disabled = false;
            btn.textContent = 'Confirmar Reserva';
        }
    });
}
