(() => {
  function model({start,steps,adj,previous=null,guide=0,distance=()=>0}) {
    const path=[], guides=[guide];
    const at=()=>path.at(-1)??start;
    const next=()=>{
      const prev=path.length>1?path.at(-2):path.length?start:previous;
      const all=adj[at()]||[];const forward=all.filter(id=>id!==prev);
      const choices=forward.length?forward:all;
      if(choices.length>1&&guides.at(-1)>0)return [...choices].sort((a,b)=>distance(a)-distance(b)||a-b).slice(0,1);
      return choices;
    };
    return {path,at,next,remaining:()=>steps-path.length,
      move(id){if(path.length>=steps||!next().includes(id))return false;
        const prev=path.length>1?path.at(-2):path.length?start:previous;
        const branching=(adj[at()]||[]).filter(n=>n!==prev).length>1;
        guides.push(Math.max(0,guides.at(-1)-(branching?1:0)));path.push(id);return true;},
      undo(){if(!path.length)return false;path.pop();guides.pop();return true;}
    };
  }
  function open(config) {
    const state=model(config);const host=document.getElementById('dirs');
    let closed=false,locked=false,generation=0;
    const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>{if(!closed)fn();};return b;};
    function render(){
      if(closed)return;
      const currentGeneration=++generation;
      config.preview(state.at(),state.path);
      const backId=state.path.length>1?state.path.at(-2):state.path.length?config.start:null;
      const choices=state.remaining()?state.next().filter(id=>id!==backId).map(id=>({...config.choice(state.at(),id),id})):[];
      if(backId!==null)choices.push({...config.choice(state.at(),backId),id:backId,label:'1マス戻す'});
      TRAVEL_UI.pad(choices,state.remaining(),id=>{
        if(closed||locked||currentGeneration!==generation||!choices.some(c=>c.id===id))return;
        if(id===backId?state.undo():state.move(id))render();
      },locked);
      host.style.display='flex';
      const details=document.createElement('div');details.className='route-summary';
      const title=document.createElement('strong');title.textContent=config.name(state.at());details.appendChild(title);
      const info=button('このマスを見る',()=>config.inspect(state.at()));info.disabled=locked;details.appendChild(info);
      if(!state.remaining()){
        const question=document.createElement('p');question.textContent='このマスに止まりますか？';details.appendChild(question);
        const yes=button('はい',()=>{if(!locked){locked=true;render();config.commit([...state.path]);}});yes.disabled=locked;
        const no=button('いいえ',()=>{if(!locked&&state.undo())render();});no.disabled=locked;details.appendChild(yes);details.appendChild(no);
      }
      host.appendChild(details);
    }
    render();
    return {render,setLocked(value){locked=value;render();},close(){closed=true;TRAVEL_UI.clearPad();config.preview(null,[]);}};
  }
  globalThis.TRAVEL_ROUTE={model,open};
})();
