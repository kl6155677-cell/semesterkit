document.addEventListener('DOMContentLoaded', () => {
    // Check auth
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

    loadPendingResources();
});

async function loadPendingResources() {
    const container = document.getElementById('admin-content');
    container.innerHTML = '<p class="text-gray-500">Loading pending resources...</p>';

    try {
        const data = await window.api.get('/admin/pending');
        
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500">No pending resources to moderate.</p>`;
            return;
        }

        container.innerHTML = '';
        data.forEach(res => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm';
            
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-slate-900">${res.title}</h3>
                        <p class="text-sm text-gray-500 mt-1">${res.description || 'No description'}</p>
                        <div class="text-xs text-gray-400 mt-2">
                            Type: ${res.resource_type_name || '-'} | 
                            College: ${res.college_name || '-'} | 
                            Subject: ${res.subject_name || '-'}
                        </div>
                        <div class="text-xs text-gray-400 mt-1">
                            Uploaded by: ${res.contributor_name || 'Unknown'} | 
                            File: <a href="#" onclick="alert('File preview: ${res.file_path}')" class="text-blue-500 underline">Preview</a>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="moderate(${res.id}, 'approve')" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-sm">Approve</button>
                        <button onclick="moderate(${res.id}, 'reject')" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-bold text-sm">Reject</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p class="text-red-500">Error loading data: ${err.message}</p>`;
    }
}

async function moderate(id, action) {
    if (!confirm(`Are you sure you want to ${action} this resource?`)) return;
    try {
        await window.api.post(`/admin/moderate/${id}`, { action });
        alert(`Resource ${action}d successfully`);
        loadPendingResources();
    } catch (err) {
        alert(err.message);
    }
}
