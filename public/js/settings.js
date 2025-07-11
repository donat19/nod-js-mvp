// Settings page functionality
class SettingsPageManager {
    constructor() {
        this.sessionManager = new SessionManager();
        this.init();
    }

    async init() {
        try {
            // Check if user is authenticated
            const isAuthenticated = await this.sessionManager.checkSession();
            
            if (!isAuthenticated) {
                // Redirect to login if not authenticated
                window.location.href = 'login.html';
                return;
            }
            
            // Load user profile
            await this.loadUserProfile();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show content
            this.showContent();
        } catch (error) {
            console.error('Error initializing settings page:', error);
            window.location.href = 'login.html';
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateProfile(data.user);
            } else {
                throw new Error('Failed to load profile');
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            alert('Error loading profile. Please try again.');
        }
    }

    populateProfile(user) {
        // Populate form fields
        document.getElementById('name').value = user.name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone || '';
        
        // Populate account info
        document.getElementById('status').textContent = user.is_active ? 'Active' : 'Inactive';
        
        if (user.created_at) {
            const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('member-since').textContent = memberSince;
        }
        
        if (user.last_login) {
            const lastLogin = new Date(user.last_login).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('last-login').textContent = lastLogin;
        } else {
            document.getElementById('last-login').textContent = 'Not available';
        }
    }

    setupEventListeners() {
        // Profile form submission
        const profileForm = document.getElementById('profile-form');
        profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        
        // Change phone button
        const changePhoneBtn = document.getElementById('change-phone-btn');
        changePhoneBtn.addEventListener('click', () => this.handleChangePhone());
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const updateData = {
                name: formData.get('name'),
                email: formData.get('email')
            };
            
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify(updateData)
            });
            
            if (response.ok) {
                alert('Profile updated successfully!');
                await this.loadUserProfile(); // Refresh profile data
            } else {
                const errorData = await response.json();
                alert(`Error updating profile: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile. Please try again.');
        }
    }

    handleChangePhone() {
        if (confirm('Changing your phone number will require verification. Continue?')) {
            // Redirect to login page for phone number change
            alert('Please login again with your new phone number to change it.');
            window.location.href = 'login.html';
        }
    }

    async handleLogout() {
        try {
            await this.sessionManager.logout();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error during logout:', error);
            // Still try to clear local state and redirect
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        }
    }

    showContent() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('settings-content').style.display = 'block';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsPageManager();
});
