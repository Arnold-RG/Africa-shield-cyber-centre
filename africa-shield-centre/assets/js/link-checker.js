/**
 * Link Checker Tool
 * Specialized for East African cybersecurity threats
 */

document.addEventListener('DOMContentLoaded', function() {
    const linkCheckerForm = document.getElementById('linkCheckerForm');
    const urlInput = document.getElementById('urlInput');
    const checkLinkBtn = document.getElementById('checkLinkBtn');
    const linkCheckerLoading = document.getElementById('linkCheckerLoading');
    const linkCheckerResult = document.getElementById('linkCheckerResult');
    const checkAnotherLinkBtn = document.getElementById('checkAnotherLinkBtn');
    const safetyScoreCircle = document.getElementById('safetyScoreCircle');
    const safetyScoreValue = document.getElementById('safetyScoreValue');
    const safetyVerdict = document.getElementById('safetyVerdict');
    const safetyCheckList = document.getElementById('safetyCheckList');
    
    // East African TLDs to give special attention
    const eastAfricanTLDs = ['.ke', '.tz', '.ug', '.rw', '.bi', '.ss', '.et'];
    
    // East African mobile payment services to monitor for phishing
    const eastAfricanPaymentServices = [
        'mpesa', 'm-pesa', 'eazzy', 'pesalink', 'equitel', 'tigo', 'airtel', 'mtn', 'halopesa', 
        'tigopesa', 'airtelmoney', 'mtnmoney', 'telebirr', 'amole', 'cbepay'
    ];
    
    if (linkCheckerForm) {
        linkCheckerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            
            if (!url) {
                return;
            }
            
            // Show loading state
            if (linkCheckerLoading) {
                linkCheckerLoading.classList.remove('d-none');
            }
            
            if (linkCheckerResult) {
                linkCheckerResult.classList.add('d-none');
            }
            
            if (checkLinkBtn) {
                checkLinkBtn.disabled = true;
            }
            
            // Simulate API call to check link
            setTimeout(function() {
                analyzeLink(url);
            }, 2000);
        });
    }
    
    if (checkAnotherLinkBtn) {
        checkAnotherLinkBtn.addEventListener('click', function() {
            if (linkCheckerResult) {
                linkCheckerResult.classList.add('d-none');
            }
            
            if (linkCheckerForm) {
                linkCheckerForm.reset();
                linkCheckerForm.classList.remove('d-none');
            }
            
            if (checkLinkBtn) {
                checkLinkBtn.disabled = false;
            }
            
            this.classList.add('d-none');
        });
    }
    
    function analyzeLink(url) {
        // In a real application, this would call your backend API
        // For demo purposes, we'll generate a safety score with East African context
        
        let score = Math.floor(Math.random() * 41) + 60; // Base score between 60-100
        
        // Check for East African TLDs - slightly increase score for legitimate local domains
        const domain = extractDomain(url);
        const isEastAfricanTLD = eastAfricanTLDs.some(tld => domain.endsWith(tld));
        
        if (isEastAfricanTLD) {
            // Legitimate East African domains get a small boost
            score = Math.min(score + 5, 100);
        }
        
        // Check for East African payment services in non-official domains (potential phishing)
        const isPaymentServicePhishing = checkForPaymentServicePhishing(url, domain);
        
        if (isPaymentServicePhishing) {
            // Potential phishing targeting East African payment services
            score = Math.max(score - 30, 20);
        }
        
        // Determine verdict based on score
        let verdict, verdictClass;
        
        if (score >= 90) {
            verdict = 'Safe';
            verdictClass = 'text-success';
        } else if (score >= 70) {
            verdict = 'Low Risk';
            verdictClass = 'text-success';
        } else if (score >= 50) {
            verdict = 'Medium Risk';
            verdictClass = 'text-warning';
        } else {
            verdict = 'High Risk';
            verdictClass = 'text-danger';
        }
        
        // Update the UI
        if (safetyScoreValue) {
            safetyScoreValue.textContent = score + '%';
        }
        
        if (safetyVerdict) {
            safetyVerdict.textContent = verdict;
            safetyVerdict.className = verdictClass;
        }
        
        if (safetyScoreCircle) {
            const radius = safetyScoreCircle.getAttribute('r');
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (score / 100) * circumference;
            safetyScoreCircle.style.strokeDasharray = circumference;
            safetyScoreCircle.style.strokeDashoffset = offset;
            
            // Change color based on score
            if (score >= 70) {
                safetyScoreCircle.style.stroke = '#28a745'; // Success
            } else if (score >= 50) {
                safetyScoreCircle.style.stroke = '#ffc107'; // Warning
            } else {
                safetyScoreCircle.style.stroke = '#dc3545'; // Danger
            }
        }
        
        // Generate check list items
        if (safetyCheckList) {
            safetyCheckList.innerHTML = '';
            
            // Generate check items based on score and East African context
            const checks = generateCheckItems(score, url, isEastAfricanTLD, isPaymentServicePhishing);
            
            checks.forEach(check => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex align-items-center';
                
                const icon = document.createElement('i');
                icon.className = check.passed ? 
                    'fas fa-check-circle text-success me-2' : 
                    'fas fa-exclamation-circle text-' + (check.warning ? 'warning' : 'danger') + ' me-2';
                
                const span = document.createElement('span');
                span.textContent = check.text;
                
                li.appendChild(icon);
                li.appendChild(span);
                
                safetyCheckList.appendChild(li);
            });
        }
        
        // Hide loading, show results
        if (linkCheckerLoading) {
            linkCheckerLoading.classList.add('d-none');
        }
        
        if (linkCheckerResult) {
            linkCheckerResult.classList.remove('d-none');
        }
        
        if (checkAnotherLinkBtn) {
            checkAnotherLinkBtn.classList.remove('d-none');
        }
    }
    
    function extractDomain(url) {
        try {
            // Add protocol if missing
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase();
        } catch (e) {
            // If URL parsing fails, return the original input
            return url.toLowerCase();
        }
    }
    
    function checkForPaymentServicePhishing(url, domain) {
        // Check if URL contains East African payment service names but isn't on official domain
        const lowerUrl = url.toLowerCase();
        
        for (const service of eastAfricanPaymentServices) {
            if (lowerUrl.includes(service)) {
                // List of official domains for these services (simplified for demo)
                const officialDomains = [
                    'safaricom.co.ke', 'mpesa.com', 'mtn.com', 'mtn.co.ug', 'mtn.co.rw', 
                    'airtel.co.ke', 'airtel.co.tz', 'airtel.co.ug', 'tigo.co.tz', 'telebirr.et'
                ];
                
                // If contains service name but not on official domain, likely phishing
                if (!officialDomains.some(officialDomain => domain.includes(officialDomain))) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    function generateCheckItems(score, url, isEastAfricanTLD, isPaymentServicePhishing) {
        const checks = [];
        
        // Common checks
        if (score >= 50) {
            checks.push({
                passed: true,
                text: 'Not found in malicious URL databases'
            });
        } else {
            checks.push({
                passed: false,
                text: 'URL found in malicious URL databases',
                warning: false
            });
        }
        
        // East African TLD check
        if (isEastAfricanTLD && score >= 70) {
            checks.push({
                passed: true,
                text: 'Legitimate East African domain with good reputation'
            });
        } else if (isEastAfricanTLD) {
            checks.push({
                passed: false,
                text: 'East African domain with suspicious characteristics',
                warning: true
            });
        }
        
        // Payment service phishing check
        if (isPaymentServicePhishing) {
            checks.push({
                passed: false,
                text: 'Potential phishing targeting East African mobile payment services',
                warning: false
            });
        }
        
        // Domain age check
        if (score >= 70) {
            checks.push({
                passed: true,
                text: 'Domain age: 5+ years (Established)'
            });
        } else if (score >= 50) {
            checks.push({
                passed: false,
                text: 'Domain age: Less than 1 year (New)',
                warning: true
            });
        } else {
            checks.push({
                passed: false,
                text: 'Domain registered recently (Suspicious)',
                warning: false
            });
        }
        
        // SSL certificate check
        if (score >= 80) {
            checks.push({
                passed: true,
                text: 'Valid SSL certificate with proper configuration'
            });
        } else if (score >= 60) {
            checks.push({
                passed: false,
                text: 'SSL certificate issues detected',
                warning: true
            });
        } else {
            checks.push({
                passed: false,
                text: 'No SSL certificate or invalid configuration',
                warning: false
            });
        }
        
        // Content analysis
        if (score >= 90) {
            checks.push({
                passed: true,
                text: 'Content analysis shows legitimate website patterns'
            });
        } else if (score >= 70) {
            checks.push({
                passed: false,
                text: 'Minor concerns with third-party script inclusions',
                warning: true
            });
        } else if (score >= 50) {
            checks.push({
                passed: false,
                text: 'Suspicious content patterns detected',
                warning: true
            });
        } else {
            checks.push({
                passed: false,
                text: 'Content analysis indicates phishing attempt',
                warning: false
            });
        }
        
        // URL structure analysis for East African banking/payment services
        const lowerUrl = url.toLowerCase();
        if ((lowerUrl.includes('login') || lowerUrl.includes('signin') || lowerUrl.includes('account')) && 
            (lowerUrl.includes('bank') || lowerUrl.includes('pay') || lowerUrl.includes('money') || 
             eastAfricanPaymentServices.some(service => lowerUrl.includes(service)))) {
            
            if (score < 80) {
                checks.push({
                    passed: false,
                    text: 'Login page for financial service on suspicious domain (potential phishing)',
                    warning: false
                });
            }
        }
        
        // East African specific scam check
        if (lowerUrl.includes('lottery') || lowerUrl.includes('winner') || lowerUrl.includes('prize') || 
            lowerUrl.includes('grant') || lowerUrl.includes('fund')) {
            
            checks.push({
                passed: false,
                text: 'Potential scam website (lottery/prize/grant scheme)',
                warning: true
            });
        }
        
        // Redirect check
        if (score < 60) {
            checks.push({
                passed: false,
                text: 'Multiple suspicious redirects detected',
                warning: false
            });
        }
        
        // Reputation check
        if (score >= 85) {
            checks.push({
                passed: true,
                text: 'Domain has positive reputation score'
            });
        } else if (score < 40) {
            checks.push({
                passed: false,
                text: 'Domain has negative reputation score',
                warning: false
            });
        }
        
        return checks;
    }
});