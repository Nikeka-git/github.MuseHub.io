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

  function loadArtistsJSON(cb){
    if(window.MUSEHUB_DATA) return cb(window.MUSEHUB_DATA);
    function tryFetch(path){
      return fetch(path).then(r => {
        if(!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    tryFetch('assets/artists.json')
      .then(data => { window.MUSEHUB_DATA = data; cb(data); })
      .catch(err1 => {
        tryFetch('artists.json')
          .then(data => { window.MUSEHUB_DATA = data; cb(data); })
          .catch(err2 => { console.error('[MUSEHUB] Failed to load artists.json', err2); cb([]); });
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


  const btn = document.getElementById('theme-toggle-btn');
  if(btn){
    btn.textContent = stored === 'dark' ? '🌙' : '☀️';
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
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
  /* ---------- Top Music: dynamic populate + interaction ---------- */
function initTopMusic(){
  const container = document.getElementById('top-music-list');
  if(!container) return;

  // Источник данных: если есть window.MUSEHUB_DATA — попробуем создать треки из него,
  // иначе используем локальный fallback.
  let tracks = [];

  if(window.MUSEHUB_DATA && Array.isArray(window.MUSEHUB_DATA) && window.MUSEHUB_DATA.length){
    // постараемся взять первые треки из artists.json, иначе конвертируем артиста в трек
    window.MUSEHUB_DATA.slice(0, 12).forEach((a, idx) => {
      const tName = (a.tracks && a.tracks[0]) || (a.name ? (a.name + " — Best") : ("Track " + (idx+1)));
      tracks.push({
        id: (a.id || ('t-' + idx)),
        title: tName,
        artist: a.name || 'Unknown Artist',
        duration: a.duration || a.track_duration || '03:30',
        art: (a.image ? (a.image.startsWith('assets/') ? a.image : ('assets/images/' + a.image)) : 'assets/images/placeholder-track.jpg')
      });
    });
  }

  // fallback sample tracks (if none)
  if(tracks.length === 0){
    tracks = [
      { id:'t1', title:'Memories — Maroon 5', artist:'Maroon 5', duration:'04:20', art:'assets/images/memories.jpg' },
      { id:'t2', title:'Anti-Hero — Taylor Swift', artist:'Taylor Swift', duration:'03:54', art:'assets/images/anti-hero.jpg' },
      { id:'t3', title:'Blinding Lights', artist:'The Weeknd', duration:'03:20', art:'assets/images/blinding-lights.jpg' },
      { id:'t4', title:'Leave The Door Open', artist:'Bruno Mars', duration:'04:02', art:'assets/images/leave-door.jpg' },
      { id:'t5', title:'Bad Habits', artist:'Ed Sheeran', duration:'03:50', art:'assets/images/bad-habits.jpg' }
    ];
  }

  container.innerHTML = ''; // очистим

  // helper: render one row
  function makeRow(track){
    const row = document.createElement('div');
    row.className = 'track-row';
    row.setAttribute('data-track-id', track.id);

    // left side: thumbnail + title
    const left = document.createElement('div'); left.className = 'track-left';
    const img = document.createElement('img'); img.src = track.art || '';
    img.alt = track.title || 'track';
    img.loading = 'lazy';
    img.onerror = function(){ this.onerror = null; this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="%230b0b0b"/></svg>'; };

    const tt = document.createElement('div'); tt.className = 'track-title';
    const t = document.createElement('div'); t.className = 'title'; t.textContent = track.title;
    const m = document.createElement('div'); m.className = 'meta'; m.textContent = `${track.artist} • ${track.duration}`;

    tt.appendChild(t); tt.appendChild(m);
    left.appendChild(img); left.appendChild(tt);

    // controls
    const controls = document.createElement('div'); controls.className = 'track-controls';

    // play button
    const btnPlay = document.createElement('button');
    btnPlay.className = 'btn-play';
    btnPlay.setAttribute('aria-label', 'Play');
    btnPlay.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-play"></use></svg>`;

    // like button
    const btnLike = document.createElement('button');
    btnLike.className = 'btn-like';
    btnLike.setAttribute('aria-pressed', 'false');
    btnLike.setAttribute('aria-label', 'Like');
    btnLike.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-heart"></use></svg>`;

    controls.appendChild(btnPlay);
    controls.appendChild(btnLike);

    row.appendChild(left);
    row.appendChild(controls);

    // events
    btnPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      // set Now Playing (existing global helper if present)
      if(window.setNowPlaying) window.setNowPlaying(track.title);
      // mark active row
      document.querySelectorAll('.track-row').forEach(r=>r.classList.remove('active'));
      row.classList.add('active');

      // sync footer play icon to "pause"
      const footerUse = document.querySelector('#svg-play-state use');
      if(footerUse) footerUse.setAttribute('href', '#icon-pause');

      // toggle icon in this button to pause
      const useEl = btnPlay.querySelector('use');
      if(useEl) useEl.setAttribute('href', '#icon-pause');

      // optionally, if previously another row had play icon = pause, reset it
      document.querySelectorAll('.track-row .btn-play').forEach(b => {
        if(b !== btnPlay){
          const u = b.querySelector('use'); if(u) u.setAttribute('href', '#icon-play');
        }
      });
    });

    // clicking anywhere on row also plays
    row.addEventListener('click', ()=> btnPlay.click());

    // like toggle
    btnLike.addEventListener('click', (e) => {
      e.stopPropagation();
      const liked = btnLike.classList.toggle('liked');
      btnLike.setAttribute('aria-pressed', String(liked));
      // optionally persist to localStorage:
      // const likedSet = JSON.parse(localStorage.getItem('musehub_likes')||'{}'); likedSet[track.id]=liked; localStorage.setItem('musehub_likes', JSON.stringify(likedSet));
    });

    return row;
  }

  // render tracks
  tracks.forEach(t => container.appendChild(makeRow(t)));
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

  /* NEW: rightbar actions (Top Artist → artists search; Recently Played → now playing) */
  function initRightbarActions(){
    // Top Artist items: set search and navigate to artists page
    const topItems = document.querySelectorAll('.rightbar h5 + .list-group .list-group-item');
    topItems.forEach(el => {
      el.addEventListener('click', () => {
        const q = el.textContent.trim();
        try { localStorage.setItem('musehub_search_query', q); } catch(e){}
        window.location.href = 'artists.html';
      });
    });

    // Recently Played: set now playing text
    const recentHeader = Array.from(document.querySelectorAll('.rightbar h5')).find(h => /Recently Played/i.test(h.textContent));
    if(recentHeader){
      const list = recentHeader.nextElementSibling;
      if(list){
        Array.from(list.children).forEach(li => {
          li.addEventListener('click', () => {
            const t = li.textContent.trim();
            const el = document.getElementById('now-playing');
            if(el) el.textContent = 'Now Playing: ' + t;
            // optionally show a quick flash on player
            const player = document.querySelector('.player');
            if(player){ player.classList.add('pulse'); setTimeout(()=>player.classList.remove('pulse'), 600); }
          });
        });
      }
    }
  }

  // small visual pulse CSS injection if desired
  (function injectPulseStyles(){
    const s = document.createElement('style');
    s.textContent = `.player.pulse{ box-shadow: 0 12px 40px rgba(123,43,255,0.12); transform: translateY(-4px); transition: all .18s ease; }`;
    document.head.appendChild(s);
  })();

  // start
  loadArtistsJSON(()=> {
    initTheme();
    initTopMusic();
    initBackToTop();
    initGlobalSearchBridge();
    initScrollSpy();
    initAOS();
    initRightbarActions(); // <-- new
    window.musehubUtils = { refreshAOS: ()=> { if(window.AOS) window.AOS.refresh(); } };
  });

})();
