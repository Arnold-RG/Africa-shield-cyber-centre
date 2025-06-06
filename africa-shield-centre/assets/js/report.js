// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {

    // Initialize Counter-Up for statistics
    // Requires waypoints and counterup libraries included in the HTML
    $('.counter').counterUp({
        delay: 10,
        time: 1000
    });

    // Bootstrap form validation
    const form = document.getElementById('cyberThreatReportForm');

    if (form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    }

    // Basic functionality for Emergency Contacts link (Optional - can be expanded)
    const emergencyLink = document.querySelector('#emergency a.btn');
    if (emergencyLink) {
        emergencyLink.addEventListener('click', function(event) {
            // Prevent default link behavior if it's just a placeholder '#' link
            if (this.getAttribute('href') === '#') {
                 event.preventDefault();
                 alert('Please find emergency contact information listed below or contact your local authorities directly.');
            }
            // If it's a real link, allow default behavior
        });
    }

}); 