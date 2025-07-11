// Login page JavaScript functionality

// Global variables to track login state
let currentPhone = '';
let isExistingUser = false;
let userInfo = null;

// Phone number validation and formatting functions
function formatCanadianPhoneNumber(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Check if it's a valid Canadian number
    if (digits.length === 10) {
        // Add +1 prefix for 10-digit numbers
        return '+1' + digits;
    } else if (digits.length === 11 && digits.startsWith('1')) {
        // Already has 1 prefix, just add +
        return '+' + digits;
    } else if (phone.startsWith('+1') && digits.length === 11) {
        // Already properly formatted
        return phone;
    }
    
    return null; // Invalid format
}

function isValidCanadianPhoneNumber(phone) {
    const formatted = formatCanadianPhoneNumber(phone);
    return formatted !== null;
}

function showPhoneWarning(message, isSuccess = false) {
    const warningDiv = document.getElementById('phone-warning');
    warningDiv.textContent = message;
    warningDiv.className = isSuccess ? 'success-message' : 'warning-message';
    warningDiv.style.display = 'block';
    
    // Hide warning after 5 seconds if it's a success message
    if (isSuccess) {
        setTimeout(() => {
            warningDiv.style.display = 'none';
        }, 5000);
    }
}

function hidePhoneWarning() {
    const warningDiv = document.getElementById('phone-warning');
    warningDiv.style.display = 'none';
}

function showVerificationWarning(message) {
    const warningDiv = document.getElementById('verification-warning');
    warningDiv.textContent = message;
    warningDiv.style.display = 'block';
}

function hideVerificationWarning() {
    const warningDiv = document.getElementById('verification-warning');
    warningDiv.style.display = 'none';
}

function showVerificationSection(phone, isExisting, userInfo) {
    currentPhone = phone;
    isExistingUser = isExisting;
    
    // Update verification info
    document.getElementById('verification-phone').textContent = phone;
    
    // Show appropriate message
    const infoDiv = document.getElementById('verification-info');
    if (isExisting && userInfo) {
        infoDiv.innerHTML = `
            <strong>Welcome back!</strong><br>
            <strong>Phone:</strong> ${phone}<br>
            ${userInfo.name ? `<strong>Name:</strong> ${userInfo.name}<br>` : ''}
            ${userInfo.email ? `<strong>Email:</strong> ${userInfo.email}<br>` : ''}
            <em>Member since: ${new Date(userInfo.created_at).toLocaleDateString()}</em>
        `;
        infoDiv.style.backgroundColor = '#d4edda';
        infoDiv.style.borderColor = '#c3e6cb';
    } else {
        infoDiv.innerHTML = `
            <strong>New Account</strong><br>
            <strong>Phone:</strong> ${phone}<br>
            <em>A new account will be created for you</em>
        `;
        infoDiv.style.backgroundColor = '#e8f4f8';
        infoDiv.style.borderColor = '#bee5eb';
    }
    
    // Show verification section and focus on code input
    document.getElementById('sms-verification').style.display = 'block';
    
    const codeInput = document.getElementById('sms-code');
    codeInput.focus();
    
    // Add auto-submit when 6 digits are entered
    codeInput.addEventListener('input', function() {
        // Remove any non-digits
        this.value = this.value.replace(/\D/g, '');
        
        // Auto-submit when 6 digits are entered
        if (this.value.length === 6) {
            setTimeout(() => verifySMS(), 100); // Small delay for better UX
        }
        
        // Hide warning when user starts typing
        if (this.value.length > 0) {
            hideVerificationWarning();
        }
    });
    
    // Allow Enter key to submit
    codeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.length >= 4) {
            verifySMS();
        }
    });
    
    // Hide phone warning
    hidePhoneWarning();
}

// SMS Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const smsForm = document.getElementById('sms-login-form');
    const phoneInput = document.getElementById('phone');
    
    // Add event listeners for buttons
    const verifySMSBtn = document.getElementById('verify-sms-btn');
    if (verifySMSBtn) {
        verifySMSBtn.addEventListener('click', verifySMS);
    }
    
    const resendCodeBtn = document.getElementById('resend-code-btn');
    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', resendCode);
    }
    
    const cancelVerificationBtn = document.getElementById('cancel-verification-btn');
    if (cancelVerificationBtn) {
        cancelVerificationBtn.addEventListener('click', cancelVerification);
    }
    
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', loginWithGoogle);
    }
    
    const telegramLoginBtn = document.getElementById('telegram-login-btn');
    if (telegramLoginBtn) {
        telegramLoginBtn.addEventListener('click', loginWithTelegram);
    }
    
    // Add real-time phone number validation
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            const phone = this.value.trim();
            
            if (phone.length === 0) {
                hidePhoneWarning();
                return;
            }
            
            if (isValidCanadianPhoneNumber(phone)) {
                const formatted = formatCanadianPhoneNumber(phone);
                if (phone !== formatted) {
                    // Auto-correct the input
                    this.value = formatted;
                    showPhoneWarning(`✓ Number auto-formatted to Canadian format: ${formatted}`, true);
                } else {
                    hidePhoneWarning();
                }
            } else {
                showPhoneWarning('⚠️ Please enter a valid Canadian phone number (10 digits). Example: 4165551234 or +14165551234');
            }
        });
        
        // Also validate on blur (when user leaves the field)
        phoneInput.addEventListener('blur', function() {
            const phone = this.value.trim();
            
            if (phone.length > 0 && isValidCanadianPhoneNumber(phone)) {
                const formatted = formatCanadianPhoneNumber(phone);
                if (phone !== formatted) {
                    this.value = formatted;
                    showPhoneWarning(`✓ Number corrected to Canadian format: ${formatted}`, true);
                }
            }
        });
    }
    
    if (smsForm) {
        smsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const phoneInput = document.getElementById('phone');
            const phone = phoneInput.value.trim();
            
            // Validate and format phone number before sending
            if (!isValidCanadianPhoneNumber(phone)) {
                showPhoneWarning('❌ Please enter a valid Canadian phone number before proceeding.');
                phoneInput.focus();
                return;
            }
            
            const formattedPhone = formatCanadianPhoneNumber(phone);
            phoneInput.value = formattedPhone; // Ensure input shows formatted version
            
            if (formattedPhone) {
                // Send request to your API using unique verification system
                fetch('/api/auth/sms/send-unique', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ phone: formattedPhone })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        showVerificationSection(formattedPhone, data.isExistingUser, data.userInfo);
                        const methodText = data.method === 'custom_unique' ? 'with collision-safe code' : '';
                        if (data.isExistingUser) {
                            alert(`Welcome back! SMS code sent to ${formattedPhone} ${methodText}. Please check your phone.`);
                        } else {
                            alert(`SMS code sent to ${formattedPhone} ${methodText}. A new account will be created for you.`);
                        }
                    } else {
                        alert('Failed to send SMS: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    // Fallback to regular verification if unique system fails
                    console.log('Falling back to regular verification system...');
                    
                    fetch('/api/auth/sms/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ phone: formattedPhone })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message) {
                            showVerificationSection(formattedPhone, data.isExistingUser, data.userInfo);
                            if (data.isExistingUser) {
                                alert(`Welcome back! SMS code sent to ${formattedPhone}. Please check your phone.`);
                            } else {
                                alert(`SMS code sent to ${formattedPhone}. A new account will be created for you.`);
                            }
                        } else {
                            alert('Failed to send SMS: ' + (data.message || 'Unknown error'));
                        }
                    })
                    .catch(fallbackError => {
                        console.error('Fallback error:', fallbackError);
                        alert('Failed to send SMS. Please try again.');
                    });
                });
            }
        });
    }
});

function verifySMS() {
    const codeInput = document.getElementById('sms-code');
    if (!codeInput) {
        console.error('SMS code input not found');
        showVerificationWarning('Interface error. Please refresh the page and try again.');
        return;
    }
    
    const code = codeInput.value.trim();
    
    // Validate code format
    if (!code || code.length < 4) {
        showVerificationWarning('Please enter a valid verification code (4-6 digits).');
        codeInput.focus();
        return;
    }
    
    if (!/^\d{4,6}$/.test(code)) {
        showVerificationWarning('Verification code must contain only numbers.');
        codeInput.focus();
        return;
    }
    
    // Ensure phone number is properly formatted
    const formattedPhone = formatCanadianPhoneNumber(currentPhone);
    if (!formattedPhone) {
        alert('Invalid phone number format. Please start over.');
        cancelVerification();
        return;
    }
    
    hideVerificationWarning();
    
    // Disable button during verification
    const verifyButton = document.getElementById('verify-sms-btn');
    if (!verifyButton) {
        console.error('Verify button not found');
        showVerificationWarning('Interface error. Please refresh the page and try again.');
        return;
    }
    
    const originalText = verifyButton.textContent;
    verifyButton.disabled = true;
    verifyButton.textContent = 'Verifying...';
    
    // Send verification request to your API
    fetch('/api/auth/sms/verify', {
        method: 'POST',
        credentials: 'include', // Include cookies for session
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formattedPhone, code: code })
    })
    .then(response => {
        if (!response.ok) {
            // Handle HTTP error status codes
            if (response.status === 400) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Invalid verification code. Please try again.');
                });
            } else if (response.status === 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error('Network error. Please check your connection and try again.');
            }
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            // Successful verification - session is now set via cookie
            // Keep token in localStorage for backward compatibility
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            if (data.isNewUser) {
                alert('Account created successfully! Welcome to our platform. Redirecting to dashboard...');
            } else {
                alert('Welcome back! Login successful. Redirecting to dashboard...');
            }
            
            window.location.href = '/dashboard';
        } else {
            // Handle case where response doesn't contain token
            showVerificationWarning(data.message || 'Invalid verification code. Please try again.');
            // Clear the code input and focus
            const codeInput = document.getElementById('sms-code');
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
        }
    })
    .catch(error => {
        console.error('Verification error:', error);
        
        // Display user-friendly error message
        const errorMessage = error.message || 'Verification failed. Please check your connection and try again.';
        showVerificationWarning(errorMessage);
        
        // Clear the code input and focus on retry
        const codeInput = document.getElementById('sms-code');
        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
        }
    })
    .finally(() => {
        // Re-enable button (with null check)
        if (verifyButton) {
            verifyButton.disabled = false;
            verifyButton.textContent = originalText;
        }
    });
}

// Resend verification code
function resendCode() {
    if (!currentPhone) {
        alert('Error: No phone number found. Please start over.');
        return;
    }
    
    const formattedPhone = formatCanadianPhoneNumber(currentPhone);
    if (!formattedPhone) {
        alert('Invalid phone number format. Please start over.');
        cancelVerification();
        return;
    }
    
    // Disable button during resend
    const resendButton = document.getElementById('resend-code-btn');
    if (!resendButton) {
        console.error('Resend button not found');
        alert('Interface error. Please refresh the page and try again.');
        return;
    }
    
    const originalText = resendButton.textContent;
    resendButton.disabled = true;
    resendButton.textContent = 'Sending...';
    
    fetch('/api/auth/sms/send-unique', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formattedPhone })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            const methodText = data.method === 'custom_unique' ? 'with collision-safe code' : '';
            alert(`Verification code resent successfully ${methodText}! Please check your phone.`);
            hideVerificationWarning();
            // Clear and focus on code input
            const codeInput = document.getElementById('sms-code');
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
        } else {
            alert('Failed to resend code: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Fallback to regular resend
        fetch('/api/auth/sms/resend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: formattedPhone })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('Verification code resent successfully! Please check your phone.');
                hideVerificationWarning();
                // Clear and focus on code input
                const codeInput = document.getElementById('sms-code');
                if (codeInput) {
                    codeInput.value = '';
                    codeInput.focus();
                }
            } else {
                alert('Failed to resend code: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(fallbackError => {
            console.error('Fallback error:', fallbackError);
            alert('Failed to resend code. Please try again.');
        });
    })
    .finally(() => {
        // Re-enable button (with null check)
        if (resendButton) {
            resendButton.disabled = false;
            resendButton.textContent = originalText;
        }
    });
}

// Cancel verification and go back to phone entry
function cancelVerification() {
    document.getElementById('sms-verification').style.display = 'none';
    document.getElementById('sms-code').value = '';
    hideVerificationWarning();
    currentPhone = '';
    isExistingUser = false;
    userInfo = null;
    
    // Focus back on phone input
    document.getElementById('phone').focus();
}

// Google Login functionality
function loginWithGoogle() {
    alert('Redirecting to Google OAuth... (This would integrate with Google Sign-In API)');
    // Here you would typically integrate with Google Sign-In API
    // For demo purposes, we'll just show an alert
    setTimeout(function() {
        alert('Google login successful! Redirecting to dashboard...');
        window.location.href = '/dashboard';
    }, 2000);
}

// Telegram Login functionality (placeholder for future implementation)
function loginWithTelegram() {
    alert('Telegram login is coming soon! This feature is currently under development.');
    // Future implementation will integrate with Telegram Login Widget
    // https://core.telegram.org/widgets/login
    
    // Placeholder for future functionality:
    // - Initialize Telegram Login Widget
    // - Handle Telegram authentication callback
    // - Verify user data with backend
    // - Issue JWT token and redirect to dashboard
}
