/**
 * Settings and Accessibility JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Theme selector
    const themeButtons = document.querySelectorAll('.theme-option');
    const htmlElement = document.documentElement;
    
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Theme button click handlers
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            setTheme(theme);
            localStorage.setItem('theme', theme);
        });
    });
    
    function setTheme(theme) {
        // Remove all theme classes
        themeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected theme button
        const activeButton = document.querySelector(`.theme-option[data-theme="${theme}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // Set theme attribute
        if (theme === 'auto') {
            htmlElement.removeAttribute('data-theme');
            
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                htmlElement.setAttribute('data-theme', 'dark');
            } else {
                htmlElement.setAttribute('data-theme', 'light');
            }
        } else {
            htmlElement.setAttribute('data-theme', theme);
        }
    }
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (localStorage.getItem('theme') === 'auto') {
            setTheme('auto');
        }
    });
    
    // Font size controls
    const increaseFontBtn = document.getElementById('increaseFontSize');
    const decreaseFontBtn = document.getElementById('decreaseFontSize');
    const resetFontBtn = document.getElementById('resetFontSize');
    
    // Get saved font size or use default
    let currentFontSize = parseFloat(localStorage.getItem('fontSize')) || 1.0;
    applyFontSize(currentFontSize);
    
    // Increase font size
    if (increaseFontBtn) {
        increaseFontBtn.addEventListener('click', function() {
            if (currentFontSize < 1.5) {
                currentFontSize += 0.1;
                applyFontSize(currentFontSize);
                localStorage.setItem('fontSize', currentFontSize);
            }
        });
    }
    
    // Decrease font size
    if (decreaseFontBtn) {
        decreaseFontBtn.addEventListener('click', function() {
            if (currentFontSize > 0.8) {
                currentFontSize -= 0.1;
                applyFontSize(currentFontSize);
                localStorage.setItem('fontSize', currentFontSize);
            }
        });
    }
    
    // Reset font size
    if (resetFontBtn) {
        resetFontBtn.addEventListener('click', function() {
            currentFontSize = 1.0;
            applyFontSize(currentFontSize);
            localStorage.setItem('fontSize', currentFontSize);
        });
    }
    
    // Apply font size to html element
    function applyFontSize(size) {
        document.documentElement.style.fontSize = `${size}rem`;
    }
    
    // AI Tools floating button
    const aiToolsToggle = document.getElementById('aiToolsToggle');
    const aiToolsMenu = document.getElementById('aiToolsMenu');
    const closeAiTools = document.getElementById('closeAiTools');
    
    if (aiToolsToggle && aiToolsMenu) {
        aiToolsToggle.addEventListener('click', function() {
            aiToolsMenu.classList.toggle('show');
            
            // Update ARIA attributes
            const isExpanded = aiToolsMenu.classList.contains('show');
            aiToolsToggle.setAttribute('aria-expanded', isExpanded);
            
            // Clear notification badge when opened
            if (isExpanded) {
                const badge = document.getElementById('toolsNotificationBadge');
                if (badge) {
                    badge.textContent = '';
                    badge.style.display = 'none';
                }
            }
        });
        
        // Close button
        if (closeAiTools) {
            closeAiTools.addEventListener('click', function() {
                aiToolsMenu.classList.remove('show');
                aiToolsToggle.setAttribute('aria-expanded', 'false');
            });
        }
        
        // Close when clicking outside
        document.addEventListener('click', function(event) {
            if (!aiToolsMenu.contains(event.target) && !aiToolsToggle.contains(event.target)) {
                aiToolsMenu.classList.remove('show');
                aiToolsToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // High contrast mode
    const highContrastToggle = document.getElementById('highContrastToggle');
    
    if (highContrastToggle) {
        // Check saved preference
        const highContrastEnabled = localStorage.getItem('highContrast') === 'true';
        
        if (highContrastEnabled) {
            document.body.classList.add('high-contrast');
            highContrastToggle.checked = true;
        }
        
        highContrastToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('high-contrast');
                localStorage.setItem('highContrast', 'true');
            } else {
                document.body.classList.remove('high-contrast');
                localStorage.setItem('highContrast', 'false');
            }
        });
    }
    
    // Motion reduction
    const reduceMotionToggle = document.getElementById('reduceMotionToggle');
    
    if (reduceMotionToggle) {
        // Check saved preference
        const reduceMotionEnabled = localStorage.getItem('reduceMotion') === 'true';
        
        if (reduceMotionEnabled) {
            document.body.classList.add('reduce-motion');
            reduceMotionToggle.checked = true;
        }
        
        reduceMotionToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('reduce-motion');
                localStorage.setItem('reduceMotion', 'true');
            } else {
                document.body.classList.remove('reduce-motion');
                localStorage.setItem('reduceMotion', 'false');
            }
        });
    }
});