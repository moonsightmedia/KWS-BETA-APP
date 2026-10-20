const assert = require('node:assert/strict');
module.exports = async function checkSpotlight(page, label) {
  const delta = await page.evaluate(() => {
    const svg = document.querySelector('.tour-shade');
    const contour = document.querySelector('.tour-highlight').getBoundingClientRect();
    const cutout = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cutout.setAttribute('d', 'M' + svg.querySelector('path').getAttribute('d').split('Z M')[1]);
    svg.append(cutout);
    const box = cutout.getBBox(), matrix = svg.getScreenCTM();
    const a = new DOMPoint(box.x, box.y).matrixTransform(matrix);
    const b = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix);
    cutout.remove();
    return [a.x - contour.left, a.y - contour.top, b.x - contour.right, b.y - contour.bottom];
  });
  assert(delta.every(value => Math.abs(value) < .6), `${label}: cutout/contour mismatch ${delta}`);
};
