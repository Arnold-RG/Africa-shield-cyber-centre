/**
 * Advanced Authentication System
 * Africa Shield Cyber Centre
 */

class AuthSystem {
    constructor() {
        this.currentForm = 'login';
        this.isLoading = false;
        this.passwordStrength = {
            score: 0,
            feedback: []
        };
        
        // Configuration
        this.config = {
            minPasswordLength: 8,
            maxLoginAttempts: 5,
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            toastDuration: 5000,
            apiEndpoint: '/api/auth.php'
        };
        
        // Initialize the system
        this.init();
    }
    
    /**
     * Initialize the authentication system
     */
    init() {
        this.bindEvents();
        this.initializePasswordStrength();
        this.initializeFormValidation();
        this.checkSession();
        this.setupCSRFProtection();
    }
    
    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Form toggle events
        document.getElementById('loginTab')?.addEventListener('click', () => this.switchForm('login'));
        document.getElementById('registerTab')?.addEventListener('click', () => this.switchForm('register'));
        
        // Form submission events
        document.getElementById('loginFormData')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerFormData')?.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Password toggle events
        document.getElementById('toggleLoginPassword')?.addEventListener('click', () => this.togglePassword('loginPassword'));
        document.getElementById('toggleRegisterPassword')?.addEventListener('click', () => this.togglePassword('registerPassword'));
        document.getElementById('toggleConfirmPassword')?.addEventListener('click', () => this.togglePassword('confirmPassword'));
        
        // Password strength monitoring
        document.getElementById('registerPassword')?.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        
        // Real-time validation
        this.setupRealTimeValidation();
        
        // Toast close event
        document.getElementById('toastClose')?.addEventListener('click', () => this.hideToast());
        
        // Forgot password event
        document.getElementById('forgotPassword')?.addEventListener('click', (e) => this.handleForgotPassword(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Session timeout warning
        this.setupSessionTimeout();
    }
    
    /**
     * Switch between login and register forms
     */
    switchForm(formType) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        // Update active states
        if (formType === 'login') {
            loginTab?.classList.add('active');
            registerTab?.classList.remove('active');
            loginForm?.classList.add('active');
            registerForm?.classList.remove('active');
        } else {
            registerTab?.classList.add('active');
            loginTab?.classList.remove('active');
                    registerForm?.classList.add('active');
            loginForm?.classList.remove('active');
        }
        
        this.currentForm = formType;
        this.clearFormErrors();
        
        // Analytics tracking
        this.trackEvent('form_switch', { form_type: formType });
    }
    
    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();
        
        if (this.isLoading) return;
        
        const formData = new FormData(event.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password'),
            remember: document.getElementById('rememberMe')?.checked || false,
            csrf_token: this.getCSRFToken()
        };
        
        // Client-side validation
        if (!this.validateLoginForm(loginData)) {
            return;
        }
        
        try {
            this.showLoading('Signing you in...');
            
            const response = await this.makeRequest('/api/auth.php', {
                action: 'login',
                ...loginData
            });
            
            if (response.success) {
                this.showToast('Login successful! Redirecting...', 'success');
                
                // Store user session
                this.setUserSession(response.user);
                
                // Redirect based on user role
                setTimeout(() => {
                    window.location.href = this.getRedirectUrl(response.user.role);
                }, 1500);
                
                // Track successful login
                this.trackEvent('login_success', { user_id: response.user.id });
                
            } else {
                this.handleLoginError(response);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Handle registration form submission
     */
    async handleRegister(event) {
        event.preventDefault();
        
        if (this.isLoading) return;
        
        const formData = new FormData(event.target);
        const registerData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            country: formData.get('country'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            agreeTerms: document.getElementById('agreeTerms')?.checked || false,
            csrf_token: this.getCSRFToken()
        };
        
        // Client-side validation
        if (!this.validateRegisterForm(registerData)) {
            return;
        }
        
        try {
            this.showLoading('Creating your account...');
            
            const response = await this.makeRequest('/api/auth.php', {
                action: 'register',
                ...registerData
            });
            
            if (response.success) {
                this.showToast('Account created successfully! Please check your email for verification.', 'success');
                
                // Switch to login form
                setTimeout(() => {
                    this.switchForm('login');
                    document.getElementById('loginEmail').value = registerData.email;
                }, 2000);
                
                // Track successful registration
                this.trackEvent('register_success', { user_id: response.user.id });
                
            } else {
                this.handleRegistrationError(response);
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Validate login form
     */
    validateLoginForm(data) {
        let isValid = true;
        
        // Email validation
        if (!data.email || !this.isValidEmail(data.email)) {
            this.showFieldError('loginEmailError', 'Please enter a valid email address');
            isValid = false;
        } else {
            this.hideFieldError('loginEmailError');
        }
        
        // Password validation
        if (!data.password || data.password.length < 6) {
            this.showFieldError('loginPasswordError', 'Password must be at least 6 characters');
            isValid = false;
        } else {
            this.hideFieldError('loginPasswordError');
        }
        
        return isValid;
    }
    
    /**
     * Validate registration form
     */
    validateRegisterForm(data) {
        let isValid = true;
        
        // First name validation
        if (!data.firstName || data.firstName.trim().length < 2) {
            this.showFieldError('firstNameError', 'First name must be at least 2 characters');
            isValid = false;
        } else {
            this.hideFieldError('firstNameError');
        }
        
        // Last name validation
        if (!data.lastName || data.lastName.trim().length < 2) {
            this.showFieldError('lastNameError', 'Last name must be at least 2 characters');
            isValid = false;
        } else {
            this.hideFieldError('lastNameError');
        }
        
        // Email validation
        if (!data.email || !this.isValidEmail(data.email)) {
            this.showFieldError('registerEmailError', 'Please enter a valid email address');
            isValid = false;
        } else {
            this.hideFieldError('registerEmailError');
        }
        
        // Phone validation
        if (!data.phone || !this.isValidPhone(data.phone)) {
            this.showFieldError('phoneError', 'Please enter a valid phone number');
            isValid = false;
        } else {
            this.hideFieldError('phoneError');
        }
        
        // Country validation
        if (!data.country) {
            this.showFieldError('countryError', 'Please select your country');
            isValid = false;
        } else {
            this.hideFieldError('countryError');
        }
        
        // Password validation
        if (!data.password || data.password.length < this.config.minPasswordLength) {
            this.showFieldError('registerPasswordError', `Password must be at least ${this.config.minPasswordLength} characters`);
            isValid = false;
        } else if (this.passwordStrength.score < 2) {
            this.showFieldError('registerPasswordError', 'Please choose a stronger password');
            isValid = false;
        } else {
            this.hideFieldError('registerPasswordError');
        }
        
        // Confirm password validation
        if (data.password !== data.confirmPassword) {
            this.showFieldError('confirmPasswordError', 'Passwords do not match');
            isValid = false;
        } else {
            this.hideFieldError('confirmPasswordError');
        }
        
        // Terms agreement validation
        if (!data.agreeTerms) {
            this.showToast('Please agree to the Terms & Conditions', 'warning');
            isValid = false;
        }
        
        return isValid;
    }
    
    /**
     * Setup real-time validation
     */
    setupRealTimeValidation() {
        // Email validation
        document.getElementById('loginEmail')?.addEventListener('blur', (e) => {
            if (e.target.value && !this.isValidEmail(e.target.value)) {
                this.showFieldError('loginEmailError', 'Please enter a valid email address');
            } else {
                this.hideFieldError('loginEmailError');
            }
        });
        
        document.getElementById('registerEmail')?.addEventListener('blur', (e) => {
            if (e.target.value && !this.isValidEmail(e.target.value)) {
                this.showFieldError('registerEmailError', 'Please enter a valid email address');
            } else {
                this.hideFieldError('registerEmailError');
                this.checkEmailAvailability(e.target.value);
            }
        });
        
        // Phone validation
        document.getElementById('phoneNumber')?.addEventListener('blur', (e) => {
            if (e.target.value && !this.isValidPhone(e.target.value)) {
                this.showFieldError('phoneError', 'Please enter a valid phone number');
            } else {
                this.hideFieldError('phoneError');
            }
        });
        
        // Password confirmation
        document.getElementById('confirmPassword')?.addEventListener('input', (e) => {
            const password = document.getElementById('registerPassword')?.value;
            if (e.target.value && e.target.value !== password) {
                this.showFieldError('confirmPasswordError', 'Passwords do not match');
            } else {
                this.hideFieldError('confirmPasswordError');
            }
        });
    }
    
    /**
     * Check password strength
     */
    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!password) {
            strengthBar.className = 'strength-fill';
            strengthText.textContent = 'Password strength';
            this.passwordStrength = { score: 0, feedback: [] };
            return;
        }
        
        let score = 0;
        const feedback = [];
        
        // Length check
        if (password.length >= 8) score++;
        else feedback.push('Use at least 8 characters');
        
        // Uppercase check
        if (/[A-Z]/.test(password)) score++;
        else feedback.push('Add uppercase letters');
        
        // Lowercase check
        if (/[a-z]/.test(password)) score++;
        else feedback.push('Add lowercase letters');
        
        // Number check
        if (/\d/.test(password)) score++;
        else feedback.push('Add numbers');
        
        // Special character check
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        else feedback.push('Add special characters');
        
        // Common password check
        if (this.isCommonPassword(password)) {
            score = Math.max(0, score - 2);
            feedback.push('Avoid common passwords');
        }
        
        this.passwordStrength = { score, feedback };
        
        // Update UI
        const strengthClasses = ['weak', 'fair', 'good', 'strong'];
        const strengthTexts = ['Weak', 'Fair', 'Good', 'Strong'];
        
        if (score <= 1) {
            strengthBar.className = 'strength-fill weak';
            strengthText.textContent = strengthTexts[0];
        } else if (score <= 2) {
            strengthBar.className = 'strength-fill fair';
            strengthText.textContent = strengthTexts[1];
        } else if (score <= 3) {
            strengthBar.className = 'strength-fill good';
            strengthText.textContent = strengthTexts[2];
        } else {
            strengthBar.className = 'strength-fill strong';
            strengthText.textContent = strengthTexts[3];
        }
    }
    
    /**
     * Toggle password visibility
     */
    togglePassword(fieldId) {
        const field = document.getElementById(fieldId);
        const button = document.getElementById(`toggle${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`);
        const icon = button?.querySelector('i');
        
        if (field?.type === 'password') {
            field.type = 'text';
            icon?.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            field.type = 'password';
            icon?.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
    
    /**
     * Handle forgot password
     */
    async handleForgotPassword(event) {
        event.preventDefault();
        
        const email = prompt('Please enter your email address:');
        if (!email || !this.isValidEmail(email)) {
            this.showToast('Please enter a valid email address', 'warning');
            return;
        }
        
        try {
            this.showLoading('Sending reset link...');
            
            const response = await this.makeRequest('/api/auth.php', {
                action: 'forgot_password',
                email: email,
                csrf_token: this.getCSRFToken()
            });
            
            if (response.success) {
                this.showToast('Password reset link sent to your email', 'success');
            } else {
                this.showToast(response.message || 'Error sending reset link', 'error');
            }
            
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Check email availability
     */
    async checkEmailAvailability(email) {
        if (!this.isValidEmail(email)) return;
        
        try {
            const response = await this.makeRequest('/api/auth.php', {
                action: 'check_email',
                email: email
            });
            
            if (!response.available) {
                this.showFieldError('registerEmailError', 'This email is already registered');
            }
            
        } catch (error) {
            console.error('Email check error:', error);
        }
    }
    
    /**
     * Show field error
     */
    showFieldError(errorId, message) {
        const errorElement = document.getElementById(errorId);
        const inputWrapper = errorElement?.closest('.input-group')?.querySelector('.input-wrapper');
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        
        if (inputWrapper) {
            inputWrapper.classList.add('error');
        }
    }
    
    /**
     * Hide field error
     */
    hideFieldError(errorId) {
        const errorElement = document.getElementById(errorId);
        const inputWrapper = errorElement?.closest('.input-group')?.querySelector('.input-wrapper');
        
        if (errorElement) {
            errorElement.classList.remove('show');
        }
        
        if (inputWrapper) {
            inputWrapper.classList.remove('error');
        }
    }
    
    /**
     * Clear all form errors
     */
    clearFormErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        const inputWrappers = document.querySelectorAll('.input-wrapper.error');
        
        errorElements.forEach(el => el.classList.remove('show'));
        inputWrappers.forEach(el => el.classList.remove('error'));
    }
    
    /**
     * Show loading overlay
     */
    showLoading(message = 'Processing...') {
        this.isLoading = true;
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (text) text.textContent = message;
        if (overlay) overlay.classList.add('show');
        
        // Disable form submissions
        const submitButtons = document.querySelectorAll('.submit-btn');
        submitButtons.forEach(btn => btn.disabled = true);
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.isLoading = false;
        const overlay = document.getElementById('loadingOverlay');
        
        if (overlay) overlay.classList.remove('show');
        
        // Re-enable form submissions
        const submitButtons = document.querySelectorAll('.submit-btn');
               submitButtons.forEach(btn => btn.disabled = false);
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const icon = toast?.querySelector('.toast-icon');
        const messageEl = toast?.querySelector('.toast-message');
        
        if (!toast || !icon || !messageEl) return;
        
        // Set message
        messageEl.textContent = message;
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        icon.className = `toast-icon ${icons[type] || icons.info}`;
        
        // Set toast type
        toast.className = `toast ${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Auto hide after duration
        setTimeout(() => {
            this.hideToast();
        }, this.config.toastDuration);
        
        // Track toast display
        this.trackEvent('toast_shown', { type, message });
    }
    
    /**
     * Hide toast notification
     */
    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.classList.remove('show');
        }
    }
    
    /**
     * Handle login errors
     */
    handleLoginError(response) {
        if (response.error_code === 'INVALID_CREDENTIALS') {
            this.showFieldError('loginPasswordError', 'Invalid email or password');
        } else if (response.error_code === 'ACCOUNT_LOCKED') {
            this.showToast('Account temporarily locked due to multiple failed attempts', 'warning');
        } else if (response.error_code === 'EMAIL_NOT_VERIFIED') {
            this.showToast('Please verify your email address before logging in', 'warning');
        } else {
            this.showToast(response.message || 'Login failed. Please try again.', 'error');
        }
        
        // Track failed login
        this.trackEvent('login_failed', { error_code: response.error_code });
    }
    
    /**
     * Handle registration errors
     */
    handleRegistrationError(response) {
        if (response.error_code === 'EMAIL_EXISTS') {
            this.showFieldError('registerEmailError', 'This email is already registered');
        } else if (response.error_code === 'WEAK_PASSWORD') {
            this.showFieldError('registerPasswordError', 'Password is too weak');
        } else if (response.validation_errors) {
            // Handle field-specific validation errors
            Object.keys(response.validation_errors).forEach(field => {
                const errorId = field + 'Error';
                this.showFieldError(errorId, response.validation_errors[field]);
            });
        } else {
            this.showToast(response.message || 'Registration failed. Please try again.', 'error');
        }
        
        // Track failed registration
        this.trackEvent('register_failed', { error_code: response.error_code });
    }
    
    /**
     * Make HTTP request
     */
    async makeRequest(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * Validation helpers
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
    
    isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ];
        return commonPasswords.includes(password.toLowerCase());
    }
    
    /**
     * CSRF Protection
     */
    setupCSRFProtection() {
        // Get CSRF token from meta tag or generate one
        let token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!token) {
            token = this.generateCSRFToken();
        }
        this.csrfToken = token;
    }
    
    getCSRFToken() {
        return this.csrfToken;
    }
    
    generateCSRFToken() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
    
    /**
     * Session Management
     */
    setUserSession(user) {
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('loginTime', Date.now().toString());
    }
    
    getUserSession() {
        const user = sessionStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    clearUserSession() {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('loginTime');
    }
    
    checkSession() {
        const user = this.getUserSession();
        const loginTime = sessionStorage.getItem('loginTime');
        
        if (user && loginTime) {
            const elapsed = Date.now() - parseInt(loginTime);
            if (elapsed > this.config.sessionTimeout) {
                this.clearUserSession();
                this.showToast('Session expired. Please log in again.', 'warning');
            }
        }
    }
    
    setupSessionTimeout() {
        // Warn user before session expires
        setInterval(() => {
            const loginTime = sessionStorage.getItem('loginTime');
            if (loginTime) {
                const elapsed = Date.now() - parseInt(loginTime);
                const remaining = this.config.sessionTimeout - elapsed;
                
                // Warn 5 minutes before expiry
                if (remaining <= 5 * 60 * 1000 && remaining > 4 * 60 * 1000) {
                    this.showToast('Your session will expire in 5 minutes', 'warning');
                }
            }
        }, 60000); // Check every minute
    }
    
    /**
     * Get redirect URL based on user role
     */
    getRedirectUrl(role) {
        const redirectUrls = {
            admin: '/admin/dashboard.php',
            moderator: '/admin/dashboard.php',
            user: '/dashboard.php'
        };
        
        return redirectUrls[role] || '/dashboard.php';
    }
    
    /**
     * Initialize password strength indicator
     */
    initializePasswordStrength() {
        const passwordField = document.getElementById('registerPassword');
        if (passwordField) {
            passwordField.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
            });
        }
    }
    
    /**
     * Initialize form validation
     */
    initializeFormValidation() {
        // Add input event listeners for real-time validation
        const inputs = document.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                // Clear error on input
                const errorId = input.name + 'Error';
                this.hideFieldError(errorId);
            });
        });
    }
    
    /**
     * Validate individual field
     */
    validateField(field) {
        const value = field.value.trim();
        const name = field.name;
        const type = field.type;
        
        let isValid = true;
        let errorMessage = '';
        
        // Required field check
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Type-specific validation
        if (value && type === 'email' && !this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
        
        if (value && type === 'tel' && !this.isValidPhone(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
        
        // Show/hide error
        const errorId = name + 'Error';
        if (!isValid) {
            this.showFieldError(errorId, errorMessage);
        } else {
            this.hideFieldError(errorId);
        }
        
        return isValid;
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Escape key to close toast
        if (event.key === 'Escape') {
            this.hideToast();
        }
        
        // Enter key to submit form
        if (event.key === 'Enter' && event.ctrlKey) {
            const activeForm = document.querySelector('.form-wrapper.active form');
            if (activeForm) {
                activeForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Tab switching with Alt + number
        if (event.altKey) {
            if (event.key === '1') {
                event.preventDefault();
                this.switchForm('login');
            } else if (event.key === '2') {
                event.preventDefault();
                this.switchForm('register');
            }
        }
    }
    
    /**
     * Analytics and tracking
     */
    trackEvent(eventName, data = {}) {
        // Send to analytics service (Google Analytics, etc.)
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                custom_parameter: JSON.stringify(data),
                timestamp: new Date().toISOString()
            });
        }
        
        // Log to console in development
        if (window.location.hostname === 'localhost') {
            console.log('Event tracked:', eventName, data);
        }
    }
    
    /**
     * Security features
     */
    detectSuspiciousActivity() {
        // Track failed login attempts
        const failedAttempts = parseInt(localStorage.getItem('failedLoginAttempts') || '0');
        
        if (failedAttempts >= this.config.maxLoginAttempts) {
            this.showToast('Too many failed attempts. Please try again later.', 'error');
            return false;
        }
        
        return true;
    }
    
    incrementFailedAttempts() {
        const current = parseInt(localStorage.getItem('failedLoginAttempts') || '0');
        localStorage.setItem('failedLoginAttempts', (current + 1).toString());
        
        // Clear after 1 hour
        setTimeout(() => {
            localStorage.removeItem('failedLoginAttempts');
        }, 60 * 60 * 1000);
    }
    
    clearFailedAttempts() {
        localStorage.removeItem('failedLoginAttempts');
    }
    
    /**
     * Accessibility features
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    /**
     * Form auto-save (for registration form)
     */
    setupAutoSave() {
        const registerForm = document.getElementById('registerFormData');
        if (!registerForm) return;
        
        const inputs = registerForm.querySelectorAll('input:not([type="password"])');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const formData = new FormData(registerForm);
                const data = Object.fromEntries(formData.entries());
                delete data.password;
                delete data.confirmPassword;
                
                localStorage.setItem('registrationDraft', JSON.stringify(data));
            });
        });
        
        // Restore saved data
        const savedData = localStorage.getItem('registrationDraft');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                const input = registerForm.querySelector(`[name="${key}"]`);
                if (input && input.type !== 'password') {
                    input.value = data[key];
                }
            });
        }
    }
    
    /**
     * Clear auto-saved data
     */
    clearAutoSave() {
        localStorage.removeItem('registrationDraft');
    }
    
    /**
     * Device fingerprinting for security
     */
    getDeviceFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        return {
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 100),
            canvas: canvas.toDataURL().substring(0, 100)
        };
    }
}

// Initialize the authentication system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}


