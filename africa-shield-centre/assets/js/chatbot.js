/**
 * AI Chatbot Assistant
 * Specialized for East African cybersecurity concerns
 */

document.addEventListener('DOMContentLoaded', function() {
    // Floating AI Tools Button
    const aiToolsToggle = document.getElementById('aiToolsToggle');
    const aiToolsMenu = document.getElementById('aiToolsMenu');
    const closeAiTools = document.getElementById('closeAiTools');
    if (aiToolsToggle && aiToolsMenu && closeAiTools) {
        aiToolsToggle.addEventListener('click', function() {
            aiToolsMenu.classList.toggle('show');
        });
        closeAiTools.addEventListener('click', function() {
            aiToolsMenu.classList.remove('show');
        });
    }

    // Chatbot Modal Logic
    const chatboxForm = document.getElementById('chatboxForm');
    const chatboxInput = document.getElementById('chatboxInput');
    const chatboxMessages = document.getElementById('chatboxMessages');
    if (chatboxForm && chatboxInput && chatboxMessages) {
        chatboxForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const message = chatboxInput.value.trim();
            if (!message) return;
            addMessage(message, 'user');
            chatboxInput.value = '';
            setTimeout(() => {
                const response = generateAIResponse(message);
                addMessage(response, 'ai');
            }, 700);
        });
    }

    function addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-bubble">${message}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-bubble">${message}</div>
                <div class="message-avatar"><i class="fas fa-user"></i></div>
            `;
        }
        chatboxMessages.appendChild(messageDiv);
        chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
    }

    // Advanced AI Response Logic
    function generateAIResponse(userMessage) {
        const msg = userMessage.toLowerCase();
        if (msg.includes('malware')) {
            return "Malware is malicious software like viruses, worms, and ransomware. Always keep your antivirus updated and avoid suspicious downloads. Want a daily tip?";
        } else if (msg.includes('phishing')) {
            return "Phishing is a scam where attackers trick you into giving up sensitive info. Never click on suspicious links and always verify the sender's email address.";
        } else if (msg.includes('password')) {
            return "Use strong, unique passwords for every account. Consider a password manager and enable multi-factor authentication for extra security.";
        } else if (msg.includes('network')) {
            return "Secure your network by using strong Wi-Fi passwords, enabling firewalls, and avoiding public Wi-Fi for sensitive activities.";
        } else if (msg.includes('ransomware')) {
            return "Ransomware locks your files and demands payment. Back up your data regularly and never pay the ransom. Want to know how to recover from an attack?";
        } else if (msg.includes('mobile')) {
            return "Mobile security tip: Only install apps from trusted stores, review app permissions, and use a screen lock on your phone.";
        } else if (msg.includes('data')) {
            return "Protect your data by encrypting sensitive files, using secure cloud services, and understanding privacy settings on all platforms.";
        } else if (msg.includes('social media')) {
            return "Be careful what you share online. Use privacy settings and avoid posting sensitive information. Don’t accept friend requests from strangers.";
        } else if (msg.includes('scam') || msg.includes('fraud')) {
            return "Watch out for scams and fraud. If something sounds too good to be true, it probably is. Never share personal info with unknown contacts.";
        } else if (msg.includes('tip') || msg.includes('daily')) {
            const tips = [
                "Update your software as soon as updates are available.",
                "Don’t use public Wi-Fi for banking or shopping.",
                "Think before you click—if it looks suspicious, it probably is.",
                "Back up your data weekly.",
                "Log out of accounts when finished.",
                "Be cautious with USB drives and external devices.",
                "Use antivirus and keep it updated.",
                "Don’t share passwords with anyone.",
                "Check your bank statements for unauthorized transactions.",
                "Report suspicious emails to your IT/security team."
            ];
            return `<strong>Daily Cybersecurity Tip:</strong> ${tips[Math.floor(Math.random()*tips.length)]}`;
        } else if (msg.includes('hello') || msg.includes('hi')) {
            return "Hello! How can I help you with your cybersecurity learning today?";
        } else if (msg.includes('ethic')) {
            return "Ethical cybersecurity means acting legally, respecting privacy, and following professional codes. Unsure about an action? Use the Ethics Decision Tree in this course.";
        } else if (msg.includes('thank')) {
            return "You're welcome! Let me know if you have more questions about cybersecurity.";
        } else {
            return "I'm here to help with any cybersecurity topic: malware, phishing, passwords, network security, mobile safety, and more. Ask me anything!";
        }
    }
});