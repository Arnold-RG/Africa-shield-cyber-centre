/**
 * Particles.js Configuration
 * Optimized for East African internet connections
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles.js on elements with the particles-bg class
    const particlesContainers = document.querySelectorAll('.particles-bg');
    
    // Check connection speed and adjust particle density accordingly
    // This helps with performance on slower connections common in some East African regions
    function getConnectionSpeed() {
        // In a real implementation, you would use the Network Information API
        // For this demo, we'll use a simplified approach
        
        // Check if the Network Information API is available
        if (navigator.connection && navigator.connection.effectiveType) {
            const connectionType = navigator.connection.effectiveType;
            
            // Return particle count based on connection type
            switch (connectionType) {
                case '4g':
                    return 80;
                case '3g':
                    return 50;
                case '2g':
                    return 30;
                case 'slow-2g':
                    return 15;
                default:
                    return 40; // Default moderate value
            }
        }
        
        // If Network Information API is not available, use a moderate value
        return 40;
    }
    
    // Get appropriate particle count based on connection
    const particleCount = getConnectionSpeed();
    
    if (particlesContainers.length > 0 && typeof particlesJS !== 'undefined') {
        particlesContainers.forEach((container, index) => {
            const containerId = container.id || `particles-container-${index}`;
            container.id = containerId;
            
            particlesJS(containerId, {
                "particles": {
                    "number": {
                        "value": particleCount,
                        "density": {
                            "enable": true,
                            "value_area": 800
                        }
                    },
                    "color": {
                        "value": "#ffffff"
                    },
                    "shape": {
                        "type": "circle",
                        "stroke": {
                            "width": 0,
                            "color": "#000000"
                        },
                        "polygon": {
                            "nb_sides": 5
                        }
                    },
                    "opacity": {
                        "value": 0.5,
                        "random": false,
                        "anim": {
                            "enable": false,
                            "speed": 1,
                            "opacity_min": 0.1,
                            "sync": false
                        }
                    },
                    "size": {
                        "value": 3,
                        "random": true,
                        "anim": {
                            "enable": false,
                            "speed": 40,
                            "size_min": 0.1,
                            "sync": false
                        }
                    },
                    "line_linked": {
                        "enable": true,
                        "distance": 150,
                        "color": "#ffffff",
                        "opacity": 0.4,
                        "width": 1
                    },
                    "move": {
                        "enable": true,
                        "speed": 2, // Reduced speed for better performance
                        "direction": "none",
                        "random": false,
                        "straight": false,
                        "out_mode": "out",
                        "bounce": false,
                        "attract": {
                            "enable": false,
                            "rotateX": 600,
                            "rotateY": 1200
                        }
                    }
                },
                "interactivity": {
                    "detect_on": "canvas",
                    "events": {
                        "onhover": {
                            "enable": true,
                            "mode": "grab"
                        },
                        "onclick": {
                            "enable": true,
                            "mode": "push"
                        },
                        "resize": true
                    },
                    "modes": {
                        "grab": {
                            "distance": 140,
                            "line_linked": {
                                "opacity": 1
                            }
                        },
                        "bubble": {
                            "distance": 400,
                            "size": 40,
                            "duration": 2,
                            "opacity": 8,
                            "speed": 3
                        },
                        "repulse": {
                            "distance": 200,
                            "duration": 0.4
                        },
                        "push": {
                            "particles_nb": 4
                        },
                        "remove": {
                            "particles_nb": 2
                        }
                    }
                },
                "retina_detect": false // Disabled for better performance on lower-end devices
            });
        });
    }
    
    // Add connection quality monitoring for East African networks
    function monitorConnectionQuality() {
        // Only run if the Network Information API is available
        if (navigator.connection) {
            // Listen for connection changes
            navigator.connection.addEventListener('change', function() {
                // If connection degrades significantly, reduce particle count
                if (navigator.connection.effectiveType === '2g' || 
                    navigator.connection.effectiveType === 'slow-2g') {
                    
                    // Reload particles with lower count
                    const newParticleCount = getConnectionSpeed();
                    
                    particlesContainers.forEach((container, index) => {
                        const containerId = container.id || `particles-container-${index}`;
                        
                        // Only reload if particlesJS is defined
                        if (typeof particlesJS !== 'undefined') {
                            particlesJS(containerId, {
                                "particles": {
                                    "number": {
                                        "value": newParticleCount,
                                        "density": {
                                            "enable": true,
                                            "value_area": 800
                                        }
                                    },
                                    // Other settings remain the same but with simplified animations
                                    "move": {
                                        "enable": true,
                                        "speed": 1, // Further reduced speed
                                        "direction": "none",
                                        "random": false,
                                        "straight": false,
                                        "out_mode": "out",
                                        "bounce": false,
                                        "attract": {
                                            "enable": false,
                                            "rotateX": 600,
                                            "rotateY": 1200
                                        }
                                    }
                                },
                                "interactivity": {
                                    "detect_on": "canvas",
                                    "events": {
                                        "onhover": {
                                            "enable": false, // Disabled for performance
                                            "mode": "grab"
                                        },
                                        "onclick": {
                                            "enable": true,
                                            "mode": "push"
                                        },
                                        "resize": true
                                    }
                                },
                                "retina_detect": false
                            });
                        }
                    });
                }
            });
        }
    }
    
    // Start connection monitoring
    monitorConnectionQuality();
});