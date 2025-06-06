/**
 * Africa Shield Cyber Centre - Learn Page JavaScript
 * Enhanced learning platform with interactive features
 */

// Learning Platform Core Class
class LearningPlatform {
    constructor() {
        this.currentCourse = null;
        this.currentLesson = 0;
        this.userProgress = this.loadProgress();
        this.bookmarks = this.loadBookmarks();
        this.settings = this.loadSettings();
        this.analytics = new LearningAnalytics();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeCourseNavigation();
        this.setupQuizSystem();
        this.initializeProgressTracking();
        this.setupSearchAndFilters();
        this.initializeAccessibility();
        this.setupOfflineSupport();
        this.loadUserData();
    }
    
    setupEventListeners() {
        // Course navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.course-item')) {
                this.selectCourse(e.target);
            }
            
            if (e.target.matches('.bookmark-btn')) {
                this.toggleBookmark(e.target);
            }
            
            if (e.target.matches('.filter-btn')) {
                this.filterCourses(e.target);
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
        
        // Auto-save progress
        setInterval(() => {
            this.saveProgress();
        }, 30000);
        
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveProgress();
            } else {
                this.resumeLearning();
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.saveProgress();
        });
    }
    
    initializeCourseNavigation() {
        const courseItems = document.querySelectorAll('.course-item');
        
        courseItems.forEach((item, index) => {
            item.setAttribute('data-course-index', index);
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            
            // Add progress indicator
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'course-progress-indicator';
            progressIndicator.innerHTML = this.getProgressHTML(item.dataset.course);
            item.appendChild(progressIndicator);
        });
        
        // Load last viewed course
        const lastCourse = this.userProgress.lastCourse;
        if (lastCourse) {
            const courseElement = document.querySelector(`[data-course="${lastCourse}"]`);
            if (courseElement) {
                this.selectCourse(courseElement);
            }
        } else if (courseItems.length > 0) {
            this.selectCourse(courseItems[0]);
        }
    }
    
    selectCourse(courseElement) {
        // Update UI
        document.querySelectorAll('.course-item').forEach(item => {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
        });
        
        courseElement.classList.add('active');
        courseElement.setAttribute('aria-selected', 'true');
        
        // Show course content
        const courseId = courseElement.dataset.course;
        this.showCourseContent(courseId);
        
        // Update current course
        this.currentCourse = courseId;
        this.currentLesson = 0;
        
        // Track analytics
        this.analytics.trackCourseView(courseId);
        
        // Update progress
        this.userProgress.lastCourse = courseId;
        this.userProgress.lastAccessed = new Date().toISOString();
        
        // Announce to screen readers
        this.announceToScreenReader(`Now viewing: ${courseElement.querySelector('.course-title').textContent}`);
    }
    
    showCourseContent(courseId) {
        // Hide all course modules
        document.querySelectorAll('.course-module').forEach(module => {
            module.classList.remove('active');
            module.setAttribute('aria-hidden', 'true');
        });
        
        // Show selected course
        const courseModule = document.getElementById(courseId);
        if (courseModule) {
            courseModule.classList.add('active');
            courseModule.setAttribute('aria-hidden', 'false');
            
            // Scroll to top of content
            courseModule.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Initialize course-specific features
            this.initializeCourseFeatures(courseId);
            
            // Update navigation buttons
            this.updateNavigationButtons();
        }
    }
    
    initializeCourseFeatures(courseId) {
        const courseModule = document.getElementById(courseId);
        
        // Initialize interactive demos
        this.initializeInteractiveDemos(courseModule);
        
        // Initialize knowledge checks
        this.initializeKnowledgeChecks(courseModule);
        
        // Initialize glossary terms
        this.initializeGlossary(courseModule);
        
        // Initialize progress tracking for this course
        this.initializeLessonProgress(courseModule);
    }
    
    initializeInteractiveDemos(courseModule) {
        // Password strength demo
        const passwordDemo = courseModule.querySelector('#passwordDemo');
        if (passwordDemo) {
            this.setupPasswordDemo(passwordDemo);
        }
        
        // Phishing detection demo
        const phishingDemo = courseModule.querySelector('#phishingDemo');
        if (phishingDemo) {
            this.setupPhishingDemo(phishingDemo);
        }
        
        // Network security demo
        const networkDemo = courseModule.querySelector('#networkDemo');
        if (networkDemo) {
            this.setupNetworkDemo(networkDemo);
        }
    }
    
    setupPasswordDemo(container) {
        const input = container.querySelector('#passwordInput');
        const strengthBar = container.querySelector('.strength-fill');
        const strengthText = container.querySelector('.strength-text');
        const suggestions = container.querySelector('.password-suggestions');
        
        if (!input) return;
        
        input.addEventListener('input', (e) => {
            const password = e.target.value;
            const strength = this.calculatePasswordStrength(password);
            
            // Update strength indicator
            strengthBar.className = `strength-fill ${strength.level}`;
            strengthText.textContent = strength.text;
            
            // Show suggestions
            suggestions.innerHTML = this.getPasswordSuggestions(password, strength);
            
            // Announce to screen readers
            this.announceToScreenReader(`Password strength: ${strength.text}`);
        });
    }
    
    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 12,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            noCommon: !this.isCommonPassword(password)
        };
        
        score = Object.values(checks).filter(Boolean).length;
        
        if (score <= 2) return { level: 'weak', text: 'Weak', score };
        if (score <= 4) return { level: 'fair', text: 'Fair', score };
        if (score <= 5) return { level: 'good', text: 'Good', score };
        return { level: 'strong', text: 'Strong', score };
    }
    
    isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
        ];
        return commonPasswords.includes(password.toLowerCase());
    }
    
    getPasswordSuggestions(password, strength) {
        const suggestions = [];
        
        if (password.length < 12) {
            suggestions.push('Use at least 12 characters');
        }
        if (!/[a-z]/.test(password)) {
            suggestions.push('Add lowercase letters');
        }
        if (!/[A-Z]/.test(password)) {
            suggestions.push('Add uppercase letters');
        }
        if (!/\d/.test(password)) {
            suggestions.push('Add numbers');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            suggestions.push('Add special characters');
        }
        if (this.isCommonPassword(password)) {
            suggestions.push('Avoid common passwords');
        }
        
        if (suggestions.length === 0) {
            return '<div class="alert alert-success"><i class="fas fa-check me-2"></i>Excellent password!</div>';
        }
        
        return `
            <div class="alert alert-info">
                <h6><i class="fas fa-lightbulb me-2"></i>Suggestions:</h6>
                <ul class="mb-0">
                    ${suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    setupPhishingDemo(container) {
        const examples = container.querySelectorAll('.phishing-example');
        
        examples.forEach(example => {
            example.addEventListener('click', () => {
                this.analyzePhishingExample(example);
            });
        });
    }
    
    analyzePhishingExample(example) {
        const isPhishing = example.classList.contains('phishing-example');
        const analysisContainer = example.querySelector('.analysis') || this.createAnalysisContainer(example);
        
        if (isPhishing) {
            const redFlags = this.identifyPhishingRedFlags(example);
            analysisContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle me-2"></i>This is a phishing attempt!</h6>
                    <p><strong>Red flags identified:</strong></p>
                    <ul>
                        ${redFlags.map(flag => `<li>${flag}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            analysisContainer.innerHTML = `
                <div class="alert alert-success">
                    <h6><i class="fas fa-check-circle me-2"></i>This appears to be legitimate!</h6>
                    <p>Good security indicators found.</p>
                </div>
            `;
        }
        
        analysisContainer.style.display = 'block';
        this.analytics.trackInteraction('phishing_analysis', { isPhishing });
    }
    
    identifyPhishingRedFlags(example) {
        const content = example.textContent.toLowerCase();
        const redFlags = [];
        
        if (content.includes('urgent') || content.includes('immediate')) {
            redFlags.push('Creates false urgency');
        }
        if (content.includes('click here') || content.includes('verify now')) {
            redFlags.push('Suspicious call-to-action');
        }
        if (content.includes('suspended') || content.includes('locked')) {
            redFlags.push('Threatens account suspension');
        }
        if (example.querySelector('a[href*="bit.ly"]') || example.querySelector('a[href*="tinyurl"]')) {
            redFlags.push('Uses URL shorteners');
        }
        
        return redFlags;
    }
    
    createAnalysisContainer(example) {
        const container = document.createElement('div');
        container.className = 'analysis mt-3';
        container.style.display = 'none';
        example.appendChild(container);
        return container;
    }
    
    setupQuizSystem() {
        const quizContainers = document.querySelectorAll('.quiz-container');
        
        quizContainers.forEach(container => {
            this.initializeQuiz(container);
        });
    }
    
    initializeQuiz(container) {
        const questions = container.querySelectorAll('.quiz-question');
        let currentQuestion = 0;
        let answers = {};
        let startTime = Date.now();
        
        // Show first question
        if (questions.length > 0) {
            this.showQuestion(questions, currentQuestion);
        }
        
        // Handle answer selection
        container.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                const questionId = e.target.name;
                const answer = e.target.value;
                answers[questionId] = answer;
                
                // Provide immediate feedback
                this.provideFeedback(e.target, container);
                
                // Auto-advance after delay
                setTimeout(() => {
                    if (currentQuestion < questions.length - 1) {
                        currentQuestion++;
                        this.showQuestion(questions, currentQuestion);
                    } else {
                        // Quiz completed
                        const completionTime = Date.now() - startTime;
                        this.completeQuiz(container, answers, completionTime);
                    }
                }, 1500);
            }
        });
        
        // Add quiz navigation
        this.addQuizNavigation(container, questions);
    }
    
    showQuestion(questions, index) {
        questions.forEach((q, i) => {
            q.classList.toggle('active', i === index);
            q.setAttribute('aria-hidden', i !== index);
        });
        
        // Update progress indicator
        this.updateQuizProgress(questions.length, index + 1);
        
        // Focus on the active question
        const activeQuestion = questions[index];
        if (activeQuestion) {
            activeQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Announce question to screen readers
            const questionText = activeQuestion.querySelector('p').textContent;
            this.announceToScreenReader(`Question ${index + 1} of ${questions.length}: ${questionText}`);
        }
    }
    
    provideFeedback(selectedOption, container) {
        const isCorrect = selectedOption.value === 'b'; // Assuming 'b' is always correct for demo
        const feedbackContainer = selectedOption.closest('.quiz-question').querySelector('.question-feedback') || 
                                 this.createFeedbackContainer(selectedOption.closest('.quiz-question'));
        
        if (isCorrect) {
            feedbackContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>Correct! Well done.
                </div>
            `;
        } else {
            feedbackContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-times-circle me-2"></i>Incorrect. The correct answer is highlighted.
                </div>
            `;
            
            // Highlight correct answer
            const correctOption = selectedOption.closest('.quiz-question').querySelector('input[value="b"]');
            if (correctOption) {
                correctOption.closest('.quiz-option').classList.add('correct-answer');
            }
        }
        
        feedbackContainer.style.display = 'block';
    }
    
    createFeedbackContainer(questionElement) {
        const container = document.createElement('div');
        container.className = 'question-feedback'
