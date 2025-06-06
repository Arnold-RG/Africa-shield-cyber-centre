<?php
require_once 'config.php';
require_once 'db.php';
require_once 'auth.php';
require_once 'functions.php';

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Get current language
$currentLang = getCurrentLanguage();

// Get current page for navigation highlighting
$currentPage = basename($_SERVER['PHP_SELF']);

// Check if user is logged in
$isLoggedIn = $auth->isLoggedIn();
$currentUser = $isLoggedIn ? $auth->getCurrentUser() : null;
?>
<!DOCTYPE html>
<html lang="<?php echo $currentLang; ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title><?php echo isset($pageTitle) ? $pageTitle . ' - ' . APP_NAME : APP_NAME; ?></title>
    <meta name="description" content="<?php echo isset($pageDescription) ? $pageDescription : 'East Africa Shield Cyber Centre - The leading cybersecurity platform protecting East Africa\'s digital ecosystem'; ?>">
    
    <!-- Favicon -->
    <link rel="shortcut icon" href="<?php echo APP_URL; ?>/assets/images/favicon.ico" type="image/x-icon">
    
    <!-- CSS Libraries -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="<?php echo APP_URL; ?>/assets/css/main.css">
    <link rel="stylesheet" href="<?php echo APP_URL; ?>/assets/css/dark-mode.css">
    
    <?php if (isset($extraCSS)): ?>
        <?php foreach ($extraCSS as $css): ?>
            <link rel="stylesheet" href="<?php echo APP_URL; ?>/assets/css/<?php echo $css; ?>">
        <?php endforeach; ?>
    <?php endif; ?>
</head>

<body class="<?php echo isset($_COOKIE['darkMode']) && $_COOKIE['darkMode'] === 'true' ? 'dark-mode' : ''; ?>">
    <header class="main-header">
        <div class="container">
            <nav class="navbar navbar-expand-lg">
                <a class="navbar-brand" href="<?php echo APP_URL; ?>/index.php">
                    <img src="<?php echo APP_URL; ?>/assets/images/logo.png" alt="Africa Shield Cyber Centre Logo"
                        class="logo">
                    <span>East Africa Shield Cyber Centre</span>
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarMain">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item">
                            <a class="nav-link <?php echo $currentPage === 'learn.php' ? 'active' : ''; ?>" href="<?php echo APP_URL; ?>/learn/learn.php">
                                <i class="fas fa-graduation-cap me-1"></i> Learn
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $currentPage === 'report.php' ? 'active' : ''; ?>" href="<?php echo APP_URL; ?>/report/report.php">
                                <i class="fas fa-shield-alt me-1"></i> Report
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $currentPage === 'games.php' ? 'active' : ''; ?>" href="<?php echo APP_URL; ?>/games/index.php">
                                <i class="fas fa-gamepad me-1"></i> Games
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $currentPage === 'dashboard.php' ? 'active' : ''; ?>" href="<?php echo APP_URL; ?>/dashboard/index.php">
                                <i class="fas fa-chart-line me-1"></i> Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $currentPage === 'events.php' ? 'active' : ''; ?>" href="<?php echo APP_URL; ?>/events/index.php">
                                <i class="fas fa-calendar-alt me-1"></i> Events
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $currentPage === 'about.php' ? 'active' : ''; ?>" href="<?php echo APP_URL; ?>/about/index.php">
                                <i class="fas fa-info-circle me-1"></i> About
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $currentPage === 'contact.php' ? 'active' : ''; ?>" href="<?php echo APP_URL; ?>/contact/contact.php">
                                <i class="fas fa-envelope me-1"></i> Contact
                            </a>
                        </li>
                    </ul>
                    
                    <div class="d-flex align-items-center">
                        <?php if ($isLoggedIn): ?>
                            <div class="dropdown">
                                <button class="btn btn-outline-primary dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fas fa-user-circle me-1"></i>
                                    <?php echo htmlspecialchars($currentUser['username']); ?>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                                    <li><a class="dropdown-item" href="<?php echo APP_URL; ?>/user/profile.php"><i class="fas fa-user me-2"></i>My Profile</a></li>
                                    <li><a class="dropdown-item" href="<?php echo APP_URL; ?>/user/dashboard.php"><i class="fas fa-tachometer-alt me-2"></i>My Dashboard</a></li>
                                    <li><a class="dropdown-item" href="<?php echo APP_URL; ?>/user/settings.php"><i class="fas fa-cog me-2"></i>Settings</a></li>
                                    <?php if ($auth->hasRole(['admin', 'moderator'])): ?>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item" href="<?php echo APP_URL; ?>/admin/index.php"><i class="fas fa-lock me-2"></i>Admin Panel</a></li>
                                    <?php endif; ?>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="<?php echo APP_URL; ?>/auth/logout.php"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                                </ul>
                            </div>
                        <?php else: ?>
                            <a href="<?php echo APP_URL; ?>/auth/login.php" class="btn btn-outline-primary me-2">
                                <i class="fas fa-sign-in-alt me-1"></i> Login
                            </a>
                            <a href="<?php echo APP_URL; ?>/auth/register.php" class="btn btn-primary">
                                <i class="fas fa-user-plus me-1"></i> Register
                            </a>
                        <?php endif; ?>
                        
                        <button id="darkModeToggle" class="btn btn-icon ms-2" aria-label="Toggle dark mode">
                            <i class="fas fa-moon"></i>
                        </button>
                        
                        <div class="dropdown ms-2">
                            <button class="btn btn-icon dropdown-toggle" type="button" id="languageDropdown" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Select language">
                                <i class="fas fa-globe"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="languageDropdown">
                                <li><a class="dropdown-item <?php echo $currentLang === 'en' ? 'active' : ''; ?>" href="?lang=en">English</a></li>
                                <li><a class="dropdown-item <?php echo $currentLang === 'fr' ? 'active' : ''; ?>" href="?lang=fr">Français</a></li>
                                <li><a class="dropdown-item <?php echo $currentLang === 'sw' ? 'active' : ''; ?>" href="?lang=sw">Kiswahili</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    </header>

    <!-- Flash Messages -->
    <?php $flashMessage = getFlashMessage(); ?>
    <?php if ($flashMessage): ?>
    <div class="container mt-3">
        <div class="alert alert-<?php echo $flashMessage['type']; ?> alert-dismissible fade show" role="alert">
            <?php echo $flashMessage['message']; ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    </div>
    <?php endif; ?>

    <main id="main-content">