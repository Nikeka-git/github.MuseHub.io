/* js/artistDetail.js (обновлённый: иконки в modal) */
(function(){
  // ... (весь код ensureData / getIdFromUrl остаётся как в предыдущей версии)
  function getIdFromUrl(){
    const params = new URLSearchParams(location.search);
    return params.get('id');
  }

  function ensureData(cb){
    if(window.MUSEHUB_DATA) return cb(window.MUSEHUB_DATA);
    fetch('assets/artists.json').then(r=>r.json()).then(data => { window.MUSEHUB_DATA = data; cb(data); }).catch(()=> {
      fetch('artists.json').then(r=>r.json()).then(data => { window.MUSEHUB_DATA = data; cb(data); }).catch(()=> cb([]));
    });
  }

  function createModal(tracks, artistName){
    const old = document.getElementById('mh-track-modal');
    if(old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'mh-track-modal';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 99999;

    const box = document.createElement('div');
    box.style.width = 'min(900px, 95%)';
    box.style.maxHeight = '90vh';
    box.style.background = '#0f0f11';
    box.style.borderRadius = '12px';
    box.style.padding = '1rem';
    box.style.position = 'relative';
    box.style.overflow = 'hidden';

    const title = document.createElement('h4');
    title.textContent = `${artistName} — Tracks`;
    box.appendChild(title);

    const slider = document.createElement('div');
    slider.style.display = 'flex';
    slider.style.gap = '10px';
    slider.style.transition = 'transform .35s ease';
    slider.style.width = '100%';

    tracks.forEach((t, i) => {
      const s = document.createElement('div');
      s.style.minWidth = '100%';
      s.style.flex = '0 0 100%';
      s.style.boxSizing = 'border-box';
      s.style.padding = '8px';

      const h = document.createElement('h5'); h.textContent = t;
      const p = document.createElement('p'); p.textContent = `Track ${i+1} — ${t}`;
      const play = document.createElement('button');
      play.className = 'btn btn-primary';
      play.setAttribute('aria-label', 'Play this track');
      play.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-play"></use></svg> Play`;
      play.style.marginTop = '8px';
      play.addEventListener('click', ()=> {
        if(window.setNowPlaying) window.setNowPlaying(`${t} — ${artistName}`);
      });

      s.appendChild(h); s.appendChild(p); s.appendChild(play);
      slider.appendChild(s);
    });

    const container = document.createElement('div');
    container.style.overflow = 'hidden';
    container.appendChild(slider);
    box.appendChild(container);

    let index = 0;
    const prevBtn = document.createElement('button'); prevBtn.className = 'btn btn-outline-secondary btn-sm';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.style.marginRight = '0.5rem';
    prevBtn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-prev"></use></svg>`;
    prevBtn.addEventListener('click', () => {
      index = Math.max(0, index-1);
      slider.style.transform = `translateX(-${index*100}%)`;
    });

    const nextBtn = document.createElement('button'); nextBtn.className = 'btn btn-outline-secondary btn-sm';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-next"></use></svg>`;
    nextBtn.addEventListener('click', () => {
      index = Math.min(tracks.length-1, index+1);
      slider.style.transform = `translateX(-${index*100}%)`;
    });

    const ctrl = document.createElement('div');
    ctrl.style.position = 'absolute';
    ctrl.style.bottom = '12px';
    ctrl.style.left = '12px';
    ctrl.appendChild(prevBtn);
    ctrl.appendChild(nextBtn);
    box.appendChild(ctrl);

    overlay.addEventListener('click', (e)=>{
      if(e.target === overlay) overlay.remove();
    });

    const close = document.createElement('button');
    close.className = 'btn btn-light btn-sm';
    close.style.position='absolute';
    close.style.top='8px';
    close.style.right='8px';
    close.setAttribute('aria-label','Close');
    close.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-close"></use></svg>`;
    close.addEventListener('click', ()=> overlay.remove());
    box.appendChild(close);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function renderArtist(artist){
    if(!artist) {
      const titleEl = document.getElementById('artist-name');
      if(titleEl) titleEl.textContent = 'Artist not found';
      return;
    }
    const nameEl = document.getElementById('artist-name');
    if(nameEl) nameEl.textContent = artist.name;

    const img = document.getElementById('artist-photo');
    if(img) {
      img.src = `assets/images/${artist.image}`;
      img.alt = artist.name;
      img.loading = 'lazy';
    }

    const genreEl = document.getElementById('artist-genre');
    if(genreEl) genreEl.textContent = artist.genre || '';

    const countryEl = document.getElementById('artist-country');
    if(countryEl) countryEl.textContent = artist.country || '';

    const bioEl = document.getElementById('artist-bio');
    if(bioEl) bioEl.textContent = artist.bio || '';

    const ol = document.getElementById('artist-tracks');
    if(ol){
      ol.innerHTML = '';
      (artist.tracks || []).forEach(t => {
        const li = document.createElement('li');
        li.style.margin = '6px 0';
        const btn = document.createElement('button');
        btn.textContent = t;
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.style.margin = '6px 0';
        btn.addEventListener('click', ()=> { createModal(artist.tracks, artist.name); });
        li.appendChild(btn);
        ol.appendChild(li);
      });
    }

    const favBtn = document.getElementById('favorite-button');
    if(favBtn){
      let favs = [];
      try { favs = JSON.parse(localStorage.getItem('musehub_favs') || '[]'); } catch(e){ favs = []; }
      favBtn.textContent = favs.includes(artist.id) ? 'In favorites' : 'Add to favorites';
      favBtn.setAttribute('aria-pressed', favs.includes(artist.id) ? 'true' : 'false');
      favBtn.onclick = () => {
        let f = [];
        try { f = JSON.parse(localStorage.getItem('musehub_favs') || '[]'); } catch(e){ f = []; }
        if(f.includes(artist.id)){
          f = f.filter(x=>x!==artist.id);
          favBtn.textContent = 'Add to favorites';
          favBtn.setAttribute('aria-pressed', 'false');
        } else {
          f.push(artist.id);
          favBtn.textContent = 'In favorites';
          favBtn.setAttribute('aria-pressed', 'true');
        }
        try { localStorage.setItem('musehub_favs', JSON.stringify(f)); } catch(e){}
      };
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const id = getIdFromUrl();
    if(!id) return;
    ensureData((all) => {
      const artist = (all || []).find(a => a.id === id);
      if(!artist){
        const lower = (id || '').toLowerCase();
        const f = (all || []).find(a => (a.id || '').toLowerCase() === lower || (a.name || '').toLowerCase() === lower);
        if(f) return renderArtist(f);
      }
      renderArtist(artist);
    });
  });
})();
