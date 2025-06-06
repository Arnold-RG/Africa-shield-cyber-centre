/**
 * Africa Shield Cyber Centre - Home Page JavaScript
 * Enhanced functionality for theme switching, font sizing, AI assistant, and more
 */

class AfricaShieldHome {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.currentContrast = localStorage.getItem('contrast') || 'normal';
        this.currentFontSize = localStorage.getItem('fontSize') || 'normal';
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        
        
        this.notifications = [];
        this.socData = {
            threatsBlocked: 0,
            usersProtected: 0,
            incidentsResolved: 0,
            activeThreats: 0,
            monitoringCount: 14,
            responseTime: '2.3m',
            systemHealth: '99.8%'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.applyStoredSettings();
        this.initializeCounters();
        this.startRealTimeUpdates();
        this.initializeSwiper();
        this.initializeAIAssistant();
        this.checkPWAInstall();
        this.initializeNotifications();
        this.setupIntersectionObserver();
        this.initializeSecurityAlerts();
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Contrast toggle
        const contrastToggle = document.getElementById('contrastToggle');
        if (contrastToggle) {
            contrastToggle.addEventListener('click', () => this.toggleContrast());
        }

        // Font size controls
        const increaseFontSize = document.getElementById('increaseFontSize');
        const decreaseFontSize = document.getElementById('decreaseFontSize');
        const resetFontSize = document.getElementById('resetFontSize');

        if (increaseFontSize) {
            increaseFontSize.addEventListener('click', () => this.changeFontSize('increase'));
        }
        if (decreaseFontSize) {
            decreaseFontSize.addEventListener('click', () => this.changeFontSize('decrease'));
        }
        if (resetFontSize) {
            resetFontSize.addEventListener('click', () => this.changeFontSize('reset'));
        }

        // Language selection
        const langLinks = document.querySelectorAll('.lang-link');
        langLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeLanguage(link.dataset.lang);
            });
        });

        // SOC status toggle
        const socStatusToggle = document.getElementById('socStatusToggle');
        if (socStatusToggle) {
            socStatusToggle.addEventListener('click', () => this.toggleSocWidget());
        }

        // Notification toggle
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) {
            notificationToggle.addEventListener('click', () => this.toggleNotificationPanel());
        }

        // Back to top button
        const backToTop = document.getElementById('backToTop');
        if (backToTop) {
            backToTop.addEventListener('click', () => this.scrollToTop());
        }

        // Scroll events
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });

        // Newsletter form
        const newsletterForm = document.getElementById('newsletterForm');
                if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => this.handleNewsletterSubmit(e));
        }

        // Quick report form
        const quickReportForm = document.getElementById('quickReportForm');
        if (quickReportForm) {
            quickReportForm.addEventListener('submit', (e) => this.handleQuickReportSubmit(e));
        }

        // Demo modal
        const demoModal = document.getElementById('demoModal');
        if (demoModal) {
            demoModal.addEventListener('show.bs.modal', () => this.loadDemoVideo());
            demoModal.addEventListener('hide.bs.modal', () => this.unloadDemoVideo());
        }

        // Cookie consent
        window.acceptCookies = () => this.acceptCookies();
        window.manageCookies = () => this.manageCookies();

        // PWA install
        window.installPWA = () => this.installPWA();
        window.dismissPWA = () => this.dismissPWA();

        // Widget close functions
        window.closeSocWidget = () => this.closeSocWidget();
        window.closeNotificationPanel = () => this.closeNotificationPanel();
        window.dismissSecurityAlert = () => this.dismissSecurityAlert();
        window.markAllAsRead = () => this.markAllNotificationsAsRead();

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

        // Resize events
        window.addEventListener('resize', () => this.handleResize());
    }

    applyStoredSettings() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();

        // Apply contrast
        document.documentElement.setAttribute('data-contrast', this.currentContrast);
        this.updateContrastIcon();

        // Apply font size
        document.documentElement.className = document.documentElement.className.replace(/font-size-\w+/g, '');
        document.documentElement.classList.add(`font-size-${this.currentFontSize}`);

        // Apply language
        document.documentElement.setAttribute('lang', this.currentLanguage);
        this.updateLanguageDisplay();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
        this.showToast(`Theme switched to ${this.currentTheme} mode`);
    }

    updateThemeIcon() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }
    }

    toggleContrast() {
        this.currentContrast = this.currentContrast === 'normal' ? 'high' : 'normal';
        document.documentElement.setAttribute('data-contrast', this.currentContrast);
        localStorage.setItem('contrast', this.currentContrast);
        this.updateContrastIcon();
        this.showToast(`${this.currentContrast === 'high' ? 'High' : 'Normal'} contrast enabled`);
    }

    updateContrastIcon() {
        const contrastToggle = document.getElementById('contrastToggle');
        if (contrastToggle) {
            const icon = contrastToggle.querySelector('i');
            if (icon) {
                icon.className = this.currentContrast === 'normal' ? 'fas fa-adjust' : 'fas fa-eye';
            }
        }
    }

    changeFontSize(action) {
        const sizes = ['small', 'normal', 'large', 'xl'];
        let currentIndex = sizes.indexOf(this.currentFontSize);

        switch (action) {
            case 'increase':
                currentIndex = Math.min(currentIndex + 1, sizes.length - 1);
                break;
            case 'decrease':
                currentIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'reset':
                currentIndex = 1; // normal
                break;
        }

        this.currentFontSize = sizes[currentIndex];
        document.documentElement.className = document.documentElement.className.replace(/font-size-\w+/g, '');
        document.documentElement.classList.add(`font-size-${this.currentFontSize}`);
        localStorage.setItem('fontSize', this.currentFontSize);
        this.showToast(`Font size: ${this.currentFontSize}`);
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        document.documentElement.setAttribute('lang', lang);
        localStorage.setItem('language', lang);
        this.updateLanguageDisplay();
        this.loadLanguageContent(lang);
        this.showToast(`Language changed to ${this.getLanguageName(lang)}`);
    }

    updateLanguageDisplay() {
        const currentLangElement = document.getElementById('currentLang');
        if (currentLangElement) {
            currentLangElement.textContent = this.currentLanguage.toUpperCase();
        }
    }

    getLanguageName(lang) {
        const names = {
            'en': 'English',
            'fr': 'Français',
            'sw': 'Kiswahili',
            'rw': 'Kinyarwanda'
        };
        return names[lang] || 'English';
    }

    loadLanguageContent(lang) {
        // In a real implementation, this would load content from a translation service
        // For now, we'll just update some key elements
        const translations = {
            'en': {
                'hero-title': 'Securing East Africa\'s Digital Future',
                'hero-subtitle': 'Advanced AI-powered cybersecurity platform providing real-time threat detection, comprehensive training, and community-driven protection for over 400 million people across East Africa.'
            },
            'fr': {
                'hero-title': 'Sécuriser l\'Avenir Numérique de l\'Afrique de l\'Est',
                'hero-subtitle': 'Plateforme de cybersécurité avancée alimentée par l\'IA offrant une détection de menaces en temps réel, une formation complète et une protection communautaire pour plus de 400 millions de personnes en Afrique de l\'Est.'
            },
            'sw': {
                'hero-title': 'Kulinda Mustakabali wa Kidijitali wa Afrika Mashariki',
                'hero-subtitle': 'Jukwaa la hali ya juu la usalama wa mtandao linaloendeshwa na AI linaloongoza kutambua vitisho vya wakati halisi, mafunzo makamilifu, na ulinzi unaongozwa na jamii kwa watu zaidi ya milioni 400 kote Afrika Mashariki.'
            },
            'rw': {
                'hero-title': 'Kurinda Ejo hazaza bw\'Ikoranabuhanga mu Burasirazuba bw\'Afurika',
                'hero-subtitle': 'Urubuga rw\'umutekano wa tekinoroji rwihuse rushingiye kuri AI rutanga gukumira iterabwoba mu gihe nyacyo, amahugurwa yuzuye, n\'uburinzi bushingiye ku muryango ku bantu barenga miliyoni 400 mu Burasirazuba bw\'Afurika.'
            }
        };

        if (translations[lang]) {
            Object.keys(translations[lang]).forEach(key => {
                const element = document.querySelector(`[data-translate="${key}"]`);
                if (element) {
                    element.textContent = translations[lang][key];
                }
            });
        }
    }

    initializeCounters() {
        const counters = document.querySelectorAll('[data-target]');
        counters.forEach(counter => {
            this.animateCounter(counter);
        });

        // Initialize hero stats
        this.updateHeroStats();
    }

    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = this.formatNumber(Math.floor(current));
        }, 16);
    }

    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    updateHeroStats() {
        const heroThreatsBlocked = document.getElementById('heroThreatsBlocked');
        const heroUsersProtected = document.getElementById('heroUsersProtected');
        const heroIncidentsResolved = document.getElementById('heroIncidentsResolved');

        if (heroThreatsBlocked) {
            this.animateCounter(heroThreatsBlocked);
        }
        if (heroUsersProtected) {
            this.animateCounter(heroUsersProtected);
        }
        if (heroIncidentsResolved) {
            this.animateCounter(heroIncidentsResolved);
        }
    }

    startRealTimeUpdates() {
        // Update SOC data every 30 seconds
        setInterval(() => {
            this.updateSOCData();
        }, 30000);

        // Update threat level every 5 minutes
        setInterval(() => {
            this.updateThreatLevel();
        }, 300000);

        // Update last update timestamp every minute
        setInterval(() => {
            this.updateTimestamps();
        }, 60000);

        // Initial updates
        this.updateSOCData();
        this.updateThreatLevel();
        this.updateTimestamps();
    }

    updateSOCData() {
        // Simulate real-time data updates
        this.socData.threatsBlocked += Math.floor(Math.random() * 10) + 1;
        this.socData.usersProtected += Math.floor(Math.random() * 100) + 50;
        this.socData.incidentsResolved += Math.floor(Math.random() * 3);
        this.socData.activeThreats = Math.floor(Math.random() * 15) + 5;

        // Update UI elements
        this.updateSOCElements();
    }

    updateSOCElements() {
        const elements = {
            'liveThreatCount': this.socData.threatsBlocked,
            'liveMonitoringCount': this.socData.monitoringCount,
            'liveResponseTime': this.socData.responseTime,
            'socThreatsBlocked': this.socData.threatsBlocked,
            'socActiveMonitoring': this.socData.monitoringCount,
            'socResponseTime': this.socData.responseTime,
            'socSystemHealth': this.socData.systemHealth,
            'previewActiveThreats': this.socData.activeThreats,
            'widgetThreatsBlocked': this.socData.threatsBlocked,
            'widgetIncidentsResolved': this.socData.incidentsResolved
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
    }

    updateThreatLevel() {
        const levels = ['low', 'medium', 'high'];
        const currentLevel = levels[Math.floor(Math.random() * levels.length)];
        
        const threatLevelFill = document.querySelector('.threat-level-fill');
        if (threatLevelFill) {
            threatLevelFill.setAttribute('data-level', currentLevel);
        }

        const threatLevelStatus = document.querySelector('.threat-level-status');
        if (threatLevelStatus) {
            threatLevelStatus.textContent = currentLevel.toUpperCase();
        }

        const descriptions = {
            'low': 'Normal threat activity. Standard security protocols in effect.',
            'medium': 'Elevated threat activity detected. Maintain standard security protocols.',
            'high': 'High threat activity. Enhanced security measures recommended.'
        };

        const threatLevelDescription = document.querySelector('.threat-level-description');
        if (threatLevelDescription) {
            threatLevelDescription.textContent = descriptions[currentLevel];
        }
    }

    updateTimestamps() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const socLastUpdate = document.getElementById('socLastUpdate');
        if (socLastUpdate) {
            socLastUpdate.textContent = timeString;
        }

        const threatLevelUpdate = document.getElementById('threatLevelUpdate');
        if (threatLevelUpdate) {
            const minutesAgo = Math.floor(Math.random() * 10) + 1;
            threatLevelUpdate.textContent = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
        }
    }

    toggleSocWidget() {
        const widget = document.getElementById('socStatusWidget');
        if (widget) {
            widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
            setTimeout(() => {
                widget.classList.toggle('show');
            }, 10);
        }
    }

    closeSocWidget() {
        const widget = document.getElementById('socStatusWidget');
        if (widget) {
            widget.classList.remove('show');
            setTimeout(() => {
                widget.style.display = 'none';
            }, 300);
        }
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            setTimeout(() => {
                panel.classList.toggle('show');
            }, 10);
        }
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.remove('show');
            setTimeout(() => {
                panel.style.display = 'none';
            }, 300);
        }
    }

    initializeNotifications() {
        // Simulate some notifications
        this.notifications = [
            {
                id: 1,
                type: 'security',
                title: 'Security Alert',
                message: 'New phishing campaign detected targeting mobile banking apps',
                time: '5 minutes ago',
                read: false
            },
            {
                id: 2,
                type: 'update',
                title: 'System Update',
                message: 'SOC monitoring capabilities expanded to include new threat vectors',
                time: '1 hour ago',
                read: false
            },
            {
                id: 3,
                type: 'training',
                                title: 'Training Available',
                message: 'New cybersecurity course: "Mobile Money Security" now available',
                time: '2 hours ago',
                read: true
            }
        ];

        this.updateNotificationUI();
        this.checkForSecurityAlerts();
    }

    updateNotificationUI() {
        const notificationCount = document.getElementById('notificationCount');
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (notificationCount) {
            if (unreadCount > 0) {
                notificationCount.textContent = unreadCount;
                notificationCount.style.display = 'inline';
            } else {
                notificationCount.style.display = 'none';
            }
        }

        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            notificationList.innerHTML = this.notifications.map(notification => `
                <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
                    <div class="notification-icon">
                        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${notification.time}</div>
                    </div>
                    ${!notification.read ? '<div class="notification-indicator"></div>' : ''}
                </div>
            `).join('');
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'security': 'fa-shield-alt',
            'update': 'fa-sync-alt',
            'training': 'fa-graduation-cap',
            'alert': 'fa-exclamation-triangle'
        };
        return icons[type] || 'fa-bell';
    }

    markAllNotificationsAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.updateNotificationUI();
        this.showToast('All notifications marked as read');
    }

    checkForSecurityAlerts() {
        // Check for high-priority security alerts
        const securityAlerts = this.notifications.filter(n => 
            n.type === 'security' && !n.read
        );

        if (securityAlerts.length > 0) {
            this.showSecurityAlert(securityAlerts[0]);
        }
    }

    showSecurityAlert(alert) {
        const banner = document.getElementById('securityAlertBanner');
        const message = document.getElementById('securityAlertMessage');
        
        if (banner && message) {
            message.textContent = alert.message;
            banner.style.display = 'block';
            setTimeout(() => {
                banner.classList.add('show');
            }, 100);
        }
    }

    dismissSecurityAlert() {
        const banner = document.getElementById('securityAlertBanner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }
    }

    initializeSwiper() {
        // Initialize success stories swiper
        if (document.querySelector('.successStoriesSwiper')) {
            new Swiper('.successStoriesSwiper', {
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
                }
            });
        }
    }

    initializeAIAssistant() {
        const aiBtn = document.getElementById('aiAssistantBtn');
        const aiChat = document.getElementById('aiAssistantChat');
        const closeBtn = document.getElementById('closeAiAssistant');
        const chatForm = document.getElementById('aiChatForm');

        if (aiBtn && aiChat) {
            aiBtn.addEventListener('click', () => {
                aiChat.style.display = 'flex';
                setTimeout(() => {
                    aiChat.classList.add('show');
                }, 10);
            });
        }

        if (closeBtn && aiChat) {
            closeBtn.addEventListener('click', () => {
                aiChat.classList.remove('show');
                setTimeout(() => {
                    aiChat.style.display = 'none';
                }, 300);
            });
        }

        if (chatForm) {
            chatForm.addEventListener('submit', (e) => this.handleAIChat(e));
        }
    }

    handleAIChat(e) {
        e.preventDefault();
        const input = document.getElementById('aiUserInput');
        const chatBody = document.getElementById('aiChatBody');
        
        if (input && chatBody && input.value.trim()) {
            const userMessage = input.value.trim();
            
            // Add user message
            this.addChatMessage(chatBody, userMessage, 'user');
            
            // Clear input
            input.value = '';
            
            // Simulate AI response
            setTimeout(() => {
                const response = this.generateAIResponse(userMessage);
                this.addChatMessage(chatBody, response, 'assistant');
            }, 1000);
        }
    }

    addChatMessage(chatBody, message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${sender}`;
        
        const avatar = document.createElement('span');
        avatar.className = 'ai-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const bubble = document.createElement('div');
        bubble.className = 'ai-bubble';
        bubble.textContent = message;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        chatBody.appendChild(messageDiv);
        
        // Scroll to bottom
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    generateAIResponse(userMessage) {
        const responses = {
            'hello': 'Hello! I\'m here to help you with cybersecurity questions and guidance.',
            'help': 'I can assist you with threat reporting, security best practices, training resources, and general cybersecurity questions.',
            'threat': 'If you\'ve encountered a security threat, please use our threat reporting system or call our emergency hotline at *789*911#.',
            'training': 'We offer comprehensive cybersecurity training in multiple languages. Visit our Learn section to get started.',
            'mobile': 'For mobile security, always keep your apps updated, use strong PINs, and be cautious of suspicious messages.',
            'default': 'I understand you\'re asking about cybersecurity. Could you be more specific about what you need help with?'
        };

        const lowerMessage = userMessage.toLowerCase();
        
        for (const [key, response] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return response;
            }
        }
        
        return responses.default;
    }

    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const backToTop = document.getElementById('backToTop');
        
        // Show/hide back to top button
        if (backToTop) {
            if (scrollTop > 300) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        }

        // Update scroll indicator
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator && scrollTop > 100) {
            scrollIndicator.style.opacity = '0';
        } else if (scrollIndicator) {
            scrollIndicator.style.opacity = '1';
        }
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animateElements = document.querySelectorAll('.feature-card, .impact-card, .story-card, .news-card');
        animateElements.forEach(el => observer.observe(el));
    }

    checkPWAInstall() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showPWAPrompt();
        });

        window.installPWA = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.showToast('App installed successfully!');
                }
                deferredPrompt = null;
                this.dismissPWA();
            }
        };
    }

    showPWAPrompt() {
        const prompt = document.getElementById('pwaInstallPrompt');
        if (prompt) {
            prompt.style.display = 'block';
            setTimeout(() => {
                prompt.classList.add('show');
            }, 1000);
        }
    }

    dismissPWA() {
        const prompt = document.getElementById('pwaInstallPrompt');
        if (prompt) {
            prompt.classList.remove('show');
            setTimeout(() => {
                prompt.style.display = 'none';
            }, 300);
        }
    }

    handleNewsletterSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        
        // Simulate API call
        this.showToast('Subscribing to security alerts...');
        
        setTimeout(() => {
            this.showToast('Successfully subscribed to security alerts!');
            form.reset();
        }, 2000);
    }

    handleQuickReportSubmit(e) {
        e.preventDefault();
        const form = document.getElementById('quickReportForm');
        
        // Simulate report submission
        this.showToast('Submitting threat report...');
        
        setTimeout(() => {
            this.showToast('Threat report submitted successfully!');
            form.reset();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickReportModal'));
            if (modal) {
                modal.hide();
            }
        }, 2000);
    }

    loadDemoVideo() {
        const video = document.getElementById('demoVideo');
        if (video) {
            video.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
        }
    }

    unloadDemoVideo() {
        const video = document.getElementById('demoVideo');
        if (video) {
            video.src = '';
        }
    }

    acceptCookies() {
        localStorage.setItem('cookiesAccepted', 'true');
        const banner = document.getElementById('cookieConsent');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }
        this.showToast('Cookie preferences saved');
    }

    manageCookies() {
        // In a real implementation, this would open a cookie management interface
        this.showToast('Cookie management interface would open here');
    }

    handleKeyboardNavigation(e) {
        // ESC key closes modals and panels
        if (e.key === 'Escape') {
            this.closeNotificationPanel();
            this.closeSocWidget();
            
            const aiChat = document.getElementById('aiAssistantChat');
            if (aiChat && aiChat.classList.contains('show')) {
                document.getElementById('closeAiAssistant').click();
            }
        }
        
        // Ctrl+K opens AI assistant
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.getElementById('aiAssistantBtn').click();
        }
    }

    handleResize() {
        // Handle responsive adjustments
        const width = window.innerWidth;
        
        if (width < 768) {
            // Mobile adjustments
            this.adjustMobileLayout();
        } else {
            // Desktop adjustments
            this.adjustDesktopLayout();
        }
    }

    adjustMobileLayout() {
        const socWidget = document.getElementById('socStatusWidget');
        const notificationPanel = document.getElementById('notificationPanel');
        
        if (socWidget) {
            socWidget.style.width = '100%';
        }
        
        if (notificationPanel) {
            notificationPanel.style.width = '100%';
        }
    }

    adjustDesktopLayout() {
        const socWidget = document.getElementById('socStatusWidget');
        const notificationPanel = document.getElementById('notificationPanel');
        
        if (socWidget) {
            socWidget.style.width = '350px';
        }
        
        if (notificationPanel) {
            notificationPanel.style.width = '400px';
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this.getToastIcon(type)} me-2"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-times-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    initializeSecurityAlerts() {
        // Check for security alerts on page load
        if (!localStorage.getItem('securityAlertsChecked')) {
            setTimeout(() => {
                                this.checkSecurityStatus();
                localStorage.setItem('securityAlertsChecked', Date.now().toString());
            }, 3000);
        }
    }

    checkSecurityStatus() {
        // Simulate security status check
        const threatLevels = ['low', 'medium', 'high'];
        const currentThreat = threatLevels[Math.floor(Math.random() * threatLevels.length)];
        
        if (currentThreat === 'high') {
            this.showSecurityAlert({
                message: 'High threat activity detected in your region. Please review security recommendations.',
                type: 'warning'
            });
        }
    }

    // Performance monitoring
    measurePerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                    
                    if (loadTime > 3000) {
                        console.warn('Page load time is slow:', loadTime + 'ms');
                    }
                    
                    // Send performance data to analytics (in real implementation)
                    this.sendAnalytics('page_load_time', loadTime);
                }, 0);
            });
        }
    }

    sendAnalytics(event, value) {
        // In a real implementation, this would send data to analytics service
        if (typeof gtag !== 'undefined') {
            gtag('event', event, {
                'custom_parameter': value
            });
        }
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        // In production, send error to monitoring service
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error, {
                tags: {
                    context: context
                }
            });
        }
        
        // Show user-friendly error message
        this.showToast('An error occurred. Please try again.', 'error');
    }

    // Cleanup and destroy
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        
        // Clear intervals
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Clear timeouts
        if (this.timeouts) {
            this.timeouts.forEach(timeout => clearTimeout(timeout));
        }
    }
}

// Utility functions
function submitQuickReport() {
    const form = document.getElementById('quickReportForm');
    if (form) {
        const formData = new FormData(form);
        const reportData = {
            type: formData.get('quickThreatType') || document.getElementById('quickThreatType').value,
            description: formData.get('quickDescription') || document.getElementById('quickDescription').value,
            urgency: formData.get('quickUrgency') || document.getElementById('quickUrgency').value,
            contact: formData.get('quickContact') || document.getElementById('quickContact').value
        };
        
        // Validate required fields
        if (!reportData.type || !reportData.description || !reportData.urgency || !reportData.contact) {
            africaShield.showToast('Please fill in all required fields', 'warning');
            return;
        }
        
        // Submit report
        africaShield.showToast('Submitting threat report...', 'info');
        
        // Simulate API call
        setTimeout(() => {
            africaShield.showToast('Threat report submitted successfully!', 'success');
            form.reset();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickReportModal'));
            if (modal) {
                modal.hide();
            }
        }, 2000);
    }
}

// Additional utility functions for global access
window.submitQuickReport = submitQuickReport;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.africaShield = new AfricaShieldHome();
        
        // Show cookie consent if not already accepted
        if (!localStorage.getItem('cookiesAccepted')) {
            setTimeout(() => {
                const cookieConsent = document.getElementById('cookieConsent');
                if (cookieConsent) {
                    cookieConsent.style.display = 'block';
                    setTimeout(() => {
                        cookieConsent.classList.add('show');
                    }, 1000);
                }
            }, 2000);
        }
        
        // Initialize performance monitoring
        window.africaShield.measurePerformance();
        
    } catch (error) {
        console.error('Failed to initialize Africa Shield Home:', error);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause updates
        if (window.africaShield && window.africaShield.updateInterval) {
            clearInterval(window.africaShield.updateInterval);
        }
    } else {
        // Page is visible, resume updates
        if (window.africaShield) {
            window.africaShield.startRealTimeUpdates();
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.africaShield) {
        window.africaShield.showToast('Connection restored', 'success');
        window.africaShield.startRealTimeUpdates();
    }
});

window.addEventListener('offline', () => {
    if (window.africaShield) {
        window.africaShield.showToast('Connection lost. Some features may be limited.', 'warning');
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AfricaShieldHome;
}
