const API_BASE = 'https://rentease-platform.onrender.com/api';

const DEFAULT_PROPERTIES = [
    {
        title: "Luxury 2BHK Apartment",
        type: "apartment",
        location: "Mumbai, Andheri West",
        price: 45000,
        bedrooms: 2,
        bathrooms: 2,
        amenities: ["AC", "WiFi", "Parking", "Gym", "Swimming Pool"],
        available: true,
        description: "Beautiful 2BHK apartment with modern amenities",
        images: {
            main: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=400",
            gallery: []
        }
    },
    {
        title: "Cozy 1BHK PG for Students",
        type: "pg",
        location: "Bangalore, Koramangala",
        price: 15000,
        bedrooms: 1,
        bathrooms: 1,
        amenities: ["WiFi", "Meals", "Laundry", "Study Area"],
        available: true,
        description: "Perfect PG for students and working professionals",
        images: {
            main: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=400",
            gallery: []
        }
    },
    {
        title: "Premium 4BHK Villa",
        type: "villa",
        location: "Pune, Koregaon Park",
        price: 85000,
        bedrooms: 4,
        bathrooms: 3,
        amenities: ["AC", "WiFi", "Parking", "Garden", "Private Pool", "Security"],
        available: true,
        description: "Luxury villa with garden and private pool",
        images: {
            main: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=400",
            gallery: []
        }
    }
];

// Global variable to store pending bookings for current user
let userPendingBookings = [];

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
    const token = localStorage.getItem('token');
    return token !== null;
}

// Function to fetch user's pending bookings
async function loadUserPendingBookings() {
    const token = localStorage.getItem('token');
    if (!token) {
        userPendingBookings = [];
        return;
    }
    
    try {
        const response = await fetch('/api/bookings/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            userPendingBookings = data.bookings
                .filter(b => b.status === 'pending')
                .map(b => b.propertyId);
            console.log('User pending bookings:', userPendingBookings);
        }
    } catch (error) {
        console.error('Error loading pending bookings:', error);
        userPendingBookings = [];
    }
}

window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof showToast === 'function') {
        showToast('Logged out successfully!', 'info');
    }
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
};

function updateNavbar() {
    const user = getCurrentUser();
    const navLinks = document.getElementById('navLinks');
    
    if (!navLinks) return;
    
    while (navLinks.children.length > 1) {
        navLinks.removeChild(navLinks.lastChild);
    }
    
    if (user && isLoggedIn()) {
        const dashboardLink = document.createElement('li');
        dashboardLink.className = 'nav-item';
        dashboardLink.innerHTML = `
            <a class="nav-link" href="${user.role === 'admin' ? 'admin.html' : 'dashboard.html'}">
                <i class="fas fa-tachometer-alt me-1"></i> Dashboard
            </a>
        `;
        navLinks.appendChild(dashboardLink);
        
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
        const loginLink = document.createElement('li');
        loginLink.className = 'nav-item';
        loginLink.innerHTML = `
            <a class="nav-link" href="login.html">
                <i class="fas fa-sign-in-alt me-1"></i> Login
            </a>
        `;
        navLinks.appendChild(loginLink);
        
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

async function loadProperties() {
    const container = document.getElementById('propertyContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin fa-3x"></i><p>Loading properties...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE}/properties/`);
        const data = await response.json();
        
        console.log('Properties loaded:', data);
        
        if (data.success && data.properties && data.properties.length > 0) {
            displayProperties(data.properties);
        } else {
            container.innerHTML = `
                <div class="no-properties">
                    <i class="fas fa-home fa-3x mb-3" style="color: #1e3a8a;"></i>
                    <h4>No properties available yet</h4>
                    <p>Check back soon for new listings!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading properties:', error);
        container.innerHTML = `
            <div class="no-properties">
                <i class="fas fa-exclamation-triangle fa-3x mb-3" style="color: #dc2626;"></i>
                <h4>Connection Error</h4>
                <p>Make sure the backend server is running at ${API_BASE}</p>
            </div>
        `;
    }
}

function displayProperties(properties) {
    const container = document.getElementById('propertyContainer');
    if (!container) return;
    
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const bedrooms = document.getElementById('bedrooms')?.value || '';
    const priceMin = parseInt(document.getElementById('priceMin')?.value) || 0;
    const priceMax = parseInt(document.getElementById('priceMax')?.value) || Infinity;
    const searchTerm = document.getElementById('searchBox')?.value.toLowerCase() || '';
    
    let filtered = properties.filter(property => {
        if (typeFilter && property.type !== typeFilter) return false;
        if (bedrooms && property.bedrooms < parseInt(bedrooms)) return false;
        if (property.price < priceMin || property.price > priceMax) return false;
        if (searchTerm && !property.location.toLowerCase().includes(searchTerm) && 
            !property.title.toLowerCase().includes(searchTerm)) return false;
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-properties">
                <i class="fas fa-search fa-3x mb-3"></i>
                <h4>No properties match your filters</h4>
                <button class="btn btn-outline-primary mt-3" onclick="clearFilters()">Clear Filters</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(property => {
        let imageUrl = 'https://via.placeholder.com/400x250?text=No+Image';
        if (property.images && property.images.main) {
            imageUrl = property.images.main;
        }
        
        const hasPending = userPendingBookings.includes(property._id);
        const isAvailable = property.available === true;
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="property-card ${!isAvailable ? 'property-unavailable' : ''}" onclick="showPropertyDetails('${property._id}')">
                    <div class="position-relative">
                        <img src="${imageUrl}" class="card-img-top" alt="${property.title}" onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'">
                        ${!isAvailable ? 
                            '<div class="unavailable-badge"><i class="fas fa-ban me-1"></i> Not Available</div>' : 
                            '<div class="available-badge"><i class="fas fa-check-circle me-1"></i> Available</div>'
                        }
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${escapeHtml(property.title)}</h5>
                            <span class="badge ${property.type === 'apartment' ? 'bg-primary' : property.type === 'pg' ? 'bg-success' : property.type === 'villa' ? 'bg-warning' : 'bg-info'}">
                                ${property.type.toUpperCase()}
                            </span>
                        </div>
                        <p class="card-text">
                            <i class="fas fa-map-marker-alt feature-icon"></i> ${escapeHtml(property.location)}<br>
                            <i class="fas fa-bed feature-icon"></i> ${property.bedrooms} Beds &nbsp;|&nbsp;
                            <i class="fas fa-bath feature-icon"></i> ${property.bathrooms} Baths
                        </p>
                        <div class="price-tag">₹${property.price.toLocaleString()}<span style="font-size: 0.9rem;">/month</span></div>
                        <div class="property-amenities mt-2">
                            ${property.amenities?.slice(0, 3).map(a => `<span class="badge bg-light text-dark me-1">${escapeHtml(a)}</span>`).join('')}
                            ${property.amenities?.length > 3 ? `<span class="badge bg-light text-dark">+${property.amenities.length - 3}</span>` : ''}
                        </div>
                        <div class="property-actions mt-3">
                            ${!isAvailable ? 
                                `<button class="btn-disabled" disabled style="background: #9ca3af; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; width: 100%; cursor: not-allowed;">
                                    <i class="fas fa-ban me-2"></i> Currently Unavailable
                                </button>` :
                                (hasPending && isLoggedIn() ? 
                                    `<button class="btn-pending" disabled style="background: #f59e0b; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; width: 100%; cursor: not-allowed;">
                                        <i class="fas fa-hourglass-half me-2"></i> Pending Request
                                    </button>` :
                                    `<button class="btn-book" onclick="event.stopPropagation(); showPropertyDetails('${property._id}')">
                                        <i class="fas fa-calendar-check"></i> View Details & Book
                                    </button>`)
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

window.clearFilters = function() {
    const typeFilter = document.getElementById('typeFilter');
    const bedrooms = document.getElementById('bedrooms');
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    const searchBox = document.getElementById('searchBox');
    
    if (typeFilter) typeFilter.value = '';
    if (bedrooms) bedrooms.value = '';
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    if (searchBox) searchBox.value = '';
    
    loadProperties();
};

// Make editProperty available globally for admin on index page
window.editProperty = async function(propertyId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        if (typeof showToast === 'function') {
            showToast('Admin access required', 'error');
        }
        return;
    }
    
    // Store the property ID to edit in session storage
    sessionStorage.setItem('editPropertyId', propertyId);
    
    if (typeof showToast === 'function') {
        showToast('Redirecting to admin panel...', 'info');
    }
    
    // Redirect to admin page where edit modal will open automatically
    setTimeout(() => {
        window.location.href = 'admin.html';
    }, 1000);
};

window.checkForPendingEdit = function() {
    const editId = sessionStorage.getItem('editPropertyId');
    if (editId && window.location.pathname.includes('admin.html')) {
        sessionStorage.removeItem('editPropertyId');
        // Small delay to ensure admin.js is fully loaded
        setTimeout(() => {
            if (typeof window.editPropertyInAdmin === 'function') {
                window.editPropertyInAdmin(editId);
            } else if (typeof editProperty === 'function') {
                editProperty(editId);
            } else {
                console.error('Edit function not found');
                if (typeof showToast === 'function') {
                    showToast('Error opening edit form', 'error');
                }
            }
        }, 500);
    }
};

if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', window.checkForPendingEdit);
}

async function addDefaultPropertiesIfNeeded() {
    try {
        const response = await fetch(`${API_BASE}/properties/`);
        const data = await response.json();
        
        if (data.success && data.count === 0) {
            const token = localStorage.getItem('token');
            const user = getCurrentUser();
            
            if (token && user && user.role === 'admin') {
                for (const prop of DEFAULT_PROPERTIES) {
                    const formData = new FormData();
                    formData.append('title', prop.title);
                    formData.append('type', prop.type);
                    formData.append('location', prop.location);
                    formData.append('price', prop.price);
                    formData.append('bedrooms', prop.bedrooms);
                    formData.append('bathrooms', prop.bathrooms);
                    prop.amenities.forEach(a => formData.append('amenities', a));
                    formData.append('available', prop.available);
                    formData.append('description', prop.description);
                    
                    await fetch(`${API_BASE}/properties/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                }
                console.log('Default properties added');
                loadProperties();
            }
        }
    } catch (error) {
        console.error('Error adding default properties:', error);
    }
}

async function refreshUserBookings() {
    await loadUserPendingBookings();
    loadProperties();
}

window.refreshUserBookings = refreshUserBookings;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Main.js DOMContentLoaded fired');
    updateNavbar();
    await loadUserPendingBookings();
    await loadProperties();
    addDefaultPropertiesIfNeeded();
    
    const filterElements = ['typeFilter', 'bedrooms', 'priceMin', 'priceMax', 'searchBox'];
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', loadProperties);
            if (element.tagName === 'SELECT') {
                element.addEventListener('change', loadProperties);
            }
        }
    });
});