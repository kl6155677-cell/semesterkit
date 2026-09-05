document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html';
        return;
    }
    const user = JSON.parse(localStorage.getItem('user'));
    if (user.role !== 'admin') {
        alert('Access Denied. Admins only.');
        window.location.href = '/';
        return;
    }

    initTabs();
    loadDashboardStats();
    
    // Load initial tab data
    loadPendingResources();
    loadSettings();
    loadData('colleges');
    loadData('branches');
    loadData('semesters');
    loadData('subjects');
    loadData('resource-types', 'resource-types'); // Using hyphen for endpoint but DOM id is resource-types
});

function initTabs() {
    const links = document.querySelectorAll('.tab-link');
    const panes = document.querySelectorAll('.tab-pane');
    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => {
                l.classList.remove('active', 'bg-[#1d7bf5]', 'text-white');
                l.classList.add('text-slate-700');
            });
            panes.forEach(p => p.classList.remove('active'));
            link.classList.add('active', 'bg-[#1d7bf5]', 'text-white');
            link.classList.remove('text-slate-700');
            document.getElementById(link.dataset.target).classList.add('active');
        });
    });
}

async function loadDashboardStats() {
    try {
        const stats = await window.api.get('/admin/stats');
        document.getElementById('admin-stat-pending').textContent = stats.pending;
        document.getElementById('admin-stat-resources').textContent = stats.resources;
    } catch(e) { console.error(e); }
}

// ---- Pending Moderation ----
async function loadPendingResources() {
    const container = document.getElementById('admin-pending-content');
    container.innerHTML = '<p class="text-gray-500">Loading pending resources...</p>';
    try {
        const data = await window.api.get('/admin/pending');
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500">No pending resources to moderate.</p>`;
            return;
        }
        container.innerHTML = data.map(res => `
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-slate-900">${res.title}</h3>
                    <p class="text-sm text-gray-500 mt-1">${res.description || 'No description'}</p>
                    <div class="text-xs text-gray-400 mt-2">
                        Type: ${res.resource_type_name || '-'} | College: ${res.college_name || '-'} | Subject: ${res.subject_name || '-'}
                    </div>
                    <div class="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        Uploaded by: ${res.contributor_name || 'Unknown'} | 
                        <a href="${CONFIG.API_BASE_URL.replace('/api', '')}/${res.file_path}" target="_blank" class="text-[#1d7bf5] hover:underline font-medium">Download / Preview</a>
                    </div>
                </div>
                <div class="flex flex-col gap-2 shrink-0">
                    <button onclick="moderate(${res.id}, 'approve')" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-sm transition">Approve</button>
                    <button onclick="moderate(${res.id}, 'reject')" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-bold text-sm transition">Reject</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<p class="text-red-500">Error loading data: ${err.message}</p>`;
    }
}

async function moderate(id, action) {
    if (!confirm(`Are you sure you want to ${action} this resource?`)) return;
    try {
        await window.api.post(`/admin/moderate/${id}`, { action });
        loadPendingResources();
        loadDashboardStats();
    } catch (err) { alert(err.message); }
}

// ---- Settings ----
async function loadSettings() {
    try {
        const settings = await window.api.get('/meta/settings');
        if(settings.hero_title) document.getElementById('setting-hero-title').value = settings.hero_title;
        if(settings.hero_subtitle) document.getElementById('setting-hero-subtitle').value = settings.hero_subtitle;
        if(settings.hero_image_url) {
            document.getElementById('setting-hero-image-url').value = settings.hero_image_url;
            document.getElementById('hero-preview').src = settings.hero_image_url;
            document.getElementById('hero-preview').classList.remove('hidden');
        }
    } catch(e) { console.error(e); }
}

async function uploadHeroImage() {
    const fileInput = document.getElementById('hero-image-upload');
    if (!fileInput.files[0]) {
        alert('Please select an image first.');
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    try {
        const data = await window.api.upload('/upload/image', formData);
        document.getElementById('setting-hero-image-url').value = data.url;
        document.getElementById('hero-preview').src = data.url;
        document.getElementById('hero-preview').classList.remove('hidden');
        alert('Image uploaded successfully. Don\'t forget to click Save Settings.');
    } catch (e) {
        alert(e.message);
    }
}

async function saveSettings() {
    const updates = {
        hero_title: document.getElementById('setting-hero-title').value,
        hero_subtitle: document.getElementById('setting-hero-subtitle').value,
        hero_image_url: document.getElementById('setting-hero-image-url').value
    };
    try {
        await window.api.post('/meta/settings', updates); // wait, PUT method? 
        // wait, metaRoutes uses PUT for settings
        // I will use fetch directly since our api object only has post, get, upload
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_BASE_URL}/meta/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error(await res.text());
        alert('Settings saved successfully!');
    } catch (e) { alert(e.message); }
}

// ---- Generic CRUD operations ----
let currentCrudContext = null;

async function loadData(endpoint, tableId = endpoint) {
    try {
        const data = await window.api.get(`/meta/${endpoint}`);
        const tbody = document.getElementById(`table-${tableId}`);
        if (!tbody) return;
        
        tbody.innerHTML = data.map(item => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3">${item.id}</td>
                <td class="px-4 py-3 font-medium text-gray-900">${item.name}</td>
                ${item.type ? `<td class="px-4 py-3">${item.type}</td>` : ''}
                ${item.level ? `<td class="px-4 py-3">${item.level}</td>` : ''}
                ${item.branch_id !== undefined ? `<td class="px-4 py-3">${item.branch_id || '-'}</td>` : ''}
                ${item.semester_id !== undefined ? `<td class="px-4 py-3">${item.semester_id || '-'}</td>` : ''}
                <td class="px-4 py-3 text-right">
                    <button onclick="deleteCrudItem('${endpoint}', ${item.id})" class="text-red-500 hover:text-red-700">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

function openModal(type) {
    currentCrudContext = type;
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    
    let html = `<div><label class="block text-sm font-semibold mb-1">Name</label><input type="text" id="crud-name" class="w-full rounded border-gray-300 p-2 text-sm"></div>`;
    
    if (type === 'college') {
        title.textContent = 'Add College';
        html += `<div><label class="block text-sm font-semibold mb-1">Type</label><input type="text" id="crud-type" class="w-full rounded border-gray-300 p-2 text-sm" placeholder="e.g. NIT, IIT"></div>`;
    } else if (type === 'semester') {
        title.textContent = 'Add Semester';
        html += `<div><label class="block text-sm font-semibold mb-1">Level</label><input type="text" id="crud-level" class="w-full rounded border-gray-300 p-2 text-sm" placeholder="e.g. B.Tech"></div>`;
    } else if (type === 'subject') {
        title.textContent = 'Add Subject';
        html += `<div><label class="block text-sm font-semibold mb-1">Branch ID (Optional)</label><input type="number" id="crud-branch" class="w-full rounded border-gray-300 p-2 text-sm"></div>`;
        html += `<div><label class="block text-sm font-semibold mb-1">Semester ID (Optional)</label><input type="number" id="crud-semester" class="w-full rounded border-gray-300 p-2 text-sm"></div>`;
    } else if (type === 'branch') {
        title.textContent = 'Add Branch';
    } else if (type === 'res_type') {
        title.textContent = 'Add Resource Type';
    }

    body.innerHTML = html;
    document.getElementById('crud-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('crud-modal').classList.add('hidden');
    currentCrudContext = null;
}

async function saveCrudItem() {
    if (!currentCrudContext) return;
    
    const payload = { name: document.getElementById('crud-name').value };
    if (!payload.name) { alert('Name is required'); return; }

    let endpoint = '';
    
    if (currentCrudContext === 'college') {
        endpoint = 'colleges';
        payload.type = document.getElementById('crud-type').value;
    } else if (currentCrudContext === 'branch') {
        endpoint = 'branches';
    } else if (currentCrudContext === 'semester') {
        endpoint = 'semesters';
        payload.level = document.getElementById('crud-level').value;
    } else if (currentCrudContext === 'subject') {
        endpoint = 'subjects';
        payload.branch_id = document.getElementById('crud-branch').value || null;
        payload.semester_id = document.getElementById('crud-semester').value || null;
    } else if (currentCrudContext === 'res_type') {
        endpoint = 'resource-types';
    }

    try {
        await window.api.post(`/meta/${endpoint}`, payload);
        closeModal();
        loadData(endpoint, endpoint);
    } catch(e) { alert(e.message); }
}

async function deleteCrudItem(endpoint, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_BASE_URL}/meta/${endpoint}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        loadData(endpoint, endpoint);
    } catch(e) { alert(e.message); }
}
