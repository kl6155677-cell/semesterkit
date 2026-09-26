document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html?redirect=vault.html';
        return;
    }

    await loadVaultUserHeader();
    const params = new URLSearchParams(window.location.search);
    const initialTab = params.get('tab') || 'bookmarks';
    switchTab(initialTab);
});

let currentTab = 'bookmarks';

async function loadVaultUserHeader() {
    try {
        const [me, summary] = await Promise.all([
            window.api.get('/auth/me'),
            window.api.get('/my-vault/summary')
        ]);

        const nameEl = document.querySelector('.vault-user-name') || document.querySelector('h1.text-3xl');
        if (nameEl) nameEl.textContent = me.name;

        const emailEl = document.querySelector('.vault-user-email');
        if (emailEl) emailEl.textContent = me.email;

        const approvedEl = document.getElementById('stat-approved-uploads');
        if (approvedEl) approvedEl.textContent = summary.approvedUploadsCount || 0;

        const pendingEl = document.getElementById('stat-pending-uploads');
        if (pendingEl) pendingEl.textContent = summary.pendingUploadsCount || 0;

        const bookmarksEl = document.getElementById('stat-bookmarks-count');
        if (bookmarksEl) bookmarksEl.textContent = summary.bookmarksCount || 0;

    } catch (e) {
        console.warn('Vault header load warning:', e);
    }
}

function switchTab(tabName) {
    currentTab = tabName;
    
    ['bookmarks', 'downloads', 'uploads'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (!btn) return;
        if (t === tabName) {
            btn.className = 'px-6 py-4 font-bold text-brand-600 border-b-2 border-brand-600 whitespace-nowrap text-sm';
        } else {
            btn.className = 'px-6 py-4 font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap text-sm transition';
        }
    });

    loadTab(tabName);
}

async function loadTab(tabName) {
    const container = document.getElementById('vault-content');
    if (!container) return;

    container.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
            <div class="inline-block animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mb-2"></div>
            <p class="text-xs">Loading ${tabName}...</p>
        </div>
    `;

    try {
        const data = await window.api.get(`/my-vault/${tabName}`);
        
        if (!data || data.length === 0) {
            let emptyMsg = `No ${tabName} found.`;
            if (tabName === 'uploads') emptyMsg = `You haven't uploaded any study materials yet.`;
            if (tabName === 'bookmarks') emptyMsg = `You haven't saved any resources to your vault yet.`;
            if (tabName === 'downloads') emptyMsg = `No download history recorded.`;

            container.innerHTML = `
                <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                    <p class="text-sm font-semibold text-slate-700">${emptyMsg}</p>
                    <a href="/${tabName === 'uploads' ? 'upload.html' : 'btech.html'}" class="inline-block mt-4 px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-xs font-bold hover:bg-brand-100 transition">
                        ${tabName === 'uploads' ? 'Upload Your First Material' : 'Explore Study Materials'}
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        data.forEach(res => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-md transition flex flex-col justify-between space-y-4';
            
            let statusBadge = '';
            if (tabName === 'uploads') {
                if (res.status === 'approved') {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Approved & Published</span>`;
                } else if (res.status === 'pending') {
                    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ Pending Admin Moderation</span>`;
                } else if (res.status === 'rejected') {
                    statusBadge = `
                        <div class="space-y-1">
                            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">✕ Rejected</span>
                            ${res.rejection_reason ? `<p class="text-[11px] text-rose-600 font-medium">Reason: ${res.rejection_reason}</p>` : ''}
                        </div>
                    `;
                }
            }

            let typeBadgeColor = 'bg-blue-600';
            let typeLabel = (res.file_type || 'DOC').toUpperCase();
            if (typeLabel === 'PDF') typeBadgeColor = 'bg-red-500';
            else if (typeLabel === 'ZIP' || typeLabel === 'RAR') typeBadgeColor = 'bg-amber-500';

            card.innerHTML = `
                <div>
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-lg ${typeBadgeColor} text-white font-bold text-[10px] flex items-center justify-center uppercase shadow-xs">${typeLabel}</span>
                            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">${res.resource_type_name || 'Material'}</span>
                        </div>
                        ${tabName === 'bookmarks' ? `
                            <button class="text-rose-500 hover:text-rose-700 text-xs font-semibold" onclick="removeBookmark(${res.id})" title="Remove Bookmark">
                                Remove
                            </button>
                        ` : ''}
                    </div>
                    <h3 class="font-bold text-slate-900 text-sm mt-1 hover:text-brand-600 cursor-pointer" onclick="${res.status === 'approved' ? `window.location.href='/resource.html?id=${res.id}'` : ''}">${res.title}</h3>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">${res.description || 'No description provided.'}</p>
                    <div class="text-xs text-gray-400 mt-3 flex flex-wrap gap-2">
                        <span class="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">${res.college_name || 'Institute'}</span>
                        <span class="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">${res.subject_name || res.semester_name || 'Engineering'}</span>
                    </div>
                </div>
                <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>${statusBadge}</div>
                    ${res.status === 'approved' ? `
                        <button onclick="downloadResource(${res.id})" class="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-bold rounded-lg transition flex items-center gap-1">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download
                        </button>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 col-span-full py-8 text-center text-sm">Error: ${err.message}</p>`;
    }
}

async function downloadResource(id) {
    try {
        const data = await window.api.post(`/resources/${id}/download`);
        if (data && data.filePath) {
            showToast('Download started!');
            const a = document.createElement('a');
            a.href = `/${data.filePath}`;
            a.download = data.fileName || 'study_material';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeBookmark(id) {
    try {
        await window.api.post(`/resources/${id}/bookmark`);
        showToast('Bookmark removed');
        loadTab('bookmarks');
        loadVaultUserHeader();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
