/**
 * SOC Dashboard Main Controller
 * Handles real-time data updates, user interactions, and dashboard state
 */

class SOCDashboard {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.updateIntervals = {};
        this.isFullscreen = false;
        this.feedPaused = false;
        this.currentTool = 'scanner';
        
        this.init();
    }

    async init() {
        try {
            await this.showLoadingScreen();
            await this.initializeComponents();
            await this.loadInitialData();
            await this.setupEventListeners();
            await this.initializeWebSocket();
            await this.startRealTimeUpdates();
            this.hideLoadingScreen();
        } catch (error) {
            console.error('Failed to initialize SOC Dashboard:', error);
            this.showErrorMessage('Failed to initialize dashboard');
        }
    }

    async showLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-logo">
                    <img src="../assets/images/logo.png" alt="Loading">
                </div>
                <div class="loading-text">Initializing SOC Dashboard...</div>
                <div class="loading-spinner"></div>
                <div class="loading-progress">
                    <div class="progress-bar" id="loadingProgress"></div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingScreen);

        // Simulate loading progress
        const progressBar = document.getElementById('loadingProgress');
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
        }, 200);

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    hideLoadingScreen() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 500);
        }
    }

    async initializeComponents() {
        // Initialize charts
        await this.initializeCharts();
        
        // Initialize threat map
        await this.initializeThreatMap();
        
        // Initialize data tables
        this.initializeDataTables();
        
        // Initialize modals
        this.initializeModals();
        
        // Initialize AI assistant
        this.initializeAIAssistant();
        
        // Initialize tools
        this.initializeTools();
    }

    async initializeCharts() {
        // Threat Timeline Chart
        const threatTimelineCtx = document.getElementById('threatTimelineChart');
        if (threatTimelineCtx) {
            this.charts.threatTimeline = new Chart(threatTimelineCtx, {
                type: 'line',
                data: {
                    labels: this.generateTimeLabels(24),
                    datasets: [{
                        label: 'Threats Detected',
                        data: this.generateRandomData(24, 50, 200),
                        borderColor: '#ff4444',
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Threats Blocked',
                        data: this.generateRandomData(24, 45, 190),
                        borderColor: '#00cc66',
                        backgroundColor: 'rgba(0, 204, 102, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#ffffff' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#888888' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: { color: '#888888' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        // Malware Chart
        const malwareCtx = document.getElementById('malwareChart');
        if (malwareCtx) {
            this.charts.malware = new Chart(malwareCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Trojans', 'Ransomware', 'Spyware', 'Adware'],
                    datasets: [{
                        data: [45, 28, 18, 9],
                        backgroundColor: ['#ff4444', '#ffaa00', '#00aaff', '#00cc66'],
                        borderWidth: 2,
                        borderColor: '#1a1a1a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#ffffff', padding: 20 }
                        }
                    }
                }
            });
        }

        // Network Chart
        const networkCtx = document.getElementById('networkChart');
        if (networkCtx) {
            this.charts.network = new Chart(networkCtx, {
                type: 'bar',
                data: {
                    labels: this.generateTimeLabels(12),
                    datasets: [{
                        label: 'Inbound (GB/s)',
                        data: this.generateRandomData(12, 1.5, 3.0),
                        backgroundColor: 'rgba(0, 170, 255, 0.7)',
                        borderColor: '#00aaff',
                        borderWidth: 1
                    }, {
                        label: 'Outbound (GB/s)',
                        data: this.generateRandomData(12, 1.0, 2.5),
                        backgroundColor: 'rgba(0, 255, 136, 0.7)',
                        borderColor: '#00ff88',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#ffffff' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#888888' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: { color: '#888888' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        // Honeypot Chart
        const honeypotCtx = document.getElementById('honeypotChart');
        if (honeypotCtx) {
            this.charts.honeypot = new Chart(honeypotCtx, {
                type: 'radar',
                data: {
                    labels: ['SSH', 'HTTP', 'FTP', 'SMTP', 'DNS', 'Telnet'],
                    datasets: [{
                        label: 'Attack Attempts',
                        data: [65, 89, 23, 45, 78, 34],
                        borderColor: '#ff4444',
                        backgroundColor: 'rgba(255, 68, 68, 0.2)',
                        pointBackgroundColor: '#ff4444',
                        pointBorderColor: '#ffffff',
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#ff4444'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#ffffff' }
                        }
                    },
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            pointLabels: { color: '#888888' },
                            ticks: { color: '#888888', backdropColor: 'transparent' }
                        }
                    }
                }
            });
        }
    }

    async initializeThreatMap() {
        const mapElement = document.getElementById('threatMap');
        if (!mapElement) return;

        // Initialize Leaflet map
        this.map = L.map('threatMap', {
            center: [-1.2921, 36.8219], // Nairobi coordinates
            zoom: 4,
            zoomControl: false,
            attributionControl: false
        });

        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add threat markers
        await this.addThreatMarkers();
        
        // Add custom controls
        this.addMapControls();
    }

    async addThreatMarkers() {
        const threats = [
            { lat: -1.2921, lng: 36.8219, country: 'Kenya', threats: 47, level: 'high' },
            { lat: -6.7924, lng: 39.2083, country: 'Tanzania', threats: 23, level: 'medium' },
            { lat: 0.3476, lng: 32.5825, country: 'Uganda', threats: 31, level: 'high' },
            { lat: -1.9441, lng: 30.0619, country: 'Rwanda', threats: 12, level: 'low' },
            { lat: 9.1450, lng: 40.4897, country: 'Ethiopia', threats: 56, level: 'critical' },
            { lat: 5.1521, lng: 46.1996, country: 'Somalia', threats: 89, level: 'critical' }
        ];

        threats.forEach(threat => {
            const color = this.getThreatColor(threat.level);
            const radius = Math.max(10, threat.threats / 2);
            
            const marker = L.circleMarker([threat.lat, threat.lng], {
                radius: radius,
                fillColor: color,
                color: color,
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
            }).addTo(this.map);

            marker.bindPopup(`
                <div class="threat-popup">
                    <h6>${threat.country}</h6>
                    <p>Active Threats: <strong>${threat.threats}</strong></p>
                    <p>Threat Level: <span class="threat-level ${threat.level}">${threat.level.toUpperCase()}</span></p>
                </div>
            `);

            // Add pulsing effect for critical threats
            if (threat.level === 'critical') {
                marker.setStyle({ className: 'pulse-marker' });
            }
        });
    }

    getThreatColor(level) {
        const colors = {
            low: '#00cc66',
            medium: '#ffaa00',
            high: '#ff4444',
            critical: '#ff0000'
        };
        return colors[level] || '#888888';
    }

    addMapControls() {
        // Add zoom controls
        L.control.zoom({ position: 'topright' }).addTo(this.map);
        
        // Add refresh control
        const refreshControl = L.control({ position: 'topright' });
        refreshControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            div.innerHTML = '<a href="#" title="Refresh Map"><i class="fas fa-sync-alt"></i></a>';
            div.onclick = (e) => {
                e.preventDefault();
                this.refreshThreatMap();
            };
            return div;
        };
        refreshControl.addTo(this.map);
    }

    async refreshThreatMap() {
        // Clear existing markers
        this.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker) {
                this.map.removeLayer(layer);
            }
        });
        
        // Add updated markers
        await this.addThreatMarkers();
        this.showToast('Threat map updated', 'success');
    }

    initializeDataTables() {
        // Initialize incident table with sorting and filtering
        const incidentTable = document.getElementById('incidentTable');
        if (incidentTable) {
            this.setupTableSorting(incidentTable);
        }
    }

    setupTableSorting(table) {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.sortTable(table, index);
            });
        });
    }

    sortTable(table, columnIndex) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aText = a.cells[columnIndex].textContent.trim();
            const bText = b.cells[columnIndex].textContent.trim();
            return aText.localeCompare(bText);
        });
        
        rows.forEach(row => tbody.appendChild(row));
    }

    initializeModals() {
        // Initialize new incident modal
        const newIncidentForm = document.getElementById('newIncidentForm');
        if (newIncidentForm) {
            newIncidentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewIncident(new FormData(newIncidentForm));
            });
        }
    }

    async handleNewIncident(formData) {
        try {
            const incidentData = {
                type: formData.get('type'),
                severity: formData.get('severity'),
                country: formData.get('country'),
                analyst: formData.get('analyst'),
                description: formData.get('description'),
                iocs: formData.get('iocs'),
                timestamp: new Date().toISOString()
            };

            // Simulate API call
            await this.createIncident(incidentData);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('newIncidentModal'));
            modal.hide();
            
            // Refresh incident table
            await this.refreshIncidentTable();
            
            this.showToast('Incident created successfully', 'success');
        } catch (error) {
            console.error('Failed to create incident:', error);
            this.showToast('Failed to create incident', 'error');
        }
    }

    async createIncident(incidentData) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Creating incident:', incidentData);
                resolve({ id: Date.now(), ...incidentData });
            }, 1000);
        });
    }

    async refreshIncidentTable() {
        const tableBody = document.getElementById('incidentTable');
        if (!tableBody) return;

        // Add loading state
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
        
        // Simulate data fetch
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Restore table content (in real app, this would be fresh data)
        this.loadIncidentTableData();
    }

    loadIncidentTableData() {
        const tableBody = document.getElementById('incidentTable');
        if (!tableBody) return;

        const incidents = [
            {
                id: '#INC-2025-001',
                type: 'phishing',
                location: '🇰🇪 Nairobi, Kenya',
                severity: 'critical',
                status: 'investigating',
                assigned: 'S. Mwangi',
                time: '14:32'
            },
            {
                id: '#INC-2025-002',
                type: 'malware',
                location: '🇹🇿 Dar es Salaam, Tanzania',
                severity: 'high',
                status: 'contained',
                assigned: 'J. Kilimo',
                time: '14:28'
            },
            {
                id: '#INC-2025-003',
                type: 'ddos',
                location: '🇺🇬 Kampala, Uganda',
                severity: 'high',
                status: 'mitigated',
                assigned: 'D. Okello',
                time: '14:25'
            },
            {
                id: '#INC-2025-004',
                type: 'ransomware',
                location: '🇷🇼 Kigali, Rwanda',
                severity: 'critical',
                status: 'investigating',
                assigned: 'M. Uwimana',
                time: '14:20'
            }
        ];

        tableBody.innerHTML = incidents.map(incident => `
            <tr>
                <td>${incident.id}</td>
                <td>
                    <span class="threat-type ${incident.type}">
                        <i class="fas fa-${this.getThreatIcon (incident.type)}"></i> ${this.capitalizeFirst(incident.type)}
                    </span>
                </td>
                <td>${incident.location}</td>
                <td><span class="severity-badge ${incident.severity}">${incident.severity.toUpperCase()}</span></td>
                <td><span class="status-badge ${incident.status}">${incident.status.toUpperCase()}</span></td>
                <td>${incident.assigned}</td>
                <td>${incident.time}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="socDashboard.viewIncident('${incident.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="socDashboard.updateIncidentStatus('${incident.id}')">
                        <i class="fas fa-play"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getThreatIcon(type) {
        const icons = {
            phishing: 'fish',
            malware: 'virus',
            ddos: 'bomb',
            ransomware: 'lock',
            'data-breach': 'database',
            'insider-threat': 'user-secret'
        };
        return icons[type] || 'exclamation-triangle';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    initializeAIAssistant() {
        const aiBtn = document.getElementById('aiAssistantBtn');
        const aiChat = document.getElementById('aiAssistantChat');
        const closeBtn = document.getElementById('closeAiAssistant');
        const chatForm = document.getElementById('aiChatForm');
        const userInput = document.getElementById('aiUserInput');

        if (aiBtn) {
            aiBtn.addEventListener('click', () => {
                aiChat.style.display = aiChat.style.display === 'none' ? 'flex' : 'none';
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                aiChat.style.display = 'none';
            });
        }

        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const message = userInput.value.trim();
                if (message) {
                    await this.handleAIMessage(message);
                    userInput.value = '';
                }
            });
        }
    }

    async handleAIMessage(message) {
        const chatBody = document.getElementById('aiChatBody');
        if (!chatBody) return;

        // Add user message
        this.addAIMessage(message, 'user');

        // Show typing indicator
        this.showAITyping();

        // Simulate AI response
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Hide typing indicator and show response
        this.hideAITyping();
        const response = await this.generateAIResponse(message);
        this.addAIMessage(response, 'assistant');
    }

    addAIMessage(message, sender) {
        const chatBody = document.getElementById('aiChatBody');
        if (!chatBody) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${sender}`;
        
        messageDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="ai-bubble">
                <div class="ai-message-content">${message}</div>
            </div>
        `;

        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    showAITyping() {
        const chatBody = document.getElementById('aiChatBody');
        if (!chatBody) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-message-assistant ai-typing';
        typingDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-bubble">
                <div class="ai-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        chatBody.appendChild(typingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    hideAITyping() {
        const typingMessage = document.querySelector('.ai-typing');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    async generateAIResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('threat') || lowerMessage.includes('attack')) {
            return `Based on current threat intelligence, I've identified several key patterns:
            
            • **Phishing campaigns** targeting banking sector increased by 23% this week
            • **Ransomware activity** detected in 3 new variants across East Africa
            • **Command & Control** servers identified in suspicious network traffic
            
            Would you like me to provide detailed IOCs or recommend specific countermeasures?`;
        }
        
        if (lowerMessage.includes('incident') || lowerMessage.includes('response')) {
            return `For incident response, I recommend following our NIST-based framework:
            
            1. **Preparation** - Ensure response team is ready
            2. **Detection & Analysis** - Validate and categorize the incident
            3. **Containment** - Isolate affected systems
            4. **Eradication** - Remove threat from environment
            5. **Recovery** - Restore systems to normal operation
            6. **Lessons Learned** - Document and improve processes
            
            Current active incidents require immediate attention. Shall I prioritize them by severity?`;
        }
        
        if (lowerMessage.includes('malware') || lowerMessage.includes('virus')) {
            return `Current malware analysis shows:
            
            • **45% Trojans** - Primarily banking trojans and info stealers
            • **28% Ransomware** - New variants of Conti and LockBit families
            • **18% Spyware** - Mobile and desktop surveillance tools
            • **9% Adware** - Potentially unwanted programs
            
            I can provide detailed analysis of any specific samples. Upload them to our sandbox for automated analysis.`;
        }
        
        if (lowerMessage.includes('network') || lowerMessage.includes('traffic')) {
            return `Network traffic analysis reveals:
            
            • **Inbound**: 2.4 GB/s (↑12% from baseline)
            • **Outbound**: 1.8 GB/s (↓5% from baseline)
            • **Blocked connections**: 15,247 (↑23% suspicious activity)
            
            Anomalous patterns detected in Kenya and Tanzania regions. Recommend immediate investigation of C2 communications.`;
        }
        
        return `I understand you're asking about "${message}". As your AI security assistant, I can help with:
        
        • **Threat Analysis** - IOC enrichment and correlation
        • **Incident Response** - Step-by-step guidance
        • **Malware Analysis** - Behavioral and static analysis
        • **Network Security** - Traffic analysis and anomaly detection
        • **Risk Assessment** - Vulnerability prioritization
        
        What specific area would you like to explore further?`;
    }

    initializeTools() {
        const toolButtons = document.querySelectorAll('[data-tool]');
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tool = button.getAttribute('data-tool');
                this.switchTool(tool);
            });
        });
    }

    switchTool(toolName) {
        // Update active button
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${toolName}"]`).classList.add('active');

        // Show corresponding tool panel
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${toolName}-tool`).classList.add('active');

        this.currentTool = toolName;
    }

    async setupEventListeners() {
        // Fullscreen toggle
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // Feed pause/resume
        const pauseFeedBtn = document.getElementById('pauseFeed');
        if (pauseFeedBtn) {
            pauseFeedBtn.addEventListener('click', () => {
                this.toggleFeedPause();
            });
        }

        // Refresh buttons
        const refreshButtons = document.querySelectorAll('[id$="Refresh"], [id^="refresh"]');
        refreshButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.refreshComponent(btn.id);
            });
        });

        // Emergency alert handlers
        const acknowledgeBtn = document.getElementById('acknowledgeAlert');
        const dismissBtn = document.getElementById('dismissAlert');
        
        if (acknowledgeBtn) {
            acknowledgeBtn.addEventListener('click', () => {
                this.acknowledgeEmergencyAlert();
            });
        }
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.dismissEmergencyAlert();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        this.isFullscreen = !this.isFullscreen;
        
        const icon = document.querySelector('#fullscreenBtn i');
        if (icon) {
            icon.className = this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
        }
    }

    toggleFeedPause() {
        this.feedPaused = !this.feedPaused;
        const btn = document.getElementById('pauseFeed');
        const icon = btn.querySelector('i');
        
        if (this.feedPaused) {
            icon.className = 'fas fa-play';
            this.showToast('Threat feed paused', 'info');
        } else {
            icon.className = 'fas fa-pause';
            this.showToast('Threat feed resumed', 'info');
        }
    }

    async refreshComponent(componentId) {
        const btn = document.getElementById(componentId);
        if (!btn) return;

        // Add loading state
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        try {
            // Simulate refresh operation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            switch (componentId) {
                case 'refreshAnalytics':
                    await this.refreshAnalytics();
                    break;
                default:
                    console.log(`Refreshing ${componentId}`);
            }
            
            this.showToast('Component refreshed', 'success');
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showToast('Refresh failed', 'error');
        } finally {
            // Restore button state
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }

    async refreshAnalytics() {
        // Update metrics
        this.updateMetrics();
        
        // Update charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.data) {
                chart.data.datasets.forEach(dataset => {
                    dataset.data = this.generateRandomData(dataset.data.length, 10, 200);
                });
                chart.update();
            }
        });
    }

    updateMetrics() {
        const metrics = {
            threatsDetected: Math.floor(Math.random() * 500) + 1000,
            threatsBlocked: Math.floor(Math.random() * 450) + 950,
            activeIncidents: Math.floor(Math.random() * 20) + 30,
            analystsOnline: Math.floor(Math.random() * 5) + 10
        };

        Object.entries(metrics).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                this.animateCounter(element, parseInt(element.textContent.replace(/,/g, '')), value);
            }
        });
    }

    animateCounter(element, start, end) {
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + F for fullscreen
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.toggleFullscreen();
        }
        
        // Ctrl/Cmd + R for refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshAnalytics();
        }
        
        // Escape to close modals/AI assistant
        if (e.key === 'Escape') {
            const aiChat = document.getElementById('aiAssistantChat');
            if (aiChat && aiChat.style.display !== 'none') {
                aiChat.style.display = 'none';
            }
        }
        
        // Space to pause/resume feed
        if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.toggleFeedPause();
        }
    }

    handleWindowResize() {
        // Resize charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
        
        // Resize map
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    async initializeWebSocket() {
        try {
            // In a real application, this would connect to your WebSocket server
            // For demo purposes, we'll simulate WebSocket events
            this.simulateWebSocketConnection();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.showToast('Real-time updates unavailable', 'warning');
        }
    }
    simulateWebSocketConnection() {
        console.log('Simulating WebSocket connection...');
        
        // Simulate periodic threat updates
        setInterval(() => {
            if (!this.feedPaused) {
                this.addLiveThreatUpdate();
            }
        }, 3000);
        
        // Simulate alert updates
        setInterval(() => {
            this.updateAlertCounts();
        }, 5000);
        
        // Simulate system health updates
        setInterval(() => {
            this.updateSystemHealth();
        }, 10000);
        
        // Simulate emergency alerts (rare)
        setInterval(() => {
            if (Math.random() < 0.05) { // 5% chance every 30 seconds
                this.triggerEmergencyAlert();
            }
        }, 30000);
    }

    addLiveThreatUpdate() {
        const feedContainer = document.getElementById('liveThreatFeed');
        if (!feedContainer) return;

        const threats = [
            { type: 'Phishing', source: 'Kenya', severity: 'high', target: 'Banking Sector' },
            { type: 'Malware', source: 'Tanzania', severity: 'critical', target: 'Government' },
            { type: 'DDoS', source: 'Uganda', severity: 'medium', target: 'E-commerce' },
            { type: 'Ransomware', source: 'Rwanda', severity: 'critical', target: 'Healthcare' },
            { type: 'Data Breach', source: 'Ethiopia', severity: 'high', target: 'Education' },
            { type: 'Insider Threat', source: 'Somalia', severity: 'medium', target: 'Finance' }
        ];

        const threat = threats[Math.floor(Math.random() * threats.length)];
        const timestamp = new Date().toLocaleTimeString();

        const threatElement = document.createElement('div');
        threatElement.className = 'threat-item';
        threatElement.innerHTML = `
            <div class="threat-time">${timestamp}</div>
            <div class="threat-details">
                <div class="threat-type-badge ${threat.severity}">
                    <i class="fas fa-${this.getThreatIcon(threat.type.toLowerCase())}"></i>
                    ${threat.type}
                </div>
                <div class="threat-info">
                    <strong>${threat.source}</strong> - ${threat.target}
                    <div class="threat-severity ${threat.severity}">${threat.severity.toUpperCase()}</div>
                </div>
            </div>
            <div class="threat-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="socDashboard.investigateThreat('${threat.type}', '${threat.source}')">
                    <i class="fas fa-search"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="socDashboard.blockThreat('${threat.type}', '${threat.source}')">
                    <i class="fas fa-shield-alt"></i>
                </button>
            </div>
        `;

        // Add animation
        threatElement.style.opacity = '0';
        threatElement.style.transform = 'translateX(100%)';
        
        feedContainer.insertBefore(threatElement, feedContainer.firstChild);
        
        // Animate in
        setTimeout(() => {
            threatElement.style.transition = 'all 0.3s ease';
            threatElement.style.opacity = '1';
            threatElement.style.transform = 'translateX(0)';
        }, 10);

        // Remove old items (keep only last 10)
        const items = feedContainer.querySelectorAll('.threat-item');
        if (items.length > 10) {
            for (let i = 10; i < items.length; i++) {
                items[i].style.transition = 'all 0.3s ease';
                items[i].style.opacity = '0';
                items[i].style.transform = 'translateX(-100%)';
                setTimeout(() => items[i].remove(), 300);
            }
        }
    }

    updateAlertCounts() {
        const criticalAlerts = document.getElementById('criticalAlerts');
        const highAlerts = document.getElementById('highAlerts');
        const mediumAlerts = document.getElementById('mediumAlerts');

        if (criticalAlerts) {
            const newCount = Math.max(0, parseInt(criticalAlerts.textContent) + (Math.random() > 0.7 ? 1 : -1));
            criticalAlerts.textContent = newCount;
        }

        if (highAlerts) {
            const newCount = Math.max(0, parseInt(highAlerts.textContent) + (Math.random() > 0.6 ? 1 : -1));
            highAlerts.textContent = newCount;
        }

        if (mediumAlerts) {
            const newCount = Math.max(0, parseInt(mediumAlerts.textContent) + (Math.random() > 0.5 ? 1 : -1));
            mediumAlerts.textContent = newCount;
        }

        this.updatePriorityAlerts();
    }

    updatePriorityAlerts() {
        const alertsContainer = document.getElementById('priorityAlerts');
        if (!alertsContainer) return;

        const alerts = [
            {
                severity: 'critical',
                title: 'Advanced Persistent Threat Detected',
                description: 'Suspicious lateral movement detected in Kenya government network',
                time: '2 min ago',
                source: 'AI Detection Engine'
            },
            {
                severity: 'high',
                title: 'Ransomware Campaign Active',
                description: 'New variant targeting healthcare facilities across East Africa',
                time: '5 min ago',
                source: 'Threat Intelligence'
            },
            {
                severity: 'high',
                title: 'Credential Stuffing Attack',
                description: 'Large-scale login attempts against banking portals',
                time: '8 min ago',
                source: 'Network Monitor'
            },
            {
                severity: 'medium',
                title: 'Phishing Campaign Detected',
                description: 'COVID-19 themed phishing emails targeting businesses',
                time: '12 min ago',
                source: 'Email Security'
            },
            {
                severity: 'medium',
                title: 'Suspicious DNS Activity',
                description: 'Unusual DNS queries to known malicious domains',
                time: '15 min ago',
                source: 'DNS Monitor'
            }
        ];

        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.severity}">
                <div class="alert-severity">
                    <i class="fas fa-${alert.severity === 'critical' ? 'exclamation-triangle' : 
                                      alert.severity === 'high' ? 'exclamation-circle' : 'info-circle'}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-description">${alert.description}</div>
                    <div class="alert-meta">
                        <span class="alert-time">${alert.time}</span>
                        <span class="alert-source">${alert.source}</span>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="socDashboard.viewAlert('${alert.title}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="socDashboard.acknowledgeAlert('${alert.title}')">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateSystemHealth() {
        const healthMetrics = ['CPU Usage', 'Memory', 'Network', 'Database'];
        
        healthMetrics.forEach(metric => {
            const progressBar = document.querySelector(`.health-item:has(.health-label:contains("${metric}")) .progress-bar`);
            const valueText = document.querySelector(`.health-item:has(.health-label:contains("${metric}")) .value-text`);
            
            if (progressBar && valueText) {
                const newValue = Math.floor(Math.random() * 40) + 30; // 30-70%
                progressBar.style.width = `${newValue}%`;
                valueText.textContent = `${newValue}%`;
                
                // Update color based on value
                progressBar.className = 'progress-bar';
                if (newValue > 80) {
                    progressBar.classList.add('bg-danger');
                } else if (newValue > 60) {
                    progressBar.classList.add('bg-warning');
                } else {
                    progressBar.classList.add('bg-success');
                }
            }
        });

        // Update last update time
        const lastUpdateElement = document.getElementById('lastUpdateTime');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString();
        }
    }

    triggerEmergencyAlert() {
        const emergencyMessages = [
            'CRITICAL: Coordinated cyber attack detected across multiple African nations',
            'ALERT: Zero-day exploit being actively used in ransomware campaigns',
            'WARNING: State-sponsored APT group targeting critical infrastructure',
            'URGENT: Massive data breach affecting government databases',
            'CRITICAL: Botnet command and control servers activated in region'
        ];

        const message = emergencyMessages[Math.floor(Math.random() * emergencyMessages.length)];
        this.showEmergencyAlert(message);
    }

    showEmergencyAlert(message) {
        const alertElement = document.getElementById('emergencyAlert');
        const alertText = document.getElementById('emergencyAlertText');
        
        if (alertElement && alertText) {
            alertText.textContent = message;
            alertElement.style.display = 'block';
            
            // Auto-dismiss after 30 seconds if not acknowledged
            setTimeout(() => {
                if (alertElement.style.display !== 'none') {
                    this.dismissEmergencyAlert();
                }
            }, 30000);
        }
    }

    acknowledgeEmergencyAlert() {
        const alertElement = document.getElementById('emergencyAlert');
        if (alertElement) {
            alertElement.style.display = 'none';
            this.showToast('Emergency alert acknowledged', 'info');
            
            // Log acknowledgment (in real app, this would go to server)
            console.log('Emergency alert acknowledged by user at', new Date().toISOString());
        }
    }

    dismissEmergencyAlert() {
        const alertElement = document.getElementById('emergencyAlert');
        if (alertElement) {
            alertElement.style.display = 'none';
        }
    }

    async startRealTimeUpdates() {
        // Update time every second
        this.updateIntervals.time = setInterval(() => {
            this.updateCurrentTime();
        }, 1000);

        // Update metrics every 30 seconds
        this.updateIntervals.metrics = setInterval(() => {
            this.updateMetrics();
        }, 30000);

        // Update charts every 60 seconds
        this.updateIntervals.charts = setInterval(() => {
            this.updateCharts();
        }, 60000);

        // Update threat map every 2 minutes
        this.updateIntervals.map = setInterval(() => {
            this.refreshThreatMap();
        }, 120000);
    }

    updateCurrentTime() {
        const timeElements = document.querySelectorAll('.current-time');
        const currentTime = new Date().toLocaleTimeString();
        
        timeElements.forEach(element => {
            element.textContent = currentTime;
        });
    }

    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.data) {
                // Shift data for timeline charts
                if (chart.config.type === 'line') {
                    chart.data.datasets.forEach(dataset => {
                        dataset.data.shift();
                        dataset.data.push(Math.floor(Math.random() * 100) + 50);
                    });
                    chart.update('none');
                }
            }
        });
    }

    async loadInitialData() {
        try {
            // Load incident data
            this.loadIncidentTableData();
            
            // Initialize live feeds
            this.initializeLiveFeeds();
            
            // Load system status
            this.updateSystemHealth();
            
            // Update metrics
            this.updateMetrics();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    initializeLiveFeeds() {
        // Initialize with some sample data
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.addLiveThreatUpdate();
            }, i * 500);
        }
        
        this.updatePriorityAlerts();
    }

    // Utility methods
    generateTimeLabels(count) {
        const labels = [];
        const now = new Date();
        
        for (let i = count - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
            labels.push(time.getHours().toString().padStart(2, '0') + ':00');
        }
        
        return labels;
    }

    generateRandomData(count, min = 0, max = 100) {
        return Array.from({ length: count }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastElement = document.createElement('div');
        toastElement.className = `toast ${type}`;
        toastElement.id = toastId;
        toastElement.innerHTML = `
            <div class="toast-header">
                <i class="fas fa-${this.getToastIcon(type)} me-2"></i>
                <strong class="me-auto">SOC Alert</strong>
                <small class="text-muted">now</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;

        toastContainer.appendChild(toastElement);

        // Initialize and show toast
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        errorDiv.style.cssText = 'top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 300px;';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }

    // Public methods for UI interactions
    async viewIncident(incidentId) {
        try {
            this.showToast(`Loading incident ${incidentId}...`, 'info');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // In a real app, this would open a detailed incident view
            console.log(`Viewing incident: ${incidentId}`);
            this.showToast(`Incident ${incidentId} details loaded`, 'success');
            
        } catch (error) {
            console.error('Failed to load incident:', error);
            this.showToast('Failed to load incident details', 'error');
        }
    }

    async updateIncidentStatus(incidentId) {
        try {
            this.showToast(`Updating incident ${incidentId}...`, 'info');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update UI
            const row = document.querySelector(`tr:has(td:first-child:contains("${incidentId}"))`);
            if (row) {
                const statusCell = row.querySelector('.status-badge');
                if (statusCell) {
                    statusCell.textContent = 'IN PROGRESS';
                    statusCell.className = 'status-badge in-progress';
                }
            }
            
            this.showToast(`Incident ${incidentId} status updated`, 'success');
            
        } catch (error) {
            console.error('Failed to update incident:', error);
            this.showToast('Failed to update incident status', 'error');
        }
    }

    async investigateThreat(threatType, source) {
        try {
            this.showToast(`Investigating ${threatType} from ${source}...`, 'info');
            
            // Simulate investigation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Show investigation results
            const results = this.generateInvestigationResults(threatType, source);
            this.showInvestigationModal(results);
            
        } catch (error) {
            console.error('Investigation failed:', error);
            this.showToast('Investigation failed', 'error');
        }
    }

    async blockThreat(threatType, source) {
        try {
            this.showToast(`Blocking ${threatType} from ${source}...`, 'info');
            
            // Simulate blocking action
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update metrics
            const blockedElement = document.getElementById('threatsBlocked');
            if (blockedElement) {
                const currentCount = parseInt(blockedElement.textContent.replace(/,/g, ''));
                this.animateCounter(blockedElement, currentCount, currentCount + 1);
            }
            
            this.showToast(`${threatType} from ${source} blocked successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to block threat:', error);
            this.showToast('Failed to block threat', 'error');
        }
    }

    generateInvestigationResults(threatType, source) {
        return {
            threatType,
            source,
            riskLevel: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
            iocs: [
                '192.168.1.100',
                'malicious-domain.com',
                'SHA256: a1b2c3d4e5f6...',
                'suspicious.exe'
            ],
            recommendations: [
                'Block source IP addresses',
                'Update firewall rules',
                'Scan affected systems',
                'Monitor for lateral movement'
            ],
            relatedIncidents: [
                '#INC-2025-001',
                '#INC-2025-003'
            ]
        };
    }

    showInvestigationModal(results) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('investigationModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'investigationModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark">
                        <div class="modal-header">
                            <h5 class="modal-title">Threat Investigation Results</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="investigationModalBody">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="socDashboard.exportInvestigation()">Export Report</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Update modal content
        const modalBody = document.getElementById('investigationModalBody');
        modalBody.innerHTML = `
            <div class="investigation-results">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6>Threat Details</h6>
                        <p><strong>Type:</strong> ${results.threatType}</p>
                        <p><strong>Source:</strong> ${results.source}</p>
                        <p><strong>Risk Level:</strong> <span class="badge bg-${results.riskLevel.toLowerCase()}">${results.riskLevel}</span></p>
                    </div>
                    <div class="col-md-6">
                        <h6>Investigation Status</h6>
                        <p><strong>Status:</strong> <span class="text-success">Completed</span></p>
                        <p><strong>Analyst:</strong> AI Investigation Engine</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6>Indicators of Compromise</h6>
                        <ul class="list-unstyled">
                            ${results.iocs.map(ioc => `<li><code>${ioc}</code></li>`).join('')}
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6>Recommendations</h6>
                        <ul>
                            ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-12">
                        <h6>Related Incidents</h6>
                        <div class="d-flex gap-2">
                            ${results.relatedIncidents.map(incident => 
                                `<span class="badge bg-secondary">${incident}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    async exportInvestigation() {
        try {
            this.showToast('Generating investigation report...', 'info');
            
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // In a real app, this would generate and download a PDF/CSV
            const reportData = {
                timestamp: new Date().toISOString(),
                investigator: 'AI Investigation Engine',
                findings: 'Detailed investigation results...'
            };
            
            console.log('Investigation report:', reportData);
            this.showToast('Investigation report generated', 'success');
            
        } catch (error) {
            console.error('Failed to export investigation:', error);
            this.showToast('Failed to generate report', 'error');
        }
    }

    async viewAlert(alertTitle) {
        this.showToast(`Loading alert: ${alertTitle}`, 'info');
        // Implementation for viewing alert details
    }

    async acknowledgeAlert(alertTitle) {
        this.showToast(`Alert acknowledged: ${alertTitle}`, 'success');
        // Implementation for acknowledging alert
    }

    // Cleanup method
    destroy() {
        // Clear all intervals
        Object.values(this.updateIntervals).forEach(interval => {
            clearInterval(interval);
        });

        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });

        // Close WebSocket connection
        if (this.socket) {
            this.socket.close();
        }

        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        window.removeEventListener('resize', this.handleWindowResize);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.socDashboard = new SOCDashboard();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.socDashboard) {
        window.socDashboard.destroy();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SOCDashboard;
}

