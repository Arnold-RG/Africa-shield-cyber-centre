class DashboardReportsManager {
    constructor(reportDatabase) {
        this.reportDB = reportDatabase;
        this.currentFilters = {};
        this.currentPage = 1;
        this.reportsPerPage = 20;
        this.sortBy = 'timestamp';
        this.sortOrder = 'desc';
        this.socMode = false; // Toggle between regular reports and SOC incidents
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadReports();
        this.setupRealTimeUpdates();
        this.initializeSOCModule();
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('countryFilter')?.addEventListener('change', (e) => {
            this.currentFilters.country = e.target.value;
            this.applyFilters();
        });

        document.getElementById('priorityFilter')?.addEventListener('change', (e) => {
            this.currentFilters.priority = e.target.value;
            this.applyFilters();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('threatTypeFilter')?.addEventListener('change', (e) => {
            this.currentFilters.threatType = e.target.value;
            this.applyFilters();
        });

        // Date range filters
        document.getElementById('dateFromFilter')?.addEventListener('change', (e) => {
            this.currentFilters.dateFrom = e.target.value;
            this.applyFilters();
        });

        document.getElementById('dateToFilter')?.addEventListener('change', (e) => {
            this.currentFilters.dateTo = e.target.value;
            this.applyFilters();
        });

        // Search
        document.getElementById('reportsSearch')?.addEventListener('input', 
            this.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300)
        );

        // SOC Mode Toggle
        document.getElementById('socModeToggle')?.addEventListener('change', (e) => {
            this.socMode = e.target.checked;
            this.toggleSOCMode();
        });

        // Sort controls
        document.getElementById('sortBySelect')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.loadReports();
        });

        document.getElementById('sortOrderSelect')?.addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.loadReports();
        });

        // Pagination
        document.getElementById('reportsPerPageSelect')?.addEventListener('change', (e) => {
            this.reportsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadReports();
        });

        // Export buttons
        document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
            this.exportReports('json');
        });

        document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
            this.exportReports('csv');
        });

        document.getElementById('exportXmlBtn')?.addEventListener('click', () => {
            this.exportReports('xml');
        });

        // Bulk actions
        document.getElementById('selectAllReports')?.addEventListener('change', (e) => {
            this.selectAllReports(e.target.checked);
        });

        document.getElementById('bulkUpdateStatusBtn')?.addEventListener('click', () => {
            this.showBulkUpdateModal();
        });

        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
            this.showBulkDeleteModal();
        });

        // Refresh button
        document.getElementById('refreshReportsBtn')?.addEventListener('click', () => {
            this.loadReports();
        });

        // SOC specific controls
        document.getElementById('createIncidentBtn')?.addEventListener('click', () => {
            this.showCreateIncidentModal();
        });

        document.getElementById('threatHuntBtn')?.addEventListener('click', () => {
            this.initiateThreatHunt();
        });

        document.getElementById('escalateIncidentBtn')?.addEventListener('click', () => {
            this.escalateSelectedIncidents();
        });
    }

    async loadReports() {
        try {
            this.showLoadingSpinner();
            
            let data;
            if (this.socMode) {
                data = await this.reportDB.getSOCIncidents(this.currentFilters);
            } else {
                data = await this.reportDB.getAllReports(this.currentFilters);
            }
            
            const sortedData = this.sortReports(data);
            const paginatedData = this.paginateReports(sortedData);
            
            if (this.socMode) {
                this.displaySOCIncidents(paginatedData);
            } else {
                this.displayReports(paginatedData);
            }
            
            this.updatePagination(sortedData.length);
            this.updateReportsStats(data);
            
            this.hideLoadingSpinner();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data');
            this.hideLoadingSpinner();
        }
    }

    initializeSOCModule() {
        // Add SOC-specific UI elements
        this.addSOCControls();
        this.setupSOCDashboard();
        this.initializeSOCCharts();
        this.startSOCMonitoring();
    }

    addSOCControls() {
        const controlsContainer = document.querySelector('.dashboard-controls');
        if (controlsContainer) {
            const socControls = document.createElement('div');
            socControls.className = 'soc-controls mb-3';
            socControls.innerHTML = `
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="socModeToggle">
                            <label class="form-check-label" for="socModeToggle">
                                <i class="fas fa-shield-alt me-2"></i>SOC Mode
                            </label>
                        </div>
                    </div>
                    <div class="col-md-6 text-end">
                        <div class="btn-group" id="socActionButtons" style="display: none;">
                            <button class="btn btn-primary btn-sm" id="createIncidentBtn">
                                <i class="fas fa-plus me-1"></i>Create Incident
                            </button>
                            <button class="btn btn-warning btn-sm" id="threatHuntBtn">
                                <i class="fas fa-search me-1"></i>Threat Hunt
                            </button>
                            <button class="btn btn-danger btn-sm" id="escalateIncidentBtn">
                                <i class="fas fa-arrow-up me-1"></i>Escalate
                            </button>
                        </div>
                    </div>
                </div>
            `;
            controlsContainer.prepend(socControls);
        }
    }

    setupSOCDashboard() {
        // Add SOC metrics dashboard
        const dashboardContainer = document.querySelector('.dashboard-section');
        if (dashboardContainer) {
            const socDashboard = document.createElement('div');
            socDashboard.id = 'socDashboard';
            socDashboard.style.display = 'none';
            socDashboard.innerHTML = `
                <div class="row mb-4">
                    <div class="col-lg-3 col-md-6 mb-3">
                        <div class="card bg-danger text-white">
                            <div class="card-body text-center">
                                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                                <h4 id="criticalIncidents">0</h4>
                                <small>Critical Incidents</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6 mb-3">
                        <div class="card bg-warning text-white">
                            <div class="card-body text-center">
                                <i class="fas fa-clock fa-2x mb-2"></i>
                                <h4 id="avgResponseTime">0m</h4>
                                <small>Avg Response Time</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6 mb-3">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <i class="fas fa-check-circle fa-2x mb-2"></i>
                                <h4 id="resolvedIncidents">0</h4>
                                <small>Resolved Today</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6 mb-3">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <i class="fas fa-shield-alt fa-2x mb-2"></i>
                                <h4 id="threatsBlocked">0</h4>
                                <small>Threats Blocked</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mb-4">
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Incident Severity Distribution</h6>
                            </div>
                            <div class="card-body">
                                <canvas id="socSeverityChart" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Response Time Trends</h6>
                            </div>
                            <div class="card-body">
                                <canvas id="socResponseChart" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-search me-2"></i>Threat Intelligence Feed
                        </h6>
                    </div>
                    <div class="card-body">
                        <div id="threatIntelFeed">
                            <!-- Threat intelligence data will be populated here -->
                        </div>
                    </div>
                </div>
            `;
            dashboardContainer.prepend(socDashboard);
        }
    }

    toggleSOCMode() {
        const socDashboard = document.getElementById('socDashboard');
        const socActionButtons = document.getElementById('socActionButtons');
        const regularReportsSection = document.querySelector('.reports-section');

        if (this.socMode) {
            socDashboard.style.display = 'block';
            socActionButtons.style.display = 'block';
            if (regularReportsSection) regularReportsSection.style.display = 'none';
            this.updateSOCMetrics();
        } else {
            socDashboard.style.display = 'none';
            socActionButtons.style.display = 'none';
            if (regularReportsSection) regularReportsSection.style.display = 'block';
        }

        this.loadReports();
    }

    displaySOCIncidents(incidents) {
        const tableBody = document.querySelector('#reportsTable tbody');
        if (!tableBody) return;

        // Update table headers for SOC mode
        const tableHeader = document.querySelector('#reportsTable thead tr');
        if (tableHeader) {
            tableHeader.innerHTML = `
                <th><input type="checkbox" id="selectAllReports" class="form-check-input"></th>
                <th>Incident ID</th>
                <th>Severity</th>
                <th>Category</th>
                <th>Source IP</th>
                <th>Target IP</th>
                <th>Analyst</th>
                <th>Status</th>
                <th>Detection Time</th>
                <th>Actions</th>
            `;
        }

        tableBody.innerHTML = '';

        if (incidents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-4">
                        <div class="text-muted">
                            <i class="fas fa-shield-alt fa-3x mb-3"></i>
                            <h5>No SOC Incidents Found</h5>
                            <p>No incidents match your current filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        incidents.forEach(incident => {
            const row = document.createElement('tr');
            row.className = 'incident-row';
            row.setAttribute('data-incident-id', incident.id);
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="form-check-input incident-checkbox" 
                           value="${incident.id}" onchange="dashboardReports.updateBulkActions()">
                </td>
                <td>
                    <div class="incident-id-cell">
                        <strong>${incident.incidentId}</strong>
                        <br><small class="text-muted">${this.formatDate(incident.detectionTime)}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getSeverityColor(incident.severity)} severity-badge">
                        <i class="fas fa-${this.getSeverityIcon(incident.severity)} me-1"></i>
                        ${incident.severity}
                    </span>
                </td>
                <td>
                    <div class="category-cell">
                        <strong>${incident.category}</strong>
                        <br><small class="text-muted">${incident.attackVector || 'Unknown vector'}</small>
                    </div>
                </td>
                <td>
                    <code class="source-ip">${incident.sourceIp}</code>
                </td>
                <td>
                    <code class="target-ip">${incident.targetIp}</code>
                </td>
                <td>
                    <div class="analyst-cell">
                        ${incident.analystAssigned ? `
                            <i class="fas fa-user-circle me-1"></i>
                            ${incident.analystAssigned}
                        ` : `
                            <span class="text-muted">
                                <i class="fas fa-user-slash me-1"></i>
                                Unassigned
                            </span>
                        `}
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getIncidentStatusColor(incident.status)} status-badge">
                        <i class="fas fa-${this.getIncidentStatusIcon(incident.status)} me-1"></i>
                        ${incident.status}
                    </span>
                </td>
                <td>
                    <div class="time-cell">
                        ${this.formatDateTime(incident.detectionTime)}
                        ${incident.responseTime ? `
                            <br><small class="text-success">
                                <i class="fas fa-clock me-1"></i>
                                Response: ${this.calculateResponseTime(incident.detectionTime, incident.responseTime)}
                            </small>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" 
                                onclick="dashboardReports.viewIncident(${incident.id})" 
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" 
                                onclick="dashboardReports.assignIncident(${incident.id})" 
                                title="Assign Analyst">
                            <i class="fas fa-user-plus"></i>
                        </button>
                        <button class="btn btn-outline-success" 
                                onclick="dashboardReports.updateIncidentStatus(${incident.id})" 
                                title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" 
                                onclick="dashboardReports.escalateIncident(${incident.id})" 
                                title="Escalate">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                    </div>
                </td>
            `;

            // Add severity-based row styling
            row.classList.add(`severity-${incident.severity.toLowerCase()}`);
            
            // Add blinking effect for critical incidents
            if (incident.severity === 'Critical' && incident.status === 'New') {
                row.classList.add('critical-new-incident');
            }

            tableBody.appendChild(row);
        });
    }

    async updateSOCMetrics() {
        try {
            const incidents = await this.reportDB.getSOCIncidents();
            
            const metrics = {
                critical: incidents.filter(i => i.severity === 'Critical').length,
                resolved: incidents.filter(i => i.status === 'Resolved').length,
                avgResponseTime: this.calculateAverageResponseTime(incidents),
                threatsBlocked: Math.floor(Math.random() * 100) + 50 // Simulated
            };

            // Update metric cards
            document.getElementById('criticalIncidents').textContent = metrics.critical;
            document.getElementById('resolvedIncidents').textContent = metrics.resolved;
            document.getElementById('avgResponseTime').textContent = metrics.avgResponseTime;
            document.getElementById('threatsBlocked').textContent = metrics.threatsBlocked;

            // Update threat intelligence feed
            this.updateThreatIntelFeed();

        } catch (error) {
            console.error('Error updating SOC metrics:', error);
        }
    }

    calculateAverageResponseTime(incidents) {
        const respondedIncidents = incidents.filter(i => i.responseTime);
        if (respondedIncidents.length === 0) return '0m';

        const totalResponseTime = respondedIncidents.reduce((sum, incident) => {
            const detection = new Date(incident.detectionTime);
            const response = new Date(incident.responseTime);
            return sum + (response - detection);
        }, 0);

        const avgMs = totalResponseTime / respondedIncidents.length;
        const avgMinutes = Math.round(avgMs / (1000 * 60));
        
        return avgMinutes < 60 ? `${avgMinutes}m` : `${Math.round(avgMinutes / 60)}h`;
    }

    calculateResponseTime(detectionTime, responseTime) {
        const detection = new Date(detectionTime);
        const response = new Date(responseTime);
        const diffMs = response - detection;
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        
        return diffMinutes < 60 ? `${diffMinutes}m` : `${Math.round(diffMinutes / 60)}h`;
    }

    async updateThreatIntelFeed() {
        const feedContainer = document.getElementById('threatIntelFeed');
        if (!feedContainer) return;

        // Simulated threat intelligence data
        const threatIntel = [
            {
                type: 'IP Address',
                value: '203.0.113.45',
                threat: 'Phishing Campaign',
                confidence: 'High',
                source: 'Community Reports',
                timestamp: new Date(Date.now() - 300000).toISOString()
            },
            {
                type: 'Domain',
                value: 'fake-mpesa.com',
                threat: 'Mobile Money Fraud',
                confidence: 'High',
                source: 'SOC Analysis',
                timestamp: new Date(Date.now() - 600000).toISOString()
            },
            {
                type: 'Hash',
                value: 'd41d8cd98f00b204e9800998ecf8427e',
                threat: 'Banking Trojan',
                confidence: 'Medium',
                source: 'Threat Feed',
                timestamp: new Date(Date.now() - 900000).toISOString()
            }
        ];

        let feedHTML = '';
        threatIntel.forEach(intel => {
            feedHTML += `
                <div class="threat-intel-item border-start border-3 border-${this.getConfidenceColor(intel.confidence)} ps-3 mb-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">
                                <span class="badge bg-secondary me-2">${intel.type}</span>
                                <code>${intel.value}</code>
                            </h6>
                            <p class="mb-1 text-danger">
                                <i class="fas fa-exclamation-triangle me-1"></i>
                                ${intel.threat}
                            </p>
                            <small class="text-muted">
                                <i class="fas fa-source me-1"></i>
                                ${intel.source} • ${this.formatDateTime(intel.timestamp)}
                            </small>
                        </div>
                        <span class="badge bg-${this.getConfidenceColor(intel.confidence)}">
                            ${intel.confidence}
                        </span>
                    </div>
                </div>
            `;
        });

        feedContainer.innerHTML = feedHTML;
    }

    initializeSOCCharts() {
        // SOC Severity Distribution Chart
        const severityCtx = document.getElementById('socSeverityChart');
        if (severityCtx) {
            this.socSeverityChart = new Chart(severityCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Critical', 'High', 'Medium', 'Low'],
                    datasets: [{
                        data: [5, 12, 25, 8],
                        backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // SOC Response Time Chart
        const responseCtx = document.getElementById('socResponseChart');
        if (responseCtx) {
            this.socResponseChart = new Chart(responseCtx, {
                type: 'line',
                data: {
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    datasets: [{
                        label: 'Response Time (minutes)',
                        data: [18, 12, 15, 10, 14, 16],
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Minutes'
                            }
                        }
                    }
                }
            });
        }
    }

    startSOCMonitoring() {
        // Real-time SOC monitoring
        this.socMonitoringInterval = setInterval(() => {
            if (this.socMode) {
                this.updateSOCMetrics();
                this.checkForNewIncidents();
            }
        }, 15000); // Update every 15 seconds
    }

    checkForNewIncidents() {
        // Simulate new incident detection
        if (Math.random() < 0.05) { // 5% chance of new incident
            this.simulateNewIncident();
        }
    }

    async simulateNewIncident() {
        const incidentTypes = [
            'Malware Detection',
            'Phishing Campaign',
            'DDoS Attack',
            'Data Exfiltration',
            'Unauthorized Access'
        ];

        const severities = ['Low', 'Medium', 'High', 'Critical'];
        const sourceIPs = ['203.0.113.45', '198.51.100.23', '192.0.2.146'];

        const newIncident = {
            severity: severities[Math.floor(Math.random() * severities.length)],
            category: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
            sourceIp: sourceIPs[Math.floor(Math.random() * sourceIPs.length)],
            targetIp: '192.168.1.' + Math.floor(Math.random() * 255),
            attackVector: 'Automated detection',
            indicatorsOfCompromise: 'Suspicious network activity',
            affectedSystems: 'Workstation-' + Math.floor(Math.random() * 100),
            status: 'New',
            notes: 'Automatically generated incident'
        };

        try {
            await this.reportDB.addSOCIncident(newIncident);
            this.showIncidentAlert(newIncident);
            if (this.socMode) {
                this.loadReports();
            }
        } catch (error) {
            console.error('Error creating simulated incident:', error);
        }
    }

    showIncidentAlert(incident) {
        const alertHTML = `
            <div class="alert alert-${this.getSeverityColor(incident.severity)} alert-dismissible fade show incident-alert" role="alert">
                <div class="d-flex align-items-center">
                    <i class="fas fa-${this.getSeverityIcon(incident.severity)} fa-2x me-3"></i>
                    <div>
                        <h6 class="alert-heading mb-1">New ${incident.severity} Incident Detected</h6>
                        <p class="mb-1">${incident.category} from ${incident.sourceIp}</p>
                        <small>Target: ${incident.targetIp} • ${this.formatDateTime(new Date().toISOString())}</small>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Add to alerts container
        let alertsContainer = document.getElementById('incidentAlertsContainer');
        if (!alertsContainer) {
            alertsContainer = document.createElement('div');
            alertsContainer.id = 'incidentAlertsContainer';
            alertsContainer.className = 'position-fixed top-0 end-0 p-3';
            alertsContainer.style.zIndex = '9999';
            alertsContainer.style.maxWidth = '400px';
            document.body.appendChild(alertsContainer);
        }

        alertsContainer.insertAdjacentHTML('afterbegin', alertHTML);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            const alert = alertsContainer.querySelector('.incident-alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 10000);

        // Play alert sound for critical incidents
        if (incident.severity === 'Critical') {
            this.playAlertSound();
        }
    }

    playAlertSound() {
        // Create and play alert sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    async viewIncident(incidentId) {
        try {
            const incident = await this.reportDB.getSOCIncidentById(incidentId);
            if (!incident) {
                this.showError('Incident not found');
                return;
            }

            this.showIncidentDetailsModal(incident);
        } catch (error) {
            console.error('Error viewing incident:', error);
            this.showError('Failed to load incident details');
        }
    }

    showIncidentDetailsModal(incident) {
        const modalHTML = `
            <div class="modal fade" id="incidentDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-${this.getSeverityColor(incident.severity)} text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-${this.getSeverityIcon(incident.severity)} me-2"></i>
                                Incident Details - ${incident.incidentId}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Basic Information</h6>
                                    <table class="table table-sm">
                                        <tr><td><strong>Incident ID:</strong></td><td>${incident.incidentId}</td></tr>
                                        <tr><td><strong>Severity:</strong></td><td>
                                            <span class="badge bg-${this.getSeverityColor(incident.severity)}">
                                                ${incident.severity}
                                            </span>
                                        </td></tr>
                                        <tr><td><strong>Category:</strong></td><td>${incident.category}</td></tr>
                                        <tr><td><strong>Status:</strong></td><td>
                                            <span class="badge bg-${this.getIncidentStatusColor(incident.status)}">
                                                ${incident.status}
                                            </span>
                                        </td></tr>
                                        <tr><td><strong>Detection Time:</strong></td><td>${this.formatDateTime(incident.detectionTime)}</td></tr>
                                        <tr><td><strong>Analyst:</strong></td><td>${incident.analystAssigned || 'Unassigned'}</td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6>Technical Details</h6>
                                    <table class="table table-sm">
                                        <tr><td><strong>Source IP:</strong></td><td><code>${incident.sourceIp}</code></td></tr>
                                        <tr><td><strong>Target IP:</strong></td><td><code>${incident.targetIp}</code></td></tr>
                                        <tr><td><strong>Attack Vector:</strong></td><td>${incident.attackVector || 'Unknown'}</td></tr>
                                        <tr><td><strong>Affected Systems:</strong></td><td>${incident.affectedSystems || 'None specified'}</td></tr>
                                        <tr><td><strong>IOCs:</strong></td><td>${incident.indicatorsOfCompromise || 'None'}</td></tr>
                                    </table>
                                </div>
                            </div>
                            
                            <div class="row mt-4">
                                <div class="col-12">
                                    <h6>Timeline</h6>
                                    <div class="timeline">
                                        <div class="timeline-item">
                                            <div class="timeline-marker bg-danger">
                                                <i class="fas fa-exclamation-triangle"></i>
                                            </div>
                                            <div class="timeline-content">
                                                <h6>Incident Detected</h6>
                                                <p>${incident.category} detected from ${incident.sourceIp}</p>
                                                <small class="text-muted">${this.formatDateTime(incident.detectionTime)}</small>
                                            </div>
                                        </div>
                                        ${incident.responseTime ? `
                                            <div class="timeline-item">
                                                <div class="timeline-marker bg-warning">
                                                    <i class="fas fa-user"></i>
                                                </div>
                                                <div class="timeline-content">
                                                    <h6>Response Initiated</h6>
                                                    <p>Analyst ${incident.analystAssigned} began investigation</p>
                                                    <small class="text-muted">${this.formatDateTime(incident.responseTime)}</small>
                                                </div>
                                            </div>
                                        ` : ''}
                                        ${incident.resolutionTime ? `
                                            <div class="timeline-item">
                                                <div class="timeline-marker bg-success">
                                                    <i class="fas fa-check"></i>
                                                </div>
                                                <div class="timeline-content">
                                                    <h6>Incident Resolved</h6>
                                                    <p>${incident.notes || 'Incident successfully resolved'}</p>
                                                    <small class="text-muted">${this.formatDateTime(incident.resolutionTime)}</small>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>

                            ${incident.notes ? `
                                <div class="row mt-4">
                                    <div class="col-12">
                                        <h6>Notes</h6>
                                        <div class="bg-light p-3 rounded">
                                            ${incident.notes}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-warning" onclick="dashboardReports.assignIncident(${incident.id})">
                                <i class="fas fa-user-plus me-1"></i>Assign
                            </button>
                            <button type="button" class="btn btn-primary" onclick="dashboardReports.updateIncidentStatus(${incident.id})">
                                <i class="fas fa-edit me-1"></i>Update Status
                            </button>
                            <button type="button" class="btn btn-danger" onclick="dashboardReports.escalateIncident(${incident.id})">
                                <i class="fas fa-arrow-up me-1"></i>Escalate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('incidentDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM and show
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('incidentDetailsModal'));
        modal.show();
    }

    showCreateIncidentModal() {
        const modalHTML = `
            <div class="modal fade" id="createIncidentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-plus me-2"></i>Create New SOC Incident
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createIncidentForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Severity</label>
                                            <select class="form-select" name="severity" required>
                                                <option value="">Select Severity</option>
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Category</label>
                                            <select class="form-select" name="category" required>
                                                <option value="">Select Category</option>
                                                <option value="Malware Detection">Malware Detection</option>
                                                <option value="Phishing Campaign">Phishing Campaign</option>
                                                <option value="DDoS Attack">DDoS Attack</option>
                                                <option value="Data Exfiltration">Data Exfiltration</option>
                                                <option value="Unauthorized Access">Unauthorized Access</option>
                                                <option value="Insider Threat">Insider Threat</option>
                                                <option value="Network Intrusion">Network Intrusion</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Source IP</label>
                                            <input type="text" class="form-control" name="sourceIp" 
                                                   placeholder="e.g., 192.168.1.100" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Target IP</label>
                                            <input type="text" class="form-control" name="targetIp" 
                                                   placeholder="e.g., 10.0.0.50" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Attack Vector</label>
                                    <input type="text" class="form-control" name="attackVector" 
                                           placeholder="e.g., Email attachment, Web exploit">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Affected Systems</label>
                                    <input type="text" class="form-control" name="affectedSystems" 
                                           placeholder="e.g., Workstation-001, Server-DB">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Indicators of Compromise (IOCs)</label>
                                    <textarea class="form-control" name="indicatorsOfCompromise" rows="3"
                                              placeholder="File hashes, domains, IPs, etc."></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Initial Notes</label>
                                    <textarea class="form-control" name="notes" rows="3"
                                              placeholder="Initial observations and analysis"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="dashboardReports.saveNewIncident()">
                                <i class="fas fa-save me-1"></i>Create Incident
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('createIncidentModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM and show
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('createIncidentModal'));
        modal.show();
    }

    async saveNewIncident() {
        const form = document.getElementById('createIncidentForm');
        const formData = new FormData(form);
        
        const incident = {
            severity: formData.get('severity'),
            category: formData.get('category'),
            sourceIp: formData.get('sourceIp'),
            targetIp: formData.get('targetIp'),
            attackVector: formData.get('attackVector'),
            affectedSystems: formData.get('affectedSystems'),
            indicatorsOfCompromise: formData.get('indicatorsOfCompromise'),
            notes: formData.get('notes'),
            status: 'New'
        };

        try {
            await this.reportDB.addSOCIncident(incident);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createIncidentModal'));
            modal.hide();

            // Refresh incidents list
            if (this.socMode) {
                await this.loadReports();
            }

            this.showSuccess('SOC incident created successfully');
        } catch (error) {
            console.error('Error creating incident:', error);
            this.showError('Failed to create incident');
        }
    }

    initiateThreatHunt() {
        const huntModalHTML = `
            <div class="modal fade" id="threatHuntModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-search me-2"></i>Threat Hunting Session
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Threat hunting allows proactive searching for threats that may have evaded automated detection.
                            </div>
                            
                            <form id="threatHuntForm">
                                <div class="mb-3">
                                    <label class="form-label">Hunt Type</label>
                                    <select class="form-select" name="huntType" required>
                                        <option value="">Select Hunt Type</option>
                                        <option value="ioc_search">IOC Search</option>
                                        <option value="behavioral_analysis">Behavioral Analysis</option>
                                        <option value="network_analysis">Network Traffic Analysis</option>
                                        <option value="file_analysis">File Analysis</option>
                                        <option value="user_activity">User Activity Analysis</option>
                                    </select>