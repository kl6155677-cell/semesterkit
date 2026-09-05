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
