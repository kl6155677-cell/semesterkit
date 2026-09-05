document.addEventListener('DOMContentLoaded', () => {
    loadResources();
});

async function loadResources() {
    try {
        // Extract query from URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query') || '';

        const data = await window.api.get(`/resources?query=${query}`);
        renderResources(data);
    } catch (err) {
        console.error('Error loading resources', err);
    }
}

function renderResources(resources) {
    const container = document.getElementById('resources-grid');
    if (!container) return;
    
    if (resources.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">No resources found.</div>';
        return;
    }

    container.innerHTML = ''; // Clear static dummy content

    resources.forEach(res => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3';
        
        let typeBadgeColor = 'bg-blue-600';
        let typeLabel = 'DOC';
        if (res.file_path && res.file_path.toLowerCase().endsWith('.pdf')) {
            typeBadgeColor = 'bg-red-500';
            typeLabel = 'PDF';
        } else if (res.file_path && res.file_path.toLowerCase().endsWith('.zip')) {
            typeBadgeColor = 'bg-amber-500';
            typeLabel = 'ZIP';
        }

        const dateStr = new Date(res.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const firstLetter = (res.contributor_name || 'U').charAt(0).toUpperCase();

        card.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg ${typeBadgeColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
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
                        <span class="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-medium">${res.subject_name || 'General'}</span>
                    </div>
                </div>
            </div>
            <!-- Metadata & Author Details -->
            <div class="flex items-center justify-between sm:justify-end gap-5 shrink-0 text-xs text-slate-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 overflow-hidden font-bold">
                        ${firstLetter}
                    </div>
                    <div>
                        <span class="block font-semibold text-slate-800 text-[11px] leading-none">${res.contributor_name || 'Unknown'}</span>
                        <span class="block text-[10px] text-slate-400">${res.college_name || 'Unknown'}</span>
                    </div>
                </div>
                <span class="text-[11px] text-slate-400 whitespace-nowrap">${dateStr}</span>
                <div class="flex items-center gap-3 text-[11px] text-slate-500">
                    <span class="flex items-center gap-1">👁 ${res.views || 0}</span>
                    <span class="flex items-center gap-1">↓ ${res.downloads || 0}</span>
                </div>
                <button class="text-slate-400 hover:text-slate-700 transition" onclick="toggleBookmark(${res.id}, this)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function downloadResource(id) {
    try {
        const data = await window.api.post(`/resources/${id}/download`);
        // The backend should return the file path or a stream
        alert('Download triggered for: ' + data.filePath); // In a real app, window.open or trigger download link
        // Mock download link trigger
        // window.open(`${CONFIG.API_BASE_URL.replace('/api', '')}/${data.filePath}`);
    } catch (err) {
        alert(err.message);
    }
}

async function toggleBookmark(id, btnElement) {
    try {
        const data = await window.api.post(`/resources/${id}/bookmark`);
        if (data.bookmarked) {
            btnElement.classList.remove('text-slate-400');
            btnElement.classList.add('text-brand-600', 'fill-current');
        } else {
            btnElement.classList.add('text-slate-400');
            btnElement.classList.remove('text-brand-600', 'fill-current');
        }
    } catch (err) {
        if (err.message.includes('Access Denied')) {
            alert('Please login to save resources.');
        } else {
            alert(err.message);
        }
    }
}
