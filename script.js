
const API_URL = 'https://dummyjson.com';
let cart = JSON.parse(localStorage.getItem('shop_cart')) || [];
let searchTimeout;

// --- 1. HEADER & NAVIGATION LOGIC ---
async function injectHeader() {
    const wrapper = document.getElementById('header-wrapper');
    if (!wrapper) return;
    try {
        const response = await fetch('header.html');
        wrapper.innerHTML = await response.text();
        setupHeaderInteractions();
    } catch (err) {
        console.error("Header failed to load:", err);
    }
}

function setupHeaderInteractions() {
    const token = localStorage.getItem('token');
    const isLogin = window.location.pathname.includes('index.html') || window.location.pathname === '/';
    
    const logo = document.getElementById('nav-logo');
    if (logo) {
        logo.onclick = () => location.href = token ? 'products.html' : 'index.html';
    }

    if (isLogin || !token) return;

    const userNameDisplay = document.getElementById('user-display-name');
    if (userNameDisplay) userNameDisplay.innerText = localStorage.getItem('userName');
    
    updateCartBadge();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.clear();
            location.href = 'index.html';
        };
    }

    const toolbar = document.getElementById('search-toolbar');
    if (toolbar && window.location.pathname.includes('products.html')) {
        toolbar.style.display = 'flex';
        document.getElementById('search-bar').oninput = (e) => debounceSearch(e.target.value);
        document.getElementById('sort-price').onchange = () => handleApiSortAndSearch();
    }
}

// --- 2. AUTHENTICATION (index.html) ---
function initLogin() {
    const content = document.getElementById('app-content');

    const form = document.getElementById('login-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        if (!validateField('username', 'Required') || !validateField('password', 'Required')) return;
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: e.target.username.value, password: e.target.password.value })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('userName', data.username);
                location.href = 'products.html';
            } else {
                document.getElementById('auth-error').innerText = "Invalid credentials!";
            }
        } catch (err) { document.getElementById('auth-error').innerText = "Server error."; }
    };
}

// --- 3. PRODUCTS (FETCH, SEARCH, SORT) ---
function debounceSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleApiSortAndSearch(), 500);
}

function handleApiSortAndSearch() {
    const query = document.getElementById('search-bar').value;
    const sortVal = document.getElementById('sort-price').value;
    let sortBy = '', order = '';
    if (sortVal === 'low') { sortBy = 'price'; order = 'asc'; }
    else if (sortVal === 'high') { sortBy = 'price'; order = 'desc'; }
    fetchProducts(query, sortBy, order);
}

async function fetchProducts(query = '', sortBy = '', order = '') {
    const content = document.getElementById('app-content');
    if (!content) return;
    content.innerHTML = '<div class="loader"></div>';
    try {
        let url = `${API_URL}/products`;
        if (query) url += `/search?q=${query}`;
        const separator = url.includes('?') ? '&' : '?';
        if (sortBy) url += `${separator}sortBy=${sortBy}&order=${order}`;
        const res = await fetch(url);
        const data = await res.json();
        renderProductGrid(data.products);
    } catch (err) { content.innerHTML = "<h3>Error fetching products.</h3>"; }
}

function renderProductGrid(products) {
    const content = document.getElementById('app-content');
    const template = document.getElementById('product-card-template');
    if (!content || !template) return;
    content.innerHTML = '';
    content.className = 'product-grid container';
    products.forEach(p => {
        const clone = template.content.cloneNode(true);
        clone.querySelector('.p-img').src = p.thumbnail;
        clone.querySelector('.p-img').onclick = () => location.href = `details.html?id=${p.id}`;
        clone.querySelector('.p-title').innerText = p.title;
        clone.querySelector('.p-price').innerText = `$${p.price}`;
        clone.querySelector('.p-add-btn').onclick = () => addToCart(p);
        content.appendChild(clone);
    });
}

// --- 4. DETAILS PAGE (Now Using Template) ---
async function initDetails() {
    const id = new URLSearchParams(window.location.search).get('id');
    const content = document.getElementById('details-container');
    const template = document.getElementById('details-template');
    if (!id || !content || !template) return;

    content.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${API_URL}/products/${id}`);
        const p = await res.json();
        
        content.innerHTML = ''; // Clear loader
        const clone = template.content.cloneNode(true);
        
        clone.querySelector('.d-img').src = p.thumbnail;
        clone.querySelector('.d-title').innerText = p.title;
        clone.querySelector('.d-desc').innerText = p.description;
        clone.querySelector('.d-price').innerText = `$${p.price}`;
        clone.querySelector('.d-add-btn').onclick = () => addToCart(p);
        
        content.appendChild(clone);
    } catch (err) { location.href = 'products.html'; }
}

// --- 5. CART LOGIC (ROW VIEW) ---
function addToCart(p) {
    const existing = cart.find(item => item.id === p.id);
    if (existing) { existing.qty++; } 
    else { cart.push({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail, qty: 1 }); }
    localStorage.setItem('shop_cart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`Added ${p.title} to cart`);
}

function initCart() {
    const content = document.getElementById('app-content');
    if (!content) return;

    // 1. Handle Empty State
    if (cart.length === 0) {
        const emptyTemp = document.getElementById('cart-empty-template');
        content.innerHTML = '';
        content.appendChild(emptyTemp.content.cloneNode(true));
        return;
    }

    // 2. Load Cart Layout
    const layoutTemp = document.getElementById('cart-layout-template');
    content.innerHTML = '';
    content.appendChild(layoutTemp.content.cloneNode(true));

    const listContainer = document.getElementById('cart-list');
    const footerContainer = document.getElementById('cart-footer');
    const itemTemp = document.getElementById('cart-card-template');
    let total = 0;

    // 3. Render Item Rows
    cart.forEach(item => {
        total += item.price * item.qty;
        const clone = itemTemp.content.cloneNode(true);
        
        clone.querySelector('.cart-item-name').innerText = item.title;
        clone.querySelector('.cart-item-price').innerText = `$${item.price}`;
        clone.querySelector('.item-qty').innerText = item.qty;
        
        clone.querySelector('.minus-btn').onclick = () => changeQty(item.id, -1);
        clone.querySelector('.plus-btn').onclick = () => changeQty(item.id, 1);
        
        listContainer.appendChild(clone);
    });

    // 4. Update Footer (Total)
    footerContainer.innerHTML = `
        <div class="cart-summary">
            <h3>Total Amount: $${total.toFixed(2)}</h3>
            <button class="btn-success" style="width:250px" onclick="location.href='checkout.html'">Proceed to Checkout</button>
        </div>`;
}
function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        localStorage.setItem('shop_cart', JSON.stringify(cart));
        initCart();
        updateCartBadge();
    }
}

// --- 6. CHECKOUT & REDIRECT ---
function initCheckout() {
    const form = document.getElementById('payment-form');
    if (!form) return;
    form.onsubmit = (e) => {
        e.preventDefault();
        if (validateField('fullname', 'Required') && validateField('address', 'Required') && validateField('expiry', 'Required') && validateField('cvv', 'Required')) {
            processSuccess();
        }
    };
}

function processSuccess() {
    const container = document.getElementById('app-content');
    const template = document.getElementById('success-template');
    cart = []; localStorage.removeItem('shop_cart');
    container.innerHTML = '';
    container.appendChild(template.content.cloneNode(true));
    runRedirectTimer(3, 'products.html');
}

function runRedirectTimer(seconds, targetUrl) {
    let timeLeft = seconds;
    const display = document.getElementById('countdown-number');
    const timer = setInterval(() => {
        timeLeft--;
        if (display) display.innerText = timeLeft;
        if (timeLeft <= 0) { clearInterval(timer); location.href = targetUrl; }
    }, 1000);
}

// --- HELPERS ---
function validateField(id, msg) {
    const el = document.getElementById(id);
    const parent = el.parentElement;
    parent.querySelectorAll('.error-label').forEach(e => e.remove());
    if (!el.value.trim()) {
        el.classList.add('error-border');
        const s = document.createElement('span'); s.className = 'error-label'; s.innerText = msg;
        el.after(s); return false;
    }
    el.classList.remove('error-border'); return true;
}

function updateCartBadge() {
    const el = document.getElementById('cart-count');
    if (el) el.innerText = cart.reduce((a, b) => a + b.qty, 0);
}

function showToast(m) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = m; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2000);
}

// --- ROUTER ---
window.onload = () => {
    injectHeader();
    const p = window.location.pathname;
    if (p.includes('index.html') || p === '/') initLogin();
    else if (p.includes('products.html')) fetchProducts();
    else if (p.includes('details.html')) initDetails();
    else if (p.includes('cart.html')) initCart();
    else if (p.includes('checkout.html')) initCheckout();
};