let currentProperty = null;


window.showPropertyDetails = async (propertyId) => {
    console.log('showPropertyDetails called with id:', propertyId);
    
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login to view property details', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    try {
        const response = await fetch(`/api/properties/${propertyId}`);
        const data = await response.json();
        
        if (data.success) {
            currentProperty = data.property;
            
            let hasPendingBooking = false;
            try {
                const bookingsResponse = await fetch('/api/bookings/my', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const bookingsData = await bookingsResponse.json();
                if (bookingsData.success) {
                    hasPendingBooking = bookingsData.bookings.some(
                        b => b.propertyId === propertyId && b.status === 'pending'
                    );
                }
            } catch (error) {
                console.error('Error checking pending booking:', error);
            }
            
            const modalTitle = document.getElementById('modalTitle');
            const modalPropertyTitle = document.getElementById('modalPropertyTitle');
            const modalLocation = document.getElementById('modalLocation');
            const modalBedrooms = document.getElementById('modalBedrooms');
            const modalBathrooms = document.getElementById('modalBathrooms');
            const modalPrice = document.getElementById('modalPrice');
            const bookingPropertyId = document.getElementById('bookingPropertyId');
            const modalImage = document.getElementById('modalImage');
            const modalAmenities = document.getElementById('modalAmenities');
            const modalDescription = document.getElementById('modalDescription');
            const visitDateInput = document.getElementById('visitDate');
            
            if (modalTitle) modalTitle.innerHTML = currentProperty.title;
            if (modalPropertyTitle) modalPropertyTitle.innerHTML = currentProperty.title;
            if (modalLocation) modalLocation.innerHTML = currentProperty.location;
            if (modalBedrooms) modalBedrooms.innerHTML = currentProperty.bedrooms || 1;
            if (modalBathrooms) modalBathrooms.innerHTML = currentProperty.bathrooms || 1;
            if (modalPrice) modalPrice.innerHTML = currentProperty.price.toLocaleString();
            if (bookingPropertyId) bookingPropertyId.value = currentProperty._id;
            
            const today = new Date().toISOString().split('T')[0];
            if (visitDateInput) {
                visitDateInput.min = today;
            }
            
            let imageUrl = 'https://via.placeholder.com/800x400?text=No+Image';
            if (currentProperty.images && currentProperty.images.main) {
                imageUrl = currentProperty.images.main;
            }
            if (modalImage) modalImage.src = imageUrl;
            
            if (modalAmenities) {
                if (currentProperty.amenities && currentProperty.amenities.length > 0) {
                    modalAmenities.innerHTML = currentProperty.amenities.map(a => 
                        `<span class="amenity-badge"><i class="fas fa-check-circle me-1"></i> ${a}</span>`
                    ).join('');
                } else {
                    modalAmenities.innerHTML = '<span class="text-muted">No amenities listed</span>';
                }
            }
            
            if (modalDescription) {
                modalDescription.innerHTML = currentProperty.description || 'No description available.';
            }
            
            const bookingFormSide = document.querySelector('.booking-form-side');
            if (bookingFormSide) {
                if (hasPendingBooking) {
                    bookingFormSide.innerHTML = `
                        <div class="text-center p-4">
                            <i class="fas fa-hourglass-half fa-3x" style="color: #f59e0b;"></i>
                            <h4 class="mt-3" style="color: #f59e0b;">Request Pending</h4>
                            <p>You already have a pending request for this property.</p>
                            <p class="text-muted">Please wait for admin to review your request.</p>
                            <hr>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                You will be notified once the admin responds.
                            </small>
                        </div>
                    `;
                } else {
                    const originalForm = `
                        <h5><i class="fas fa-calendar-alt me-2"></i> Request a Visit</h5>
                        <form id="bookingRequestForm">
                            <input type="hidden" id="bookingPropertyId" value="${currentProperty._id}">
                            <div class="form-group">
                                <label><i class="fas fa-calendar-day me-1"></i> Preferred Visit Date *</label>
                                <input type="date" id="visitDate" class="form-control" min="${today}" required>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-clock me-1"></i> Preferred Visit Time *</label>
                                <div class="row">
                                    <div class="col-5">
                                        <select id="visitTimeHour" class="form-select" required>
                                            <option value="">Hour</option>
                                            <option value="01">01</option><option value="02">02</option>
                                            <option value="03">03</option><option value="04">04</option>
                                            <option value="05">05</option><option value="06">06</option>
                                            <option value="07">07</option><option value="08">08</option>
                                            <option value="09">09</option><option value="10">10</option>
                                            <option value="11">11</option><option value="12">12</option>
                                        </select>
                                    </div>
                                    <div class="col-4">
                                        <select id="visitTimeMinute" class="form-select" required>
                                            <option value="">Min</option>
                                            <option value="00">00</option><option value="15">15</option>
                                            <option value="30">30</option><option value="45">45</option>
                                        </select>
                                    </div>
                                    <div class="col-3">
                                        <select id="visitTimeAmPm" class="form-select">
                                            <option value="AM">AM</option><option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-comment me-1"></i> Message to Owner</label>
                                <textarea id="visitMessage" class="form-control" rows="4" placeholder="Any specific questions or requirements?"></textarea>
                            </div>
                            <button type="submit" class="btn-primary mt-3">
                                <i class="fas fa-paper-plane me-2"></i> Send Visit Request
                            </button>
                        </form>
                        <hr class="my-4">
                        <div class="text-center">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt me-1"></i>
                                Your request will be reviewed by the property owner
                            </small>
                        </div>
                    `;
                    bookingFormSide.innerHTML = originalForm;
                    setupBookingForm();
                }
            }
            
            const visitTimeHour = document.getElementById('visitTimeHour');
            const visitTimeMinute = document.getElementById('visitTimeMinute');
            const visitTimeAmPm = document.getElementById('visitTimeAmPm');
            if (visitTimeHour) visitTimeHour.value = '';
            if (visitTimeMinute) visitTimeMinute.value = '';
            if (visitTimeAmPm) visitTimeAmPm.value = 'AM';
            
            const visitMessage = document.getElementById('visitMessage');
            if (visitMessage) visitMessage.value = '';
            
            const modal = document.getElementById('propertyModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
                document.body.style.overflow = 'hidden';
            }
        }
    } catch (error) {
        console.error('Error showing property details:', error);
        showToast(error.message, 'error');
    }
};

window.closePropertyModal = function() {
    const modal = document.getElementById('propertyModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
};

async function submitBookingRequest(propertyId, visitDate, visitHour, visitMinute, visitAmPm, message, onSuccessCallback) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    
    const visitTime = `${visitHour}:${visitMinute} ${visitAmPm || 'AM'}`;
    
    const requestBody = {
        propertyId: propertyId,
        startDate: visitDate,
        endDate: visitDate,
        message: `📅 Visit Date: ${visitDate}\n⏰ Visit Time: ${visitTime}\n\n📝 Message:\n${message || 'No message'}`
    };
    
    console.log('Sending booking request:', requestBody);
    
    try {
        const response = await fetch('/api/bookings/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        console.log('Booking response:', data);
        
        if (response.status === 401) {
            showToast('Session expired. Please login again.', 'error');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        
        if (data.success) {
            showToast('✅ Visit request sent successfully! We will contact you soon.', 'success');
            
            // ✅ ADD THIS LINE HERE - Refresh pending bookings on index page
            if (typeof window.refreshUserBookings === 'function') {
                window.refreshUserBookings();
            }
            
            // Don't close modal immediately, wait a bit
            setTimeout(() => {
                closePropertyModal();
                
                // Refresh the dashboard if we're on dashboard page
                if (typeof loadAvailableProperties === 'function') {
                    loadAvailableProperties();
                }
                if (typeof loadMyBookings === 'function') {
                    loadMyBookings();
                }
                if (typeof loadProperties === 'function') {
                    loadProperties();
                }
                
                if (onSuccessCallback && typeof onSuccessCallback === 'function') {
                    onSuccessCallback();
                }
            }, 1500);
            
            return true;
        } else {
            showToast(data.error || 'Failed to send request', 'error');
            return false;
        }
    } catch (error) {
        console.error('Booking error:', error);
        showToast(error.message || 'Network error', 'error');
        return false;
    }
}

function setupBookingForm() {
    const bookingForm = document.getElementById('bookingRequestForm');
    if (!bookingForm) return;
    
    // Remove existing listener to prevent duplicates
    const newForm = bookingForm.cloneNode(true);
    bookingForm.parentNode.replaceChild(newForm, bookingForm);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prevent double submission
        if (newForm.hasAttribute('data-submitting')) return;
        newForm.setAttribute('data-submitting', 'true');
        
        console.log('Booking form submitted');
        
        const propertyId = document.getElementById('bookingPropertyId')?.value;
        const visitDate = document.getElementById('visitDate')?.value;
        
        const visitHourElement = document.getElementById('visitTimeHour');
        const visitMinuteElement = document.getElementById('visitTimeMinute');
        const visitAmPmElement = document.getElementById('visitTimeAmPm');
        
        const visitHour = visitHourElement ? visitHourElement.value : null;
        const visitMinute = visitMinuteElement ? visitMinuteElement.value : null;
        const visitAmPm = visitAmPmElement ? visitAmPmElement.value : 'AM';
        const message = document.getElementById('visitMessage')?.value || '';
        
        if (!visitDate) {
            showToast('Please select visit date', 'error');
            newForm.removeAttribute('data-submitting');
            return;
        }
        
        if (!visitHour || !visitMinute) {
            showToast('Please select visit time (hour and minute)', 'error');
            newForm.removeAttribute('data-submitting');
            return;
        }
        
        const submitBtn = newForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : 'Send Request';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';
            submitBtn.disabled = true;
        }
        
        const success = await submitBookingRequest(propertyId, visitDate, visitHour, visitMinute, visitAmPm, message);
        
        if (success) {
            newForm.reset();
            if (visitHourElement) visitHourElement.value = '';
            if (visitMinuteElement) visitMinuteElement.value = '';
            if (visitAmPmElement) visitAmPmElement.value = 'AM';
        }
        
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
        
        newForm.removeAttribute('data-submitting');
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('propertyModal');
        if (modal && modal.classList.contains('show')) {
            closePropertyModal();
        }
    }
});

window.onclick = function(event) {
    const modal = document.getElementById('propertyModal');
    if (event.target === modal) {
        closePropertyModal();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupBookingForm();
});