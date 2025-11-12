/* js/artists.js — robust image src detection + fallback placeholders */
(function(){
  // inline SVG placeholders (data URI)
  const PERSON_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'>
      <rect width='100%' height='100%' fill='%23e6e6e6'/>
      <g fill='%23999'>
        <circle cx='300' cy='200' r='110'/>
        <path d='M120 460c30-60 360-60 420 0v40H120z'/>
      </g>
    </svg>`
  );

  function ensureData(cb){
    if(window.MUSEHUB_DATA) return cb(window.MUSEHUB_DATA);
    fetch('assets/artists.json').then(r => r.json()).then(data => {
      window.MUSEHUB_DATA = data;
      cb(data);
    }).catch(err => {
      console.error('artists.js: fetch failed', err);
      cb([]);
    });
  }

  function slugToHref(id){ return `artistDetail.html?id=${encodeURIComponent(id)}`; }

  function formatNumber(n){
    if(n === null || n === undefined) return '—';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function resolveImageSrc(imageVal) {
    if (!imageVal) return PERSON_PLACEHOLDER;

    const v = String(imageVal).trim();

    // Уже полный URL (http, data:, //)
    if (/^data:|^https?:|^\/\//i.test(v)) return v;

    // Уже локальный путь с assets/images — просто вернём как есть
    if (v.startsWith('assets/images/')) return v;

    // Просто имя файла (the-weeknd.jpg) → добавим префикс
    if (!v.includes('/')) return `assets/images/${v}`;

    // Относительный путь (images/..., ./images/...) → нормализуем
    if (v.startsWith('images/') || v.startsWith('./images/')) {
      return 'assets/' + v.replace(/^(\.\/)?images\//, 'images/');
    }

    // Всё остальное — fallback
    return PERSON_PLACEHOLDER;
  }

  function makeCardElement(artist){
    const li = document.createElement('li');
    li.className = 'col';

    const card = document.createElement('div');
    card.className = 'card h-100 artist-card';
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');

    // image
    const img = document.createElement('img');
    img.className = 'card-img-top';
    img.alt = artist.name || 'artist';

    const src = resolveImageSrc(artist.image);
    img.src = src;
    img.loading = 'lazy';

    img.onerror = function(){
      img.onerror = null;
      // fallback to PERSON placeholder
      img.src = PERSON_PLACEHOLDER;
    };

    // body
    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h5'); title.className='card-title'; title.textContent = artist.name;
    const p = document.createElement('p'); p.className='card-text'; p.textContent = `${artist.genre || '—'} • ${artist.country || '—'}`;

    const listeners = artist.monthly_listeners ?? artist.popularity ?? null;
    const meta = document.createElement('p');
    meta.className = 'small text-muted';
    meta.textContent = `Monthly listeners: ${listeners ? formatNumber(listeners) : '—'}`;

    body.appendChild(title); body.appendChild(p); body.appendChild(meta);

    card.appendChild(img); card.appendChild(body);
    li.appendChild(card);

    const go = () => { window.location.href = slugToHref(artist.id); };
    card.addEventListener('click', () => go());
    card.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });

    card.setAttribute('data-aos', 'fade-up');

    return li;
  }

  function fadeOutIn(container, renderFn){
    container.style.transition = 'opacity .18s';
    container.style.opacity = '0';
    setTimeout(() => {
      container.innerHTML = '';
      renderFn();
      container.style.opacity = '0';
      void container.offsetWidth;
      container.style.transition = 'opacity .25s';
      container.style.opacity = '1';
      if(window.musehubUtils) window.musehubUtils.refreshAOS();
    }, 180);
  }

  function render(container, data){
    const frag = document.createDocumentFragment();
    data.forEach(a => frag.appendChild(makeCardElement(a)));
    container.appendChild(frag);
  }

  function init(){
    const container = document.getElementById('artist-list');
    if(!container) return;
    ensureData((all) => {
      // populate genre select
      const genreSelect = document.getElementById('genre');
      if(genreSelect){
        const genres = Array.from(new Set(all.map(a => a.genre))).sort();
        genres.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; genreSelect.appendChild(o); });
      }
      // populate sort select with more options
      const sortSelect = document.getElementById('sort');
      if(sortSelect){
        if(!Array.from(sortSelect.options).some(o=>o.value==='monthly_listeners')){
          const opt = document.createElement('option'); opt.value='monthly_listeners'; opt.text='Sort by listeners'; sortSelect.appendChild(opt);
        }
        if(!Array.from(sortSelect.options).some(o=>o.value==='genre')){
          const opt = document.createElement('option'); opt.value='genre'; opt.text='Sort by genre'; sortSelect.appendChild(opt);
        }
      }

      let filtered = all.slice();

      const globalQ = localStorage.getItem('musehub_search_query');
      if(globalQ){
        const s = document.getElementById('search'); if(s) s.value = globalQ;
        localStorage.removeItem('musehub_search_query');
      }

      function applyFilters(){
        const q = (document.getElementById('search')?.value || '').toLowerCase().trim();
        const genre = document.getElementById('genre')?.value || '';
        const sort = document.getElementById('sort')?.value || 'name';

        filtered = all.filter(a => {
          const hay = (a.name + ' ' + (a.tracks||[]).join(' ') + ' ' + a.genre).toLowerCase();
          const matchesQ = !q || hay.includes(q);
          const matchesG = !genre || a.genre === genre;
          return matchesQ && matchesG;
        });

        if(sort === 'name') filtered.sort((x,y)=> x.name.localeCompare(y.name));
        else if(sort === 'monthly_listeners') filtered.sort((x,y)=> (y.monthly_listeners||y.popularity||0) - (x.monthly_listeners||x.popularity||0));
        else if(sort === 'genre') filtered.sort((x,y)=> x.genre.localeCompare(y.genre) || x.name.localeCompare(y.name));

        fadeOutIn(container, ()=> render(container, filtered));
      }

      ['search','genre','sort'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('input', debounce(applyFilters, 180));
        el.addEventListener('change', applyFilters);
      });

      render(container, filtered);
    });
  }

  function debounce(fn, ms){
    let t;
    return function(...a){
      clearTimeout(t);
      t = setTimeout(()=> fn.apply(this,a), ms);
    };
  }

  document.addEventListener('DOMContentLoaded', init);
})();
