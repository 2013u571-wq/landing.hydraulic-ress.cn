(function () {
    'use strict';
  
    // 你的 Google 脚本地址
    const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyAAzsFLQMBDsXQwa-iya99hT6vcOA9KvPW6bx-7brIIovkYH4yl93bpT1l64GHHfVJvw/exec';
    const SUCCESS_URL = '/thanks/';
  
    function getMeta() {
      const url = new URL(location.href);
      return {
        page_url: location.href,
        referrer: document.referrer || '',
        utm_source: url.searchParams.get('utm_source') || '',
        utm_medium: url.searchParams.get('utm_medium') || '',
        utm_campaign: url.searchParams.get('utm_campaign') || '',
        gclid: url.searchParams.get('gclid') || '',
        user_agent: navigator.userAgent,
        timestamp: new Date().toLocaleString()
      };
    }
  
    async function postLead(form) {
      const fd = new FormData(form);
      const data = {};
      fd.forEach((value, key) => { data[key] = value; });
      
      // 合并元数据（如 UTM、Gclid 等）
      Object.assign(data, getMeta());

      // 提交给 Google Apps Script
      // 使用 no-cors 模式，并通过 text/plain 发送以确保最高兼容性
      return fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors', 
        cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
      });
    }
  
    function setLoading(form, on) {
      const btn = form.querySelector('button[type="submit"], [type="submit"]');
      if (!btn) return;
      btn.disabled = !!on;
      btn.style.opacity = on ? '0.7' : '';
      if (on) {
          btn.dataset.originalText = btn.innerText;
          btn.innerText = 'Sending...';
      } else {
          btn.innerText = btn.dataset.originalText || 'Send Inquiry Now';
      }
    }
  
    function bind(form) {
      // 1. 防重复绑定
      if (form.dataset.bound === 'true') return;
      form.dataset.bound = 'true';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 2. 提交锁：防止多次点击
        if (form.dataset.submitting === 'true') return;
        
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          return;
        }

        form.dataset.submitting = 'true';
        setLoading(form, true);

        try {
          // 3. 尝试发送，设置 10 秒超时保护
          // 注意：no-cors 模式下只要不抛出异常即视为成功发出
          await Promise.race([
            postLead(form),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);
          
          // 4. 跳转感谢页
          window.location.href = SUCCESS_URL;
        } catch (err) {
          // 5. 失败处理
          setLoading(form, false);
          form.dataset.submitting = 'false'; 
          alert('Network Error: We could not receive your message. Please contact us via WhatsApp: +8618962292350');
          console.error('Submission failed:', err);
        }
      }, { passive: false });
    }
  
    function init() {
      const forms = [
        document.getElementById('quoteFormModal'),
        document.getElementById('nativeQuoteForm'),
        document.getElementById('quoteForm')
      ].filter(Boolean);
  
      forms.forEach(bind);
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
  })();
