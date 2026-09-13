import {createV2GridScene} from './d04-v2-scene.mjs';
import {layoutLandmarkLabels} from './v2-terrain.mjs';

export function createTownScene(display,options={}){
 // Landmarks stay in the decoration layer. Never request town IDs as PNGs.
 const terrainDisplay={...display,nodes:display.nodes.map(({station,...n})=>n),trace:{...display.trace,provisionalStations:[]}};
 const terrain=createV2GridScene(terrainDisplay,options);
 const nodes=new Map(display.nodes.map(n=>[n.id,n]));
 const places=display.townDisplay.map((t,i)=>({number:i+1,id:t.nodeId,name:t.name}));
 const palette=['#246a9d','#a45220','#3f773d','#88539b','#007d80','#ac3d58','#665f17'];
 const districts=[...new Set(display.townDisplay.map(t=>t.district))].sort();
 let labels=[];
 return {...terrain,kind:'v2-terrain',places,
  dispose(){labels=[];terrain.dispose();},
  hitTest(x,y){return labels.find(l=>!l.hidden&&x>=l.x&&x<=l.x+l.width&&y>=l.y&&y<=l.y+l.height)?.number;},
  draw(ctx,args){
   const result=terrain.draw(ctx,args),{screen,width,height,cell,goal}=args;
   ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';
   const items=[];
   for(const [i,t] of display.townDisplay.entries()){
    const p=screen(nodes.get(t.nodeId));if(p.x<0||p.x>width-64||p.y<0||p.y>height)continue;
    if(cell<24){ctx.fillStyle=palette[districts.indexOf(t.district)%palette.length];const size=Math.max(2,Math.min(7,cell*.55));ctx.fillRect(p.x-size/2,p.y-size/2,size,size);}
    else if(p.y>=(args.labelTop??130)&&p.y<=(args.labelBottom??height-64))items.push({p,text:t.name,number:i+1});
    if(t.nodeId===goal){ctx.strokeStyle='#cf351b';ctx.lineWidth=3;ctx.strokeRect(p.x-6,p.y-6,12,12);}
   }
   labels=cell>=24?layoutLandmarkLabels(items,{width:width-64,height,top:args.labelTop??130,bottom:args.labelBottom??height-64,cell,obstacles:(args.tokens||[]).map(p=>({x:p.x-20,y:p.y-45,width:40,height:50}))}):[];
   for(const l of labels){if(l.hidden)continue;ctx.fillStyle=l.compact?'#173928':'#fff';ctx.fillRect(l.x,l.y,l.width,l.height);ctx.font='11px sans-serif';ctx.fillStyle=l.compact?'#fff':'#173928';ctx.fillText(l.compact?String(l.number):l.text,l.x+3,l.y+12,l.width-6);}
   ctx.restore();return {...result,labels};
  }
 };
}
