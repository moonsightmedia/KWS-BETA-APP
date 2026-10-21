/** Named, fixed destinations only: never accept an arbitrary redirect URL. */
export function thumbnailReviewReturn(search,localCatalog=false) {
  return new URLSearchParams(search).get('from')==='thumbnail-review'
    ? localCatalog?'/thumbnail-review-local':'/setter/thumbnails'
    : null;
}
