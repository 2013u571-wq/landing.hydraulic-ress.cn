(function () {
    'use strict';
  
    const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyAAzsFLQMBDsXQwa-iya99hT6vcOA9KvPW6bx-7brIIovkYH4yl93bpT1l64GHHfVJvw/exec';
    const SUCCESS_URL = '/thanks/';
  
    function $(sel, root=document){ return root.querySelector(sel); }
  
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
  
      Object.assign(data, getMeta());

      // --- 关键改进：抓取访客 IP 和 国家 (带超时保护) ---
      try {
        // 设置 2 秒超时，防止 IP 接口响应慢导致页面卡死
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const ipRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        
        if (ipRes && ipRes.ok) {
          const ipData = await ipRes.json();
          data.ip = ipData.ip;              
          data.country = ipData.country_name; 
        }
        clearTimeout(timeoutId);
      } catch (e) {
        console.warn('IP lookup skipped or timed out');
      }

      // 提交给 Google Apps Script
      // 使用 return 确保 fetch 动作被标记为 async 任务
      return fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
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
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
  
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          return;
        }
  
        setLoading(form, true);
  
        // 立即启动跳转（不等待请求完成），确保在中国境内即使请求被阻止也能跳转
        // 使用 Promise.race 确保在请求完成或超时后跳转
        const redirectPromise = new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 100); // 100ms 后立即跳转，不等待请求
        });
        
        const submitPromise = postLead(form).catch((err) => {
          console.warn('Submission error (non-blocking):', err);
          // 即使请求失败也继续，不阻止跳转
        });
        
        // 无论请求成功或失败，都立即跳转
        Promise.race([redirectPromise, submitPromise]).then(() => {
          window.location.href = SUCCESS_URL;
        }).catch(() => {
          // 即使出错也跳转
          window.location.href = SUCCESS_URL;
        }); 
      }, { passive: false });
    }
  
    function init() {
      const forms = [
        document.getElementById('quoteFormModal'),
        document.getElementById('nativeQuoteForm'),
        document.getElementById('quoteForm')
      ].filter(Boolean);
  
      forms.forEach(bind);
      console.log('[Lineng-Lead] System initialized with IP tracking.');
    }
  
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  
  })();