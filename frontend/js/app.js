document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});

function updateAuthUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Find auth buttons (usually in header)
    // The Stitch UI has <button>Login</button> and <button>Sign Up</button>
    // Let's find them by their text content or common classes
    const buttons = document.querySelectorAll('button');
    
    let loginBtn = null;
    let signupBtn = null;

    buttons.forEach(btn => {
        if (btn.textContent.trim().toLowerCase() === 'login') loginBtn = btn;
        if (btn.textContent.trim().toLowerCase() === 'sign up') signupBtn = btn;
    });

    if (user) {
        if (loginBtn) {
            loginBtn.textContent = 'My Vault';
            loginBtn.onclick = () => {
                alert('My Vault: Credits: ' + user.acs_credits);
            };
        }
        if (signupBtn) {
            signupBtn.textContent = 'Logout';
            signupBtn.classList.remove('bg-[#1d7bf5]');
            signupBtn.classList.add('bg-red-500', 'hover:bg-red-600');
            signupBtn.onclick = () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
            };
        }
    } else {
        if (loginBtn) {
            loginBtn.onclick = () => window.location.href = '/login.html';
        }
        if (signupBtn) {
            signupBtn.onclick = () => window.location.href = '/register.html';
        }
    }
}

// Global search handler
const searchInputs = document.querySelectorAll('input[type="text"][placeholder*="Search"], input[type="search"]');
searchInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = encodeURIComponent(e.target.value);
            window.location.href = `/btech.html?query=${query}`;
        }
    });
});

const searchButtons = document.querySelectorAll('button');
searchButtons.forEach(btn => {
    if (btn.textContent.trim().toLowerCase() === 'search') {
        btn.addEventListener('click', (e) => {
            const input = e.target.previousElementSibling;
            if (input && input.tagName === 'INPUT') {
                const query = encodeURIComponent(input.value);
                window.location.href = `/btech.html?query=${query}`;
            }
        });
    }
});

// Load Home Page Data
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Stats
    if (document.getElementById('stat-resources')) {
        try {
            const stats = await window.api.get('/meta/stats');
            document.getElementById('stat-resources').textContent = stats.resources;
            document.getElementById('stat-users').textContent = stats.users;
            document.getElementById('stat-colleges').textContent = stats.colleges;
            document.getElementById('stat-downloads').textContent = stats.downloads;
        } catch (e) {
            console.error('Failed to load stats', e);
        }

        // Load Settings for Hero
        try {
            const settings = await window.api.get('/meta/settings');
            if (settings.hero_title) {
                const titleEl = document.getElementById('hero-title');
                if (titleEl) titleEl.innerHTML = settings.hero_title;
            }
            if (settings.hero_subtitle) {
                const subEl = document.getElementById('hero-subtitle');
                if (subEl) subEl.textContent = settings.hero_subtitle;
            }
            if (settings.hero_image_url) {
                const imgContainer = document.getElementById('hero-image-container');
                if (imgContainer) {
                    imgContainer.innerHTML = `<img src="${settings.hero_image_url}" class="w-full h-auto drop-shadow-xl object-contain" alt="Hero Image" />`;
                }
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    }

    // 2. Colleges
    const collegesContainer = document.getElementById('top-colleges-container');
    if (collegesContainer) {
        try {
            const colleges = await window.api.get('/meta/colleges');
            // display top 6
            collegesContainer.innerHTML = colleges.slice(0, 6).map(c => `
                <div class="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition text-center cursor-pointer">
                    <div class="w-12 h-12 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <span class="text-slate-400 font-bold text-lg">${c.name.charAt(0)}</span>
                    </div>
                    <h3 class="text-xs font-bold text-gray-900 truncate" title="${c.name}">${c.name}</h3>
                </div>
            `).join('');
        } catch (e) {
            collegesContainer.innerHTML = `<p class="text-sm text-red-500 col-span-full text-center">Failed to load colleges</p>`;
        }
    }

    // 3. Top Contributors
    const contributorsContainer = document.getElementById('top-contributors-container');
    if (contributorsContainer) {
        try {
            const contributors = await window.api.get('/meta/top-contributors');
            if (contributors.length === 0) {
                contributorsContainer.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">No contributors yet.</p>`;
            } else {
                contributorsContainer.innerHTML = contributors.map((c, index) => `
                    <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
                        <div class="flex items-center space-x-3">
                            <div class="relative">
                                <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                    ${c.name.charAt(0).toUpperCase()}
                                </div>
                                ${index < 3 ? `<div class="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-white">${index + 1}</div>` : ''}
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-gray-900">${c.name}</h4>
                                <p class="text-[11px] text-gray-500 font-medium">${c.college_name}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm font-bold text-[#1d7bf5]">${c.acs_credits} ACS</div>
                            <div class="text-[10px] text-gray-400 font-medium">Credits</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            contributorsContainer.innerHTML = `<p class="text-sm text-red-500 text-center py-4">Failed to load contributors</p>`;
        }
    }
});
