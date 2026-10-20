/** Explicit hand contour in the existing bitmap coordinate space; never fills
 * unseen parts outside the photograph or changes any previous selection. */
export function manualContour(points,width,height,id) {
  if (!Array.isArray(points)||points.length<3||points.length>128) throw new Error('Mindestens drei Konturpunkte setzen.');
  if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1) throw new Error('Das Foto fehlt.');
  const polygon=points.map(p=>{
    if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)))throw new Error('Ungültiger Konturpunkt.');
    return [Math.max(0,Math.min(width-1,p[0])),Math.max(0,Math.min(height-1,p[1]))];
  });
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let i=0;i<polygon.length;i++)for(let j=i+2;j<polygon.length;j++){
    if(i===0&&j===polygon.length-1)continue;
    const a=polygon[i],b=polygon[(i+1)%polygon.length],c=polygon[j],d=polygon[(j+1)%polygon.length];
    if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)throw new Error('Die Kontur kreuzt sich. Bitte den letzten Punkt zurücknehmen.');
  }
  const area=Math.abs(polygon.reduce((sum,p,i)=>{const next=polygon[(i+1)%polygon.length];return sum+p[0]*next[1]-next[0]*p[1];},0))/2;
  if(area<65||area>.98*width*height)throw new Error('Bitte nur die sichtbare Grifffläche umranden.');
  const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);
  return {id,polygon,holes:[],box:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1],area,source:'polygon_correction'};
}

/** Older confirmed masks remain usable when only the detector revision changed. */
export function samePhotoSpace(a,b) {
  return Boolean(a&&b&&typeof a.image_hash==='string'&&a.image_hash===b.image_hash&&a.width>0&&a.height>0&&a.width===b.width&&a.height===b.height);
}
