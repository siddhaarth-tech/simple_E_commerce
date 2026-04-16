const API_URL = 'https://dummyjson.com';
let cart = JSON.parse(localStorage.getItem('shop_cart')) || [];

// --- 1. Authentication & Global UI ---
function checkAuth() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;

    // Redirect to login if not authenticated (except on index.html)
    if (!token && !path.endsWith('index.html') && path !== '/') {
        window.location.href = 'index.html';
    } else {
        displayUsername();
    }
}

function displayUsername() {
    const name = localStorage.getItem('userName');
    const displayEl = document.getElementById('user-display');
    if (name && displayEl) {
        displayEl.innerText = name;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- 2. Login Logic ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = e.target.username.value;
        const passwordInput = e.target.password.value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput,
                    password: passwordInput
                })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('userName', usernameInput);
                window.location.href = 'products.html';
            } else {
                document.getElementById('login-error').innerText = "Invalid username or password";
            }
        } catch (err) {
            console.error("Login Error:", err);
        }
    });
}

// --- 3. Product Listing Logic ---
async function fetchProducts() {
    const list = document.getElementById('product-list');
    if (!list) return;

    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        
        list.innerHTML = data.products.map(p => `
            <div class="product-card">
                <img src="${p.thumbnail}" onclick="goToDetails(${p.id})" style="cursor:pointer">
                <h4 onclick="goToDetails(${p.id})" style="cursor:pointer">${p.title}</h4>
                <p>$${p.price}</p>
                <button onclick="addToCart(${p.id}, '${p.title.replace(/'/g, "\\'")}', ${p.price})">Add to Cart</button>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = "<p>Error loading products.</p>";
    }
}

function goToDetails(id) {
    window.location.href = `details.html?id=${id}`;
}

// --- 4. Product Detail Logic ---
async function fetchProductDetails() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        container.innerHTML = "<p>Product not found.</p>";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/products/${productId}`);
        const p = await res.json();

        container.innerHTML = `
            <div class="detail-card">
                <div class="detail-img">
                    <img src="${p.images[0]}" alt="${p.title}">
                </div>
                <div class="detail-info">
                    <h2>${p.title}</h2>
                    <p class="category">Category: ${p.category}</p>
                    <p class="description">${p.description}</p>
                    <h3 class="price">$${p.price}</h3>
                    <button class="btn-success" onclick="addToCart(${p.id}, '${p.title.replace(/'/g, "\\'")}', ${p.price})">Add to Cart</button>
                    <p><a href="products.html">← Back to Products</a></p>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = "<p>Error loading product details.</p>";
    }
}

// --- 5. Cart Logic ---
function addToCart(id, title, price) {
    const existingItem = cart.find(i => i.id === id);
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ id, title, price, qty: 1 });
    }
    saveCart();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
    }
    saveCart();
    renderCart();
}

function saveCart() {
    localStorage.setItem('shop_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        el.innerText = count;
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    let total = 0;
    if (cart.length === 0) {
        container.innerHTML = "<h3>Your cart is empty.</h3>";
    } else {
        container.innerHTML = cart.map(item => {
            total += item.price * item.qty;
            return `
                <div class="cart-item">
                    <div>
                        <h4>${item.title}</h4>
                        <p>$${item.price} each</p>
                    </div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                    </div>
                    <p><b>$${(item.price * item.qty).toFixed(2)}</b></p>
                </div>
            `;
        }).join('');
    }
    const totalEl = document.getElementById('total-price');
    if (totalEl) totalEl.innerText = total.toFixed(2);
}

// --- 6. Checkout & Payment Logic ---
function goToCheckout() {
    if (cart.length === 0) return; 
    window.location.href = 'checkout.html';
}

function displayFinalTotal() {
    const el = document.getElementById('checkout-total');
    if (!el) return;
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    el.innerText = total.toFixed(2);
}

const paymentForm = document.getElementById('payment-form');
if (paymentForm) {
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Target the main content box on checkout page
        const container = document.querySelector('.auth-container');
        
        cart = []; 
        saveCart();

        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <h2 style="color: #28a745; font-size: 50px; margin: 0;">✔</h2>
                    <h2 style="color: #28a745; margin-top: 10px;">Payment Successful</h2>
                    <p>Your order has been placed.</p>
                    <p style="font-size: 0.9rem; color: #666;">Redirecting to shop...</p>
                </div>
            `;
        }

        setTimeout(() => {
            window.location.href = 'products.html';
        }, 3000);
    });
}

// --- 7. Initialization ---
window.onload = () => {
    checkAuth();
    updateCartCount();

    if (document.getElementById('product-list')) fetchProducts();
    if (document.getElementById('product-detail-container')) fetchProductDetails();
    if (document.getElementById('cart-items')) renderCart();
    if (document.getElementById('checkout-total')) displayFinalTotal();
};