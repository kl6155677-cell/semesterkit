document.addEventListener('DOMContentLoaded', () => {
    initBTechPage();
});

let currentFilters = {
    program: 'B.Tech',
    college_id: null,
    branch_id: null,
    semester_id: null,
    resource_type_id: null,
    query: '',
    sort: 'latest',
    page: 1
};

async function initBTechPage() {
    // Read query params from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('query')) currentFilters.query = params.get('query');
    if (params.get('college_id')) currentFilters.college_id = params.get('college_id');
    if (params.get('branch_id')) currentFilters.branch_id = params.get('branch_id');
    if (params.get('semester_id')) currentFilters.semester_id = params.get('semester_id');
    if (params.get('type_id')) currentFilters.resource_type_id = params.get('type_id');

    // Setup filter listeners
    setupFilterEvents();

    // Load filters and resources in parallel for instantaneous load
    loadSidebarFilters();
    await loadResources();
}

async function loadSidebarFilters() {
    if (!window.api) return;
    try {
        const [colleges, branches, semesters, resourceTypes] = await Promise.all([
            window.api.get('/meta/colleges').catch(() => []),
            window.api.get('/meta/branches?program=B.Tech').catch(() => []),
            window.api.get('/meta/semesters?level=B.Tech').catch(() => []),
            window.api.get('/meta/resource-types?program=B.Tech').catch(() => [])
        ]);

        const collegeSelect = document.getElementById('filter-college-select');
        if (collegeSelect && colleges.length > 0) {
            collegeSelect.innerHTML = `<option value="">Select Unit</option>` + colleges.map(c => `
                <option value="${c.id}" ${currentFilters.college_id == c.id ? 'selected' : ''}>${c.name}</option>
            `).join('');
        }

        const branchSelect = document.getElementById('filter-branch-select');
        if (branchSelect && branches.length > 0) {
            branchSelect.innerHTML = `<option value="">Select Branch</option>` + branches.map(b => `
                <option value="${b.id}" ${currentFilters.branch_id == b.id ? 'selected' : ''}>${b.name}</option>
            `).join('');
        }

        const semesterSelect = document.getElementById('filter-semester-select');
        if (semesterSelect && semesters.length > 0) {
            semesterSelect.innerHTML = `<option value="">Select Semester</option>` + semesters.map(s => `
                <option value="${s.id}" ${currentFilters.semester_id == s.id ? 'selected' : ''}>${s.name}</option>
            `).join('');
        }
    } catch (e) {
        console.warn('Sidebar filter load error:', e);
    }
}

function setupFilterEvents() {
    const collegeSelect = document.getElementById('filter-college-select');
    if (collegeSelect) {
        collegeSelect.addEventListener('change', (e) => {
            currentFilters.college_id = e.target.value || null;
            currentFilters.page = 1;
            loadResources();
        });
    }

    const branchSelect = document.getElementById('filter-branch-select');
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

    // Material type pills in header/nav if any
    const typePills = document.querySelectorAll('header .type-pill, nav .type-pill');
    typePills.forEach(pill => {
        pill.addEventListener('click', () => {
            currentFilters.resource_type_id = pill.dataset.id || null;
            loadResources();
        });
    });
}

async function loadResources() {
    const container = document.getElementById('resources-grid') || document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.gap-4, main .grid.grid-cols-1');
    if (!container) return;

    container.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
            <div class="inline-block animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mb-2"></div>
            <p class="text-xs">Loading approved engineering resources...</p>
        </div>
    `;

    try {
        let endpoint = `/resources?program=${currentFilters.program}&sort=${currentFilters.sort}&page=${currentFilters.page}&limit=12`;
        if (currentFilters.query) endpoint += `&query=${encodeURIComponent(currentFilters.query)}`;
        if (currentFilters.college_id) endpoint += `&college_id=${currentFilters.college_id}`;
        if (currentFilters.branch_id) endpoint += `&branch_id=${currentFilters.branch_id}`;
        if (currentFilters.semester_id) endpoint += `&semester_id=${currentFilters.semester_id}`;
        if (currentFilters.resource_type_id) endpoint += `&resource_type_id=${currentFilters.resource_type_id}`;

        const resources = await window.api.get(endpoint);
        renderResources(resources, container);
    } catch (err) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <p class="text-sm font-semibold text-slate-700">Error loading resources: ${err.message}</p>
            </div>
        `;
    }
}

function renderResources(resources, container) {
    if (!resources || resources.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <p class="text-sm font-semibold text-slate-700">No resources found</p>
                <p class="text-xs text-slate-400 mt-1">Try clearing some filters or searching for another subject or college.</p>
                <button onclick="clearFilters()" class="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition">Reset All Filters</button>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    resources.forEach(res => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl border border-slate-200/90 p-4 hover:shadow-md transition-shadow relative flex flex-col justify-between';
        
        let typeBadgeColor = 'bg-blue-600';
        let typeLabel = (res.file_type || 'DOC').toUpperCase();
        if (typeLabel === 'PDF') {
            typeBadgeColor = 'bg-red-500';
        } else if (typeLabel === 'ZIP' || typeLabel === 'RAR') {
            typeBadgeColor = 'bg-amber-500';
        }

        const bookmarkSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>`;
        const firstLetter = (res.contributor_name || 'U').charAt(0).toUpperCase();

        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <span class="w-9 h-9 rounded-lg ${typeBadgeColor} text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 shadow-xs uppercase">
                      ${typeLabel}
                    </span>
                    <div>
                      <h3 class="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer" onclick="window.location.href='/resource.html?id=${res.id}'">${res.title}</h3>
                      <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">${res.description || 'No description provided.'}</p>
                      <div class="flex flex-wrap gap-1.5 mt-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">${res.resource_type_name || 'Resource'}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">${res.semester_name || 'B.Tech'}</span>
                        ${res.is_featured ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">★ Featured</span>` : ''}
                      </div>
                    </div>
                  </div>
                  <button class="text-slate-400 hover:text-blue-600 p-1 transition" onclick="toggleBookmark(${res.id}, this)" title="Save to Vault">
                    ${bookmarkSvg}
                  </button>
                </div>
            </div>
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-[10px] uppercase">${firstLetter}</div>
                <div>
                  <span class="font-medium text-slate-800">${res.contributor_name || 'Anonymous'}</span>
                  <span class="text-[10px] text-slate-400 block -mt-0.5">${res.college_name || 'Engineering College'}</span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1" title="Views">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  ${res.views || 0}
                </span>
                <span class="flex items-center gap-1" title="Downloads">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  ${res.downloads || 0}
                </span>
              </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function clearFilters() {
    currentFilters = {
        program: 'B.Tech',
        college_id: null,
        branch_id: null,
        semester_id: null,
        resource_type_id: null,
        query: '',
        sort: 'latest',
        page: 1
    };
    document.querySelectorAll('.filter-college-cb, .filter-branch-cb').forEach(cb => cb.checked = false);
    loadResources();
}

async function toggleBookmark(id, btnElement) {
    if (!localStorage.getItem('token')) {
        alert('Please login to save resources to your vault.');
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
