// API Configuration
const CONFIG = {
    // For local dev, we point to localhost:5000. 
    // In production (Netlify), we can use an environment variable injected during build or a relative path if deployed on same origin.
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api'
        : 'https://your-production-backend.onrender.com/api' // To be updated upon deployment
};

const api = {
    get: async (endpoint) => {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, { headers });
        if (!res.ok) throw new Error(await res.text());
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
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    upload: async (endpoint, formData) => {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        // Do not set Content-Type to application/json for FormData

        const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};

window.api = api;
