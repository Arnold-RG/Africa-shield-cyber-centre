/**
 * Africa Shield Cyber Centre - Careers Page JavaScript
 * Advanced functionality for job search, applications, and career resources
 */

// Global variables and configuration
const CAREERS_CONFIG = {
    API_BASE_URL: '/api/careers',
    ITEMS_PER_PAGE: 12,
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 300,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx'],
    SALARY_RANGES: {
        min: 15000,
        max: 200000,
        step: 5000
    }
};

// State management
const careersState = {
    jobs: [],
    filteredJobs: [],
    currentPage: 1,
    totalPages: 1,
    filters: {
        keywords: '',
        location: '',
        jobType: '',
        experienceLevel: '',
        salaryMin: CAREERS_CONFIG.SALARY_RANGES.min,
        salaryMax: CAREERS_CONFIG.SALARY_RANGES.max,
        skills: []
    },
    sortBy: 'newest',
    savedJobs: JSON.parse(localStorage.getItem('savedJobs') || '[]'),
    userProfile: JSON.parse(localStorage.getItem('userProfile') || '{}'),
    isLoading: false
};

// Utility functions
const utils = {
    // Debounce function for search input
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format salary for display
    formatSalary: (amount) => {
        if (amount >= 1000000) {
            return `$${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `$${(amount / 1000).toFixed(0)}K`;
        }
        return `$${amount.toLocaleString()}`;
    },

    // Format date for display
    formatDate: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Posted today';
        if (diffDays <= 7) return `Posted ${diffDays} days ago`;
        if (diffDays <= 30) return `Posted ${Math.ceil(diffDays / 7)} weeks ago`;
        return `Posted ${Math.ceil(diffDays / 30)} months ago`;
    },

    // Validate file upload
    validateFile: (file) => {
        const errors = [];
        
        if (file.size > CAREERS_CONFIG.MAX_FILE_SIZE) {
            errors.push('File size must be less than 5MB');
        }

        const extension = file.name.split('.').pop().toLowerCase();
        if (!CAREERS_CONFIG.ALLOWED_FILE_TYPES.includes(extension)) {
            errors.push('File must be PDF, DOC, or DOCX format');
        }

        return errors;
    },

    // Show loading state
    showLoading: (element, text = 'Loading...') => {
        element.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p class="loading-text">${text}</p>
            </div>
        `;
    },

    // Show error state
    showError: (element, message = 'Something went wrong') => {
        element.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle error-icon"></i>
                <h4 class="error-title">Oops!</h4>
                <p class="error-message">${message}</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh me-1"></i>
                        Try Again
                    </button>
                </div>
            </div>
        `;
    },

    // Show empty state
    showEmpty: (element, message = 'No results found') => {
        element.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search empty-icon"></i>
                <h4 class="empty-title">No Results</h4>