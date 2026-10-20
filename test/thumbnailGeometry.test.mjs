import {test} from 'node:test';
import assert from 'node:assert/strict';
import {manualContour,samePhotoSpace} from '../src/lib/thumbnailGeometry.mjs';
import {thumbnailReviewReturn} from '../src/lib/thumbnailReviewAuth.mjs';
test('a deliberate cropped contour can span more than half the photo and two edges',()=>{
 const result=manualContour([[0,0],[359,0],[359,160],[0,430]],360,480,'contour-test');
 assert(result.area>360*480*.5);assert.equal(result.source,'polygon_correction');assert.equal(result.polygon[0][0],0);assert.deepEqual(result.box,[0,0,360,431]);
});
test('unfinished, self-crossing or whole-photo contours do not replace the original',()=>{
 for(const points of [[[0,0],[50,50]],[[0,0],[300,300],[0,300],[300,0]],[[0,0],[359,0],[359,479],[0,479]],[[NaN,5],[10,5],[10,40]]])assert.throws(()=>manualContour(points,360,480,'test'));
});
test('minor detector revisions do not discard confirmed masks, changed photo or geometry does',()=>{
 const old={image_hash:'photo',width:360,height:480,version:'3.1'};
 assert(samePhotoSpace(old,{...old,version:'3.2'}));assert(!samePhotoSpace(old,{...old,width:720}));assert(!samePhotoSpace(old,{...old,image_hash:'different'}));
});
test('review login has only fixed local or guarded destinations',()=>{
 assert.equal(thumbnailReviewReturn('?from=thumbnail-review',true),'/thumbnail-review-local');assert.equal(thumbnailReviewReturn('?from=thumbnail-review'),'/setter/thumbnails');
 assert.equal(thumbnailReviewReturn('?redirect=https://evil.test',true),null);assert.equal(thumbnailReviewReturn('?from=https://evil.test'),null);assert.equal(thumbnailReviewReturn('?from=thumbnail-review&redirect=https://evil.test'),'/setter/thumbnails');
});
