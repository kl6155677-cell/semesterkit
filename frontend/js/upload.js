document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.querySelector('form'); // Assume the main form in upload.html is for uploading
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }
});

async function handleUpload(e) {
    e.preventDefault();
    
    // Check auth
    if (!localStorage.getItem('token')) {
        alert('You must be logged in to upload resources.');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);
    
    // If there is no file, we can't upload
    const fileInput = form.querySelector('input[type="file"]');
    if (!fileInput || !fileInput.files.length) {
        alert('Please select a file to upload.');
        return;
    }

    // Since the original UI might not have perfect name attributes for our backend,
    // we may need to manually map them if necessary, but FormData is resilient if name attrs are standard.
    // Assuming name="title", name="description", name="file", name="college_id" etc.
    
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Uploading...';
        submitBtn.disabled = true;

        const data = await window.api.upload('/uploads', formData);
        
        alert('Upload successful! It is now pending moderation.');
        form.reset();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } catch (err) {
        alert('Upload failed: ' + err.message);
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Try Again';
        submitBtn.disabled = false;
    }
}
