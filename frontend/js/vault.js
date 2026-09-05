document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('acs-credits').textContent = user.acs_credits || 0;

    // Load initial tab
    loadTab('bookmarks');
});

let currentTab = 'bookmarks';

function switchTab(tabName) {
    currentTab = tabName;
    
    // Update UI tabs
    ['bookmarks', 'downloads', 'uploads'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (t === tabName) {
            btn.className = 'px-6 py-4 font-semibold text-brand-600 border-b-2 border-brand-600 whitespace-nowrap';
        } else {
            btn.className = 'px-6 py-4 font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap';
        }
    });

    loadTab(tabName);
}

async function loadTab(tabName) {
    const container = document.getElementById('vault-content');
    container.innerHTML = '<p class="text-gray-500 col-span-full">Loading...</p>';

    try {
        const data = await window.api.get(`/my-vault/${tabName}`);
        
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500 col-span-full">No ${tabName} found.</p>`;
            return;
        }

        container.innerHTML = '';
        data.forEach(res => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow';
            
            // Simple generic card representation for vault
            card.innerHTML = `
                <div class="flex items-start gap-3">
                  <div class="flex-grow">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${res.resource_type_name || 'Material'}</span>
                    <h3 class="font-bold text-slate-900 text-sm mt-1 hover:text-brand-600 cursor-pointer" onclick="window.location.href='/resource.html?id=${res.id}'">${res.title}</h3>
                    <div class="text-xs text-gray-500 mt-2">
                        ${res.college_name || ''} &bull; ${res.subject_name || ''}
                    </div>
                  </div>
                </div>
                ${tabName === 'uploads' ? `<div class="mt-3 pt-2 border-t border-gray-100 text-xs font-bold ${res.status === 'approved' ? 'text-emerald-600' : 'text-amber-500'} uppercase">Status: ${res.status}</div>` : ''}
                ${tabName === 'bookmarks' ? `<button class="mt-3 text-xs font-semibold text-red-500 hover:text-red-600" onclick="removeBookmark(${res.id})">Remove Bookmark</button>` : ''}
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 col-span-full">Error loading data: ${err.message}</p>`;
    }
}

async function downloadResource(id) {
    try {
        const data = await window.api.post(`/resources/${id}/download`);
        alert('Download ready: ' + data.filePath);
    } catch (err) {
        alert(err.message);
    }
}

async function removeBookmark(id) {
    try {
        await window.api.post(`/resources/${id}/bookmark`);
        loadTab('bookmarks'); // Reload
    } catch (err) {
        alert(err.message);
    }
}
