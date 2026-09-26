// Prototype de boutique statique (hors BigCartel).
// Lit shop/data/products.json (genere automatiquement par une GitHub Action
// a partir des fichiers dans shop/data/products/, eux-memes edites via
// l'interface Decap CMS sur shop/admin/).

async function vgFetchProducts() {
  const res = await fetch('/shop/data/products.json', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

function vgFirstImage(product) {
  if (product.images && product.images.length && product.images[0]) {
    return product.images[0];
  }
  return '';
}

function vgFormatPrice(price) {
  if (price == null || price === '') return 'Prix a definir';
  const n = Number(price);
  if (Number.isNaN(n)) return String(price);
  return n.toFixed(2).replace('.', ',') + ' EUR';
}

function vgRenderGrid(products, container) {
  container.innerHTML = '';

  if (!products.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Aucune piece publiee pour le moment.';
    container.appendChild(empty);
    return;
  }

  products.forEach(function (product) {
    const card = document.createElement('a');
    card.className = 'product-card';
    card.href = 'product.html?slug=' + encodeURIComponent(product.slug || '');

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = vgFirstImage(product);
    if (img) thumb.style.backgroundImage = "url('" + img + "')";

    const info = document.createElement('div');
    info.className = 'info';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = product.name || '(sans nom)';

    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = vgFormatPrice(product.price);

    info.appendChild(name);
    info.appendChild(price);

    if (product.in_stock === false) {
      const soldOut = document.createElement('div');
      soldOut.className = 'sold-out';
      soldOut.textContent = 'Vendu';
      info.appendChild(soldOut);
    }

    card.appendChild(thumb);
    card.appendChild(info);
    container.appendChild(card);
  });
}

function vgRenderDetail(product, container) {
  if (!product) {
    container.innerHTML = '<p class="empty-state">Piece introuvable. <a class="back-link" href="index.html">&larr; Retour</a></p>';
    return;
  }

  const gallery = document.createElement('div');
  gallery.className = 'gallery';
  (product.images || []).forEach(function (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = product.name || '';
    gallery.appendChild(img);
  });

  const info = document.createElement('div');
  info.className = 'info-col';

  const back = document.createElement('a');
  back.className = 'back-link';
  back.href = 'index.html';
  back.textContent = '← Retour aux pieces';

  const h1 = document.createElement('h1');
  h1.textContent = product.name || '(sans nom)';

  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = vgFormatPrice(product.price);

  const desc = document.createElement('div');
  desc.className = 'description';
  desc.textContent = product.description || '';

  info.appendChild(back);
  info.appendChild(h1);
  info.appendChild(price);
  info.appendChild(desc);

  if (product.in_stock === false) {
    const notice = document.createElement('div');
    notice.className = 'sold-out-notice';
    notice.textContent = 'Piece deja vendue';
    info.appendChild(notice);
  } else if (product.stripe_payment_link) {
    const buy = document.createElement('a');
    buy.className = 'buy-button';
    buy.href = product.stripe_payment_link;
    buy.textContent = 'Acheter';
    buy.target = '_blank';
    buy.rel = 'noopener';
    info.appendChild(buy);
  } else {
    const notice = document.createElement('div');
    notice.className = 'sold-out-notice';
    notice.textContent = 'Lien de paiement pas encore configure';
    info.appendChild(notice);
  }

  container.innerHTML = '';
  container.appendChild(gallery);
  container.appendChild(info);
}
