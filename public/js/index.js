// AutoMax Car Sales - Index page authentication and user display functionality
class AutoMaxIndexManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            console.log('Checking authentication status...');
            
            // Check if user is authenticated via session
            const sessionResult = await SessionManager.checkSession();
            
            if (sessionResult.authenticated) {
                console.log('User is authenticated, showing user content');
                await this.showUserContent(sessionResult.user);
            } else {
                console.log('User is not authenticated, showing guest content');
                this.showGuestContent();
            }
            
            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing AutoMax index page:', error);
            this.showGuestContent();
        }
    }

    async showUserContent(user) {
        try {
            console.log('User profile loaded:', user.name || user.phone);
            
            // Hide guest content and show user content
            document.getElementById('guest-content').style.display = 'none';
            document.getElementById('user-content').style.display = 'block';
            
            // Populate user information
            this.displayUserInfo(user);
            
            // Update page title to show logged in status
            document.title = `AutoMax - Welcome ${user.name || 'User'}`;
        } catch (error) {
            console.error('Error showing user content:', error);
            this.showGuestContent();
        }
    }

    showGuestContent() {
        console.log('Displaying guest content');
        document.getElementById('guest-content').style.display = 'block';
        document.getElementById('user-content').style.display = 'none';
        document.title = 'AutoMax - Premium Car Sales';
    }

    displayUserInfo(user) {
        // Display user name in welcome message
        const displayName = user.name || user.phone || 'Valued Customer';
        document.getElementById('user-name').textContent = displayName;
        
        // Display detailed account information
        document.getElementById('display-name').textContent = user.name || 'Not set';
        document.getElementById('display-phone').textContent = user.phone || 'Not set';
        document.getElementById('display-email').textContent = user.email || 'Not set';
        
        // Format and display customer since date
        if (user.created_at) {
            const customerSince = new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('display-date').textContent = customerSince;
        } else {
            document.getElementById('display-date').textContent = 'Not available';
        }
        
        console.log('User information displayed successfully');
    }

    setupEventListeners() {
        // Logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    console.log('Logging out user...');
                    await SessionManager.logout();
                    console.log('Logout successful, reloading page');
                    // Refresh the page to show guest content
                    window.location.reload();
                } catch (error) {
                    console.error('Error during logout:', error);
                    // Still try to clear local state and reload
                    localStorage.removeItem('token');
                    window.location.reload();
                }
            });
        }

        // Prevent double login - if user is already logged in and tries to go to login page
        const loginLinks = document.querySelectorAll('a[href="login.html"]');
        loginLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                // Check if user is currently logged in
                const isLoggedIn = document.getElementById('user-content').style.display !== 'none';
                if (isLoggedIn) {
                    e.preventDefault();
                    alert('You are already logged in! Use the logout button if you want to switch accounts.');
                    return false;
                }
            });
        });
    }

    // Method to refresh user status (can be called externally)
    async refreshUserStatus() {
        await this.init();
    }
}

// Initialize the AutoMax index page manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.autoMaxManager = new AutoMaxIndexManager();
});

// Add a function to check login status (can be used by other scripts)
window.checkLoginStatus = async function() {
    if (window.autoMaxManager) {
        await window.autoMaxManager.refreshUserStatus();
    }
};
