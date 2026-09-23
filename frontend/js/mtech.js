document.addEventListener('DOMContentLoaded', () => {
    initMTechPage();
});

let currentFilters = {
    program: 'M.Tech',
    college_id: null,
    branch_id: null,
    semester_id: null,
    resource_type_id: null,
    query: '',
    sort: 'latest',
    page: 1
};

async function initMTechPage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('query')) currentFilters.query = params.get('query');
    if (params.get('college_id')) currentFilters.college_id = params.get('college_id');
    if (params.get('branch_id')) currentFilters.branch_id = params.get('branch_id');
    if (params.get('type_id')) currentFilters.resource_type_id = params.get('type_id');

    await loadSidebarFilters();
    setupFilterEvents();
    await loadResources();
}

async function loadSidebarFilters() {
    if (!window.api) return;
    try {
        const [colleges, branches, resourceTypes] = await Promise.all([
            window.api.get('/meta/colleges').catch(() => []),
            window.api.get('/meta/branches?program=M.Tech').catch(() => []),
            window.api.get('/meta/resource-types?program=M.Tech').catch(() => [])
        ]);

        const collegeContainer = document.querySelector('.space-y-1\\.5.text-xs.text-slate-600');
        if (collegeContainer && colleges.length > 0) {
            collegeContainer.innerHTML = colleges.map(c => `
                <label class="flex items-center gap-2 cursor-pointer hover:text-slate-800 ${currentFilters.college_id == c.id ? 'text-brand-600 font-bold' : ''}">
                    <input class="rounded border-slate-300 text-brand-600 focus:ring-0 w-3.5 h-3.5 filter-college-cb" type="checkbox" value="${c.id}" ${currentFilters.college_id == c.id ? 'checked' : ''} />
                    <span>${c.name}</span>
                </label>
            `).join('');
        }
    } catch (e) {
        console.warn('Sidebar filter load error:', e);
    }
}

function setupFilterEvents() {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('filter-college-cb')) {
            const checked = document.querySelectorAll('.filter-college-cb:checked');
            currentFilters.college_id = checked.length > 0 ? checked[0].value : null;
            currentFilters.page = 1;
            loadResources();
        }
    });

    const sortSelect = document.querySelector('select[aria-label*="sort"], select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentFilters.sort = e.target.value.toLowerCase().includes('download') ? 'downloads' : (e.target.value.toLowerCase().includes('view') ? 'views' : 'latest');
            loadResources();
        });
    }
}

async function loadResources() {
    const container = document.getElementById('resources-grid') || document.querySelector('.space-y-3, main .grid.grid-cols-1');
    if (!container) return;

    container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
            <div class="inline-block animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
            <p class="text-xs">Loading approved M.Tech research papers & notes...</p>
        </div>
    `;

    try {
        let endpoint = `/resources?program=M.Tech&sort=${currentFilters.sort}&page=${currentFilters.page}&limit=15`;
        if (currentFilters.query) endpoint += `&query=${encodeURIComponent(currentFilters.query)}`;
        if (currentFilters.college_id) endpoint += `&college_id=${currentFilters.college_id}`;
        if (currentFilters.branch_id) endpoint += `&branch_id=${currentFilters.branch_id}`;
        if (currentFilters.resource_type_id) endpoint += `&resource_type_id=${currentFilters.resource_type_id}`;

        const resources = await window.api.get(endpoint);
        renderResources(resources, container);
    } catch (err) {
        container.innerHTML = `<div class="p-6 text-center text-red-500 text-sm">Error: ${err.message}</div>`;
    }
}

function renderResources(resources, container) {
    if (!resources || resources.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <p class="text-sm font-semibold text-slate-700">No M.Tech resources found</p>
                <p class="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    resources.forEach(res => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3';
        
        let typeBadgeColor = 'bg-blue-600';
        let typeLabel = (res.file_type || 'DOC').toUpperCase();
        if (typeLabel === 'PDF') typeBadgeColor = 'bg-red-500';
        else if (typeLabel === 'ZIP' || typeLabel === 'RAR') typeBadgeColor = 'bg-amber-500';

        const dateStr = new Date(res.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const firstLetter = (res.contributor_name || 'U').charAt(0).toUpperCase();

        card.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg ${typeBadgeColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs uppercase">
                    ${typeLabel}
                </div>
                <div class="space-y-1">
                    <h3 class="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition" onclick="window.location.href='/resource.html?id=${res.id}'">
                        ${res.title}
                    </h3>
                    <p class="text-[11px] text-slate-500 leading-tight line-clamp-1">
                        ${res.description || 'No description provided.'}
                    </p>
                    <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span class="px-2 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 font-medium">${res.resource_type_name || 'Resource'}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-medium">${res.subject_name || res.semester_name || 'M.Tech'}</span>
                        ${res.is_featured ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">★ Featured</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-5 shrink-0 text-xs text-slate-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 overflow-hidden font-bold">
                        ${firstLetter}
                    </div>
                    <div>
                        <span class="block font-semibold text-slate-800 text-[11px] leading-none">${res.contributor_name || 'Unknown'}</span>
                        <span class="block text-[10px] text-slate-400">${res.college_name || 'Engineering Institute'}</span>
                    </div>
                </div>
                <span class="text-[11px] text-slate-400 whitespace-nowrap">${dateStr}</span>
                <div class="flex items-center gap-3 text-[11px] text-slate-500">
                    <span class="flex items-center gap-1" title="Views">👁 ${res.views || 0}</span>
                    <span class="flex items-center gap-1" title="Downloads">↓ ${res.downloads || 0}</span>
                </div>
                <button class="text-slate-400 hover:text-blue-600 transition p-1" onclick="toggleBookmark(${res.id}, this)" title="Save to Vault">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function toggleBookmark(id, btnElement) {
    if (!localStorage.getItem('token')) {
        alert('Please login to save resources.');
        window.location.href = '/login.html';
        return;
    }
    try {
        const data = await window.api.post(`/resources/${id}/bookmark`);
        if (data.bookmarked) {
            btnElement.classList.remove('text-slate-400');
            btnElement.classList.add('text-blue-600', 'fill-current');
            showToast('Saved to My Vault!');
        } else {
            btnElement.classList.add('text-slate-400');
            btnElement.classList.remove('text-blue-600', 'fill-current');
            showToast('Removed from My Vault');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}
