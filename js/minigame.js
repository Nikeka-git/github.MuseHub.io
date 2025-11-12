/* js/minigame.js
 - Simple quiz: показываем название трека, варианты — 4 артиста (1 правильный)
 - uses window.MUSEHUB_DATA or fetch
 - updates #question, #answers, #score, #next-btn
*/

(function(){
  function ensureData(cb){
    if(window.MUSEHUB_DATA) return cb(window.MUSEHUB_DATA);
    fetch('assets/artists.json').then(r=>r.json()).then(data=> {
      window.MUSEHUB_DATA = data;
      cb(data);
    }).catch(()=> cb([]));
  }

  function pickQuestion(data){
    // pick random artist with at least one track
    const pool = data.filter(a => Array.isArray(a.tracks) && a.tracks.length > 0);
    if(pool.length === 0) return null;
    const correct = pool[Math.floor(Math.random()*pool.length)];
    const track = correct.tracks[Math.floor(Math.random()*correct.tracks.length)];
    // pick 3 other random artist names
    const others = pool.filter(a => a.id !== correct.id);
    shuffle(others);
    const choices = [correct.name, ...others.slice(0,3).map(a=>a.name)];
    shuffle(choices);
    return {track, correctName: correct.name, choices};
  }

  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }

  document.addEventListener('DOMContentLoaded', ()=>{
    const qEl = document.getElementById('question');
    const answersEl = document.getElementById('answers');
    const scoreEl = document.getElementById('score');
    const nextBtn = document.getElementById('next-btn');

    if(!qEl || !answersEl || !scoreEl || !nextBtn) return;

    let state = {score:0, current:null};

    ensureData((data)=>{
      function newRound(){
        const q = pickQuestion(data);
        if(!q) {
          qEl.textContent = 'Нет вопросов: artists.json пуст.';
          return;
        }
        state.current = q;
        qEl.textContent = `Which artist performs the track: "${q.track}" ?`;
        answersEl.innerHTML = '';
        q.choices.forEach(choice => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.className = 'btn btn-outline-primary';
          btn.style.margin = '6px';
          btn.textContent = choice;
          btn.addEventListener('click', () => {
            // disable all buttons
            answersEl.querySelectorAll('button').forEach(b => b.disabled = true);
            if(choice === q.correctName){
              state.score++;
              scoreEl.textContent = state.score;
              btn.classList.remove('btn-outline-primary');
              btn.classList.add('btn-success');
            } else {
              btn.classList.remove('btn-outline-primary');
              btn.classList.add('btn-danger');
              // highlight correct
              const correctBtn = Array.from(answersEl.querySelectorAll('button')).find(b => b.textContent === q.correctName);
              if(correctBtn){
                correctBtn.classList.remove('btn-outline-primary'); correctBtn.classList.add('btn-success');
              }
            }
          });
          li.appendChild(btn);
          answersEl.appendChild(li);
        });
      }

      nextBtn.addEventListener('click', newRound);

      // start first
      newRound();
    });
  });
})();
