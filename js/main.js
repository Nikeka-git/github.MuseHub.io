(function(){
  const JQUERY_CDN = 'https://code.jquery.com/jquery-3.7.1.min.js';
  const AOS_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css';
  const AOS_JS = 'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js';

  function loadCSS(href){
    if(!document.querySelector(`link[href="${href}"]`)){
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    }
  }
  function loadScript(src, cb){
    if(document.querySelector(`script[src="${src}"]`)){
      cb && cb();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => cb && cb();
    s.onerror = () => { console.warn('Failed to load script', src); cb && cb(); };
    document.body.appendChild(s);
  }

  // Try multiple locations for artists.json: 'assets/artists.json' then '/artists.json'
  function loadArtistsJSON(cb){
    if(window.MUSEHUB_DATA) return cb(window.MUSEHUB_DATA);

    function tryFetch(path){
      return fetch(path).then(r => {
        if(!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }

    tryFetch('assets/artists.json')
      .then(data => {
        console.log('[MUSEHUB] loaded artists.json from assets/, count=', (data && data.length) || 0);
        window.MUSEHUB_DATA = data;
        cb(data);
      })
      .catch(err1 => {
        console.warn('[MUSEHUB] assets/artists.json failed:', err1);
        // fallback to root
        tryFetch('artists.json')
          .then(data => {
            console.log('[MUSEHUB] loaded artists.json from root, count=', (data && data.length) || 0);
            window.MUSEHUB_DATA = data;
            cb(data);
          })
          .catch(err2 => {
            console.error('[MUSEHUB] Failed to load artists.json from both locations:', err2);
            cb([]);
          });
      });
  }

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('musehub_theme', theme); } catch(e){}
    const btn = document.getElementById('theme-toggle-btn');
    if(btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  function initTheme(){
    const stored = (localStorage.getItem('musehub_theme') || 'dark');
    applyTheme(stored);

    if(!document.getElementById('theme-toggle-btn')){
      const b = document.createElement('button');
      b.id = 'theme-toggle-btn';
      b.title = 'Toggle theme';
      b.style.padding = '.25rem .6rem';
      b.style.marginLeft = '.5rem';
      b.setAttribute('aria-label', 'Toggle theme');
      b.textContent = stored === 'dark' ? '🌙' : '☀️';
      b.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });

      const topbar = document.querySelector('.topbar');
      if(topbar){
        const right = topbar.querySelector('div:nth-child(2)') || topbar;
        right.appendChild(b);
      } else {
        document.body.insertBefore(b, document.body.firstChild);
      }
    }
  }

  function initBackToTop(){
    if(document.getElementById('back-to-top')) return;
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.textContent = '↑';
    btn.title = 'Back to top';
    btn.setAttribute('aria-label', 'Back to top');
    Object.assign(btn.style, {position:'fixed', right:'18px', bottom:'18px', zIndex:9999, display:'none', padding:'8px 10px', borderRadius:'8px'});
    document.body.appendChild(btn);
    btn.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));
    window.addEventListener('scroll', ()=> { btn.style.display = (window.scrollY>300)?'block':'none'; });
  }

  function initScrollSpy(){
    const sidebar = document.querySelector('.sidebar');
    if(!sidebar) return;
    const sections = Array.from(document.querySelectorAll('section[id], main > section[id]'));
    if(sections.length === 0) return;
    function highlight(){
      const pos = window.scrollY + 120;
      let current = null;
      sections.forEach(s => { const top = s.getBoundingClientRect().top + window.scrollY; if(pos>=top) current = s; });
      sidebar.querySelectorAll('a').forEach(a => a.classList.remove('active'));
      if(current){
        const id = current.id;
        const link = sidebar.querySelector(`a[href="#${id}"]`);
        if(link) link.classList.add('active');
      }
    }
    window.addEventListener('scroll', highlight);
    highlight();
  }

  function initGlobalSearchBridge(){
    const el = document.getElementById('global-search');
    if(!el) return;
    el.setAttribute('aria-label', 'Global search');
    el.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){
        const q = el.value.trim();
        try { localStorage.setItem('musehub_search_query', q); } catch(e){}
        window.location.href = 'artists.html';
      }
    });
  }

  function initAOS(){
    loadCSS(AOS_CSS);
    loadScript(AOS_JS, ()=> { if(window.AOS) window.AOS.init({duration:600, once:true}); });
  }

  // start
  loadArtistsJSON(()=> {
    initTheme();
    initBackToTop();
    initGlobalSearchBridge();
    initScrollSpy();
    initAOS();
    // expose helper
    window.musehubUtils = { refreshAOS: ()=> { if(window.AOS) window.AOS.refresh(); } };
  });

})();
