// Dashboard page JavaScript functionality

let currentUser = null;

// Check authentication and load user data
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showAuthError();
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            displayDashboard();
            return true;
        } else {
            // Token is invalid, clear storage and show auth error
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showAuthError();
            return false;
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        showAuthError();
        return false;
    }
}

// Display dashboard content
function displayDashboard() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';
    
    // Update welcome message
    const welcomeDiv = document.getElementById('user-welcome');
    const userName = currentUser.name || currentUser.phone || 'User';
    welcomeDiv.innerHTML = `<h2>Welcome back, ${userName}! 👋</h2>`;
    
    // Display user information
    const userInfoDiv = document.getElementById('user-info');
    userInfoDiv.innerHTML = `
        <h3>Account Information</h3>
        <p><strong>Phone:</strong> ${currentUser.phone || 'Not provided'}</p>
        <p><strong>Email:</strong> ${currentUser.email || 'Not provided'}</p>
        <p><strong>Name:</strong> ${currentUser.name || 'Not set'}</p>
        <p><strong>Member since:</strong> ${new Date(currentUser.created_at).toLocaleDateString()}</p>
        <p><strong>Last updated:</strong> ${new Date(currentUser.updated_at).toLocaleDateString()}</p>
    `;
}

// Show authentication error
function showAuthError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'none';
    document.getElementById('auth-error').style.display = 'block';
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear stored tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Optional: call logout API
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        })
        .then(() => {
            alert('You have been logged out successfully.');
            window.location.href = '/';
        })
        .catch(() => {
            // Even if API call fails, still redirect
            alert('You have been logged out successfully.');
            window.location.href = '/';
        });
    }
}

// View profile function
function viewProfile() {
    if (currentUser) {
        alert(`Profile Information:\n\nPhone: ${currentUser.phone}\nEmail: ${currentUser.email || 'Not set'}\nName: ${currentUser.name || 'Not set'}\nMember since: ${new Date(currentUser.created_at).toLocaleDateString()}`);
    }
}

// Settings function
function showSettings() {
    alert('Settings page is coming soon! You will be able to:\n\n• Update your profile information\n• Change notification preferences\n• Manage security settings\n• Update contact information');
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for buttons
    const viewProfileBtn = document.getElementById('view-profile-btn');
    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', viewProfile);
    }
    
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }
    
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            window.location.href = '/admin';
        });
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const authLoginBtn = document.getElementById('auth-login-btn');
    if (authLoginBtn) {
        authLoginBtn.addEventListener('click', () => {
            window.location.href = '/login.html';
        });
    }
    
    checkAuthentication();
});
