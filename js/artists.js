(function(){
  function ensureData(cb){
    if(window.MUSEHUB_DATA) return cb(window.MUSEHUB_DATA);

    // Try assets first, then root
    function tryFetch(path){
      return fetch(path).then(r => {
        if(!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }

    tryFetch('assets/artists.json')
      .then(data => { window.MUSEHUB_DATA = data; cb(data); })
      .catch(() => {
        tryFetch('artists.json')
          .then(data => { window.MUSEHUB_DATA = data; cb(data); })
          .catch(err => { console.error('artists.js: fetch failed', err); cb([]); });
      });
  }

  function slugToHref(id){ return `artistDetail.html?id=${encodeURIComponent(id)}`; }

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
    img.loading = 'lazy';
    img.src = `assets/images/${artist.image}`;

    // body
    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h5'); title.className='card-title'; title.textContent = artist.name;
    const p = document.createElement('p'); p.className='card-text'; p.textContent = `${artist.genre} • ${artist.country}`;
    const meta = document.createElement('p'); meta.className='small text-muted'; meta.textContent = `Popularity: ${artist.popularity}`;

    body.appendChild(title); body.appendChild(p); body.appendChild(meta);

    card.appendChild(img); card.appendChild(body);
    li.appendChild(card);

    // click / keyboard navigation
    const go = () => { window.location.href = slugToHref(artist.id); };
    card.addEventListener('click', (e) => { go(); });
    card.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });

    // add AOS attribute if available
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
      // force reflow
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
        if(!Array.from(sortSelect.options).some(o=>o.value==='popularity')){
          const opt = document.createElement('option'); opt.value='popularity'; opt.text='Sort by popularity'; sortSelect.appendChild(opt);
        }
        if(!Array.from(sortSelect.options).some(o=>o.value==='genre')){
          const opt = document.createElement('option'); opt.value='genre'; opt.text='Sort by genre'; sortSelect.appendChild(opt);
        }
      }

      let filtered = all.slice();

      // global search from index
      const globalQ = (() => { try { return localStorage.getItem('musehub_search_query'); } catch(e){ return null; } })();
      if(globalQ){
        const s = document.getElementById('search'); if(s) s.value = globalQ;
        try { localStorage.removeItem('musehub_search_query'); } catch(e){}
      }

      function applyFilters(){
        const q = (document.getElementById('search')?.value || '').toLowerCase().trim();
        const genre = document.getElementById('genre')?.value || '';
        const sort = document.getElementById('sort')?.value || 'name';

        filtered = all.filter(a => {
          const hay = ((a.name || '') + ' ' + ((a.tracks||[]).join(' ')) + ' ' + (a.genre||'')).toLowerCase();
          const matchesQ = !q || hay.includes(q);
          const matchesG = !genre || a.genre === genre;
          return matchesQ && matchesG;
        });

        if(sort === 'name') filtered.sort((x,y)=> (x.name||'').localeCompare(y.name||''));
        else if(sort === 'popularity') filtered.sort((x,y)=> (y.popularity||0) - (x.popularity||0));
        else if(sort === 'genre') filtered.sort((x,y)=> (x.genre||'').localeCompare(y.genre||'') || (x.name||'').localeCompare(y.name||''));

        fadeOutIn(container, ()=> render(container, filtered));
      }

      ['search','genre','sort'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('input', debounce(applyFilters, 180));
        el.addEventListener('change', applyFilters);
      });

      // initial render
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
