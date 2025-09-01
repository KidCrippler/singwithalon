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
        
        // Video routing map
        this.videoMap = {
            'tadmit': {
                src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/tadmit.mp4',
                title: 'תדמית - אלון כהן מוביל שירה בציבור',
                description: 'סרטון תדמית המציג את אלון כהן בפעולה - שירה בציבור מקצועית עם מערכת בחירת שירים אינטראקטיבית'
            },
            'rony': {
                src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/rony.mp4',
                title: 'רוני - גזוז',
                description: 'ביצוע אנרגטי של השיר "רוני" של גזוז - שמח ומשמח!'
            },
            'jam-toren': {
                src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/jam_toren.mp4',
                title: 'לבן על לבן - מג\'מג\'ם ספונטנית עם דן תורן ז"ל',
                description: 'ביצוע אקוסטי של השיר "לבן על לבן" במג\'מג\'ם ספונטנית עם דן תורן ז"ל'
            },
            'borot': {
                src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/borot.mp4',
                title: 'אל בורות המים - נעמי שמר',
                description: 'ביצוע חי של השיר הקלאסי "אל בורות המים" של נעמי שמר - שירי ארץ ישראל הישנה והטובה'
            },
            'kvar-avar': {
                src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/kvar_avar.mp4',
                title: 'מה רצינו להגיד - שלמה ארצי (קאבר גיטרה)',
                description: 'קאבר גיטרה מרגש של השיר "מה רצינו להגיד" של שלמה ארצי - שירי זיכרון'
            }
        };
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupScrollEffects();
        this.setupVideoHandlers();
        this.setupVideoRouting();
        this.setupContactForm();
        this.setupAnimations();
        this.setupSmoothScrolling();
        this.setupParallaxOptimizations();
        
        // Check for video route on page load
        this.handleVideoRoute();
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
        const hero = document.querySelector('.hero');
        const heroOverlay = document.querySelector('.hero-overlay');
        const parallaxLayers = document.querySelectorAll('.parallax-layer');
        
        // Performance optimization: use requestAnimationFrame and Intersection Observer
        let ticking = false;
        let heroVisible = true;
        
        // Intersection Observer to only animate when hero is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                heroVisible = entry.isIntersecting;
            });
        }, {
            rootMargin: '100px 0px'
        });
        
        if (hero) observer.observe(hero);

        const updateParallax = () => {
            const currentScrollY = window.scrollY;

            // Navbar scroll effect
            if (currentScrollY > 100) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }

            // Multi-layer parallax effect for hero section (only when visible)
            if (hero && heroVisible && currentScrollY < window.innerHeight * 1.2) {
                // Apply parallax to each layer based on data-speed attribute
                parallaxLayers.forEach(layer => {
                    const speed = parseFloat(layer.dataset.speed) || 0;
                    const yPos = currentScrollY * speed;
                    
                    // Use transform3d for hardware acceleration
                    layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
                });
                
                // Keep existing overlay effect
                if (heroOverlay) {
                    heroOverlay.style.transform = `translate3d(0, ${currentScrollY * 0.4}px, 0)`;
                }
                
                // Old CSS custom property removed - now using only image-based parallax layers
            }

            // Update active nav link based on current section
            this.updateActiveNavLink();

            lastScrollY = currentScrollY;
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };

        // Use throttled scroll event for better performance
        window.addEventListener('scroll', requestTick, { passive: true });
        
        // Initial call to set correct positions
        updateParallax();
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

        // Handle browser back button
        window.addEventListener('popstate', (e) => {
            if (this.videoModal && this.videoModal.style.display === 'block') {
                this.closeVideoModal(true); // true = skip history change to avoid infinite loop
            }
        });
    }

    openVideoModal(videoSrc, isRoute = false) {
        if (this.videoModal && this.modalVideo) {
            this.modalVideo.src = videoSrc;
            this.videoModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Only push history state if not coming from a route
            if (!isRoute) {
                history.pushState({ modalOpen: true }, '', '');
            }
            
            // Auto-play the video
            setTimeout(() => {
                this.modalVideo.play().catch(e => {
                    console.log('Auto-play prevented:', e);
                });
            }, 100);
        }
    }

    closeVideoModal(skipHistoryChange = false) {
        if (this.videoModal && this.modalVideo) {
            this.videoModal.style.display = 'none';
            this.modalVideo.pause();
            this.modalVideo.src = '';
            document.body.style.overflow = 'auto';
            
            // Check if we're on a video route
            const path = window.location.pathname;
            const isVideoRoute = path.match(/^\/video\/(.+)$/);
            
            if (isVideoRoute) {
                // If we're on a video route, go back to main page
                window.history.pushState(null, 'שירה בציבור מקצועית | אלון כהן - קלידן ומוביל שירה', '/');
                document.title = 'שירה בציבור מקצועית | אלון כהן - קלידן ומוביל שירה';
            } else if (!skipHistoryChange && window.history.state && window.history.state.modalOpen) {
                // Go back in history if we added a state (but only if not called from popstate)
                history.back();
            }
        }
    }

    setupVideoRouting() {
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            this.handleVideoRoute();
        });
    }

    handleVideoRoute() {
        const path = window.location.pathname;
        const videoMatch = path.match(/^\/video\/(.+)$/);
        
        if (videoMatch) {
            const videoId = videoMatch[1];
            const video = this.videoMap[videoId];
            
            if (video) {
                // Update page title for the video
                document.title = `${video.title} | שרים עם אלון כהן`;
                
                // Open the video modal with the specific video
                this.openVideoModal(video.src, true);
                
                // Scroll to videos section to make video prominent
                const videosSection = document.getElementById('videos');
                if (videosSection) {
                    videosSection.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                // Video not found, redirect to main page
                window.history.replaceState(null, '', '/');
            }
        } else {
            // Not a video route, restore original title
            document.title = 'שירה בציבור מקצועית | אלון כהן - קלידן ומוביל שירה';
        }
    }

    openVideoForRoute(videoId) {
        const video = this.videoMap[videoId];
        if (video) {
            // Update URL without triggering navigation
            const videoUrl = `/video/${videoId}`;
            window.history.pushState({ video: videoId }, video.title, videoUrl);
            
            // Update page title
            document.title = `${video.title} | שרים עם אלון כהן`;
            
            // Open the video
            this.openVideoModal(video.src, true);
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
        
        // Try multiple methods to open WhatsApp
        try {
            // Method 1: Try window.open with user gesture
            const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            
            // Method 2: If popup blocked, use direct navigation
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                // Popup was blocked, use location.href as fallback
                window.location.href = whatsappUrl;
            } else {
                // Popup opened successfully
                this.showMessage('הודעת WhatsApp נוצרה בהצלחה! הדפדפן ייפתח בעוד רגע.', 'success');
                this.contactForm.reset();
            }
        } catch (error) {
            // Method 3: Direct navigation as last resort
            console.log('Popup failed, using direct navigation:', error);
            window.location.href = whatsappUrl;
        }
        
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

    setupParallaxOptimizations() {
        // Reduce parallax complexity on low-end devices
        const isLowEndDevice = () => {
            return navigator.hardwareConcurrency <= 4 || 
                   window.devicePixelRatio < 1.5 ||
                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        };

        // Disable complex filters on mobile/low-end devices
        if (isLowEndDevice()) {
            document.querySelectorAll('.parallax-layer').forEach(layer => {
                layer.style.filter = 'none';
            });
        }

        // Pause parallax when tab is not visible
        document.addEventListener('visibilitychange', () => {
            const parallaxLayers = document.querySelectorAll('.parallax-layer');
            if (document.hidden) {
                parallaxLayers.forEach(layer => {
                    layer.style.willChange = 'auto';
                });
            } else {
                parallaxLayers.forEach(layer => {
                    layer.style.willChange = 'transform';
                });
            }
        });

        // Intersection Observer to only animate when hero is visible
        const heroObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Enable parallax
                        document.body.classList.add('parallax-active');
                    } else {
                        // Disable parallax when hero is not visible
                        document.body.classList.remove('parallax-active');
                    }
                });
            },
            { threshold: 0.1 }
        );

        const hero = document.querySelector('.hero');
        if (hero) {
            heroObserver.observe(hero);
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
            'assets/logo.jpg'
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

// Chatbot functionality
class Chatbot {
    constructor() {
        this.chatWidget = document.getElementById('chatbot-widget');
        this.chatToggle = document.getElementById('chat-toggle');
        this.chatModal = document.getElementById('chat-modal');
        this.chatClose = document.getElementById('chat-close');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInputField = document.getElementById('chat-input-field');
        this.chatSend = document.getElementById('chat-send');
        this.chatTyping = document.getElementById('chat-typing');
        this.chatTooltip = document.getElementById('chat-tooltip');
        
        this.isOpen = false;
        this.isTyping = false;
        
        // Railway Backend API configuration
        this.API_BASE_URL = 'https://singwithalon-ai-chat-production.up.railway.app';
        this.USE_BACKEND_API = true; // Always use backend API (with fallback on errors)
        
        // Session message limiting (10 messages per session)
        this.sessionMessageCount = 0;
        this.MAX_MESSAGES_PER_SESSION = 10;
        
        // Session management for backend
        this.sessionId = this.getOrCreateSessionId();
        this.conversationHistory = [];
        
        // Only initialize if all required elements exist
        if (this.chatWidget && this.chatToggle && this.chatModal) {
            this.init();
        } else {
            console.warn('Chatbot elements not found, skipping initialization');
        }
    }
    
    init() {
        this.setupEventListeners();
        this.setupSuggestions();
        this.enableInputValidation();
        this.setupTooltipIntroduction();
        this.setupPeriodicGlowEffect();
    }
    
    // Session management for backend API
    getOrCreateSessionId() {
        // Always generate a new session ID on each page load
        const sessionId = this.generateSessionId();
        localStorage.setItem('chat_session_id', sessionId);
        
        return sessionId;
    }
    
    generateSessionId() {
        // Generate a unique session ID
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    
    // Session message limit check
    canSendMessage() {
        return this.sessionMessageCount < this.MAX_MESSAGES_PER_SESSION;
    }
    
    setupEventListeners() {
        // Toggle chat
        if (this.chatToggle) {
            this.chatToggle.addEventListener('click', () => {
                this.toggleChat();
            });
        }
        
        // Close chat
        if (this.chatClose) {
            this.chatClose.addEventListener('click', () => {
                this.closeChat();
            });
        }
        
        // Send message
        if (this.chatSend) {
            this.chatSend.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // Send on Enter key
        if (this.chatInputField) {
            this.chatInputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && this.chatInputField.value.trim()) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.chatWidget.contains(e.target)) {
                this.closeChat();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeChat();
            }
        });
    }
    
    setupSuggestions() {
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.textContent;
                this.chatInputField.value = question;
                this.sendMessage();
            });
        });
    }
    
    enableInputValidation() {
        if (this.chatInputField && this.chatSend) {
            this.chatInputField.addEventListener('input', () => {
                const hasText = this.chatInputField.value.trim().length > 0;
                this.chatSend.disabled = !hasText || this.isTyping || !this.canSendMessage();
            });
        }
    }
    
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    openChat() {
        this.isOpen = true;
        if (this.chatToggle) this.chatToggle.classList.add('active');
        if (this.chatModal) this.chatModal.classList.add('open');
        setTimeout(() => {
            if (this.chatInputField) this.chatInputField.focus();
        }, 300);
    }
    
    closeChat() {
        this.isOpen = false;
        if (this.chatToggle) this.chatToggle.classList.remove('active');
        if (this.chatModal) this.chatModal.classList.remove('open');
    }
    
    sendMessage() {
        if (!this.chatInputField) return;
        
        const text = this.chatInputField.value.trim();
        if (!text || this.isTyping) return;
        
        // Check session message limit
        if (!this.canSendMessage()) {
            this.addMessage('מצטער, הגעתם למגבלת 10 הודעות לשיחה. אשמח אם תצרו קשר ישירות בוואטסאפ: 052-896-2110', 'bot');
            this.disableChatInput();
            return;
        }
        
        // Increment session message count
        this.sessionMessageCount++;
        
        // Check if we've reached the limit after this message
        if (this.sessionMessageCount >= this.MAX_MESSAGES_PER_SESSION) {
            // Disable input after AI response
            setTimeout(() => {
                this.disableChatInput();
            }, 2000); // Wait for AI response to complete
        }
        
        this.addMessage(text, 'user');
        this.chatInputField.value = '';
        if (this.chatSend) this.chatSend.disabled = true;
        
        // Add to conversation history (new API format)
        this.conversationHistory.push({ role: 'user', parts: [{ text: text }] });
        
        // Show typing and get AI response
        this.showTyping();
        this.getAIResponse(text);
    }
    
    addMessage(text, sender) {
        if (!this.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const time = new Date().toLocaleTimeString('he-IL', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const avatar = sender === 'bot' ? 
            '<div class="message-avatar"><i class="fas fa-music"></i></div>' :
            '<div class="message-avatar"><i class="fas fa-user"></i></div>';
        
        // Process text for clickable links (only for bot messages)
        const processedText = sender === 'bot' ? this.processTextForLinks(text) : text;
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">
                <p>${processedText}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    showTyping() {
        this.isTyping = true;
        if (this.chatTyping) this.chatTyping.style.display = 'flex';
        if (this.chatSend) this.chatSend.disabled = true;
        this.scrollToBottom();
    }
    
    hideTyping() {
        this.isTyping = false;
        if (this.chatTyping) this.chatTyping.style.display = 'none';
        if (this.chatSend && this.chatInputField) {
            this.chatSend.disabled = this.chatInputField.value.trim().length === 0 || !this.canSendMessage();
        }
    }
    
    scrollToBottom() {
        if (this.chatMessages) {
            setTimeout(() => {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }, 100);
        }
    }
    
    disableChatInput() {
        if (this.chatInputField) {
            this.chatInputField.disabled = true;
            this.chatInputField.placeholder = 'הגעתם למגבלת 10 הודעות - צרו קשר בוואטסאפ';
        }
        if (this.chatSend) {
            this.chatSend.disabled = true;
        }
    }
    
    // Helper method to detect mobile devices
    isMobileDevice() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Helper method to make phone numbers and WhatsApp links clickable
    processTextForLinks(text) {
        const isMobile = this.isMobileDevice();
        
        // Phone number pattern (Israeli format)
        const phonePattern = /(0\d{1,2}-?\d{3}-?\d{4})/g;
        
        // WhatsApp link pattern
        const whatsappPattern = /(https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s]+)/g;
        
        let processedText = text;
        
        // Process WhatsApp links first
        processedText = processedText.replace(whatsappPattern, (match) => {
            if (isMobile) {
                // Mobile: Direct WhatsApp link
                return `<a href="${match}" target="_blank" style="color: #25D366; text-decoration: underline;">צור קשר בוואטסאפ</a>`;
            } else {
                // Web: WhatsApp Web
                return `<a href="${match}" target="_blank" style="color: #25D366; text-decoration: underline;">צור קשר בוואטסאפ</a>`;
            }
        });
        
        // Process phone numbers
        processedText = processedText.replace(phonePattern, (match) => {
            const cleanPhone = match.replace(/-/g, '');
            if (isMobile) {
                // Mobile: Make phone number clickable to dial
                return `<a href="tel:${cleanPhone}" style="color: #007bff; text-decoration: underline;">${match}</a>`;
            } else {
                // Web: Phone number not clickable, but styled
                return `<span style="color: #007bff; font-weight: bold;">${match}</span>`;
            }
        });
        
        return processedText;
    }
    
    // AI Response - integrates with Railway backend or fallback
    async getAIResponse(userMessage) {
        if (this.USE_BACKEND_API) {
            await this.getBackendResponse(userMessage);
        } else {
            await this.getFallbackResponse(userMessage);
        }
    }
    
    // Railway Backend API integration
    async getBackendResponse(userMessage) {
        try {
            const requestBody = {
                messages: this.conversationHistory,
                session_id: this.sessionId
            };
            
            
            // Add timeout to prevent hanging requests
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
            );
            
            const fetchPromise = fetch(`${this.API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                throw new Error(`Backend API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            
            // Update session ID if provided by backend
            if (data.session_id && data.session_id !== this.sessionId) {
                this.sessionId = data.session_id;
                localStorage.setItem('chat_session_id', this.sessionId);
            }
            
            // Add to conversation history (new API format)
            this.conversationHistory.push({ role: 'assistant', parts: [{ text: data.response }] });
            
            // Keep conversation history manageable
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-8);
            }
            
            this.hideTyping();
            this.addMessage(data.response, 'bot');
            
        } catch (error) {
            console.error('Backend API Error:', error);
            this.hideTyping();
            
            // Handle specific error cases
            if (error.message.includes('429')) {
                this.addMessage('הגעתם למגבלת ההודעות השעתית. אשמח אם תצרו קשר ישירות בוואטסאפ: 052-896-2110', 'bot');
            } else if (error.message.includes('500')) {
                this.addMessage('יש בעיה זמנית במערכת. אני זמין בוואטסאפ לכל שאלה: 052-896-2110', 'bot');
            } else {
                // Any error (timeout, network, connection, etc.) - fallback to local response
                await this.getFallbackResponse(userMessage);
            }
        }
    }
    
    // Fallback response system when backend is unavailable
    async getFallbackResponse(userMessage) {
        // Simple keyword-based responses for when backend is down
        const responses = {
            'מה כלול במופע אינטראקטיבי': 'במופע האינטראקטיבי שלי כלול: מערכת בחירת שירים בזמן אמת, ליווי מוזיקלי מלא, מיקרופונים אלחוטיים לקהל, הקרנת מילים, והגברה מקצועית. הקהל בוחר מתוך מאות שירים ברפרטואר!',
            'כמה עולה מופע': 'המחיר תלוי במספר גורמים כמו מספר האורחים, משך הזמן, והמיקום. אשמח לתת לכם הצעת מחיר מדויקת לאחר שתספרו לי על האירוע שלכם. בואו נעבור לוואטסאפ לפרטים? 052-896-2110',
            'איך פועלת מערכת בחירת השירים': 'המערכת שלי פשוטה וכיפית! האורחים נכנסים לאתר באמצעות QR קוד, רואים רשימה של מאות שירים לבחירה, ובוחרים את השירים שהם הכי אוהבים. אני רואה את הבקשות בזמן אמת ובונה את המופע בהתאם!',
            'default': [
                'אשמח לעזור לכם עם האירוע! בואו נדבר יותר בפירוט בוואטסאפ: 052-896-2110',
                'שאלה מעולה! אני זמין לענות על כל השאלות שלכם בוואטסאפ: 052-896-2110',
                'אשמח לעזור לכם לתכנן את האירוע המושלם! בואו נמשיך בוואטסאפ: 052-896-2110'
            ]
        };
        
        // Simulate AI thinking delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        const lowerMessage = userMessage.toLowerCase();
        let response = null;
        
        // Find best matching response
        for (const [key, responseText] of Object.entries(responses)) {
            if (key !== 'default' && lowerMessage.includes(key)) {
                response = responseText;
                break;
            }
        }
        
        // Check for common patterns
        if (!response) {
            if (lowerMessage.includes('מחיר') || lowerMessage.includes('עולה') || lowerMessage.includes('עלות')) {
                response = responses['כמה עולה מופע'];
            } else if (lowerMessage.includes('שיר') || lowerMessage.includes('רפרטואר') || lowerMessage.includes('מוזיקה')) {
                response = 'ברפרטואר שלי יש מאות שירים מכל התקופות: שירי ארץ ישראל הישנים, שלמה ארצי, יהורם גאון, הדודאים, עד שירים מודרניים יותר. במערכת האינטראקטיבית האורחים יכולים לראות את כל הרשימה ולבחור!';
            }
        }
        
        // Use default response if no match found
        if (!response) {
            const defaultResponses = responses['default'];
            response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
        }
        
        this.hideTyping();
        this.addMessage(response, 'bot');
    }
    
    // Setup tooltip introduction that shows after 3 seconds and hides after 3 more seconds
    setupTooltipIntroduction() {
        if (!this.chatTooltip) return;
        
        // Show tooltip after 3 seconds
        setTimeout(() => {
            this.chatTooltip.classList.add('show');
            
            // Hide tooltip after 3 more seconds
            setTimeout(() => {
                this.chatTooltip.classList.remove('show');
            }, 3000);
        }, 3000);
        
        // Hide tooltip if user interacts with chat button
        this.chatToggle.addEventListener('click', () => {
            this.chatTooltip.classList.remove('show');
        });
    }
    
    // Setup periodic dramatic glow effect every 8 seconds
    setupPeriodicGlowEffect() {
        setInterval(() => {
            if (!this.isOpen) { // Only glow if chat is not already open
                this.chatToggle.classList.add('glow-effect');
                
                // Remove glow effect after animation completes
                setTimeout(() => {
                    this.chatToggle.classList.remove('glow-effect');
                }, 1500);
            }
        }, 8000);
    }
}

// Initialize the site when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main functionality
    new MusicianSite();
    
    // Initialize chatbot
    new Chatbot();
    
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

