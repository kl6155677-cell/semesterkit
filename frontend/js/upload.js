document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    if (!localStorage.getItem('token')) {
        alert('You must be logged in to upload resources.');
        window.location.href = '/login.html';
        return;
    }

    const uploadForm = document.querySelector('form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Populate data
    await populateSelects();
    
    // Listen for file changes to show name
    const fileInput = document.getElementById('upload-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const dropzoneText = document.querySelector('#upload-dropzone p:first-of-type');
                if (dropzoneText) dropzoneText.textContent = `Selected: ${e.target.files[0].name}`;
            }
        });
    }
});

async function populateSelects() {
    try {
        const [colleges, branches, semesters, subjects, resTypes] = await Promise.all([
            window.api.get('/meta/colleges'),
            window.api.get('/meta/branches'),
            window.api.get('/meta/semesters'),
            window.api.get('/meta/subjects'),
            window.api.get('/meta/resource-types')
        ]);

        const populate = (id, data) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '<option value="" disabled selected>Select...</option>' + 
                data.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
        };

        populate('upload-college', colleges);
        populate('upload-branch', branches);
        populate('upload-semester', semesters);
        populate('upload-subject', subjects);

        // Populate Resource Types as buttons
        const labels = Array.from(document.querySelectorAll('label'));
        const typeLabel = labels.find(l => l.textContent.includes('Material Type'));
        const typesContainer = typeLabel ? typeLabel.nextElementSibling : null;

        if (typesContainer && resTypes.length > 0) {
            typesContainer.innerHTML = '';
            resTypes.forEach(rt => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition-all type-btn';
                btn.textContent = rt.name;
                btn.onclick = () => {
                    document.querySelectorAll('.type-btn').forEach(b => {
                        b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700');
                        b.classList.add('border-gray-200', 'bg-white', 'text-gray-700');
                    });
                    btn.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700');
                    btn.classList.remove('border-gray-200', 'bg-white', 'text-gray-700');
                    document.getElementById('upload-resource-type-id').value = rt.id;
                };
                typesContainer.appendChild(btn);
            });
            // Auto-select first
            typesContainer.firstChild.click();
        }
    } catch (e) {
        console.error('Failed to load metadata', e);
    }
}

// polyfill for contains selector
HTMLElement.prototype.containsText = function(text) {
    return this.textContent.includes(text);
};

async function handleUpload(e) {
    e.preventDefault();
    
    if (!localStorage.getItem('token')) {
        alert('You must be logged in to upload resources.');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);
    
    const fileInput = document.getElementById('upload-file-input');
    if (!fileInput || !fileInput.files.length) {
        alert('Please select a file to upload.');
        return;
    }

    if (!document.getElementById('upload-resource-type-id').value) {
        alert('Please select a material type.');
        return;
    }

    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Uploading...';
        submitBtn.disabled = true;

        const data = await window.api.upload('/upload', formData);
        
        alert('Upload successful! It is now pending moderation.');
        form.reset();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // reset dropzone
        const dropzoneText = document.querySelector('#upload-dropzone p:first-of-type');
        if (dropzoneText) dropzoneText.textContent = `Drag & drop your file here`;
    } catch (err) {
        alert('Upload failed: ' + err.message);
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Try Again';
        submitBtn.disabled = false;
    }
}
