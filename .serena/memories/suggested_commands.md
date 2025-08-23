# Suggested Commands for Development

## Local Development
**Start local development server:**
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`

**Alternative simple server options:**
- Use any static file server
- Open `index.html` directly in browser for basic testing

## File Operations (macOS/Darwin)
```bash
# List files and directories
ls -la

# Find files by pattern  
find . -name "*.html" -o -name "*.css" -o -name "*.js"

# Search content in files
grep -r "searchterm" . --include="*.html" --include="*.css" --include="*.js"

# View file content
cat filename.html
head -n 20 filename.css
tail -n 10 filename.js

# Navigate directories
cd css/
pwd
```

## Git Operations
```bash
# Check status
git status

# Add files
git add .
git add specific-file.html

# Commit changes
git commit -m "Description of changes"

# Push to remote
git push origin main

# View recent commits
git log --oneline -5
```

## Project-Specific Tasks

### Content Updates
- **Edit HTML directly**: Modify `index.html` for content changes
- **Update contact info**: Phone (052-896-2110), Email (alon7@yahoo.com) in multiple HTML locations
- **Video updates**: Change video URLs and metadata in HTML

### Styling Changes
- **Modify styles**: Edit `css/styles.css`
- **Maintain RTL**: Respect RTL layouts when making layout changes
- **Color consistency**: Use established purple palette (#8b5fbf, #b19cd9)

### JavaScript Features
- **Extend functionality**: Add methods to `MusicianSite` class in `js/script.js`
- **Form validation**: Modify `FormValidator` class for new validation rules

## Testing and Validation
**Manual Testing:**
- Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- Test mobile responsiveness at different screen sizes
- Verify RTL layout behavior
- Test WhatsApp integration across devices
- Validate Hebrew text rendering

**Performance Testing:**
- Check page load speed
- Verify lazy loading works
- Test scroll animations performance

## Deployment Commands

### GitHub Pages
```bash
# After pushing to GitHub
# Enable GitHub Pages in repository settings
```

### Netlify
```bash
# Drag and drop project folder to netlify.com
# Or use Netlify CLI if installed
```

### Vercel  
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project directory
vercel
```

## File Permissions (if needed)
```bash
# Make files readable
chmod 644 *.html *.css *.js

# Make directories accessible  
chmod 755 css/ js/ assets/
```