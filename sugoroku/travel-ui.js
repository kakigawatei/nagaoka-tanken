(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {const n=document.createElement(tag); n.className=cls; if(text)n.textContent=text; return n;};
  const positions = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  let spinning = null, sprite = null;
  function spin() {
    if(spinning)return spinning;
    const box=el('div','travel-dice travel-spinning'); box.setAttribute('role','dialog'); box.setAttribute('aria-label','サイコロ');
    const face=el('div','travel-die travel-spin-face'); face.setAttribute('aria-hidden','true');
    for(let i=1;i<=9;i++)face.appendChild(el('i',positions[5].includes(i)?'pip on':'pip'));
    const row=el('div','travel-dice-row');row.appendChild(face);box.appendChild(row);
    const button=el('button','travel-throw','投げる');button.type='button';box.appendChild(button);
    $('wrap').appendChild(box);
    spinning=new Promise(resolve=>{
      let done=false;
      const finish=value=>{if(done)return;done=true;button.disabled=true;box.remove();globalThis.removeEventListener?.('pagehide',cancel);spinning=null;resolve(value);};
      const cancel=()=>finish(false);
      button.onclick=()=>finish(true);
      globalThis.addEventListener?.('pagehide',cancel,{once:true});
    });
    button.focus?.();
    return spinning;
  }
  function destination(name,distance,bonus,area='') {
    const box=$('destTxt');box.replaceChildren();
    box.appendChild(el('span','travel-dest-label','つぎの目的地'));
    box.appendChild(el('strong','travel-dest-name',name));
    const row=el('span','travel-dest-meta');
    row.appendChild(el('strong','travel-dest-distance',`あと ${distance} マス`));
    row.appendChild(el('span','travel-dest-bonus',`援助金 ${bonus}万両${area ? '・'+area : ''}`));box.appendChild(row);
  }
  function token(ctx,x,y,dpr,variant,moving,redraw) {
    if(!sprite){sprite=new Image();sprite.onload=redraw;sprite.src='assets/art/kigurumi-children-v1.png';}
    const v=((variant%4)+4)%4, bob=moving?Math.abs(Math.sin(Date.now()/85))*3:0;
    ctx.save();ctx.fillStyle=['#cc3c40','#238f85','#bf4d94','#ae861b'][v];
    ctx.beginPath();ctx.ellipse(x,y+2*dpr,10*dpr,4*dpr,0,0,Math.PI*2);ctx.fill();
    if(sprite.complete&&sprite.naturalWidth){
      const sw=sprite.naturalWidth/4,sh=sprite.naturalHeight,h=48*dpr,w=h*sw/sh;
      ctx.translate(x,y-bob*dpr);ctx.rotate(moving?Math.sin(Date.now()/85)*.06:0);
      ctx.drawImage(sprite,v*sw,0,sw,sh,-w/2,-h,w,h);
    }
    ctx.restore();
  }
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
  globalThis.TRAVEL_UI={direction,pad,clearPad,dice,spin,destination,token};
})();
