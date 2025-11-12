/* js/minigame.js
   MuseHub Music Quiz — smooth & modern
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
    const pool = data.filter(a => Array.isArray(a.tracks) && a.tracks.length);
    if(!pool.length) return null;
    const correct = pool[Math.floor(Math.random()*pool.length)];
    const track = correct.tracks[Math.floor(Math.random()*correct.tracks.length)];
    const others = pool.filter(a => a.id !== correct.id);
    shuffle(others);
    const choices = [correct.name, ...others.slice(0,3).map(a=>a.name)];
    shuffle(choices);
    return {track, correctName: correct.name, choices};
  }

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const qEl = document.getElementById('question');
    const answersEl = document.getElementById('answers');
    const scoreEl = document.getElementById('score');
    const nextBtn = document.getElementById('next-btn');

    if(!qEl || !answersEl || !scoreEl || !nextBtn) return;

    let state = {score:0, current:null};

    ensureData((data)=>{
      function showQuestion(q){
        qEl.style.opacity = 0;
        setTimeout(()=>{
          qEl.textContent = `Which artist performs the track: "${q.track}"?`;
          qEl.style.opacity = 1;
        }, 150);

        answersEl.innerHTML = '';
        q.choices.forEach(choice => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.textContent = choice;
          li.appendChild(btn);
          answersEl.appendChild(li);

          btn.addEventListener('click', ()=>{
            answersEl.querySelectorAll('button').forEach(b => b.disabled = true);
            if(choice === q.correctName){
              state.score++;
              scoreEl.textContent = state.score;
              btn.classList.add('btn-success');
            } else {
              btn.classList.add('btn-danger');
              const correctBtn = Array.from(answersEl.querySelectorAll('button'))
                .find(b => b.textContent === q.correctName);
              if(correctBtn) correctBtn.classList.add('btn-success');
            }
          });
        });
      }

      function newRound(){
        const q = pickQuestion(data);
        if(!q){
          qEl.textContent = 'No questions: artists.json is empty.';
          answersEl.innerHTML = '';
          return;
        }
        state.current = q;
        showQuestion(q);
      }

      nextBtn.addEventListener('click', newRound);
      newRound();
    });
  });
})();
