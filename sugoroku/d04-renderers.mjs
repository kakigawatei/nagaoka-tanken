import {createGridScene} from './d04-grid-view.mjs';
const UNIT=.0044;
const ends=e=>Array.isArray(e)?e:[e.a,e.b];
export function validateDisplay(display){
 try{return validDisplay(display);}catch{return false;}
}
function validDisplay(display){
 if(!display||!Array.isArray(display.nodes)||!display.nodes.length||!Array.isArray(display.edges))return false;
 if(display.renderer==='mercator-v1')return display.nodes.every(n=>Number.isFinite(n.lat)&&Math.abs(n.lat)<85&&Number.isFinite(n.lng));
 if(display.renderer!=='grid-v1')return false;
 const byId=new Map(display.nodes.map(n=>[n.id,n]));
 return byId.size===display.nodes.length&&new Set(display.nodes.map(n=>`${n.x},${n.y}`)).size===display.nodes.length&&display.nodes.every(n=>Number.isInteger(n.x)&&Number.isInteger(n.y))&&display.edges.every(e=>{if(!e||Array.isArray(e)&&e.length!==2)return false;const [a,b]=ends(e),p=byId.get(a),q=byId.get(b);return p&&q&&Math.abs(p.x-q.x)+Math.abs(p.y-q.y)===1;})&&['scenery','districts'].every(key=>display[key]===undefined||Array.isArray(display[key])&&display[key].every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)));
}
// Registered independently of the allowed board hashes; this does not enable a candidate.
export const DISPLAY_RENDERERS=Object.freeze({
 'mercator-v1':Object.freeze({project:n=>({x:n.lng,y:-Math.log(Math.tan(Math.PI/4+n.lat*Math.PI/360))*180/Math.PI})}),
 'grid-v1':Object.freeze({
  project:n=>({x:n.x*UNIT,y:n.y*UNIT}),
  createScene:createGridScene,
  drawTracks(ctx,display,screen,cell){
   const byId=new Map(display.nodes.map(n=>[n.id,n]));
   for(const [color,factor] of [['#626c65',.22],['#fffdf7',.14]]){ctx.strokeStyle=color;ctx.lineWidth=Math.max(.6,cell*factor);ctx.beginPath();for(const edge of display.edges){const [a,b]=ends(edge),p=screen(byId.get(a)),q=screen(byId.get(b));ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);}ctx.stroke();}
  }
 })
});
