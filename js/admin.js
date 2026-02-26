const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const logoutBtn = document.getElementById('logout-btn');
const reservationsList = document.getElementById('reservations-list');

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;

    const icon = type === 'success'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function formatCaracasDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    const formattedDate = date.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const formattedTime = `${h}:${minutes} ${ampm}`;
    return { formattedDate, formattedTime };
}

async function saveWhatsAppNumber() {
    const newVal = document.getElementById('wa-number-input').value;
    const { error } = await window.supabaseClient
        .from('settings')
        .upsert({ key: 'whatsapp_number', value: newVal });

    if (error) {
        showToast("Error: " + error.message, 'error');
    } else {
        showToast("Número actualizado correctamente");
    }
}

async function checkUser() {
    const isLogged = localStorage.getItem('isLoggedIn');
    if (isLogged === 'true') {
        showDashboard();
    }
}

function showDashboard() {
    loginSection.style.display = 'none';
    adminDashboard.style.display = 'block';
    logoutBtn.style.display = 'block';
    loadReservations();
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = document.getElementById('admin-user').value;
        const password = document.getElementById('admin-password').value;
        const errorMsg = document.getElementById('login-error');

        if (userInput === ADMIN_USER && password === ADMIN_PASS) {
            localStorage.setItem('isLoggedIn', 'true');
            showDashboard();
            showToast("Bienvenido");
        } else {
            errorMsg.textContent = 'Credenciales inválidas';
            showToast("Acceso denegado", 'error');
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        window.location.reload();
    });
}

async function loadReservations() {
    const { data, error } = await window.supabaseClient
        .from('reservations')
        .select('*')
        .order('booking_date', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-confirmed').textContent = data.filter(r => r.status === 'confirmed').length;

    const { data: setts } = await window.supabaseClient.from('settings').select('*').eq('key', 'whatsapp_number').single();
    if (setts) document.getElementById('wa-number-input').value = setts.value;

    reservationsList.innerHTML = '';
    data.forEach(res => {
        const statuses = {
            'pending': 'Pendiente',
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado'
        };

        const { formattedDate, formattedTime } = formatCaracasDateTime(res.booking_date, res.booking_time);
        const tr = document.createElement('tr');

        const actionContent = res.status === 'pending'
            ? `
                <button class="btn-sm" style="background: var(--primary); color: var(--dark); border: none; padding: 0.5rem 1rem; cursor: pointer; font-weight: bold;" onclick="updateStatus('${res.id}', 'confirmed')">ACEPTAR</button>
                <button class="btn-sm" style="background: #ef5350; color: white; border: none; padding: 0.5rem 1rem; cursor: pointer; font-weight: bold;" onclick="updateStatus('${res.id}', 'cancelled')">RECHAZAR</button>
            `
            : `
                <select class="status-select" onchange="updateStatus('${res.id}', this.value)">
                    <option value="pending" ${res.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="confirmed" ${res.status === 'confirmed' ? 'selected' : ''}>Confirmado</option>
                    <option value="cancelled" ${res.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                </select>
                <button class="btn-sm btn-delete" onclick="deleteReservation('${res.id}')">Eliminar</button>
            `;

        tr.innerHTML = `
            <td>
                <div class="client-info">
                    <strong>${res.client_name}</strong>
                    <span style="display: block; font-size: 0.8rem; color: #666; margin-top: 4px;">
                        ${res.client_phone}
                    </span>
                </div>
            </td>
            <td>
                <span style="font-weight: 700;">${res.service}</span>
            </td>
            <td>
                ${formattedDate} <span style="color:#777; font-size: 0.8rem;">a las</span> ${formattedTime}
            </td>
            <td>
                <span class="status-badge status-${res.status}">${statuses[res.status] || res.status}</span>
            </td>
            <td>
                <div class="action-btns" style="display: flex; gap: 0.5rem;">
                    ${actionContent}
                </div>
            </td>
        `;
        reservationsList.appendChild(tr);
    });
}

async function updateStatus(id, newStatus) {
    const { error } = await window.supabaseClient
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast("Estado actualizado");
        loadReservations();
    }
}

async function deleteReservation(id) {
    const { error } = await window.supabaseClient
        .from('reservations')
        .delete()
        .eq('id', id);

    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast("Reserva eliminada");
        loadReservations();
    }
}

checkUser();
