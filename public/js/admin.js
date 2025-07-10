// Admin panel JavaScript functionality

let allUsers = [];
let filteredUsers = [];
let currentUser = null;

// Check if user has admin access and load data
async function checkAdminAccess() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showAuthError();
        return false;
    }
    
    try {
        // First verify the token and get user info
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            
            // For now, we'll allow any verified user to access admin (you can add role-based access later)
            if (currentUser.is_verified) {
                await loadAdminData();
                return true;
            } else {
                showAuthError('You need to be verified to access the admin panel.');
                return false;
            }
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showAuthError();
            return false;
        }
    } catch (error) {
        console.error('Admin access check failed:', error);
        showAuthError('Failed to verify admin access. Please try again.');
        return false;
    }
}

// Load admin data
async function loadAdminData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            allUsers = data.users;
            filteredUsers = [...allUsers];
            
            displayStats(data.stats);
            displayUsers();
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
        } else {
            throw new Error('Failed to load admin data');
        }
    } catch (error) {
        console.error('Failed to load admin data:', error);
        showAuthError('Failed to load admin data. Please try again.');
    }
}

// Display statistics
function displayStats(stats) {
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card verified">
            <div class="stat-number">${stats.verified}</div>
            <div class="stat-label">Verified Users</div>
        </div>
        <div class="stat-card unverified">
            <div class="stat-number">${stats.unverified}</div>
            <div class="stat-label">Unverified Users</div>
        </div>
        <div class="stat-card inactive">
            <div class="stat-number">${stats.inactive}</div>
            <div class="stat-label">Inactive Users</div>
        </div>
    `;
}

// Display users in table
function displayUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #6c757d;">No users found</td></tr>';
        return;
    }
    
    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Determine status
        let statusClass = 'status-verified';
        let statusText = 'Active';
        if (!user.is_active) {
            statusClass = 'status-inactive';
            statusText = 'Inactive';
        } else if (!user.is_verified) {
            statusClass = 'status-unverified';
            statusText = 'Unverified';
        }
        
        row.innerHTML = `
            <td title="${user.id}">${user.id.substring(0, 8)}...</td>
            <td><span class="phone-link" onclick="populatePhoneNumber('${user.phone}')" style="cursor: pointer; color: #007bff; text-decoration: underline;" title="Click to populate messaging form">${user.phone || '-'}</span></td>
            <td>${user.email || '-'}</td>
            <td>${user.name || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${user.is_verified ? '✅' : '❌'}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>${new Date(user.updated_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-primary view-user-btn" data-user-id="${user.id}" style="font-size: 12px; padding: 4px 8px;">View</button>
                ${!user.is_active ? 
                    `<button class="btn btn-success activate-user-btn" data-user-id="${user.id}" style="font-size: 12px; padding: 4px 8px;">Activate</button>` :
                    `<button class="btn btn-danger deactivate-user-btn" data-user-id="${user.id}" style="font-size: 12px; padding: 4px 8px;">Deactivate</button>`
                }
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Filter users
function filterUsers() {
    const filterValue = document.getElementById('filter').value;
    const searchValue = document.getElementById('search').value.toLowerCase();
    
    filteredUsers = allUsers.filter(user => {
        // Apply status filter
        let matchesFilter = true;
        switch (filterValue) {
            case 'verified':
                matchesFilter = user.is_verified && user.is_active;
                break;
            case 'unverified':
                matchesFilter = !user.is_verified && user.is_active;
                break;
            case 'inactive':
                matchesFilter = !user.is_active;
                break;
            default:
                matchesFilter = true;
        }
        
        // Apply search filter
        const matchesSearch = searchValue === '' || 
            (user.phone && user.phone.toLowerCase().includes(searchValue)) ||
            (user.email && user.email.toLowerCase().includes(searchValue)) ||
            (user.name && user.name.toLowerCase().includes(searchValue));
        
        return matchesFilter && matchesSearch;
    });
    
    displayUsers();
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', filterUsers);
    }
    
    // Add event listeners for buttons
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
    }
    
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    const filterSelect = document.getElementById('filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', filterUsers);
    }
    
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/login.html';
        });
    }
    
    // SMS Messaging functionality
    const sendMessageBtn = document.getElementById('send-message-btn');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendDirectSMS);
    }
    
    const sendWelcomeBtn = document.getElementById('send-welcome-btn');
    if (sendWelcomeBtn) {
        sendWelcomeBtn.addEventListener('click', sendWelcomeSMS);
    }
    
    // Event delegation for user action buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            viewUser(userId);
        } else if (e.target.classList.contains('activate-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            activateUser(userId);
        } else if (e.target.classList.contains('deactivate-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            deactivateUser(userId);
        }
    });
    
    checkAdminAccess();
});

// View user details
function viewUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        alert(`User Details:\n\nID: ${user.id}\nPhone: ${user.phone || 'Not set'}\nEmail: ${user.email || 'Not set'}\nName: ${user.name || 'Not set'}\nGoogle ID: ${user.google_id || 'Not linked'}\nVerified: ${user.is_verified ? 'Yes' : 'No'}\nActive: ${user.is_active ? 'Yes' : 'No'}\nCreated: ${new Date(user.created_at).toLocaleString()}\nLast Updated: ${new Date(user.updated_at).toLocaleString()}`);
    }
}

// Activate user
async function activateUser(userId) {
    if (confirm('Are you sure you want to activate this user?')) {
        await updateUserStatus(userId, true);
    }
}

// Deactivate user
async function deactivateUser(userId) {
    if (confirm('Are you sure you want to deactivate this user?')) {
        await updateUserStatus(userId, false);
    }
}

// Update user status
async function updateUserStatus(userId, isActive) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: isActive })
        });
        
        if (response.ok) {
            alert(`User ${isActive ? 'activated' : 'deactivated'} successfully!`);
            await loadAdminData();
        } else {
            const error = await response.json();
            alert('Failed to update user: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Failed to update user status:', error);
        alert('Failed to update user status. Please try again.');
    }
}

// Refresh data
async function refreshData() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('admin-content').style.display = 'none';
    await loadAdminData();
}

// Export data to CSV
function exportData() {
    if (filteredUsers.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['ID', 'Phone', 'Email', 'Name', 'Verified', 'Active', 'Created', 'Updated'];
    const csvContent = [
        headers.join(','),
        ...filteredUsers.map(user => [
            user.id,
            user.phone || '',
            user.email || '',
            user.name || '',
            user.is_verified,
            user.is_active,
            user.created_at,
            user.updated_at
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Show authentication error
function showAuthError(message = 'You don\'t have permission to access the admin panel.') {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('admin-content').style.display = 'none';
    document.getElementById('auth-error').style.display = 'block';
    
    const errorDiv = document.getElementById('auth-error');
    errorDiv.querySelector('p').textContent = message;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// SMS Messaging Functions

// Send direct SMS message
async function sendDirectSMS() {
    const phoneInput = document.getElementById('message-phone');
    const messageInput = document.getElementById('message-text');
    const statusDiv = document.getElementById('message-status');
    
    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!phone || !message) {
        showMessageStatus('Please enter both phone number and message.', 'error');
        return;
    }
    
    // Validate Canadian phone number format
    const phoneRegex = /^\+1[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        showMessageStatus('Please enter a valid Canadian phone number (+1XXXXXXXXXX).', 'error');
        return;
    }
    
    const sendButton = document.getElementById('send-message-btn');
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/sms/send-direct', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessageStatus(`✅ SMS sent successfully to ${phone}`, 'success');
            messageInput.value = ''; // Clear message input
        } else {
            showMessageStatus(`❌ Failed to send SMS: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        showMessageStatus('❌ Error sending SMS. Please try again.', 'error');
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = 'Send Direct SMS';
    }
}

// Send welcome SMS message
async function sendWelcomeSMS() {
    const phoneInput = document.getElementById('message-phone');
    const statusDiv = document.getElementById('message-status');
    
    const phone = phoneInput.value.trim();
    
    if (!phone) {
        showMessageStatus('Please enter a phone number.', 'error');
        return;
    }
    
    // Validate Canadian phone number format
    const phoneRegex = /^\+1[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        showMessageStatus('Please enter a valid Canadian phone number (+1XXXXXXXXXX).', 'error');
        return;
    }
    
    // Try to find user name
    let userName = 'User';
    const user = allUsers.find(u => u.phone === phone);
    if (user && user.name) {
        userName = user.name;
    }
    
    const sendButton = document.getElementById('send-welcome-btn');
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/sms/welcome', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, name: userName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessageStatus(`✅ Welcome SMS sent successfully to ${phone} (${userName})`, 'success');
        } else {
            showMessageStatus(`❌ Failed to send welcome SMS: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error sending welcome SMS:', error);
        showMessageStatus('❌ Error sending welcome SMS. Please try again.', 'error');
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = 'Send Welcome SMS';
    }
}

// Show message status
function showMessageStatus(message, type) {
    const statusDiv = document.getElementById('message-status');
    statusDiv.textContent = message;
    statusDiv.className = `message-status ${type}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Populate phone number from user table click (optional enhancement)
function populatePhoneNumber(phone) {
    const phoneInput = document.getElementById('message-phone');
    if (phoneInput) {
        phoneInput.value = phone;
        phoneInput.focus();
        
        // Scroll to messaging section
        const messagingSection = document.querySelector('.messaging-section');
        if (messagingSection) {
            messagingSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
}
