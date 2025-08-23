# Codebase Structure

## File Organization
```
singwithalon/
├── index.html          # Main homepage with all sections
├── css/styles.css      # Complete RTL styling with responsive design  
├── js/script.js        # Main JavaScript functionality
├── assets/             # Images, logos, and media files
│   ├── logo.jpg        # Main logo
│   ├── logo.png        # PNG version of logo
│   ├── wallpaper.png   # Background pattern
│   └── parallax/       # Parallax background images
├── README.md           # Project documentation in Hebrew
├── CLAUDE.md          # Development instructions for Claude
├── CNAME              # Domain configuration
├── .gitignore         # Git ignore rules
└── config.template.js # Template for configuration
```

## Main JavaScript Classes

### MusicianSite Class (`js/script.js`)
Main application controller with methods:
- `init()` - Initialize the application
- `setupNavigation()` - Handle mobile menu and navigation
- `setupScrollEffects()` - Intersection Observer animations  
- `setupVideoHandlers()` - Video modal functionality
- `setupContactForm()` - Contact form validation and WhatsApp integration
- `setupAnimations()` - Scroll-triggered animations
- `setupSmoothScrolling()` - Smooth scroll behavior
- `setupParallaxOptimizations()` - Performance optimizations

### FormValidator Class (`js/script.js:372-408`)
- Validates contact forms with Israeli phone number validation
- Email and date validation with Hebrew error messages

### PerformanceUtils Class (`js/script.js:411-445`) 
- Lazy loading for images and performance optimizations
- Critical resource preloading

### Chatbot Class
- Interactive chat functionality (if enabled)

## Key Technical Patterns

### RTL Implementation
- HTML uses `<html lang="he" dir="rtl">`
- CSS uses `direction: rtl` on html element
- Flexbox and Grid layouts are RTL-aware
- Text alignment and positioning account for RTL flow

### Video Handling
- Hero video uses native HTML5 controls
- Gallery videos open in custom modal (`openVideoModal()`, `closeVideoModal()`)
- Video sources hosted on external CDN (Cloudflare R2)

### Contact Form Flow
- Form validation with Hebrew error messages
- Generates formatted WhatsApp message with event details
- Uses `wa.me` API for cross-platform WhatsApp integration
- Fallback handling for popup blockers