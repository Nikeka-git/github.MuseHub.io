// js/ui-fixes.js
document.addEventListener('DOMContentLoaded', () => {
  const topbar = document.querySelector('.topbar');
  if(!topbar) return;

  // If .topbar-left/.topbar-center/.topbar-right already exist, do nothing.
  if(!topbar.querySelector('.topbar-left') && !topbar.querySelector('.topbar-center') && !topbar.querySelector('.topbar-right')){
    // take existing children and distribute:
    const children = Array.from(topbar.children);
    // create wrappers
    const left = document.createElement('div'); left.className = 'topbar-left';
    const center = document.createElement('div'); center.className = 'topbar-center';
    const right = document.createElement('div'); right.className = 'topbar-right';

    // Heuristic distribution:
    // - if first child contains brand text, put into left
    // - search input (if found) goes center
    // - everything else goes right
    let placedSearch = false;
    children.forEach((ch, idx) => {
      // move nodes by content
      const hasSearch = ch.querySelector && ch.querySelector('input[type="search"], input#global-search, .search');
      const hasBrandText = ch.textContent && ch.textContent.trim().length && idx === 0;
      if(hasBrandText && !left.children.length){
        left.appendChild(ch);
      } else if(hasSearch && !placedSearch){
        center.appendChild(ch);
        placedSearch = true;
      } else {
        // by default append to right if we already placed search or if it's the last node
        right.appendChild(ch);
      }
    });

    // ensure there is at least something in center (if search not found)
    if(!center.children.length){
      // if left has more than one child, move second to center
      if(left.children.length > 1){
        center.appendChild(left.children[1]);
      } else if(right.children.length){
        center.appendChild(right.children[0]);
      }
    }

    // clear topbar and append wrappers
    topbar.innerHTML = '';
    topbar.appendChild(left);
    topbar.appendChild(center);
    topbar.appendChild(right);
  }

  // If theme button exists somewhere, move it into right area and style
  const themeBtn = document.getElementById('theme-toggle-btn');
  const rightArea = document.querySelector('.topbar-right');
  if(themeBtn){
    if(rightArea && themeBtn.parentElement !== rightArea){
      rightArea.appendChild(themeBtn);
    }
    // ensure visual style
    themeBtn.style.display = 'inline-flex';
    themeBtn.style.alignItems = 'center';
    themeBtn.style.justifyContent = 'center';
    themeBtn.style.zIndex = 80;
  }

  // Small reflow fix: ensure search has enough min-width
  const search = document.querySelector('.topbar .search input');
  if(search){
    search.style.minWidth = '180px';
    search.style.maxWidth = '720px';
  }

  // final micro-adjust after layout
  setTimeout(()=> {
    // if search visually overlaps theme button, nudge theme button right using margin
    const tbtn = document.getElementById('theme-toggle-btn');
    if(tbtn){
      const tbRect = tbtn.getBoundingClientRect();
      const sRect = search ? search.getBoundingClientRect() : null;
      if(sRect && tbRect.left < sRect.right + 8){
        tbtn.style.marginLeft = '12px';
      }
    }
  }, 80);
});
