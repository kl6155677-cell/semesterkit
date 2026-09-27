let currentMaxUploadMb = 50;
let tagsList = [];

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

    // Setup Description Char Counter
    setupDescCounter();

    // Material type selection buttons
    setupMaterialTypeButtons();

    // Drag & Drop File Zone and Preview
    setupDropzone();

    // Setup Tags Input
    setupTagInput();

    // Setup College Select Change Listener
    setupCollegeSelect();

    // Populate dynamic selects & settings (Max Upload Size, Colleges, Branches, Semesters)
    await populateDynamicData();
});

function setupDescCounter() {
    const descArea = document.getElementById('upload-description');
    const descCount = document.getElementById('desc-count');
    if (descArea && descCount) {
        descArea.addEventListener('input', () => {
            const len = descArea.value.length;
            descCount.textContent = `${len}/500`;
        });
    }
}

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
    const removeBtn = document.getElementById('preview-remove-btn');

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
                processSelectedFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                processSelectedFile(e.target.files[0]);
            }
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (fileInput) fileInput.value = '';
            hidePreviewCard();
        });
    }
}

function processSelectedFile(file) {
    const fileInput = document.getElementById('upload-file-input');
    if (file.size > currentMaxUploadMb * 1024 * 1024) {
        alert(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${currentMaxUploadMb}MB maximum limit configured in Admin Settings. Please choose a smaller file.`);
        if (fileInput) fileInput.value = '';
        hidePreviewCard();
        return;
    }

    updateDropzoneDisplay(file.name, file.size);
}

function updateDropzoneDisplay(fileName, fileSize) {
    const previewCard = document.getElementById('upload-preview-card');
    const previewFilename = document.getElementById('preview-filename');
    const previewFilesize = document.getElementById('preview-filesize');
    const previewType = document.getElementById('preview-type');

    if (previewCard) {
        previewCard.classList.remove('hidden');
        if (previewFilename) previewFilename.textContent = fileName;
        if (previewFilesize) {
            const sizeMb = (fileSize / (1024 * 1024)).toFixed(2);
            previewFilesize.textContent = `${sizeMb} MB`;
        }
        if (previewType) {
            const ext = fileName.split('.').pop().toUpperCase();
            previewType.textContent = ext.length > 4 ? 'DOC' : ext;
        }
    }
}

function hidePreviewCard() {
    const previewCard = document.getElementById('upload-preview-card');
    const previewFilename = document.getElementById('preview-filename');
    const previewFilesize = document.getElementById('preview-filesize');
    if (previewCard) previewCard.classList.add('hidden');
    if (previewFilename) previewFilename.textContent = 'No file chosen';
    if (previewFilesize) previewFilesize.textContent = '0 MB';
}

function setupCollegeSelect() {
    const collegeSelect = document.getElementById('upload-college');
    const manualWrapper = document.getElementById('manual-college-wrapper');
    const manualInput = document.getElementById('upload-college-manual');

    if (collegeSelect) {
        collegeSelect.addEventListener('change', () => {
            if (collegeSelect.value === 'other') {
                if (manualWrapper) manualWrapper.classList.remove('hidden');
                if (manualInput) {
                    manualInput.required = true;
                    manualInput.focus();
                }
            } else {
                if (manualWrapper) manualWrapper.classList.add('hidden');
                if (manualInput) {
                    manualInput.required = false;
                    manualInput.value = '';
                }
            }
        });
    }
}

function setupTagInput() {
    const tagInput = document.getElementById('tag-input');
    const tagsBox = document.getElementById('tags-box');
    if (!tagInput || !tagsBox) return;

    const addTag = (text) => {
        const cleanTag = text.trim().replace(/^,+|,+$/g, '');
        if (!cleanTag || tagsList.includes(cleanTag)) return;
        tagsList.push(cleanTag);
        renderTags();
        tagInput.value = '';
    };

    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput.value);
        }
    });

    tagInput.addEventListener('blur', () => {
        if (tagInput.value.trim()) {
            addTag(tagInput.value);
        }
    });
}

function renderTags() {
    const tagsBox = document.getElementById('tags-box');
    const tagInput = document.getElementById('tag-input');
    if (!tagsBox || !tagInput) return;

    // Remove existing tag chips
    const existingChips = tagsBox.querySelectorAll('.tag-chip');
    existingChips.forEach(chip => chip.remove());

    // Insert tag chips before tagInput
    tagsList.forEach((tag, idx) => {
        const span = document.createElement('span');
        span.className = 'tag-chip inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-[11px] font-medium';
        span.innerHTML = `${tag} <button class="hover:text-blue-800 ml-0.5 text-xs cursor-pointer" type="button">&times;</button>`;
        span.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            tagsList.splice(idx, 1);
            renderTags();
        });
        tagsBox.insertBefore(span, tagInput);
    });
}

async function populateDynamicData() {
    if (!window.api) return;
    try {
        const [settings, colleges, branches, semesters] = await Promise.all([
            window.api.get('/meta/settings').catch(() => null),
            window.api.get('/meta/colleges').catch(() => []),
            window.api.get('/meta/branches').catch(() => []),
            window.api.get('/meta/semesters').catch(() => [])
        ]);

        // 1. Dynamic Max Upload Size from Admin Settings
        if (settings && settings.max_upload_size_mb) {
            const parsedMb = parseInt(settings.max_upload_size_mb, 10);
            if (!isNaN(parsedMb) && parsedMb > 0) {
                currentMaxUploadMb = parsedMb;
            }
        }

        const sizeHintEl = document.getElementById('upload-max-size-hint');
        if (sizeHintEl) {
            sizeHintEl.textContent = `Supports PDF, DOC, DOCX, ZIP (Max ${currentMaxUploadMb}MB)`;
        }
        const guidelineSizeEl = document.getElementById('upload-guideline-max-size');
        if (guidelineSizeEl) {
            guidelineSizeEl.textContent = `Maximum file size: ${currentMaxUploadMb}MB`;
        }

        // 2. Populate Colleges with "Other / Enter Manually" at the bottom
        const collegeSelect = document.getElementById('upload-college');
        if (collegeSelect && Array.isArray(colleges)) {
            let html = '<option value="">Select University...</option>';
            colleges.forEach(c => {
                html += `<option value="${c.id}">${c.name}</option>`;
            });
            html += '<option value="other">Other / Enter Manually</option>';
            collegeSelect.innerHTML = html;
            if (window.initSearchableDropdown) {
                window.initSearchableDropdown(collegeSelect, '🔍 Search university...');
            }
        }

        // 3. Populate Branches
        const branchSelect = document.getElementById('upload-branch');
        if (branchSelect && Array.isArray(branches)) {
            let html = '<option value="">Select Branch...</option>';
            branches.forEach((b, idx) => {
                html += `<option value="${b.id}" ${idx === 0 ? 'selected' : ''}>${b.name}</option>`;
            });
            branchSelect.innerHTML = html;
            if (window.initSearchableDropdown) {
                window.initSearchableDropdown(branchSelect, '🔍 Search branch...');
            }
        }

        // 4. Populate Semesters
        const semSelect = document.getElementById('upload-semester');
        if (semSelect && Array.isArray(semesters)) {
            let html = '<option value="">Select Semester...</option>';
            semesters.forEach((s, idx) => {
                html += `<option value="${s.id}" ${idx === 0 ? 'selected' : ''}>${s.name}</option>`;
            });
            semSelect.innerHTML = html;
        }

    } catch (e) {
        console.warn('Dynamic data population error:', e);
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
    if (file.size > currentMaxUploadMb * 1024 * 1024) {
        alert(`File size exceeds the maximum limit of ${currentMaxUploadMb}MB configured in Admin Settings. Please compress or select a smaller file.`);
        return;
    }

    // Append manual subject name if provided
    const subjectInput = document.getElementById('upload-subject');
    if (subjectInput && subjectInput.value.trim()) {
        formData.set('subject', subjectInput.value.trim());
        formData.set('subject_name', subjectInput.value.trim());
    }

    // Append manual college name if other is selected
    const collegeSelect = document.getElementById('upload-college');
    const manualCollegeInput = document.getElementById('upload-college-manual');
    if (collegeSelect && collegeSelect.value === 'other') {
        if (!manualCollegeInput || !manualCollegeInput.value.trim()) {
            alert('Please enter your University / College name.');
            manualCollegeInput?.focus();
            return;
        }
        formData.set('college_id', 'other');
        formData.set('manual_college_name', manualCollegeInput.value.trim());
    }

    // Append tags
    if (tagsList.length > 0) {
        formData.set('tags', tagsList.join(', '));
    }

    try {
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button.bg-\\[\\#1a73e8\\], button.bg-blue-600');
        const originalText = submitBtn ? submitBtn.textContent : 'Upload Material';
        if (submitBtn) {
            submitBtn.textContent = 'Uploading to moderation queue...';
            submitBtn.disabled = true;
        }

        await window.api.upload('/upload', formData);
        
        alert('Upload Successful!\n\nYour study material is now PENDING review by the SemesterKit admin team. It will appear publicly once approved.\n\nYou can track moderation status under "My Vault > My Uploads".');
        
        form.reset();
        tagsList = [];
        renderTags();
        hidePreviewCard();
        
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
