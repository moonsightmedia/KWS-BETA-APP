import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publishThumbnailDecision} from '../src/lib/thumbnailPublish.mjs';

function fixture(overrides={}) {
  let online='https://media.test/original.jpg',stored,uploads=0,writes=0,role=true,lose=false,conflict=false,color='Grün',status='haengt';
  const decision={key:'one',boulderId:'boulder',sourceBackend:'https://backend.test',sourceUrl:online,color:'Grün',color2:null,state:'accepted',focus:{result:{version:'test'},mode:'focus',selected:['a']},...overrides};
  const deps={backend:'https://backend.test',publicKey:'public-test-key',uuid:()=> 'unique-upload',
    read:async()=>stored?[structuredClone(stored)]:[],save:async d=>{stored=structuredClone(d);},
    getSession:async()=>({user:{id:'setter'}}),
    transportFor:owner=>async(url,init={})=>{
      assert.equal(owner,'setter');
      if(url.includes('/rpc/has_role'))return Response.json(role);
      if(init.method==='PATCH'){
        writes++;assert.equal(JSON.stringify(Object.keys(JSON.parse(init.body))),JSON.stringify(['thumbnail_url']));
        assert.equal(new URL(url).searchParams.get('thumbnail_url'),'eq.https://media.test/original.jpg');
        assert.equal(new URL(url).searchParams.get('color'),'eq.Grün');assert.equal(new URL(url).searchParams.get('color_2'),'is.null');assert.equal(new URL(url).searchParams.get('status'),'eq.haengt');
        if(conflict)return Response.json([]);
        online=JSON.parse(init.body).thumbnail_url;
        if(lose){lose=false;throw new Error('response lost');}
        return Response.json([{id:'boulder',thumbnail_url:online}]);
      }
      return Response.json([{id:'boulder',thumbnail_url:online,color,color_2:null,status}]);
    },
    upload:async()=>{uploads++;assert.equal(stored.sourceUrl,online);return {url:'https://media.test/new.png'};},
  };
  return {decision,deps,get stored(){return stored;},get uploads(){return uploads;},get writes(){return writes;},set online(v){online=v;},set role(v){role=v;},set lose(v){lose=v;},set conflict(v){conflict=v;},set color(v){color=v;},set status(v){status=v;}};
}
test('only an accepted, selected photo of this backend may publish',async()=>{
  for(const patch of [{state:'draft'},{state:'skipped'},{sourceBackend:'https://other.test'},{ownerId:'other'},{focus:{result:{},mode:'focus',selected:[]}}]){
    const f=fixture(patch);await assert.rejects(publishThumbnailDecision(f.decision,f.deps));assert.equal(f.uploads,0);assert.equal(f.writes,0);
  }
});
test('missing session or setter role never uploads',async()=>{
  const f=fixture();f.role=false;await assert.rejects(publishThumbnailDecision(f.decision,f.deps));assert.equal(f.uploads,0);
  f.deps.getSession=async()=>null;await assert.rejects(publishThumbnailDecision(f.decision,f.deps));assert.equal(f.writes,0);
});
test('changed online photo is protected before upload',async()=>{
  const f=fixture();f.online='https://media.test/other.jpg';await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/inzwischen/);assert.equal(f.uploads,0);assert.equal(f.writes,0);
});
test('changed route color or removed boulder is protected before upload',async()=>{
  for (const property of ['color','status']) {const f=fixture();f[property]='changed';await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/Farbe oder Boulderstatus/);assert.equal(f.uploads,0);assert.equal(f.writes,0);}
});
test('publish preserves original receipt and changes only thumbnail_url with CAS',async()=>{
  const f=fixture();const done=await publishThumbnailDecision(f.decision,f.deps);assert.equal(done.state,'published');assert.equal(done.sourceUrl,'https://media.test/original.jpg');assert.equal(f.uploads,1);assert.equal(f.writes,1);
});
test('a lost successful PATCH response is recovered without another upload or PATCH',async()=>{
  const f=fixture();f.lose=true;await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/response lost/);
  const done=await publishThumbnailDecision(f.decision,f.deps);assert.equal(done.state,'published');assert.equal(f.uploads,1);assert.equal(f.writes,1);
});
test('a race after upload cannot overwrite an online change',async()=>{
  const f=fixture();f.conflict=true;await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/Konflikt/);assert.equal(f.stored.state,'accepted');assert.equal(f.stored.publishedUrl,'https://media.test/new.png');
});
test('failed local durable save stops all cloud writes',async()=>{
  const f=fixture();f.deps.save=async()=>{throw new Error('quota');};await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/quota/);assert.equal(f.uploads,0);assert.equal(f.writes,0);
});
