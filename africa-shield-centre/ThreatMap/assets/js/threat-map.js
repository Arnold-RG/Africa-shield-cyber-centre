/**
 * Africa Shield Cyber Centre - Real-time Threat Map
 * Main JavaScript Module
 * 
 * @version 2.0.0
 * @author Africa Shield Development Team
 * @description Real-time cybersecurity threat visualization system
 */

// Global Configuration
const ThreatMapConfig = {
    // API Configuration
    api: {
        baseUrl: 'https://api.africashield.org/v1',
        endpoints: {
            liveThreatData: '/threats/live',
            historicalData: '/threats/historical',
            threatDetails: '/threats/details',
            statistics: '/threats/stats',
            alerts: '/threats/alerts'
        },
        refreshInterval: 2000, // 2 seconds
        timeout: 10000 // 10 seconds
    },
    
    // Map Configuration
    map: {
        center: [-1.286389, 36.817223], // Nairobi, Kenya
        zoom: 4,
        minZoom: 2,
        maxZoom: 18,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    
    // Threat Categories
    threatTypes: {
                malware: { name: 'Malware', color: '#ff073a', icon: 'fas fa-virus' },
        phishing: { name: 'Phishing', color: '#007bff', icon: 'fas fa-fish' },
        ddos: { name: 'DDoS', color: '#6610f2', icon: 'fas fa-bolt' },
        ransomware: { name: 'Ransomware', color: '#fd7e14', icon: 'fas fa-lock' },
        botnet: { name: 'Botnet', color: '#20c997', icon: 'fas fa-network-wired' },
        spam: { name: 'Spam', color: '#17a2b8', icon: 'fas fa-envelope' }
    },
    
    // Severity Levels
    severityLevels: {
        critical: { name: 'Critical', color: '#dc3545', priority: 4 },
        high: { name: 'High', color: '#ffc107', priority: 3 },
        medium: { name: 'Medium', color: '#17a2b8', priority: 2 },
        low: { name: 'Low', color: '#28a745', priority: 1 }
    },
    
    // Animation Settings
    animations: {
        markerPulse: true,
        attackPaths: true,
        fadeInDuration: 500,
        pulseInterval: 1500
    },
    
    // UI Settings
    ui: {
        maxFeedItems: 50,
        tooltipDelay: 300,
        autoHideControls: false,
        enableSounds: false
    }
};

/**
 * Main ThreatMap Class
 */
class ThreatMap {
    constructor() {
        this.map = null;
        this.markers = null;
        this.threatData = [];
        this.filteredData = [];
        this.isConnected = true;
        this.refreshTimer = null;
        this.activeFilters = {
            threatTypes: new Set(Object.keys(ThreatMapConfig.threatTypes)),
            severityLevels: new Set(Object.keys(ThreatMapConfig.severityLevels)),
            timeRange: 'realtime',
            region: 'africa'
        };
        
        this.init();
    }
    
    /**
     * Initialize the threat map
     */
    async init() {
        try {
            this.showLoading('Initializing threat map...');
            
            // Initialize map
            await this.initializeMap();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Setup UI components
            this.initializeUI();
            
            this.hideLoading();
            this.showConnectionStatus('connected');
            
            console.log('ThreatMap initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ThreatMap:', error);
            this.showError('Failed to initialize threat map. Please refresh the page.');
            this.hideLoading();
        }
    }
    
    /**
     * Initialize the Leaflet map
     */
    async initializeMap() {
        const mapContainer = document.getElementById('threatMapCanvas');
        if (!mapContainer) {
            throw new Error('Map container not found');
        }
        
        // Initialize map
        this.map = L.map('threatMapCanvas', {
            center: ThreatMapConfig.map.center,
            zoom: ThreatMapConfig.map.zoom,
            minZoom: ThreatMapConfig.map.minZoom,
            maxZoom: ThreatMapConfig.map.maxZoom,
            zoomControl: true,
            attributionControl: true
        });
        
        // Add tile layer
        L.tileLayer(ThreatMapConfig.map.tileLayer, {
            attribution: ThreatMapConfig.map.attribution,
            maxZoom: ThreatMapConfig.map.maxZoom
        }).addTo(this.map);
        
        // Initialize marker cluster group
        this.markers = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                let className = 'marker-cluster-small';
                
                if (count > 100) className = 'marker-cluster-large';
                else if (count > 10) className = 'marker-cluster-medium';
                
                return new L.DivIcon({
                    html: `<div><span>${count}</span></div>`,
                    className: `marker-cluster ${className}`,
                    iconSize: new L.Point(40, 40)
                });
            }
        });
        
        this.map.addLayer(this.markers);
        
        // Add map event listeners
        this.map.on('zoomend', () => this.onMapZoomChange());
        this.map.on('moveend', () => this.onMapMoveChange());
    }
    
    /**
     * Setup event listeners for UI components
     */
    setupEventListeners() {
        // Control panel toggles
        this.setupControlPanelListeners();
        
        // Filter controls
        this.setupFilterListeners();
        
        // Map controls
        this.setupMapControlListeners();
        
        // Activity feed
        this.setupActivityFeedListeners();
        
        // Modal controls
        this.setupModalListeners();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Window events
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('beforeunload', () => this.cleanup());
    }
    
    /**
     * Setup control panel event listeners
     */
    setupControlPanelListeners() {
        const toggleControls = document.getElementById('toggleControls');
        const controlsPanel = document.getElementById('controlsPanel');
        
        if (toggleControls && controlsPanel) {
            toggleControls.addEventListener('click', () => {
                controlsPanel.classList.toggle('collapsed');
                const icon = toggleControls.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-chevron-left');
                    icon.classList.toggle('fa-chevron-right');
                }
            });
        }
        
        const toggleFeed = document.getElementById('toggleFeed');
        const feedContent = document.getElementById('feedContent');
        
        if (toggleFeed && feedContent) {
            toggleFeed.addEventListener('click', () => {
                feedContent.style.display = feedContent.style.display === 'none' ? 'block' : 'none';
                const icon = toggleFeed.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
            });
        }
    }
    
    /**
     * Setup filter event listeners
     */
    setupFilterListeners() {
        // Threat type filters
        Object.keys(ThreatMapConfig.threatTypes).forEach(type => {
            const checkbox = document.getElementById(type);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.activeFilters.threatTypes.add(type);
                    } else {
                        this.activeFilters.threatTypes.delete(type);
                    }
                    this.applyFilters();
                });
            }
        });
        
        // Severity level filters
        Object.keys(ThreatMapConfig.severityLevels).forEach(level => {
            const checkbox = document.getElementById(level);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.activeFilters.severityLevels.add(level);
                    } else {
                        this.activeFilters.severityLevels.delete(level);
                    }
                    this.applyFilters();
                });
            }
        });
        
        // Time range filter
        const timeRange = document.getElementById('timeRange');
        if (timeRange) {
            timeRange.addEventListener('change', (e) => {
                this.activeFilters.timeRange = e.target.value;
                this.onTimeRangeChange(e.target.value);
            });
        }
        
        // Region focus filter
        const regionFocus = document.getElementById('regionFocus');
        if (regionFocus) {
            regionFocus.addEventListener('change', (e) => {
                this.activeFilters.region = e.target.value;
                this.onRegionChange(e.target.value);
            });
        }
    }
    
    /**
     * Setup map control event listeners
     */
    setupMapControlListeners() {
        // Refresh map button
        const refreshMap = document.getElementById('refreshMap');
        if (refreshMap) {
            refreshMap.addEventListener('click', () => this.refreshData());
        }
        
        // Reset view button
        const resetView = document.getElementById('resetView');
        if (resetView) {
            resetView.addEventListener('click', () => this.resetMapView());
        }
        
        // Fullscreen button
        const fullscreen = document.getElementById('fullscreen');
        if (fullscreen) {
            fullscreen.addEventListener('click', () => this.toggleFullscreen());
        }
    }
    
    /**
     * Setup activity feed event listeners
     */
    setupActivityFeedListeners() {
        // Activity feed will be populated dynamically
        // Event delegation for feed items
        const feedContent = document.getElementById('feedContent');
        if (feedContent) {
            feedContent.addEventListener('click', (e) => {
                const feedItem = e.target.closest('.feed-item');
                if (feedItem) {
                    const threatId = feedItem.dataset.threatId;
                    if (threatId) {
                        this.showThreatDetails(threatId);
                    }
                }
            });
        }
    }
    
    /**
     * Setup modal event listeners
     */
    setupModalListeners() {
        // Close threat details
        const closeDetails = document.getElementById('closeDetails');
        if (closeDetails) {
            closeDetails.addEventListener('click', () => {
                this.hideThreatDetails();
            });
        }
        
        // Modal backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.hideThreatDetails();
            }
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key - close modals/panels
            if (e.key === 'Escape') {
                this.hideThreatDetails();
                return;
            }
            
            // Ctrl/Cmd + R - refresh data
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
                return;
            }
            
            // F11 - toggle fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
                return;
            }
            
            // Space - pause/resume updates
            if (e.key === ' ' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.toggleRealTimeUpdates();
                return;
            }
        });
    }
    
    /**
     * Load initial threat data
     */
    async loadInitialData() {
        try {
            const data = await this.fetchThreatData();
            this.threatData = data.threats || [];
            this.updateStatistics(data.statistics || {});
            this.applyFilters();
            this.updateActivityFeed(data.activities || []);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load threat data. Retrying...');
            // Retry after 5 seconds
            setTimeout(() => this.loadInitialData(), 5000);
        }
    }
    
    /**
     * Fetch threat data from API
     */
    async fetchThreatData(params = {}) {
        const url = new URL(ThreatMapConfig.api.baseUrl + ThreatMapConfig.api.endpoints.liveThreatData);
        
        // Add query parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ThreatMapConfig.api.timeout);
        
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.showConnectionStatus('connected');
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            this.showConnectionStatus('disconnected');
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    /**
     * Apply current filters to threat data
     */
    applyFilters() {
        this.filteredData = this.threatData.filter(threat => {
            // Filter by threat type
            if (!this.activeFilters.threatTypes.has(threat.type)) {
                return false;
            }
            
            // Filter by severity level
            if (!this.activeFilters.severityLevels.has(threat.severity)) {
                return false;
            }
            
            // Filter by time range (if not real-time)
            if (this.activeFilters.timeRange !== 'realtime') {
                const threatTime = new Date(threat.timestamp);
                const now = new Date();
                const timeLimit = this.getTimeLimit(this.activeFilters.timeRange);
                
                if (now - threatTime > timeLimit) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.updateMapMarkers();
    }
    
    /**
     * Get time limit in milliseconds for time range filter
     */
    getTimeLimit(timeRange) {
        const limits = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
        };
        return limits[timeRange] || 0;
    }
    
    /**
     * Update map markers with filtered data
     */
    updateMapMarkers() {
        // Clear existing markers
        this.markers.clearLayers();
        
        // Add new markers
        this.filteredData.forEach(threat => {
            const marker = this.createThreatMarker(threat);
            if (marker) {
                this.markers.
