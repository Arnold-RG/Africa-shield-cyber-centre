/**
 * AFRICA SHIELD - ABOUT PAGE JAVASCRIPT
 * Advanced functionality for the About page
 */

'use strict';

// ===================================
// GLOBAL VARIABLES & CONFIGURATION
// ===================================

const CONFIG = {
    // Animation settings
    ANIMATION_DURATION: 1000,
    SCROLL_THRESHOLD: 100,
    TYPING_SPEED: 50,
    
    // API endpoints
    API_BASE_URL: 'https://api.africashield.org',
    NOTIFICATION_ENDPOINT: '/api/notifications',
    AI_CHAT_ENDPOINT: '/api/ai-chat',
    
    // Feature flags
    ENABLE_AI_ASSISTANT: true,
    ENABLE_REAL_TIME_UPDATES: true,
    ENABLE_ANALYTICS: true,
    
    // Performance settings
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    
    // Local storage keys
    STORAGE_KEYS: {
        THEME: 'africashield_theme',
        FONT_SIZE: 'africashield_font_size',
        HIGH_CONTRAST: 'africashield_high_contrast',
        LANGUAGE: 'africashield_language',
        NOTIFICATIONS_SEEN: 'africashield_notifications_seen'
    }
};

// Global state management
const AppState = {
    currentTheme: 'light',
    fontSize: 16,
    highContrast: false,
    currentLanguage: 'en',
    isAIAssistantOpen: false,
    isNotificationPanelOpen: false,
    unreadNotifications: 0,
    isPageVisible: true,
    performanceMetrics: {},
    userInteractions: []
};

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function calls
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get element with error handling
 */
function getElement(selector) {
    try {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    } catch (error) {
        console.error(`Error selecting element: ${selector}`, error);
        return null;
    }
}

/**
 * Get all elements with error handling
 */
function getAllElements(selector) {
    try {
        return document.querySelectorAll(selector);
    } catch (error) {
        console.error(`Error selecting elements: ${selector}`, error);
        return [];
    }
}

/**
 * Safe event listener addition
 */
function addEventListenerSafe(element, event, handler, options = {}) {
    if (element && typeof handler === 'function') {
        element.addEventListener(event, handler, options);
        return true;
    }
    console.warn('Invalid element or handler for event listener');
    return false;
}

/**
 * Local storage wrapper with error handling
 */
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }
};

// ===================================
// PERFORMANCE MONITORING
// ===================================

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = {};
        this.init();
    }
    
    init() {
        this.measurePageLoad();
        this.observeElementVisibility();
        this.monitorUserInteractions();
    }
    
    measurePageLoad() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const navigation = performance.getEntriesByType('navigation')[0];
                this.metrics.pageLoad = {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    totalTime: navigation.loadEventEnd - navigation.fetchStart
                };
                
                this.reportMetrics();
            });
        }
    }
    
    observeElementVisibility() {
        if ('IntersectionObserver' in window) {
            this.observers.visibility = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const elementId = entry.target.id || entry.target.className;
                        this.trackEvent('element_visible', { element: elementId });
                    }
                });
            }, { threshold: 0.5 });
            
            // Observe key sections
            getAllElements('section[id]').forEach(section => {
                this.observers.visibility.observe(section);
            });
        }
    }
    
    monitorUserInteractions() {
        const interactionEvents = ['click', 'scroll', 'keydown', 'touchstart'];
        
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, throttle((event) => {
                AppState.userInteractions.push({
                    type: eventType,
                    timestamp: Date.now(),
                    target: event.target.tagName,
                    id: event.target.id,
                    className: event.target.className
                });
                
                // Keep only last 100 interactions
                if (AppState.userInteractions.length > 100) {
                    AppState.userInteractions = AppState.userInteractions.slice(-100);
                }
            }, CONFIG.THROTTLE_DELAY));
        });
    }
    
    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: Date.now(),
            data: data,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // Send to analytics if enabled
        if (CONFIG.ENABLE_ANALYTICS && typeof gtag !== 'undefined') {
            gtag('event', eventName, data);
        }
        
        console.log('Event tracked:', event);
    }
    
    reportMetrics() {
        console.log('Performance Metrics:', this.metrics);
        
        // Report to monitoring service
        if (CONFIG.ENABLE_ANALYTICS) {
            this.sendMetricsToServer();
        }
    }
    
    async sendMetricsToServer() {
        try {
            await fetch(`${CONFIG.API_BASE_URL}/metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metrics: this.metrics,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.error('Failed to send metrics:', error);
        }
    }
}

// ===================================
// THEME MANAGEMENT
// ===================================

class ThemeManager {
    constructor() {
        this.currentTheme = Storage.get(CONFIG.STORAGE_KEYS.THEME, 'light');
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
        this.detectSystemTheme();
    }
    
    applyTheme(theme) {
        document.body.classList.remove('dark-theme', 'light-theme');
        document.body.classList.add(`${theme}-theme`);
        
        const themeToggle = getElement('#themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
        
        this.currentTheme = theme;
        AppState.currentTheme = theme;
        Storage.set(CONFIG.STORAGE_KEYS.THEME, theme);
        
        // Update meta theme-color
        const metaThemeColor = getElement('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#0d6efd');
        }
        
        this.trackThemeChange(theme);
    }
    
    setupThemeToggle() {
        const themeToggle = getElement('#themeToggle');
        if (themeToggle) {
            addEventListenerSafe(themeToggle, 'click', () => {
                const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
                this.applyTheme(newTheme);
            });
        }
    }
    
    detectSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Apply system theme if no preference saved
            if (!Storage.get(CONFIG.STORAGE_KEYS.THEME)) {
                this.applyTheme(mediaQuery.matches ? 'dark' : 'light');
            }
            
            // Listen for system theme changes
            mediaQuery.addEventListener('change', (e) => {
                if (!Storage.get(CONFIG.STORAGE_KEYS.THEME)) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
    
    trackThemeChange(theme) {
        if (window.performanceMonitor) {
            window.performanceMonitor.trackEvent('theme_changed', { theme });
        }
    }
}

// ===================================
// ACCESSIBILITY MANAGER
// ===================================

class AccessibilityManager {
    constructor() {
        this.fontSize = Storage.get(CONFIG.STORAGE_KEYS.FONT_SIZE, 16);
        this.highContrast = Storage.get(CONFIG.STORAGE_KEYS.HIGH_CONTRAST, false);
        this.init();
    }
    
    init() {
        this.setupFontSizeControls();
        this.setupHighContrastToggle();
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.applyAccessibilitySettings();
    }
    
    setupFontSizeControls() {
        const increaseFontBtn = getElement('#increaseFontSize');
        const decreaseFontBtn = getElement('#decreaseFontSize');
        const resetFontBtn = getElement('#resetFontSize');
        
        if (increaseFontBtn) {
            addEventListenerSafe(increaseFontBtn, 'click', () => {
                this.changeFontSize(2);
            });
        }
        
        if (decreaseFontBtn) {
            addEventListenerSafe(decreaseFontBtn, 'click', () => {
                this.changeFontSize(-2);
            });
        }
        
        if (resetFontBtn) {
            addEventListenerSafe(resetFontBtn, 'click', () => {
                this.resetFontSize();
            });
        }
    }
    
    changeFontSize(delta) {
        const newSize = Math.max(12, Math.min(24, this.fontSize + delta));
        if (newSize !== this.fontSize) {
            this.fontSize = newSize;
            this.applyFontSize();
            Storage.set(CONFIG.STORAGE_KEYS.FONT_SIZE, this.fontSize);
            this.showAccessibilityNotification(`Font size: ${this.fontSize}px`);
        }
    }
    
    resetFontSize() {
        this.fontSize = 16;
        this.applyFontSize();
        Storage.set(CONFIG.STORAGE_KEYS.FONT_SIZE, this.fontSize);
        this.showAccessibilityNotification('Font size reset to default');
    }
    
    applyFontSize() {
        document.documentElement.style.fontSize = `${this.fontSize}px`;
        AppState.fontSize = this.fontSize;
    }
    
    setupHighContrastToggle() {
        const contrastToggle = getElement('#contrastToggle');
        if (contrastToggle) {
            addEventListenerSafe(contrastToggle, 'click', () => {
                this.toggleHighContrast();
            });
        }
    }
    
    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        this.applyHighContrast();
        Storage.set(CONFIG.STORAGE_KEYS.HIGH_CONTRAST, this.highContrast);
        this.showAccessibilityNotification(
            `High contrast ${this.highContrast ? 'enabled' : 'disabled'}`
        );
    }
    
    applyHighContrast() {
        document.body.classList.toggle('high-contrast', this.highContrast);
        AppState.highContrast = this.highContrast;
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Add keyboard navigation class for focus styles
            document.body.classList.add('keyboard-navigation');
            
            // Handle specific keyboard shortcuts
            this.handleKeyboardShortcuts(e);
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
        
        // Skip to content link
        this.createSkipLink();
    }
    
    handleKeyboardShortcuts(e) {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        
        switch (e.key) {
            case 'Escape':
                this.closeAllModals();
                break;
            case 'k':
                if (isCtrlOrCmd) {
                    e.preventDefault();
                    this.toggleAIAssistant();
                }
                break;
            case '+':
                if (isCtrlOrCmd) {
                    e.preventDefault();
                    this.changeFontSize(2);
                }
                break;
            case '-':
                if (isCtrlOrCmd) {
                    e.preventDefault();
                    this.changeFontSize(-2);
                }
                break;
        }
    }
    
    createSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        skipLink.setAttribute('aria-label', 'Skip to main content');
        
        addEventListenerSafe(skipLink, 'click', (e) => {
            e.preventDefault();
            const mainContent = getElement('#main-content');
            if (mainContent) {
                mainContent.focus();
                mainContent.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    setupScreenReaderSupport() {
        // Announce page changes
        this.announcePageLoad();
        
        // Setup live regions for dynamic content
        this.setupLiveRegions();
    }
    
    announcePageLoad() {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'About page loaded. Africa Shield Cyber Centre information.';
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }
    
    setupLiveRegions() {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
    }
    
    announceToScreenReader(message) {
        const liveRegion = getElement('#live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
    
    applyAccessibilitySettings() {
        this.applyFontSize();
        this.applyHighContrast();
    }
    
    showAccessibilityNotification(message) {
        this.announceToScreenReader(message);
        if (window.notificationManager) {
            window.notificationManager.show(message, 'info', 3000);
        }
    }
    
      closeAllModals() {
        // Close AI assistant
        const aiChatWindow = getElement('#aiChatWindow');
        if (aiChatWindow) {
            aiChatWindow.classList.remove('active');
        }
        
        // Close notification panel
        const notificationPanel = getElement('#notificationPanel');
        if (notificationPanel) {
            notificationPanel.classList.remove('active');
        }
        
        AppState.isAIAssistantOpen = false;
        AppState.isNotificationPanelOpen = false;
    }
    
    toggleAIAssistant() {
        if (window.aiAssistant) {
            window.aiAssistant.toggle();
        }
    }
}

// ===================================
// LANGUAGE MANAGER
// ===================================

class LanguageManager {
    constructor() {
        this.currentLanguage = Storage.get(CONFIG.STORAGE_KEYS.LANGUAGE, 'en');
        this.translations = {};
        this.init();
    }
    
    init() {
        this.setupLanguageSelector();
        this.loadTranslations();
        this.applyLanguage(this.currentLanguage);
    }
    
    setupLanguageSelector() {
        const languageLinks = getAllElements('[data-lang]');
        languageLinks.forEach(link => {
            addEventListenerSafe(link, 'click', (e) => {
                e.preventDefault();
                const lang = link.getAttribute('data-lang');
                this.changeLanguage(lang);
            });
        });
    }
    
    async loadTranslations() {
        try {
            const response = await fetch(`/assets/i18n/${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations = await response.json();
            }
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to English
            this.translations = {};
        }
    }
    
    async changeLanguage(lang) {
        if (lang === this.currentLanguage) return;
        
        // Update active language indicator
        getAllElements('[data-lang]').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = getElement(`[data-lang="${lang}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Load new translations
        this.currentLanguage = lang;
        await this.loadTranslations();
        
        // Apply translations
        this.applyLanguage(lang);
        
        // Save preference
        Storage.set(CONFIG.STORAGE_KEYS.LANGUAGE, lang);
        AppState.currentLanguage = lang;
        
        // Show notification
        if (window.notificationManager) {
            window.notificationManager.show(
                `Language changed to ${this.getLanguageName(lang)}`,
                'success'
            );
        }
        
        // Track language change
        if (window.performanceMonitor) {
            window.performanceMonitor.trackEvent('language_changed', { language: lang });
        }
    }
    
    applyLanguage(lang) {
        // Update document language
        document.documentElement.lang = lang;
        
        // Update text content based on data-i18n attributes
        getAllElements('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation) {
                element.textContent = translation;
            }
        });
        
        // Update placeholders
        getAllElements('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.getTranslation(key);
            if (translation) {
                element.placeholder = translation;
            }
        });
        
        // Update aria-labels
        getAllElements('[data-i18n-aria]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            const translation = this.getTranslation(key);
            if (translation) {
                element.setAttribute('aria-label', translation);
            }
        });
    }
    
    getTranslation(key) {
        return this.translations[key] || key;
    }
    
    getLanguageName(lang) {
        const names = {
            'en': 'English',
            'fr': 'Français',
            'sw': 'Kiswahili',
            'rw': 'Kinyarwanda'
        };
        return names[lang] || lang;
    }
}

// ===================================
// NOTIFICATION MANAGER
// ===================================

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.init();
    }
    
    init() {
        this.setupNotificationPanel();
        this.loadNotifications();
        this.setupRealTimeUpdates();
    }
    
    setupNotificationPanel() {
        const notificationToggle = getElement('#notificationToggle');
        const notificationPanel = getElement('#notificationPanel');
        const closeNotifications = getElement('#closeNotifications');
        
        if (notificationToggle) {
            addEventListenerSafe(notificationToggle, 'click', () => {
                this.togglePanel();
            });
        }
        
        if (closeNotifications) {
            addEventListenerSafe(closeNotifications, 'click', () => {
                this.closePanel();
            });
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (notificationPanel && 
                !notificationPanel.contains(e.target) && 
                !notificationToggle.contains(e.target)) {
                this.closePanel();
            }
        });
    }
    
    async loadNotifications() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.NOTIFICATION_ENDPOINT}`);
            if (response.ok) {
                const data = await response.json();
                this.notifications = data.notifications || [];
                this.updateNotificationDisplay();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            // Use mock notifications for demo
            this.loadMockNotifications();
        }
    }
    
    loadMockNotifications() {
        this.notifications = [
            {
                id: '1',
                type: 'success',
                title: 'System Status: All Clear',
                message: 'All security systems are operating normally',
                timestamp: Date.now() - 120000,
                read: false
            },
            {
                id: '2',
                type: 'warning',
                title: 'Security Update Available',
                message: 'New threat signatures have been released',
                timestamp: Date.now() - 3600000,
                read: false
            },
            {
                id: '3',
                type: 'info',
                title: 'Training Session Reminder',
                message: 'Cybersecurity workshop starts in 2 hours',
                timestamp: Date.now() - 7200000,
                read: true
            }
        ];
        this.updateNotificationDisplay();
    }
    
    updateNotificationDisplay() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateNotificationBadge();
        this.renderNotifications();
    }
    
    updateNotificationBadge() {
        const badge = getElement('#notificationCount');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
        AppState.unreadNotifications = this.unreadCount;
    }
    
    renderNotifications() {
        const notificationBody = getElement('.notification-body');
        if (!notificationBody) return;
        
        if (this.notifications.length === 0) {
            notificationBody.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-bell-slash text-muted mb-2" style="font-size: 2em;"></i>
                    <p class="text-muted mb-0">No notifications</p>
                </div>
            `;
            return;
        }
        
        notificationBody.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 data-notification-id="${notification.id}">
                <div class="notification-icon bg-${this.getNotificationColor(notification.type)}">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h6>${notification.title}</h6>
                    <p>${notification.message}</p>
                    <small class="text-muted">${this.formatTimestamp(notification.timestamp)}</small>
                </div>
            </div>
        `).join('');
        
        // Add click handlers for notifications
        getAllElements('.notification-item').forEach(item => {
            addEventListenerSafe(item, 'click', () => {
                const id = item.getAttribute('data-notification-id');
                this.markAsRead(id);
            });
        });
    }
    
    getNotificationColor(type) {
        const colors = {
            success: 'success',
            warning: 'warning',
            error: 'danger',
            info: 'info'
        };
        return colors[type] || 'secondary';
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle',
            info: 'info-circle'
        };
        return icons[type] || 'bell';
    }
    
    formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return `${Math.floor(diff / 86400000)} days ago`;
    }
    
    togglePanel() {
        const panel = getElement('#notificationPanel');
        if (panel) {
            const isActive = panel.classList.contains('active');
            if (isActive) {
                this.closePanel();
            } else {
                this.openPanel();
            }
        }
    }
    
    openPanel() {
        const panel = getElement('#notificationPanel');
        if (panel) {
            panel.classList.add('active');
            AppState.isNotificationPanelOpen = true;
            
            // Mark all as seen (not necessarily read)
            this.markAllAsSeen();
        }
    }
    
    closePanel() {
        const panel = getElement('#notificationPanel');
        if (panel) {
            panel.classList.remove('active');
            AppState.isNotificationPanelOpen = false;
        }
    }
    
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateNotificationDisplay();
            
            // Send read status to server
            this.sendReadStatus(id);
        }
    }
    
    markAllAsSeen() {
        const unseenIds = Storage.get(CONFIG.STORAGE_KEYS.NOTIFICATIONS_SEEN, []);
        const newSeenIds = this.notifications.map(n => n.id);
        Storage.set(CONFIG.STORAGE_KEYS.NOTIFICATIONS_SEEN, [...unseenIds, ...newSeenIds]);
    }
    
    async sendReadStatus(id) {
        try {
            await fetch(`${CONFIG.API_BASE_URL}${CONFIG.NOTIFICATION_ENDPOINT}/${id}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Failed to update read status:', error);
        }
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px; 
            right: 20px; 
            z-index: 9999; 
            min-width: 300px;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        return notification;
    }
    
    setupRealTimeUpdates() {
        if (!CONFIG.ENABLE_REAL_TIME_UPDATES) return;
        
        // Poll for new notifications every 30 seconds
        setInterval(() => {
            this.loadNotifications();
        }, 30000);
        
        // Setup WebSocket connection if available
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        try {
            const ws = new WebSocket(`wss://api.africashield.org/notifications`);
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'notification') {
                    this.addNotification(data.notification);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
        }
    }
    
    addNotification(notification) {
        this.notifications.unshift(notification);
        this.updateNotificationDisplay();
        
        // Show toast notification
        this.show(notification.message, notification.type);
    }
}

// ===================================
// AI ASSISTANT
// ===================================

class AIAssistant {
    constructor() {
        this.isOpen = false;
        this.conversationHistory = [];
        this.isTyping = false;
        this.init();
    }
    
    init() {
        if (!CONFIG.ENABLE_AI_ASSISTANT) return;
        
        this.setupUI();
        this.setupEventListeners();
        this.loadConversationHistory();
    }
    
    setupUI() {
        const aiToggle = getElement('#aiToggle');
        const aiChatWindow = getElement('#aiChatWindow');
        const aiClose = getElement('#aiClose');
        
        if (!aiToggle || !aiChatWindow) {
            console.warn('AI Assistant UI elements not found');
            return;
        }
        
        // Setup toggle button
        addEventListenerSafe(aiToggle, 'click', () => {
            this.toggle();
        });
        
                // Setup close button
        if (aiClose) {
            addEventListenerSafe(aiClose, 'click', () => {
                this.close();
            });
        }
        
        // Setup input and send button
        this.setupInputHandlers();
        this.setupSuggestionButtons();
    }
    
    setupInputHandlers() {
        const aiInput = getElement('#aiInput');
        const aiSend = getElement('#aiSend');
        
        if (aiInput) {
            addEventListenerSafe(aiInput, 'keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Auto-resize input
            addEventListenerSafe(aiInput, 'input', () => {
                this.autoResizeInput(aiInput);
            });
        }
        
        if (aiSend) {
            addEventListenerSafe(aiSend, 'click', () => {
                this.sendMessage();
            });
        }
    }
    
    setupSuggestionButtons() {
        getAllElements('.suggestion-btn').forEach(btn => {
            addEventListenerSafe(btn, 'click', () => {
                const message = btn.getAttribute('data-message');
                if (message) {
                    this.sendPredefinedMessage(message);
                }
            });
        });
    }
    
    setupEventListeners() {
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // Handle outside clicks
        document.addEventListener('click', (e) => {
            const aiChatWindow = getElement('#aiChatWindow');
            const aiToggle = getElement('#aiToggle');
            
            if (this.isOpen && 
                aiChatWindow && 
                !aiChatWindow.contains(e.target) && 
                !aiToggle.contains(e.target)) {
                // Don't auto-close AI chat for better UX
                // this.close();
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        const aiChatWindow = getElement('#aiChatWindow');
        const aiInput = getElement('#aiInput');
        
        if (aiChatWindow) {
            aiChatWindow.classList.add('active');
            this.isOpen = true;
            AppState.isAIAssistantOpen = true;
            
            // Focus input
            if (aiInput) {
                setTimeout(() => aiInput.focus(), 100);
            }
            
            // Track opening
            if (window.performanceMonitor) {
                window.performanceMonitor.trackEvent('ai_assistant_opened');
            }
        }
    }
    
    close() {
        const aiChatWindow = getElement('#aiChatWindow');
        
        if (aiChatWindow) {
            aiChatWindow.classList.remove('active');
            this.isOpen = false;
            AppState.isAIAssistantOpen = false;
            
            // Track closing
            if (window.performanceMonitor) {
                window.performanceMonitor.trackEvent('ai_assistant_closed');
            }
        }
    }
    
    async sendMessage() {
        const aiInput = getElement('#aiInput');
        if (!aiInput) return;
        
        const message = aiInput.value.trim();
        if (!message || this.isTyping) return;
        
        // Clear input
        aiInput.value = '';
        this.autoResizeInput(aiInput);
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Get AI response
            const response = await this.getAIResponse(message);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add AI response
            this.addMessage(response, 'bot');
            
            // Save conversation
            this.saveConversationHistory();
            
        } catch (error) {
            console.error('AI response error:', error);
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    }
    
    sendPredefinedMessage(message) {
        const aiInput = getElement('#aiInput');
        if (aiInput) {
            aiInput.value = message;
            this.sendMessage();
        }
    }
    
    async getAIResponse(message) {
        // Track the question
        if (window.performanceMonitor) {
            window.performanceMonitor.trackEvent('ai_question_asked', { 
                message: message.substring(0, 50) 
            });
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.AI_CHAT_ENDPOINT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    context: 'about_page',
                    history: this.conversationHistory.slice(-5) // Last 5 messages for context
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.response;
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.error('AI API error:', error);
            // Fallback to predefined responses
            return this.getFallbackResponse(message);
        }
    }
    
    getFallbackResponse(message) {
        const responses = {
            // About Africa Shield
            'mission': 'Africa Shield\'s mission is to establish an impenetrable digital shield across East Africa through revolutionary AI-powered cybersecurity solutions, comprehensive threat intelligence, and community-driven defense mechanisms.',
            
            'services': 'We offer comprehensive cybersecurity services including 24/7 SOC monitoring, threat intelligence, incident response, security training, penetration testing, and AI-powered threat detection.',
            
            'team': 'Our team consists of elite cybersecurity professionals, including former NSA architects, quantum computing pioneers, and threat hunting experts, all dedicated to protecting East Africa\'s digital infrastructure.',
            
            'join': 'You can join our team by visiting our careers page. We\'re always looking for talented cybersecurity professionals, researchers, and engineers to help us defend East Africa\'s digital frontier.',
            
            'contact': 'You can contact us through our contact page, call our emergency hotline at *789*911#, or email us at info@africashield.org for general inquiries.',
            
            'training': 'We offer comprehensive cybersecurity training programs for individuals and organizations. Visit our Learn section to explore our courses, workshops, and certification programs.',
            
            'default': 'I\'d be happy to help you learn more about Africa Shield! You can ask me about our mission, services, team, how to join us, or any other questions about cybersecurity.'
        };
        
        // Simple keyword matching
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('mission') || lowerMessage.includes('purpose')) {
            return responses.mission;
        } else if (lowerMessage.includes('service') || lowerMessage.includes('offer')) {
            return responses.services;
        } else if (lowerMessage.includes('team') || lowerMessage.includes('staff') || lowerMessage.includes('people')) {
            return responses.team;
        } else if (lowerMessage.includes('join') || lowerMessage.includes('career') || lowerMessage.includes('job')) {
            return responses.join;
        } else if (lowerMessage.includes('contact') || lowerMessage.includes('reach')) {
            return responses.contact;
        } else if (lowerMessage.includes('training') || lowerMessage.includes('learn') || lowerMessage.includes('course')) {
            return responses.training;
        } else {
            return responses.default;
        }
    }
    
    addMessage(text, sender) {
        const aiChatBody = getElement('#aiChatBody');
        if (!aiChatBody) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${sender}`;
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <p>${this.formatMessage(text)}</p>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        
        aiChatBody.appendChild(messageDiv);
        
        // Scroll to bottom
        aiChatBody.scrollTop = aiChatBody.scrollHeight;
        
        // Add to conversation history
        this.conversationHistory.push({
            text: text,
            sender: sender,
            timestamp: Date.now()
        });
        
        // Animate message appearance
        setTimeout(() => {
            messageDiv.classList.add('animate-fade-in');
        }, 10);
    }
    
    formatMessage(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    showTypingIndicator() {
        this.isTyping = true;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-message-bot typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        const aiChatBody = getElement('#aiChatBody');
        if (aiChatBody) {
            aiChatBody.appendChild(typingDiv);
            aiChatBody.scrollTop = aiChatBody.scrollHeight;
        }
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = getElement('#typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    autoResizeInput(input) {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }
    
    loadConversationHistory() {
        const saved = Storage.get('ai_conversation_history', []);
        this.conversationHistory = saved;
        
        // Restore messages (limit to last 10)
        const recentMessages = saved.slice(-10);
        recentMessages.forEach(msg => {
            if (msg.sender !== 'bot' || msg.text !== 'Hello! I\'m your AI cybersecurity assistant. How can I help you learn about Africa Shield today?') {
                this.addMessage(msg.text, msg.sender);
            }
        });
    }
    
    saveConversationHistory() {
        // Keep only last 50 messages
        const trimmed = this.conversationHistory.slice(-50);
        Storage.set('ai_conversation_history', trimmed);
    }
    
    clearConversation() {
        this.conversationHistory = [];
        const aiChatBody = getElement('#aiChatBody');
        if (aiChatBody) {
            // Keep only the initial greeting
            const messages = aiChatBody.querySelectorAll('.ai-message');
            messages.forEach((msg, index) => {
                if (index > 0) msg.remove();
            });
        }
        Storage.remove('ai_conversation_history');
    }
}

// ===================================
// ANIMATION CONTROLLER
// ===================================

class AnimationController {
    constructor() {
        this.observers = {};
        this.counters = new Map();
        this.init();
    }
    
    init() {
        this.setupScrollAnimations();
        this.setupCounterAnimations();
        this.setupParallaxEffects();
        this.setupHoverEffects();
    }
    
    setupScrollAnimations() {
        if ('IntersectionObserver' in window) {
            this.observers.scroll = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-fade-in');
                        this.observers.scroll.unobserve(entry.target);
                    }
                });
            }, { 
                threshold: 0.1,
                rootMargin: '50px'
            });
            
            // Observe elements with animation classes
            getAllElements('[data-aos], .animate-on-scroll').forEach(el => {
                this.observers.scroll.observe(el);
            });
        }
    }
    
    setupCounterAnimations() {
        if ('IntersectionObserver' in window) {
            this.observers.counter = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateCounter(entry.target);
                        this.observers.counter.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            
            getAllElements('.stat-number[data-target]').forEach(counter => {
                this.observers.counter.observe(counter);
            });
        }
    }
    
    animateCounter(element) {
        const target = parseFloat(element.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            // Format number based on size
            let displayValue;
            if (target >= 1000000) {
                displayValue = (current / 1000000).toFixed(1) + 'M';
            } else if (target >= 1000) {
                displayValue = (current / 1000).toFixed(1) + 'K';
            } else {
                displayValue = current.toFixed(target % 1 === 0 ? 0 : 1);
            }
            
            element.textContent = displayValue;
        }, 16);
        
        this.counters.set(element, timer);
    }
    
    setupParallaxEffects() {
        const parallaxElements = getAllElements('.parallax-element');
        
        if (parallaxElements.length > 0) {
            const handleScroll = throttle(() => {
                const scrolled = window.pageYOffset;
                
                parallaxElements.forEach(element => {

