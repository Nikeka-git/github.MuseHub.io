/* js/artistDetail.js — robust image handling + placeholders */
(function(){
  const PERSON_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'>
      <rect width='100%' height='100%' fill='%23e6e6e6'/>
      <g fill='%23999'>
        <circle cx='300' cy='200' r='110'/>
        <path d='M120 460c30-60 360-60 420 0v40H120z'/>
      </g>
    </svg>`
  );

  const NOTE_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'>
      <rect width='100%' height='100%' fill='%23efefef'/>
      <g fill='%239aa'>
        <path d='M420 120v220c0 44-36 80-80 80H220v40c0 11-9 20-20 20s-20-9-20-20V420c0-44 36-80 80-80h120V120h40z'/>
      </g>
    </svg>`
  );

  function getIdFromUrl(){
    const params = new URLSearchParams(location.search);
    return params.get('id');
  }

  function ensureData(cb){
    if(window.MUSEHUB_DATA) return cb(window.MUSEHUB_DATA);
    fetch('assets/artists.json').then(r=>r.json()).then(data => {
      window.MUSEHUB_DATA = data;
      cb(data);
    }).catch(()=> cb([]));
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
    box.style.background = '#fff';
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

      const h = document.createElement('h5'); h.textContent = t;
      const p = document.createElement('p'); p.textContent = `Track ${i+1} — ${t}`;
      const play = document.createElement('button'); play.textContent = 'Play (simulate)';
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
    const prevBtn = document.createElement('button'); prevBtn.textContent = '◀';
    const nextBtn = document.createElement('button'); nextBtn.textContent = '▶';
    prevBtn.style.marginRight = '0.5rem';
    prevBtn.addEventListener('click', () => {
      index = Math.max(0, index-1);
      slider.style.transform = `translateX(-${index*100}%)`;
    });
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
    close.textContent = '✖';
    close.style.position='absolute';
    close.style.top='8px';
    close.style.right='8px';
    close.addEventListener('click', ()=> overlay.remove());
    box.appendChild(close);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function renderArtist(artist){
    if(!artist) {
      const el = document.getElementById('artist-name');
      if(el) el.textContent = 'Artist not found';
      return;
    }

    document.getElementById('artist-name').textContent = artist.name;
    const img = document.getElementById('artist-photo');
    if(img){
      img.src = resolveImageSrc(artist.image, false);
      img.loading = 'lazy';
      img.onerror = function(){ img.onerror = null; img.src = PERSON_PLACEHOLDER; };
    }

    document.getElementById('artist-genre').textContent = artist.genre || '—';
    document.getElementById('artist-country').textContent = artist.country || '—';
    document.getElementById('artist-bio').textContent = artist.bio || '';

    const ol = document.getElementById('artist-tracks');
    ol.innerHTML = '';
    (artist.tracks || []).forEach(t => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = t;
      span.className = 'btn btn-outline-secondary btn-sm';
      span.style.margin = '6px 0';
      span.style.cursor = 'default';
      span.style.pointerEvents = 'none';
      li.appendChild(span);
      ol.appendChild(li);
    });


    const favBtn = document.getElementById('favorite-button');
    if(favBtn){
      const favs = JSON.parse(localStorage.getItem('musehub_favs') || '[]');
      favBtn.textContent = favs.includes(artist.id) ? 'In favorites' : 'Add to favorites';
      favBtn.onclick = () => {
        let f = JSON.parse(localStorage.getItem('musehub_favs') || '[]');
        if(f.includes(artist.id)){
          f = f.filter(x=>x!==artist.id);
          favBtn.textContent = 'Add to favorites';
        } else {
          f.push(artist.id);
          favBtn.textContent = 'In favorites';
        }
        localStorage.setItem('musehub_favs', JSON.stringify(f));
      };
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const id = getIdFromUrl();
    if(!id) return;
    ensureData((all) => {
      const artist = all.find(a => a.id === id);
      if(!artist) {
        const lower = id.toLowerCase();
        const f = all.find(a => a.id.toLowerCase() === lower || a.name.toLowerCase() === lower);
        if(f) return renderArtist(f);
      }
      renderArtist(artist);
    });
  });
})();
