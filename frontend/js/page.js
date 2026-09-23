document.addEventListener('DOMContentLoaded', () => {
    loadStaticPage();
});

async function loadStaticPage() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || 'about-us';
    const container = document.getElementById('page-content-container');

    try {
        const page = await window.api.get(`/meta/pages/${slug}`);
        
        document.title = `${page.title} - SemesterKit.com`;

        // Render Markdown content to HTML
        let htmlContent = page.content
            .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold text-[#0f172a] mb-4 pb-2 border-b border-gray-100">$1</h1>')
            .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-[#0f172a] mt-6 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-[#0f172a] mt-8 mb-3 pb-1 border-b border-gray-100">$1</h2>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-gray-700 leading-relaxed">$1</li>')
            .replace(/\n\n/gim, '<p class="text-gray-700 leading-relaxed my-3"></p>')
            .replace(/\n/gim, '<br/>');

        container.innerHTML = `
            <div class="prose max-w-none">
                ${htmlContent}
            </div>
            <div class="pt-8 mt-8 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                <span>Last updated: ${new Date(page.updated_at || page.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <a href="index.html" class="text-[#1d7bf5] font-bold hover:underline">← Back to Home</a>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
                <p class="text-gray-500 text-sm mb-6">${err.message || 'The requested informational page could not be located.'}</p>
                <a href="index.html" class="px-5 py-2.5 bg-[#1d7bf5] text-white text-xs font-bold rounded-xl shadow">Return Home</a>
            </div>
        `;
    }
}
