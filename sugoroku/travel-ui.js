(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {const n=document.createElement(tag); n.className=cls; if(text)n.textContent=text; return n;};
  const positions = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  function direction(x,y) {return Math.abs(x)>Math.abs(y) ? (x>0?'right':'left') : (y>0?'down':'up');}
  function clearPad() {const box=$('dirs'); box.replaceChildren(); box.style.display='none';}
  function pad(choices,remaining,pick,disabled=false) {
    clearPad(); if(!choices.length)return;
    const box=$('dirs'); box.style.display='flex';
    const grid=el('div','travel-pad'); const detail=el('div','travel-paths');
    const count=el('strong','travel-remaining',`あと${remaining ?? '-'}歩`); detail.appendChild(count);
    const list=el('div','travel-options'); detail.appendChild(list);
    const groups={up:[],left:[],right:[],down:[]};
    choices.forEach(c=>groups[direction(c.x,c.y)].push(c));
    let chosen=false;
    const select=c=>{if(chosen||disabled)return;chosen=true;clearPad();pick(c.id);};
    const symbols={up:'↑',left:'←',right:'→',down:'↓'};
    const names={up:'上',left:'左',right:'右',down:'下'};
    for(const key of ['up','left','right','down']) {
      const b=el('button',`travel-key travel-${key}`,symbols[key]); b.type='button';
      b.disabled=disabled||!groups[key].length; b.title=`${names[key]}の道`;
      b.setAttribute('aria-label',b.title); b.setAttribute('aria-expanded','false');
      b.onclick=()=>{
        if(groups[key].length===1)return select(groups[key][0]);
        list.replaceChildren(); b.setAttribute('aria-expanded','true');
        groups[key].forEach((c,i)=>{const option=el('button','ghost',`${names[key]}の道${i+1}・目的地まで${c.distance}マス`); option.title=c.label; option.onclick=()=>select(c); list.appendChild(option);});
      };
      grid.appendChild(b);
    }
    box.appendChild(grid); box.appendChild(detail);
  }
  async function dice(faces) {
    if(!Array.isArray(faces)||!faces.length||faces.length>3||faces.some(n=>!Number.isInteger(n)||n<1||n>6))return;
    const old=$('diceVid'); if(old){old.pause();old.style.display='none';}
    const box=el('div','travel-dice'); box.setAttribute('role','status');
    const row=el('div','travel-dice-row');
    faces.forEach(n=>{const face=el('div','travel-die'); face.setAttribute('aria-label',`${n}`);
      for(let i=1;i<=9;i++){const pip=el('i',positions[n].includes(i)?'pip on':'pip');face.appendChild(pip);} row.appendChild(face);});
    box.appendChild(row);
    box.appendChild(el('strong','travel-dice-result',`${faces.join(' + ')}が出ました。${faces.reduce((a,b)=>a+b,0)}歩進めます`));
    $('wrap').appendChild(box);
    try {await new Promise(resolve=>setTimeout(resolve,1100));} finally {box.remove();}
  }
  globalThis.TRAVEL_UI={direction,pad,clearPad,dice};
})();
