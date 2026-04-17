// frontend/js/admin.js
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

const user = getCurrentUser();
if (!user || user.role !== 'admin') {
    showToast('Admin access required', 'error');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

async function loadDashboard() {
    await loadProperties();
    await loadBookings();
    await loadAdminStats();
}

async function loadProperties() {
    try {
        const response = await fetch('/api/properties/');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalProperties').innerText = data.count || 0;
            displayPropertiesTable(data.properties || []);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function displayPropertiesTable(properties) {
    const tbody = document.getElementById('propertiesTable');
    if (!properties || properties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No properties found</td></tr>';
        return;
    }
    
    tbody.innerHTML = properties.map(prop => {
        let imageUrl = 'https://via.placeholder.com/50?text=No+Img';
        
        if (prop.images && prop.images.main) {
            imageUrl = prop.images.main;
        }
        
        return `
            <tr>
                <td><img src="${imageUrl}" width="50" height="50" style="object-fit: cover; border-radius: 8px;" onerror="this.src='https://via.placeholder.com/50?text=Error'"></td>
                <td>${escapeHtml(prop.title)}</td>
                <td><span class="badge bg-primary">${escapeHtml(prop.type)}</span></td>
                <td>${escapeHtml(prop.location)}</td>
                <td>₹${(prop.price || 0).toLocaleString()}</td>
                <td><span class="badge ${prop.available ? 'bg-success' : 'bg-danger'}">${prop.available ? 'Available' : 'Not Available'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline me-1" onclick="editProperty('${prop._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline me-1" onclick="toggleAvailability('${prop._id}', ${prop.available})">
                        <i class="fas ${prop.available ? 'fa-ban' : 'fa-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProperty('${prop._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
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

// frontend/js/admin.js - Add these functions

// Track gallery image inputs
let galleryImageCount = 0;

// Function to add new gallery image input
window.addGalleryImageInput = function() {
    const container = document.getElementById('galleryImagesList');
    if (!container) return;
    
    const inputDiv = document.createElement('div');
    inputDiv.className = 'gallery-input-group mb-2';
    inputDiv.style.display = 'flex';
    inputDiv.style.gap = '10px';
    inputDiv.innerHTML = `
        <input type="file" name="gallery_images" accept="image/*" class="form-control" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(inputDiv);
    galleryImageCount++;
};

// Update the edit property form submission
document.getElementById('editPropertyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const propertyId = document.getElementById('editPropertyId').value;
    const formData = new FormData(e.target);
    formData.delete('propertyId');
    
    // Add gallery indices to delete
    window.galleryImagesToDelete.forEach(index => {
        formData.append('delete_gallery_indices', index);
    });
    
    // Convert available to boolean
    const available = formData.get('available');
    if (available) {
        formData.set('available', available === 'true');
    }
    
    showToast('Updating property...', 'info');
    
    try {
        const response = await fetch(`/api/properties/${propertyId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('✅ Property updated successfully!', 'success');
            window.galleryImagesToDelete = [];
            // Clear dynamic gallery inputs
            const galleryContainer = document.getElementById('galleryImagesList');
            if (galleryContainer) galleryContainer.innerHTML = '';
            closeModal();
            setTimeout(() => loadProperties(), 1000);
        } else {
            showToast(data.error || 'Failed to update', 'error');
        }
    } catch (error) {
        console.error('Error updating property:', error);
        showToast(error.message, 'error');
    }
});

// Update the editProperty function to clear dynamic inputs
window.editProperty = async (id) => {
    try {
        const response = await fetch(`/api/properties/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const prop = data.property;
            
            // Clear dynamic gallery inputs
            const galleryContainer = document.getElementById('galleryImagesList');
            if (galleryContainer) galleryContainer.innerHTML = '';
            galleryImageCount = 0;
            
            // Check if all elements exist before setting values
            const editPropertyId = document.getElementById('editPropertyId');
            const editTitle = document.getElementById('editTitle');
            const editType = document.getElementById('editType');
            const editLocation = document.getElementById('editLocation');
            const editPrice = document.getElementById('editPrice');
            const editBedrooms = document.getElementById('editBedrooms');
            const editBathrooms = document.getElementById('editBathrooms');
            const editDescription = document.getElementById('editDescription');
            const editAvailable = document.getElementById('editAvailable');
            
            if (editPropertyId) editPropertyId.value = prop._id;
            if (editTitle) editTitle.value = prop.title || '';
            if (editType) editType.value = prop.type || 'apartment';
            if (editLocation) editLocation.value = prop.location || '';
            if (editPrice) editPrice.value = prop.price || 0;
            if (editBedrooms) editBedrooms.value = prop.bedrooms || 1;
            if (editBathrooms) editBathrooms.value = prop.bathrooms || 1;
            if (editDescription) editDescription.value = prop.description || '';
            if (editAvailable) editAvailable.value = prop.available ? 'true' : 'false';
            
            // Handle amenities
            const amenitiesSelect = document.getElementById('editAmenities');
            if (amenitiesSelect && prop.amenities) {
                Array.from(amenitiesSelect.options).forEach(option => {
                    option.selected = prop.amenities.includes(option.value);
                });
            }
            
            // Show current gallery images with delete option
            const galleryDisplayContainer = document.getElementById('currentGallery');
            if (galleryDisplayContainer) {
                if (prop.images && prop.images.gallery && prop.images.gallery.length > 0) {
                    galleryDisplayContainer.innerHTML = `
                        <div class="row mt-2">
                            ${prop.images.gallery.map((img, index) => `
                                <div class="col-md-3 mb-2">
                                    <div class="position-relative">
                                        <img src="${img}" class="img-fluid rounded" style="height: 100px; object-fit: cover; width: 100%;" onerror="this.src='https://via.placeholder.com/100?text=Error'">
                                        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" 
                                                onclick="markGalleryImageForDelete(${index})">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    galleryDisplayContainer.innerHTML = '<p class="text-muted">No gallery images</p>';
                }
            }
            
            const modal = document.getElementById('editModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }
        }
    } catch (error) {
        console.error('Error in editProperty:', error);
        showToast(error.message, 'error');
    }
};

// Global array to track which gallery images to delete
window.galleryImagesToDelete = [];

window.markGalleryImageForDelete = (index) => {
    if (!window.galleryImagesToDelete.includes(index)) {
        window.galleryImagesToDelete.push(index);
        showToast('Image marked for deletion', 'info');
    }
};


window.closeModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            window.galleryImagesToDelete = [];
        }, 300);
    }
};

async function loadBookings() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/bookings/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const bookings = data.bookings || [];
            const pending = bookings.filter(b => b.status === 'pending').length || 0;
            document.getElementById('totalBookings').innerText = bookings.length;
            document.getElementById('pendingBookings').innerText = pending;
            displayBookingsTable(bookings);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function displayBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTable');
    if (!tbody) return;
    
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No bookings yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => {
        let propertyTitle = booking.propertyTitle || 'N/A';
        let tenantName = booking.tenantName || 'N/A';
        let tenantEmail = booking.tenantEmail || '';
        
        return `
            <tr>
                <td>${escapeHtml(propertyTitle)}</td>
                <td>${escapeHtml(tenantName)}${tenantEmail ? `<br><small>${escapeHtml(tenantEmail)}</small>` : ''}</td>
                <td>${booking.startDate || 'N/A'} to ${booking.endDate || 'N/A'}</td>
                <td><span class="badge ${booking.status === 'pending' ? 'bg-warning' : booking.status === 'accepted' ? 'bg-success' : 'bg-danger'}">${booking.status}</span></td>
                <td>
                    ${booking.status === 'pending' ? `
                        <button class="btn btn-sm btn-success me-1" onclick="updateBookingStatus('${booking._id}', 'accepted')">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="updateBookingStatus('${booking._id}', 'rejected')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

async function loadAdminStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.stats) {
            document.getElementById('totalUsers').innerText = data.stats.totalUsers || 0;
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

const addPropertyForm = document.getElementById('addPropertyForm');
if (addPropertyForm) {
    addPropertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login first', 'error');
            window.location.href = 'login.html';
            return;
        }
        
        const formData = new FormData(e.target);
        
        showToast('Adding property... Please wait', 'info');
        
        try {
            const response = await fetch('/api/properties/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('✅ Property added successfully!', 'success');
                e.target.reset();
                setTimeout(async () => {
                    await loadProperties();
                    const propertiesTab = document.querySelector('[data-bs-target="#properties"]');
                    if (propertiesTab && typeof bootstrap !== 'undefined') {
                        const bsTab = new bootstrap.Tab(propertiesTab);
                        bsTab.show();
                    }
                }, 1500);
            } else {
                showToast(data.error || 'Failed to add property', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast(error.message || 'Network error', 'error');
        }
    });
}

window.toggleAvailability = async (id, currentStatus) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/properties/toggle-availability/${id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            const message = data.available ? '✅ Property is now available' : '⚠️ Property is now unavailable';
            showToast(message, 'success');
            setTimeout(() => loadProperties(), 1000);
        } else {
            showToast(data.error || 'Failed to toggle availability', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.deleteProperty = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/properties/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('✅ Property deleted successfully!', 'success');
            setTimeout(() => loadProperties(), 1000);
        } else {
            showToast(data.error || 'Failed to delete property', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.updateBookingStatus = async (id, status) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/bookings/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        if (data.success) {
            const statusMessage = status === 'accepted' ? '✅ Booking accepted!' : '❌ Booking rejected';
            showToast(statusMessage, 'success');
            setTimeout(() => {
                loadBookings();
                loadAdminStats();
            }, 1000);
        } else {
            showToast(data.error || 'Failed to update status', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const searchInput = document.getElementById('searchProperty');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#propertiesTable tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeModal();
    }
};

loadDashboard();