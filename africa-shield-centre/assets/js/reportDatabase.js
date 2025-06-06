// Enhanced Report Database with SOC Integration
class ReportDatabase {
    constructor() {
        this.dbName = 'AfricaShieldDB';
        this.version = 2;
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Reports store
                if (!db.objectStoreNames.contains('reports')) {
                    const reportsStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
                    reportsStore.createIndex('reportId', 'reportId', { unique: true });
                    reportsStore.createIndex('country', 'country', { unique: false });
                    reportsStore.createIndex('status', 'status', { unique: false });
                    reportsStore.createIndex('priority', 'priority', { unique: false });
                    reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // SOC Incidents store
                if (!db.objectStoreNames.contains('socIncidents')) {
                    const socStore = db.createObjectStore('socIncidents', { keyPath: 'id', autoIncrement: true });
                    socStore.createIndex('incidentId', 'incidentId', { unique: true });
                    socStore.createIndex('severity', 'severity', { unique: false });
                    socStore.createIndex('status', 'status', { unique: false });
                    socStore.createIndex('detectionTime', 'detectionTime', { unique: false });
                }

                // Threat Intelligence store
                if (!db.objectStoreNames.contains('threatIntel')) {
                    const threatStore = db.createObjectStore('threatIntel', { keyPath: 'id', autoIncrement: true });
                    threatStore.createIndex('iocType', 'iocType', { unique: false });
                    threatStore.createIndex('iocValue', 'iocValue', { unique: false });
                    threatStore.createIndex('confidenceLevel', 'confidenceLevel', { unique: false });
                }

                this.seedInitialData(db);
            };
        });
    }

    seedInitialData(db) {
        // Seed with sample reports
        const reportsData = [
            {
                reportId: 'RPT-2025-001',
                incidentTitle: 'Mobile Money Phishing Campaign',
                incidentDescription: 'Fraudulent SMS messages targeting M-Pesa users in Nairobi',
                reporterName: 'John Kamau',
                reporterEmail: 'john.kamau@email.com',
                reporterPhone: '+254712345678',
                country: 'Kenya',
                city: 'Nairobi',
                threatType: 'Phishing',
                priority: 'High',
                status: 'New',
                timestamp: new Date().toISOString(),
                incidentDate: new Date(Date.now() - 86400000).toISOString(),
                affectedSystems: ['Mobile Banking'],
                networkDetails: 'SMS gateway compromise suspected',
                deviceInfo: 'Android smartphone',
                ipAddresses: ['192.168.1.100'],
                domains: ['fake-mpesa.com'],
                financialImpact: '$5,000 estimated',
                dataCompromised: true,
                systemsAffected: 1,
                usersAffected: 150,
                immediateActions: 'Blocked suspicious domain',
                containmentMeasures: 'Notified telecom provider',
                recoverySteps: 'User awareness campaign planned',
                screenshots: [],
                logFiles: [],
                evidence: []
            },
            {
                reportId: 'RPT-2025-002',
                incidentTitle: 'Ransomware Attack on Hospital System',
                incidentDescription: 'Ransomware encrypted patient records at Kenyatta Hospital',
                reporterName: 'Dr. Sarah Mwangi',
                reporterEmail: 'sarah.mwangi@hospital.ke',
                reporterPhone: '+254722334455',
                country: 'Kenya',
                city: 'Nairobi',
                threatType: 'Ransomware',
                priority: 'Critical',
                status: 'In Progress',
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                incidentDate: new Date(Date.now() - 259200000).toISOString(),
                affectedSystems: ['Hospital Management System', 'Patient Records'],
                networkDetails: 'Network segmentation bypassed',
                deviceInfo: 'Windows Server 2019',
                ipAddresses: ['10.0.0.50', '10.0.0.51'],
                domains: [],
                financialImpact: '$50,000 estimated',
                dataCompromised: true,
                systemsAffected: 5,
                usersAffected: 500,
                immediateActions: 'Isolated affected systems',
                containmentMeasures: 'Activated backup systems',
                recoverySteps: 'Restoring from clean backups',
                assignedTo: 'jane.smith@africashield.org',
                screenshots: [],
                logFiles: ['security.log', 'system.log'],
                evidence: ['ransom_note.txt']
            }
        ];

        // SOC Incidents data
        const socIncidentsData = [
            {
                incidentId: 'SOC-2025-001',
                severity: 'Critical',
                category: 'Malware Detection',
                sourceIp: '203.0.113.45',
                targetIp: '192.168.1.100',
                attackVector: 'Email attachment',
                indicatorsOfCompromise: 'Hash: d41d8cd98f00b204e9800998ecf8427e',
                affectedSystems: 'Workstation-001',
                analystAssigned: 'John Doe',
                status: 'Investigating',
                detectionTime: new Date().toISOString(),
                responseTime: null,
                resolutionTime: null,
                notes: 'Suspicious executable detected by EDR'
            }
        ];

        // Threat Intelligence data
        const threatIntelData = [
            {
                threatType: 'Phishing',
                iocType: 'domain',
                iocValue: 'fake-mpesa.com',
                confidenceLevel: 'High',
                source: 'Community Reports',
                description: 'Fraudulent domain mimicking M-Pesa',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                isActive: true
            },
            {
                threatType: 'Malware',
                iocType: 'hash',
                iocValue: 'd41d8cd98f00b204e9800998ecf8427e',
                confidenceLevel: 'High',
                source: 'SOC Analysis',
                description: 'Banking trojan targeting East African banks',
                firstSeen: new Date(Date.now() - 86400000).toISOString(),
                lastSeen: new Date().toISOString(),
                isActive: true
            }
        ];

        // Add data to stores
        const transaction = db.transaction(['reports', 'socIncidents', 'threatIntel'], 'readwrite');
        
        reportsData.forEach(report => {
            transaction.objectStore('reports').add(report);
        });

        socIncidentsData.forEach(incident => {
            transaction.objectStore('socIncidents').add(incident);
        });

        threatIntelData.forEach(intel => {
            transaction.objectStore('threatIntel').add(intel);
        });
    }

    async getAllReports(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reports'], 'readonly');
            const store = transaction.objectStore('reports');
            const request = store.getAll();

            request.onsuccess = () => {
                let reports = request.result;
                
                // Apply filters
                if (filters.country) {
                    reports = reports.filter(r => r.country === filters.country);
                }
                if (filters.status) {
                    reports = reports.filter(r => r.status === filters.status);
                }
                if (filters.priority) {
                    reports = reports.filter(r => r.priority === filters.priority);
                }
                if (filters.threatType) {
                    reports = reports.filter(r => r.threatType === filters.threatType);
                }
                if (filters.search) {
                    const searchTerm = filters.search.toLowerCase();
                    reports = reports.filter(r => 
                        r.incidentTitle.toLowerCase().includes(searchTerm) ||
                        r.incidentDescription.toLowerCase().includes(searchTerm) ||
                        r.reporterName.toLowerCase().includes(searchTerm)
                    );
                }
                if (filters.dateFrom) {
                    reports = reports.filter(r => new Date(r.timestamp) >= new Date(filters.dateFrom));
                }
                if (filters.dateTo) {
                    reports = reports.filter(r => new Date(r.timestamp) <= new Date(filters.dateTo));
                }

                resolve(reports);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getReportStatistics() {
        const reports = await this.getAllReports();
        
        const stats = {
            total: reports.length,
            byStatus: {},
            byPriority: {},
            byCountry: {},
            byThreatType: {},
            byMonth: {},
            unresolvedReports: reports.filter(r => !['Resolved', 'Closed'].includes(r.status)),
            trendData: this.calculateTrends(reports)
        };

        // Calculate distributions
        reports.forEach(report => {
            stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
            stats.byPriority[report.priority] = (stats.byPriority[report.priority] || 0) + 1;
            stats.byCountry[report.country] = (stats.byCountry[report.country] || 0) + 1;
            stats.byThreatType[report.threatType] = (stats.byThreatType[report.threatType] || 0) + 1;
            
            const month = new Date(report.timestamp).toISOString().slice(0, 7);
            stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
        });

        return stats;
    }

    calculateTrends(reports) {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const lastMonthReports = reports.filter(r => {
            const date = new Date(r.timestamp);
            return date >= lastMonth && date < thisMonth;
        }).length;

        const thisMonthReports = reports.filter(r => {
            const date = new Date(r.timestamp);
            return date >= thisMonth;
        }).length;

        const percentChange = lastMonthReports > 0 
            ? ((thisMonthReports - lastMonthReports) / lastMonthReports * 100).toFixed(1)
            : 0;

        return {
            percentChange: Math.abs(percentChange),
            trend: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'stable'
        };
    }

    async getSOCIncidents(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['socIncidents'], 'readonly');
            const store = transaction.objectStore('socIncidents');
            const request = store.getAll();

            request.onsuccess = () => {
                let incidents = request.result;
                
                // Apply filters
                if (filters.severity) {
                    incidents = incidents.filter(i => i.severity === filters.severity);
                }
                if (filters.status) {
                    incidents = incidents.filter(i => i.status === filters.status);
                }
                if (filters.analyst) {
                    incidents = incidents.filter(i => i.analystAssigned === filters.analyst);
                }

                resolve(incidents);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async addSOCIncident(incident) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['socIncidents'], 'readwrite');
            const store = transaction.objectStore('socIncidents');
            
            incident.detectionTime = new Date().toISOString();
            incident.incidentId = `SOC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
            
            const request = store.add(incident);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateReport(reportId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reports'], 'readwrite');
            const store = transaction.objectStore('reports');
            const getRequest = store.get(reportId);

            getRequest.onsuccess = () => {
                const report = getRequest.result;
                if (report) {
                    Object.assign(report, updates);
                    report.lastUpdated = new Date().toISOString();
                    
                    const updateRequest = store.put(report);
                    updateRequest.onsuccess = () => resolve(report);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Report not found'));
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async exportReports(format, filters = {}) {
        const reports = await this.getAllReports(filters);
        
        switch (format) {
            case 'json':
                return JSON.stringify(reports, null, 2);
            
            case 'csv':
                const headers = ['Report ID', 'Title', 'Country', 'Priority', 'Status', 'Date', 'Reporter'];
                const csvRows = [headers.join(',')];
                
                reports.forEach(report => {
                    const row = [
                        report.reportId,
                        `"${report.incidentTitle}"`,
                        report.country,
                        report.priority,
                        report.status,
                        report.timestamp.split('T')[0],
                        `"${report.reporterName}"`
                    ];
                    csvRows.push(row.join(','));
                });
                
                return csvRows.join('\n');
            
            case 'xml':
                let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<reports>\n';
                
                reports.forEach(report => {
                    xml += '  <report>\n';
                    xml += `    <id>${report.reportId}</id>\n`;
                    xml += `    <title><![CDATA[${report.incidentTitle}]]></title>\n`;
                    xml += `    <description><![CDATA[${report.incidentDescription}]]></description>\n`;
                    xml += `    <country>${report.country}</country>\n`;
                    xml += `    <priority>${report.priority}</priority>\n`;
                    xml += `    <status>${report.status}</status>\n`;
                    xml += `    <timestamp>${report.timestamp}</timestamp>\n`;
                    xml += `    <reporter>${report.reporterName}</reporter>\n`;
                    xml += '  </report>\n';
                });
                
                xml += '</reports>';
                return xml;
            
            default:
                throw new Error('Unsupported export format');
        }
    }

    async deleteReport(reportId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reports'], 'readwrite');
            const store = transaction.objectStore('reports');
            const request = store.delete(reportId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getReportById(reportId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reports'], 'readonly');
            const store = transaction.objectStore('reports');
            const request = store.get(reportId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Initialize the database
const reportDB = new ReportDatabase();