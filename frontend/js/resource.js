document.addEventListener('DOMContentLoaded', () => {
    loadResourceDetail();
});

async function loadResourceDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const container = document.getElementById('resource-container');

    if (!id) {
        container.innerHTML = '<p class="text-red-500">Resource ID is missing in URL.</p>';
        return;
    }

    try {
        const res = await window.api.get(`/resources/${id}`);
        
        container.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <div>
                    <span class="inline-block px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-bold uppercase tracking-wider mb-3">${res.resource_type_name || 'Material'}</span>
                    <h1 class="text-3xl font-extrabold text-[#0f172a]">${res.title}</h1>
                </div>
                <button class="flex flex-col items-center justify-center p-3 rounded-full hover:bg-gray-50 transition" onclick="toggleBookmark(${res.id}, this)">
                    <svg class="w-6 h-6 text-gray-400 hover:text-brand-600 transition" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    <span class="text-[10px] text-gray-500 mt-1 font-semibold">Save</span>
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="md:col-span-2 space-y-4">
                    <p class="text-gray-700 leading-relaxed">${res.description || 'No description provided.'}</p>
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                        <div><span class="text-gray-500 block mb-0.5">College:</span> <span class="font-semibold text-gray-900">${res.college_name || '-'}</span></div>
                        <div><span class="text-gray-500 block mb-0.5">Branch:</span> <span class="font-semibold text-gray-900">${res.branch_name || '-'}</span></div>
                        <div><span class="text-gray-500 block mb-0.5">Semester:</span> <span class="font-semibold text-gray-900">${res.semester_name || '-'}</span></div>
                        <div><span class="text-gray-500 block mb-0.5">Subject:</span> <span class="font-semibold text-gray-900">${res.subject_name || '-'}</span></div>
                    </div>
                </div>
                <div class="bg-gray-50 p-5 rounded-xl border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div class="text-sm font-semibold text-gray-900 mb-4">Stats</div>
                        <div class="flex items-center gap-2 mb-2 text-gray-600 text-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            ${res.views} Views
                        </div>
                        <div class="flex items-center gap-2 mb-4 text-gray-600 text-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            ${res.downloads} Downloads
                        </div>
                    </div>
                    <button onclick="downloadResource(${res.id})" class="w-full py-3 bg-[#1d7bf5] hover:bg-[#1565d8] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Download File
                    </button>
                </div>
            </div>

            <div class="border-t border-gray-100 pt-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm uppercase">${(res.contributor_name || 'U').charAt(0)}</div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wider font-bold">Uploaded By</div>
                        <div class="font-semibold text-gray-900">${res.contributor_name || 'Unknown'}</div>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-sm font-semibold text-gray-500">Was this helpful?</span>
                    <button onclick="submitFeedback(${res.id}, true)" class="px-4 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-bold text-sm transition">Yes (${res.helpful_yes || 0})</button>
                    <button onclick="submitFeedback(${res.id}, false)" class="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm transition">No (${res.helpful_no || 0})</button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-red-500">Error loading resource: ${err.message}</p>`;
    }
}

async function downloadResource(id) {
    try {
        const data = await window.api.post(`/resources/${id}/download`);
        alert('Download ready: ' + data.filePath);
    } catch (err) {
        if(err.message.includes('Access Denied')){
            alert('Please login to download resources.');
            window.location.href='/login.html';
        }else {
            alert(err.message);
        }
    }
}

async function toggleBookmark(id, btnElement) {
    try {
        const data = await window.api.post(`/resources/${id}/bookmark`);
        const svg = btnElement.querySelector('svg');
        if (data.bookmarked) {
            svg.classList.remove('text-gray-400');
            svg.classList.add('text-brand-600', 'fill-current');
        } else {
            svg.classList.add('text-gray-400');
            svg.classList.remove('text-brand-600', 'fill-current');
        }
    } catch (err) {
        if (err.message.includes('Access Denied')) {
            alert('Please login to save resources.');
        } else {
            alert(err.message);
        }
    }
}

async function submitFeedback(id, helpful) {
    try {
        await window.api.post(`/resources/${id}/feedback`, { helpful });
        alert('Thank you for your feedback!');
        loadResourceDetail(); // reload to update counts
    } catch (err) {
        alert(err.message);
    }
}
