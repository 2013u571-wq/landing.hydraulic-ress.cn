/**
 * Quote Modal Handler - Reliable global functions for Cloudflare Pages
 * Provides window.openQuoteModal(product) and window.closeQuoteModal()
 */

(function() {
  'use strict';

  /**
   * Open quote modal with optional product preset
   * @param {string} product - Product name to preset (empty string for generic)
   */
  window.openQuoteModal = function(product) {
    const modalEl = document.getElementById('quoteModal');
    if (!modalEl) {
      console.warn('[quote-modal] Modal element #quoteModal not found');
      return;
    }

    // Set product value if provided
    if (product) {
      // Try #modalProductSelect first (Bootstrap modal)
      const productSelect = modalEl.querySelector('#modalProductSelect') || 
                           modalEl.querySelector('select[name="product"]');
      
      if (productSelect) {
        // Check if product exists in options
        const options = Array.from(productSelect.options);
        const matchingOption = options.find(opt => opt.value === product);
        
        if (matchingOption) {
          productSelect.value = product;
        } else {
          // If product not found, try to set "Other" or first option
          const otherOption = options.find(opt => opt.value === 'Other');
          if (otherOption) {
            productSelect.value = 'Other';
          } else if (options.length > 0) {
            productSelect.value = options[0].value;
          }
        }
      }
    }

    // Open modal using Bootstrap if available
    if (window.bootstrap && bootstrap.Modal) {
      try {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
        return;
      } catch (e) {
        console.warn('[quote-modal] Bootstrap modal failed, using fallback:', e);
      }
    }

    // Fallback: manual modal show
    modalEl.classList.add('show');
    modalEl.style.display = 'block';
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.style.paddingRight = '0px';
    
    // Add backdrop
    let backdrop = document.querySelector('.modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
    }
    
    // Lock body scroll
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';

    // ESC key handler (fallback mode only)
    function handleEsc(e) {
      if (e.key === 'Escape' && modalEl.classList.contains('show')) {
        window.closeQuoteModal();
      }
    }
    document.addEventListener('keydown', handleEsc);
    modalEl._escHandler = handleEsc;

    // Backdrop click handler (fallback mode only)
    function handleBackdropClick(e) {
      if (e.target === backdrop) {
        window.closeQuoteModal();
      }
    }
    backdrop.addEventListener('click', handleBackdropClick);
    backdrop._clickHandler = handleBackdropClick;
  };

  /**
   * Close quote modal
   */
  window.closeQuoteModal = function() {
    const modalEl = document.getElementById('quoteModal');
    if (!modalEl) return;

    // Close using Bootstrap if available
    if (window.bootstrap && bootstrap.Modal) {
      try {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
          return;
        }
      } catch (e) {
        console.warn('[quote-modal] Bootstrap modal hide failed, using fallback:', e);
      }
    }

    // Fallback: manual modal hide
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');

    // Remove backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      // Remove event listeners if they exist
      if (backdrop._clickHandler) {
        backdrop.removeEventListener('click', backdrop._clickHandler);
      }
      backdrop.remove();
    }

    // Remove ESC handler if exists
    if (modalEl._escHandler) {
      document.removeEventListener('keydown', modalEl._escHandler);
      delete modalEl._escHandler;
    }

    // Unlock body scroll
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };

  // Auto-close on backdrop click (for Bootstrap modals too)
  document.addEventListener('click', function(e) {
    const modalEl = document.getElementById('quoteModal');
    if (!modalEl || !modalEl.classList.contains('show')) return;

    // Check if clicked on backdrop
    if (e.target.classList.contains('modal-backdrop') || 
        (e.target === modalEl && e.target.classList.contains('modal'))) {
      window.closeQuoteModal();
    }
  });

  // Auto-close on ESC key (for Bootstrap modals too)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modalEl = document.getElementById('quoteModal');
      if (modalEl && modalEl.classList.contains('show')) {
        window.closeQuoteModal();
      }
    }
  });

})();

