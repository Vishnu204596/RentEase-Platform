// Toast Notification System - RentEase Style
console.log('Toast.js loaded - RentEase Edition');

function showToast(message, type = 'success') {
    console.log('Toast function called with:', message, type);
    
    // Create container if it doesn't exist
    let container = document.getElementById('rentease-toast-container');
    if (!container) {
        console.log('Creating toast container');
        container = document.createElement('div');
        container.id = 'rentease-toast-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 380px;
        `;
        document.body.appendChild(container);
    }
    
    // Get colors based on type (matching your theme)
    const colors = {
        success: {
            border: '#10b981',
            bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
            icon: '#10b981',
            title: 'Success!'
        },
        error: {
            border: '#ef4444',
            bg: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
            icon: '#ef4444',
            title: 'Error!'
        },
        warning: {
            border: '#f59e0b',
            bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
            icon: '#f59e0b',
            title: 'Warning!'
        },
        info: {
            border: '#3b82f6',
            bg: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
            icon: '#3b82f6',
            title: 'Information'
        }
    };
    
    const color = colors[type] || colors.success;
    
    // Icons mapping
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${color.bg};
        border-radius: 16px;
        padding: 16px 20px;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        border-left: 4px solid ${color.border};
        animation: renteaseSlideIn 0.3s ease forwards;
        backdrop-filter: blur(10px);
        font-family: 'Inter', 'Segoe UI', sans-serif;
        transition: all 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="flex-shrink: 0;">
            <div style="
                width: 28px;
                height: 28px;
                background: ${color.border}20;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: bold;
                color: ${color.icon};
            ">
                ${icons[type]}
            </div>
        </div>
        <div style="flex: 1; min-width: 0;">
            <div style="
                font-weight: 700;
                margin-bottom: 4px;
                color: #1e293b;
                font-size: 15px;
            ">
                ${color.title}
            </div>
            <div style="
                font-size: 13px;
                color: #475569;
                line-height: 1.5;
                word-wrap: break-word;
            ">
                ${message}
            </div>
        </div>
        <div style="flex-shrink: 0; cursor: pointer;" onclick="this.parentElement.remove()">
            <div style="
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                color: #94a3b8;
                font-size: 16px;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#f1f5f9'; this.style.color='#ef4444'" 
             onmouseout="this.style.background='transparent'; this.style.color='#94a3b8'">
                ✕
            </div>
        </div>
    `;
    
    // Add progress bar
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: ${color.border};
        animation: renteaseProgress 4s linear forwards;
        border-radius: 0 0 0 16px;
    `;
    toast.style.position = 'relative';
    toast.style.overflow = 'hidden';
    toast.appendChild(progressBar);
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'renteaseSlideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, 4000);
    
    // Hover pause effect
    toast.addEventListener('mouseenter', () => {
        progressBar.style.animationPlayState = 'paused';
    });
    
    toast.addEventListener('mouseleave', () => {
        progressBar.style.animationPlayState = 'running';
    });
}

// Add CSS animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes renteaseSlideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes renteaseSlideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes renteaseProgress {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }
`;
document.head.appendChild(toastStyles);