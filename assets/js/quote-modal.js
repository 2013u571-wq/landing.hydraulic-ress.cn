/**
 * Quote Modal Handler - Reliable global functions for Cloudflare Pages
 * Provides window.openQuoteModal(product) and window.closeQuoteModal()
 */

(function() {
  'use strict';

  /**
   * Initialize intl-tel-input for WhatsApp field
   */
  function initIntlTelInput() {
    const input = document.getElementById('waInputModal');
    const form = document.getElementById('quoteFormModal');
    if (!input || !form) return;

    // Check if already initialized
    if (input._iti) return;

    // Wait for intl-tel-input library to load
    if (!window.intlTelInput) {
      // Retry after a short delay
      setTimeout(initIntlTelInput, 100);
      return;
    }

    try {
      // 检测是否为移动端
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      
      const iti = window.intlTelInput(input, {
        initialCountry: "auto",
        // 移动端：使用 nationalMode: true 避免在输入框中显示国家代码
        // PC端：使用 separateDialCode: true 在输入框外显示国家代码
        nationalMode: isMobile ? true : false,
        separateDialCode: isMobile ? false : true,
        autoPlaceholder: "polite",
        formatOnDisplay: true,
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
        geoIpLookup: function(callback) {
          fetch("https://ipapi.co/json/")
            .then(r => r.json())
            .then(d => callback((d && d.country_code) ? d.country_code : "US"))
            .catch(() => callback("US"));
        }
      });
      
      // 阻止国家选择下拉框的点击事件冒泡，避免触发产品下拉框
      // 使用事件委托在文档级别处理，确保下拉框打开时阻止冒泡
      const handleCountryListClick = function(e) {
        if (e.target.closest('.iti__country-list') || e.target.closest('.iti__dropdown')) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      };
      // 使用捕获阶段确保优先处理
      document.addEventListener('click', handleCountryListClick, true);
      
      // 监听下拉框打开/关闭事件，调整产品选择框的z-index
      setTimeout(function() {
        const countryList = document.querySelector('.iti__country-list');
        if (countryList) {
          // 使用MutationObserver监听下拉框的显示/隐藏
          const observer = new MutationObserver(function(mutations) {
            const productSelect = form.querySelector('select[name="product"]');
            if (productSelect) {
              const isVisible = countryList.style.display !== 'none' && countryList.offsetParent !== null;
              productSelect.style.zIndex = isVisible ? '1' : '';
            }
          });
          observer.observe(countryList, { attributes: true, attributeFilter: ['style', 'class'] });
        }
      }, 500);

      // Store reference for later use
      input._iti = iti;

      // Update value on form submit
      form.addEventListener('submit', function() {
        try {
          const e164 = iti.getNumber();
          if (e164) input.value = e164;
        } catch (e) {
          console.warn('[quote-modal] Failed to get E.164 number:', e);
        }
      });
    } catch (e) {
      console.warn('[quote-modal] Failed to initialize intl-tel-input:', e);
    }
  }

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

    // Initialize intl-tel-input when modal opens
    setTimeout(initIntlTelInput, 100);

    // Open modal using Bootstrap if available
    if (window.bootstrap && bootstrap.Modal) {
      try {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
        // Initialize intl-tel-input after modal is shown
        modalEl.addEventListener('shown.bs.modal', function initOnShow() {
          initIntlTelInput();
          modalEl.removeEventListener('shown.bs.modal', initOnShow);
        }, { once: true });
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

    // Initialize intl-tel-input after modal is shown (fallback mode)
    setTimeout(initIntlTelInput, 200);

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

