document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    setupSearchHandlers();
    loadGlobalCMSData();
    if (document.getElementById('hero-title') || document.getElementById('stat-resources')) {
        loadHomePageData();
    }
});

// 1. Auth UI & User Navigation Sync
function updateAuthUI() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    try {
        if (token && userStr) user = JSON.parse(userStr);
    } catch(e) {}

    // Find Auth action containers across all headers
    const navRightContainers = document.querySelectorAll('.auth-actions-container, #auth-actions-container, header .auth-container');
    
    navRightContainers.forEach(container => {
        if (user) {
            const displayName = user.name ? user.name.split(' ')[0] : 'Student';
            const initial = displayName.charAt(0).toUpperCase();

            container.innerHTML = `
                <a class="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition" href="/upload.html" title="Upload Material">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </a>
                <a href="/vault.html" class="flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-full hover:bg-gray-100 transition border border-gray-200">
                    <div class="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                        ${initial}
                    </div>
                    <span class="text-xs font-bold text-gray-800 max-w-[70px] sm:max-w-[100px] truncate">${displayName}</span>
                </a>
                <button onclick="logoutUser()" class="px-2 sm:px-3 py-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition" title="Logout">
                    Logout
                </button>
            `;
        } else {
            container.innerHTML = `
                <button class="px-3 sm:px-4 py-1.5 text-xs font-semibold text-[#1d7bf5] hover:text-[#1565d8] transition" type="button" onclick="window.location.href='/login.html'">Login</button>
                <button class="px-3 sm:px-4 py-1.5 bg-[#1d7bf5] hover:bg-[#1565d8] text-white text-xs font-semibold rounded-full shadow-sm transition" type="button" onclick="window.location.href='/register.html'">Sign Up</button>
            `;
        }
    });

    // Intercept all upload CTA buttons if not logged in
    document.querySelectorAll('a[href*="upload.html"], button[onclick*="upload.html"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!localStorage.getItem('token')) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/login.html?redirect=upload.html';
            }
        });
    });
}

function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// 2. Search handlers with debouncing
function setupSearchHandlers() {
    const searchInputs = document.querySelectorAll('input[type="text"][placeholder*="Search"], input[type="search"], #main-search-input');
    searchInputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                e.preventDefault();
                const q = encodeURIComponent(input.value.trim());
                window.location.href = `/btech.html?query=${q}`;
            }
        });
    });

    const searchButtons = document.querySelectorAll('button');
    searchButtons.forEach(btn => {
        if (btn.textContent.trim().toLowerCase() === 'search') {
            btn.addEventListener('click', (e) => {
                const parent = btn.parentElement;
                const input = parent ? parent.querySelector('input') : document.querySelector('#main-search-input');
                if (input && input.value.trim()) {
                    e.preventDefault();
                    const q = encodeURIComponent(input.value.trim());
                    window.location.href = `/btech.html?query=${q}`;
                }
            });
        }
    });
}

// 3. Load Global CMS Data (Header Logo, Footer, Social Links)
async function loadGlobalCMSData() {
    if (!window.api) return;
    try {
        const [settings, footerData] = await Promise.all([
            window.api.get('/meta/settings').catch(() => null),
            window.api.get('/meta/footer').catch(() => null)
        ]);

        if (settings) {
            // Update Site Title / Logo if customized
            if (settings.site_name) {
                document.querySelectorAll('.brand-name').forEach(el => el.textContent = settings.site_name);
            }
            if (settings.search_placeholder) {
                const searchInput = document.getElementById('main-search-input');
                if (searchInput) searchInput.placeholder = settings.search_placeholder;
            }
            // Update SEO Meta tags if available
            if (settings.seo_meta_title && document.title.includes('SemesterKit.com')) {
                document.title = settings.seo_meta_title;
            }
        }

        // Render dynamic footer links if footer columns container exists
        if (footerData && footerData.columns) {
            renderDynamicFooter(footerData.columns, settings);
        }
    } catch (e) {
        console.warn('Global CMS load error:', e);
    }
}

function renderDynamicFooter(columns, settings = {}) {
    const footerColumnsGrid = document.querySelector('footer .lg\\:col-span-5.grid, footer .footer-links-grid');
    if (!footerColumnsGrid) return;

    const columnKeys = Object.keys(columns);
    if (columnKeys.length === 0) return;

    footerColumnsGrid.innerHTML = columnKeys.map(colTitle => `
        <div class="space-y-3">
            <h5 class="text-sm font-semibold text-white">${colTitle}</h5>
            <ul class="space-y-2 text-xs text-gray-400">
                ${columns[colTitle].map(link => `
                    <li><a class="hover:text-white transition" href="${link.url}">${link.title}</a></li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

// 4. Load Homepage Specific Dynamic CMS Data
let currentTestimonialIndex = 0;
let testimonialsData = [];

async function loadHomePageData() {
    if (!window.api) return;

    try {
        const [settings, stats, colleges, contributors, testimonials] = await Promise.all([
            window.api.get('/meta/settings').catch(() => null),
            window.api.get('/meta/stats').catch(() => null),
            window.api.get('/meta/colleges?featured=1').catch(() => null),
            window.api.get('/meta/top-contributors').catch(() => null),
            window.api.get('/meta/testimonials').catch(() => null)
        ]);

        // A. Hero Section Settings
        if (settings) {
            if (settings.hero_title) {
                const titleEl = document.getElementById('hero-title');
                if (titleEl) titleEl.innerHTML = settings.hero_title;
            }
            if (settings.hero_subtitle) {
                const subEl = document.getElementById('hero-subtitle');
                if (subEl) subEl.textContent = settings.hero_subtitle;
            }
            if (settings.hero_badge) {
                const badgeEl = document.querySelector('section .inline-flex.items-center.rounded-full');
                if (badgeEl) badgeEl.textContent = settings.hero_badge;
            }
            if (settings.hero_doodle_text) {
                const doodleEl = document.querySelector('#hero-image-container .font-handwriting, section .font-handwriting');
                if (doodleEl && doodleEl.innerHTML.includes('Students')) {
                    doodleEl.innerHTML = settings.hero_doodle_text;
                }
            }
            if (settings.popular_searches) {
                renderPopularSearches(settings.popular_searches);
            }
            if (settings.hero_image_url && settings.hero_image_url.trim()) {
                const imgContainer = document.getElementById('hero-image-container');
                if (imgContainer) {
                    const svgEl = imgContainer.querySelector('svg.drop-shadow-xl');
                    if (svgEl) {
                        svgEl.parentElement.innerHTML = `<img src="${settings.hero_image_url}" alt="SemesterKit Hero" class="w-80 sm:w-96 h-auto drop-shadow-xl rounded-2xl object-cover" />`;
                    }
                }
            }

            // CTA Section
            if (settings.cta_title) {
                const ctaTitle = document.querySelector('section.max-w-7xl h3.text-lg, section.max-w-7xl h3.text-xl');
                if (ctaTitle) ctaTitle.textContent = settings.cta_title;
            }
            if (settings.cta_description) {
                const ctaDesc = document.querySelector('section.max-w-7xl p.text-xs, section.max-w-7xl p.text-sm');
                if (ctaDesc) ctaDesc.textContent = settings.cta_description;
            }
            if (settings.cta_button_text) {
                const ctaBtn = document.querySelector('section.max-w-7xl button.bg-\\[\\#1d7bf5\\]');
                if (ctaBtn) ctaBtn.textContent = settings.cta_button_text;
            }
        }

        // B. Statistics
        if (stats) {
            if (stats.resources !== undefined && document.getElementById('stat-resources')) document.getElementById('stat-resources').textContent = stats.resources;
            if (stats.users !== undefined && document.getElementById('stat-users')) document.getElementById('stat-users').textContent = stats.users;
            if (stats.colleges !== undefined && document.getElementById('stat-colleges')) document.getElementById('stat-colleges').textContent = stats.colleges;
            if (stats.downloads !== undefined && document.getElementById('stat-downloads')) document.getElementById('stat-downloads').textContent = stats.downloads;
        }

        // C. Top Universities
        const collegesContainer = document.getElementById('top-colleges-container');
        if (colleges && Array.isArray(colleges) && colleges.length > 0) {
            renderTopUniversities(colleges);
        } else if (collegesContainer) {
            collegesContainer.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400 text-xs">No universities listed yet. You can add universities directly from the Admin Panel.</div>';
        }

        // D. Top Contributors (Ranked by approved uploads)
        const contribContainer = document.getElementById('top-contributors-container');
        if (contributors && Array.isArray(contributors) && contributors.length > 0) {
            renderTopContributors(contributors);
        } else if (contribContainer) {
            contribContainer.innerHTML = '<div class="py-8 text-center text-slate-400 text-xs">Top student contributors will appear here as study materials are uploaded and approved.</div>';
        }

        // E. Testimonials Slider
        const testContainer = document.querySelector('.bg-white.rounded-2xl.p-6.sm\\:p-7');
        if (testimonials && Array.isArray(testimonials) && testimonials.length > 0) {
            testimonialsData = testimonials;
            renderTestimonial(0);
            setupTestimonialControls();
        } else if (testContainer) {
            testContainer.innerHTML = `
                <div class="text-center py-8 text-slate-400 text-xs">
                    <p class="font-medium text-slate-600 mb-1">No student reviews published yet.</p>
                    <p>Student reviews and testimonials can be added via the Admin Panel.</p>
                </div>
            `;
        }
    } catch (err) {
        console.warn('Error loading homepage dynamic data:', err);
    }
}

function renderPopularSearches(searchesStr) {
    const container = document.querySelector('.flex.flex-wrap.items-center.gap-2.pt-2');
    if (!container) return;

    const searches = searchesStr.split(',').map(s => s.trim()).filter(Boolean);
    if (searches.length === 0) return;

    container.innerHTML = `
        <span class="font-medium text-gray-500 mr-1">Popular searches:</span>
        ${searches.map(term => `
            <span class="px-3 py-1 bg-white hover:bg-gray-50 rounded-full border border-gray-200 cursor-pointer transition text-xs sm:text-sm text-gray-700" onclick="window.location.href='/btech.html?query=${encodeURIComponent(term)}'">${term}</span>
        `).join('')}
    `;
}

function renderTopUniversities(colleges) {
    const container = document.getElementById('top-colleges-container');
    if (!container) return;

    const bgColors = ['bg-amber-50 text-amber-700 border-amber-100', 'bg-slate-50 text-slate-700 border-slate-100', 'bg-rose-50 text-rose-700 border-rose-100', 'bg-red-50 text-red-700 border-red-100', 'bg-cyan-50 text-cyan-800 border-cyan-100', 'bg-sky-50 text-sky-700 border-sky-100'];

    container.innerHTML = colleges.slice(0, 6).map((c, i) => {
        const style = bgColors[i % bgColors.length];
        const countStr = c.materials_count > 0 ? `${c.materials_count} materials` : 'Explore materials';
        return `
            <div class="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col items-center text-center hover:shadow transition cursor-pointer group" onclick="window.location.href='/btech.html?college_id=${c.id}'">
                <div class="w-16 h-16 rounded-full ${style} border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform overflow-hidden">
                    ${c.logo_url ? `<img src="${c.logo_url}" alt="${c.name}" class="w-full h-full object-cover" />` : `
                        <span class="text-xl font-extrabold uppercase">${c.name.split(' ').map(w => w[0]).slice(0, 3).join('')}</span>
                    `}
                </div>
                <h4 class="text-sm font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition">${c.name}</h4>
                <span class="text-xs text-gray-400 mt-1">${countStr}</span>
            </div>
        `;
    }).join('');
}

function renderTopContributors(contributors) {
    const container = document.getElementById('top-contributors-container');
    if (!container) return;

    const rankColors = ['bg-amber-400 text-white', 'bg-slate-300 text-gray-700', 'bg-amber-600 text-white', 'text-gray-500', 'text-gray-500'];

    container.innerHTML = contributors.map((c, idx) => {
        const rankClass = rankColors[idx] || 'text-gray-500';
        const uploadsCount = c.approved_uploads || 0;
        const uploadStr = uploadsCount === 1 ? '1 upload' : `${uploadsCount} uploads`;
        const initial = (c.name || 'U').charAt(0).toUpperCase();

        return `
            <div class="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition">
                <div class="flex items-center space-x-3">
                    <span class="w-6 h-6 rounded-full ${rankClass} text-xs font-bold flex items-center justify-center">${idx + 1}</span>
                    ${c.avatar_url ? `
                        <img alt="${c.name}" class="w-9 h-9 rounded-full object-cover" src="${c.avatar_url}" />
                    ` : `
                        <div class="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">${initial}</div>
                    `}
                    <div>
                        <h4 class="text-xs sm:text-sm font-bold text-gray-900">${c.name}</h4>
                        <p class="text-[11px] text-gray-400">${c.college_name || 'Engineering Student'}</p>
                    </div>
                </div>
                <span class="text-xs font-semibold text-gray-600">${uploadStr}</span>
            </div>
        `;
    }).join('');
}

function renderTestimonial(index) {
    if (!testimonialsData || testimonialsData.length === 0) return;
    const t = testimonialsData[index];
    const container = document.querySelector('.bg-white.rounded-2xl.p-6.sm\\:p-7');
    if (!container) return;

    const starsHtml = '★'.repeat(Math.min(5, Math.max(1, t.rating || 5)));
    const avatarHtml = t.avatar_url ? `
        <img alt="${t.name}" class="w-full h-full object-cover" src="${t.avatar_url}"/>
    ` : `
        <div class="w-full h-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg">${(t.name || 'S').charAt(0)}</div>
    `;

    const dotsHtml = testimonialsData.map((_, i) => `
        <span onclick="goToTestimonial(${i})" class="w-2 h-2 rounded-full cursor-pointer transition ${i === index ? 'bg-[#1d7bf5]' : 'bg-blue-200'}"></span>
    `).join('');

    container.innerHTML = `
        <div class="flex items-start space-x-4">
            <div class="w-14 h-14 rounded-full overflow-hidden bg-gray-200 shrink-0 border-2 border-white shadow">
                ${avatarHtml}
            </div>
            <div class="space-y-3">
                <blockquote class="text-sm text-gray-600 font-medium leading-relaxed">
                    “${t.review}”
                </blockquote>
                <div>
                    <h4 class="text-sm font-bold text-gray-900">${t.name}</h4>
                    <p class="text-xs text-gray-400 font-medium">${t.college} ${t.branch ? `| ${t.branch}` : ''}</p>
                </div>
                <div class="flex text-amber-400 text-sm tracking-wider">
                    ${starsHtml}
                </div>
            </div>
        </div>
        <button onclick="prevTestimonial()" class="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-800 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <button onclick="nextTestimonial()" class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-800 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <div class="flex justify-center space-x-1.5 pt-2">
            ${dotsHtml}
        </div>
    `;
}

function setupTestimonialControls() {
    window.nextTestimonial = () => {
        if (testimonialsData.length <= 1) return;
        currentTestimonialIndex = (currentTestimonialIndex + 1) % testimonialsData.length;
        renderTestimonial(currentTestimonialIndex);
    };
    window.prevTestimonial = () => {
        if (testimonialsData.length <= 1) return;
        currentTestimonialIndex = (currentTestimonialIndex - 1 + testimonialsData.length) % testimonialsData.length;
        renderTestimonial(currentTestimonialIndex);
    };
    window.goToTestimonial = (idx) => {
        currentTestimonialIndex = idx;
        renderTestimonial(currentTestimonialIndex);
    };
}
