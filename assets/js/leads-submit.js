/**
 * Leads Submit Handler
 * Handles form submission for quote forms (modal and inline)
 * Supports Netlify Forms, webhook, or custom endpoints
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Form submission endpoint
    // Option 1: Netlify Forms (use form name attribute)
    // Option 2: Custom webhook/API endpoint
    // Option 3: Leave empty to use form action attribute
    submitEndpoint: '', // e.g., 'https://api.example.com/submit' or '' for Netlify
    
    // Success redirect URL
    successUrl: '/thanks/',
    
    // Enable/disable features
    enableNetlifyForms: true, // Auto-detect Netlify forms
    enableWebhook: false, // Enable webhook submission
    enableConsoleLog: true, // Log submission data (disable in production)
  };

  /**
   * Get form data as object
   */
  function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      // Handle multiple values (e.g., checkboxes)
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }
    
    // Add metadata
    data._timestamp = new Date().toISOString();
    data._source = form.id || 'unknown';
    data._userAgent = navigator.userAgent;
    data._referrer = document.referrer || '';
    
    return data;
  }

  /**
   * Validate form
   */
  function validateForm(form) {
    // Use native HTML5 validation
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return false;
    }
    
    return true;
  }

  /**
   * Show loading state
   */
  function setLoadingState(form, isLoading) {
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;
    
    if (isLoading) {
      submitButton.disabled = true;
      submitButton.setAttribute('data-original-text', submitButton.textContent);
      submitButton.textContent = 'Sending...';
      submitButton.style.opacity = '0.7';
      submitButton.style.cursor = 'not-allowed';
    } else {
      submitButton.disabled = false;
      const originalText = submitButton.getAttribute('data-original-text');
      if (originalText) {
        submitButton.textContent = originalText;
        submitButton.removeAttribute('data-original-text');
      }
      submitButton.style.opacity = '';
      submitButton.style.cursor = '';
    }
  }

  /**
   * Show error message
   */
  function showError(form, message) {
    // Remove existing error message
    const existingError = form.querySelector('.submit-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Create error element
    const errorEl = document.createElement('div');
    errorEl.className = 'submit-error alert alert-danger mt-3';
    errorEl.textContent = message || 'An error occurred. Please try again.';
    errorEl.style.display = 'block';
    
    // Insert before submit button or at end of form
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.parentNode.insertBefore(errorEl, submitButton);
    } else {
      form.appendChild(errorEl);
    }
    
    // Scroll to error
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Submit to Netlify Forms
   */
  async function submitToNetlify(form, data) {
    const formName = form.getAttribute('name') || form.id || 'quote-form';
    const formData = new FormData();
    
    // Netlify Forms expects form-name field
    formData.append('form-name', formName);
    
    // Append all form fields
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith('_')) { // Skip metadata
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, v));
        } else {
          formData.append(key, value);
        }
      }
    }
    
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[leads-submit] Netlify submission failed:', error);
      throw error;
    }
  }

  /**
   * Submit to webhook/API
   */
  async function submitToWebhook(form, data) {
    if (!CONFIG.submitEndpoint) {
      throw new Error('Webhook endpoint not configured');
    }
    
    try {
      const response = await fetch(CONFIG.submitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('[leads-submit] Webhook submission failed:', error);
      throw error;
    }
  }

  /**
   * Submit form using form action (native submission)
   */
  function submitNative(form) {
    // Let form submit naturally
    return new Promise((resolve) => {
      // If form has action, it will submit naturally
      // Otherwise, we'll handle it via other methods
      if (form.action && form.action !== '#' && form.action !== '') {
        form.submit();
        resolve({ success: true });
      } else {
        resolve({ success: false, error: 'No form action specified' });
      }
    });
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Validate form
    if (!validateForm(form)) {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const msg = 'Please fill in all required fields.';
      alert(msg);
      return;
    }
    
    // Get form data
    const data = getFormData(form);
    
    // Log data (for debugging)
    if (CONFIG.enableConsoleLog) {
      console.log('[leads-submit] Form data:', data);
    }
    
    // Set loading state
    setLoadingState(form, true);
    
    // Remove any existing error messages
    const existingError = form.querySelector('.submit-error');
    if (existingError) {
      existingError.remove();
    }
    
    try {
      let result;
      
      // Determine submission method
      if (CONFIG.enableNetlifyForms && form.hasAttribute('netlify')) {
        // Netlify Forms
        result = await submitToNetlify(form, data);
      } else if (CONFIG.enableWebhook && CONFIG.submitEndpoint) {
        // Webhook/API
        result = await submitToWebhook(form, data);
      } else if (form.action && form.action !== '#' && form.action !== '') {
        // Native form submission
        result = await submitNative(form);
      } else {
        // Fallback: log and redirect (for testing)
        if (CONFIG.enableConsoleLog) {
          console.log('[leads-submit] No submission method configured. Redirecting to success page.');
        }
        result = { success: true };
      }
      
      if (result.success) {
        // Success: redirect to thanks page
        window.location.href = CONFIG.successUrl;
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('[leads-submit] Submission error:', error);
      setLoadingState(form, false);
      showError(form, 'Failed to submit. Please try again or contact us via WhatsApp.');
    }
  }

  /**
   * Initialize form handlers
   */
  function init() {
    // Find all quote forms
    const forms = [
      document.getElementById('quoteForm'),
      document.getElementById('quoteFormModal'),
      document.getElementById('nativeQuoteForm')
    ].filter(Boolean);
    
    // Attach submit handlers
    forms.forEach(form => {
      // Remove existing handlers to avoid duplicates
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
      
      // Attach new handler
      newForm.addEventListener('submit', handleSubmit);
    });
    
    if (CONFIG.enableConsoleLog) {
      console.log('[leads-submit] Initialized for', forms.length, 'form(s)');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.leadsSubmit = {
    submit: handleSubmit,
    getFormData: getFormData,
    config: CONFIG
  };

})();

