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
        // 移动端：使用 nationalMode: true 确保输入框内不显示国家代码
        // PC端：使用 separateDialCode: true 在输入框外显示国家代码
        nationalMode: isMobile ? true : false,
        separateDialCode: true, // PC和移动端都使用，确保自动填充可以正确解析
        autoPlaceholder: "polite",
        // 移动端禁用 formatOnDisplay，避免自动填充时号码被格式化导致显示不全
        formatOnDisplay: isMobile ? false : true,
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
        geoIpLookup: function(callback) {
          fetch("https://ipapi.co/json/")
            .then(r => r.json())
            .then(d => callback((d && d.country_code) ? d.country_code : "US"))
            .catch(() => callback("US"));
        }
      });
      
      // 修复移动端自动填充：当检测到自动填充的完整号码时，正确解析并分离国家代码
      if (isMobile) {
        let autofillHandled = false;
        let inputTimeout = null;
        
        // 监听 input 事件，检测自动填充
        input.addEventListener('input', function(e) {
          const currentValue = e.target.value;
          
          // 清除之前的定时器
          if (inputTimeout) {
            clearTimeout(inputTimeout);
          }
          
          // 延迟处理，确保浏览器完成自动填充
          inputTimeout = setTimeout(function() {
            const fullValue = input.value.trim();
            const digitsOnly = fullValue.replace(/\D/g, '');
            
            // 检测是否是自动填充的完整号码（包含+号或长度超过10位）
            if (fullValue && !autofillHandled && digitsOnly.length > 10) {
              
              try {
                // 如果包含+号，直接使用 setNumber 解析
                if (fullValue.includes('+')) {
                  // 强制解析并分离国家代码
                  iti.setNumber(fullValue);
                  // 验证是否成功分离（在 nationalMode: true 下，输入框应该只包含号码部分）
                  setTimeout(function() {
                    const currentValue = input.value;
                    // 如果输入框仍然包含+号或国家代码，说明分离失败，手动处理
                    if (currentValue && (currentValue.includes('+') || currentValue.startsWith('86'))) {
                      const digits = currentValue.replace(/\D/g, '');
                      // 尝试匹配中国号码（86开头）
                      if (digits.startsWith('86') && digits.length > 2) {
                        const number = digits.substring(2);
                        iti.setCountry('cn');
                        input.value = number;
                      } else {
                        // 尝试其他常见国家代码
                        const commonCodes = [
                          { code: '86', iso2: 'cn' },
                          { code: '1', iso2: 'us' },
                          { code: '44', iso2: 'gb' },
                          { code: '33', iso2: 'fr' },
                          { code: '49', iso2: 'de' },
                        ];
                        for (let i = 0; i < commonCodes.length; i++) {
                          const { code, iso2 } = commonCodes[i];
                          if (digits.startsWith(code) && digits.length > code.length) {
                            const number = digits.substring(code.length);
                            iti.setCountry(iso2);
                            input.value = number;
                            break;
                          }
                        }
                      }
                    }
                  }, 100);
                  autofillHandled = true;
                } else {
                  // 如果不包含+号，可能是自动填充的国内号码格式
                  // 先尝试用当前国家代码解析
                  const currentCountry = iti.getSelectedCountryData();
                  if (currentCountry && currentCountry.dialCode) {
                    const testNumber = '+' + currentCountry.dialCode + digitsOnly;
                    try {
                      iti.setNumber(testNumber);
                      // 验证号码是否有效（通过检查分离后的号码长度）
                      const separatedNumber = input.value;
                      if (separatedNumber && separatedNumber.length > 0) {
                        autofillHandled = true;
                      }
                    } catch (e) {
                      // 如果当前国家代码不匹配，继续尝试其他方法
                    }
                  }
                  
                  // 如果当前国家代码不匹配，尝试匹配常见国家代码
                  if (!autofillHandled) {
                    // 优先匹配中国的11位手机号（以1开头，11位数字）
                    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
                      iti.setCountry('cn');
                      input.value = digitsOnly;
                      autofillHandled = true;
                    } else {
                      // 尝试匹配包含国家代码的完整号码
                      const commonCodes = [
                        { code: '86', iso2: 'cn', priority: 10 },   // 中国（优先）
                        { code: '1', iso2: 'us', priority: 9 },     // 美国/加拿大
                        { code: '44', iso2: 'gb', priority: 8 },    // 英国
                        { code: '33', iso2: 'fr', priority: 7 },    // 法国
                        { code: '49', iso2: 'de', priority: 7 },    // 德国
                        { code: '81', iso2: 'jp', priority: 7 },    // 日本
                        { code: '82', iso2: 'kr', priority: 7 },    // 韩国
                        { code: '91', iso2: 'in', priority: 7 },    // 印度
                      ];
                      
                      // 按优先级和长度排序
                      commonCodes.sort((a, b) => {
                        if (b.priority !== a.priority) return b.priority - a.priority;
                        return (b.code.length - a.code.length);
                      });
                      
                      let matched = false;
                      for (let i = 0; i < commonCodes.length; i++) {
                        const { code, iso2 } = commonCodes[i];
                        if (digitsOnly.startsWith(code) && digitsOnly.length > code.length) {
                          const number = digitsOnly.substring(code.length);
                          iti.setCountry(iso2);
                          input.value = number;
                          autofillHandled = true;
                          matched = true;
                          break;
                        }
                      }
                      
                      // 如果常见代码都不匹配，尝试所有国家代码（按长度降序）
                      if (!matched) {
                        const countries = iti.getCountryData();
                        countries.sort((a, b) => (b.dialCode || '').length - (a.dialCode || '').length);
                        
                        for (let i = 0; i < countries.length; i++) {
                          const code = countries[i].dialCode;
                          if (code && digitsOnly.startsWith(code) && digitsOnly.length > code.length) {
                            const number = digitsOnly.substring(code.length);
                            iti.setCountry(countries[i].iso2);
                            input.value = number;
                            autofillHandled = true;
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              } catch (err) {
                console.warn('[quote-modal] Failed to parse autofilled number:', err);
              }
            }
          }, 300); // 300ms 延迟，确保自动填充完成
        }, { passive: true });
        
        // 监听 change 事件（当用户点击自动填充建议时触发）
        input.addEventListener('change', function() {
          if (!autofillHandled) {
            const fullValue = input.value.trim();
            const digitsOnly = fullValue.replace(/\D/g, '');
            
            if (fullValue && digitsOnly.length > 10) {
              try {
                if (fullValue.includes('+')) {
                  iti.setNumber(fullValue);
                  // 验证分离是否成功
                  setTimeout(function() {
                    const currentValue = input.value;
                    if (currentValue && (currentValue.includes('+') || currentValue.startsWith('86'))) {
                      const digits = currentValue.replace(/\D/g, '');
                      if (digits.startsWith('86') && digits.length > 2) {
                        const number = digits.substring(2);
                        iti.setCountry('cn');
                        input.value = number;
                      }
                    }
                  }, 100);
                } else if (digitsOnly.startsWith('86') && digitsOnly.length > 2) {
                  // 直接处理以86开头的数字（中国号码）
                  const number = digitsOnly.substring(2);
                  iti.setCountry('cn');
                  input.value = number;
                } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
                  // 中国11位手机号
                  iti.setCountry('cn');
                  input.value = digitsOnly;
                }
                autofillHandled = true;
              } catch (err) {
                console.warn('[quote-modal] Failed to parse number on change:', err);
              }
            }
          }
        });
        
        // 额外监听 focus 事件，处理自动填充（某些浏览器在focus时填充）
        input.addEventListener('focus', function() {
          setTimeout(function() {
            const fullValue = input.value.trim();
            const digitsOnly = fullValue.replace(/\D/g, '');
            
            if (fullValue && !autofillHandled && digitsOnly.length > 10) {
              if (fullValue.includes('+')) {
                try {
                  iti.setNumber(fullValue);
                  setTimeout(function() {
                    const currentValue = input.value;
                    if (currentValue && (currentValue.includes('+') || currentValue.startsWith('86'))) {
                      const digits = currentValue.replace(/\D/g, '');
                      if (digits.startsWith('86') && digits.length > 2) {
                        const number = digits.substring(2);
                        iti.setCountry('cn');
                        input.value = number;
                      }
                    }
                  }, 100);
                  autofillHandled = true;
                } catch (err) {
                  console.warn('[quote-modal] Failed to parse on focus:', err);
                }
              } else if (digitsOnly.startsWith('86') && digitsOnly.length > 2) {
                const number = digitsOnly.substring(2);
                iti.setCountry('cn');
                input.value = number;
                autofillHandled = true;
              }
            }
          }, 200);
        });
        
        // 当输入框失去焦点时，重置 autofillHandled 标志，以便下次自动填充
        input.addEventListener('blur', function() {
          setTimeout(function() {
            autofillHandled = false;
          }, 300);
        });
      }
      
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

