document.addEventListener('DOMContentLoaded', function() {
    // Low Bandwidth Mode Toggle
    const lowBandwidthSwitch = document.getElementById('lowBandwidthSwitch');
    const dataSavingNotice = document.getElementById('dataSavingNotice');
    
    if (lowBandwidthSwitch) {
        // Check if user previously enabled low bandwidth mode
        if (localStorage.getItem('lowBandwidthMode') === 'true') {
            lowBandwidthSwitch.checked = true;
            enableLowBandwidthMode();
        }
        
        lowBandwidthSwitch.addEventListener('change', function() {
            if (this.checked) {
                enableLowBandwidthMode();
                localStorage.setItem('lowBandwidthMode', 'true');
            } else {
                disableLowBandwidthMode();
                localStorage.setItem('lowBandwidthMode', 'false');
            }
        });
    }
    
    function enableLowBandwidthMode() {
        document.body.classList.add('low-bandwidth-mode');
        if (dataSavingNotice) {
            dataSavingNotice.style.display = 'block';
        }
        
        // Reduce image quality
        const images = document.querySelectorAll('img:not(.essential-image)');
        images.forEach(img => {
            // Store original src for later
            if (!img.dataset.highQualitySrc) {
                img.dataset.highQualitySrc = img.src;
            }
            
            // Replace with low-quality version if available
            if (img.dataset.lowQualitySrc) {
                img.src = img.dataset.lowQualitySrc;
            }
        });
        
        // Disable animations
        document.body.classList.add('reduce-animations');
    }
    
    function disableLowBandwidthMode() {
        document.body.classList.remove('low-bandwidth-mode');
        if (dataSavingNotice) {
            dataSavingNotice.style.display = 'none';
        }
        
        // Restore high-quality images
        const images = document.querySelectorAll('img:not(.essential-image)');
        images.forEach(img => {
            if (img.dataset.highQualitySrc) {
                img.src = img.dataset.highQualitySrc;
            }
        });
        
        // Re-enable animations
        document.body.classList.remove('reduce-animations');
    }
    
    // Close data saving notice
    const closeDatSavingNotice = document.getElementById('closeDatSavingNotice');
    if (closeDatSavingNotice) {
        closeDatSavingNotice.addEventListener('click', function() {
            if (dataSavingNotice) {
                dataSavingNotice.style.display = 'none';
            }
        });
    }
    
    // SMS Verification Tool
    const smsVerificationForm = document.getElementById('smsVerificationForm');
    if (smsVerificationForm) {
        smsVerificationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const smsContent = document.getElementById('smsContent').value;
            const smsSender = document.getElementById('smsSender').value;
            
            if (!smsContent) {
                alert('Please enter the SMS content for analysis');
                return;
            }
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Analyzing...';
            submitButton.disabled = true;
            
            // Simulate API call to analyze SMS
            setTimeout(function() {
                // Reset button
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
                
                // Check for common scam patterns
                const isSuspicious = analyzeSmsSecurity(smsContent, smsSender);
                
                if (isSuspicious) {
                    showSmsAnalysisResult('warning', 'Potential Scam Detected', 
                        'This message contains suspicious elements commonly found in scams. Do not click any links or provide personal information.');
                } else {
                    showSmsAnalysisResult('success', 'No Immediate Threats Detected', 
                        'This message doesn\'t contain common scam patterns, but always remain vigilant.');
                }
            }, 2000);
        });
    }
    
    function analyzeSmsSecurity(content, sender) {
        // Simple analysis for demonstration purposes
        content = content.toLowerCase();
        sender = sender ? sender.toLowerCase() : '';
        
        // Check for suspicious patterns
        const suspiciousTerms = [
            'verify', 'account', 'suspended', 'click', 'link', 'urgent', 'confirm', 
            'bank', 'mpesa', 'password', 'pin', 'win', 'congratulation', 'prize', 
            'update', 'login', 'verify', 'validate', 'expire', 'locked'
        ];
        
        const suspiciousLinks = [
            'bit.ly', 'goo.gl', 'tinyurl', 'ow.ly', 't.co', 
            '.co.ke', '.co.tz', '.co.ug', '.co.rw', '.co.et'
        ];
        
        // Count suspicious terms
        let suspiciousScore = 0;
        
        suspiciousTerms.forEach(term => {
            if (content.includes(term)) {
                suspiciousScore += 1;
            }
        });
        
        // Check for suspicious links
        suspiciousLinks.forEach(link => {
            if (content.includes(link)) {
                suspiciousScore += 2; // Links are more suspicious
            }
        });
        
        // Check for URLs
        if (content.includes('http://') || content.includes('https://') || 
            content.includes('www.') || /\.[a-z]{2,}/i.test(content)) {
            suspiciousScore += 3;
        }
        
        // Return true if message is suspicious
        return suspiciousScore >= 3;
    }
    
    function showSmsAnalysisResult(type, title, message) {
        // Create result element if it doesn't exist
        let resultElement = document.getElementById('smsAnalysisResult');
        
        if (!resultElement) {
            resultElement = document.createElement('div');
            resultElement.id = 'smsAnalysisResult';
            resultElement.className = 'mt-4';
            smsVerificationForm.after(resultElement);
        }
        
        // Set appropriate alert class
        const alertClass = type === 'warning' ? 'alert-warning' : 'alert-success';
        const iconClass = type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';
        
        // Update content
        resultElement.innerHTML = `
            <div class="alert ${alertClass}">
                <div class="d-flex">
                    <div class="me-3">
                        <i class="fas ${iconClass} fa-2x"></i>
                    </div>
                    <div>
                        <h4 class="alert-heading h5">${title}</h4>
                        <p class="mb-0">${message}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Scroll to result
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Voice Assistant Feature
    const startVoiceAssistant = document.getElementById('startVoiceAssistant');
    if (startVoiceAssistant) {
        startVoiceAssistant.addEventListener('click', function() {
            // Check if browser supports speech recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                startSpeechRecognition();
            } else {
                alert('Voice recognition is not supported in your browser. Please try using Chrome, Edge, or Safari.');
            }
        });
    }
    
    function startSpeechRecognition() {
        // Create speech recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configure
        recognition.lang = 'en-US'; // Default to English
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Create voice assistant modal if it doesn't exist
        createVoiceAssistantModal();
        
        // Show modal
        const voiceModal = new bootstrap.Modal(document.getElementById('voiceAssistantModal'));
        voiceModal.show();
        
        // Start listening when modal is shown
        document.getElementById('voiceAssistantModal').addEventListener('shown.bs.modal', function() {
            document.getElementById('voiceStatus').textContent = 'Listening...';
            document.getElementById('voiceAnimation').classList.add('listening');
            
            setTimeout(() => {
                recognition.start();
            }, 1000);
        });
        
        // Handle results
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript.toLowerCase();
            document.getElementById('voiceStatus').textContent = 'Processing: "' + transcript + '"';
            
            // Process command
            processVoiceCommand(transcript);
        };
        
        recognition.onerror = function(event) {
            document.getElementById('voiceStatus').textContent = 'Error: ' + event.error;
            document.getElementById('voiceAnimation').classList.remove('listening');
        };
        
        recognition.onend = function() {
            document.getElementById('voiceAnimation').classList.remove('listening');
        };
    }
    
    function createVoiceAssistantModal() {
        // Check if modal already exists
        if (document.getElementById('voiceAssistantModal')) {
            return;
        }
        
        // Create modal
        const modalHTML = `
            <div class="modal fade" id="voiceAssistantModal" tabindex="-1" aria-labelledby="voiceAssistantModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="voiceAssistantModalLabel">
                                <i class="fas fa-microphone-alt me-2"></i>Voice Assistant
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center py-4">
                            <div class="voice-animation-container mb-4">
                                <div id="voiceAnimation" class="voice-animation">
                                    <div class="voice-animation-bar"></div>
                                    <div class="voice-animation-bar"></div>
                                    <div class="voice-animation-bar"></div>
                                    <div class="voice-animation-bar"></div>
                                    <div class="voice-animation-bar"></div>
                                </div>
                            </div>
                            <h4 id="voiceStatus">Initializing...</h4>
                            <p class="text-muted mt-3">Try saying: "Report a threat", "Security tips", or "Check my account"</p>
                            <div id="voiceResponse" class="mt-4 d-none">
                                <!-- Response will be inserted here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="tryAgainVoice">
                                <i class="fas fa-microphone me-2"></i>Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listener for try again button
        document.getElementById('tryAgainVoice').addEventListener('click', function() {
            startSpeechRecognition();
        });
        
        // Add CSS for voice animation
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .voice-animation-container {
                height: 100px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .voice-animation {
                display: flex;
                align-items: center;
                height: 60px;
                gap: 5px;
            }
            
            .voice-animation-bar {
                width: 10px;
                height: 20px;
                background-color: #4e73df;
                border-radius: 5px;
            }
            
            .voice-animation.listening .voice-animation-bar {
                animation: sound 1.5s infinite ease-in-out;
            }
            
            .voice-animation-bar:nth-child(1) { animation-delay: 0.0s; }
            .voice-animation-bar:nth-child(2) { animation-delay: 0.2s; }
            .voice-animation-bar:nth-child(3) { animation-delay: 0.4s; }
            .voice-animation-bar:nth-child(4) { animation-delay: 0.2s; }
            .voice-animation-bar:nth-child(5) { animation-delay: 0.0s; }
            
            @keyframes sound {
                0% { height: 20px; }
                50% { height: 60px; }
                100% { height: 20px; }
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    function processVoiceCommand(command) {
        let response = '';
        
        // Simple command processing
        if (command.includes('report') && (command.includes('threat') || command.includes('incident'))) {
            response = `
                <div class="alert alert-primary">
                    <h5>Report a Security Incident</h5>
                    <p>I'll help you report a security incident. What type of threat would you like to report?</p>
                    <div class="mt-3">
                        <a href="../Report/report.html" class="btn btn-primary">Go to Report Page</a>
                    </div>
                </div>
            `;
        } 
        else if (command.includes('security tip') || command.includes('advice')) {
            const tips = [
                "Always use two-factor authentication for your important accounts.",
                "Never share your PIN or password with anyone, even if they claim to be from customer service.",
                "Be cautious of unexpected SMS messages with links, especially those claiming to be from your bank.",
                "Regularly update your apps and operating system to protect against security vulnerabilities."
            ];
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            
            response = `
                <div class="alert alert-success">
                    <h5>Security Tip</h5>
                    <p>${randomTip}</p>
                    <div class="mt-3">
                        <a href="../learn/learn.html" class="btn btn-success">More Security Tips</a>
                    </div>
                </div>
            `;
        }
        else if (command.includes('check') && command.includes('account')) {
            response = `
                <div class="alert alert-info">
                    <h5>Account Security Check</h5>
                    <p>I'll help you check your account security. Would you like to review your account settings or check for suspicious activity?</p>
                    <div class="mt-3">
                        <a href="../Admin/auth.html" class="btn btn-info">Go to Account</a>
                    </div>
                </div>
            `;
        }
        else if (command.includes('mobile money') || command.includes('mpesa') || command.includes('airtel money')) {
            response = `
                <div class="alert alert-warning">
                    <h5>Mobile Money Security</h5>
                    <p>I can help you with mobile money security. Would you like tips on securing your mobile money account or information about recent scams?</p>
                    <div class="mt-3">
                        <a href="mobile-money-security.html" class="btn btn-warning">Mobile Money Security</a>
                    </div>
                </div>
            `;
        }
        else {
            response = `
                <div class="alert alert-secondary">
                    <h5>I didn't quite catch that</h5>
                    <p>Try asking about reporting a threat, security tips, checking your account, or mobile money security.</p>
                </div>
            `;
        }
        
        // Display response
        const responseElement = document.getElementById('voiceResponse');
        responseElement.innerHTML = response;
        responseElement.classList.remove('d-none');
        
        // Update status
        document.getElementById('voiceStatus').textContent = 'How can I help you?';
    }
    
    // Network Detection for Offline Mode
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    function updateOnlineStatus() {
        const offlineMode = document.getElementById('offline-mode');
        
        if (offlineMode) {
            if (navigator.onLine) {
                offlineMode.style.display = 'none';
            } else {
                offlineMode.style.display = 'block';
            }
        }
    }