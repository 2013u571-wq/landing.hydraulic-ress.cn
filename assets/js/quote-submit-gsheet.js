(function () {
    'use strict';
  
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
        utm_content: url.searchParams.get('utm_content') || '',
        utm_term: url.searchParams.get('utm_term') || '',
        gclid: url.searchParams.get('gclid') || '',
        fbclid: url.searchParams.get('fbclid') || '',
        user_agent: navigator.userAgent,
        lang: navigator.language || ''
      };
    }
  
    async function postLead(form) {
      const fd = new FormData(form);
      const data = {};
      for (const [k, v] of fd.entries()) data[k] = v;
  
      // 注入基础 Meta 信息
      Object.assign(data, getMeta());

      // --- 关键改进：非阻塞 IP 抓取 ---
      try {
        const ipInfo = await Promise.race([
          fetch('https://ipapi.co/json/').then(res => res.json()),
          new Promise(resolve => setTimeout(() => resolve({ ip: 'timeout', country: 'timeout' }), 1800))
        ]).catch(() => ({ ip: 'failed', country: 'failed' }));
        
        data.ip = ipInfo.ip || 'unknown';
        data.country = ipInfo.country_name || ipInfo.country || 'unknown';
      } catch (e) {
        console.warn('IP tracking failed, continuing submission...');
      }

      // 提交给 Google Apps Script
      return fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors', // 必须使用 no-cors
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
          btn.innerText = btn.dataset.originalText || 'Submit';
      }
    }
  
    function bind(form) {
      if (form.dataset.bound === 'true') return;
      form.dataset.bound = 'true';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 互斥锁：防止多次重复点击
        if (form.dataset.submitting === 'true') return;
        
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          return;
        }

        form.dataset.submitting = 'true';
        setLoading(form, true);

        try {
          // 整体提交超时保护（5秒）
          await Promise.race([
            postLead(form),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Global Timeout')), 5000))
          ]);
          
          // 请求发出成功后跳转
          window.location.href = SUCCESS_URL;
        } catch (err) {
          // 提交失败（如国内被墙或接口超时）
          setLoading(form, false);
          form.dataset.submitting = 'false'; // 解锁允许重试
          alert('Network Error: Your submission could not reach our server. Please contact us via WhatsApp (+8618962292350) or try again with a stable connection.');
          console.error('Final Error Info:', err);
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
      console.log('[Lineng-Lead] Form System Standardized.');
    }
  
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  
  })();
