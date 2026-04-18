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

// Tamil Nadu Locations
const tamilNaduLocations = [
    "Chennai, T Nagar", "Chennai, Anna Nagar", "Chennai, Adyar", "Chennai, Velachery",
    "Chennai, OMR", "Chennai, Porur", "Coimbatore, RS Puram", "Coimbatore, Peelamedu",
    "Coimbatore, Gandhipuram", "Coimbatore, Saravanampatti", "Madurai, Anna Nagar",
    "Madurai, KK Nagar", "Madurai, Goripalayam", "Tiruchirappalli, Srirangam",
    "Tiruchirappalli, Thillai Nagar", "Tiruppur, Kumaran Colony", "Salem, Fairlands",
    "Salem, Ammapet", "Erode, Perundurai Road", "Tirunelveli, Palayamkottai",
    "Vellore, Sathuvachari", "Thanjavur, Medical College Road", "Kanyakumari, Nagercoil",
    "Dindigul, Collectorate Area", "Chengalpattu, GST Road", "Hosur, Sipcot Area",
    "Ooty, Charing Cross", "Kodaikanal, Seven Roads Junction", "Kanchipuram, Kamarajar Salai"
];

// Populate location suggestions
function populateLocationSuggestions() {
    const locationInputs = [
        { input: document.querySelector('input[name="location"]'), datalist: 'locationSuggestions' },
        { input: document.getElementById('editLocation'), datalist: 'editLocationSuggestions' }
    ];
    
    locationInputs.forEach(item => {
        if (item.input) {
            let datalist = document.getElementById(item.datalist);
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = item.datalist;
                document.body.appendChild(datalist);
            }
            datalist.innerHTML = '';
            tamilNaduLocations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                datalist.appendChild(option);
            });
            item.input.setAttribute('list', item.datalist);
        }
    });
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
        
        console.log('Properties response:', data); // Debug log
        
        if (data.success) {
            const properties = data.properties || [];
            const totalCount = data.count || properties.length;
            document.getElementById('totalProperties').innerText = totalCount;
            displayPropertiesTable(properties);
        } else {
            console.error('Failed to load properties:', data.error);
            document.getElementById('totalProperties').innerText = '0';
            document.getElementById('propertiesTable').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Error loading properties: ${data.error || 'Unknown error'}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error in loadProperties:', error);
        document.getElementById('totalProperties').innerText = '0';
        document.getElementById('propertiesTable').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Failed to load properties. Check if backend is running.
                </td>
            </tr>
        `;
        if (typeof showToast === 'function') {
            showToast('Failed to load properties: ' + error.message, 'error');
        }
    }
}

function displayPropertiesTable(properties) {
    const tbody = document.getElementById('propertiesTable');
    if (!properties || properties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No properties found</td></tr>';
        return;
    }
    
    tbody.innerHTML = properties.map(prop => {
        // Handle image URL properly
        let imageUrl = 'https://via.placeholder.com/50?text=No+Img';
        if (prop.images && prop.images.main && prop.images.main !== 'null' && prop.images.main !== 'undefined') {
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

// Gallery image inputs for Add Property
window.addAddGalleryImageInput = function() {
    const container = document.getElementById('addGalleryImagesList');
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
};

// Gallery image inputs for Edit Property
window.addEditGalleryImageInput = function() {
    const container = document.getElementById('editGalleryImagesList');
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
};

// Custom amenities for Add Property
window.addCustomAmenity = function() {
    const container = document.getElementById('customAmenitiesList');
    if (!container) return;
    
    const inputDiv = document.createElement('div');
    inputDiv.className = 'custom-amenity-input mb-2';
    inputDiv.style.display = 'flex';
    inputDiv.style.gap = '10px';
    inputDiv.innerHTML = `
        <input type="text" name="custom_amenities" class="form-control" placeholder="Enter amenity name" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(inputDiv);
};

// Custom amenities for Edit Property
window.addEditCustomAmenity = function() {
    const container = document.getElementById('editCustomAmenitiesList');
    if (!container) return;
    
    const inputDiv = document.createElement('div');
    inputDiv.className = 'custom-amenity-input mb-2';
    inputDiv.style.display = 'flex';
    inputDiv.style.gap = '10px';
    inputDiv.innerHTML = `
        <input type="text" name="custom_amenities" class="form-control" placeholder="Enter amenity name" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(inputDiv);
};

// Add Property Form Submission
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
        
        // Handle custom amenities
        const customAmenities = document.querySelectorAll('#customAmenitiesList input[name="custom_amenities"]');
        customAmenities.forEach(input => {
            if (input.value.trim()) {
                formData.append('amenities', input.value.trim());
            }
        });
        
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
                document.getElementById('addGalleryImagesList').innerHTML = '';
                document.getElementById('customAmenitiesList').innerHTML = '';
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

// Edit Property Function
window.editProperty = async (id) => {
    try {
        const response = await fetch(`/api/properties/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const prop = data.property;
            
            // Clear dynamic inputs
            document.getElementById('editGalleryImagesList').innerHTML = '';
            document.getElementById('editCustomAmenitiesList').innerHTML = '';
            
            // Set form values
            document.getElementById('editPropertyId').value = prop._id;
            document.getElementById('editTitle').value = prop.title || '';
            document.getElementById('editType').value = prop.type || 'apartment';
            document.getElementById('editLocation').value = prop.location || '';
            document.getElementById('editPrice').value = prop.price || 0;
            document.getElementById('editBedrooms').value = prop.bedrooms || 1;
            document.getElementById('editBathrooms').value = prop.bathrooms || 1;
            document.getElementById('editDescription').value = prop.description || '';
            document.getElementById('editAvailable').value = prop.available ? 'true' : 'false';
            
            // Handle amenities checkboxes
            document.querySelectorAll('#editAmenitiesGroup input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            
            if (prop.amenities && prop.amenities.length > 0) {
                prop.amenities.forEach(amenity => {
                    const checkbox = document.querySelector(`#editAmenitiesGroup input[value="${amenity}"]`);
                    if (checkbox) checkbox.checked = true;
                });
                
                // Add custom amenities
                const predefinedAmenities = ['AC', 'WiFi', 'Parking', 'Gym', 'Pool', 'Security', 'Lift', 'Power Backup', 'Water Supply', 'Furnished'];
                const customAmenitiesList = prop.amenities.filter(a => !predefinedAmenities.includes(a));
                
                customAmenitiesList.forEach(amenity => {
                    const container = document.getElementById('editCustomAmenitiesList');
                    const inputDiv = document.createElement('div');
                    inputDiv.className = 'custom-amenity-input mb-2';
                    inputDiv.style.display = 'flex';
                    inputDiv.style.gap = '10px';
                    inputDiv.innerHTML = `
                        <input type="text" name="custom_amenities" class="form-control" value="${escapeHtml(amenity)}" style="flex: 1;">
                        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    container.appendChild(inputDiv);
                });
            }
            
            // Show current gallery images
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

// Global array for gallery images to delete
window.galleryImagesToDelete = [];

window.markGalleryImageForDelete = (index) => {
    if (!window.galleryImagesToDelete.includes(index)) {
        window.galleryImagesToDelete.push(index);
        showToast('Image marked for deletion', 'info');
    }
};

// Edit Property Form Submission
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
    
    // Handle custom amenities
    const customAmenities = document.querySelectorAll('#editCustomAmenitiesList input[name="custom_amenities"]');
    customAmenities.forEach(input => {
        if (input.value.trim()) {
            formData.append('amenities', input.value.trim());
        }
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

// Initialize
populateLocationSuggestions();
loadDashboard();