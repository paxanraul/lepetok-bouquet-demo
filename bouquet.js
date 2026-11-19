// All coordinates use the same 440 × 480 stage so the editor and recipe
// thumbnails render the same composition at different sizes.
const bouquetWidth = 440;
const bouquetHeight = 480;
const bloomArt = {
  rose:       { crop: [43, 16, 233, 190], size: 107, stem: [154, 383] },
  ranunculus: { crop: [53, 14, 218, 176], size: 99, stem: [146, 386] },
  tulip:      { crop: [61, 4, 161, 160], size: 76, stem: [140, 386] },
  dahlia:     { crop: [42, 4, 240, 236], size: 112, stem: [155, 388] },
  'sweet-pea':{ crop: [23, 4, 260, 229], size: 76, stem: [141, 388] },
  eucalyptus: { crop: [37, 7, 201, 365], size: 74, stem: [136, 388] }
};

const assetNames = [...Object.keys(bloomArt), 'wrap-kraft', 'wrap-silk'];
const bouquetAssets = new Map();
const bouquetImagesReady = Promise.all(assetNames.map(id => new Promise(resolve => {
  const image = new Image();
  image.onload = () => { bouquetAssets.set(id, image); resolve(); };
  image.onerror = resolve;
  image.src = 'assets/' + id + '.webp';
})));

// The first row sets the silhouette. Foreground slots keep a representative
// of each selected flower visible, even when one variety dominates the count.
const crownSlots = [
  [222, 105, 9], [148, 127, -23], [294, 132, 24],
  [108, 180, -28], [332, 176, 24], [214, 160, 5],
  [162, 193, -8], [273, 191, 11], [225, 213, -6],
  [207, 73, -19], [164, 155, 14], [270, 150, -15],
  [138, 217, -24], [308, 216, 18], [245, 120, 19],
  [199, 185, -11], [256, 226, 13], [188, 223, -18]
];
const frontSlots = [
  [219, 169, -9], [146, 167, -18], [294, 165, 15],
  [180, 219, -12], [263, 218, 12]
];

function makeCrown(quantities) {
  const selected = Object.keys(bloomArt).filter(id => id !== 'eucalyptus' && quantities[id] > 0);
  const flowerCount = selected.reduce((sum, id) => sum + quantities[id], 0);
  if (flowerCount < 3) {
    const positions = flowerCount === 1 ? [[220, 140, 0]] : [[182, 137, -13], [256, 151, 15]];
    return selected.flatMap(id => Array(quantities[id]).fill(id)).map((id, index) => ({ id, slot: positions[index], size: 1.12 }));
  }

  const extra = Math.min(flowerCount, 18) - selected.length;
  const remaining = flowerCount - selected.length;
  const shares = selected.map(id => {
    const weight = remaining ? (quantities[id] - 1) * extra / remaining : 0;
    return { id, count: Math.floor(weight), remainder: weight % 1 };
  });
  let leftover = extra - shares.reduce((sum, item) => sum + item.count, 0);
  for (const item of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (!leftover) break;
    item.count += 1;
    leftover -= 1;
  }

  const spread = Math.min(1, .62 + flowerCount * .032);
  const scaleSlot = ([x, y, angle]) => [220 + (x - 220) * spread, y, angle];
  const back = [];
  while (back.length < extra) {
    for (const item of shares) {
      if (!item.count) continue;
      back.push({ id: item.id, slot: scaleSlot(crownSlots[back.length]), size: .78 + (back.length % 3) * .07 });
      item.count -= 1;
    }
  }
  back.sort((a, b) => a.slot[1] - b.slot[1]);

  const foreground = [...selected].sort((a, b) => (a === 'sweet-pea') - (b === 'sweet-pea'));
  return back.concat(foreground.map((id, index) => ({
    id, slot: scaleSlot(frontSlots[index]), size: id === 'sweet-pea' ? .95 : 1
  })));
}

function drawStalk(context, [x, y], baseX, baseY) {
  context.beginPath();
  context.moveTo(baseX, baseY);
  context.quadraticCurveTo(baseX + (x - baseX) * .42, y + 92, x, y);
  context.strokeStyle = '#4f5630';
  context.lineWidth = 3;
  context.stroke();
  context.strokeStyle = '#9b916080';
  context.lineWidth = 1;
  context.stroke();
}

function drawPlant(context, id, x, y, height, angle) {
  const image = bouquetAssets.get(id);
  if (!image) return;
  const [stemX, stemY] = bloomArt[id].stem;
  const scale = height / image.height;
  context.save();
  context.translate(x, y);
  context.rotate(angle * Math.PI / 180);
  context.drawImage(image, -stemX * scale, -stemY * scale, image.width * scale, height);
  context.restore();
}

function paintBouquet(canvas, quantities, wrap) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(canvas.width / bouquetWidth, 0, 0, canvas.height / bouquetHeight, 0, 0);
  context.clearRect(0, 0, bouquetWidth, bouquetHeight);
  const count = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  if (!count) return;

  const wrapped = wrap !== 'none';
  const stems = makeCrown(quantities);
  const foliage = Math.min(quantities.eucalyptus || 0, 7);
  const baseY = wrapped ? 391 : 426;
  const lightHeight = stems.length > 2 ? 302 : 265;

  for (let index = 0; index < foliage; index += 1) {
    const angle = (stems.length ? [17, -18, 27, -26, 24, -23, 6] : [0, -14, 16, -23, 25, -7, 7])[index];
    const height = lightHeight + (index % 3) * 18;
    drawPlant(context, 'eucalyptus', 220 + (index % 3 - 1) * 8, baseY, height, angle);
  }

  stems.forEach(({ slot }, index) => drawStalk(context, slot, 220 + (index % 5 - 2) * 3, baseY));
  if (stems.length > 2) {
    const leaf = bouquetAssets.get('rose');
    const tulip = bouquetAssets.get('tulip');
    stems.forEach(({ id, slot: [x, y, angle] }, index) => {
      const source = id === 'tulip' ? tulip : leaf;
      if (!source || index % 2) return;
      context.save();
      context.translate(x + (220 - x) * .27, y + 63);
      context.rotate(angle * Math.PI / 240);
      context.drawImage(source, 32, 208, 226, 105, -39, -10, 78, 36);
      context.restore();
    });
  }

  const paper = bouquetAssets.get('wrap-' + wrap);
  if (paper) {
    const width = stems.length + foliage < 3 ? 211 : 296;
    const height = stems.length + foliage < 3 ? 202 : 248;
    context.save();
    context.shadowColor = '#4a281b3b';
    context.shadowBlur = 17;
    context.shadowOffsetY = 13;
    context.drawImage(paper, 220 - width / 2, 457 - height, width, height);
    context.restore();
  } else if (stems.length + foliage > 1) {
    context.fillStyle = '#a8716c';
    context.fillRect(207, 387, 26, 4);
  }

  for (const { id, slot: [x, y, angle], size } of stems) {
    const image = bouquetAssets.get(id);
    if (!image) continue;
    const { crop, size: width } = bloomArt[id];
    const w = width * size;
    const h = w * crop[3] / crop[2];
    context.save();
    context.translate(x, y);
    context.rotate(angle * Math.PI / 180);
    context.shadowColor = '#39251b3a';
    context.shadowBlur = 8;
    context.shadowOffsetY = 4;
    context.drawImage(image, ...crop, -w / 2, -h / 2, w, h);
    context.restore();
  }
}
