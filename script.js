const API_URL = 'https://dummyjson.com';
let cart = JSON.parse(localStorage.getItem('shop_cart')) || [];
let allProducts = [];

// --- 1. Reusable Header with Logic to Hide Links on Login Page ---
function injectHeader() {
    const wrapper = document.getElementById('header-wrapper');
    if (!wrapper) return;

    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName') || 'User';
    
    // Check if current page is Login
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    const isProductPage = window.location.pathname.includes('products.html');
    const count = cart.reduce((s, i) => s + i.qty, 0);

    // If on Login page, show ONLY the logo
    if (isLoginPage) {
        wrapper.innerHTML = `
            <nav>
                <div class="logo">MiniShop</div>
            </nav>`;
        return;
    }

    // On all other pages, show the full Navigation
    wrapper.innerHTML = `
        <nav>
            <div class="logo" onclick="location.href='products.html'">MiniShop</div>
            <div class="nav-links">
                <span>Hello, <b>${name}</b></span>
                <a href="cart.html">Cart (<span id="cart-count">${count}</span>)</a>
                <button class="btn-danger" onclick="logout()" style="padding:5px 10px; font-size:12px;">Logout</button>
            </div>
        </nav>
        ${isProductPage ? `
            <div class="toolbar">
                <input type="text" id="search-bar" placeholder="Search products..." oninput="handleSearch(this.value)">
                <select id="sort-price" onchange="handleSort(this.value)">
                    <option value="">Sort By Price</option>
                    <option value="low">Low to High</option>
                    <option value="high">High to Low</option>
                </select>
            </div>
        ` : ''}`;
}

// --- 2. Auth Logic ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const user = e.target.username.value;
        const pass = e.target.password.value;
        const btn = document.getElementById('login-btn');
        const errorMsg = document.getElementById('auth-error');

        btn.disabled = true;
        btn.innerText = "Verifying...";
        if (errorMsg) errorMsg.innerText = "";

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('userName', user);
                window.location.href = 'products.html';
            } else {
                if (errorMsg) errorMsg.innerText = "Invalid username or password!";
                btn.disabled = false;
                btn.innerText = "Login";
            }
        } catch (err) {
            if (errorMsg) errorMsg.innerText = "Server error. Try again later.";
            btn.disabled = false;
            btn.innerText = "Login";
        }
    };
}

// --- 3. Product Logic ---
async function initProducts() {
    const content = document.getElementById('app-content');
    if (!content) return;
    
    content.innerHTML = '<div class="loader"></div><div id="product-list" class="product-grid"></div>';
    
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        allProducts = data.products;
        renderGrid(allProducts);
    } catch (err) {
        content.innerHTML = "<h3>Error loading products.</h3>";
    }
}

function renderGrid(list) {
    const grid = document.getElementById('product-list');
    if (!grid) return;
    document.querySelector('.loader')?.remove();
    
    if (list.length === 0) {
        grid.innerHTML = "<h3>No products found.</h3>";
        return;
    }

    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.thumbnail}" onclick="location.href='details.html?id=${p.id}'" style="cursor:pointer" alt="${p.title}">
            <h4>${p.title}</h4>
            <p><b>$${p.price}</b></p>
            <button onclick="addToCart(${p.id}, '${p.title.replace(/'/g, "\\'")}', ${p.price})">Add to Cart</button>
        </div>
    `).join('');
}

function handleSearch(val) {
    const filtered = allProducts.filter(p => p.title.toLowerCase().includes(val.toLowerCase()));
    renderGrid(filtered);
}

function handleSort(order) {
    const sorted = [...allProducts].sort((a, b) => order === 'low' ? a.price - b.price : b.price - a.price);
    renderGrid(sorted);
}

// --- 4. Details Logic ---
async function initDetails() {
    const id = new URLSearchParams(window.location.search).get('id');
    const content = document.getElementById('app-content');
    if (!content) return;

    // 1. Check if ID exists and is a valid number
    if (!id || isNaN(id)) {
        displayErrorAndRedirect(content, "Invalid Product ID provided.");
        return;
    }

    content.innerHTML = '<div class="loader"></div>';

    try {
        const res = await fetch(`${API_URL}/products/${id}`);
        
        // 2. Check if the API actually found the product (handle 404)
        if (!res.ok) {
            throw new Error("Product not found");
        }

        const p = await res.json();
        
        // Render the product 
        content.innerHTML = `
            <div class="detail-card" style="display:flex; gap:40px; background:white; padding:40px; border-radius:8px; margin-top:20px;">
                <img src="${p.thumbnail}" style="width:400px; object-fit:contain;">
                <div>
                    <h2>${p.title}</h2>
                    <p style="color:#666;">${p.description}</p>
                    <h3 style="color:#28a745;">$${p.price}</h3>
                    <button class="btn-success" onclick="addToCart(${p.id}, '${p.title}', ${p.price})">Add to Cart</button>
                    <br><br>
                    <a href="products.html" style="text-decoration:none; color:#007185;">← Back to Shop</a>
                </div>
            </div>`;
            
    } catch (err) {
        displayErrorAndRedirect(content, "Oops! The product you are looking for does not exist.");
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const usernameGroup = document.getElementById('username-group'); // The container div

    // Reset states first
    usernameGroup.classList.remove('show-error');

    if (username.trim() === "") {
        // Only show if actually empty
        usernameGroup.classList.add('show-error');
    } else {
        // Proceed with login...
    }
}

// Helper function to show a centered error and redirect
function displayErrorAndRedirect(container, message) {
    container.innerHTML = `
        <div style="text-align:center; padding:100px; background:white; border-radius:8px; margin-top:20px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
            <h1 style="color:var(--error); font-size:50px; margin:0;">⚠</h1>
            <h2 style="color:#333;">${message}</h2>
            <p style="color:#666;">Redirecting you back to the shop in 3 seconds...</p>
            <button onclick="location.href='products.html'">Go Back Now</button>
        </div>
    `;

    // Auto-redirect after 3 seconds
    setTimeout(() => {
        window.location.href = 'products.html';
    }, 3000);
}

// --- 5. Cart & Checkout ---
function addToCart(id, title, price) {
    const item = cart.find(i => i.id === id);
    if (item) item.qty++;
    else cart.push({ id, title, price, qty: 1 });
    saveCart();
    showToast(`✔ Added ${title} to cart`);
}

function saveCart() {
    localStorage.setItem('shop_cart', JSON.stringify(cart));
    const count = document.getElementById('cart-count');
    if (count) count.innerText = cart.reduce((s, i) => s + i.qty, 0);
}

function initCart() {
    const content = document.getElementById('app-content');
    if (!content) return;
    
    let total = 0;
    if (cart.length === 0) {
        content.innerHTML = '<div style="text-align:center; padding:50px;"><h2>Your cart is empty</h2><button onclick="location.href=\'products.html\'">Start Shopping</button></div>';
    } else {
        const itemsHTML = cart.map(item => {
            total += item.price * item.qty;
            return `
                <div class="cart-item" style="background:white; padding:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-radius:5px;">
                    <div><b>${item.title}</b><br>$${item.price} each</div>
                    <div class="qty-controls">
                        <button onclick="changeQty(${item.id}, -1)">-</button>
                        <span style="margin:0 15px; font-weight:bold;">${item.qty}</span>
                        <button onclick="changeQty(${item.id}, 1)">+</button>
                    </div>
                </div>`;
        }).join('');
        
        content.innerHTML = `
            <h2>Your Shopping Cart</h2>
            ${itemsHTML}
            <div style="margin-top:20px; text-align:right; background:white; padding:20px; border-radius:5px;">
                <h3>Total Amount: $${total.toFixed(2)}</h3>
                <button class="btn-success" onclick="location.href='checkout.html'" style="padding:15px 30px;">Proceed to Checkout</button>
            </div>`;
    }
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCart();
        initCart();
    }
}

function initCheckout() {
    const content = document.getElementById('app-content');
    if (!content) return;
    
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    content.innerHTML = `
        <div class="auth-container" style="max-width:450px; margin: 40px auto;">
            <h2>Secure Checkout</h2>
            <p>Total Amount: <b>$${total.toFixed(2)}</b></p>
            <form id="payment-form">
                <input type="text" placeholder="Full Name" required>
                <input type="text" placeholder="Shipping Address" required>
                
                <div style="display:flex; gap:10px; align-items: flex-start;">
                    <div class="input-group" id="expiry-group" style="flex: 2;">
                        <input type="month" id="expiry-input" required title="Expiry Date">
                        <span class="error-message" id="expiry-error">Expiry is required</span>
                    </div>
                    
                    <div style="flex: 1;">
                        <input type="password" placeholder="CVV" pattern="\\d{3}" maxlength="3" required>
                    </div>
                </div>
                
                <button type="submit" class="btn-success" style="width:100%; margin-top:10px;">Pay Now</button>
            </form>
        </div>`;
    
    const form = document.getElementById('payment-form');
    const expiryInput = document.getElementById('expiry-input');
    const expiryGroup = document.getElementById('expiry-group');

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();

            // Check if expiry is filled
            if (!expiryInput.value) {
                expiryGroup.classList.add('show-error');
                return; // Stop the payment if empty
            }

            // If filled, proceed with success logic
            const container = document.querySelector('.auth-container');
            cart = [];
            saveCart();
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center; padding: 20px;">
                        <h2 style="color:#28a745; font-size:50px; margin:0;">✔</h2>
                        <h2 style="color:#28a745;">Payment Successful</h2>
                        <p>Your order has been placed. Redirecting to shop...</p>
                    </div>`;
            }
            setTimeout(() => location.href = 'products.html', 3000);
        };

        // Remove error message once user starts picking a date
        expiryInput.oninput = () => {
            if (expiryInput.value) {
                expiryGroup.classList.remove('show-error');
            }
        };
    }
}

// --- Helpers ---
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2500);
}

function logout() {
    localStorage.clear();
    location.href = 'index.html';
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    if (!token && !isLoginPage) {
        location.href = 'index.html';
    }
}

// --- Global Initialization ---
window.onload = () => {
    checkAuth();
    injectHeader();
    const path = window.location.pathname;

    if (path.includes('products.html')) initProducts();
    else if (path.includes('details.html')) initDetails();
    else if (path.includes('cart.html')) initCart();
    else if (path.includes('checkout.html')) initCheckout();
};