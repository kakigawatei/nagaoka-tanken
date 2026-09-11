export const FACE_ORDER=[3,4,1,6,2,5]; // BoxGeometry: +X,-X,+Y,-Y,+Z,-Z.
export const TOP_ROTATIONS={1:[0,0,0],2:[-Math.PI/2,0,0],3:[0,0,Math.PI/2],4:[0,0,-Math.PI/2],5:[Math.PI/2,0,0],6:[Math.PI,0,0]};
export function landingRotation(start,face){
  const base=TOP_ROTATIONS[face];if(!base)throw new Error('INVALID_FACE');
  return base.map((v,i)=>v+Math.PI*2*(Math.ceil((start[i]-v)/(Math.PI*2))+2));
}
export function settlePose(start,target,progress){
  const t=Math.max(0,Math.min(1,progress)),e=1-(1-t)**4;
  return {rotation:start.map((v,i)=>v+(target[i]-v)*e),lift:Math.abs(Math.sin(t*Math.PI*3))*.45*(1-t)};
}
