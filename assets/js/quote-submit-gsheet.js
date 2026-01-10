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
  
        try {
          // 使用 await 强制等待数据发送动作完成
          await postLead(form);
          console.log('Submission sent to background.');
        } catch (err) {
          console.error('Submission error:', err);
        }
        
        // 留出 300ms 缓冲区确保浏览器网络包已发出
        setTimeout(() => {
          window.location.href = SUCCESS_URL;
        }, 300); 
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