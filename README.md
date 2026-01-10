# Lineng Hydraulic Press Landing Page

Static landing page for Lineng Hydraulic Press solutions.

## Deployment

This site uses **GitHub Pages** with GitHub Actions workflow for automatic deployment.

### Deployment Checklist

Before pushing to production, verify the following in your deployment dashboard:

#### GitHub Pages Settings (Repository Settings → Pages)
- [ ] Source: "GitHub Actions" is selected (not "Deploy from a branch")
- [ ] Branch: `main` branch is used for deployment
- [ ] Custom domain: Verify domain is correctly configured (if applicable)
- [ ] Build directory: Root directory (`.`) is correct (uploads entire repo)

#### GitHub Actions Workflow (`.github/workflows/static.yml`)
- [ ] Workflow is enabled: Check "Actions" tab shows the workflow is active
- [ ] Last deployment: Verify the latest commit shows as "Deploy to GitHub Pages" action
- [ ] Deployment status: Check for any failed deployments in Actions tab
- [ ] Environment: Verify `github-pages` environment settings are correct

#### Post-Deployment Verification
- [ ] Visit production URL and test WhatsApp floating button:
  - [ ] Button appears in bottom-right corner
  - [ ] Button uses avatar image (`/images/wa-avatar-128.png`)
  - [ ] Click opens WhatsApp link correctly (`https://wa.me/86189622292350`)
  - [ ] GTM trigger "Click URL contains wa.me" fires correctly
- [ ] Test on mobile device:
  - [ ] Button respects safe-area-inset-bottom (no overlap on iPhone)
  - [ ] Pulse animation works (if enabled, respect prefers-reduced-motion)
  - [ ] Button size is appropriate (54px on mobile)
- [ ] Test on desktop:
  - [ ] Hover effect works (lift + shadow)
  - [ ] Focus ring appears on keyboard navigation
  - [ ] Tooltip (if any) appears on hover
- [ ] Check browser console:
  - [ ] No JavaScript errors related to WhatsApp button
  - [ ] dataLayer events are pushed on click (check with GTM Preview mode)
- [ ] Verify GTM integration:
  - [ ] GTM container loads correctly
  - [ ] Existing trigger "Click URL contains wa.me" still fires
  - [ ] New event "whatsapp_click" is pushed to dataLayer (verify in Preview mode)

#### Files to Verify
- [ ] `index.html` contains the WhatsApp button markup with `id="waFab"` and `data-gtm="whatsapp_fab"`
- [ ] CSS for `.wa-fab` includes safe-area-inset support
- [ ] JavaScript tracking code is present before `</body>`
- [ ] Image `/images/wa-avatar-128.png` exists and is accessible

### Manual Deployment

If automatic deployment fails:

1. **Check GitHub Actions logs:**
   ```bash
   # Go to: Repository → Actions tab
   # Click on the latest workflow run
   # Check for any error messages
   ```

2. **Verify branch and commit:**
   ```bash
   git status
   git log --oneline -5
   ```

3. **Force re-deploy (if needed):**
   ```bash
   # Push an empty commit to trigger workflow
   git commit --allow-empty -m "Trigger deployment"
   git push origin main
   ```

### Local Testing

Before deploying, test locally:

1. **Serve locally:**
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Node.js http-server
   npx http-server -p 8000
   ```

2. **Test WhatsApp button:**
   - Open `http://localhost:8000`
   - Verify button appears and functions correctly
   - Open browser DevTools → Console → Check for errors
   - Open Network tab → Verify `/images/wa-avatar-128.png` loads

3. **Test responsive design:**
   - Use browser DevTools device emulator
   - Test on mobile viewport (< 576px)
   - Verify safe-area-inset support on iPhone simulator (if available)

## Project Structure

```
/
├── index.html              # Main landing page
├── thanks/
│   └── index.html         # Thank you page
├── assets/
│   └── js/
│       ├── quote-modal.js         # Quote modal handler
│       └── quote-submit-gsheet.js # Form submission
├── images/
│   ├── wa-avatar-128.png  # WhatsApp button avatar
│   └── ...
├── .github/
│   └── workflows/
│       └── static.yml     # GitHub Pages deployment workflow
└── README.md              # This file
```

## Notes

- All CSS and JavaScript are inline in `index.html` (no external CSS/JS files except CDN libraries)
- WhatsApp floating button uses `/images/wa-avatar-128.png` as background image
- GTM tracking: Existing trigger uses "Click URL contains wa.me" - do not change href format
- Future tracking: dataLayer event "whatsapp_click" is pushed on click (for future GTM setup)

