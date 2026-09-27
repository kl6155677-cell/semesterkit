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
                <div class="flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap">
                    <a class="p-1 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition shrink-0" href="/upload.html" title="Upload Material">
                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    </a>
                    <a href="/vault.html" class="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-full hover:bg-gray-100 transition border border-gray-200 shrink-0" title="My Vault">
                        <div class="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            ${initial}
                        </div>
                        <span class="text-xs font-bold text-gray-800 hidden sm:inline-block max-w-[80px] sm:max-w-[100px] truncate">${displayName}</span>
                    </a>
                    <button onclick="logoutUser()" class="px-2 sm:px-3 py-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition shrink-0 whitespace-nowrap cursor-pointer" title="Logout">
                        Logout
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap">
                    <button class="px-2.5 sm:px-4 py-1.5 text-xs font-semibold text-[#1d7bf5] hover:text-[#1565d8] transition whitespace-nowrap" type="button" onclick="window.location.href='/login.html'">Login</button>
                    <button class="px-2.5 sm:px-4 py-1.5 bg-[#1d7bf5] hover:bg-[#1565d8] text-white text-xs font-semibold rounded-full shadow-sm transition whitespace-nowrap" type="button" onclick="window.location.href='/register.html'">Sign Up</button>
                </div>
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
        const [settings, stats, colleges, contributors, testimonials, awardsData] = await Promise.all([
            window.api.get('/meta/settings').catch(() => null),
            window.api.get('/meta/stats').catch(() => null),
            window.api.get('/meta/colleges?featured=1').catch(() => null),
            window.api.get('/meta/top-contributors').catch(() => null),
            window.api.get('/meta/testimonials').catch(() => null),
            window.api.get('/meta/awards').catch(() => null)
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
                const heroImg = document.getElementById('hero-banner-img') || document.querySelector('#hero-image-container img');
                if (heroImg) {
                    heroImg.src = settings.hero_image_url;
                }
            }

            // Degree Cards
            if (settings.btech_card_title) {
                const el = document.getElementById('btech-card-title');
                if (el) el.textContent = settings.btech_card_title;
            }
            if (settings.btech_card_desc) {
                const el = document.getElementById('btech-card-desc');
                if (el) el.textContent = settings.btech_card_desc;
            }
            if (settings.mtech_card_title) {
                const el = document.getElementById('mtech-card-title');
                if (el) el.textContent = settings.mtech_card_title;
            }
            if (settings.mtech_card_desc) {
                const el = document.getElementById('mtech-card-desc');
                if (el) el.textContent = settings.mtech_card_desc;
            }
            if (settings.phd_card_title) {
                const el = document.getElementById('phd-card-title');
                if (el) el.textContent = settings.phd_card_title;
            }
            if (settings.phd_card_desc) {
                const el = document.getElementById('phd-card-desc');
                if (el) el.textContent = settings.phd_card_desc;
            }

            // CTA Section
            if (settings.cta_title) {
                const ctaTitle = document.getElementById('cta-title');
                if (ctaTitle) ctaTitle.textContent = settings.cta_title;
            }
            if (settings.cta_description) {
                const ctaDesc = document.getElementById('cta-description');
                if (ctaDesc) ctaDesc.textContent = settings.cta_description;
            }
            if (settings.cta_button_text) {
                const ctaBtn = document.getElementById('cta-button');
                if (ctaBtn) ctaBtn.textContent = settings.cta_button_text;
            }
            if (settings.cta_doodle_text) {
                const ctaDoodle = document.getElementById('cta-doodle');
                if (ctaDoodle) ctaDoodle.innerHTML = settings.cta_doodle_text;
            }
        }

        // B. Statistics & Real Category Counts
        if (stats) {
            if (stats.resources !== undefined && document.getElementById('stat-resources')) document.getElementById('stat-resources').textContent = stats.resources;
            if (stats.users !== undefined && document.getElementById('stat-users')) document.getElementById('stat-users').textContent = stats.users;
            if (stats.colleges !== undefined && document.getElementById('stat-colleges')) document.getElementById('stat-colleges').textContent = stats.colleges;
            if (stats.downloads !== undefined && document.getElementById('stat-downloads')) document.getElementById('stat-downloads').textContent = stats.downloads;

            if (stats.categories) {
                const cat = stats.categories;
                const setCat = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = val !== undefined ? String(val) : '0';
                };
                setCat('cat-count-notes', cat.notes);
                setCat('cat-count-pyqs', cat.pyqs);
                setCat('cat-count-books', cat.books);
                setCat('cat-count-research', cat.research);
                setCat('cat-count-projects', cat.projects);
                setCat('cat-count-thesis', cat.thesis);
                setCat('cat-count-lab', cat.lab);
                setCat('cat-count-other', cat.other);
            }
        }

        // C. Top Universities
        const collegesContainer = document.getElementById('top-colleges-container');
        if (colleges && Array.isArray(colleges) && colleges.length > 0) {
            renderTopUniversities(colleges);
        } else if (collegesContainer) {
            collegesContainer.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400 text-xs">No universities listed yet. You can add universities directly from the Admin Panel.</div>';
        }

        // D. Top Contributors & Recent Award Winners (Real Data)
        renderTopContributorsAndAwards(awardsData, contributors, settings);

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

function renderTopContributorsAndAwards(awardsData, contributors, settings = {}) {
    const contribContainer = document.getElementById('top-contributors-container');
    const winnersContainer = document.getElementById('recent-winners-container');

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let currentUser = null;
    try {
        if (token && userStr) currentUser = JSON.parse(userStr);
    } catch (e) {}

    const formatDownloads = (num) => {
        const n = Number(num) || 0;
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
        return String(n);
    };

    // 1. Render Top Contributor Box
    if (contribContainer) {
        if (contributors && Array.isArray(contributors) && contributors.length > 0) {
            const topHighlight = contributors[0];
            const topName = settings.top_contrib_name || topHighlight.name || 'Student Contributor';
            const topRole = settings.top_contrib_role || topHighlight.college_name || 'Engineering Student';
            const topPoints = settings.top_contrib_points || (topHighlight.points !== undefined ? String(topHighlight.points) : '0');
            const topUploads = settings.top_contrib_uploads || (topHighlight.approved_uploads !== undefined ? String(topHighlight.approved_uploads) : '0');
            const topDownloads = settings.top_contrib_downloads || formatDownloads(topHighlight.total_downloads || 0);
            const initial = topName.trim().charAt(0).toUpperCase() || 'S';

            // Check if current user is logged in AND is an active contributor with uploads
            const isEligibleToClaim = currentUser && (
                (topHighlight.id && String(currentUser.id) === String(topHighlight.id)) ||
                (currentUser.name && topHighlight.name && currentUser.name.trim().toLowerCase() === topHighlight.name.trim().toLowerCase()) ||
                (contributors.some(c => String(c.id) === String(currentUser.id) && c.approved_uploads > 0))
            );

            const rewardTitle = settings.reward_title || 'You have won this month\'s reward!';
            const rewardSubtitle = settings.reward_subtitle || 'Claim your reward now and keep contributing.';
            const rewardBtnText = settings.reward_btn_text || 'Claim Reward';

            let claimBannerHtml = '';
            if (isEligibleToClaim) {
                claimBannerHtml = `
                    <!-- Reward Alert Banner (Visible only to eligible contributor account) -->
                    <div class="bg-white rounded-xl p-3 sm:p-3.5 border border-amber-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs mt-2">
                        <div class="flex items-center space-x-3">
                            <div class="w-9 h-9 rounded-xl bg-orange-100/90 text-orange-600 flex items-center justify-center text-xl shrink-0">🎁</div>
                            <div>
                                <h5 class="text-xs sm:text-sm font-bold text-gray-900 leading-tight">${rewardTitle}</h5>
                                <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5 font-normal">${rewardSubtitle}</p>
                            </div>
                        </div>
                        <button onclick="claimContributorReward()" class="w-full sm:w-auto px-5 py-2.5 bg-[#4f28d9] hover:bg-[#431fb3] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer">
                            <span>🎁</span>
                            <span>${rewardBtnText}</span>
                        </button>
                    </div>
                `;
            }

            contribContainer.innerHTML = `
                <!-- Top Contributor Header Row -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center space-x-3">
                        <span class="w-8 h-8 rounded-full bg-[#f5a623] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">1</span>
                        <div class="w-10 h-10 rounded-full bg-[#e8eef7] text-slate-800 font-bold text-sm flex items-center justify-center shrink-0 uppercase">${initial}</div>
                        <div class="min-w-0">
                            <h4 class="text-sm font-extrabold text-gray-900 uppercase tracking-wide truncate">${topName}</h4>
                            <p class="text-xs text-gray-500 font-medium truncate">${topRole}</p>
                        </div>
                    </div>
                    <!-- Stat Badges Row -->
                    <div class="flex items-center space-x-5 pl-11 sm:pl-0">
                        <div class="text-center">
                            <span class="block text-base font-extrabold text-[#1d7bf5] leading-tight">${topPoints}</span>
                            <span class="block text-[11px] text-gray-500 font-medium">Points</span>
                        </div>
                        <div class="text-center">
                            <span class="block text-base font-extrabold text-gray-900 leading-tight">${topUploads}</span>
                            <span class="block text-[11px] text-gray-500 font-medium">Uploads</span>
                        </div>
                        <div class="text-center">
                            <span class="block text-base font-extrabold text-gray-900 leading-tight">${topDownloads}</span>
                            <span class="block text-[11px] text-gray-500 font-medium">Downloads</span>
                        </div>
                    </div>
                </div>
                ${claimBannerHtml}
            `;
        } else {
            contribContainer.innerHTML = `
                <div class="py-6 text-center text-slate-500 bg-white/70 rounded-xl p-4 border border-amber-100">
                    <span class="text-2xl block mb-1">⭐</span>
                    <h5 class="text-sm font-bold text-gray-900">Be the First Top Contributor!</h5>
                    <p class="text-xs text-gray-500 mt-1">Upload verified study notes &amp; PYQs to earn reward points and claim cash prizes.</p>
                    <a href="/upload.html" class="inline-block mt-3 px-4 py-2 bg-[#1d7bf5] hover:bg-[#1565d8] text-white text-xs font-bold rounded-lg transition shadow-xs">
                        Upload Your Material
                    </a>
                </div>
            `;
        }
    }

    // 2. Render Recent Winners (Strictly from Admin Panel awards)
    if (winnersContainer) {
        const winnersList = (awardsData && Array.isArray(awardsData.winners)) ? awardsData.winners : [];

        const medalStyles = [
            {
                badgeBg: 'bg-amber-100 text-amber-700',
                medal: '🥇',
                cardBg: 'bg-[#fefbf6] border-amber-200/80',
                amountColor: 'text-amber-800'
            },
            {
                badgeBg: 'bg-blue-100 text-blue-700',
                medal: '🥈',
                cardBg: 'bg-[#f8faff] border-blue-100',
                amountColor: 'text-blue-600'
            },
            {
                badgeBg: 'bg-orange-100 text-orange-700',
                medal: '🥉',
                cardBg: 'bg-[#fffaf6] border-orange-100',
                amountColor: 'text-amber-800'
            }
        ];

        if (winnersList.length > 0) {
            winnersContainer.innerHTML = winnersList.slice(0, 3).map((w, idx) => {
                const style = medalStyles[idx] || medalStyles[0];
                const wInitial = (w.name || 'W').trim().charAt(0).toUpperCase();
                return `
                    <div class="${style.cardBg} rounded-2xl p-4 border shadow-2xs flex flex-col justify-between hover:shadow-xs transition">
                        <div>
                            <div class="flex items-center space-x-2.5 mb-2">
                                <span class="text-lg shrink-0">${style.medal}</span>
                                <div class="w-7 h-7 rounded-full bg-[#e8eef7] text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 uppercase">${wInitial}</div>
                                <div class="min-w-0 flex-1">
                                    <h4 class="text-xs font-bold text-gray-900 truncate">${w.name}</h4>
                                    <p class="text-[10px] text-gray-500 truncate">${w.college || 'Engineering Student'}</p>
                                </div>
                            </div>
                            <div class="text-base sm:text-lg font-extrabold ${style.amountColor} mt-2 tracking-tight">${w.reward_amount}</div>
                        </div>
                        <div class="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-1">${w.month_year}</div>
                    </div>
                `;
            }).join('');
        } else {
            winnersContainer.innerHTML = `
                <div class="col-span-full py-5 px-4 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200">
                    <p class="font-medium text-slate-600 mb-0.5">No recent winners published yet</p>
                    <p class="text-slate-400">Award winners will appear here once announced by the administration.</p>
                </div>
            `;
        }
    }
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

function claimContributorReward() {
    alert("Your reward claim request has been submitted successfully.");
}
window.claimContributorReward = claimContributorReward;

let allContributorsData = [];
let allAwardsData = [];

// Save references during loadHomePageData
const origRenderTopContributors = renderTopContributorsAndAwards;
renderTopContributorsAndAwards = function(awardsData, contributors, settings) {
    allContributorsData = Array.isArray(contributors) ? contributors : [];
    allAwardsData = (awardsData && Array.isArray(awardsData.winners)) ? awardsData.winners : [];
    origRenderTopContributors(awardsData, contributors, settings);
};

window.openContributorsModal = async () => {
    const modal = document.getElementById('contributors-modal');
    const list = document.getElementById('contributors-modal-list');
    if (!modal || !list) return;

    modal.classList.remove('hidden');

    if (allContributorsData.length === 0 && window.api) {
        try {
            const data = await window.api.get('/meta/top-contributors');
            allContributorsData = Array.isArray(data) ? data : [];
        } catch(e) {}
    }

    if (allContributorsData.length > 0) {
        list.innerHTML = allContributorsData.map((c, idx) => {
            const initial = (c.name || 'S').trim().charAt(0).toUpperCase();
            const rankBadge = idx === 0 ? '🥇 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));
            const badgeBg = idx === 0 ? 'bg-amber-100 text-amber-800' : (idx === 1 ? 'bg-slate-100 text-slate-800' : (idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-600'));
            
            return `
                <div class="flex items-center justify-between gap-3 pt-3 first:pt-0">
                    <div class="flex items-center space-x-3 min-w-0">
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${badgeBg} shrink-0">${rankBadge}</span>
                        <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">${initial}</div>
                        <div class="min-w-0">
                            <h4 class="text-xs font-bold text-slate-900 truncate">${c.name}</h4>
                            <p class="text-[11px] text-slate-400 truncate">${c.college_name || 'Engineering Student'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3 shrink-0 text-right">
                        <div>
                            <span class="block text-xs font-extrabold text-[#1d7bf5]">${c.points || 0}</span>
                            <span class="block text-[10px] text-slate-400">Pts</span>
                        </div>
                        <div>
                            <span class="block text-xs font-extrabold text-slate-800">${c.approved_uploads || 0}</span>
                            <span class="block text-[10px] text-slate-400">Uploads</span>
                        </div>
                        <div>
                            <span class="block text-xs font-extrabold text-slate-800">${c.total_downloads || 0}</span>
                            <span class="block text-[10px] text-slate-400">Downloads</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        list.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-xs">
                <span class="text-3xl block mb-2">⭐</span>
                <p class="font-bold text-slate-700 mb-1">No contributors yet</p>
                <p class="text-slate-400">Be the first to upload verified study notes &amp; PYQs to top the leaderboard!</p>
            </div>
        `;
    }
};

window.closeContributorsModal = () => {
    const modal = document.getElementById('contributors-modal');
    if (modal) modal.classList.add('hidden');
};

window.openWinnersModal = async () => {
    const modal = document.getElementById('winners-modal');
    const list = document.getElementById('winners-modal-list');
    if (!modal || !list) return;

    modal.classList.remove('hidden');

    if (allAwardsData.length === 0 && window.api) {
        try {
            const data = await window.api.get('/meta/awards');
            allAwardsData = (data && Array.isArray(data.winners)) ? data.winners : [];
        } catch(e) {}
    }

    if (allAwardsData.length > 0) {
        list.innerHTML = allAwardsData.map((w, idx) => {
            const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '🏆'));
            const initial = (w.name || 'W').trim().charAt(0).toUpperCase();
            return `
                <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/60 transition">
                    <div class="flex items-center space-x-3 min-w-0">
                        <span class="text-xl shrink-0">${medal}</span>
                        <div class="w-8 h-8 rounded-full bg-[#e8eef7] text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 uppercase">${initial}</div>
                        <div class="min-w-0">
                            <h4 class="text-xs font-bold text-slate-900 truncate">${w.name}</h4>
                            <p class="text-[11px] text-slate-400 truncate">${w.college || 'Engineering Student'}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="block text-sm font-extrabold text-[#1d7bf5] leading-tight">${w.reward_amount}</span>
                        <span class="block text-[10px] text-slate-400 font-medium">${w.month_year}</span>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        list.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span class="text-3xl block mb-2">🎁</span>
                <p class="font-bold text-slate-700 mb-1">No recent winners published yet</p>
                <p class="text-slate-400">Award winners will be displayed once announced by the administration.</p>
            </div>
        `;
    }
};

window.closeWinnersModal = () => {
    const modal = document.getElementById('winners-modal');
    if (modal) modal.classList.add('hidden');
};


