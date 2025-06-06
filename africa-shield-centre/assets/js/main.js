/**
 * Africa Shield Cyber Centre - Home Page Main Script
 * Handles all interactive features for the home page
 * Version: 2.0.0
 * Author: Africa Shield Development Team
 */

// Global variables and configuration
const AFRICA_SHIELD = {
    version: '2.0.0',
    apiEndpoint: 'https://api.africashield.org/v1',
    wsEndpoint: 'wss://ws.africashield.org',
    updateInterval: 30000, // 30 seconds
    animationDuration: 300,
    debounceDelay: 250,
    maxRetries: 3
};

// Application state
let appState = {
    currentTheme: 'light',
    currentFontSize: 16,
    isHighContrast: false,
    currentLanguage: 'en',
    isOnline: navigator.onLine,
    notifications: [],
    socData: {},
    counters: {
        threatsBlocked: 1247856,
        usersProtected: 400000000,
        incidentsResolved: 45623,
        reportsReceived: 2847,
        usersTrained: 75000
    },
    widgets: {
        socStatusWidget: null,
        notificationPanel: null,
        aiAssistantChat: null
    },
    intervals: {},
    websocket: null,
    deferredPrompt: null,
    isInitialized: false
};

// Language translations with enhanced coverage
const translations = {
    en: {
        'soc.status': 'SOC STATUS: OPERATIONAL',
        'emergency.cyber': '24/7 Cyber Emergency Response',
        'ai.greeting': 'Hello! How can I assist you today?',
        'notification.new': 'You have new notifications',
        'theme.switched': 'Theme switched to {mode} mode',
        'font.size.changed': 'Font size: {size}px',
        'font.size.reset': 'Font size reset to default',
        'contrast.enabled': 'High contrast enabled',
        'contrast.disabled': 'High contrast disabled',
        'language.changed': 'Language changed to {language}',
        'connection.lost': 'Connection lost. Retrying...',
        'connection.restored': 'Connection restored',
        'error.occurred': 'An error occurred. Please try again.',
        'loading': 'Loading...',
        'success': 'Success!',
        'failed': 'Failed',
        'retry': 'Retry'
    },
    fr: {
        'soc.status': 'STATUT SOC: OPÉRATIONNEL',
        'emergency.cyber': 'Réponse d\'Urgence Cyber 24/7',
        'ai.greeting': 'Bonjour! Comment puis-je vous aider aujourd\'hui?',
        'notification.new': 'Vous avez de nouvelles notifications',
        'theme.switched': 'Thème basculé en mode {mode}',
        'font.size.changed': 'Taille de police: {size}px',
        'font.size.reset': 'Taille de police réinitialisée par défaut',
        'contrast.enabled': 'Contraste élevé activé',
        'contrast.disabled': 'Contraste élevé désactivé',
        'language.changed': 'Langue changée en {language}',
        'connection.lost': 'Connexion perdue. Nouvelle tentative...',
        'connection.restored': 'Connexion rétablie',
        'error.occurred': 'Une erreur s\'est produite. Veuillez réessayer.',
        'loading': 'Chargement...',
        'success': 'Succès!',
        'failed': 'Échec',
        'retry': 'Réessayer'
    },
    sw: {
        'soc.status': 'HALI YA SOC: INAFANYA KAZI',
        'emergency.cyber': 'Majibu ya Dharura ya Cyber 24/7',
        'ai.greeting': 'Hujambo! Ninawezaje kukusaidia leo?',
        'notification.new': 'Una arifa mpya',
        'theme.switched': 'Mandhari imebadilishwa kwenda {mode}',
        'font.size.changed': 'Ukubwa wa herufi: {size}px',
        'font.size.reset': 'Ukubwa wa herufi umerejelewa kwa chaguo-msingi',
        'contrast.enabled': 'Tofauti kubwa imewashwa',
        'contrast.disabled': 'Tofauti kubwa imezimwa',
        'language.changed': 'Lugha imebadilishwa kwenda {language}',
        'connection.lost': 'Muunganisho umepotea. Inajaribu tena...',
        'connection.restored': 'Muunganisho umerejelewa',
        'error.occurred': 'Hitilafu imetokea. Tafadhali jaribu tena.',
        'loading': 'Inapakia...',
        'success': 'Imefanikiwa!',
        'failed': 'Imeshindwa',
        'retry': 'Jaribu tena'
    },
    rw: {
        'soc.status': 'IMITERERE YA SOC: IRAKORA',
        'emergency.cyber': 'Igisubizo cy\'Ihutirwa cya Cyber 24/7',
        'ai.greeting': 'Muraho! Nshobora kugufasha nte uyu munsi?',
        'notification.new': 'Ufite ubutumwa bushya',
        'theme.switched': 'Ubwoko bwahinduwe kuri {mode}',
        'font.size.changed': 'Ubunini bw\'inyandiko: {size}px',
        'font.size.reset': 'Ubunini bw\'inyandiko bwagaruwe ku busanzwe',
        'contrast.enabled': 'Itandukaniro rikomeye ryashyizweho',
        'contrast.disabled': 'Itandukaniro rikomeye ryavanyweho',
        'language.changed': 'Ururimi rwahinduwe kuri {language}',
        'connection.lost': 'Isano yabuze. Irigerageza...',
        'connection.restored': 'Isano yagaruwe',
        'error.occurred': 'Ikosa ryabaye. Nyamuneka ongera ugerageze.',
        'loading': 'Birapakira...',
        'success': 'Byagenze neza!',
        'failed': 'Byanze',
        'retry': 'Ongera ugerageze'
    }
};

// Utility functions
const Utils = {
    /**
     * Debounce function to limit function calls
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * Throttle function to limit function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Format numbers with appropriate suffixes
     */
    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    /**
     * Animate counter from 0 to target value
     */
    animateCounter(element, target, duration = 2000) {
        if (!element) return;
        
        const start = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * easeOutQuart);
            
            element.textContent = this.formatNumber(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = this.formatNumber(target);
            }
        };
        
        requestAnimationFrame(animate);
    },

    /**
     * Get translation for a key
     */
    translate(key, replacements = {}) {
        const currentTranslations = translations[appState.currentLanguage] || translations.en;
        let text = currentTranslations[key] || key;
        
        // Replace placeholders
        Object.keys(replacements).forEach(placeholder => {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        });
        
        return text;
    },

    /**
     * Show loading state
     */
    showLoading(element, text = null) {
        if (!element) return;
        
        const loadingText = text || this.translate('loading');
        const originalContent = element.innerHTML;
        
        element.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin me-2"></i>
                ${loadingText}
            </div>
        `;
        
        return originalContent;
    },

    /**
     * Hide loading state
     */
    hideLoading(element, originalContent) {
        if (!element || !originalContent) return;
        element.innerHTML = originalContent;
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Smooth scroll to element
     */
    scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }
};

// Toast notification system
const ToastManager = {
    container: null,
    
    init() {
        this.createContainer();
    },
    
    createContainer() {
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.className = 'toast-container position-fixed top-0 end-0 p-3';
        this.container.style.zIndex = '9999';
        document.body.appendChild(this.container);
    },
    
    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => this.remove(toast), duration);
        
        return toast;
    },
    
    createToast(message, type) {
        const toastId = Utils.generateId();
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.id = toastId;
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${icons[type] || icons.info} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        onclick="ToastManager.remove(document.getElementById('${toastId}'))" 
                        aria-label="Close"></button>
            </div>
        `;
        
        return toast;
    },
    
    remove(toast) {
        if (!toast) return;
        
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeHomePage();
});

/**
 * Main initialization function
 */
async function initializeHomePage() {
    try {
        console.log('🚀 Initializing Africa Shield Home Page...');
        
        // Show loading state
        showPageLoading();
        
        // Initialize core systems
        await initializeCoreComponents();
        
        // Load saved settings
        loadSavedSettings();
        
        // Initialize all components
        await initializeAllComponents();
        
        // Start real-time updates
        startRealTimeUpdates();
        
        // Initialize WebSocket connection
        initializeWebSocket();
        
        // Mark as initialized
        appState.isInitialized = true;
        
        // Hide loading state
        hidePageLoading();
        
        console.log('✅ Africa Shield Home Page initialized successfully');
        
        // Show welcome message
        setTimeout(() => {
            ToastManager.show('Welcome to Africa Shield Cyber Centre!', 'success');
        }, 1000);
        
    } catch (error) {
                console.error('❌ Failed to initialize home page:', error);
        hidePageLoading();
        ToastManager.show('Failed to initialize application. Please refresh the page.', 'error');
    }
}

/**
 * Initialize core components
 */
async function initializeCoreComponents() {
    // Initialize toast manager
    ToastManager.init();
    
    // Initialize error handling
    initializeErrorHandling();
    
    // Initialize performance monitoring
    initializePerformanceMonitoring();
    
    // Initialize accessibility features
    initializeAccessibility();
}

/**
 * Initialize all components
 */
async function initializeAllComponents() {
    const initTasks = [
        initializeThemeControls,
        initializeFontSizeControls,
        initializeContrastToggle,
        initializeLanguageControls,
        initializeSOCWidget,
        initializeNotifications,
        initializeAIAssistant,
        initializeCounters,
        initializeCarousels,
        initializeModals,
        initializeSecurityAlerts,
        initializePWA,
        initializeCookieConsent,
        initializeBackToTop,
        initializeFormHandlers,
        initializeSearchFunctionality,
        initializeKeyboardNavigation,
        initializeLazyLoading,
        initializeOfflineSupport
    ];
    
    // Run initialization tasks with error handling
    for (const task of initTasks) {
        try {
            await task();
        } catch (error) {
            console.warn(`Warning: Failed to initialize ${task.name}:`, error);
        }
    }
}

/**
 * Show page loading state
 */
function showPageLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'pageLoadingOverlay';
    loadingOverlay.className = 'page-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-logo">
                <img src="../assets/images/logo.png" alt="Africa Shield" width="80" height="80">
            </div>
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div class="loading-text">
                <h5>Africa Shield Cyber Centre</h5>
                <p>Initializing security systems...</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

/**
 * Hide page loading state
 */
function hidePageLoading() {
    const loadingOverlay = document.getElementById('pageLoadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
        }, 500);
    }
}

/**
 * Load saved user settings
 */
function loadSavedSettings() {
    try {
        appState.currentTheme = localStorage.getItem('africashield_theme') || 'light';
        appState.currentFontSize = parseInt(localStorage.getItem('africashield_fontsize')) || 16;
        appState.isHighContrast = localStorage.getItem('africashield_contrast') === 'true';
        appState.currentLanguage = localStorage.getItem('africashield_language') || 'en';
        
        // Apply settings
        applyTheme(appState.currentTheme);
        applyFontSize(appState.currentFontSize);
        applyHighContrast(appState.isHighContrast);
        applyLanguage(appState.currentLanguage);
        
        console.log('✅ User settings loaded successfully');
    } catch (error) {
        console.warn('⚠️ Failed to load saved settings:', error);
    }
}

/**
 * Theme Controls
 */
function initializeThemeControls() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        updateThemeButton();
        
        // Add keyboard support
        themeToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }
}

function toggleTheme() {
    const newTheme = appState.currentTheme === 'light' ? 'dark' : 'light';
    appState.currentTheme = newTheme;
    applyTheme(newTheme);
    localStorage.setItem('africashield_theme', newTheme);
    
    const message = Utils.translate('theme.switched', { mode: newTheme });
    ToastManager.show(message, 'info');
    
    // Announce to screen readers
    announceToScreenReader(`Theme switched to ${newTheme} mode`);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    updateThemeButton();
    
    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#0d6efd');
    }
}

function updateThemeButton() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (appState.currentTheme === 'dark') {
            icon.className = 'fas fa-moon';
            themeToggle.title = 'Switch to light theme';
            themeToggle.setAttribute('aria-label', 'Switch to light theme');
        } else {
            icon.className = 'fas fa-sun';
            themeToggle.title = 'Switch to dark theme';
            themeToggle.setAttribute('aria-label', 'Switch to dark theme');
        }
    }
}

/**
 * Font Size Controls
 */
function initializeFontSizeControls() {
    const increaseFontBtn = document.getElementById('increaseFontSize');
    const decreaseFontBtn = document.getElementById('decreaseFontSize');
    const resetFontBtn = document.getElementById('resetFontSize');

    if (increaseFontBtn) {
        increaseFontBtn.addEventListener('click', () => changeFontSize(2));
        increaseFontBtn.addEventListener('keydown', handleKeyboardActivation);
    }
    
    if (decreaseFontBtn) {
        decreaseFontBtn.addEventListener('click', () => changeFontSize(-2));
        decreaseFontBtn.addEventListener('keydown', handleKeyboardActivation);
    }
    
    if (resetFontBtn) {
        resetFontBtn.addEventListener('click', resetFontSize);
        resetFontBtn.addEventListener('keydown', handleKeyboardActivation);
    }
}

function changeFontSize(delta) {
    const newSize = Math.max(12, Math.min(24, appState.currentFontSize + delta));
    appState.currentFontSize = newSize;
    applyFontSize(newSize);
    localStorage.setItem('africashield_fontsize', newSize.toString());
    
    const message = Utils.translate('font.size.changed', { size: newSize });
    ToastManager.show(message, 'info');
    
    announceToScreenReader(`Font size changed to ${newSize} pixels`);
}

function resetFontSize() {
    appState.currentFontSize = 16;
    applyFontSize(16);
    localStorage.setItem('africashield_fontsize', '16');
    
    const message = Utils.translate('font.size.reset');
    ToastManager.show(message, 'info');
    
    announceToScreenReader('Font size reset to default');
}

function applyFontSize(size) {
    document.documentElement.style.fontSize = `${size}px`;
    
    // Update CSS custom property for responsive scaling
    document.documentElement.style.setProperty('--base-font-size', `${size}px`);
}

/**
 * High Contrast Toggle
 */
function initializeContrastToggle() {
    const contrastToggle = document.getElementById('contrastToggle');
    if (contrastToggle) {
        contrastToggle.addEventListener('click', toggleHighContrast);
        contrastToggle.addEventListener('keydown', handleKeyboardActivation);
        updateContrastButton();
    }
}

function toggleHighContrast() {
    appState.isHighContrast = !appState.isHighContrast;
    applyHighContrast(appState.isHighContrast);
    localStorage.setItem('africashield_contrast', appState.isHighContrast.toString());
    
    const message = Utils.translate(appState.isHighContrast ? 'contrast.enabled' : 'contrast.disabled');
    ToastManager.show(message, 'info');
    
    announceToScreenReader(`High contrast ${appState.isHighContrast ? 'enabled' : 'disabled'}`);
}

function applyHighContrast(enabled) {
    document.documentElement.classList.toggle('high-contrast', enabled);
    updateContrastButton();
}

function updateContrastButton() {
    const contrastToggle = document.getElementById('contrastToggle');
    if (contrastToggle) {
        contrastToggle.classList.toggle('active', appState.isHighContrast);
        const title = appState.isHighContrast ? 'Disable high contrast' : 'Enable high contrast';
        contrastToggle.title = title;
        contrastToggle.setAttribute('aria-label', title);
    }
}

/**
 * Language Controls
 */
function initializeLanguageControls() {
    const langLinks = document.querySelectorAll('.lang-link');
    langLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const lang = this.getAttribute('data-lang');
            setLanguage(lang);
        });
        
        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const lang = link.getAttribute('data-lang');
                setLanguage(lang);
            }
        });
    });
    
    updateLanguageDisplay();
}

function setLanguage(lang) {
    if (!translations[lang]) {
        console.warn(`Language ${lang} not supported`);
        return;
    }
    
    appState.currentLanguage = lang;
    applyLanguage(lang);
    localStorage.setItem('africashield_language', lang);
    
    const langNames = { 
        en: 'English', 
        fr: 'Français', 
        sw: 'Kiswahili', 
        rw: 'Kinyarwanda' 
    };
    
    const message = Utils.translate('language.changed', { language: langNames[lang] });
    ToastManager.show(message, 'success');
    
    announceToScreenReader(`Language changed to ${langNames[lang]}`);
}

function applyLanguage(lang) {
    updateLanguageDisplay();
    translatePageElements();
    
    // Update document language
    document.documentElement.lang = lang;
}

function updateLanguageDisplay() {
    const currentLangElement = document.getElementById('currentLang');
    const langCodes = { en: 'EN', fr: 'FR', sw: 'SW', rw: 'RW' };
    
    if (currentLangElement) {
        currentLangElement.textContent = langCodes[appState.currentLanguage] || 'EN';
    }
}

function translatePageElements() {
    const currentTranslations = translations[appState.currentLanguage] || translations.en;
    
    // Translate elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (currentTranslations[key]) {
            element.textContent = currentTranslations[key];
        }
    });
}

/**
 * SOC Widget Management
 */
function initializeSOCWidget() {
    const socToggle = document.getElementById('socStatusToggle');
    appState.widgets.socStatusWidget = document.getElementById('socStatusWidget');
    
    if (socToggle && appState.widgets.socStatusWidget) {
        socToggle.addEventListener('click', toggleSOCWidget);
        socToggle.addEventListener('keydown', handleKeyboardActivation);
        
        // Close widget when clicking outside
        document.addEventListener('click', (e) => {
            if (!appState.widgets.socStatusWidget.contains(e.target) && !socToggle.contains(e.target)) {
                if (appState.widgets.socStatusWidget.style.display === 'block') {
                    closeSocWidget();
                }
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && appState.widgets.socStatusWidget.style.display === 'block') {
                closeSocWidget();
            }
        });
    }
    
    updateSOCMetrics();
}

function toggleSOCWidget() {
    const widget = appState.widgets.socStatusWidget;
    if (!widget) return;
    
    if (widget.style.display === 'none' || !widget.style.display) {
        openSocWidget();
    } else {
        closeSocWidget();
    }
}

function openSocWidget() {
    const widget = appState.widgets.socStatusWidget;
    if (!widget) return;
    
    widget.style.display = 'block';
    widget.classList.add('animate__animated', 'animate__slideInRight');
    widget.setAttribute('aria-hidden', 'false');
    
    // Focus management
    const firstFocusable = widget.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
    
    loadSOCAlerts();
    announceToScreenReader('SOC status widget opened');
}

function closeSocWidget() {
    const widget = appState.widgets.socStatusWidget;
    if (!widget) return;
    
    widget.classList.add('animate__animated', 'animate__slideOutRight');
    widget.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
        widget.style.display = 'none';
        widget.classList.remove('animate__animated', 'animate__slideOutRight', 'animate__slideInRight');
    }, 300);
    
    announceToScreenReader('SOC status widget closed');
}

function updateSOCMetrics() {
    const metrics = {
        socThreatsBlocked: appState.counters.threatsBlocked,
        socActiveMonitoring: 14,
        socResponseTime: '2.3m',
        socSystemHealth: '99.8%'
    };
    
    Object.keys(metrics).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            const value = metrics[key];
            if (typeof value === 'number') {
                                Utils.animateCounter(element, value);
            } else {
                element.textContent = value;
            }
        }
    });
}

function loadSOCAlerts() {
    const alertsContainer = document.getElementById('socRecentAlerts');
    if (!alertsContainer) return;
    
    const alerts = [
        { 
            type: 'warning', 
            message: 'Phishing campaign detected in Kenya', 
            time: '2 min ago',
            severity: 'medium'
        },
        { 
            type: 'info', 
            message: 'System update completed successfully', 
            time: '15 min ago',
            severity: 'low'
        },
        { 
            type: 'success', 
            message: 'Malware threat neutralized', 
            time: '1 hour ago',
            severity: 'high'
        }
    ];
    
    alertsContainer.innerHTML = alerts.map((alert, index) => `
        <div class="soc-alert soc-alert-${alert.type}" 
             role="alert" 
             aria-label="Security alert: ${alert.message}"
             tabindex="0">
            <div class="soc-alert-content">
                <div class="soc-alert-message">${alert.message}</div>
                <div class="soc-alert-time">${alert.time}</div>
            </div>
            <div class="soc-alert-actions">
                <button class="btn btn-sm btn-outline-secondary" 
                        onclick="viewAlertDetails('${index}')"
                        aria-label="View alert details">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Notification System
 */
function initializeNotifications() {
    const notificationToggle = document.getElementById('notificationToggle');
    appState.widgets.notificationPanel = document.getElementById('notificationPanel');
    
    if (notificationToggle && appState.widgets.notificationPanel) {
        notificationToggle.addEventListener('click', toggleNotificationPanel);
        notificationToggle.addEventListener('keydown', handleKeyboardActivation);
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = appState.widgets.notificationPanel;
            if (!panel.contains(e.target) && !notificationToggle.contains(e.target)) {
                if (panel.style.display === 'block') {
                    closeNotificationPanel();
                }
            }
        });
    }
    
    loadNotifications();
    
    // Check for new notifications periodically
    appState.intervals.notifications = setInterval(checkForNewNotifications, 60000);
}

function toggleNotificationPanel() {
    const panel = appState.widgets.notificationPanel;
    if (!panel) return;
    
    if (panel.style.display === 'none' || !panel.style.display) {
        openNotificationPanel();
    } else {
        closeNotificationPanel();
    }
}

function openNotificationPanel() {
    const panel = appState.widgets.notificationPanel;
    if (!panel) return;
    
    panel.style.display = 'block';
    panel.classList.add('animate__animated', 'animate__slideInRight');
    panel.setAttribute('aria-hidden', 'false');
    
    // Focus management
    const firstFocusable = panel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
    
    markNotificationsAsRead();
    announceToScreenReader('Notifications panel opened');
}

function closeNotificationPanel() {
    const panel = appState.widgets.notificationPanel;
    if (!panel) return;
    
    panel.classList.add('animate__animated', 'animate__slideOutRight');
    panel.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
        panel.style.display = 'none';
        panel.classList.remove('animate__animated', 'animate__slideOutRight', 'animate__slideInRight');
    }, 300);
    
    announceToScreenReader('Notifications panel closed');
}

function loadNotifications() {
    const notifications = [
        {
            id: 1,
            type: 'security',
            title: 'Security Alert',
            message: 'New phishing campaign targeting mobile banking apps',
            time: '5 minutes ago',
            unread: true,
            priority: 'high'
        },
        {
            id: 2,
            type: 'update',
            title: 'System Update',
            message: 'SOC monitoring capabilities enhanced',
            time: '1 hour ago',
            unread: true,
            priority: 'medium'
        },
        {
            id: 3,
            type: 'training',
            title: 'New Course Available',
            message: 'Advanced Threat Detection course is now live',
            time: '2 hours ago',
            unread: false,
            priority: 'low'
        }
    ];
    
    appState.notifications = notifications;
    renderNotifications();
    updateNotificationCount(notifications.filter(n => n.unread).length);
}

function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    notificationList.innerHTML = appState.notifications.map(notification => `
        <div class="notification-item ${notification.unread ? 'unread' : ''}" 
             data-id="${notification.id}"
             role="listitem"
             tabindex="0"
             aria-label="Notification: ${notification.title}">
            <div class="notification-icon notification-icon-${notification.type}">
                <i class="fas ${getNotificationIcon(notification.type)}" aria-hidden="true"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${notification.time}</div>
            </div>
            <div class="notification-actions">
                <button class="btn btn-sm btn-outline-secondary" 
                        onclick="markAsRead(${notification.id})"
                        aria-label="Mark as read">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" 
                        onclick="deleteNotification(${notification.id})"
                        aria-label="Delete notification">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        security: 'fa-shield-alt',
        update: 'fa-sync-alt',
        training: 'fa-graduation-cap',
        alert: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || 'fa-bell';
}

function updateNotificationCount(count) {
    const badge = document.getElementById('notificationCount');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.style.display = 'block';
            badge.setAttribute('aria-label', `${count} unread notifications`);
        } else {
            badge.style.display = 'none';
        }
    }
}

function markNotificationsAsRead() {
    appState.notifications.forEach(notification => {
        if (notification.unread) {
            notification.unread = false;
        }
    });
    renderNotifications();
    updateNotificationCount(0);
}

function markAsRead(notificationId) {
    const notification = appState.notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.unread = false;
        renderNotifications();
        updateNotificationCount(appState.notifications.filter(n => n.unread).length);
        ToastManager.show('Notification marked as read', 'success');
    }
}

function deleteNotification(notificationId) {
    appState.notifications = appState.notifications.filter(n => n.id !== notificationId);
    renderNotifications();
    updateNotificationCount(appState.notifications.filter(n => n.unread).length);
    ToastManager.show('Notification deleted', 'info');
}

function checkForNewNotifications() {
    // Simulate checking for new notifications
    if (Math.random() < 0.1) { // 10% chance of new notification
        const newNotification = {
            id: Date.now(),
            type: 'security',
            title: 'New Threat Detected',
            message: 'Suspicious activity detected in your region',
            time: 'Just now',
            unread: true,
            priority: 'high'
        };
        
        appState.notifications.unshift(newNotification);
        renderNotifications();
        updateNotificationCount(appState.notifications.filter(n => n.unread).length);
        
        // Show toast for new notification
        ToastManager.show('New security notification received', 'warning');
    }
}

/**
 * AI Assistant
 */
function initializeAIAssistant() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiChat = document.getElementById('aiAssistantChat');
    const closeBtn = document.getElementById('closeAiAssistant');
    const chatForm = document.getElementById('aiChatForm');
    
    if (aiBtn && aiChat) {
        aiBtn.addEventListener('click', toggleAIAssistant);
        aiBtn.addEventListener('keydown', handleKeyboardActivation);
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeAIAssistant);
        }
        
        if (chatForm) {
            chatForm.addEventListener('submit', handleAIMessage);
        }
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && aiChat.style.display === 'block') {
                closeAIAssistant();
            }
        });
    }
    
    appState.widgets.aiAssistantChat = aiChat;
}

function toggleAIAssistant() {
    const aiChat = appState.widgets.aiAssistantChat;
    if (!aiChat) return;
    
    if (aiChat.style.display === 'none' || !aiChat.style.display) {
        openAIAssistant();
    } else {
        closeAIAssistant();
    }
}

function openAIAssistant() {
    const aiChat = appState.widgets.aiAssistantChat;
    if (!aiChat) return;
    
    aiChat.style.display = 'block';
    aiChat.classList.add('animate__animated', 'animate__slideInUp');
    aiChat.setAttribute('aria-hidden', 'false');
    
    // Focus on input
    const input = aiChat.querySelector('#aiUserInput');
    if (input) {
        setTimeout(() => input.focus(), 300);
    }
    
    announceToScreenReader('AI Assistant opened');
}

function closeAIAssistant() {
    const aiChat = appState.widgets.aiAssistantChat;
    if (!aiChat) return;
    
    aiChat.classList.add('animate__animated', 'animate__slideOutDown');
    aiChat.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
        aiChat.style.display = 'none';
        aiChat.classList.remove('animate__animated', 'animate__slideOutDown', 'animate__slideInUp');
    }, 300);
    
    announceToScreenReader('AI Assistant closed');
}

function handleAIMessage(e) {
    e.preventDefault();
    
    const input = document.getElementById('aiUserInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate AI response
    setTimeout(() => {
        hideTypingIndicator();
        const response = generateAIResponse(message);
        addMessageToChat(response, 'assistant');
    }, 1000 + Math.random() * 2000);
}

function addMessageToChat(message, sender) {
    const chatBody = document.getElementById('aiChatBody');
    if (!chatBody) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `ai-message ai-message-${sender}`;
    
    if (sender === 'assistant') {
        messageElement.innerHTML = `
            <span class="ai-avatar" aria-hidden="true">
                <i class="fas fa-robot"></i>
            </span>
            <div class="ai-bubble">${message}</div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="ai-bubble">${message}</div>
            <span class="ai-avatar" aria-hidden="true">
                <i class="fas fa-user"></i>
            </span>
        `;
    }
    
    chatBody.appendChild(messageElement);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Announce to screen readers
    announceToScreenReader(`${sender === 'assistant' ? 'AI Assistant' : 'You'}: ${message}`);
}

function showTypingIndicator() {
    const chatBody = document.getElementById('aiChatBody');
    if (!chatBody) return;
    
    const typingElement = document.createElement('div');
    typingElement.className = 'ai-message ai-message-assistant typing-indicator';
    typingElement.id = 'typingIndicator';
    typingElement.innerHTML = `
        <span class="ai-avatar" aria-hidden="true">
            <i class="fas fa-robot"></i>
        </span>
        <div class="ai-bubble">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatBody.appendChild(typingElement);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function generateAIResponse(userMessage) {
    const responses = {
        greeting: [
            "Hello! I'm here to help you with cybersecurity questions and guidance.",
            "Hi there! How can I assist you with your cybersecurity needs today?",
            "Welcome! I'm your AI cybersecurity assistant. What would you like to know?"
        ],
        threat: [
            "I understand you're concerned about a potential threat. Can you provide more details about what you've observed?",
            "Threat detection is crucial. Please describe the suspicious activity you've noticed.",
            "Let me help you assess this potential threat. What specific indicators have you seen?"
        ],
        training: [
            "Our training programs cover various cybersecurity topics. What area would you like to focus on?",
            "We offer comprehensive cybersecurity education. Are you interested in beginner or advanced courses?",
            "Training is essential for cybersecurity awareness. What's your current experience level?"
        ],
        help: [
            "I'm here to help! You can ask me about threats, training, security best practices, or reporting incidents.",
            "I can assist with cybersecurity questions, guide you through our platform, or help you report security incidents.",
            "Feel free to ask about our services, security tips, or how to protect yourself online."
        ],
        default: [
            "That's an interesting question. Let me connect you with our cybersecurity experts for detailed assistance.",
            "I'd be happy to help with that. Could you provide more specific details about your concern?",
            "For complex cybersecurity matters, I recommend consulting our detailed resources or contacting our SOC team."
        ]
    };
    
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        return getRandomResponse(responses.greeting);
    } else if (message.includes('threat') || message.includes('attack') || message.includes('suspicious')) {
        return getRandomResponse(responses.threat);
    } else if (message.includes('training') || message.includes('course') || message.includes('learn')) {
        return getRandomResponse(responses.training);
    } else if (message.includes('help') || message.includes('assist') || message.includes('support')) {
        return getRandomResponse(responses.help);
    } else {
        return getRandomResponse(responses.default);
    }
}

function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Counter Animations
 */
function initializeCounters() {
    // Animate counters when they come into view
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                animateVisibleCounters(entry.target);
                entry.target.dataset.animated = 'true';
            }
        });
    }, observerOptions);
    
    // Observe all counter elements
    const counterElements = document.querySelectorAll('[data-target], .stat-number, .impact-number');
    counterElements.forEach(el => counterObserver.observe(el));
    
    // Update counters with real-time data
    updateAllCounters();
}

function animateVisibleCounters(container) {
    const counters = container.querySelectorAll('[data-target], .stat-number, .impact-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target) || 
                      parseInt(counter.textContent.replace(/[^\d]/g, '')) || 
                      0;
        
        if (target > 0) {
            Utils.animateCounter(counter, target, 2000);
        }
    });
}

function updateAllCounters() {
    // Update hero stats
    const heroElements = {
        heroThreatsBlocked: appState.counters.threatsBlocked,
        heroUsersProtected: appState.counters.usersProtected,
        heroIncidentsResolved: appState.counters.incidentsResolved
    };
    
    Object.keys(heroElements).forEach(id => {
        const element = document.getElementById(id);
        if (element && !element.dataset.animated) {
            element.textContent = Utils.formatNumber(heroElements[id]);
        }
    });
    
    // Update widget stats
    const widgetElements = {
        widgetThreatsBlocked: appState.counters.threatsBlocked,
        widgetReportsReceived: appState.counters.reportsReceived,
        widgetIncidentsResolved: appState.counters.incidentsResolved,
        widgetUsersTrained: appState.counters.usersTrained
    };
    
    Object.keys(widgetElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = Utils.formatNumber(widgetElements[id]);
        }
    });
    
    // Update live stats
    updateLiveStats();
}

function updateLiveStats() {
    const liveElements = {
        liveMonitoringCount: 14,
        liveThreatCount: Math.floor(appState.counters.threatsBlocked / 365), // Daily average
        liveResponseTime: '2.3m',
        previewActiveThreats: Math.floor(Math.random() * 10) + 5
    };
    
    Object.keys(liveElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const value = liveElements[id];
            element.textContent = typeof value === 'number' ? Utils.formatNumber(value) : value;
        }
    });
    
    // Update last update time
    const lastUpdateElement = document.getElementById('socLastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleTimeString();
    }
    
    const threatLevelUpdate = document.getElementById('threatLevelUpdate');
    if (threatLevelUpdate) {
        threatLevelUpdate.textContent = '2 minutes ago';
    }
}

/**
 * Carousel Initialization
 */
function initializeCarousels() {
    // Initialize Swiper carousels
    if (typeof Swiper !== 'undefined') {
        // Success Stories Carousel
        const successStoriesSwiper = new Swiper('.successStoriesSwiper', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                768: {
                    slidesPerView: 2,
                },
                1024: {
                    slidesPerView: 3,
                }
            },
            a11y: {
                prevSlideMessage: 'Previous success story',
                nextSlideMessage: 'Next success story',
                paginationBulletMessage: 'Go to success story {{index}}'
            }
        });
        
        // Pause autoplay on hover
        const swiperContainer = document.querySelector('.successStoriesSwiper');
        if (swiperContainer) {
            swiperContainer.addEventListener('mouseenter', () => {
                successStoriesSwiper.autoplay.stop();
            });
            
            swiperContainer.addEventListener('mouseleave', () => {
                successStoriesSwiper.autoplay.start();
            });
        }
    }
}

/**
 * Modal Management
 */
function initializeModals() {
    // Demo Modal
    const demoModal = document.getElementById('demoModal');
    if (demoModal) {
        demoModal.addEventListener('shown.bs.modal', () => {
            const iframe = document.getElementById('demoVideo');
            if (iframe) {
                iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
            }
        });
        
        demoModal.addEventListener('hidden.bs.modal', () => {
            const iframe = document.getElementById('demoVideo');
            if (iframe) {
                iframe.src = '';
            }
        });
    }
    
    // Quick Report Modal
    const quickReportModal = document.getElementById('quickReportModal');
    if (quickReportModal) {
        quickReportModal.addEventListener('shown.bs.modal', () => {
            const firstInput = quickReportModal.querySelector('select, input, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        });
    }
}

/**
 * Security Alerts
 */
function initializeSecurityAlerts() {
    // Check for active security alerts
    checkSecurityAlerts();
    
    // Set up periodic checks
    appState.intervals.securityAlerts = setInterval(checkSecurityAlerts, 300000); // 5 minutes
}

function checkSecurityAlerts() {
    // Simulate security alert check
    const shouldShowAlert = Math.random() < 0.1; // 10% chance
    
    if (shouldShowAlert) {
        showSecurityAlert('High threat activity detected in your region. Stay vigilant and report suspicious activities.');
    }
}

function showSecurityAlert(message) {
    const alertBanner = document.getElementById('securityAlertBanner');
    const alertMessage = document.getElementById('securityAlertMessage');
    
    if (alertBanner && alertMessage) {
        alertMessage.textContent = message;
        alertBanner.style.display = 'block';
        alertBanner.classList.add('animate__animated', 'animate__slideInDown');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            dismissSecurityAlert();
        }, 10000);
        
        announceToScreenReader(`Security alert: ${message}`);
    }
}

function dismissSecurityAlert() {
    const alertBanner = document.getElementById('securityAlertBanner');
    if (alertBanner) {
        alertBanner.classList.add('animate__animated', 'animate__slideOutUp');
        setTimeout(() => {
            alertBanner.style.display = 'none';
            alertBanner.classList.remove('animate__animated', 'animate__slideOutUp', 'animate__slideInDown');
        }, 500);
    }
}

/**
 * Progressive Web App (PWA)
 */
function initializePWA() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        appState.deferredPrompt = e;
        showPWAInstallPrompt();
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        hidePWAInstallPrompt();
        ToastManager.show('Africa Shield app installed successfully!', 'success');
    });
}

function showPWAInstallPrompt() {
    const prompt = document.getElementById('pwaInstallPrompt');
    if (prompt && !localStorage.getItem('pwa_prompt_dismissed')) {
        prompt.style.display = 'block';
        prompt.classList.add('animate__animated', 'animate__slideInUp');
    }
}

function hidePWAInstallPrompt() {
    const prompt = document.getElementById('pwaInstallPrompt');
    if (prompt) {
        prompt.classList.add('animate__animated', 'animate__slideOutDown');
        setTimeout(() => {
            prompt.style.display = 'none';
        }, 300);
    }
}

function installPWA() {
    if (appState.deferredPrompt) {
        appState.deferredPrompt.prompt();
        appState.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            appState.deferredPrompt = null;
        });
    }
    hidePWAInstallPrompt();
}

function dismissPWA() {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    hidePWAInstallPrompt();
}

/**
 * Cookie Consent
 */
function initializeCookieConsent() {
    if (!localStorage.getItem('cookie_consent')) {
        setTimeout(() => {
            showCookieConsent();
        }, 2000);
    }
}

function showCookieConsent() {
    const cookieConsent = document.getElementById('cookieConsent');
    if (cookieConsent) {
        cookieConsent.style.display = 'block';
        cookieConsent.classList.add('animate__animated', 'animate__slideInUp');
    }
}

function acceptCookies() {
    localStorage.setItem('cookie_consent', 'accepted');
    hideCookieConsent();
    ToastManager.show('Cookie preferences saved', 'success');
}

function manageCookies() {
    // Redirect to cookie management page
    window.location.href = '../Privacy/cookies.html';
}

function hideCookieConsent() {
    const cookieConsent = document.getElementById('cookieConsent');
    if (cookieConsent) {
        cookieConsent.classList.add('animate__animated', 'animate__slideOutDown');
        setTimeout(() => {
            cookieConsent.style.display = 'none';
        }, 300);
    }
}

/**
 * Back to Top Button
 */
function initializeBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;
    
    // Show/hide button based on scroll position
    const toggleBackToTop = Utils.throttle(() => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    }, 100);
    
    window.addEventListener('scroll', toggleBackToTop);
    
    // Smooth scroll to top
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Keyboard support
    backToTopBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });
}

/**
 * Form Handlers
 */
function initializeFormHandlers() {
    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmission);
    }
    
    // Quick report form
    const quickReportForm = document.getElementById('quickReportForm');
    if (quickReportForm) {
        quickReportForm.addEventListener('submit', handleQuickReportSubmission);
    }
}

function handleNewsletterSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Show loading state
    const originalContent = Utils.showLoading(submitBtn, 'Subscribing...');
    
    // Simulate API call
    setTimeout(() => {
        Utils.hideLoading(submitBtn, originalContent);
        ToastManager.show('Successfully subscribed to security alerts!', 'success');
        form.reset();
    }, 2000);
}

function handleQuickReportSubmission(e) {
    e.preventDefault();
    submitQuickReport();
}

function submitQuickReport() {
    const form = document.getElementById('quickReportForm');
    const formData = new FormData(form);
    
    const reportData = {
        type: document.getElementById('quickThreatType').value,
        description: document.getElementById('quickDescription').value,
        urgency: document.getElementById('quickUrgency').value,
        contact: document.getElementById('quickContact').value,
        timestamp: new Date().toISOString()
    };
    
    // Validate form data
    if (!reportData.type || !reportData.description || !reportData.urgency || !reportData.contact) {
        ToastManager.show('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#quickReportModal .btn-danger');
    const originalContent = Utils.showLoading(submitBtn, 'Submitting...');
    
    // Simulate API submission
    setTimeout(() => {
        Utils.hideLoading(submitBtn, originalContent);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('quickReportModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show success message
        ToastManager.show('Threat report submitted successfully. Our SOC team will investigate.', 'success');
        
        // Reset form
        document.getElementById('quickReportForm').reset();
        
        // Generate report ID for user reference
        const reportId = 'ASC-' + Date.now().toString(36).toUpperCase();
        setTimeout(() => {
            ToastManager.show(`Report ID: ${reportId}. Save this for reference.`, 'info', 8000);
        }, 1000);
        
    }, 2000);
}

/**
 * Search Functionality
 */
function initializeSearchFunctionality() {
    const searchInputs = document.querySelectorAll('input[type="search"], .search-input');
    
    searchInputs.forEach(input => {
        const debouncedSearch = Utils.debounce((query) => {
            performSearch(query);
        }, 300);
        
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                debouncedSearch(query);
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query) {
                    performSearch(query);
                }
            }
        });
    });
}

function performSearch(query) {
    console.log('Performing search for:', query);
    
    // Simulate search results
    const searchResults = [
        { title: 'Phishing Protection Guide', url: '../Learn/phishing.html', type: 'guide' },
        { title: 'Mobile Security Best Practices', url: '../Learn/mobile-security.html', type: 'course' },
        { title: 'Report Cyber Incident', url: '../Report/index.html', type: 'tool' }
    ].filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase())
    );
    
    displaySearchResults(searchResults, query);
}

function displaySearchResults(results, query) {
    // This would typically show results in a dropdown or dedicated results page
    console.log(`Found ${results.length} results for "${query}":`, results);
}

/**
 * Keyboard Navigation
 */
function initializeKeyboardNavigation() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Alt + S: Open search
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Alt + N: Open notifications
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            toggleNotificationPanel();
        }
        
        // Alt + H: Open help/AI assistant
        if (e.altKey && e.key === 'h') {
            e.preventDefault();
            toggleAIAssistant();
        }
        
        // Alt + T: Toggle theme
        if (e.altKey && e.key === 't') {
            e.preventDefault();
            toggleTheme();
        }
    });
    
    // Skip links for accessibility
    addSkipLinks();
}

function addSkipLinks() {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
        <a href="#footer" class="skip-link">Skip to footer</a>
    `;
    
    document.body.insertBefore(skipLinks, document.body.firstChild);
}

/**
 * Lazy Loading
 */
function initializeLazyLoading() {
    // Lazy load images
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
    
    // Lazy load content sections
    const contentObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    const sections = document.querySelectorAll('section, .feature-card, .news-card');
    sections.forEach(section => contentObserver.observe(section));
}

/**
 * Offline Support
 */
function initializeOfflineSupport() {
    // Monitor online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Check initial status
    updateConnectionStatus();
}

function handleOnlineStatus() {
    appState.isOnline = true;
    updateConnectionStatus();
    ToastManager.show(Utils.translate('connection.restored'), 'success');
    
    // Retry failed requests
    retryFailedRequests();
}

function handleOfflineStatus() {
    appState.isOnline = false;
    updateConnectionStatus();
    ToastManager.show(Utils.translate('connection.lost'), 'warning');
}

function updateConnectionStatus() {
    const statusIndicators = document.querySelectorAll('.connection-status');
    statusIndicators.forEach(indicator => {
        indicator.classList.toggle('online', appState.isOnline);
        indicator.classList.toggle('offline', !appState.isOnline);
    });
}

function retryFailedRequests() {
    // Implement retry logic for failed API requests
    console.log('Retrying failed requests...');
}

/**
 * Real-time Updates
 */
function startRealTimeUpdates() {
    // Update counters periodically
    appState.intervals.counters = setInterval(() => {
        updateCountersWithNewData();
    }, AFRICA_SHIELD.updateInterval);
    
    // Update SOC metrics
    appState.intervals.socMetrics = setInterval(() => {
        updateSOCMetrics();
        updateLiveStats();
    }, 15000); // Every 15 seconds
    
    // Update threat level
    appState.intervals.threatLevel = setInterval(() => {
        updateThreatLevel();
    }, 60000); // Every minute
}

function updateCountersWithNewData() {
    // Simulate real-time counter updates
    const increments = {
        threatsBlocked: Math.floor(Math.random() * 50) + 10,
        usersProtected: Math.floor(Math.random() * 1000) + 100,
        incidentsResolved: Math.floor(Math.random() * 5) + 1,
        reportsReceived: Math.floor(Math.random() * 10) + 2,
        usersTrained: Math.floor(Math.random() * 20) + 5
    };
    
    Object.keys(increments).forEach(key => {
        appState.counters[key] += increments[key];
    });
    
    updateAllCounters();
}

function updateThreatLevel() {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentLevel = levels[Math.floor(Math.random() * levels.length)];
    
    const threatMeter = document.querySelector('.threat-level-fill');
    const threatStatus = document.querySelector('.threat-level-status');
    const threatDescription = document.querySelector('.threat-level-description');
    
    if (threatMeter) {
        threatMeter.setAttribute('data-level', currentLevel);
        threatMeter.className = `threat-level-fill threat-level-${currentLevel}`;
    }
    
    if (threatStatus) {
        threatStatus.textContent = currentLevel.toUpperCase();
    }
    
    if (threatDescription) {
        const descriptions = {
            low: 'Normal threat activity. Standard security protocols in effect.',
            medium: 'Elevated threat activity detected. Maintain standard security protocols.',
            high: 'High threat activity. Enhanced security measures recommended.',
            critical: 'Critical threat level. Immediate security actions required.'
        };
        threatDescription.textContent = descriptions[currentLevel];
    }
}

/**
 * WebSocket Connection
 */
function initializeWebSocket() {
    if (!window.WebSocket) {
        console.warn('WebSocket not supported');
        return;
    }
    
    connectWebSocket();
}

function connectWebSocket() {
    try {
        appState.websocket = new WebSocket(AFRICA_SHIELD.wsEndpoint);
        
        appState.websocket.onopen = () => {
            console.log('✅ WebSocket connected');
            ToastManager.show('Real-time updates enabled', 'success');
        };
        
        appState.websocket.onmessage = (event) => {
            handleWebSocketMessage(JSON.parse(event.data));
        };
        
        appState.websocket.onclose = () => {
            console.log('❌ WebSocket disconnected');
            // Attempt to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };
        
        appState.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'threat_alert':
            handleThreatAlert(data.payload);
            break;
        case 'counter_update':
            handleCounterUpdate(data.payload);
            break;
        case 'notification':
            handleNewNotification(data.payload);
            break;
        case 'soc_status':
            handleSOCStatusUpdate(data.payload);
            break;
        default:
            console.log('Unknown WebSocket message type:', data.type);
    }
}

function handleThreatAlert(alert) {
    showSecurityAlert(alert.message);
    
    // Add to notifications
    const notification = {
        id: Date.now(),
        type: 'security',
        title: 'Threat Alert',
        message: alert.message,
        time: 'Just now',
        unread: true,
        priority: alert.severity || 'high'
    };
    
    appState.notifications.unshift(notification);
    renderNotifications();
    updateNotificationCount(appState.notifications.filter(n => n.unread).length);
}

function handleCounterUpdate(counters) {
    Object.assign(appState.counters, counters);
    updateAllCounters();
}

function handleNewNotification(notification) {
    appState.notifications.unshift({
        ...notification,
        id: Date.now(),
        time: 'Just now',
        unread: true
    });
    
    renderNotifications();
    updateNotificationCount(appState.notifications.filter(n => n.unread).length);
    
    ToastManager.show(`New ${notification.type} notification`, 'info');
}

function handleSOCStatusUpdate(status) {
    appState.socData = { ...appState.socData, ...status };
    updateSOCMetrics();
}

/**
 * Error Handling
 */
function initializeErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        logError('JavaScript Error', event.error.message, event.error.stack);
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        logError('Promise Rejection', event.reason);
    });
}

function logError(type, message, stack = '') {
    const errorData = {
        type,
        message,
        stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('user_id') || 'anonymous'
    };
    
    // Send error to logging service (implement as needed)
    console.log('Error logged:', errorData);
}

/**
 * Performance Monitoring
 */
function initializePerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
            
            console.log(`Page load time: ${loadTime}ms`);
            
            // Log performance metrics
            logPerformance({
                loadTime,
                domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
                firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
            });
        }, 0);
    });
}

function logPerformance(metrics) {
    console.log('Performance metrics:', metrics);
    // Send to analytics service (implement as needed)
}

/**
 * Accessibility Features
 */
function initializeAccessibility() {
    // Add ARIA live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'visually-hidden';
    document.body.appendChild(liveRegion);
    
    // Focus management for modals and widgets
    initializeFocusManagement();
    
    // High contrast media query
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    if (highContrastQuery.matches && !appState.isHighContrast) {
        toggleHighContrast();
    }
    
    // Reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) {
        document.documentElement.classList.add('reduced-motion');
    }
    
    // Color scheme preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeQuery.matches && appState.currentTheme === 'light') {
        // Only auto-switch if user hasn't manually set a preference
        if (!localStorage.getItem('africashield_theme')) {
            applyTheme('dark');
        }
    }
    
    // Listen for preference changes
    darkModeQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('africashield_theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function initializeFocusManagement() {
    // Track focusable elements
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    // Trap focus in modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const activeModal = document.querySelector('.modal.show, .ai-assistant-chat[style*="block"], .soc-status-widget[style*="block"], .notification-panel[style*="block"]');
            
            if (activeModal) {
                trapFocus(e, activeModal);
            }
        }
    });
}

function trapFocus(event, container) {
    const focusableElements = container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
        if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        }
    } else {
        if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
}

function announceToScreenReader(message) {
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

/**
 * Utility Functions
 */
const Utils = {
    // Format numbers with appropriate suffixes
    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },
    
    // Animate counter from 0 to target value
    animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            element.textContent = this.formatNumber(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = this.formatNumber(target);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    // Debounce function calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function calls
    throttle(func, limit) {
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
    },
    
    // Show loading state on button
    showLoading(button, text = 'Loading...') {
        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${text}
        `;
        return originalContent;
    },
    
    // Hide loading state on button
    hideLoading(button, originalContent) {
        button.disabled = false;
        button.innerHTML = originalContent;
    },
    
    // Translate text using current language
    translate(key, params = {}) {
        const currentTranslations = translations[appState.currentLanguage] || translations.en;
        let text = currentTranslations[key] || key;
        
        // Replace parameters
        Object.keys(params).forEach(param => {
            text = text.replace(`{{${param}}}`, params[param]);
        });
        
        return text;
    },
    
    // Generate unique ID
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Validate email address
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Sanitize HTML content
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },
    
    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            ToastManager.show('Copied to clipboard', 'success');
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            ToastManager.show('Failed to copy to clipboard', 'error');
            return false;
        }
    },
    
    // Get device information
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
    }
};

/**
 * Toast Manager
 */
const ToastManager = {
    container: null,
    
    init() {
        this.createContainer();
    },
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container position-fixed top-0 end-0 p-3';
        this.container.style.zIndex = '9999';
        document.body.appendChild(this.container);
    },
    
    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type, duration);
        this.container.appendChild(toast);
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: duration
        });
        bsToast.show();
        
        // Remove from DOM after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
        
        return bsToast;
    },
    
    createToast(message, type, duration) {
        const toastId = Utils.generateId();
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const colors = {
            success: 'text-success',
            error: 'text-danger',
            warning: 'text-warning',
            info: 'text-primary'
        };
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.id = toastId;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="toast-header">
                <i class="fas ${icons[type]} ${colors[type]} me-2"></i>
                <strong class="me-auto">Africa Shield</strong>
                <small class="text-muted">now</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${Utils.sanitizeHTML(message)}
            </div>
        `;
        
        return toast;
    }
};

/**
 * Event Handlers
 */
function handleKeyboardActivation(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.target.click();
    }
}

function viewAlertDetails(alertIndex) {
    ToastManager.show('Alert details would be shown here', 'info');
}

function markAllAsRead() {
    markNotificationsAsRead();
    ToastManager.show('All notifications marked as read', 'success');
}

/**
 * API Functions
 */
const API = {
    baseURL: AFRICA_SHIELD.apiEndpoint,
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            
            if (!appState.isOnline) {
                ToastManager.show('No internet connection. Please try again when online.', 'error');
            } else {
                ToastManager.show('Request failed. Please try again.', 'error');
            }
            
            throw error;
        }
    },
    
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

/**
 * Analytics
 */
const Analytics = {
    track(event, properties = {}) {
        const data = {
            event,
            properties: {
                ...properties,
                timestamp: new Date().toISOString(),
                page: window.location.pathname,
                userAgent: navigator.userAgent,
                language: appState.currentLanguage,
                theme: appState.currentTheme
            }
        };
        
        console.log('Analytics event:', data);
        
        // Send to analytics service (implement as needed)
        if (typeof gtag !== 'undefined') {
            gtag('event', event, properties);
        }
    },
    
    pageView(page = window.location.pathname) {
        this.track('page_view', { page });
    },
    
    userAction(action, category = 'user_interaction') {
        this.track('user_action', { action, category });
    }
};

/**
 * Cleanup Functions
 */
function cleanup() {
    // Clear intervals
    Object.values(appState.intervals).forEach(interval => {
        if (interval) {
            clearInterval(interval);
        }
    });
    
    // Close WebSocket connection
    if (appState.websocket) {
        appState.websocket.close();
    }
    
    // Remove event listeners
    window.removeEventListener('beforeunload', cleanup);
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

/**
 * Extended Language Translations
 */
Object.assign(translations, {
    en: {
        ...translations.en,
        'theme.switched': 'Theme switched to {{mode}} mode',
        'font.size.changed': 'Font size changed to {{size}}px',
        'font.size.reset': 'Font size reset to default',
        'contrast.enabled': 'High contrast enabled',
        'contrast.disabled': 'High contrast disabled',
        'language.changed': 'Language changed to {{language}}',
        'connection.restored': 'Internet connection restored',
        'connection.lost': 'Internet connection lost. Some features may be limited.',
        'error.generic': 'An error occurred. Please try again.',
        'loading': 'Loading...',
        'success': 'Success',
        'error': 'Error',
        'warning': 'Warning',
        'info': 'Information'
    },
    fr: {
        ...translations.fr,
        'theme.switched': 'Thème basculé en mode {{mode}}',
        'font.size.changed': 'Taille de police changée à {{size}}px',
        'font.size.reset': 'Taille de police réinitialisée par défaut',
        'contrast.enabled': 'Contraste élevé activé',
        'contrast.disabled': 'Contraste élevé désactivé',
        'language.changed': 'Langue changée en {{language}}',
        'connection.restored': 'Connexion Internet rétablie',
        'connection.lost': 'Connexion Internet perdue. Certaines fonctionnalités peuvent être limitées.',
        'error.generic': 'Une erreur s\'est produite. Veuillez réessayer.',
        'loading': 'Chargement...',
        'success': 'Succès',
        'error': 'Erreur',
        'warning': 'Avertissement',
        'info': 'Information'
    },
    sw: {
        ...translations.sw,
        'theme.switched': 'Mandhari imebadilishwa kwenda {{mode}}',
        'font.size.changed': 'Ukubwa wa herufi umebadilishwa kuwa {{size}}px',
                'font.size.reset': 'Ukubwa wa herufi umerejeshwa kwa chaguo-msingi',
        'contrast.enabled': 'Utofauti mkubwa umewashwa',
        'contrast.disabled': 'Utofauti mkubwa umezimwa',
        'language.changed': 'Lugha imebadilishwa kuwa {{language}}',
        'connection.restored': 'Muunganisho wa mtandao umerejeshwa',
        'connection.lost': 'Muunganisho wa mtandao umepotea. Baadhi ya vipengele vinaweza kuwa na kikomo.',
        'error.generic': 'Hitilafu imetokea. Tafadhali jaribu tena.',
        'loading': 'Inapakia...',
        'success': 'Mafanikio',
        'error': 'Hitilafu',
        'warning': 'Onyo',
        'info': 'Taarifa'
    },
    rw: {
        ...translations.rw,
        'theme.switched': 'Insanganyamatsiko yahinduwe kuri {{mode}}',
        'font.size.changed': 'Ingano y\'inyandiko yahinduwe kuri {{size}}px',
        'font.size.reset': 'Ingano y\'inyandiko yagaruwe ku bisanzwe',
        'contrast.enabled': 'Itandukanye rikomeye ryashyizweho',
        'contrast.disabled': 'Itandukanye rikomeye ryavanyweho',
        'language.changed': 'Ururimi rwahinduwe kuri {{language}}',
        'connection.restored': 'Ihuza rya interineti ryagaruye',
        'connection.lost': 'Ihuza rya interineti ryabuze. Ibintu bimwe birashobora kuba bifite imbogamizi.',
        'error.generic': 'Ikosa ryabaye. Nyamuneka ongera ugerageze.',
        'loading': 'Birapakira...',
        'success': 'Byagenze neza',
        'error': 'Ikosa',
        'warning': 'Iburira',
        'info': 'Amakuru'
    }
});

/**
 * Advanced Features
 */

/**
 * Geolocation Services
 */
const GeoLocation = {
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    },
    
    async getNearbyThreats() {
        try {
            const location = await this.getCurrentLocation();
            // Simulate API call to get nearby threats
            return [
                {
                    type: 'phishing',
                    distance: '2.3 km',
                    severity: 'medium',
                    description: 'Fake banking website reported'
                },
                {
                    type: 'wifi_attack',
                    distance: '5.1 km',
                    severity: 'high',
                    description: 'Malicious WiFi hotspot detected'
                }
            ];
        } catch (error) {
            console.error('Failed to get location:', error);
            return [];
        }
    }
};

/**
 * Biometric Authentication Support
 */
const BiometricAuth = {
    async isSupported() {
        return window.PublicKeyCredential && 
               await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    },
    
    async register(username) {
        if (!await this.isSupported()) {
            throw new Error('Biometric authentication not supported');
        }
        
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: new Uint8Array(32),
                rp: {
                    name: "Africa Shield Cyber Centre",
                    id: "africashield.org",
                },
                user: {
                    id: new TextEncoder().encode(username),
                    name: username,
                    displayName: username,
                },
                pubKeyCredParams: [{alg: -7, type: "public-key"}],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                },
                timeout: 60000,
                attestation: "direct"
            }
        });
        
        return credential;
    },
    
    async authenticate() {
        if (!await this.isSupported()) {
            throw new Error('Biometric authentication not supported');
        }
        
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: new Uint8Array(32),
                timeout: 60000,
                userVerification: "required"
            }
        });
        
        return assertion;
    }
};

/**
 * Voice Commands
 */
const VoiceCommands = {
    recognition: null,
    isListening: false,
    
    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return false;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = appState.currentLanguage === 'sw' ? 'sw-TZ' : 
                              appState.currentLanguage === 'fr' ? 'fr-FR' :
                              appState.currentLanguage === 'rw' ? 'rw-RW' : 'en-US';
        
        this.recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            this.processCommand(command);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
        };
        
        return true;
    },
    
    startListening() {
        if (!this.recognition || this.isListening) return;
        
        this.isListening = true;
        this.recognition.start();
        ToastManager.show('Listening for voice command...', 'info');
    },
    
    stopListening() {
        if (!this.recognition || !this.isListening) return;
        
        this.recognition.stop();
        this.isListening = false;
    },
    
    processCommand(command) {
        console.log('Voice command:', command);
        
        const commands = {
            'open notifications': () => toggleNotificationPanel(),
            'open soc': () => toggleSOCWidget(),
            'open assistant': () => toggleAIAssistant(),
            'toggle theme': () => toggleTheme(),
            'increase font': () => changeFontSize(2),
            'decrease font': () => changeFontSize(-2),
            'report threat': () => {
                const modal = new bootstrap.Modal(document.getElementById('quickReportModal'));
                modal.show();
            },
            'go to dashboard': () => window.location.href = '../Dashboard/index.html',
            'go to learning': () => window.location.href = '../Learn/index.html'
        };
        
        const matchedCommand = Object.keys(commands).find(cmd => 
            command.includes(cmd.toLowerCase())
        );
        
        if (matchedCommand) {
            commands[matchedCommand]();
            ToastManager.show(`Executed: ${matchedCommand}`, 'success');
        } else {
            ToastManager.show('Command not recognized', 'warning');
        }
    }
};

/**
 * Advanced Security Features
 */
const SecurityFeatures = {
    // Check for suspicious browser extensions
    async checkBrowserSecurity() {
        const suspiciousExtensions = [];
        
        // Check for common malicious extension patterns
        if (window.chrome && window.chrome.runtime) {
            // This is a simplified check - real implementation would be more comprehensive
            const extensionCount = Object.keys(window.chrome.runtime).length;
            if (extensionCount > 20) {
                suspiciousExtensions.push('High number of extensions detected');
            }
        }
        
        return {
            safe: suspiciousExtensions.length === 0,
            issues: suspiciousExtensions
        };
    },
    
    // Detect potential screen recording
    detectScreenRecording() {
        let isRecording = false;
        
        // Check for screen capture API usage
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            // Monitor for screen sharing
            const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
            navigator.mediaDevices.getDisplayMedia = function(...args) {
                isRecording = true;
                console.warn('Screen recording detected');
                ToastManager.show('Screen recording detected. Please ensure you trust the application.', 'warning');
                return originalGetDisplayMedia.apply(this, args);
            };
        }
        
        return isRecording;
    },
    
    // Generate security report
    async generateSecurityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            browser: {
                userAgent: navigator.userAgent,
                cookiesEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                language: navigator.language
            },
            security: {
                https: location.protocol === 'https:',
                browserSecurity: await this.checkBrowserSecurity(),
                screenRecording: this.detectScreenRecording()
            },
            device: Utils.getDeviceInfo(),
            settings: {
                theme: appState.currentTheme,
                language: appState.currentLanguage,
                highContrast: appState.isHighContrast,
                fontSize: appState.currentFontSize
            }
        };
        
        return report;
    }
};

/**
 * Data Export/Import
 */
const DataManager = {
    exportUserData() {
        const userData = {
            settings: {
                theme: appState.currentTheme,
                language: appState.currentLanguage,
                fontSize: appState.currentFontSize,
                highContrast: appState.isHighContrast
            },
            preferences: {
                cookieConsent: localStorage.getItem('cookie_consent'),
                pwaPromptDismissed: localStorage.getItem('pwa_prompt_dismissed')
            },
            exportDate: new Date().toISOString(),
            version: AFRICA_SHIELD.version
        };
        
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `africashield-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        ToastManager.show('User data exported successfully', 'success');
    },
    
    async importUserData(file) {
        try {
            const text = await file.text();
            const userData = JSON.parse(text);
            
            // Validate data structure
            if (!userData.settings || !userData.version) {
                throw new Error('Invalid data format');
            }
            
            // Apply imported settings
            if (userData.settings.theme) {
                setTheme(userData.settings.theme);
            }
            if (userData.settings.language) {
                setLanguage(userData.settings.language);
            }
            if (userData.settings.fontSize) {
                changeFontSize(userData.settings.fontSize - appState.currentFontSize);
            }
            if (userData.settings.highContrast !== appState.isHighContrast) {
                toggleHighContrast();
            }
            
            ToastManager.show('User data imported successfully', 'success');
            
        } catch (error) {
            console.error('Import failed:', error);
            ToastManager.show('Failed to import data. Please check the file format.', 'error');
        }
    }
};

/**
 * Advanced Analytics
 */
const AdvancedAnalytics = {
    sessionStart: Date.now(),
    interactions: [],
    
    trackInteraction(element, action) {
        const interaction = {
            timestamp: Date.now(),
            element: element.tagName.toLowerCase(),
            elementId: element.id,
            elementClass: element.className,
            action: action,
            page: window.location.pathname
        };
        
        this.interactions.push(interaction);
        
        // Send to analytics if we have enough data
        if (this.interactions.length >= 10) {
            this.sendBatch();
        }
    },
    
    sendBatch() {
        const batch = {
            sessionId: this.sessionStart,
            interactions: this.interactions.splice(0, 10),
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };
        
        console.log('Analytics batch:', batch);
        // Send to analytics service
    },
    
    getSessionStats() {
        const sessionDuration = Date.now() - this.sessionStart;
        return {
            duration: sessionDuration,
            interactions: this.interactions.length,
            averageInteractionTime: sessionDuration / Math.max(this.interactions.length, 1)
        };
    }
};

/**
 * Initialize advanced features
 */
function initializeAdvancedFeatures() {
    // Initialize voice commands if supported
    if (VoiceCommands.init()) {
        // Add voice command button
        addVoiceCommandButton();
    }
    
    // Initialize biometric auth if supported
    BiometricAuth.isSupported().then(supported => {
        if (supported) {
            console.log('Biometric authentication available');
        }
    });
    
    // Initialize security monitoring
    SecurityFeatures.detectScreenRecording();
    
    // Track user interactions for analytics
    document.addEventListener('click', (e) => {
        AdvancedAnalytics.trackInteraction(e.target, 'click');
    });
    
    // Initialize geolocation services
    if (navigator.geolocation) {
        GeoLocation.getNearbyThreats().then(threats => {
            if (threats.length > 0) {
                console.log('Nearby threats detected:', threats);
            }
        });
    }
}

function addVoiceCommandButton() {
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'btn btn-outline-secondary btn-sm me-2';
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceBtn.title = 'Voice Commands';
        voiceBtn.setAttribute('aria-label', 'Activate voice commands');
    
    voiceBtn.addEventListener('click', () => {
        if (VoiceCommands.isListening) {
            VoiceCommands.stopListening();
            voiceBtn.classList.remove('btn-danger');
            voiceBtn.classList.add('btn-outline-secondary');
        } else {
            VoiceCommands.startListening();
            voiceBtn.classList.remove('btn-outline-secondary');
            voiceBtn.classList.add('btn-danger');
        }
    });
    
    // Add to utility controls
    const utilityControls = document.querySelector('.d-flex.align-items-center');
    if (utilityControls) {
        utilityControls.insertBefore(voiceBtn, utilityControls.firstChild);
    }
}

/**
 * Notification System Extensions
 */
function markNotificationsAsRead() {
    appState.notifications.forEach(notification => {
        notification.unread = false;
    });
    
    renderNotifications();
    updateNotificationCount(0);
    
    // Update UI
    const notificationItems = document.querySelectorAll('.notification-item.unread');
    notificationItems.forEach(item => {
        item.classList.remove('unread');
    });
}

function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    if (appState.notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-bell-slash fa-2x mb-2"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    notificationList.innerHTML = appState.notifications.map(notification => `
        <div class="notification-item ${notification.unread ? 'unread' : ''}" 
             data-id="${notification.id}"
             ${notification.priority === 'high' ? 'data-priority="high"' : ''}>
            <div class="notification-icon notification-icon-${notification.type}">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${Utils.sanitizeHTML(notification.message)}</div>
                <div class="notification-time">${notification.time}</div>
            </div>
            <div class="notification-actions">
                <button class="btn btn-sm btn-outline-secondary" 
                        onclick="dismissNotification(${notification.id})"
                        aria-label="Dismiss notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function dismissNotification(notificationId) {
    appState.notifications = appState.notifications.filter(n => n.id !== notificationId);
    renderNotifications();
    updateNotificationCount(appState.notifications.filter(n => n.unread).length);
    ToastManager.show('Notification dismissed', 'info');
}

function updateNotificationCount(count) {
    const badge = document.getElementById('notificationCount');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

/**
 * Enhanced AI Assistant
 */
function initializeAIAssistant() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiChat = document.getElementById('aiAssistantChat');
    const closeBtn = document.getElementById('closeAiAssistant');
    const chatForm = document.getElementById('aiChatForm');
    
    if (aiBtn && aiChat) {
        aiBtn.addEventListener('click', toggleAIAssistant);
        aiBtn.addEventListener('keydown', handleKeyboardActivation);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAIAssistant);
    }
    
    if (chatForm) {
        chatForm.addEventListener('submit', handleAIChatSubmit);
    }
    
    // Initialize chat with welcome message
    addAIMessage('Hello! I\'m your cybersecurity assistant. How can I help you today?', 'assistant');
}

function toggleAIAssistant() {
    const aiChat = document.getElementById('aiAssistantChat');
    const aiBtn = document.getElementById('aiAssistantBtn');
    
    if (aiChat.style.display === 'none' || !aiChat.style.display) {
        openAIAssistant();
    } else {
        closeAIAssistant();
    }
}

function openAIAssistant() {
    const aiChat = document.getElementById('aiAssistantChat');
    const aiBtn = document.getElementById('aiAssistantBtn');
    
    aiChat.style.display = 'block';
    aiChat.classList.add('animate__animated', 'animate__slideInUp');
    aiBtn.classList.add('active');
    
    // Focus on input
    const input = document.getElementById('aiUserInput');
    if (input) {
        setTimeout(() => input.focus(), 300);
    }
    
    Analytics.userAction('ai_assistant_opened');
}

function closeAIAssistant() {
    const aiChat = document.getElementById('aiAssistantChat');
    const aiBtn = document.getElementById('aiAssistantBtn');
    
    aiChat.classList.add('animate__animated', 'animate__slideOutDown');
    aiBtn.classList.remove('active');
    
    setTimeout(() => {
        aiChat.style.display = 'none';
        aiChat.classList.remove('animate__animated', 'animate__slideOutDown', 'animate__slideInUp');
    }, 300);
}

function handleAIChatSubmit(e) {
    e.preventDefault();
    
    const input = document.getElementById('aiUserInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addAIMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    showAITyping();
    
    // Simulate AI response
    setTimeout(() => {
        hideAITyping();
        const response = generateAIResponse(message);
        addAIMessage(response, 'assistant');
    }, 1000 + Math.random() * 2000);
    
    Analytics.userAction('ai_message_sent', { message_length: message.length });
}

function addAIMessage(message, sender) {
    const chatBody = document.getElementById('aiChatBody');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${sender}`;
    
    if (sender === 'assistant') {
        messageDiv.innerHTML = `
            <span class="ai-avatar"><i class="fas fa-robot"></i></span>
            <div class="ai-bubble">${Utils.sanitizeHTML(message)}</div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="ai-bubble">${Utils.sanitizeHTML(message)}</div>
            <span class="ai-avatar"><i class="fas fa-user"></i></span>
        `;
    }
    
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Announce to screen readers
    if (sender === 'assistant') {
        announceToScreenReader(`AI Assistant says: ${message}`);
    }
}

function showAITyping() {
    const chatBody = document.getElementById('aiChatBody');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message ai-message-assistant ai-typing';
    typingDiv.id = 'ai-typing-indicator';
    typingDiv.innerHTML = `
        <span class="ai-avatar"><i class="fas fa-robot"></i></span>
        <div class="ai-bubble">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function hideAITyping() {
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function generateAIResponse(userMessage) {
    const responses = {
        greeting: [
            "Hello! I'm here to help you with cybersecurity questions and guide you through our platform.",
            "Hi there! How can I assist you with your cybersecurity needs today?",
            "Welcome! I'm your AI cybersecurity assistant. What would you like to know?"
        ],
        threat: [
            "If you're experiencing a security threat, I recommend reporting it immediately using our threat reporting system. Would you like me to guide you through the process?",
            "Security threats should be taken seriously. You can report incidents through our SOC dashboard or use the quick report feature. Do you need immediate assistance?",
            "For active threats, please contact our 24/7 SOC team at *789*911#. I can also help you understand the threat better - what type of threat are you dealing with?"
        ],
        training: [
            "Our learning platform offers comprehensive cybersecurity courses in multiple languages. You can start with our beginner-friendly modules or take our assessment to find the right level for you.",
            "We have interactive training modules covering phishing, malware, mobile security, and more. All courses are available in English, French, Swahili, and Kinyarwanda. What area interests you most?",
            "Our gamified learning approach makes cybersecurity education engaging and effective. Would you like me to recommend some courses based on your experience level?"
        ],
        mobile: [
            "Mobile security is crucial in East Africa. Our platform provides specific guidance for mobile money security, app safety, and device protection. What mobile security concerns do you have?",
            "We offer specialized mobile security tools and training. This includes protection for M-Pesa and other mobile money platforms. Would you like to learn about mobile security best practices?"
        ],
        help: [
            "I can help you with threat reporting, security training, platform navigation, and general cybersecurity questions. What specific area would you like assistance with?",
            "I'm here to assist with cybersecurity guidance, platform features, and connecting you with the right resources. How can I help you today?",
            "Feel free to ask about our services, security best practices, threat reporting, or training programs. I'm here to help!"
        ],
        soc: [
            "Our Security Operations Center (SOC) monitors threats across 14 East African countries 24/7. You can view real-time threat data, submit reports, and access our monitoring dashboard.",
            "The SOC dashboard provides live threat intelligence, incident tracking, and regional security status. Would you like me to show you how to access these features?"
        ],
        default: [
            "That's an interesting question. Let me connect you with our cybersecurity experts for detailed assistance. You can also browse our knowledge base for more information.",
            "I'd be happy to help with that. Could you provide more specific details about your cybersecurity concern?",
            "For complex cybersecurity matters, I recommend consulting our detailed resources or contacting our SOC team directly. Is there a specific area you'd like to explore?"
        ]
    };
    
    const message = userMessage.toLowerCase();
    
    // Enhanced keyword matching
    if (message.match(/\b(hello|hi|hey|greetings)\b/)) {
        return getRandomResponse(responses.greeting);
    } else if (message.match(/\b(threat|attack|suspicious|malware|virus|phishing|hack|breach)\b/)) {
        return getRandomResponse(responses.threat);
    } else if (message.match(/\b(training|course|learn|education|certification|study)\b/)) {
        return getRandomResponse(responses.training);
    } else if (message.match(/\b(mobile|phone|app|mpesa|m-pesa|mobile money)\b/)) {
        return getRandomResponse(responses.mobile);
    } else if (message.match(/\b(help|assist|support|guide)\b/)) {
        return getRandomResponse(responses.help);
    } else if (message.match(/\b(soc|dashboard|monitoring|operations center)\b/)) {
        return getRandomResponse(responses.soc);
    } else {
        return getRandomResponse(responses.default);
    }
}

/**
 * Enhanced Error Handling and Recovery
 */
function initializeErrorRecovery() {
    // Implement automatic retry for failed operations
    window.addEventListener('error', (event) => {
        const error = event.error;
        
        // Check if it's a network error
        if (error && error.message && error.message.includes('fetch')) {
            console.log('Network error detected, implementing retry logic');
            scheduleRetry(() => {
                // Retry the failed operation
                console.log('Retrying failed network operation');
            });
        }
    });
    
    // Monitor for memory leaks
    if (performance.memory) {
        setInterval(() => {
            const memoryInfo = performance.memory;
            const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
            
            if (memoryUsage > 0.9) {
                console.warn('High memory usage detected:', memoryUsage);
                // Implement memory cleanup
                performMemoryCleanup();
            }
        }, 30000); // Check every 30 seconds
    }
}

function scheduleRetry(operation, maxRetries = 3, delay = 1000) {
    let retryCount = 0;
    
    const retry = () => {
        if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
                try {
                    operation();
                } catch (error) {
                    console.error(`Retry ${retryCount} failed:`, error);
                    if (retryCount < maxRetries) {
                        retry();
                    }
                }
            }, delay * retryCount);
        }
    };
    
    retry();
}

function performMemoryCleanup() {
    // Clear old notifications
    if (appState.notifications.length > 50) {
        appState.notifications = appState.notifications.slice(0, 25);
        renderNotifications();
    }
    
    // Clear old analytics data
    if (AdvancedAnalytics.interactions.length > 100) {
        AdvancedAnalytics.sendBatch();
    }
    
    // Force garbage collection if available
    if (window.gc) {
        window.gc();
    }
    
    console.log('Memory cleanup performed');
}

/**
 * Final Initialization
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize core features
        initializeHomePage();
        
        // Initialize advanced features
        initializeAdvancedFeatures();
        
        // Initialize error recovery
        initializeErrorRecovery();
        
        // Initialize toast manager
        ToastManager.init();
        
        // Track page load
        Analytics.pageView();
        
        console.log('✅ Africa Shield Home Page fully initialized');
        
        // Show welcome message for first-time visitors
        if (!localStorage.getItem('first_visit_complete')) {
            setTimeout(() => {
                                ToastManager.show('Welcome to Africa Shield Cyber Centre! 🛡️', 'success', 3000);
                localStorage.setItem('first_visit_complete', 'true');
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Africa Shield:', error);
        logError('Initialization Error', error.message, error.stack);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Initialization Error</h4>
                    <p>We're experiencing technical difficulties. Please refresh the page or try again later.</p>
                    <hr>
                    <p class="mb-0">If the problem persists, contact our support team at <strong>soc@africashield.org</strong></p>
                </div>
            </div>
        `;
    }
});

/**
 * Helper Functions
 */
function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}

function formatNumber(num) {
    return Utils.formatNumber(num);
}

function updateAllCounters() {
    // Update hero section counters
    const heroElements = {
        'heroThreatsBlocked': appState.counters.threatsBlocked,
        'heroUsersProtected': appState.counters.usersProtected,
        'heroIncidentsResolved': appState.counters.incidentsResolved
    };
    
    Object.entries(heroElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            Utils.animateCounter(element, value);
        }
    });
    
    // Update widget counters
    const widgetElements = {
        'widgetThreatsBlocked': appState.counters.threatsBlocked,
        'widgetReportsReceived': appState.counters.reportsReceived,
        'widgetIncidentsResolved': appState.counters.incidentsResolved,
        'widgetUsersTrained': appState.counters.usersTrained
    };
    
    Object.entries(widgetElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatNumber(value);
        }
    });
    
    // Update live stats
    updateLiveStats();
}

function updateLiveStats() {
    const liveElements = {
        'liveThreatCount': appState.counters.threatsBlocked,
        'liveMonitoringCount': 14,
        'liveResponseTime': '2.3m'
    };
    
    Object.entries(liveElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = typeof value === 'number' ? formatNumber(value) : value;
        }
    });
    
    // Update SOC last update time
    const socLastUpdate = document.getElementById('socLastUpdate');
    if (socLastUpdate) {
        socLastUpdate.textContent = new Date().toLocaleTimeString();
    }
    
    // Update threat level timestamp
    const threatLevelUpdate = document.getElementById('threatLevelUpdate');
    if (threatLevelUpdate) {
        threatLevelUpdate.textContent = 'Just updated';
    }
}

/**
 * Export global functions for HTML onclick handlers
 */
window.toggleSOCWidget = toggleSOCWidget;
window.closeSocWidget = closeSocWidget;
window.toggleNotificationPanel = toggleNotificationPanel;
window.closeNotificationPanel = closeNotificationPanel;
window.markAllAsRead = markAllAsRead;
window.dismissNotification = dismissNotification;
window.submitQuickReport = submitQuickReport;
window.dismissSecurityAlert = dismissSecurityAlert;
window.acceptCookies = acceptCookies;
window.manageCookies = manageCookies;
window.installPWA = installPWA;
window.dismissPWA = dismissPWA;
window.viewAlertDetails = viewAlertDetails;
window.toggleAIAssistant = toggleAIAssistant;
window.closeAIAssistant = closeAIAssistant;

/**
 * Service Worker Communication
 */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
            case 'CACHE_UPDATED':
                ToastManager.show('App updated! Refresh to see new features.', 'info', 8000);
                break;
            case 'OFFLINE_READY':
                ToastManager.show('App is ready for offline use', 'success');
                break;
            case 'PUSH_NOTIFICATION':
                handlePushNotification(data);
                break;
        }
    });
}

function handlePushNotification(data) {
    const notification = {
        id: Date.now(),
        type: data.type || 'info',
        title: data.title || 'Africa Shield Alert',
        message: data.message,
        time: 'Just now',
        unread: true,
        priority: data.priority || 'normal'
    };
    
    appState.notifications.unshift(notification);
    renderNotifications();
    updateNotificationCount(appState.notifications.filter(n => n.unread).length);
    
    // Show toast for immediate attention
    ToastManager.show(data.message, data.type || 'info');
}

/**
 * Keyboard Shortcuts Help
 */
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'Alt + S', description: 'Open search' },
        { key: 'Alt + N', description: 'Open notifications' },
        { key: 'Alt + H', description: 'Open AI assistant' },
        { key: 'Alt + T', description: 'Toggle theme' },
        { key: 'Esc', description: 'Close modals/panels' },
        { key: 'Tab', description: 'Navigate between elements' },
        { key: 'Enter/Space', description: 'Activate buttons' }
    ];
    
    const shortcutsList = shortcuts.map(shortcut => 
        `<div class="d-flex justify-content-between mb-2">
            <kbd>${shortcut.key}</kbd>
            <span>${shortcut.description}</span>
        </div>`
    ).join('');
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-keyboard me-2"></i>
                        Keyboard Shortcuts
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${shortcutsList}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

/**
 * Debug Mode
 */
const DebugMode = {
    enabled: false,
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('debug_mode', this.enabled.toString());
        
        if (this.enabled) {
            this.addDebugPanel();
            console.log('🐛 Debug mode enabled');
        } else {
            this.removeDebugPanel();
            console.log('🐛 Debug mode disabled');
        }
    },
    
    addDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.className = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-header">
                <h6>Debug Panel</h6>
                <button onclick="DebugMode.toggle()" class="btn btn-sm btn-outline-light">×</button>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <strong>App State:</strong>
                    <pre id="debug-state"></pre>
                </div>
                <div class="debug-section">
                    <strong>Performance:</strong>
                    <div id="debug-performance"></div>
                </div>
                <div class="debug-section">
                    <strong>Actions:</strong>
                    <button onclick="DebugMode.exportLogs()" class="btn btn-sm btn-primary">Export Logs</button>
                    <button onclick="DebugMode.clearStorage()" class="btn btn-sm btn-warning">Clear Storage</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.updateDebugInfo();
        
        // Update debug info every 5 seconds
        this.debugInterval = setInterval(() => {
            this.updateDebugInfo();
        }, 5000);
    },
    
    removeDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            document.body.removeChild(panel);
        }
        
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
        }
    },
    
    updateDebugInfo() {
        const stateElement = document.getElementById('debug-state');
        const perfElement = document.getElementById('debug-performance');
        
        if (stateElement) {
            stateElement.textContent = JSON.stringify({
                theme: appState.currentTheme,
                language: appState.currentLanguage,
                online: appState.isOnline,
                notifications: appState.notifications.length
            }, null, 2);
        }
        
        if (perfElement) {
            const sessionStats = AdvancedAnalytics.getSessionStats();
            perfElement.innerHTML = `
                <div>Session: ${Math.round(sessionStats.duration / 1000)}s</div>
                <div>Interactions: ${sessionStats.interactions}</div>
                <div>Memory: ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}</div>
            `;
        }
    },
    
    exportLogs() {
        const logs = {
            timestamp: new Date().toISOString(),
            appState: appState,
            sessionStats: AdvancedAnalytics.getSessionStats(),
            localStorage: { ...localStorage },
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `africashield-debug-${Date.now()}.json`;
        link.click();
    },
    
    clearStorage() {
        if (confirm('Clear all stored data? This will reset all settings.')) {
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
        }
    }
};

// Enable debug mode with special key combination
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        DebugMode.toggle();
    }
});

// Check if debug mode was previously enabled
if (localStorage.getItem('debug_mode') === 'true') {
    DebugMode.enabled = true;
    setTimeout(() => DebugMode.addDebugPanel(), 1000);
}

/**
 * Final Export Statement
 */
console.log('🚀 Africa Shield Cyber Centre - Main JavaScript Module Loaded');
console.log('📊 Version:', AFRICA_SHIELD.version);
console.log('🌍 Protecting East Africa\'s Digital Future');

// Make debug mode globally accessible
window.DebugMode = DebugMode;
window.Utils = Utils;
window.Analytics = Analytics;
window.ToastManager = ToastManager;
window.API = API;

/**
 * End of main.js
 * 
 * This comprehensive JavaScript file provides:
 * - Complete home page functionality
 * - Real-time updates and WebSocket communication
 * - Advanced accessibility features
 * - Multi-language support
 * - AI assistant integration
 * - Security monitoring
 * - Performance optimization
 * - Error handling and recovery
 * - Debug capabilities
 * - Analytics and user tracking
 * - PWA features
 * - Voice commands
 * - Biometric authentication support
 * - Geolocation services
 * - Advanced notification system
 * - Theme and accessibility controls
 * - Data export/import functionality
 * 
 * The code is modular, well-documented, and follows modern JavaScript best practices
 * while maintaining compatibility with the Africa Shield Cyber Centre platform.
 */




