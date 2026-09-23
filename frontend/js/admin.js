document.addEventListener('DOMContentLoaded', async () => {
    // Check admin authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    try {
        if (userStr) user = JSON.parse(userStr);
    } catch (e) {}

    if (!token || !user || user.role !== 'admin') {
        alert('Access Denied: Admins only.');
        window.location.href = '/login.html';
        return;
    }

    initTabs();
    loadDashboardStats();

    // Load initial primary tabs
    loadPendingResources();
    loadAllResources();
    loadHeroCmsSettings();
    loadStatsSettings();
    loadTestimonials();
    loadStaticPages();
    loadFooterManager();
    loadAcademicData();
    loadMediaLibrary();
    loadUsers();
    loadAnalytics();
    loadPlatformSettings();
});

function logoutAdmin() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function initTabs() {
    const links = document.querySelectorAll('.tab-link');
    const panes = document.querySelectorAll('.tab-pane');
    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => {
                l.classList.remove('active', 'bg-[#1d7bf5]', 'text-white', 'font-bold');
                l.classList.add('text-slate-700');
            });
            panes.forEach(p => p.classList.remove('active'));
            link.classList.add('active', 'bg-[#1d7bf5]', 'text-white', 'font-bold');
            link.classList.remove('text-slate-700');
            const target = document.getElementById(link.dataset.target);
            if (target) target.classList.add('active');
        });
    });
}

// 1. Dashboard Top Stats
async function loadDashboardStats() {
    try {
        const stats = await window.api.get('/admin/stats');
        document.getElementById('admin-stat-pending').textContent = stats.pending || 0;
        document.getElementById('badge-pending-count').textContent = stats.pending || 0;
        document.getElementById('admin-stat-resources').textContent = stats.resources || 0;
        document.getElementById('admin-stat-users').textContent = stats.users || 0;
        document.getElementById('admin-stat-downloads').textContent = stats.downloads || 0;
    } catch (e) {
        console.warn('Dashboard stats error:', e);
    }
}

// 2. Pending Moderation Queue
async function loadPendingResources() {
    const container = document.getElementById('admin-pending-content');
    container.innerHTML = '<p class="text-gray-400 text-xs py-4">Loading pending submissions...</p>';
    try {
        const data = await window.api.get('/admin/pending');
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
                    <span class="text-3xl block mb-2">🎉</span>
                    <p class="text-sm font-bold text-slate-800">Queue is completely clear!</p>
                    <p class="text-xs text-slate-400 mt-0.5">No student submissions currently awaiting moderation.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(res => {
            const dateStr = new Date(res.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const sizeMb = res.file_size ? `${(res.file_size / (1024 * 1024)).toFixed(1)} MB` : 'File';
            const initial = (res.contributor_name || 'U').charAt(0).toUpperCase();

            return `
                <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row justify-between items-start gap-4">
                    <div class="space-y-2 flex-grow">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-full border border-amber-200 uppercase">Pending Review</span>
                            <span class="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[10px] rounded-full border border-blue-100">${res.program || 'B.Tech'}</span>
                            <span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[10px] rounded-full border border-emerald-100">${res.resource_type_name || 'Notes'}</span>
                            <span class="text-slate-400 text-[11px]">${dateStr}</span>
                        </div>
                        <h3 class="font-extrabold text-slate-900 text-base">${res.title}</h3>
                        <p class="text-xs text-slate-600 leading-relaxed max-w-3xl">${res.description || 'No description provided.'}</p>
                        
                        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                            <span><strong>College:</strong> ${res.college_name || '-'}</span>
                            <span>•</span>
                            <span><strong>Branch:</strong> ${res.branch_name || '-'}</span>
                            <span>•</span>
                            <span><strong>Semester:</strong> ${res.semester_name || '-'}</span>
                            <span>•</span>
                            <span><strong>Subject:</strong> ${res.subject_name || '-'}</span>
                        </div>

                        <div class="flex items-center gap-4 pt-2 text-xs">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">${initial}</div>
                                <span class="text-slate-700 font-medium">Uploaded by: <strong>${res.contributor_name || 'Student'}</strong> (${res.contributor_email || ''})</span>
                            </div>
                            <span>•</span>
                            <a href="/${res.file_path}" target="_blank" class="text-brand-600 hover:text-brand-700 font-bold underline flex items-center gap-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                Preview / Open File (${sizeMb})
                            </a>
                        </div>
                    </div>

                    <!-- Approve / Reject Actions -->
                    <div class="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                        <button onclick="approveResource(${res.id})" class="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5">
                            <span>✓ Approve & Publish</span>
                        </button>
                        <button onclick="promptRejectResource(${res.id})" class="flex-1 md:flex-initial px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5">
                            <span>✕ Reject</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 text-xs">Error: ${err.message}</p>`;
    }
}

async function approveResource(id) {
    if (!confirm('Approve this material? It will become publicly visible immediately.')) return;
    try {
        await window.api.post(`/admin/moderate/${id}`, { action: 'approve' });
        showToast('Resource approved and published!');
        loadPendingResources();
        loadDashboardStats();
        loadAllResources();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function promptRejectResource(id) {
    document.getElementById('reject-resource-id').value = id;
    document.getElementById('reject-reason-input').value = '';
    document.getElementById('reject-modal').classList.remove('hidden');
}

async function confirmRejection() {
    const id = document.getElementById('reject-resource-id').value;
    const reason = document.getElementById('reject-reason-input').value;
    if (!id) return;

    try {
        await window.api.post(`/admin/moderate/${id}`, {
            action: 'reject',
            rejection_reason: reason
        });
        document.getElementById('reject-modal').classList.add('hidden');
        showToast('Resource rejected and kept hidden');
        loadPendingResources();
        loadDashboardStats();
        loadAllResources();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 3. All Resources Inventory
async function loadAllResources() {
    const tbody = document.getElementById('table-all-resources');
    if (!tbody) return;

    const search = document.getElementById('inventory-search')?.value || '';
    const status = document.getElementById('inventory-status')?.value || '';
    const program = document.getElementById('inventory-program')?.value || '';
    const is_featured = document.getElementById('inventory-featured')?.value || '';

    let endpoint = '/admin/resources?';
    if (search) endpoint += `search=${encodeURIComponent(search)}&`;
    if (status) endpoint += `status=${status}&`;
    if (program) endpoint += `program=${program}&`;
    if (is_featured) endpoint += `is_featured=${is_featured}`;

    try {
        const data = await window.api.get(endpoint);
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No resources found matching filter criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-gray-400">#${r.id}</td>
                <td class="px-4 py-3">
                    <a href="/resource.html?id=${r.id}" target="_blank" class="font-bold text-slate-900 hover:text-blue-600 block line-clamp-1">${r.title}</a>
                    <span class="text-[11px] text-gray-400">${r.subject_name || '-'} • ${r.resource_type_name || '-'}</span>
                </td>
                <td class="px-4 py-3">
                    <span class="font-semibold text-slate-800">${r.program || 'B.Tech'}</span>
                    <span class="block text-[10px] text-gray-400">${r.college_name || '-'}</span>
                </td>
                <td class="px-4 py-3">${r.contributor_name || 'Student'}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        (r.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200')
                    }">
                        ${r.status.toUpperCase()}
                    </span>
                    ${r.is_featured ? '<span class="ml-1 text-[10px] font-bold text-amber-600">★</span>' : ''}
                </td>
                <td class="px-4 py-3 font-mono text-gray-500 text-[11px]">
                    👁 ${r.views || 0} | ↓ ${r.downloads || 0}
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="toggleFeatureResource(${r.id}, ${r.is_featured ? 0 : 1})" class="text-xs ${r.is_featured ? 'text-amber-600 font-bold' : 'text-gray-400 hover:text-amber-600'}">
                        ${r.is_featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button onclick="deleteResource(${r.id})" class="text-xs text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-4 text-center text-red-500">Error: ${err.message}</td></tr>`;
    }
}

async function toggleFeatureResource(id, newStatus) {
    try {
        await window.api.put(`/admin/resources/${id}`, { is_featured: newStatus });
        showToast(newStatus ? 'Resource marked as Featured!' : 'Resource unfeatured');
        loadAllResources();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteResource(id) {
    if (!confirm('Are you sure you want to permanently delete this resource?')) return;
    try {
        await window.api.delete(`/admin/resources/${id}`);
        showToast('Resource deleted');
        loadAllResources();
        loadDashboardStats();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 4. Hero & Homepage CMS
async function loadHeroCmsSettings() {
    try {
        const settings = await window.api.get('/meta/settings');
        const setVal = (id, key) => {
            const el = document.getElementById(id);
            if (el && settings[key] !== undefined) el.value = settings[key];
        };
        setVal('setting-hero-badge', 'hero_badge');
        setVal('setting-hero-title', 'hero_title');
        setVal('setting-hero-subtitle', 'hero_subtitle');
        setVal('setting-hero-doodle-text', 'hero_doodle_text');
        setVal('setting-popular-searches', 'popular_searches');
        setVal('setting-btech-card-desc', 'btech_card_desc');
        setVal('setting-mtech-card-desc', 'mtech_card_desc');
        setVal('setting-phd-card-desc', 'phd_card_desc');
        setVal('setting-cta-title', 'cta_title');
        setVal('setting-cta-description', 'cta_description');
        setVal('setting-cta-button-text', 'cta_button_text');
        setVal('setting-cta-button-url', 'cta_button_url');
    } catch (e) {
        console.warn('Hero CMS load error:', e);
    }
}

async function saveHeroCmsSettings() {
    const updates = {
        hero_badge: document.getElementById('setting-hero-badge')?.value,
        hero_title: document.getElementById('setting-hero-title')?.value,
        hero_subtitle: document.getElementById('setting-hero-subtitle')?.value,
        hero_doodle_text: document.getElementById('setting-hero-doodle-text')?.value,
        popular_searches: document.getElementById('setting-popular-searches')?.value,
        btech_card_desc: document.getElementById('setting-btech-card-desc')?.value,
        mtech_card_desc: document.getElementById('setting-mtech-card-desc')?.value,
        phd_card_desc: document.getElementById('setting-phd-card-desc')?.value,
        cta_title: document.getElementById('setting-cta-title')?.value,
        cta_description: document.getElementById('setting-cta-description')?.value,
        cta_button_text: document.getElementById('setting-cta-button-text')?.value,
        cta_button_url: document.getElementById('setting-cta-button-url')?.value
    };

    try {
        await window.api.put('/meta/settings', updates);
        showToast('Homepage CMS settings saved successfully!');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// 5. Statistics Settings
async function loadStatsSettings() {
    try {
        const settings = await window.api.get('/meta/settings');
        const autoModeCb = document.getElementById('setting-stats-auto-mode');
        if (autoModeCb) autoModeCb.checked = settings.stats_auto_mode !== 'false';

        const setVal = (id, key) => {
            const el = document.getElementById(id);
            if (el && settings[key] !== undefined) el.value = settings[key];
        };
        setVal('setting-stat-resources-override', 'stat_resources_override');
        setVal('setting-stat-users-override', 'stat_users_override');
        setVal('setting-stat-colleges-override', 'stat_colleges_override');
        setVal('setting-stat-downloads-override', 'stat_downloads_override');
    } catch (e) {}
}

async function saveStatsSettings() {
    const updates = {
        stats_auto_mode: document.getElementById('setting-stats-auto-mode')?.checked ? 'true' : 'false',
        stat_resources_override: document.getElementById('setting-stat-resources-override')?.value,
        stat_users_override: document.getElementById('setting-stat-users-override')?.value,
        stat_colleges_override: document.getElementById('setting-stat-colleges-override')?.value,
        stat_downloads_override: document.getElementById('setting-stat-downloads-override')?.value
    };

    try {
        await window.api.put('/meta/settings', updates);
        showToast('Statistics settings saved!');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// 6. Testimonials Manager
async function loadTestimonials() {
    const tbody = document.getElementById('table-testimonials');
    if (!tbody) return;
    try {
        const list = await window.api.get('/admin/testimonials');
        tbody.innerHTML = list.map(t => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-bold text-slate-900">${t.name}</td>
                <td class="px-4 py-3">${t.college} ${t.branch ? `| ${t.branch}` : ''}</td>
                <td class="px-4 py-3 max-w-xs truncate">${t.review}</td>
                <td class="px-4 py-3 text-amber-500 font-bold">${'★'.repeat(t.rating || 5)}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}">
                        ${t.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="editTestimonial(${t.id}, '${escapeHtml(t.name)}', '${escapeHtml(t.college)}', '${escapeHtml(t.branch || '')}', '${escapeHtml(t.avatar_url || '')}', '${encodeURIComponent(t.review)}', ${t.rating || 5}, ${t.is_active ? 1 : 0})" class="text-brand-600 hover:text-brand-800 font-semibold">Edit</button>
                    <button onclick="deleteTestimonial(${t.id})" class="text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

function openTestimonialModal() {
    openGenericModal('Add Student Testimonial', `
        <div><label class="block text-xs font-semibold mb-1">Student Name</label><input type="text" id="m-t-name" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">College / University</label><input type="text" id="m-t-college" placeholder="e.g. NIT Trichy" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Branch</label><input type="text" id="m-t-branch" placeholder="e.g. CSE" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Avatar Image URL (optional)</label><input type="text" id="m-t-avatar" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Student Review</label><textarea id="m-t-review" rows="3" class="w-full text-xs rounded-lg border-gray-300 p-2" required></textarea></div>
        <div><label class="block text-xs font-semibold mb-1">Rating (1 to 5)</label><input type="number" id="m-t-rating" value="5" min="1" max="5" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-t-name').value,
            college: document.getElementById('m-t-college').value,
            branch: document.getElementById('m-t-branch').value,
            avatar_url: document.getElementById('m-t-avatar').value,
            review: document.getElementById('m-t-review').value,
            rating: parseInt(document.getElementById('m-t-rating').value || 5, 10),
            is_active: 1
        };
        await window.api.post('/admin/testimonials', payload);
        showToast('Testimonial added!');
        closeModal();
        loadTestimonials();
    });
}

function editTestimonial(id, name, college, branch, avatar_url, reviewEncoded, rating, is_active) {
    const review = decodeURIComponent(reviewEncoded);
    openGenericModal(`Edit Testimonial #${id}`, `
        <div><label class="block text-xs font-semibold mb-1">Student Name</label><input type="text" id="m-t-name" value="${name}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">College / University</label><input type="text" id="m-t-college" value="${college}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Branch</label><input type="text" id="m-t-branch" value="${branch}" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Avatar Image URL (optional)</label><input type="text" id="m-t-avatar" value="${avatar_url}" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Student Review</label><textarea id="m-t-review" rows="3" class="w-full text-xs rounded-lg border-gray-300 p-2" required>${review}</textarea></div>
        <div><label class="block text-xs font-semibold mb-1">Rating (1 to 5)</label><input type="number" id="m-t-rating" value="${rating}" min="1" max="5" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div class="flex items-center gap-2 pt-2"><input type="checkbox" id="m-t-active" ${is_active ? 'checked' : ''} class="rounded text-brand-600" /><label for="m-t-active" class="text-xs font-semibold">Active & Visible on Homepage</label></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-t-name').value,
            college: document.getElementById('m-t-college').value,
            branch: document.getElementById('m-t-branch').value,
            avatar_url: document.getElementById('m-t-avatar').value,
            review: document.getElementById('m-t-review').value,
            rating: parseInt(document.getElementById('m-t-rating').value || 5, 10),
            is_active: document.getElementById('m-t-active').checked ? 1 : 0
        };
        await window.api.put(`/admin/testimonials/${id}`, payload);
        showToast('Testimonial updated!');
        closeModal();
        loadTestimonials();
    });
}

async function deleteTestimonial(id) {
    if (!confirm('Delete this testimonial?')) return;
    try {
        await window.api.delete(`/admin/testimonials/${id}`);
        showToast('Testimonial deleted');
        loadTestimonials();
    } catch (e) { showToast(e.message, 'error'); }
}

// 7. Static Pages Manager
async function loadStaticPages() {
    const tbody = document.getElementById('table-static-pages');
    if (!tbody) return;
    try {
        const list = await window.api.get('/admin/static-pages');
        tbody.innerHTML = list.map(p => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-brand-600 font-bold">${p.slug}</td>
                <td class="px-4 py-3 font-bold text-slate-900">${p.title}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">Published</span></td>
                <td class="px-4 py-3 text-gray-400">${new Date(p.updated_at || p.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-right space-x-2">
                    <a href="/page.html?slug=${p.slug}" target="_blank" class="text-xs text-blue-600 hover:underline">View</a>
                    <button onclick="editStaticPage(${p.id}, '${p.slug}', '${escapeHtml(p.title)}', '${encodeURIComponent(p.content)}')" class="text-xs text-brand-600 hover:underline font-bold">Edit</button>
                    <button onclick="deleteStaticPage(${p.id})" class="text-xs text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

function openStaticPageModal() {
    openGenericModal('Create New Static Page', `
        <div><label class="block text-xs font-semibold mb-1">Page Slug (e.g. scholarship-guidelines)</label><input type="text" id="m-sp-slug" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Page Title</label><input type="text" id="m-sp-title" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Markdown Content</label><textarea id="m-sp-content" rows="8" class="w-full text-xs rounded-lg border-gray-300 p-2 font-mono" required></textarea></div>
    `, async () => {
        const payload = {
            slug: document.getElementById('m-sp-slug').value.trim().toLowerCase(),
            title: document.getElementById('m-sp-title').value,
            content: document.getElementById('m-sp-content').value,
            is_published: 1
        };
        await window.api.post('/admin/static-pages', payload);
        showToast('Static page created!');
        closeModal();
        loadStaticPages();
    });
}

function editStaticPage(id, slug, title, contentEncoded) {
    const content = decodeURIComponent(contentEncoded);
    openGenericModal(`Edit Page: ${slug}`, `
        <div><label class="block text-xs font-semibold mb-1">Page Slug</label><input type="text" id="m-sp-slug" value="${slug}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Page Title</label><input type="text" id="m-sp-title" value="${title}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Markdown Content</label><textarea id="m-sp-content" rows="10" class="w-full text-xs rounded-lg border-gray-300 p-2 font-mono" required>${content}</textarea></div>
    `, async () => {
        const payload = {
            slug: document.getElementById('m-sp-slug').value.trim().toLowerCase(),
            title: document.getElementById('m-sp-title').value,
            content: document.getElementById('m-sp-content').value,
            is_published: 1
        };
        await window.api.put(`/admin/static-pages/${id}`, payload);
        showToast('Static page updated!');
        closeModal();
        loadStaticPages();
    });
}

async function deleteStaticPage(id) {
    if (!confirm('Delete this static page?')) return;
    try {
        await window.api.delete(`/admin/static-pages/${id}`);
        showToast('Page deleted');
        loadStaticPages();
    } catch (e) { showToast(e.message, 'error'); }
}

// 8. Footer Manager
async function loadFooterManager() {
    try {
        const [settings, footerData] = await Promise.all([
            window.api.get('/meta/settings'),
            window.api.get('/admin/footer-links')
        ]);
        const setVal = (id, key) => {
            const el = document.getElementById(id);
            if (el && settings[key] !== undefined) el.value = settings[key];
        };
        setVal('setting-footer-description', 'footer_about_description');
        setVal('setting-footer-copyright', 'footer_copyright');
        setVal('setting-social-twitter', 'social_twitter');
        setVal('setting-social-instagram', 'social_instagram');
        setVal('setting-social-linkedin', 'social_linkedin');

        const tbody = document.getElementById('table-footer-links');
        if (tbody) {
            tbody.innerHTML = footerData.map(l => `
                <tr class="border-b hover:bg-slate-50 transition">
                    <td class="px-3 py-2 font-bold text-slate-800 text-[11px]">${l.column_title}</td>
                    <td class="px-3 py-2 text-[11px]">${l.title}</td>
                    <td class="px-3 py-2 text-blue-600 truncate max-w-[120px] text-[11px]">${l.url}</td>
                    <td class="px-3 py-2 text-right space-x-1">
                        <button onclick="editFooterLink(${l.id}, '${escapeHtml(l.column_title)}', '${escapeHtml(l.title)}', '${escapeHtml(l.url)}')" class="text-brand-600 hover:text-brand-800 text-[11px] font-semibold">Edit</button>
                        <button onclick="deleteFooterLink(${l.id})" class="text-rose-500 hover:text-rose-700 text-[11px]">✕</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {}
}

async function saveFooterSettings() {
    const updates = {
        footer_about_description: document.getElementById('setting-footer-description')?.value,
        footer_copyright: document.getElementById('setting-footer-copyright')?.value,
        social_twitter: document.getElementById('setting-social-twitter')?.value,
        social_instagram: document.getElementById('setting-social-instagram')?.value,
        social_linkedin: document.getElementById('setting-social-linkedin')?.value
    };
    try {
        await window.api.put('/meta/settings', updates);
        showToast('Footer settings saved!');
    } catch (e) { showToast(e.message, 'error'); }
}

function openFooterLinkModal() {
    openGenericModal('Add Footer Navigation Link', `
        <div>
            <label class="block text-xs font-semibold mb-1">Footer Column</label>
            <input type="text" id="m-fl-column" placeholder="e.g. Quick Links, Resources, Help" class="w-full text-xs rounded-lg border-gray-300 p-2" required />
        </div>
        <div>
            <label class="block text-xs font-semibold mb-1">Link Title</label>
            <input type="text" id="m-fl-title" placeholder="e.g. Syllabus" class="w-full text-xs rounded-lg border-gray-300 p-2" required />
        </div>
        <div>
            <label class="block text-xs font-semibold mb-1">Target URL</label>
            <input type="text" id="m-fl-url" placeholder="e.g. btech.html or page.html?slug=faqs" class="w-full text-xs rounded-lg border-gray-300 p-2" required />
        </div>
    `, async () => {
        const payload = {
            column_title: document.getElementById('m-fl-column').value,
            title: document.getElementById('m-fl-title').value,
            url: document.getElementById('m-fl-url').value,
            display_order: 1
        };
        await window.api.post('/admin/footer-links', payload);
        showToast('Footer link added!');
        closeModal();
        loadFooterManager();
    });
}

function editFooterLink(id, column_title, title, url) {
    openGenericModal(`Edit Footer Link #${id}`, `
        <div>
            <label class="block text-xs font-semibold mb-1">Footer Column</label>
            <input type="text" id="m-fl-column" value="${column_title}" class="w-full text-xs rounded-lg border-gray-300 p-2" required />
        </div>
        <div>
            <label class="block text-xs font-semibold mb-1">Link Title</label>
            <input type="text" id="m-fl-title" value="${title}" class="w-full text-xs rounded-lg border-gray-300 p-2" required />
        </div>
        <div>
            <label class="block text-xs font-semibold mb-1">Target URL</label>
            <input type="text" id="m-fl-url" value="${url}" class="w-full text-xs rounded-lg border-gray-300 p-2" required />
        </div>
    `, async () => {
        const payload = {
            column_title: document.getElementById('m-fl-column').value,
            title: document.getElementById('m-fl-title').value,
            url: document.getElementById('m-fl-url').value
        };
        await window.api.put(`/admin/footer-links/${id}`, payload);
        showToast('Footer link updated!');
        closeModal();
        loadFooterManager();
    });
}

async function deleteFooterLink(id) {
    if (!confirm('Remove this footer link?')) return;
    try {
        await window.api.delete(`/admin/footer-links/${id}`);
        showToast('Footer link removed');
        loadFooterManager();
    } catch (e) { showToast(e.message, 'error'); }
}

// 9. Academic Structure (Colleges, Branches, Semesters, Subjects, Types)
async function loadAcademicData() {
    loadColleges();
    loadBranches();
    loadSemesters();
    loadSubjects();
    loadResourceTypes();
}

async function loadColleges() {
    const tbody = document.getElementById('table-colleges');
    if (!tbody) return;
    try {
        const data = await window.api.get('/meta/colleges');
        tbody.innerHTML = data.map(c => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-gray-400">#${c.id}</td>
                <td class="px-4 py-3 font-bold text-slate-900">${c.name}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold">${c.type}</span></td>
                <td class="px-4 py-3">${c.is_featured ? '<span class="text-emerald-600 font-bold">✓ Yes</span>' : '<span class="text-gray-400">No</span>'}</td>
                <td class="px-4 py-3 font-mono text-blue-600">${c.materials_count || 0}</td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="editCollege(${c.id}, '${escapeHtml(c.name)}', '${c.type}', '${escapeHtml(c.logo_url || '')}', '${escapeHtml(c.description || '')}', ${c.is_featured ? 1 : 0})" class="text-brand-600 hover:text-brand-800 font-semibold">Edit</button>
                    <button onclick="deleteAcademicItem('colleges', ${c.id}, loadColleges)" class="text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

function openCollegeModal() {
    openGenericModal('Add College / University', `
        <div><label class="block text-xs font-semibold mb-1">Institution Name</label><input type="text" id="m-c-name" placeholder="e.g. NIT Trichy" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Category Type</label><select id="m-c-type" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="NIT">NIT</option><option value="IIT">IIT</option><option value="IIIT">IIIT</option><option value="Other">Other</option></select></div>
        <div><label class="block text-xs font-semibold mb-1">Logo URL (optional)</label><input type="text" id="m-c-logo" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Description</label><input type="text" id="m-c-desc" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div class="flex items-center gap-2 pt-2"><input type="checkbox" id="m-c-featured" class="rounded text-brand-600" /><label for="m-c-featured" class="text-xs font-semibold">Feature on homepage</label></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-c-name').value,
            type: document.getElementById('m-c-type').value,
            logo_url: document.getElementById('m-c-logo').value || null,
            description: document.getElementById('m-c-desc').value || null,
            is_featured: document.getElementById('m-c-featured').checked ? 1 : 0
        };
        await window.api.post('/meta/colleges', payload);
        showToast('College added successfully!');
        closeModal();
        loadColleges();
    });
}

function editCollege(id, name, type, logo_url, description, is_featured) {
    openGenericModal(`Edit College #${id}`, `
        <div><label class="block text-xs font-semibold mb-1">Institution Name</label><input type="text" id="m-c-name" value="${name}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Category Type</label><select id="m-c-type" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="NIT" ${type === 'NIT' ? 'selected' : ''}>NIT</option><option value="IIT" ${type === 'IIT' ? 'selected' : ''}>IIT</option><option value="IIIT" ${type === 'IIIT' ? 'selected' : ''}>IIIT</option><option value="Other" ${type === 'Other' ? 'selected' : ''}>Other</option></select></div>
        <div><label class="block text-xs font-semibold mb-1">Logo URL (optional)</label><input type="text" id="m-c-logo" value="${logo_url}" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Description</label><input type="text" id="m-c-desc" value="${description}" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div class="flex items-center gap-2 pt-2"><input type="checkbox" id="m-c-featured" ${is_featured ? 'checked' : ''} class="rounded text-brand-600" /><label for="m-c-featured" class="text-xs font-semibold">Feature on homepage</label></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-c-name').value,
            type: document.getElementById('m-c-type').value,
            logo_url: document.getElementById('m-c-logo').value || null,
            description: document.getElementById('m-c-desc').value || null,
            is_featured: document.getElementById('m-c-featured').checked ? 1 : 0
        };
        await window.api.put(`/meta/colleges/${id}`, payload);
        showToast('College updated successfully!');
        closeModal();
        loadColleges();
    });
}

async function loadBranches() {
    const tbody = document.getElementById('table-branches');
    if (!tbody) return;
    try {
        const data = await window.api.get('/meta/branches');
        tbody.innerHTML = data.map(b => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-gray-400">#${b.id}</td>
                <td class="px-4 py-3 font-bold text-slate-900">${b.name}</td>
                <td class="px-4 py-3 font-mono text-slate-600">${b.code || '-'}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">${b.program || 'B.Tech'}</span></td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="editBranch(${b.id}, '${escapeHtml(b.name)}', '${escapeHtml(b.code || '')}', '${b.program || 'B.Tech'}')" class="text-brand-600 hover:text-brand-800 font-semibold">Edit</button>
                    <button onclick="deleteAcademicItem('branches', ${b.id}, loadBranches)" class="text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

function openBranchModal() {
    openGenericModal('Add Branch / Department', `
        <div><label class="block text-xs font-semibold mb-1">Branch Name</label><input type="text" id="m-b-name" placeholder="e.g. Computer Science & Engineering" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Branch Code</label><input type="text" id="m-b-code" placeholder="e.g. CSE" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Program</label><select id="m-b-prog" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="B.Tech">B.Tech</option><option value="M.Tech">M.Tech</option><option value="PhD">PhD</option></select></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-b-name').value,
            code: document.getElementById('m-b-code').value,
            program: document.getElementById('m-b-prog').value
        };
        await window.api.post('/meta/branches', payload);
        showToast('Branch added!');
        closeModal();
        loadBranches();
    });
}

function editBranch(id, name, code, program) {
    openGenericModal(`Edit Branch #${id}`, `
        <div><label class="block text-xs font-semibold mb-1">Branch Name</label><input type="text" id="m-b-name" value="${name}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Branch Code</label><input type="text" id="m-b-code" value="${code}" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Program</label><select id="m-b-prog" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="B.Tech" ${program === 'B.Tech' ? 'selected' : ''}>B.Tech</option><option value="M.Tech" ${program === 'M.Tech' ? 'selected' : ''}>M.Tech</option><option value="PhD" ${program === 'PhD' ? 'selected' : ''}>PhD</option></select></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-b-name').value,
            code: document.getElementById('m-b-code').value,
            program: document.getElementById('m-b-prog').value
        };
        await window.api.put(`/meta/branches/${id}`, payload);
        showToast('Branch updated!');
        closeModal();
        loadBranches();
    });
}

async function loadSemesters() {
    const tbody = document.getElementById('table-semesters');
    if (!tbody) return;
    try {
        const data = await window.api.get('/meta/semesters');
        tbody.innerHTML = data.map(s => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-gray-400">#${s.id}</td>
                <td class="px-4 py-3 font-bold text-slate-900">${s.name}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold">${s.level || 'B.Tech'}</span></td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="editSemester(${s.id}, '${escapeHtml(s.name)}', '${s.level || 'B.Tech'}')" class="text-brand-600 hover:text-brand-800 font-semibold">Edit</button>
                    <button onclick="deleteAcademicItem('semesters', ${s.id}, loadSemesters)" class="text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

function openSemesterModal() {
    openGenericModal('Add Semester / Stage', `
        <div><label class="block text-xs font-semibold mb-1">Semester Name</label><input type="text" id="m-s-name" placeholder="e.g. 5th Semester" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Program Level</label><select id="m-s-level" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="B.Tech">B.Tech</option><option value="M.Tech">M.Tech</option><option value="PhD">PhD</option></select></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-s-name').value,
            level: document.getElementById('m-s-level').value
        };
        await window.api.post('/meta/semesters', payload);
        showToast('Semester added!');
        closeModal();
        loadSemesters();
    });
}

function editSemester(id, name, level) {
    openGenericModal(`Edit Semester #${id}`, `
        <div><label class="block text-xs font-semibold mb-1">Semester Name</label><input type="text" id="m-s-name" value="${name}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Program Level</label><select id="m-s-level" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="B.Tech" ${level === 'B.Tech' ? 'selected' : ''}>B.Tech</option><option value="M.Tech" ${level === 'M.Tech' ? 'selected' : ''}>M.Tech</option><option value="PhD" ${level === 'PhD' ? 'selected' : ''}>PhD</option></select></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-s-name').value,
            level: document.getElementById('m-s-level').value
        };
        await window.api.put(`/meta/semesters/${id}`, payload);
        showToast('Semester updated!');
        closeModal();
        loadSemesters();
    });
}

async function loadSubjects() {
    const tbody = document.getElementById('table-subjects');
    if (!tbody) return;
    try {
        const data = await window.api.get('/meta/subjects');
        tbody.innerHTML = data.map(sub => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-gray-400">#${sub.id}</td>
                <td class="px-4 py-3 font-bold text-slate-900">${sub.name}</td>
                <td class="px-4 py-3 font-mono text-slate-600">${sub.code || '-'}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">${sub.program || 'B.Tech'}</span></td>
                <td class="px-4 py-3 text-gray-500">${sub.branch_name || 'All'} • ${sub.semester_name || 'All'}</td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="editSubject(${sub.id}, '${escapeHtml(sub.name)}', '${escapeHtml(sub.code || '')}', '${sub.program || 'B.Tech'}', ${sub.branch_id || 'null'}, ${sub.semester_id || 'null'}, ${sub.is_research_area ? 1 : 0})" class="text-brand-600 hover:text-brand-800 font-semibold">Edit</button>
                    <button onclick="deleteAcademicItem('subjects', ${sub.id}, loadSubjects)" class="text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

async function openSubjectModal() {
    const [branches, semesters] = await Promise.all([
        window.api.get('/meta/branches').catch(() => []),
        window.api.get('/meta/semesters').catch(() => [])
    ]);

    openGenericModal('Add Subject / Research Area', `
        <div><label class="block text-xs font-semibold mb-1">Subject Name</label><input type="text" id="m-sub-name" placeholder="e.g. Operating Systems" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Subject Code</label><input type="text" id="m-sub-code" placeholder="e.g. CS302" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Program</label><select id="m-sub-prog" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="B.Tech">B.Tech</option><option value="M.Tech">M.Tech</option><option value="PhD">PhD</option></select></div>
        <div><label class="block text-xs font-semibold mb-1">Branch (Optional)</label><select id="m-sub-branch" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="">All Branches</option>${branches.map(b => `<option value="${b.id}">${b.name} (${b.program})</option>`).join('')}</select></div>
        <div><label class="block text-xs font-semibold mb-1">Semester (Optional)</label><select id="m-sub-sem" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="">All Semesters</option>${semesters.map(s => `<option value="${s.id}">${s.name} (${s.level})</option>`).join('')}</select></div>
        <div class="flex items-center gap-2 pt-2"><input type="checkbox" id="m-sub-research" class="rounded text-brand-600" /><label for="m-sub-research" class="text-xs font-semibold">Is Doctoral Research Area</label></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-sub-name').value,
            code: document.getElementById('m-sub-code').value,
            program: document.getElementById('m-sub-prog').value,
            branch_id: document.getElementById('m-sub-branch').value || null,
            semester_id: document.getElementById('m-sub-sem').value || null,
            is_research_area: document.getElementById('m-sub-research').checked ? 1 : 0
        };
        await window.api.post('/meta/subjects', payload);
        showToast('Subject added!');
        closeModal();
        loadSubjects();
    });
}

async function editSubject(id, name, code, program, branch_id, semester_id, is_research_area) {
    const [branches, semesters] = await Promise.all([
        window.api.get('/meta/branches').catch(() => []),
        window.api.get('/meta/semesters').catch(() => [])
    ]);

    openGenericModal(`Edit Subject #${id}`, `
        <div><label class="block text-xs font-semibold mb-1">Subject Name</label><input type="text" id="m-sub-name" value="${name}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Subject Code</label><input type="text" id="m-sub-code" value="${code}" class="w-full text-xs rounded-lg border-gray-300 p-2" /></div>
        <div><label class="block text-xs font-semibold mb-1">Program</label><select id="m-sub-prog" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="B.Tech" ${program === 'B.Tech' ? 'selected' : ''}>B.Tech</option><option value="M.Tech" ${program === 'M.Tech' ? 'selected' : ''}>M.Tech</option><option value="PhD" ${program === 'PhD' ? 'selected' : ''}>PhD</option></select></div>
        <div><label class="block text-xs font-semibold mb-1">Branch (Optional)</label><select id="m-sub-branch" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="">All Branches</option>${branches.map(b => `<option value="${b.id}" ${b.id == branch_id ? 'selected' : ''}>${b.name} (${b.program})</option>`).join('')}</select></div>
        <div><label class="block text-xs font-semibold mb-1">Semester (Optional)</label><select id="m-sub-sem" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="">All Semesters</option>${semesters.map(s => `<option value="${s.id}" ${s.id == semester_id ? 'selected' : ''}>${s.name} (${s.level})</option>`).join('')}</select></div>
        <div class="flex items-center gap-2 pt-2"><input type="checkbox" id="m-sub-research" ${is_research_area ? 'checked' : ''} class="rounded text-brand-600" /><label for="m-sub-research" class="text-xs font-semibold">Is Doctoral Research Area</label></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-sub-name').value,
            code: document.getElementById('m-sub-code').value,
            program: document.getElementById('m-sub-prog').value,
            branch_id: document.getElementById('m-sub-branch').value || null,
            semester_id: document.getElementById('m-sub-sem').value || null,
            is_research_area: document.getElementById('m-sub-research').checked ? 1 : 0
        };
        await window.api.put(`/meta/subjects/${id}`, payload);
        showToast('Subject updated!');
        closeModal();
        loadSubjects();
    });
}

async function loadResourceTypes() {
    const tbody = document.getElementById('table-resource-types');
    if (!tbody) return;
    try {
        const data = await window.api.get('/meta/resource-types');
        tbody.innerHTML = data.map(rt => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono text-gray-400">#${rt.id}</td>
                <td class="px-4 py-3 font-bold text-slate-900">${rt.name}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold">${rt.program || 'All'}</span></td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="editResourceType(${rt.id}, '${escapeHtml(rt.name)}', '${rt.program || 'All'}')" class="text-brand-600 hover:text-brand-800 font-semibold">Edit</button>
                    <button onclick="deleteAcademicItem('resource-types', ${rt.id}, loadResourceTypes)" class="text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

function openResourceTypeModal() {
    openGenericModal('Add Material Type', `
        <div><label class="block text-xs font-semibold mb-1">Type Name</label><input type="text" id="m-rt-name" placeholder="e.g. Lab Manuals" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Program</label><select id="m-rt-prog" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="All">All Programs</option><option value="B.Tech">B.Tech</option><option value="M.Tech">M.Tech</option><option value="PhD">PhD</option></select></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-rt-name').value,
            program: document.getElementById('m-rt-prog').value
        };
        await window.api.post('/meta/resource-types', payload);
        showToast('Material type added!');
        closeModal();
        loadResourceTypes();
    });
}

function editResourceType(id, name, program) {
    openGenericModal(`Edit Material Type #${id}`, `
        <div><label class="block text-xs font-semibold mb-1">Type Name</label><input type="text" id="m-rt-name" value="${name}" class="w-full text-xs rounded-lg border-gray-300 p-2" required /></div>
        <div><label class="block text-xs font-semibold mb-1">Program</label><select id="m-rt-prog" class="w-full text-xs rounded-lg border-gray-300 p-2"><option value="All" ${program === 'All' ? 'selected' : ''}>All Programs</option><option value="B.Tech" ${program === 'B.Tech' ? 'selected' : ''}>B.Tech</option><option value="M.Tech" ${program === 'M.Tech' ? 'selected' : ''}>M.Tech</option><option value="PhD" ${program === 'PhD' ? 'selected' : ''}>PhD</option></select></div>
    `, async () => {
        const payload = {
            name: document.getElementById('m-rt-name').value,
            program: document.getElementById('m-rt-prog').value
        };
        await window.api.put(`/meta/resource-types/${id}`, payload);
        showToast('Material type updated!');
        closeModal();
        loadResourceTypes();
    });
}

async function deleteAcademicItem(endpoint, id, reloadFn) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
        await window.api.delete(`/meta/${endpoint}/${id}`);
        showToast('Item deleted');
        reloadFn();
    } catch (e) { showToast(e.message, 'error'); }
}

// 10. Media Library
async function loadMediaLibrary() {
    const container = document.getElementById('media-grid');
    if (!container) return;
    try {
        const list = await window.api.get('/admin/media');
        if (!list || list.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-xs col-span-full py-8 text-center">Media library is currently empty. Click "Upload Media" to add image assets.</p>';
            return;
        }

        container.innerHTML = list.map(m => `
            <div class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden group relative flex flex-col justify-between">
                <div class="h-28 w-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    <img src="/${m.file_path}" alt="${m.alt_text}" class="w-full h-full object-cover group-hover:scale-105 transition" onerror="this.src='https://placehold.co/150x150?text=Image'" />
                </div>
                <div class="p-2 space-y-1">
                    <p class="text-[11px] font-bold text-slate-800 truncate" title="${m.file_name}">${m.file_name}</p>
                    <div class="flex justify-between items-center pt-1 border-t border-slate-200">
                        <button onclick="copyMediaUrl('${m.file_path}')" class="text-[10px] text-brand-600 font-bold hover:underline">Copy URL</button>
                        <button onclick="deleteMediaItem(${m.id})" class="text-[10px] text-rose-500 font-semibold hover:underline">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {}
}

async function handleMediaUpload(input) {
    if (!input.files || input.files.length === 0) return;
    const formData = new FormData();
    formData.append('file', input.files[0]);
    formData.append('category', 'general');

    try {
        await window.api.upload('/admin/media', formData);
        showToast('Media uploaded to library!');
        input.value = '';
        loadMediaLibrary();
    } catch (e) { showToast(e.message, 'error'); }
}

function copyMediaUrl(path) {
    navigator.clipboard.writeText(path);
    showToast('Asset path copied to clipboard!');
}

async function deleteMediaItem(id) {
    if (!confirm('Delete this media asset?')) return;
    try {
        await window.api.delete(`/admin/media/${id}`);
        showToast('Media removed');
        loadMediaLibrary();
    } catch (e) { showToast(e.message, 'error'); }
}

// 11. User Management
async function loadUsers() {
    const tbody = document.getElementById('table-users');
    if (!tbody) return;
    const search = document.getElementById('users-search')?.value || '';
    try {
        const users = await window.api.get(`/admin/users?search=${encodeURIComponent(search)}`);
        tbody.innerHTML = users.map(u => `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 block">${u.name}</span>
                    <span class="text-[11px] text-gray-400 font-mono">${u.email}</span>
                </td>
                <td class="px-4 py-3 text-gray-600">${u.college_name || '-'}</td>
                <td class="px-4 py-3">
                    <select onchange="changeUserRole(${u.id}, this.value)" class="text-xs rounded border-gray-300 py-1 px-2 font-semibold ${u.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-slate-100'}">
                        <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="moderator" ${u.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                    </select>
                </td>
                <td class="px-4 py-3 font-bold text-emerald-600 font-mono">${u.approved_uploads || 0}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
                        ${(u.status || 'active').toUpperCase()}
                    </span>
                </td>
                <td class="px-4 py-3 text-right">
                    <button onclick="toggleUserStatus(${u.id}, '${u.status === 'suspended' ? 'active' : 'suspended'}')" class="text-xs font-semibold ${u.status === 'suspended' ? 'text-emerald-600' : 'text-rose-500 hover:text-rose-700'}">
                        ${u.status === 'suspended' ? 'Activate Account' : 'Suspend'}
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

async function changeUserRole(id, newRole) {
    try {
        await window.api.put(`/admin/users/${id}`, { role: newRole });
        showToast('User role updated!');
    } catch (e) { showToast(e.message, 'error'); }
}

async function toggleUserStatus(id, newStatus) {
    try {
        await window.api.put(`/admin/users/${id}`, { status: newStatus });
        showToast(`User status set to ${newStatus}`);
        loadUsers();
    } catch (e) { showToast(e.message, 'error'); }
}

// 12. Analytics & Reports
async function loadAnalytics() {
    try {
        const data = await window.api.get('/admin/analytics');
        
        const renderList = (containerId, items, valueKey, labelSuffix) => {
            const el = document.getElementById(containerId);
            if (!el) return;
            if (!items || items.length === 0) {
                el.innerHTML = '<p class="text-gray-400 text-xs">No data yet.</p>';
                return;
            }
            el.innerHTML = items.slice(0, 5).map((item, i) => `
                <div class="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                    <span class="font-medium text-slate-800 truncate max-w-[220px]">${i + 1}. ${item.title || item.name}</span>
                    <span class="font-bold text-brand-600 text-[11px]">${item[valueKey]} ${labelSuffix}</span>
                </div>
            `).join('');
        };

        renderList('analytics-top-downloaded', data.topDownloaded, 'downloads', 'downloads');
        renderList('analytics-top-viewed', data.topViewed, 'views', 'views');
        renderList('analytics-top-colleges', data.popularColleges, 'resource_count', 'materials');
        renderList('analytics-top-contributors', data.topContributors, 'approved_uploads', 'uploads');
    } catch (e) {}
}

// 13. Platform Settings & SEO
async function loadPlatformSettings() {
    try {
        const settings = await window.api.get('/meta/settings');
        const setVal = (id, key) => {
            const el = document.getElementById(id);
            if (el && settings[key] !== undefined) el.value = settings[key];
        };
        setVal('setting-max-upload-size-mb', 'max_upload_size_mb');
        setVal('setting-allowed-file-types', 'allowed_file_types');
        setVal('setting-seo-meta-title', 'seo_meta_title');
        setVal('setting-seo-meta-description', 'seo_meta_description');
        setVal('setting-seo-meta-keywords', 'seo_meta_keywords');
    } catch (e) {}
}

async function savePlatformSettings() {
    const updates = {
        max_upload_size_mb: document.getElementById('setting-max-upload-size-mb')?.value,
        allowed_file_types: document.getElementById('setting-allowed-file-types')?.value,
        seo_meta_title: document.getElementById('setting-seo-meta-title')?.value,
        seo_meta_description: document.getElementById('setting-seo-meta-description')?.value,
        seo_meta_keywords: document.getElementById('setting-seo-meta-keywords')?.value
    };
    try {
        await window.api.put('/meta/settings', updates);
        showToast('Platform settings and SEO configuration saved!');
    } catch (e) { showToast(e.message, 'error'); }
}

// Universal Generic Modal Helper
let onSaveModalHandler = null;

function openGenericModal(title, bodyHtml, saveHandler) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    onSaveModalHandler = saveHandler;
    document.getElementById('crud-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('crud-modal').classList.add('hidden');
    onSaveModalHandler = null;
}

async function saveModalData() {
    if (typeof onSaveModalHandler === 'function') {
        try {
            await onSaveModalHandler();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
