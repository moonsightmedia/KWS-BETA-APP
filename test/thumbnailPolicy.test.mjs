import {test} from 'node:test';
import assert from 'node:assert/strict';
import {focusedThumbnailFile,isPublishedThumbnailVariant,resolveThumbnailServiceBase,thumbnailPhotoDimensions,thumbnailReviewProtection} from '../src/lib/thumbnailPolicy.mjs';

const backend='https://beta-api.kletterwelt-sauerland.de';
const id='03a06939-cbe7-48e0-94f6-23620ba301e1';
const source=series=>`${backend}/storage/v1/object/public/beta-videos/thumbnail-focus/${series}/${id}-11d6c01908492a81a9a9.png`;
test('both observed immutable publication series protect the exact matching row',()=>{
  for(const series of ['confirmed-2026-10-20','live-confirmed-2026-10-20']){
    const url=source(series);assert(isPublishedThumbnailVariant(url,backend,id));assert(isPublishedThumbnailVariant(url+'?download=1',backend,id));
    assert.equal(thumbnailReviewProtection({id,thumbnail_url:url,volume_only:false,status:'haengt'},backend),'published');
  }
});
test('a PNG, a lookalike host, wrong bucket or another row is no publication receipt',()=>{
  for(const url of [source('unconfirmed-2026-10-20'),source('confirmed-2026-10-20').replace(backend,backend+'.evil.invalid'),source('confirmed-2026-10-20').replace('beta-videos','other'),`${backend}/original.png`,source('confirmed-2026-10-20').replace(id,'09173fdd-77de-4b45-b19e-8c31c7c56450')])assert(!isPublishedThumbnailVariant(url,backend,id));
  assert(!isPublishedThumbnailVariant(source('confirmed-2026-10-20'),'https://review-api.kletterwelt-sauerland.de',id));
});
test('durable receipts bind backend, exact live URL and row without creating an approval',()=>{
  const row={id,thumbnail_url:'https://video.kletterwelt-sauerland.de/uploads/variant.png',volume_only:false,status:'haengt'};
  const receipts=[{boulderId:id,sourceBackend:backend,state:'accepted',publishedUrl:row.thumbnail_url}];
  assert.equal(thumbnailReviewProtection(row,backend,receipts),'published');
  assert.equal(receipts[0].state,'accepted');
  assert.equal(thumbnailReviewProtection({...row,thumbnail_url:'https://video.kletterwelt-sauerland.de/uploads/new-original.png'},backend,receipts),null);
  assert.equal(thumbnailReviewProtection(row,'https://review-api.kletterwelt-sauerland.de',receipts),null);
});
test('volume, unknown metadata and removed routes preserve the original',()=>{
  const row={id,thumbnail_url:'https://video.kletterwelt-sauerland.de/original.jpg',volume_only:false,status:'haengt'};
  assert.equal(thumbnailReviewProtection(row,backend),null);
  assert.equal(thumbnailReviewProtection({...row,volume_only:true},backend),'volume');
  assert.equal(thumbnailReviewProtection({...row,volume_only:undefined},backend),'unknown-volume');
  assert.equal(thumbnailReviewProtection({...row,status:'abgeschraubt'},backend),'status');
});
test('web uses its same-origin proxy while native targets the actual configured API',()=>{
  const config={enabled:'true',path:'/thumbnail-focus/',native:false,backend};
  assert.equal(resolveThumbnailServiceBase(config),'/thumbnail-focus');
  assert.equal(resolveThumbnailServiceBase({...config,native:true}),backend+'/thumbnail-focus');
  assert.equal(resolveThumbnailServiceBase({...config,native:true,backend:'https://review-api.kletterwelt-sauerland.de'}),'https://review-api.kletterwelt-sauerland.de/thumbnail-focus');
  assert.equal(resolveThumbnailServiceBase({...config,review:true,backend:'https://review-api.kletterwelt-sauerland.de'}),'https://review-api.kletterwelt-sauerland.de/thumbnail-focus');
  for(const bad of ['https://localhost','capacitor://localhost','http://api.invalid','https://user:pass@api.invalid','https://api.invalid/path','not a url'])assert.equal(resolveThumbnailServiceBase({...config,native:true,backend:bad}),'');
  for(const path of ['//evil.invalid/x','https://evil.invalid/x','/../x','/thumbnail-focus?redirect=other','/thumbnail-focus#x'])assert.equal(resolveThumbnailServiceBase({...config,path}),'');
  assert.equal(resolveThumbnailServiceBase({...config,enabled:'false'}),'');
});
test('stale or disabled upload drafts and volume routes always use the raw original file',()=>{
  const raw=new Blob(['original']),output=new Blob(['processed']);
  const draft={thumbFile:raw,colorId:'green',volumeOnly:false,thumbnailFocus:{inputFile:raw,inputKey:'green||false',outputFile:output,mode:'focus',confirmed:true,selected:['hold'],result:{}}};
  assert.equal(focusedThumbnailFile(draft,true),output);
  assert.equal(focusedThumbnailFile(draft,false),raw);
  assert.equal(focusedThumbnailFile({...draft,thumbnailFocus:{...draft.thumbnailFocus,confirmed:false}},true),raw);
  assert.equal(focusedThumbnailFile({...draft,thumbnailFocus:{...draft.thumbnailFocus,confirmed:undefined}},true),raw);
  assert.equal(focusedThumbnailFile({...draft,volumeOnly:true,thumbnailFocus:{...draft.thumbnailFocus,inputKey:'green||true'}},true),raw);
  assert.equal(focusedThumbnailFile({...draft,colorId:'blue'},true),raw);
  assert.equal(focusedThumbnailFile({...draft,thumbnailFocus:{...draft.thumbnailFocus,mode:'original'}},true),raw);
});
test('manual photo sizing matches the bounded upright service photo space',()=>{
  assert.deepEqual(thumbnailPhotoDimensions(1200,1600),[540,720]);
  assert.deepEqual(thumbnailPhotoDimensions(1600,1200),[720,540]);
  assert.deepEqual(thumbnailPhotoDimensions(360,480),[360,480]);
  assert.throws(()=>thumbnailPhotoDimensions(47,100));assert.throws(()=>thumbnailPhotoDimensions(6000,6000));assert.throws(()=>thumbnailPhotoDimensions(48,2000));
});
