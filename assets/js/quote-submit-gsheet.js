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

      // --- 关键改进：在发送前抓取访客 IP 和 国家 ---
      try {
        const ipRes = await fetch('https://ipapi.co/json/').catch(() => null);
        if (ipRes && ipRes.ok) {
          const ipData = await ipRes.json();
          data.ip = ipData.ip;              // 对应后端 data.ip
          data.country = ipData.country_name; // 对应后端 data.country
        }
      } catch (e) {
        console.warn('IP lookup failed, skipping...');
      }

      // 提交给 Google Apps Script
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
    }
  
    function bind(form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
  
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          alert('Please fill in required fields.');
          return;
        }
  
        setLoading(form, true);
  
        // 执行发送逻辑（现在包含等待 IP 抓取的过程）
        await postLead(form); 
        
        // 稍微延长跳转等待时间至 500ms，确保数据发出
        setTimeout(() => {
          window.location.href = SUCCESS_URL;
        }, 500); 
      }, { passive: false });
    }
  
    function init() {
      const forms = [
        document.getElementById('quoteFormModal'),
        document.getElementById('nativeQuoteForm'),
        document.getElementById('quoteForm')
      ].filter(Boolean);
  
      forms.forEach(bind);
      console.log('[leads-submit] IP-Enabled version bound.');
    }
  
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  
  })();