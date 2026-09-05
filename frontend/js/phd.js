document.addEventListener('DOMContentLoaded', () => {
    loadResources();
});

async function loadResources() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query') || '';
        
        // We assume PhD specific filtering can be done via API
        const data = await window.api.get(`/resources?query=${query}`);
        renderResources(data);
    } catch (err) {
        console.error('Error loading resources', err);
    }
}

function renderResources(resources) {
    const grids = document.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2.gap-4');
    if (grids.length === 0) return;
    
    const container = grids[0];
    
    if (resources.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center py-10 text-slate-500">No resources found.</div>';
        return;
    }

    container.innerHTML = '';

    resources.forEach(res => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl border border-slate-200/90 p-4 hover:shadow-md transition-shadow relative flex flex-col justify-between h-full group';
        
        const bookmarkSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>`;

        card.innerHTML = `
            <div>
              <div class="flex items-start justify-between gap-3 mb-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                  ${res.resource_type_name || 'Paper'}
                </span>
                <button class="text-slate-400 hover:text-slate-600 transition" onclick="toggleBookmark(${res.id}, this)">
                  ${bookmarkSvg}
                </button>
              </div>
              <h3 class="font-bold text-slate-900 text-[15px] leading-snug group-hover:text-brand-600 transition cursor-pointer line-clamp-2" onclick="window.location.href='/resource.html?id=${res.id}'">${res.title}</h3>
              <p class="text-xs text-slate-500 mt-2 line-clamp-2">${res.description || ''}</p>
            </div>
            
            <div class="mt-4">
              <div class="flex flex-wrap gap-1.5 mb-3">
                <span class="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600">${res.college_name || 'General'}</span>
                <span class="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600">${res.branch_name || 'CS'}</span>
              </div>
              <div class="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] uppercase">${(res.contributor_name || 'U').charAt(0)}</div>
                  <span class="font-medium text-slate-700 truncate max-w-[80px]">${res.contributor_name || 'Unknown'}</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <span class="flex items-center gap-1"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>${res.views || 0}</span>
                  <span class="flex items-center gap-1"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>${res.downloads || 0}</span>
                </div>
              </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function downloadResource(id) {
    try {
        const data = await window.api.post(`/resources/${id}/download`);
        alert('Download ready: ' + data.filePath);
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
