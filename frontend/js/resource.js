document.addEventListener('DOMContentLoaded', () => {
    loadResourceDetail();
});

async function loadResourceDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const container = document.getElementById('resource-container');

    if (!id) {
        if (container) container.innerHTML = '<div class="p-8 text-center text-red-500 font-semibold">Resource ID is missing in URL. <a href="/btech.html" class="underline">Browse Resources</a></div>';
        return;
    }

    try {
        const res = await window.api.get(`/resources/${id}`);
        
        let typeBadgeColor = 'bg-blue-600';
        let typeLabel = (res.file_type || 'DOC').toUpperCase();
        if (typeLabel === 'PDF') typeBadgeColor = 'bg-red-500';
        else if (typeLabel === 'ZIP' || typeLabel === 'RAR') typeBadgeColor = 'bg-amber-500';

        const sizeStr = res.file_size ? `${(res.file_size / (1024 * 1024)).toFixed(1)} MB` : 'PDF / DOC';
        const dateStr = new Date(res.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const initial = (res.contributor_name || 'U').charAt(0).toUpperCase();

        if (container) {
            container.innerHTML = `
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <div class="flex items-center gap-2 mb-3">
                            <span class="inline-block px-3 py-1 ${typeBadgeColor} text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs">${typeLabel}</span>
                            <span class="inline-block px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-bold uppercase tracking-wider">${res.resource_type_name || 'Material'}</span>
                            <span class="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">${res.program || 'Engineering'}</span>
                        </div>
                        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">${res.title}</h1>
                    </div>
                    <button class="flex flex-col items-center justify-center p-3 rounded-full hover:bg-gray-100 transition" onclick="toggleBookmark(${res.id}, this)" title="Save Resource">
                        <svg class="w-6 h-6 text-gray-400 hover:text-brand-600 transition" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                        <span class="text-[10px] text-gray-500 mt-1 font-semibold">Save</span>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="md:col-span-2 space-y-4">
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            <h3 class="font-bold text-slate-900 text-sm">Resource Description</h3>
                            <p class="text-gray-700 leading-relaxed text-sm">${res.description || 'No detailed description provided.'}</p>
                            
                            ${res.tags ? `
                                <div class="pt-3 border-t border-gray-100">
                                    <span class="text-xs font-bold text-gray-400 block mb-2">TAGS & KEYWORDS</span>
                                    <div class="flex flex-wrap gap-1.5">
                                        ${res.tags.split(',').map(t => `<span class="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">${t.trim()}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div><span class="text-gray-500 block mb-0.5 font-medium">University:</span> <span class="font-bold text-gray-900">${res.college_name || '-'}</span></div>
                            <div><span class="text-gray-500 block mb-0.5 font-medium">Branch:</span> <span class="font-bold text-gray-900">${res.branch_name || '-'}</span></div>
                            <div><span class="text-gray-500 block mb-0.5 font-medium">Semester:</span> <span class="font-bold text-gray-900">${res.semester_name || '-'}</span></div>
                            <div><span class="text-gray-500 block mb-0.5 font-medium">Subject:</span> <span class="font-bold text-gray-900">${res.subject_name || '-'}</span></div>
                        </div>
                    </div>

                    <!-- Right Download Card -->
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
                        <div>
                            <div class="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Document Overview</div>
                            <div class="space-y-3 text-xs text-gray-600">
                                <div class="flex justify-between"><span>Format:</span> <span class="font-bold text-gray-900 uppercase">${typeLabel}</span></div>
                                <div class="flex justify-between"><span>Size:</span> <span class="font-bold text-gray-900">${sizeStr}</span></div>
                                <div class="flex justify-between"><span>Uploaded:</span> <span class="font-bold text-gray-900">${dateStr}</span></div>
                                <div class="flex justify-between"><span>Views:</span> <span class="font-bold text-blue-600">${res.views || 0}</span></div>
                                <div class="flex justify-between"><span>Downloads:</span> <span class="font-bold text-emerald-600">${res.downloads || 0}</span></div>
                            </div>
                        </div>
                        <button onclick="downloadResource(${res.id})" class="w-full py-3.5 bg-[#1d7bf5] hover:bg-[#1565d8] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download Study Material
                        </button>
                    </div>
                </div>

                <!-- Footer Contributor Info & Feedback -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm uppercase shadow-xs">${initial}</div>
                        <div>
                            <div class="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Uploaded By</div>
                            <div class="font-bold text-gray-900 text-sm">${res.contributor_name || 'Engineering Student'}</div>
                            <div class="text-[11px] text-gray-500">${res.college_name || 'Academic Contributor'}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-semibold text-gray-600">Was this resource helpful?</span>
                        <button onclick="submitFeedback(${res.id}, true)" class="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-xs transition flex items-center gap-1.5 border border-emerald-100">
                            <span>👍 Yes</span> <span id="helpful-yes-count">(${res.helpful_yes || 0})</span>
                        </button>
                        <button onclick="submitFeedback(${res.id}, false)" class="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition flex items-center gap-1.5 border border-rose-100">
                            <span>👎 No</span> <span id="helpful-no-count">(${res.helpful_no || 0})</span>
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        if (container) container.innerHTML = `<div class="p-8 text-center text-red-500 font-semibold">Error loading resource: ${err.message}. <br/><a href="/btech.html" class="underline mt-2 inline-block">Browse All Resources</a></div>`;
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

async function toggleBookmark(id, btnElement) {
    if (!localStorage.getItem('token')) {
        alert('Please login to bookmark materials to your vault.');
        window.location.href = '/login.html';
        return;
    }
    try {
        const data = await window.api.post(`/resources/${id}/bookmark`);
        const svg = btnElement.querySelector('svg');
        if (data.bookmarked) {
            svg.classList.remove('text-gray-400');
            svg.classList.add('text-brand-600', 'fill-current');
            showToast('Saved to My Vault!');
        } else {
            svg.classList.add('text-gray-400');
            svg.classList.remove('text-brand-600', 'fill-current');
            showToast('Removed from My Vault');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function submitFeedback(id, helpful) {
    try {
        await window.api.post(`/resources/${id}/feedback`, { helpful });
        showToast('Thank you for your feedback!');
        const yesEl = document.getElementById('helpful-yes-count');
        const noEl = document.getElementById('helpful-no-count');
        if (helpful && yesEl) {
            const count = parseInt(yesEl.textContent.replace(/\D/g, '') || 0, 10) + 1;
            yesEl.textContent = `(${count})`;
        } else if (!helpful && noEl) {
            const count = parseInt(noEl.textContent.replace(/\D/g, '') || 0, 10) + 1;
            noEl.textContent = `(${count})`;
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}
