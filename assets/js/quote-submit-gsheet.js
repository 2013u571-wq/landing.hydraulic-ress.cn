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
  
    function toFormBody(obj) {
      const p = new URLSearchParams();
      Object.keys(obj).forEach(k => {
        if (obj[k] !== undefined && obj[k] !== null) p.append(k, String(obj[k]));
      });
      return p.toString();
    }
  
    async function postLead(form) {
      const fd = new FormData(form);
      const data = {};
      for (const [k, v] of fd.entries()) data[k] = v;
  
      Object.assign(data, getMeta());

      // 彻底移除 headers，避免触发浏览器 CORS 预检
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
  
        // 关键修复 3：不再使用 await 等待 fetch 结果
        // 发出请求后直接跳转，确保用户不会看到报错弹窗
        postLead(form); 
        
        setTimeout(() => {
          window.location.href = SUCCESS_URL;
        }, 300); // 给浏览器留 300ms 发出请求包
      }, { passive: false });
    }
  
    function init() {
      const forms = [
        document.getElementById('quoteFormModal'),
        document.getElementById('nativeQuoteForm'),
        document.getElementById('quoteForm')
      ].filter(Boolean);
  
      forms.forEach(bind);
  
      console.log('[leads-submit] bound forms:', forms.map(f => f.id));
    }
  
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  
  })();
  