if (typeof API_BASE === 'undefined') {
    var API_BASE = 'http://localhost:5000/api';
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

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully!', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

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
    const authLinks = document.getElementById('authLinks');
    
    if (!authLinks) return;
    
    if (user && isLoggedIn()) {
        authLinks.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="${user.role === 'admin' ? 'admin.html' : 'dashboard.html'}">
                    <i class="fas fa-tachometer-alt me-1"></i> Dashboard
                </a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-user-circle me-1"></i> ${user.name}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a class="dropdown-item" href="#" onclick="logout()">
                        <i class="fas fa-sign-out-alt me-2"></i> Logout
                    </a></li>
                </ul>
            </li>
        `;
    } else {
        authLinks.innerHTML = `
            <li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>
            <li class="nav-item"><a class="nav-link" href="register.html">Register</a></li>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});