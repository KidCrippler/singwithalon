class MusicianSite {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.hamburger = document.getElementById('hamburger');
        this.navMenu = document.getElementById('nav-menu');
        this.videoModal = document.getElementById('video-modal');
        this.modalVideo = document.getElementById('modal-video');
        this.heroVideo = document.getElementById('hero-video');
        this.videoPlayBtn = document.getElementById('video-play-btn');
        this.contactForm = document.getElementById('contact-form');
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupScrollEffects();
        this.setupVideoHandlers();
        this.setupContactForm();
        this.setupAnimations();
        this.setupSmoothScrolling();
    }

    setupNavigation() {
        // Mobile menu toggle
        this.hamburger.addEventListener('click', () => {
            this.navMenu.classList.toggle('active');
            this.hamburger.classList.toggle('active');
        });

        // Close mobile menu when clicking on links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                this.navMenu.classList.remove('active');
                this.hamburger.classList.remove('active');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navMenu.contains(e.target) && !this.hamburger.contains(e.target)) {
                this.navMenu.classList.remove('active');
                this.hamburger.classList.remove('active');
            }
        });
    }

    setupScrollEffects() {
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // Navbar scroll effect
            if (currentScrollY > 100) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }

            // Update active nav link based on current section
            this.updateActiveNavLink();

            lastScrollY = currentScrollY;
        });
    }

    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                if (navLink) {
                    navLink.classList.add('active');
                }
            }
        });
    }

    setupVideoHandlers() {
        // Hero video now uses native controls
        // No custom handlers needed for hero video

        // Video gallery modal
        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const videoSrc = btn.getAttribute('data-video');
                this.openVideoModal(videoSrc);
            });
        });

        // Close modal functionality
        const closeBtn = document.querySelector('.video-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeVideoModal();
            });
        }

        // Close modal when clicking outside
        if (this.videoModal) {
            this.videoModal.addEventListener('click', (e) => {
                if (e.target === this.videoModal) {
                    this.closeVideoModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeVideoModal();
            }
        });
    }

    openVideoModal(videoSrc) {
        if (this.videoModal && this.modalVideo) {
            this.modalVideo.src = videoSrc;
            this.videoModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Auto-play the video
            setTimeout(() => {
                this.modalVideo.play().catch(e => {
                    console.log('Auto-play prevented:', e);
                });
            }, 100);
        }
    }

    closeVideoModal() {
        if (this.videoModal && this.modalVideo) {
            this.videoModal.style.display = 'none';
            this.modalVideo.pause();
            this.modalVideo.src = '';
            document.body.style.overflow = 'auto';
        }
    }

    setupContactForm() {
        if (this.contactForm) {
            this.contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }
    }

    async handleFormSubmission() {
        const formData = new FormData(this.contactForm);
        const data = Object.fromEntries(formData);
        
        // Validate form first
        const errors = FormValidator.validateForm(data);
        if (errors.length > 0) {
            this.showMessage(errors.join('\n'), 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = this.contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> יוצר הודעה...';
        submitBtn.disabled = true;

        try {
            // Create WhatsApp message
            await this.sendWhatsAppMessage(data);
            
        } catch (error) {
            console.error('WhatsApp message error:', error);
            this.showMessage('שגיאה ביצירת הודעת WhatsApp. אנא נסו שוב.', 'error');
        } finally {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async sendWhatsAppMessage(data) {
        const formattedDate = data.date ? new Date(data.date).toLocaleDateString('he-IL') : 'לא צוין';
        
        const message = `שלום אלון! 🎵

אני מעוניין/ת להזמין מופע:

👤 שם: ${data.name}
📞 טלפון: ${data.phone}
📅 תאריך מועדף: ${formattedDate}

💬 פרטים נוספים:
${data.message || 'לא צוינו פרטים נוספים'}

אשמח לשמוע ממך בהקדם! 🎶`;

        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);
        const phoneNumber = '972528962110'; // Your WhatsApp number in international format
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        
        // Show success message
        this.showMessage('הודעת WhatsApp נוצרה בהצלחה! הדפדפן ייפתח בעוד רגע.', 'success');
        this.contactForm.reset();
        
        return true;
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.form-message');
        existingMessages.forEach(msg => msg.remove());

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `form-message ${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        // Style the message
        messageEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px 20px;
            margin-top: 20px;
            border-radius: 10px;
            font-weight: 500;
            background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
            color: ${type === 'success' ? '#155724' : '#721c24'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
        `;

        // Insert after form
        this.contactForm.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe elements for animations
        document.querySelectorAll('.service-card, .testimonial-card, .video-card, .highlight-item').forEach(el => {
            el.classList.add('fade-in');
            observer.observe(el);
        });

        // Stagger animations for cards in the same section
        document.querySelectorAll('.services-grid .service-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.2}s`;
        });

        document.querySelectorAll('.testimonials-grid .testimonial-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.2}s`;
        });

        document.querySelectorAll('.videos-grid .video-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    setupSmoothScrolling() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Scroll indicator in hero section
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', () => {
                const aboutSection = document.getElementById('about');
                if (aboutSection) {
                    aboutSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Performance optimization for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Additional utility functions
class FormValidator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        // Israeli phone number validation
        const re = /^(\+972|0)([23489]|5[02468]|77)[0-9]{7}$/;
        return re.test(phone.replace(/[- ]/g, ''));
    }

    static validateForm(formData) {
        const errors = [];

        if (!formData.name || formData.name.length < 2) {
            errors.push('שם מלא חייב להכיל לפחות 2 תווים');
        }

        if (!FormValidator.validatePhone(formData.phone)) {
            errors.push('מספר טלפון לא תקין');
        }

        if (!formData.date) {
            errors.push('יש לבחור תאריך');
        } else {
            const selectedDate = new Date(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to compare dates only
            if (selectedDate < today) {
                errors.push('התאריך חייב להיות היום או בעתיד');
            }
        }

        return errors;
    }
}

// Performance optimizations
class PerformanceUtils {
    static lazyLoadImages() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    static preloadCriticalImages() {
        const criticalImages = [
            'assets/logo.jpg',
            'assets/video-poster.jpg'
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }
}

// Initialize the site when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main functionality
    new MusicianSite();
    
    // Performance optimizations
    PerformanceUtils.lazyLoadImages();
    PerformanceUtils.preloadCriticalImages();
    
    // Add loading completion class for CSS transitions
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// Handle page visibility changes (pause videos when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.paused) {
                video.pause();
                video.dataset.wasPlaying = 'true';
            }
        });
    } else {
        const videos = document.querySelectorAll('video[data-was-playing="true"]');
        videos.forEach(video => {
            video.play();
            delete video.dataset.wasPlaying;
        });
    }
});

// Handle window resize events
window.addEventListener('resize', () => {
    // Close mobile menu on resize to desktop
    if (window.innerWidth > 768) {
        const navMenu = document.getElementById('nav-menu');
        const hamburger = document.getElementById('hamburger');
        
        if (navMenu && hamburger) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    }
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
