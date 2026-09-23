document.addEventListener('DOMContentLoaded', async () => {
    // Strict Auth Check - unauthenticated users must login first
    if (!localStorage.getItem('token')) {
        window.location.replace('/login.html?redirect=upload.html');
        return;
    }

    const uploadForm = document.getElementById('upload-form') || document.querySelector('form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Material type selection buttons
    setupMaterialTypeButtons();

    // Drag & Drop File Zone
    setupDropzone();

    // Populate dynamic selects
    await populateDynamicSelects();
});

function setupMaterialTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-btn');
    const resourceTypeHidden = document.getElementById('upload-resource-type-id');

    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => {
                b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700', 'shadow-sm');
                b.classList.add('border-gray-200', 'bg-white', 'text-gray-700');
            });
            btn.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700', 'shadow-sm');
            btn.classList.remove('border-gray-200', 'bg-white', 'text-gray-700');
            if (resourceTypeHidden && btn.dataset.id) {
                resourceTypeHidden.value = btn.dataset.id;
            }
        });
    });
}

function setupDropzone() {
    const fileInput = document.getElementById('upload-file-input');
    const dropzone = document.getElementById('upload-dropzone') || document.querySelector('.border-dashed');
    
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', (e) => {
            if (e.target !== fileInput) fileInput.click();
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('border-blue-500', 'bg-blue-50/50');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                updateDropzoneDisplay(e.dataTransfer.files[0].name, e.dataTransfer.files[0].size);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                updateDropzoneDisplay(e.target.files[0].name, e.target.files[0].size);
            }
        });
    }
}

function updateDropzoneDisplay(fileName, fileSize) {
    const dropzone = document.getElementById('upload-dropzone') || document.querySelector('.border-dashed');
    if (!dropzone) return;
    const p = dropzone.querySelector('p, div.text-xs');
    const sizeMb = (fileSize / (1024 * 1024)).toFixed(2);
    if (p) {
        p.innerHTML = `<span class="font-bold text-blue-600">Selected File:</span> <span class="text-slate-800 font-semibold">${fileName}</span> <span class="text-slate-400 text-xs">(${sizeMb} MB)</span>`;
    }
}

async function populateDynamicSelects() {
    if (!window.api) return;
    try {
        const [colleges, branches, semesters, subjects, resourceTypes] = await Promise.all([
            window.api.get('/meta/colleges').catch(() => []),
            window.api.get('/meta/branches').catch(() => []),
            window.api.get('/meta/semesters').catch(() => []),
            window.api.get('/meta/subjects').catch(() => []),
            window.api.get('/meta/resource-types').catch(() => [])
        ]);

        const populateSelect = (selectId, data) => {
            const el = document.getElementById(selectId);
            if (!el || !Array.isArray(data) || data.length === 0) return;
            const currentVal = el.value;
            el.innerHTML = '<option value="">Select...</option>' + 
                data.map((item, idx) => `<option value="${item.id}" ${idx === 0 ? 'selected' : ''}>${item.name}</option>`).join('');
            if (currentVal) el.value = currentVal;
        };

        populateSelect('upload-college', colleges);
        populateSelect('upload-branch', branches);
        populateSelect('upload-semester', semesters);
        populateSelect('upload-subject', subjects);

        // Dynamic Subjects Cascade
        const branchSelect = document.getElementById('upload-branch');
        const semSelect = document.getElementById('upload-semester');
        const subjectSelect = document.getElementById('upload-subject');

        const updateCascadeSubjects = async () => {
            if (!subjectSelect) return;
            const bId = branchSelect ? branchSelect.value : null;
            const sId = semSelect ? semSelect.value : null;
            let query = '/meta/subjects?';
            if (bId) query += `branch_id=${bId}&`;
            if (sId) query += `semester_id=${sId}`;

            const filteredSubjects = await window.api.get(query).catch(() => []);
            if (filteredSubjects.length > 0) {
                subjectSelect.innerHTML = '<option value="">Select Subject...</option>' +
                    filteredSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            }
        };

        if (branchSelect) branchSelect.addEventListener('change', updateCascadeSubjects);
        if (semSelect) semSelect.addEventListener('change', updateCascadeSubjects);

    } catch (e) {
        console.warn('Select population error:', e);
    }
}

async function handleUpload(e) {
    e.preventDefault();
    
    if (!localStorage.getItem('token')) {
        alert('Please login to upload resources.');
        window.location.href = '/login.html';
        return;
    }

    const form = e.target;
    const formData = new FormData(form);
    
    const fileInput = document.getElementById('upload-file-input');
    if (!fileInput || !fileInput.files.length) {
        alert('Please select a file to upload.');
        return;
    }

    const file = fileInput.files[0];
    if (file.size > 50 * 1024 * 1024) {
        alert('File size exceeds the 50MB limit. Please compress or select a smaller file.');
        return;
    }

    try {
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button.bg-\\[\\#1a73e8\\], button.bg-blue-600');
        const originalText = submitBtn ? submitBtn.textContent : 'Publish Material';
        if (submitBtn) {
            submitBtn.textContent = 'Uploading to moderation queue...';
            submitBtn.disabled = true;
        }

        const res = await window.api.upload('/upload', formData);
        
        alert('Upload Successful!\n\nYour study material is now PENDING review by the SemesterKit admin team. It will appear publicly once approved.\n\nYou can track moderation status under "My Vault > My Uploads".');
        
        form.reset();
        
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }

        window.location.href = '/vault.html';
    } catch (err) {
        alert('Upload failed: ' + err.message);
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button.bg-\\[\\#1a73e8\\], button.bg-blue-600');
        if (submitBtn) {
            submitBtn.textContent = 'Try Again';
            submitBtn.disabled = false;
        }
    }
}
