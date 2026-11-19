const flowers = [
  { id: 'rose', name: 'Садовая роза', price: 290 },
  { id: 'ranunculus', name: 'Ранункулюс', price: 310 },
  { id: 'tulip', name: 'Тюльпан', price: 170 },
  { id: 'dahlia', name: 'Георгин', price: 280 },
  { id: 'sweet-pea', name: 'Душистый горошек', price: 180 },
  { id: 'eucalyptus', name: 'Эвкалипт', price: 190 }
];
const wraps = [
  { id: 'none', name: 'Без упаковки', price: 0 },
  { id: 'kraft', name: 'Тёплый крафт', price: 150 },
  { id: 'silk', name: 'Розовая бумага', price: 240 }
];
const presets = [
  { id: 'soft', name: 'Нежный', wrap: 'silk', recipe: { rose: 4, ranunculus: 4, 'sweet-pea': 2, eucalyptus: 2 } },
  { id: 'bold', name: 'Тёплый', wrap: 'kraft', recipe: { dahlia: 3, tulip: 6, ranunculus: 4, eucalyptus: 2 } },
  { id: 'wine', name: 'Бордо', wrap: 'silk', recipe: { dahlia: 7, rose: 4, eucalyptus: 3 } },
  { id: 'ivory', name: 'Кремовый', wrap: 'kraft', recipe: { ranunculus: 8, 'sweet-pea': 4, eucalyptus: 3 } }
];
const storageKey = 'lepetok-bouquet-v1';
const maxQuantity = 99;
const priceFormat = new Intl.NumberFormat('ru-RU');
const plural = new Intl.PluralRules('ru-RU');
const stemWords = { one: 'стебель', few: 'стебля', many: 'стеблей' };
const money = price => priceFormat.format(price) + ' ₽';
const get = id => document.getElementById(id);
const order = get('order');
const orderButtons = [...document.querySelectorAll('[data-order]')];
const presetButtons = new Map();
const wrappingInputs = new Map();
const controls = new Map();
const showcaseStemButtons = new Map();

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

const draft = loadDraft();
const quantities = {};
for (const { id } of flowers) {
  const saved = draft ? draft.quantities?.[id] : presets[0].recipe[id];
  quantities[id] = Number.isInteger(saved) && saved >= 0 && saved <= maxQuantity ? saved : 0;
}
let wrapping = wraps.find(wrap => wrap.id === (draft ? draft.wrapping : presets[0].wrap)) || wraps[0];

for (const flower of flowers) {
  const item = document.createElement('li');
  item.className = 'flower';
  item.innerHTML = `
    <img src="assets/${flower.id}.webp" alt="" width="38" height="42" loading="lazy" decoding="async">
    <div class="flower-copy"><h4>${flower.name}</h4><p>${money(flower.price)} / стебель</p></div>
    <div class="stepper" role="group">
      <button type="button" aria-label="Убрать: ${flower.name}">−</button>
      <span aria-hidden="true">0</span>
      <button type="button" aria-label="Добавить: ${flower.name}">+</button>
    </div>`;
  const [minus, plus] = item.querySelectorAll('button');
  const count = item.querySelector('.stepper span');
  controls.set(flower.id, { item, minus, plus, count });
  minus.addEventListener('click', () => changeQuantity(flower, -1));
  plus.addEventListener('click', () => changeQuantity(flower, 1));
  get('catalog').append(item);
}

for (const wrap of wraps) {
  const label = document.createElement('label');
  label.className = 'package';
  label.innerHTML = `
    <input type="radio" name="wrap" value="${wrap.id}">
    <span>${wrap.name}</span>
    <small>${wrap.price ? '+ ' : ''}${money(wrap.price)}</small>`;
  const input = label.querySelector('input');
  wrappingInputs.set(wrap.id, input);
  input.addEventListener('change', () => {
    wrapping = wrap;
    render('Упаковка: ' + wrap.name + '. ');
  });
  get('wrap-options').append(label);
}

function currentPreset() {
  return presets.find(({ wrap, recipe }) =>
    wrap === wrapping.id && flowers.every(({ id }) => quantities[id] === (recipe[id] || 0))
  );
}

function usePreset(preset) {
  for (const { id } of flowers) quantities[id] = preset.recipe[id] || 0;
  wrapping = wraps.find(wrap => wrap.id === preset.wrap);
  render(preset.name + ' букет. ');
}

for (const preset of presets) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preset';
  button.dataset.preset = preset.id;
  button.title = 'Применить готовый состав и упаковку';
  const thumbnail = document.createElement('img');
  thumbnail.width = 132;
  thumbnail.height = 144;
  thumbnail.alt = '';
  thumbnail.src = 'assets/preset-' + preset.id + '.png';
  const label = document.createElement('span');
  label.textContent = preset.name;
  button.append(thumbnail, label);
  presetButtons.set(preset.id, button);
  button.addEventListener('click', () => usePreset(preset));
  get('presets').append(button);
}

function openBuilder() {
  get('builder-title').focus({ preventScroll: true });
  get('builder').scrollIntoView();
}

for (const preset of presets) {
  const card = document.createElement('li');
  const total = flowers.reduce((sum, { id, price }) =>
    sum + (preset.recipe[id] || 0) * price, wraps.find(wrap => wrap.id === preset.wrap).price);
  card.innerHTML = `
    <div class="showcase-art">
      <img src="assets/preset-${preset.id}.png" width="132" height="144" alt="">
      <canvas width="440" height="480" aria-hidden="true" hidden></canvas>
    </div>
    <div class="showcase-details">
      <h4>${preset.name}</h4><span>${money(total)}</span>
      <button type="button" aria-label="Настроить букет «${preset.name}»">Настроить букет</button>
    </div>`;
  card.querySelector('button').addEventListener('click', () => {
    usePreset(preset);
    openBuilder();
  });
  get('showcase-bouquets').append(card);
  bouquetImagesReady.then(() => {
    const canvas = card.querySelector('canvas');
    paintBouquet(canvas, preset.recipe, preset.wrap);
    card.querySelector('img').hidden = true;
    canvas.hidden = false;
  });
}

for (const flower of flowers) {
  const card = document.createElement('li');
  card.innerHTML = `
    <div class="showcase-art">
      <img src="assets/${flower.id}.webp" width="302" height="397" alt="" decoding="async">
    </div>
    <div class="showcase-details">
      <h4>${flower.name}</h4><span>${money(flower.price)} / стебель</span>
      <button type="button" aria-label="Добавить в букет: ${flower.name}">Добавить в букет</button>
    </div>`;
  const button = card.querySelector('button');
  button.addEventListener('click', () => {
    changeQuantity(flower, 1);
    openBuilder();
  });
  showcaseStemButtons.set(flower.id, button);
  get('showcase-stems').append(card);
}
get('bouquet-catalog').hidden = false;

get('shuffle').addEventListener('click', () => {
  const current = currentPreset();
  const choices = presets.filter(preset => preset !== current);
  usePreset(choices[Math.floor(Math.random() * choices.length)]);
});

function changeQuantity(flower, delta) {
  const next = quantities[flower.id] + delta;
  if (next < 0 || next > maxQuantity) return;
  quantities[flower.id] = next;
  render(flower.name + ': ' + next + '. ');
}

function bouquetData() {
  const selected = flowers.filter(({ id }) => quantities[id] > 0);
  const count = selected.reduce((sum, { id }) => sum + quantities[id], 0);
  const stemsPrice = selected.reduce((sum, { id, price }) => sum + quantities[id] * price, 0);
  return { selected, count, total: count ? stemsPrice + wrapping.price : 0 };
}

let viewer = null;
let modelReady = false;
let viewerRequest = null;
let preferredView = '3d';
let previewAvailable = false;

function updatePreviewMode(count) {
  const mount = Boolean(count && viewer && preferredView === '3d');
  const showModel = mount && modelReady;
  const stage = get('bouquet-3d');
  stage.hidden = !mount;
  stage.inert = !showModel;
  stage.classList.toggle('waiting', !showModel);
  get('bouquet-art').hidden = showModel || count === 0;
  get('reset-view').hidden = !showModel;
  get('view-3d').setAttribute('aria-pressed', String((modelReady && preferredView === '3d')));
  get('view-2d').setAttribute('aria-pressed', String(!modelReady || preferredView !== '3d'));
  get('preview-label').textContent = showModel ? 'Потяните, чтобы повернуть букет' : 'Эскиз букета';
  if (viewer && preferredView === '3d') {
    viewer.setComposition(quantities, wrapping.id);
  }
  viewer?.setVisible(mount);
}

function viewerUnavailable() {
  viewer = null;
  modelReady = false;
  preferredView = '2d';
  get('view-3d').disabled = true;
  get('view-3d').title = '3D недоступно в этом браузере';
  get('view-3d').removeAttribute('aria-busy');
  get('viewer-status').textContent = '3D недоступно. Показан эскиз букета.';
  updatePreviewMode(currentCount);
}

function loadViewer() {
  if (viewerRequest || preferredView !== '3d' || !currentCount || !previewAvailable) return;
  get('view-3d').setAttribute('aria-busy', 'true');
  get('viewer-status').textContent = 'Загружается 3D букет.';
  viewerRequest = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'assets/3d/viewer.js?v=sculpture-3';
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  }).then(() => window.createBouquetViewer(get('bouquet-3d'), viewerUnavailable, () => {
    modelReady = true;
    get('view-3d').removeAttribute('aria-busy');
    get('viewer-status').textContent = '3D букет готов.';
    updatePreviewMode(currentCount);
  })).then(model => {
    viewer = model;
    updatePreviewMode(currentCount);
  })
    .catch(viewerUnavailable);
}

for (const mode of ['2d', '3d']) {
  get('view-' + mode).addEventListener('click', () => {
    preferredView = mode;
    if (mode === '3d') {
      previewAvailable = true;
      loadViewer();
    }
    updatePreviewMode(currentCount);
  });
}
get('reset-view').addEventListener('click', () => viewer?.reset());

let renderFrame = 0;
let artReady = false;
function drawBouquet(count) {
  get('preview-empty').hidden = count > 0;
  updatePreviewMode(count);
  loadViewer();
  if (!artReady || renderFrame) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = 0;
    const art = get('bouquet-art');
    paintBouquet(art, quantities, wrapping.id);
    const mobileArt = get('mobile-art');
    const context = mobileArt.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, mobileArt.width, mobileArt.height);
    context.drawImage(art, 0, 0, mobileArt.width, mobileArt.height);
  });
}

let builderVisible = false;
let currentCount = 0;
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(([entry]) => {
    builderVisible = entry.isIntersecting;
    get('mobile-total').hidden = !builderVisible || currentCount === 0;
  }, { rootMargin: '0px 0px -195px 0px' });
  observer.observe(get('builder'));
} else {
  builderVisible = true;
}

function render(announcement = '') {
  const { count, total } = bouquetData();
  currentCount = count;
  for (const { id, name } of flowers) {
    const control = controls.get(id);
    const quantity = quantities[id];
    control.count.textContent = quantity;
    control.count.parentElement.setAttribute('aria-label', name + ', количество: ' + quantity);
    control.minus.setAttribute('aria-disabled', quantity === 0);
    control.plus.setAttribute('aria-disabled', quantity === maxQuantity);
    showcaseStemButtons.get(id).disabled = quantity === maxQuantity;
    control.item.classList.toggle('chosen', quantity > 0);
  }
  const active = currentPreset();
  for (const [id, button] of presetButtons) button.setAttribute('aria-pressed', active?.id === id);
  for (const [id, input] of wrappingInputs) input.checked = wrapping.id === id;
  get('clear').hidden = count === 0;
  get('stem-count').textContent = count + ' ' + (stemWords[plural.select(count)] || 'стебля');
  get('total').textContent = money(total);
  get('mobile-sum').textContent = money(total);
  get('mobile-total').hidden = !builderVisible || count === 0;
  for (const button of orderButtons) button.disabled = count === 0;
  if (announcement) get('announcement').textContent = announcement + 'Предварительно ' + money(total) + '.';
  drawBouquet(count);

  try {
    localStorage.setItem(storageKey, JSON.stringify({ quantities, wrapping: wrapping.id }));
  } catch {
    // The constructor also works when browser storage is disabled.
  }
}

get('clear').addEventListener('click', () => {
  for (const { id } of flowers) quantities[id] = 0;
  wrapping = wraps[0];
  render('Букет очищен. ');
  controls.get(flowers[0].id).plus.focus();
});

function formatOrder() {
  const { selected, total } = bouquetData();
  const note = get('note').value.trim();
  const lines = [
    'Здравствуйте! Хочу согласовать букет:',
    ...selected.map(({ id, name }) => '• ' + name + ' — ' + quantities[id] + ' шт.'),
    'Упаковка: ' + wrapping.name + '.',
    'Предварительно по демо-ценам: ' + money(total) + '.'
  ];
  if (note) lines.push('Пожелание: ' + note);
  get('order-text').value = lines.join('\n');
}

for (const button of orderButtons) {
  button.addEventListener('click', () => {
    if (!currentCount) return;
    formatOrder();
    get('copy-status').textContent = '';
    order.showModal();
  });
}
get('note').addEventListener('input', () => {
  get('copy-status').textContent = '';
  formatOrder();
});
get('copy').addEventListener('click', async () => {
  const message = get('order-text');
  try {
    await navigator.clipboard.writeText(message.value);
    get('copy-status').textContent = 'Заявка скопирована.';
  } catch {
    message.focus();
    message.select();
    get('copy-status').textContent = 'Текст выделен. Скопируйте его вручную.';
  }
});

function showIntro() {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || location.hash) return;
  try {
    if (sessionStorage.getItem('lepetok-intro')) return;
    sessionStorage.setItem('lepetok-intro', 'seen');
  } catch {
    // Keep the intro usable with browser storage turned off.
  }
  const intro = get('intro');
  const page = get('page');
  const skip = get('skip-intro');
  const skipLink = document.querySelector('.skip');
  intro.hidden = false;
  page.inert = true;
  skipLink.inert = true;
  document.body.classList.add('intro-active');

  const timer = setTimeout(close, 2500);
  intro.addEventListener('animationend', event => {
    if (event.target === intro) close();
  });
  skip.addEventListener('click', close);
  document.addEventListener('keydown', escape);
  reducedMotion.addEventListener('change', close, { once: true });

  function escape(event) {
    if (event.key === 'Escape') close();
  }

  function close() {
    if (intro.hidden) return;
    const skipHadFocus = document.activeElement === skip;
    clearTimeout(timer);
    document.removeEventListener('keydown', escape);
    reducedMotion.removeEventListener('change', close);
    intro.hidden = true;
    page.inert = false;
    skipLink.inert = false;
    document.body.classList.remove('intro-active');
    document.dispatchEvent(new Event('lepetok:intro-end'));
    if (skipHadFocus) get('hero-title').focus({ preventScroll: true });
  }
}

if ('IntersectionObserver' in window) {
  const preload = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    previewAvailable = true;
    preload.disconnect();
    loadViewer();
  }, { rootMargin: '180px' });
  preload.observe(get('bouquet-preview'));
} else {
  previewAvailable = true;
}

render();
bouquetImagesReady.then(() => {
  artReady = true;
  drawBouquet(currentCount);
});
showIntro();


function setupHeroMotion() {
  const hero = document.querySelector('.hero');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = !('IntersectionObserver' in window);
  const sync = () => hero.classList.toggle('is-moving',
    visible && !document.hidden && !reducedMotion.matches &&
    !document.body.classList.contains('intro-active'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .01;
      sync();
    }, { threshold: [0, .01] });
    observer.observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('lepetok:intro-end', sync);
  reducedMotion.addEventListener('change', sync);
  sync();
}
setupHeroMotion();
