# Code Style and Conventions

## CSS Conventions
- **RTL-First Design**: All layouts built with `direction: rtl` in mind
- **Mobile-First Responsive**: Breakpoints at 768px and 480px  
- **BEM-Like Naming**: Classes like `.nav-container`, `.hero-content`, `.video-modal`
- **CSS Variables**: Used for consistent color scheme and spacing
- **Flexbox/Grid**: Modern layout techniques throughout

## Color Palette (Musical Theme)
- **Primary Purple Gradient**: #8b5fbf to #b19cd9
- **Text Colors**: #2c3e50 for headings, #555 for body text
- **Background**: #f8f9fa with wallpaper pattern
- **Accent Colors**: Warm purples and complementary tones

## Typography System
- **Headings**: Secular One font (musical personality)
- **Body Text**: Heebo font (Hebrew-optimized)
- **Font Sizes**: Responsive with rem units
- **Letter Spacing**: 0.5px for headings for better readability

## JavaScript Conventions
- **ES6+ Features**: Classes, arrow functions, template literals, async/await
- **Modular Design**: Separate classes for different functionality
- **Event Delegation**: Efficient event handling patterns
- **Performance Patterns**: Throttling, debouncing, lazy loading
- **Error Handling**: Try-catch blocks for async operations

## Naming Conventions
- **Classes**: PascalCase (e.g., `MusicianSite`, `FormValidator`)
- **Methods**: camelCase (e.g., `setupNavigation`, `handleFormSubmission`)
- **CSS Classes**: kebab-case (e.g., `.nav-menu`, `.hero-content`)
- **IDs**: kebab-case (e.g., `#nav-menu`, `#contact-form`)

## Animation Patterns
- **Intersection Observer**: For scroll-triggered animations
- **CSS Transitions**: Smooth hover effects and state changes
- **Musical Elements**: Floating notes, breathing animations, sound waves
- **Performance**: Hardware acceleration with `transform3d()`

## Accessibility Considerations
- **Semantic HTML**: Proper heading hierarchy, landmarks
- **ARIA Labels**: For interactive elements
- **Focus Management**: Keyboard navigation support
- **Alt Text**: For all images and media