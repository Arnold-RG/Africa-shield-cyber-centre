// Dashboard JavaScript Functions
class AfricaShieldDashboard {
    constructor() {
        this.charts = {};
        this.map = null;
        this.notifications = [];
        this.currentUser = null;
        this.websocket = null;
        this.init();
    }

    init() {
        this.initializeEventListeners();
        this.loadUserData();
        this.initializeWebSocket();
        this.startPerformanceMonitoring();
    }

    initializeEventListeners() {
        // Navigation events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                this.switchSection(e.target.getAttribute('data-section'));
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#reportForm')) {e.preventDefault();                this.handleReportSubmission(e.target);
            } else if (e.target.matches('#eventForm')) {
                e.preventDefault();
                this.handleEventSubmission(e.target);
            } else if (e.target.matches('#jobForm')) {
                e.preventDefault();
                this.handleJobSubmission(e.target);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.performSearch(e.target.value);
            }, 300));
        }

        // Filter changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('.filter-select')) {
                this.applyFilters();
            }
        });

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Font size controls
        this.initializeFontControls();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Visibility change (for pausing updates when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    loadUserData() {
        // Load user preferences from localStorage
        const savedTheme = localStorage.getItem('dashboard-theme');
        if (savedTheme) {
            document.body.classList.toggle('dark-theme', savedTheme === 'dark');
        }

        const savedFontSize = localStorage.getItem('dashboard-font-size');
        if (savedFontSize) {
            document.body.style.fontSize = savedFontSize + 'px';
        }

        // Load user profile
        this.currentUser = this.getCurrentUser();
        this.updateUserInterface();
    }

    getCurrentUser() {
        // This would typically come from your authentication system
        return {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@africashield.org',
            role: 'admin',
            country: 'Kenya',
            avatar: '../assets/images/avatars/default.png',
            preferences: {
                notifications: true,
                emailAlerts: true,
                language: 'en'
            }
        };
    }

    updateUserInterface() {
        if (this.currentUser) {
            const userNameElement = document.getElementById('userName');
            const userAvatarElement = document.getElementById('userAvatar');
            
            if (userNameElement) {
                userNameElement.textContent = this.currentUser.name;
            }
            
            if (userAvatarElement) {
                userAvatarElement.src = this.currentUser.avatar;
                userAvatarElement.alt = this.currentUser.name;
            }
        }
    }

    initializeWebSocket() {
        // Initialize WebSocket connection for real-time updates
        if ('WebSocket' in window) {
            try {
                this.websocket = new WebSocket('wss://api.africashield.org/ws/dashboard');
                
                this.websocket.onopen = () => {
                    console.log('WebSocket connection established');
                    this.sendWebSocketMessage({
                        type: 'subscribe',
                        channels: ['threats', 'reports', 'analytics']
                    });
                };

                this.websocket.onmessage = (event) => {
                    this.handleWebSocketMessage(JSON.parse(event.data));
                };

                this.websocket.onclose = () => {
                    console.log('WebSocket connection closed');
                    // Attempt to reconnect after 5 seconds
                    setTimeout(() => {
                        this.initializeWebSocket();
                    }, 5000);
                };

                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
            }
        }
    }

    sendWebSocketMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'threat_update':
                this.updateThreatData(data.payload);
                break;
            case 'new_report':
                this.addNewReport(data.payload);
                break;
            case 'analytics_update':
                this.updateAnalytics(data.payload);
                break;
            case 'notification':
                this.showNotification(data.payload);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    switchSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName + '-section');
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Load section-specific data
            this.loadSectionData(sectionName);
            
            // Update URL without page reload
            history.pushState({ section: sectionName }, '', `#${sectionName}`);
        }
    }

    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'reports':
                this.loadReportsData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
            case 'events':
                this.loadEventsData();
                break;
            case 'jobs':
                this.loadJobsData();
                break;
            case 'learning':
                this.loadLearningData();
                break;
            default:
                console.log('Unknown section:', sectionName);
        }
    }

    async loadOverviewData() {
        try {
            this.showLoadingSpinner('overview-content');
            
            const [statsData, countriesData, recentReports] = await Promise.all([
                this.fetchData('/api/dashboard/stats'),
                this.fetchData('/api/dashboard/countries'),
                this.fetchData('/api/dashboard/recent-reports')
            ]);

            this.updateStatsCards(statsData);
            this.updateCountriesTable(countriesData);
            this.updateRecentReports(recentReports);
            this.initializeOverviewCharts();
            
            this.hideLoadingSpinner('overview-content');
        } catch (error) {
            console.error('Error loading overview data:', error);
            this.showError('Failed to load overview data');
        }
    }

    async loadReportsData() {
        try {
            this.showLoadingSpinner('reports-content');
            
            const reportsData = await this.fetchData('/api/dashboard/reports');
            this.updateReportsTable(reportsData);
            this.initializeReportsCharts();
            
            this.hideLoadingSpinner('reports-content');
        } catch (error) {
            console.error('Error loading reports data:', error);
            this.showError('Failed to load reports data');
        }
    }

    async loadAnalyticsData() {
        try {
            this.showLoadingSpinner('analytics-content');
            
            const analyticsData = await this.fetchData('/api/dashboard/analytics');
            this.updateAnalyticsCharts(analyticsData);
            this.updateAnalyticsTable(analyticsData);
            
            this.hideLoadingSpinner('analytics-content');
        } catch (error) {
            console.error('Error loading analytics data:', error);
            this.showError('Failed to load analytics data');
        }
    }

    async loadEventsData() {
        try {
            this.showLoadingSpinner('events-content');
            
            const eventsData = await this.fetchData('/api/dashboard/events');
            this.updateEventsCalendar(eventsData);
            this.initializeEventsCharts();
            
            this.hideLoadingSpinner('events-content');
        } catch (error) {
            console.error('Error loading events data:', error);
            this.showError('Failed to load events data');
        }
    }

    async loadJobsData() {
        try {
            this.showLoadingSpinner('jobs-content');
            
            const jobsData = await this.fetchData('/api/dashboard/jobs');
            this.updateJobsList(jobsData);
            this.updateJobsStats(jobsData);
            
            this.hideLoadingSpinner('jobs-content');
        } catch (error) {
            console.error('Error loading jobs data:', error);
            this.showError('Failed to load jobs data');
        }
    }

    async loadLearningData() {
        try {
            this.showLoadingSpinner('learning-content');
            
            const learningData = await this.fetchData('/api/dashboard/learning');
            this.updateCoursesProgress(learningData.courses);
            this.updateLearningStats(learningData.stats);
            
            this.hideLoadingSpinner('learning-content');
        } catch (error) {
            console.error('Error loading learning data:', error);
            this.showError('Failed to load learning data');
        }
    }

    async fetchData(endpoint) {
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    getAuthToken() {
        // Return the authentication token from localStorage or sessionStorage
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }

    handleReportSubmission(form) {
        const formData = new FormData(form);
        const reportData = Object.fromEntries(formData);

        this.submitReport(reportData)
            .then(response => {
                this.showSuccess('Report submitted successfully!');
                form.reset();
                this.closeModal('reportModal');
                this.loadReportsData(); // Refresh reports data
            })
            .catch(error => {
                console.error('Error submitting report:', error);
                this.showError('Failed to submit report. Please try again.');
            });
    }

    handleEventSubmission(form) {
        const formData = new FormData(form);
        const eventData = Object.fromEntries(formData);

        this.submitEvent(eventData)
            .then(response => {
                this.showSuccess('Event created successfully!');
                form.reset();
                this.closeModal('eventModal');
                this.loadEventsData(); // Refresh events data
            })
            .catch(error => {
                console.error('Error creating event:', error);
                this.showError('Failed to create event. Please try again.');
            });
    }

    handleJobSubmission(form) {
        const formData = new FormData(form);
        const jobData = Object.fromEntries(formData);

        this.submitJob(jobData)
            .then(response => {
                this.showSuccess('Job posted successfully!');
                form.reset();
                this.closeModal('jobModal');
                this.loadJobsData(); // Refresh jobs data
            })
            .catch(error => {
                console.error('Error posting job:', error);
                this.showError('Failed to post job. Please try again.');
            });
    }

    async submitReport(reportData) {
        return await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });
    }

    async submitEvent(eventData) {
        return await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
    }

    async submitJob(jobData) {
        return await fetch('/api/jobs', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jobData)
        });
    }

    performSearch(query) {
        if (query.length < 2) {
            this.clearSearchResults();
            return;
        }

        // Perform search across different data types
        const searchResults = {
            reports: this.searchReports(query),
            events: this.searchEvents(query),
            jobs: this.searchJobs(query),
            countries: this.searchCountries(query)
        };

        this.displaySearchResults(searchResults);
    }

    searchReports(query) {
        // Implement report search logic
        return [];
    }

    searchEvents(query) {
        // Implement event search logic
        return [];
    }

    searchJobs(query) {
        // Implement job search logic
        return [];
    }

    searchCountries(query) {
        // Implement country search logic
        return [];
    }

    displaySearchResults(results) {
        const searchResultsContainer = document.getElementById('searchResults');
        if (searchResultsContainer) {
            // Display search results
            searchResultsContainer.innerHTML = this.generateSearchResultsHTML(results);
            searchResultsContainer.style.display = 'block';
        }
    }

    clearSearchResults() {
        const searchResultsContainer = document.getElementById('searchResults');
        if (searchResultsContainer) {
            searchResultsContainer.style.display = 'none';
        }
    }

    applyFilters() {
        const filters = {
            country: document.getElementById('countryFilter')?.value,
            status: document.getElementById('statusFilter')?.value,
            priority: document.getElementById('priorityFilter')?.value,
            dateRange: document.getElementById('dateFilter')?.value
        };

        // Apply filters to current data
        this.filterData(filters);
    }

    filterData(filters) {
        // Implement filtering logic based on current section
        const currentSection = this.getCurrentSection();
        
        switch (currentSection) {
            case 'reports':
                this.filterReports(filters);
                break;
            case 'events':
                this.filterEvents(filters);
                break;
            case 'jobs':
                this.filterJobs(filters);
                break;
            default:
                console.log('Filtering not implemented for section:', currentSection);
        }
    }

    getCurrentSection() {
        const activeLink = document.querySelector('.nav-link.active');
        return activeLink ? activeLink.getAttribute('data-section') : 'overview';
    }

    filterReports(filters) {
        // Filter reports based on criteria
        const reportRows = document.querySelectorAll('#reportsTable tbody tr');
        
        reportRows.forEach(row => {
            let shouldShow = true;
            
            if (filters.country && filters.country !== 'all') {
                const countryCell = row.querySelector('.country-cell');
                if (countryCell && countryCell.textContent.trim() !== filters.country) {
                    shouldShow = false;
                }
            }
            
            if (filters.status && filters.status !== 'all') {
                const statusCell = row.querySelector('.status-cell');
                if (statusCell && !statusCell.textContent.toLowerCase().includes(filters.status.toLowerCase())) {
                    shouldShow = false;
                }
            }
            
            if (filters.priority && filters.priority !== 'all') {
                const priorityCell = row.querySelector('.priority-cell');
                if (priorityCell && !priorityCell.textContent.toLowerCase().includes(filters.priority.toLowerCase())) {
                    shouldShow = false;
                }
            }
            
            row.style.display = shouldShow ? '' : 'none';
        });
        
        this.updateFilteredCount('reports');
    }

    filterEvents(filters) {
        // Filter events based on criteria
        const eventCards = document.querySelectorAll('.event-card');
        
        eventCards.forEach(card => {
            let shouldShow = true;
            
            if (filters.country && filters.country !== 'all') {
                const countryData = card.getAttribute('data-country');
                if (countryData !== filters.country) {
                    shouldShow = false;
                }
            }
            
            if (filters.dateRange && filters.dateRange !== 'all') {
                const eventDate = new Date(card.getAttribute('data-date'));
                const now = new Date();
                
                switch (filters.dateRange) {
                    case 'today':
                        shouldShow = this.isSameDay(eventDate, now);
                        break;
                    case 'week':
                        shouldShow = this.isWithinDays(eventDate, now, 7);
                        break;
                    case 'month':
                        shouldShow = this.isWithinDays(eventDate, now, 30);
                        break;
                }
            }
            
            card.style.display = shouldShow ? '' : 'none';
        });
        
        this.updateFilteredCount('events');
    }

    filterJobs(filters) {
        // Filter jobs based on criteria
        const jobCards = document.querySelectorAll('.job-card');
        
        jobCards.forEach(card => {
            let shouldShow = true;
            
            if (filters.country && filters.country !== 'all') {
                const location = card.querySelector('.job-location');
                if (location && !location.textContent.includes(filters.country)) {
                    shouldShow = false;
                }
            }
            
            card.style.display = shouldShow ? '' : 'none';
        });
        
        this.updateFilteredCount('jobs');
    }

    updateFilteredCount(type) {
        const visibleItems = document.querySelectorAll(`#${type}Table tbody tr:not([style*="display: none"]), .${type.slice(0, -1)}-card:not([style*="display: none"])`).length;
        const totalItems = document.querySelectorAll(`#${type}Table tbody tr, .${type.slice(0, -1)}-card`).length;
        
        const countElement = document.getElementById(`${type}Count`);
        if (countElement) {
            countElement.textContent = `Showing ${visibleItems} of ${totalItems} ${type}`;
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Save theme preference
        localStorage.setItem('dashboard-theme', isDark ? 'dark' : 'light');
        
        // Update charts colors if they exist
        this.updateChartsTheme(isDark);
    }

    updateChartsTheme(isDark) {
        const textColor = isDark ? '#ffffff' : '#666666';
        const gridColor = isDark ? '#404040' : '#e0e0e0';
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                // Update chart colors
                chart.options.plugins.legend.labels.color = textColor;
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.y.grid.color = gridColor;
                chart.update();
            }
        });
    }

    initializeFontControls() {
        const increaseFontBtn = document.getElementById('increaseFontSize');
        const decreaseFontBtn = document.getElementById('decreaseFontSize');
        const resetFontBtn = document.getElementById('resetFontSize');
        
        let currentFontSize = parseInt(getComputedStyle(document.body).fontSize) || 16;
        
        if (increaseFontBtn) {
            increaseFontBtn.addEventListener('click', () => {
                currentFontSize = Math.min(currentFontSize + 2, 24);
                this.updateFontSize(currentFontSize);
            });
        }
        
        if (decreaseFontBtn) {
            decreaseFontBtn.addEventListener('click', () => {
                currentFontSize = Math.max(currentFontSize - 2, 12);
                this.updateFontSize(currentFontSize);
            });
        }
        
        if (resetFontBtn) {
            resetFontBtn.addEventListener('click', () => {
                currentFontSize = 16;
                this.updateFontSize(currentFontSize);
            });
        }
    }

    updateFontSize(size) {
        document.body.style.fontSize = size + 'px';
        localStorage.setItem('dashboard-font-size', size);
        
        // Update charts to accommodate new font size
        setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.resize) {
                    chart.resize();
                }
            });
        }, 100);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                const modal = bootstrap.Modal.getInstance(openModal);
                if (modal) {
                    modal.hide();
                }
            }
        }
        
        // Number keys for quick navigation
        if (e.altKey && e.key >= '1' && e.key <= '6') {
            e.preventDefault();
            const sections = ['overview', 'reports', 'analytics', 'events', 'jobs', 'learning'];
            const sectionIndex = parseInt(e.key) - 1;
            if (sections[sectionIndex]) {
                this.switchSection(sections[sectionIndex]);
            }
        }
    }

    handleResize() {
        // Resize charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
        
        // Resize map
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause updates
            this.pauseUpdates();
        } else {
            // Page is visible, resume updates
            this.resumeUpdates();
        }
    }

    pauseUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    resumeUpdates() {
        this.startLiveUpdates();
    }

    startLiveUpdates() {
        // Update live statistics every 30 seconds
        this.updateInterval = setInterval(() => {
            this.updateLiveStats();
        }, 30000);
    }

    updateLiveStats() {
        // Update live statistics
        const activeUsersElement = document.getElementById('activeUsers');
        const threatsBlockedElement = document.getElementById('threatsBlocked');
        const reportsTodayElement = document.getElementById('reportsToday');
        const lastUpdateElement = document.getElementById('lastUpdate');
        
        if (activeUsersElement) {
            const currentValue = parseInt(activeUsersElement.textContent) || 0;
            const newValue = currentValue + Math.floor(Math.random() * 10) - 5;
            activeUsersElement.textContent = Math.max(0, newValue);
        }
        
        if (threatsBlockedElement) {
            const currentValue = parseInt(threatsBlockedElement.textContent) || 0;
            threatsBlockedElement.textContent = currentValue + Math.floor(Math.random() * 3);
        }
        
        if (reportsTodayElement) {
            const currentValue = parseInt(reportsTodayElement.textContent) || 0;
            if (Math.random() < 0.3) { // 30% chance of new report
                reportsTodayElement.textContent = currentValue + 1;
            }
        }
        
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString();
        }
    }

    showNotification(notification) {
        // Create notification element
        const notificationElement = document.createElement('div');
        notificationElement.className = `alert alert-${notification.type} alert-dismissible fade show notification-toast`;
        notificationElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${this.getNotificationIcon(notification.type)} me-2"></i>
                <div>
                    <strong>${notification.title}</strong>
                    <div>${notification.message}</div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Add to notifications container
        const notificationsContainer = document.getElementById('notificationsContainer') || this.createNotificationsContainer();
        notificationsContainer.appendChild(notificationElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.remove();
            }
        }, 5000);
        
        // Update notification badge
        this.updateNotificationBadge();
    }

    createNotificationsContainer() {
        const container = document.createElement('div');
        container.id = 'notificationsContainer';
        container.className = 'notifications-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1060;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'danger': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'bell';
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const count = document.querySelectorAll('.notification-toast').length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    showSuccess(message) {
        this.showNotification({
            type: 'success',
            title: 'Success',
            message: message
        });
    }

    showError(message) {
        this.showNotification({
            type: 'danger',
            title: 'Error',
            message: message
        });
    }

    showWarning(message) {
        this.showNotification({
            type: 'warning',
            title: 'Warning',
            message: message
        });
    }

    showInfo(message) {
        this.showNotification({
            type: 'info',
            title: 'Information',
            message: message
        });
    }

    showLoadingSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-overlay';
            spinner.innerHTML = `
                <div class="d-flex justify-content-center align-items-center h-100">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            container.appendChild(spinner);
        }
    }

    hideLoadingSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const spinner = container.querySelector('.loading-overlay');
            if (spinner) {
                spinner.remove();
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    exportData(type, format = 'csv') {
        // Export data in specified format
        switch (type) {
            case 'reports':
                this.exportReports(format);
                break;
            case 'analytics':
                this.exportAnalytics(format);
                break;
            case 'events':
                this.exportEvents(format);
                break;
            case 'jobs':
                this.exportJobs(format);
                break;
            default:
                console.error('Unknown export type:', type);
        }
    }

    exportReports(format) {
        // Implement reports export
        this.downloadFile(`reports.${format}`, this.generateReportsExport(format));
    }

    exportAnalytics(format) {
        // Implement analytics export
        this.downloadFile(`analytics.${format}`, this.generateAnalyticsExport(format));
    }

    exportEvents(format) {
        // Implement events export
        this.downloadFile(`events.${format}`, this.generateEventsExport(format));
    }

    exportJobs(format) {
        // Implement jobs export
        this.downloadFile(`jobs.${format}`, this.generateJobsExport(format));
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
                a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    generateReportsExport(format) {
        // Get reports data from table
        const table = document.getElementById('reportsTable');
        if (!table) return '';

        const rows = Array.from(table.querySelectorAll('tbody tr:not([style*="display: none"])'));
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());

        if (format === 'csv') {
            let csv = headers.join(',') + '\n';
            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td')).map(td => {
                    return '"' + td.textContent.trim().replace(/"/g, '""') + '"';
                });
                csv += cells.join(',') + '\n';
            });
            return csv;
        } else if (format === 'json') {
            const data = rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = cells[index] ? cells[index].textContent.trim() : '';
                });
                return rowData;
            });
            return JSON.stringify(data, null, 2);
        }
        return '';
    }

    generateAnalyticsExport(format) {
        // Generate analytics export data
        const analyticsData = {
            exportDate: new Date().toISOString(),
            summary: this.getAnalyticsSummary(),
            charts: this.getChartsData(),
            trends: this.getTrendsData()
        };

        if (format === 'json') {
            return JSON.stringify(analyticsData, null, 2);
        } else if (format === 'csv') {
            // Convert analytics to CSV format
            let csv = 'Metric,Value,Date\n';
            Object.entries(analyticsData.summary).forEach(([key, value]) => {
                csv += `"${key}","${value}","${new Date().toISOString()}"\n`;
            });
            return csv;
        }
        return '';
    }

    generateEventsExport(format) {
        // Generate events export data
        const events = this.getEventsData();
        
        if (format === 'json') {
            return JSON.stringify(events, null, 2);
        } else if (format === 'csv') {
            let csv = 'Title,Date,Location,Type,Status\n';
            events.forEach(event => {
                csv += `"${event.title}","${event.date}","${event.location}","${event.type}","${event.status}"\n`;
            });
            return csv;
        }
        return '';
    }

    generateJobsExport(format) {
        // Generate jobs export data
        const jobs = this.getJobsData();
        
        if (format === 'json') {
            return JSON.stringify(jobs, null, 2);
        } else if (format === 'csv') {
            let csv = 'Title,Company,Location,Type,Posted Date,Status\n';
            jobs.forEach(job => {
                csv += `"${job.title}","${job.company}","${job.location}","${job.type}","${job.postedDate}","${job.status}"\n`;
            });
            return csv;
        }
        return '';
    }

    // Chart initialization methods
    initializeOverviewCharts() {
        this.initializeThreatTrendsChart();
        this.initializeCountryDistributionChart();
        this.initializeReportStatusChart();
    }

    initializeThreatTrendsChart() {
        const ctx = document.getElementById('threatTrendsChart');
        if (!ctx) return;

        this.charts.threatTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Threats Detected',
                    data: [120, 190, 300, 500, 200, 300],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Threats Blocked',
                    data: [100, 170, 280, 480, 180, 280],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Threat Detection Trends'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeCountryDistributionChart() {
        const ctx = document.getElementById('countryDistributionChart');
        if (!ctx) return;

        this.charts.countryDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Reports by Country'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initializeReportStatusChart() {
        const ctx = document.getElementById('reportStatusChart');
        if (!ctx) return;

        this.charts.reportStatus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['New', 'In Progress', 'Resolved', 'Closed'],
                datasets: [{
                    label: 'Reports',
                    data: [45, 23, 67, 89],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Report Status Distribution'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeReportsCharts() {
        this.initializeReportsTimelineChart();
        this.initializeReportsPriorityChart();
    }

    initializeReportsTimelineChart() {
        const ctx = document.getElementById('reportsTimelineChart');
        if (!ctx) return;

        this.charts.reportsTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getLast30Days(),
                datasets: [{
                    label: 'Daily Reports',
                    data: this.generateRandomData(30, 0, 20),
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Reports Timeline (Last 30 Days)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeReportsPriorityChart() {
        const ctx = document.getElementById('reportsPriorityChart');
        if (!ctx) return;

        this.charts.reportsPriority = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [15, 30, 35, 20],
                    backgroundColor: [
                        '#DC3545',
                        '#FD7E14',
                        '#FFC107',
                        '#28A745'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Reports by Priority'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initializeEventsCharts() {
        this.initializeEventsCalendarChart();
        this.initializeEventsTypeChart();
    }

    initializeEventsCalendarChart() {
        const ctx = document.getElementById('eventsCalendarChart');
        if (!ctx) return;

        this.charts.eventsCalendar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.getNext12Months(),
                datasets: [{
                    label: 'Scheduled Events',
                    data: this.generateRandomData(12, 1, 10),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Events Calendar Overview'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeEventsTypeChart() {
        const ctx = document.getElementById('eventsTypeChart');
        if (!ctx) return;

        this.charts.eventsType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Workshops', 'Conferences', 'Training', 'Webinars', 'Meetups'],
                datasets: [{
                    data: [25, 20, 30, 15, 10],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Events by Type'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Utility methods
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
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    isWithinDays(date1, date2, days) {
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
    }

    getLast30Days() {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return days;
    }

    getNext12Months() {
        const months = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        }
        return months;
    }

    generateRandomData(length, min, max) {
        return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    startPerformanceMonitoring() {
        // Monitor page performance
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    console.log('Dashboard Performance:', {
                        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        totalTime: perfData.loadEventEnd - perfData.fetchStart
                    });
                }, 0);
            });
        }
    }

    // Data getter methods (these would typically fetch from API)
    getAnalyticsSummary() {
        return {
            totalReports: 1234,
            activeThreats: 56,
            resolvedIncidents: 789,
            averageResponseTime: '2.5 hours'
        };
    }

    getChartsData() {
        return {
            threatTrends: this.charts.threatTrends?.data,
            countryDistribution: this.charts.countryDistribution?.data,
            reportStatus: this.charts.reportStatus?.data
        };
    }

    getTrendsData() {
        return {
                        weeklyGrowth: 15.2,
            monthlyGrowth: 8.7,
            yearlyGrowth: 45.3,
            topThreats: ['Phishing', 'Malware', 'Social Engineering', 'Data Breach'],
            topCountries: ['Kenya', 'Tanzania', 'Uganda', 'Rwanda']
        };
    }

    getEventsData() {
        return [
            {
                id: 1,
                title: 'Cybersecurity Workshop - Nairobi',
                date: '2024-02-15',
                location: 'Nairobi, Kenya',
                type: 'Workshop',
                status: 'Upcoming'
            },
            {
                id: 2,
                title: 'East Africa Cyber Summit',
                date: '2024-03-20',
                location: 'Dar es Salaam, Tanzania',
                type: 'Conference',
                status: 'Registration Open'
            },
            {
                id: 3,
                title: 'Mobile Security Training',
                date: '2024-02-28',
                location: 'Kampala, Uganda',
                type: 'Training',
                status: 'Upcoming'
            }
        ];
    }

    getJobsData() {
        return [
            {
                id: 1,
                title: 'Cybersecurity Analyst',
                company: 'Africa Shield',
                location: 'Nairobi, Kenya',
                type: 'Full-time',
                postedDate: '2024-01-15',
                status: 'Active'
            },
            {
                id: 2,
                title: 'Security Engineer',
                company: 'TechCorp EA',
                location: 'Kigali, Rwanda',
                type: 'Full-time',
                postedDate: '2024-01-20',
                status: 'Active'
            },
            {
                id: 3,
                title: 'Penetration Tester',
                company: 'SecureNet',
                location: 'Addis Ababa, Ethiopia',
                type: 'Contract',
                postedDate: '2024-01-25',
                status: 'Active'
            }
        ];
    }

    // Update methods for real-time data
    updateStatsCards(data) {
        const statsElements = {
            totalReports: document.getElementById('totalReports'),
            activeThreats: document.getElementById('activeThreats'),
            resolvedIncidents: document.getElementById('resolvedIncidents'),
            averageResponseTime: document.getElementById('averageResponseTime')
        };

        Object.entries(statsElements).forEach(([key, element]) => {
            if (element && data[key] !== undefined) {
                this.animateNumber(element, data[key]);
            }
        });
    }

    updateCountriesTable(data) {
        const tableBody = document.querySelector('#countriesTable tbody');
        if (!tableBody || !data) return;

        tableBody.innerHTML = '';
        data.forEach(country => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="../assets/images/flags/${country.code.toLowerCase()}.png" 
                         alt="${country.name}" width="24" height="16" class="me-2">
                    ${country.name}
                </td>
                <td>${country.reports}</td>
                <td>
                    <span class="badge bg-${this.getThreatLevelColor(country.threatLevel)}">
                        ${country.threatLevel}
                    </span>
                </td>
                <td>${country.lastUpdate}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateRecentReports(data) {
        const container = document.getElementById('recentReports');
        if (!container || !data) return;

        container.innerHTML = '';
        data.forEach(report => {
            const reportElement = document.createElement('div');
            reportElement.className = 'recent-report-item';
            reportElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${report.title}</h6>
                        <p class="mb-1 text-muted small">${report.description}</p>
                        <small class="text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>${report.location}
                            <i class="fas fa-clock ms-2 me-1"></i>${this.formatTime(report.timestamp)}
                        </small>
                    </div>
                    <span class="badge bg-${this.getPriorityColor(report.priority)}">
                        ${report.priority}
                    </span>
                </div>
            `;
            container.appendChild(reportElement);
        });
    }

    updateReportsTable(data) {
        const tableBody = document.querySelector('#reportsTable tbody');
        if (!tableBody || !data) return;

        tableBody.innerHTML = '';
        data.forEach(report => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${report.id}</td>
                <td>${report.title}</td>
                <td class="country-cell">${report.country}</td>
                <td class="priority-cell">
                    <span class="badge bg-${this.getPriorityColor(report.priority)}">
                        ${report.priority}
                    </span>
                </td>
                <td class="status-cell">
                    <span class="badge bg-${this.getStatusColor(report.status)}">
                        ${report.status}
                    </span>
                </td>
                <td>${this.formatDate(report.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="dashboard.viewReport(${report.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="dashboard.editReport(${report.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateAnalyticsCharts(data) {
        // Update existing charts with new data
        if (this.charts.threatTrends && data.threatTrends) {
            this.charts.threatTrends.data = data.threatTrends;
            this.charts.threatTrends.update();
        }

        if (this.charts.countryDistribution && data.countryDistribution) {
            this.charts.countryDistribution.data = data.countryDistribution;
            this.charts.countryDistribution.update();
        }
    }

    updateAnalyticsTable(data) {
        const tableBody = document.querySelector('#analyticsTable tbody');
        if (!tableBody || !data.metrics) return;

        tableBody.innerHTML = '';
        data.metrics.forEach(metric => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${metric.name}</td>
                <td>${metric.value}</td>
                <td>
                    <span class="text-${metric.trend > 0 ? 'success' : 'danger'}">
                        <i class="fas fa-arrow-${metric.trend > 0 ? 'up' : 'down'}"></i>
                        ${Math.abs(metric.trend)}%
                    </span>
                </td>
                <td>${this.formatDate(metric.lastUpdated)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateEventsCalendar(data) {
        const calendar = document.getElementById('eventsCalendar');
        if (!calendar || !data) return;

        // This would integrate with a calendar library like FullCalendar
        // For now, we'll update a simple list
        calendar.innerHTML = '';
        data.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-card';
            eventElement.setAttribute('data-country', event.country);
            eventElement.setAttribute('data-date', event.date);
            eventElement.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">${event.title}</h6>
                        <p class="card-text">${event.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>${this.formatDate(event.date)}
                                <i class="fas fa-map-marker-alt ms-2 me-1"></i>${event.location}
                            </small>
                            <span class="badge bg-${this.getEventTypeColor(event.type)}">
                                ${event.type}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            calendar.appendChild(eventElement);
        });
    }

    updateJobsList(data) {
        const jobsList = document.getElementById('jobsList');
        if (!jobsList || !data) return;

        jobsList.innerHTML = '';
        data.forEach(job => {
            const jobElement = document.createElement('div');
            jobElement.className = 'job-card';
            jobElement.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title">${job.title}</h6>
                                <p class="card-text">${job.company}</p>
                                <small class="text-muted job-location">
                                    <i class="fas fa-map-marker-alt me-1"></i>${job.location}
                                    <i class="fas fa-briefcase ms-2 me-1"></i>${job.type}
                                </small>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-${this.getJobStatusColor(job.status)}">
                                    ${job.status}
                                </span>
                                <br>
                                <small class="text-muted">${this.formatDate(job.postedDate)}</small>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button class="btn btn-outline-primary btn-sm me-2" onclick="dashboard.viewJob(${job.id})">
                                View Details
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="dashboard.editJob(${job.id})">
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            `;
            jobsList.appendChild(jobElement);
        });
    }

    updateJobsStats(data) {
        const statsElements = {
            totalJobs: document.getElementById('totalJobs'),
            activeJobs: document.getElementById('activeJobs'),
            applicationsToday: document.getElementById('applicationsToday'),
            averageSalary: document.getElementById('averageSalary')
        };

        const stats = this.calculateJobsStats(data);
        Object.entries(statsElements).forEach(([key, element]) => {
            if (element && stats[key] !== undefined) {
                this.animateNumber(element, stats[key]);
            }
        });
    }

    updateCoursesProgress(courses) {
        const container = document.getElementById('coursesProgress');
        if (!container || !courses) return;

        container.innerHTML = '';
        courses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.className = 'course-progress-item';
            courseElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${course.title}</h6>
                    <span class="badge bg-primary">${course.progress}%</span>
                </div>
                <div class="progress mb-2">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${course.progress}%" 
                         aria-valuenow="${course.progress}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                <small class="text-muted">
                    ${course.completedLessons}/${course.totalLessons} lessons completed
                </small>
            `;
            container.appendChild(courseElement);
        });
    }

    updateLearningStats(stats) {
        const statsElements = {
            enrolledCourses: document.getElementById('enrolledCourses'),
            completedCourses: document.getElementById('completedCourses'),
            certificatesEarned: document.getElementById('certificatesEarned'),
            studyHours: document.getElementById('studyHours')
        };

        Object.entries(statsElements).forEach(([key, element]) => {
            if (element && stats[key] !== undefined) {
                this.animateNumber(element, stats[key]);
            }
        });
    }

    // Helper methods for styling
    getThreatLevelColor(level) {
        const colors = {
            'Low': 'success',
            'Medium': 'warning',
            'High': 'danger',
            'Critical': 'dark'
        };
        return colors[level] || 'secondary';
    }

    getPriorityColor(priority) {
        const colors = {
            'Low': 'success',
            'Medium': 'warning',
            'High': 'danger',
            'Critical': 'dark'
        };
        return colors[priority] || 'secondary';
    }

    getStatusColor(status) {
        const colors = {
            'New': 'primary',
            'In Progress': 'warning',
            'Resolved': 'success',
            'Closed': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getEventTypeColor(type) {
        const colors = {
            'Workshop': 'primary',
            'Conference': 'success',
            'Training': 'warning',
            'Webinar': 'info',
            'Meetup': 'secondary'
        };
        return colors[type] || 'secondary';
    }

    getJobStatusColor(status) {
        const colors = {
            'Active': 'success',
            'Closed': 'secondary',
            'Draft': 'warning'
        };
        return colors[status] || 'secondary';
    }

    // Animation methods
    animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000; // 1 second
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = this.formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // Action methods
    viewReport(reportId) {
        // Open report details modal or navigate to report page
        this.fetchData(`/api/reports/${reportId}`)
            .then(report => {
                this.showReportModal(report);
            })
            .catch(error => {
                console.error('Error fetching report:', error);
                this.showError('Failed to load report details');
            });
    }

    editReport(reportId) {
        // Open edit report modal
        this.fetchData(`/api/reports/${reportId}`)
            .then(report => {
                this.showEditReportModal(report);
            })
            .catch(error => {
                console.error('Error fetching report:', error);
                this.showError('Failed to load report for editing');
            });
    }

    viewJob(jobId) {
        // Open job details modal
        this.fetchData(`/api/jobs/${jobId}`)
            .then(job => {
                this.showJobModal(job);
            })
            .catch(error => {
                console.error('Error fetching job:', error);
                this.showError('Failed to load job details');
            });
    }

    editJob(jobId) {
        // Open edit job modal
        this.fetchData(`/api/jobs/${jobId}`)
            .then(job => {
                this.showEditJobModal(job);
            })
            .catch(error => {
                console.error('Error fetching job:', error);
                this.showError('Failed to load job for editing');
            });
    }

    showReportModal(report) {
        const modal = document.getElementById('reportDetailsModal');
        if (!modal) return;

        // Populate modal with report data
        modal.querySelector('#reportTitle').textContent = report.title;
        modal.querySelector('#reportDescription').textContent = report.description;
        modal.querySelector('#reportCountry').textContent = report.country;
        modal.querySelector('#reportPriority').textContent = report.priority;
        modal.querySelector('#reportStatus').textContent = report.status;
        modal.querySelector('#reportDate').textContent = this.formatDate(report.createdAt);

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    showEditReportModal(report) {
        const modal = document.getElementById('editReportModal');
        if (!modal) return;

        // Populate form with report data
        modal.querySelector('#editReportTitle').value = report.title;
        modal.querySelector('#editReportDescription').value = report.description;
        modal.querySelector('#editReportCountry').value = report.country;
        modal.querySelector('#editReportPriority').value = report.priority;
        modal.querySelector('#editReportStatus').value = report.status;

        // Store report ID for submission
        modal.setAttribute('data-report-id', report.id);

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    showJobModal(job) {
        const modal = document.getElementById('jobDetailsModal');
        if (!modal) return;

        // Populate modal with job data
        modal.querySelector('#jobTitle').textContent = job.title;
        modal.querySelector('#jobCompany').textContent = job.company;
        modal.querySelector('#jobLocation').textContent = job.location;
        modal.querySelector('#jobType').textContent = job.type;
        modal.querySelector('#jobDescription').textContent = job.description;
        modal.querySelector('#jobRequirements').innerHTML = job.requirements.map(req => `<li>${req}</li>`).join('');
        modal.querySelector('#jobSalary').textContent = job.salary || 'Not specified';
        modal.querySelector('#jobPostedDate').textContent = this.formatDate(job.postedDate);

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    showEditJobModal(job) {
        const modal = document.getElementById('editJobModal');
        if (!modal) return;

        // Populate form with job data
        modal.querySelector('#editJobTitle').value = job.title;
        modal.querySelector('#editJobCompany').value = job.company;
        modal.querySelector('#editJobLocation').value = job.location;
        modal.querySelector('#editJobType').value = job.type;
        modal.querySelector('#editJobDescription').value = job.description;
        modal.querySelector('#editJobSalary').value = job.salary || '';

        // Store job ID for submission
        modal.setAttribute('data-job-id', job.id);

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    calculateJobsStats(jobs) {
        return {
            totalJobs: jobs.length,
            activeJobs: jobs.filter(job => job.status === 'Active').length,
            applicationsToday: Math.floor(Math.random() * 50), // This would come from API
            averageSalary: '$45,000' // This would be calculated from actual data
        };
    }

    // Data update methods for real-time updates
    updateThreatData(data) {
        // Update threat-related displays
        const threatElements = document.querySelectorAll('[data-threat-id]');
        threatElements.forEach(element => {
            const threatId = element.getAttribute('data-threat-id');
            const threat = data.find(t => t.id === threatId);
            if (threat) {
                this.updateThreatElement(element, threat);
            }
        });
    }

    updateThreatElement(element, threat) {
        // Update individual threat element
        const statusElement = element.querySelector('.threat-status');
        const severityElement = element.querySelector('.threat-severity');
        const timestampElement = element.querySelector('.threat-timestamp');

        if (statusElement) {
            statusElement.textContent = threat.status;
            statusElement.className = `threat-status badge bg-${this.getStatusColor(threat.status)}`;
        }

        if (severityElement) {
            severityElement.textContent = threat.severity;
            severityElement.className = `threat-severity badge bg-${this.getPriorityColor(threat.severity)}`;
        }

        if (timestampElement) {
            timestampElement.textContent = this.formatTime(threat.lastUpdated);
        }
    }

    addNewReport(report) {
        // Add new report to the reports table
        const tableBody = document.querySelector('#reportsTable tbody');
        if (!tableBody) return;

        const row = document.createElement('tr');
        row.className = 'new-report-highlight';
        row.innerHTML = `
            <td>${report.id}</td>
            <td>${report.title}</td>
            <td class="country-cell">${report.country}</td>
            <td class="priority-cell">
                <span class="badge bg-${this.getPriorityColor(report.priority)}">
                    ${report.priority}
                </span>
            </td>
            <td class="status-cell">
                <span class="badge bg-${this.getStatusColor(report.status)}">
                    ${report.status}
                </span>
            </td>
            <td>${this.formatDate(report.createdAt)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="dashboard.viewReport(${report.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="dashboard.editReport(${report.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;

        // Insert at the top of the table
        tableBody.insertBefore(row, tableBody.firstChild);

        // Remove highlight after 3 seconds
        setTimeout(() => {
            row.classList.remove('new-report-highlight');
        }, 3000);

        // Show notification
        this.showNotification({
            type: 'info',
            title: 'New Report',
            message: `New ${report.priority.toLowerCase()} priority report from ${report.country}`
        });
    }

    updateAnalytics(data) {
        // Update analytics displays
        if (data.stats) {
            this.updateStatsCards(data.stats);
        }

        if (data.charts) {
            this.updateAnalyticsCharts(data.charts);
        }

        if (data.trends) {
            this.updateTrendsDisplay(data.trends);
        }
    }

    updateTrendsDisplay(trends) {
        const trendsContainer = document.getElementById('trendsContainer');
        if (!trendsContainer) return;

        trendsContainer.innerHTML = `
            <div class="row">
                <div class="col-md-3">
                    <div class="trend-item">
                        <h6>Weekly Growth</h6>
                        <span class="trend-value text-${trends.weeklyGrowth > 0 ? 'success' : 'danger'}">
                            <i class="fas fa-arrow-${trends.weeklyGrowth > 0 ? 'up' : 'down'}"></i>
                            ${Math.abs(trends.weeklyGrowth)}%
                        </span>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="trend-item">
                        <h6>Monthly Growth</h6>
                        <span class="trend-value text-${trends.monthlyGrowth > 0 ? 'success' : 'danger'}">
                            <i class="fas fa-arrow-${trends.monthlyGrowth > 0 ? 'up' : 'down'}"></i>
                            ${Math.abs(trends.monthlyGrowth)}%
                        </span>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="trend-item">
                        <h6>Yearly Growth</h6>
                        <span class="trend-value text-${trends.yearlyGrowth > 0 ? 'success' : 'danger'}">
                            <i class="fas fa-arrow-${trends.yearlyGrowth > 0 ? 'up' : 'down'}"></i>
                            ${Math.abs(trends.yearlyGrowth)}%
                        </span>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="trend-item">
                        <h6>Top Threat</h6>
                        <span class="trend-value text-warning">
                            ${trends.topThreats[0]}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    // Search results generation
    generateSearchResultsHTML(results) {
        let html = '<div class="search-results">';
        
        if (results.reports.length > 0) {
            html += '<div class="search-section"><h6>Reports</h6>';
            results.reports.forEach(report => {
                html += `
                    <div class="search-result-item" onclick="dashboard.viewReport(${report.id})">
                        <div class="search-result-title">${report.title}</div>
                        <div class="search-result-meta">${report.country} • ${report.priority}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (results.events.length > 0) {
            html += '<div class="search-section"><h6>Events</h6>';
            results.events.forEach(event => {
                html += `
                    <div class="search-result-item">
                        <div class="search-result-title">${event.title}</div>
                        <div class="search-result-meta">${event.location} • ${this.formatDate(event.date)}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (results.jobs.length > 0) {
            html += '<div class="search-section"><h6>Jobs</h6>';
            results.jobs.forEach(job => {
                html += `
                    <div class="search-result-item" onclick="dashboard.viewJob(${job.id})">
                        <div class="search-result-title">${job.title}</div>
                        <div class="search-result-meta">${job.company} • ${job.location}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (results.countries.length > 0) {
            html += '<div class="search-section"><h6>Countries</h6>';
            results.countries.forEach(country => {
                html += `
                    <div class="search-result-item">
                        <div class="search-result-title">${country.name}</div>
                        <div class="search-result-meta">${country.reports} reports • ${country.threatLevel} threat level</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (results.reports.length === 0 && results.events.length === 0 && 
            results.jobs.length === 0 && results.countries.length === 0) {
            html += '<div class="no-results">No results found</div>';
        }

        html += '</div>';
        return html;
    }

    // Cleanup method
    destroy() {
        // Clean up WebSocket connection
        if (this.websocket) {
            this.websocket.close();
        }

        // Clear intervals
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });

        // Remove event listeners
        document.removeEventListener('click', this.handleClick);
        document.removeEventListener('submit', this.handleSubmit);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AfricaShieldDashboard();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.section) {
        window.dashboard.switchSection(e.state.section);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AfricaShieldDashboard;
}



