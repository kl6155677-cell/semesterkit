// API Configuration
const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? (window.location.port === '5000' ? '/api' : 'http://localhost:5000/api')
        : '/api'
};

const api = {
    get: async (endpoint) => {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, { headers });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errData.error || errData.message || `Request failed with status ${res.status}`);
        }
        return res.json();
    },

    post: async (endpoint, data) => {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errData.error || errData.message || `Request failed with status ${res.status}`);
        }
        return res.json();
    },

    put: async (endpoint, data) => {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errData.error || errData.message || `Request failed with status ${res.status}`);
        }
        return res.json();
    },

    delete: async (endpoint) => {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errData.error || errData.message || `Request failed with status ${res.status}`);
        }
        return res.json();
    },

    upload: async (endpoint, formData) => {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errData.error || errData.message || `Upload failed with status ${res.status}`);
        }
        return res.json();
    }
};

// Toast notification helper
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600 text-white' : (type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white');
    toast.className = `${bg} px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transform transition-all duration-300 pointer-events-auto max-w-md`;
    
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `<span class="font-bold">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

window.api = api;
window.showToast = showToast;
