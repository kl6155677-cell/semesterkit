document.addEventListener('DOMContentLoaded', () => {
    initMTechPage();
});

let currentFilters = {
    program: 'M.Tech',
    college_id: null,
    branch_id: null,
    semester_id: null,
    subject_id: null,
    resource_type_id: null,
    query: '',
    sort: 'latest',
    page: 1
};

let globalColleges = [];
let globalBranches = [];
let globalSemesters = [];
let globalSubjects = [];

async function initMTechPage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('query')) currentFilters.query = params.get('query');
    if (params.get('college_id')) currentFilters.college_id = params.get('college_id');
    if (params.get('branch_id')) currentFilters.branch_id = params.get('branch_id');
    if (params.get('semester_id')) currentFilters.semester_id = params.get('semester_id');
    if (params.get('type_id')) currentFilters.resource_type_id = params.get('type_id');

    setupFilterEvents();
    loadSidebarFilters();
    await loadResources();
}

async function loadSidebarFilters() {
    if (!window.api) return;
    try {
        const [colleges, branches, semesters, resourceTypes] = await Promise.all([
            window.api.get('/meta/colleges').catch(() => []),
            window.api.get('/meta/branches?program=M.Tech').catch(() => []),
            window.api.get('/meta/semesters?level=M.Tech').catch(() => []),
            window.api.get('/meta/resource-types?program=M.Tech').catch(() => [])
        ]);

        globalColleges = Array.isArray(colleges) ? colleges : [];
        globalBranches = Array.isArray(branches) ? branches : [];
        globalSemesters = Array.isArray(semesters) ? semesters : [];

        const collegeSelect = document.getElementById('filter-college-select');
        if (collegeSelect && globalColleges.length > 0) {
            collegeSelect.innerHTML = `<option value="">Select University</option>` + globalColleges.map(c => `
                <option value="${c.id}" ${currentFilters.college_id == c.id ? 'selected' : ''}>${c.name}</option>
            `).join('');
            if (currentFilters.college_id) {
                collegeSelect.value = currentFilters.college_id;
            }
        }

        const branchSelect = document.getElementById('filter-branch-select');
        if (branchSelect && globalBranches.length > 0) {
            branchSelect.innerHTML = `<option value="">Select Branch</option>` + globalBranches.map(b => `
                <option value="${b.id}" ${currentFilters.branch_id == b.id ? 'selected' : ''}>${b.name}</option>
            `).join('');
            if (currentFilters.branch_id) {
                branchSelect.value = currentFilters.branch_id;
            }
        }

        const semesterSelect = document.getElementById('filter-semester-select');
        if (semesterSelect && globalSemesters.length > 0) {
            semesterSelect.innerHTML = `<option value="">Select Semester</option>` + globalSemesters.map(s => `
                <option value="${s.id}" ${currentFilters.semester_id == s.id ? 'selected' : ''}>${s.name}</option>
            `).join('');
            if (currentFilters.semester_id) {
                semesterSelect.value = currentFilters.semester_id;
            }
        }
    } catch (e) {
        console.warn('Sidebar filter load error:', e);
    }
}

function setupFilterEvents() {
    const collegeSelect = document.getElementById('filter-college-select');
    const collegeSearchInput = document.getElementById('filter-college-search');
    if (collegeSearchInput && collegeSelect) {
        collegeSearchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const filtered = globalColleges.filter(c => !q || c.name.toLowerCase().includes(q));
            collegeSelect.innerHTML = `<option value="">Select University</option>` + filtered.map(c => `
                <option value="${c.id}" ${currentFilters.college_id == c.id ? 'selected' : ''}>${c.name}</option>
            `).join('');
        });
    }

    if (collegeSelect) {
        collegeSelect.addEventListener('change', (e) => {
            currentFilters.college_id = e.target.value || null;
            currentFilters.page = 1;
            loadResources();
        });
    }

    const branchSelect = document.getElementById('filter-branch-select');
    const branchSearchInput = document.getElementById('filter-branch-search');
    if (branchSearchInput && branchSelect) {
        branchSearchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const filtered = globalBranches.filter(b => !q || b.name.toLowerCase().includes(q));
            branchSelect.innerHTML = `<option value="">Select Branch</option>` + filtered.map(b => `
                <option value="${b.id}" ${currentFilters.branch_id == b.id ? 'selected' : ''}>${b.name}</option>
            `).join('');
        });
    }

    if (branchSelect) {
        branchSelect.addEventListener('change', (e) => {
            currentFilters.branch_id = e.target.value || null;
            currentFilters.page = 1;
            loadResources();
        });
    }

    const semesterSelect = document.getElementById('filter-semester-select');
    if (semesterSelect) {
        semesterSelect.addEventListener('change', (e) => {
            currentFilters.semester_id = e.target.value || null;
            currentFilters.page = 1;
            loadResources();
        });
    }

    const subjectSelect = document.getElementById('filter-subject-select');
    if (subjectSelect) {
        subjectSelect.addEventListener('change', (e) => {
            currentFilters.subject_id = e.target.value || null;
            currentFilters.page = 1;
            loadResources();
        });
    }

    // Sort select
    const sortSelect = document.querySelector('select[aria-label*="sort"], select#sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentFilters.sort = e.target.value.toLowerCase().includes('download') ? 'downloads' : (e.target.value.toLowerCase().includes('view') ? 'views' : 'latest');
            loadResources();
        });
    }
}

async function loadResources() {
    const container = document.getElementById('resources-grid') || document.querySelector('.space-y-2\\.5, .space-y-3, main .grid.grid-cols-1');
    if (!container) return;

    container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
            <div class="inline-block animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
            <p class="text-xs">Loading approved M.Tech research papers & notes...</p>
        </div>
    `;

    try {
        let endpoint = `/resources?program=M.Tech&sort=${currentFilters.sort}&page=${currentFilters.page}&limit=12`;
        if (currentFilters.query) endpoint += `&query=${encodeURIComponent(currentFilters.query)}`;
        if (currentFilters.college_id) endpoint += `&college_id=${currentFilters.college_id}`;
        if (currentFilters.branch_id) endpoint += `&branch_id=${currentFilters.branch_id}`;
        if (currentFilters.semester_id) endpoint += `&semester_id=${currentFilters.semester_id}`;
        if (currentFilters.subject_id) endpoint += `&subject_id=${currentFilters.subject_id}`;
        if (currentFilters.resource_type_id) endpoint += `&resource_type_id=${currentFilters.resource_type_id}`;

        const data = await window.api.get(endpoint);
        renderResources(data, container);
    } catch (err) {
        container.innerHTML = `<div class="p-6 text-center text-red-500 text-sm">Error: ${err.message}</div>`;
    }
}

function renderResources(data, container) {
    const list = Array.isArray(data) ? data : (data && data.resources ? data.resources : []);
    const total = (data && data.total !== undefined) ? data.total : list.length;
    const totalPages = (data && data.totalPages !== undefined) ? data.totalPages : Math.max(1, Math.ceil(total / 12));
    const currentPage = (data && data.page) || currentFilters.page || 1;

    renderPagination(currentPage, totalPages, total);

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <p class="text-sm font-semibold text-slate-700">No M.Tech resources found</p>
                <p class="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    list.forEach(res => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0';
        
        let typeBadgeColor = 'bg-blue-600';
        let typeLabel = (res.file_type || 'DOC').toUpperCase();
        if (typeLabel === 'PDF') typeBadgeColor = 'bg-red-500';
        else if (typeLabel === 'ZIP' || typeLabel === 'RAR') typeBadgeColor = 'bg-amber-500';

        const dateStr = new Date(res.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const firstLetter = (res.contributor_name || 'U').charAt(0).toUpperCase();

        card.innerHTML = `
            <div class="flex items-start gap-3 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-lg ${typeBadgeColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs uppercase">
                    ${typeLabel}
                </div>
                <div class="space-y-1 min-w-0 flex-1">
                    <h3 class="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition break-words" onclick="window.location.href='/resource.html?id=${res.id}'">
                        ${escapeHtml(res.title)}
                    </h3>
                    <p class="text-[11px] text-slate-500 leading-tight line-clamp-1 break-words">
                        ${escapeHtml(res.description || 'No description provided.')}
                    </p>
                    <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span class="px-2 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 font-medium">${escapeHtml(res.resource_type_name || 'Resource')}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-medium">${escapeHtml(res.subject_name || res.semester_name || 'M.Tech')}</span>
                        ${res.is_featured ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">★ Featured</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-5 shrink-0 text-xs text-slate-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 overflow-hidden font-bold uppercase">
                        ${firstLetter}
                    </div>
                    <div>
                        <span class="block font-semibold text-slate-800 text-[11px] leading-none">${escapeHtml(res.contributor_name || 'Unknown')}</span>
                        <span class="block text-[10px] text-slate-400">${escapeHtml(res.college_name || 'Engineering Institute')}</span>
                    </div>
                </div>
                <span class="text-[11px] text-slate-400 whitespace-nowrap">${dateStr}</span>
                <div class="flex items-center gap-3 text-[11px] text-slate-500">
                    <span class="flex items-center gap-1" title="Views">👁 ${res.views || 0}</span>
                    <button onclick="downloadResource(${res.id})" class="flex items-center gap-1 hover:text-blue-600 font-medium text-slate-600 cursor-pointer" title="Download Material">
                        ↓ ${res.downloads || 0}
                    </button>
                </div>
                <button class="text-slate-400 hover:text-blue-600 transition p-1" onclick="toggleBookmark(${res.id}, this)" title="Save to Vault">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderPagination(currentPage, totalPages, total) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
        paginationContainer.innerHTML = `
            <button class="w-7 h-7 rounded bg-[#0066cc] text-white flex items-center justify-center font-bold shadow-xs">1</button>
        `;
        return;
    }

    let pages = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push('...');
        if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    let html = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} class="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition ${currentPage <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-[#0066cc] cursor-pointer'}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path></svg>
        </button>
    `;

    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="px-1 text-slate-400">...</span>`;
        } else {
            const isCurrent = p === currentPage;
            html += `
                <button onclick="changePage(${p})" class="w-7 h-7 rounded flex items-center justify-center font-semibold transition cursor-pointer ${isCurrent ? 'bg-[#0066cc] text-white shadow-xs' : 'border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}">${p}</button>
            `;
        }
    });

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} class="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition ${currentPage >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-[#0066cc] cursor-pointer'}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path></svg>
        </button>
    `;

    paginationContainer.innerHTML = html;
}

window.changePage = (p) => {
    if (p < 1) return;
    currentFilters.page = p;
    loadResources();
    window.scrollTo({ top: 300, behavior: 'smooth' });
};

window.downloadResource = async (id) => {
    try {
        const data = await window.api.post(`/resources/${id}/download`);
        const url = (data && data.downloadUrl) ? data.downloadUrl : `/api/resources/${id}/download-file`;
        const a = document.createElement('a');
        a.href = url;
        a.download = (data && data.fileName) || 'study_material';
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (typeof showToast === 'function') showToast('Download started!');
    } catch(e) {
        window.location.href = `/api/resources/${id}/download-file`;
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
            if (typeof showToast === 'function') showToast('Saved to My Vault!');
        } else {
            btnElement.classList.add('text-slate-400');
            btnElement.classList.remove('text-blue-600', 'fill-current');
            if (typeof showToast === 'function') showToast('Removed from My Vault');
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}
