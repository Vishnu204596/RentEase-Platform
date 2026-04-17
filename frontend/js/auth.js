function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
    const token = localStorage.getItem('token');
    return token !== null;
}

function updateNavbar() {
    const user = getCurrentUser();
    const navLinks = document.getElementById('navLinks');
    
    if (!navLinks) return;
    
    while (navLinks.children.length > 1) {
        navLinks.removeChild(navLinks.lastChild);
    }
    
    if (user && isLoggedIn()) {
        // Add Dashboard link
        const dashboardLink = document.createElement('li');
        dashboardLink.className = 'nav-item';
        dashboardLink.innerHTML = `
            <a class="nav-link" href="${user.role === 'admin' ? 'admin.html' : 'dashboard.html'}">
                <i class="fas fa-tachometer-alt me-1"></i> Dashboard
            </a>
        `;
        navLinks.appendChild(dashboardLink);
        
        // Add User Dropdown
        const dropdownItem = document.createElement('li');
        dropdownItem.className = 'nav-item dropdown';
        dropdownItem.innerHTML = `
            <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-user-circle me-1"></i> 
                <span>${user.name.length > 15 ? user.name.substring(0, 12) + '...' : user.name}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                <li><h6 class="dropdown-header">Signed in as</h6></li>
                <li><a class="dropdown-item disabled" href="#">${user.email}</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="${user.role === 'admin' ? 'admin.html' : 'dashboard.html'}">
                    <i class="fas fa-tachometer-alt me-2"></i> Dashboard
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="logout()">
                    <i class="fas fa-sign-out-alt me-2"></i> Logout
                </a></li>
            </ul>
        `;
        navLinks.appendChild(dropdownItem);
        
    } else {
        // Add Login link
        const loginLink = document.createElement('li');
        loginLink.className = 'nav-item';
        loginLink.innerHTML = `
            <a class="nav-link" href="login.html">
                <i class="fas fa-sign-in-alt me-1"></i> Login
            </a>
        `;
        navLinks.appendChild(loginLink);
        
        // Add Register link
        const registerLink = document.createElement('li');
        registerLink.className = 'nav-item';
        registerLink.innerHTML = `
            <a class="nav-link" href="register.html">
                <i class="fas fa-user-plus me-1"></i> Register
            </a>
        `;
        navLinks.appendChild(registerLink);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});

if (typeof API_BASE === 'undefined') {
    var API_BASE = '/api';
}

async function handleLogin(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Register function
async function handleRegister(userData) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Registration successful! Please login.', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showToast(result.error, 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});