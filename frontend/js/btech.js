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
        card.className = 'bg-white rounded-xl border border-slate-200/90 p-4 hover:shadow-md transition-shadow relative';
        
        let typeBadgeColor = 'bg-blue-600';
        let typeLabel = 'DOC';
        if (res.file_path && res.file_path.toLowerCase().endsWith('.pdf')) {
            typeBadgeColor = 'bg-red-500';
            typeLabel = 'PDF';
        } else if (res.file_path && res.file_path.toLowerCase().endsWith('.zip')) {
            typeBadgeColor = 'bg-amber-500';
            typeLabel = 'ZIP';
        }

        // Bookmark check icon
        // Simplification: Not checking actual state yet in this loop for speed
        const bookmarkSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>`;

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                <span class="w-9 h-9 rounded-lg ${typeBadgeColor} text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 shadow-xs">
                  ${typeLabel}
                </span>
                <div>
                  <h3 class="font-bold text-slate-900 text-sm hover:text-brand-600 cursor-pointer" onclick="window.location.href='/resource.html?id=${res.id}'">${res.title}</h3>
                  <p class="text-xs text-slate-500 mt-0.5">${res.description || ''}</p>
                  <div class="flex gap-1.5 mt-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">${res.resource_type_name || 'Resource'}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-brand-600 border border-blue-100">${res.semester_name || 'General'}</span>
                  </div>
                </div>
              </div>
              <button class="text-slate-400 hover:text-slate-600" onclick="toggleBookmark(${res.id}, this)">
                ${bookmarkSvg}
              </button>
            </div>
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-[10px] uppercase">${(res.contributor_name || 'U').charAt(0)}</div>
                <div>
                  <span class="font-medium text-slate-800">${res.contributor_name || 'Unknown'}</span>
                  <span class="text-[10px] text-slate-400 block -mt-0.5">${res.college_name || ''}</span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  ${res.views || 0}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  ${res.downloads || 0}
                </span>
              </div>
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
