// Level 1 - Task 3: Vanilla JS frontend that talks to the REST API with fetch()
const API = '/api/products';

const $ = (sel) => document.querySelector(sel);
const form = $('#product-form');
const grid = $('#grid');
const tpl = $('#card-template');
const msg = $('#message');
const submitBtn = $('#submit-btn');
const cancelBtn = $('#cancel-btn');

// Generic request helper: parses JSON, throws on non-2xx with the API's error message.
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.details = body.details;
    throw err;
  }
  return body;
}

function flash(text, type = 'success') {
  msg.textContent = text;
  msg.className = `message ${type}`;
  msg.hidden = false;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => (msg.hidden = true), 3000);
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function render(products) {
  grid.replaceChildren();
  $('#count').textContent = `(${products.length})`;
  if (!products.length) {
    grid.innerHTML = '<p class="empty">No products found. Add one using the form.</p>';
    return;
  }
  for (const p of products) {
    const node = tpl.content.cloneNode(true);
    node.querySelector('.p-name').textContent = p.name;
    node.querySelector('.p-category').textContent = p.category;
    node.querySelector('.p-desc').textContent = p.description || 'No description.';
    node.querySelector('.p-price').textContent = money.format(p.price);
    const stock = node.querySelector('.p-stock');
    stock.textContent = p.stock > 0 ? `${p.stock} in stock` : 'Out of stock';
    stock.classList.toggle('low', p.stock < 5);
    node.querySelector('.edit').addEventListener('click', () => startEdit(p));
    node.querySelector('.delete').addEventListener('click', () => removeProduct(p));
    grid.appendChild(node);
  }
}

async function loadProducts() {
  grid.innerHTML = '<div class="skeleton"></div>'.repeat(3);
  const params = new URLSearchParams();
  if ($('#search').value.trim()) params.set('search', $('#search').value.trim());
  if ($('#sort').value) params.set('sort', $('#sort').value);
  try {
    const { data } = await request(`${API}?${params}`);
    render(data);
  } catch (err) {
    grid.innerHTML = '';
    flash(`Could not load products: ${err.message}`, 'error');
  }
}

function clearErrors() {
  form.querySelectorAll('.error').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
}

function showErrors(details = {}) {
  for (const [field, text] of Object.entries(details)) {
    const slot = form.querySelector(`.error[data-for="${field}"]`);
    if (slot) slot.textContent = text;
    form.elements[field]?.classList.add('invalid');
  }
}

function startEdit(p) {
  for (const key of ['id', 'name', 'price', 'stock', 'category', 'description']) form.elements[key].value = p[key] ?? '';
  $('#form-title').textContent = 'Edit product';
  submitBtn.textContent = 'Save changes';
  cancelBtn.hidden = false;
  form.elements.name.focus();
}

function resetForm() {
  form.reset();
  form.elements.id.value = '';
  clearErrors();
  $('#form-title').textContent = 'Add a product';
  submitBtn.textContent = 'Add product';
  cancelBtn.hidden = true;
}

async function removeProduct(p) {
  if (!confirm(`Delete "${p.name}"?`)) return;
  try {
    await request(`${API}/${p.id}`, { method: 'DELETE' });
    flash(`Deleted "${p.name}"`);
    if (form.elements.id.value === p.id) resetForm();
    loadProducts();
  } catch (err) {
    flash(err.message, 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const fd = Object.fromEntries(new FormData(form));
  const id = fd.id;
  delete fd.id;
  submitBtn.disabled = true;
  try {
    if (id) {
      await request(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(fd) });
      flash(`Updated "${fd.name}"`);
    } else {
      await request(API, { method: 'POST', body: JSON.stringify(fd) });
      flash(`Added "${fd.name}"`);
    }
    resetForm();
    loadProducts();
  } catch (err) {
    showErrors(err.details);
    flash(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

cancelBtn.addEventListener('click', resetForm);

let debounce;
$('#search').addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(loadProducts, 250);
});
$('#sort').addEventListener('change', loadProducts);

async function checkHealth() {
  const badge = $('#api-status');
  try {
    await request('/api/health');
    badge.textContent = 'API online';
    badge.className = 'badge ok';
  } catch {
    badge.textContent = 'API offline';
    badge.className = 'badge down';
  }
}

checkHealth();
loadProducts();
