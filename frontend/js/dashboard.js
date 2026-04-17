function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

const token = getToken();
const user = getUser();

console.log('Dashboard - Token exists:', !!token);
console.log('Dashboard - User:', user);

// Only redirect if not logged in - NO TOAST HERE
if (!token || !user) {
    console.log('No token or user, redirecting to login');
    // Silent redirect - no toast message
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 100);
    // Stop execution
    throw new Error('Not authenticated');
}

// Only show welcome message if logged in
const welcomeMsg = document.getElementById('welcomeMessage');
if (welcomeMsg) {
    welcomeMsg.innerHTML = `Welcome back, <strong>${user.name}</strong>!`;
}

async function loadDashboard() {
    console.log('Loading dashboard...');
    await loadAvailableProperties();
    await loadMyBookings();
}



async function hasPendingBooking(propertyId) {
    const token = getToken();
    if (!token) return false;
    
    try {
        const response = await fetch('/api/bookings/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const pendingBooking = data.bookings.find(
                booking => booking.propertyId === propertyId && booking.status === 'pending'
            );
            return !!pendingBooking;
        }
        return false;
    } catch (error) {
        console.error('Error checking pending booking:', error);
        return false;
    }
}


// frontend/js/dashboard.js

async function loadAvailableProperties() {
    try {
        const response = await fetch('/api/properties/');
        const data = await response.json();
        
        if (data.success) {
            // Filter ONLY available properties for dashboard
            const availableProperties = (data.properties || []).filter(prop => prop.available === true);
            document.getElementById('totalAvailable').innerText = availableProperties.length;
            displayProperties(availableProperties);
        } else {
            console.error('Failed to load properties:', data);
        }
    } catch (error) {
        console.error('Error loading properties:', error);
        if (error.message !== 'Failed to fetch' && typeof showToast === 'function') {
            showToast('Failed to load properties: ' + error.message, 'error');
        }
    }
}

async function displayProperties(properties) {
    const container = document.getElementById('propertiesGrid');
    if (!container) return;
    
    const token = getToken();
    let pendingBookings = [];
    
    if (token) {
        try {
            const response = await fetch('/api/bookings/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                pendingBookings = data.bookings.filter(b => b.status === 'pending').map(b => b.propertyId);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    }
    
    const searchTerm = document.getElementById('searchProperty')?.value.toLowerCase() || '';
    
    // Filter by search term (properties are already filtered to available only)
    let filtered = properties.filter(prop => 
        prop.title?.toLowerCase().includes(searchTerm) || 
        prop.location?.toLowerCase().includes(searchTerm)
    );
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-data">No available properties found</div>';
        return;
    }
    
    container.innerHTML = filtered.map(property => {
        let imageUrl = 'https://via.placeholder.com/400x250?text=No+Image';
        if (property.images && property.images.main) {
            imageUrl = property.images.main;
        }
        
        const hasPending = pendingBookings.includes(property._id);
        
        return `
            <div class="property-card" onclick="if(typeof showPropertyDetails === 'function') showPropertyDetails('${property._id}')">
                <img src="${imageUrl}" alt="${property.title}" onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0">${escapeHtml(property.title)}</h5>
                        <span class="badge bg-success" style="font-size: 0.7rem;">
                            <i class="fas fa-check-circle me-1"></i> Available
                        </span>
                    </div>
                    <p class="mt-2"><i class="fas fa-map-marker-alt feature-icon"></i> ${escapeHtml(property.location)}</p>
                    <div class="price-tag">₹${(property.price || 0).toLocaleString()}<span style="font-size: 0.9rem;">/month</span></div>
                    <div class="property-amenities mt-2">
                        ${(property.amenities || []).slice(0, 3).map(a => `<span class="badge bg-light text-dark me-1">${escapeHtml(a)}</span>`).join('')}
                    </div>
                    ${hasPending ? 
                        `<button class="btn-pending mt-3" disabled style="background: #f59e0b; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; width: 100%; cursor: not-allowed;">
                            <i class="fas fa-hourglass-half me-2"></i> Pending Request
                        </button>` :
                        `<button class="btn-book mt-3" onclick="event.stopPropagation(); if(typeof showPropertyDetails === 'function') showPropertyDetails('${property._id}')">
                            <i class="fas fa-calendar-check"></i> View Details & Book
                        </button>`
                    }
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

async function loadMyBookings() {
    const token = getToken();
    if (!token) {
        console.log('No token, skipping loadMyBookings');
        return;
    }
    
    try {
        const response = await fetch('/api/bookings/my', {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Bookings response status:', response.status);
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const data = await response.json();
        console.log('Bookings data received:', data);
        
        if (data.success) {
            document.getElementById('myBookings').innerText = data.count || 0;
            const pending = (data.bookings || []).filter(b => b.status === 'pending').length;
            document.getElementById('pendingBookings').innerText = pending;
            displayBookings(data.bookings || []);
        } else {
            console.error('Failed to load bookings:', data.error);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function displayBookings(bookings) {
    const tbody = document.getElementById('bookingsTable');
    if (!tbody) return;
    
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No bookings yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => {
        let propertyTitle = 'N/A';
        let location = 'N/A';
        
        if (booking.propertyId) {
            if (typeof booking.propertyId === 'object') {
                propertyTitle = booking.propertyId.title || 'N/A';
                location = booking.propertyId.location || 'N/A';
            } else {
                propertyTitle = booking.propertyTitle || 'Property ID: ' + booking.propertyId;
                location = booking.location || 'N/A';
            }
        } else {
            propertyTitle = booking.propertyTitle || 'N/A';
            location = booking.location || 'N/A';
        }
        
        let visitDate = 'N/A';
        if (booking.startDate) {
            visitDate = booking.startDate;
        } else if (booking.visitDate) {
            visitDate = booking.visitDate;
        }

        let message = booking.message || 'No message';
        if (message.length > 100) {
            message = message.substring(0, 100) + '...';
        }
        
        let createdDate = 'N/A';
        if (booking.createdAt) {
            createdDate = new Date(booking.createdAt).toLocaleDateString();
        }
        
        return `
        <tr>
            <td>${escapeHtml(propertyTitle)}</td>
            <td>${escapeHtml(location)}</td>
            <td>${escapeHtml(visitDate)}</td>
            <td>${escapeHtml(message)}</td>
            <td>
                <span class="badge ${booking.status === 'pending' ? 'bg-warning' : booking.status === 'accepted' ? 'bg-success' : 'bg-danger'}">
                    ${booking.status === 'pending' ? 'Pending' : booking.status === 'accepted' ? 'Accepted ✓' : 'Rejected ✗'}
                </span>
            </td>
            <td>${escapeHtml(createdDate)}</td>
        </tr>
        `;
    }).join('');
}

const searchInput = document.getElementById('searchProperty');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        loadAvailableProperties();
    });
}

if (token && user) {
    console.log('Initializing dashboard...');
    loadDashboard();
} else {
    console.log('Not authenticated, dashboard not initialized');
}