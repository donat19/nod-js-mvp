// Session management utilities for frontend

class SessionManager {
  // Check if user is authenticated via session
  static async checkSession() {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        return {
          authenticated: true,
          user: data.user,
          session: data.session
        };
      }
      
      return { authenticated: false };
    } catch (error) {
      console.error('Session check error:', error);
      return { authenticated: false };
    }
  }

  // Logout user
  static async logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      // Clear any localStorage tokens as backup
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return data.sessionCleared || false;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear localStorage anyway
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  }

  // Get user profile (tries session first, then token)
  static async getUserProfile() {
    try {
      // First try session-based auth
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          user: data.user,
          method: data.method,
          session: data.session
        };
      }
      
      // Fallback to token-based auth
      const token = localStorage.getItem('token');
      if (token) {
        const tokenResponse = await fetch('/api/auth/profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          return {
            success: true,
            user: tokenData.user,
            method: 'jwt-fallback',
            session: null
          };
        }
      }
      
      return { success: false };
    } catch (error) {
      console.error('Profile fetch error:', error);
      return { success: false };
    }
  }

  // Redirect to login if not authenticated
  static async requireAuth() {
    const session = await this.checkSession();
    
    if (!session.authenticated) {
      // Clear any stale localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      window.location.href = '/login.html';
      return false;
    }
    
    return session;
  }

  // Check if user has admin access
  static async requireAdmin() {
    const session = await this.requireAuth();
    
    if (!session || !session.user.is_admin) {
      alert('Admin access required');
      window.location.href = '/dashboard';
      return false;
    }
    
    return session;
  }

  // Display user info on page
  static displayUserInfo(user, containerId = 'user-info') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="user-info">
        <span class="user-name">${user.name || user.phone || 'User'}</span>
        ${user.is_verified ? '<span class="verified">✓</span>' : ''}
        ${user.is_admin ? '<span class="admin">Admin</span>' : ''}
      </div>
    `;
  }
}

// Auto-check session on page load (only for protected pages, not index or login)
document.addEventListener('DOMContentLoaded', async function() {
  // Skip auto-check on index and login pages as they have their own logic
  const skipPages = ['index.html', 'login.html', '/'];
  const currentPage = window.location.pathname;
  
  if (skipPages.some(page => currentPage.includes(page) || currentPage === '/')) {
    console.log('Skipping auto session check for:', currentPage);
    return;
  }
  
  console.log('Auto-checking session for page:', currentPage);
  const session = await SessionManager.checkSession();
  
  if (session.authenticated) {
    // Update any user displays on the page
    SessionManager.displayUserInfo(session.user);
    
    // Store user info for backward compatibility
    localStorage.setItem('user', JSON.stringify(session.user));
  }
});

// Global logout function
function logout() {
  SessionManager.logout().then(() => {
    window.location.href = '/';
  });
}
