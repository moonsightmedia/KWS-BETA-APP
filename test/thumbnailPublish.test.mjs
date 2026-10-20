import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publishThumbnailDecision} from '../src/lib/thumbnailPublish.mjs';
import {createHash} from 'node:crypto';

function fixture(overrides={}) {
  let online='https://media.test/original.jpg',stored,uploads=0,writes=0,role=true,lose=false,conflict=false,color='Grün',status='haengt',volume=false;
  const original=new Blob(['synthetic-test-photo'],{type:'image/jpeg'});
  const image_hash=createHash('sha256').update('synthetic-test-photo').digest('hex');
  const decision={key:'one',boulderId:'boulder',sourceBackend:'https://backend.test',sourceUrl:online,color:'Grün',color2:null,state:'accepted',focus:{inputFile:original,result:{version:'test',image_hash},mode:'focus',selected:['a']},...overrides};
  const deps={backend:'https://backend.test',publicKey:'public-test-key',uuid:()=> 'unique-upload',
    read:async()=>stored?[structuredClone(stored)]:[],save:async d=>{stored=structuredClone(d);},
    getSession:async()=>({user:{id:'setter'}}),
    transportFor:owner=>async(url,init={})=>{
      assert.equal(owner,'setter');
      if(url.includes('/rest/v1/user_roles?')){
        const query=new URL(url).searchParams;
        assert.equal(query.get('select'),'role');assert.equal(query.get('user_id'),'eq.setter');assert.equal(query.get('role'),'in.(setter,admin)');assert.equal(query.get('limit'),'1');
        return Response.json(role?[{role:'setter'}]:[]);
      }
      if(init.method==='PATCH'){
        writes++;assert.equal(JSON.stringify(Object.keys(JSON.parse(init.body))),JSON.stringify(['thumbnail_url']));
        assert.equal(new URL(url).searchParams.get('thumbnail_url'),'eq.https://media.test/original.jpg');
        assert.equal(new URL(url).searchParams.get('color'),'eq.Grün');assert.equal(new URL(url).searchParams.get('color_2'),'is.null');assert.equal(new URL(url).searchParams.get('status'),'eq.haengt');
        assert.equal(new URL(url).searchParams.get('volume_only'),'eq.false');
        if(conflict)return Response.json([]);
        online=JSON.parse(init.body).thumbnail_url;
        if(lose){lose=false;throw new Error('response lost');}
        return Response.json([{id:'boulder',thumbnail_url:online}]);
      }
      assert(new URL(url).searchParams.get('select').includes('volume_only'));
      return Response.json([{id:'boulder',thumbnail_url:online,color,color_2:null,status,volume_only:volume}]);
    },
    upload:async()=>{uploads++;assert.equal(stored.sourceUrl,online);return {url:'https://media.test/new.png'};},
  };
  return {decision,deps,get stored(){return stored;},get uploads(){return uploads;},get writes(){return writes;},set online(v){online=v;},set role(v){role=v;},set lose(v){lose=v;},set conflict(v){conflict=v;},set color(v){color=v;},set status(v){status=v;},set volume(v){volume=v;}};
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
test('volume-only and unknown volume metadata reject before upload or publication',async()=>{
  for(const value of [true,null,undefined]){const f=fixture();f.volume=value;await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/Volumen/);assert.equal(f.uploads,0);assert.equal(f.writes,0);}
});
test('missing or mismatched local original bytes reject before any media write',async()=>{
  for(const inputFile of [undefined,new Blob(['wrong-photo'])]){const f=fixture();f.decision.focus.inputFile=inputFile;await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/Originalbeleg/);assert.equal(f.uploads,0);assert.equal(f.writes,0);}
});
test('an immutable published variant cannot be offered as a new original',async()=>{
  const id='03a06939-cbe7-48e0-94f6-23620ba301e1';
  const f=fixture({boulderId:id,sourceUrl:`https://backend.test/storage/v1/object/public/beta-videos/thumbnail-focus/live-confirmed-2026-10-20/${id}-11d6c01908492a81a9a9.png`});
  await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/bereits übernommen/);assert.equal(f.uploads,0);assert.equal(f.writes,0);
});
