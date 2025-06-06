    </main>
    
    <!-- Footer -->
    <footer class="main-footer bg-dark text-white py-5">
        <div class="container">
            <div class="row g-4">
                <div class="col-lg-4 col-md-6">
                    <div class="footer-brand mb-4">
                        <img src="<?php echo APP_URL; ?>/assets/images/logo-white.png" alt="<?php echo APP_NAME; ?>" class="footer-logo">
                        <h3 class="h5 mt-3"><?php echo APP_NAME; ?></h3>
                    </div>
                    <p class="mb-4">Empowering East Africa's digital ecosystem with enterprise-grade cybersecurity solutions, advanced threat intelligence, and specialized security training.</p>
                    <div class="social-links">
                        <a href="https://twitter.com/eastafricashield" class="social-link" aria-label="Twitter">
                            <i class="fab fa-twitter"></i>
                        </a>
                        <a href="https://linkedin.com/company/eastafricashield" class="social-link" aria-label="LinkedIn">
                            <i class="fab fa-linkedin-in"></i>
                        </a>
                        <a href="https://youtube.com/eastafricashield" class="social-link" aria-label="YouTube">
                            <i class="fab fa-youtube"></i>
                        </a>
                        <a href="https://github.com/eastafricashield" class="social-link" aria-label="GitHub">
                            <i class="fab fa-github"></i>
                        </a>
                    </div>
                </div>
                
                <div class="col-lg-2 col-md-6">
                    <h4 class="h5 mb-4">Solutions</h4>
                    <ul class="footer-links">
                        <li><a href="<?php echo APP_URL; ?>/solutions/threat-intelligence.php">Threat Intelligence</a></li>
                        <li><a href="<?php echo APP_URL; ?>/solutions/security-operations.php">Security Operations</a></li>
                        <li><a href="<?php echo APP_URL; ?>/solutions/incident-response.php">Incident Response</a></li>
                        <li><a href="<?php echo APP_URL; ?>/solutions/security-training.php">Security Training</a></li>
                        <li><a href="<?php echo APP_URL; ?>/solutions/compliance.php">Compliance & Governance</a></li>
                    </ul>
                </div>
                
                <div class="col-lg-3 col-md-6">
                    <h4 class="h5 mb-4">Resources</h4>
                    <ul class="footer-links">
                        <li><a href="<?php echo APP_URL; ?>/resources/security-advisories.php">Security Advisories</a></li>
                        <li><a href="<?php echo APP_URL; ?>/resources/research.php">Threat Research</a></li>
                        <li><a href="<?php echo APP_URL; ?>/resources/whitepapers.php">Whitepapers</a></li>
                        <li><a href="<?php echo APP_URL; ?>/resources/webinars.php">Webinars & Events</a></li>
                        <li><a href="<?php echo APP_URL; ?>/resources/blog.php">Security Blog</a></li>
                    </ul>
                </div>
                
                <div class="col-lg-3 col-md-6">
                    <h4 class="h5 mb-4">Stay Informed</h4>
                    <p class="mb-3">Subscribe to our intelligence briefings for the latest threat alerts and security insights.</p>
                    <form class="newsletter-form mb-4" id="newsletterForm" action="<?php echo APP_URL; ?>/process/subscribe.php" method="post">
                        <div class="input-group">
                            <input type="email" name="email" class="form-control" placeholder="Your email address" aria-label="Your email address" required>
                            <button class="btn btn-primary" type="submit" aria-label="Subscribe to newsletter">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <div class="form-text text-light-50 mt-2">We respect your privacy and will never share your information.</div>
                    </form>
                    <div class="d-flex align-items-center emergency-contact">
                        <i class="fas fa-headset text-primary me-2 fa-2x"></i>
                        <div>
                            <p class="mb-0 small">24/7 Security Operations Center</p>
                            <a href="tel:+254700000000" class="text-white fw-bold emergency-phone">+254 700 000 000</a>
                        </div>
                    </div>
                </div>
            </div>
            
            <hr class="mt-4 mb-4 border-secondary">
            
            <div class="row align-items-center">
                <div class="col-md-6 mb-3 mb-md-0">
                    <p class="mb-0">&copy; <?php echo date('Y'); ?> <?php echo APP_NAME; ?>. All rights reserved.</p>
                </div>
                <div class="col-md-6 text-md-end">
                    <ul class="footer-bottom-links">
                        <li><a href="<?php echo APP_URL; ?>/legal/privacy-policy.php">Privacy Policy</a></li>
                        <li><a href="<?php echo APP_URL; ?>/legal/terms-of-service.php">Terms of Service</a></li>
                        <li><a href="<?php echo APP_URL; ?>/legal/cookie-policy.php">Cookie Policy</a></li>
                        <li><a href="<?php echo APP_URL; ?>/accessibility.php">Accessibility</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </footer>
    
    <!-- Back to Top Button -->
    <a href="#" class="back-to-top" aria-label="Back to top">
        <i class="fas fa-arrow-up"></i>
    </a>
    
    <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom JavaScript -->
    <script src="<?php echo APP_URL; ?>/assets/js/main.js"></script>
    <script src="<?php echo APP_URL; ?>/assets/js/dark-mode.js"></script>
    
    <?php if (isset($extraJS)): ?>
        <?php foreach ($extraJS as $js): ?>
            <script src="<?php echo APP_URL; ?>/assets/js/<?php echo $js; ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>
</body>
</html>