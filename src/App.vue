<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { db } from './db/client'
import { useRouter, useRoute } from 'vue-router'

// ==========================================
// 1. IMPORT GLOBAL COMPONENTS
// ==========================================
import NavigationBar from './components/layout/NavigationBar.vue'
import WebHeader from './components/layout/WebHeader.vue'
import LoadingSpinner from './components/layout/LoadingSpinner.vue'
import { Analytics } from '@vercel/analytics/vue'

// i18n
import { translations } from './translations'

// ==========================================
// 2. STATE MANAGEMENT & PERSISTENCE
// ==========================================
const STORAGE_KEY_PREFIX = 'alfie_app_'

const getStored = (key, defaultValue) => {
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + key)
  if (stored === null) return defaultValue
  try {
    return JSON.parse(stored)
  } catch (e) {
    return stored
  }
}

const setStored = (key, value) => {
  localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value))
}

const router = useRouter()
const route = useRoute()

const currentLanguage = ref(getStored('language', 'en')) 
const theme = ref(getStored('theme', 'light'))

const isGlobalLoading = ref(false)
const loadingMessage = ref('')

const t = (key) => {
  const lang = currentLanguage.value || 'en'
  return translations[lang][key] || key
}
const favoriteItems = ref(getStored('favorites', []))
const userData = ref(getStored('user_data', {
  id: 'guest',
  username: 'johnabram',
  firstName: 'John',
  lastName: 'Abram',
  email: 'johnabram@gmail.com',
  whatsapp: '+255700000000',
  avatar: 'https://i.pravatar.cc/150?u=johnabram',
  userType: 'buyer',
  needs: '',
  gives: '',
  theme: 'light'
}))

const categories = ref([])
const trendingProducts = ref([])
const trendingSellers = ref([])
const allProducts = ref([])
const exploreItems = ref([])
const productReviews = ref([])
const searchResults = ref([])
const userNotifications = ref([])
const userProductCount = ref(0)

const selectedSeller = ref(getStored('selected_seller', null))
const selectedCategory = ref(getStored('selected_category', 'Explore more'))
const selectedProduct = ref(getStored('selected_product', null))

const filteredExploreItems = computed(() => {
  if (selectedCategory.value === 'Explore more' || selectedCategory.value === 'Trending Trends') {
    return allProducts.value
  }
  return allProducts.value.filter(p => {
    const cat = categories.value.find(c => c.id === p.category_id)
    return cat && cat.name === selectedCategory.value
  })
})

const fetchInitialData = async () => {
  try {
    if (userData.value.id !== 'guest') {
      const userRes = await db.execute({
        sql: "SELECT * FROM users WHERE id = ?",
        args: [userData.value.id]
      })
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0]
        userData.value = {
          id: u.id,
          username: u.username,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          whatsapp: u.whatsapp,
          avatar: u.avatar,
          userType: u.user_type,
          needs: u.needs || '',
          gives: u.gives || '',
          theme: u.theme || 'light'
        }
        theme.value = u.theme || 'light'
      }
    }

    const notifRes = await db.execute({
      sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      args: [userData.value.id]
    })
    userNotifications.value = notifRes.rows.map(n => ({ id: n.id, name: n.message, time: 'Just now', unread: !!n.is_unread }))

    const favRes = await db.execute({
      sql: "SELECT product_id FROM favorites WHERE user_id = ?",
      args: [userData.value.id]
    })
    const favoriteIds = favRes.rows.map(f => f.product_id)

    const statsRes = await db.execute({
      sql: "SELECT COUNT(*) as total FROM products WHERE owner_id = ?",
      args: [userData.value.id]
    })
    userProductCount.value = statsRes.rows[0].total

    const cats = await db.execute("SELECT * FROM categories")
    categories.value = cats.rows

    const products = await db.execute("SELECT * FROM products ORDER BY likes_count DESC")
    allProducts.value = products.rows.map(p => ({ ...p, liked: favoriteIds.includes(p.id) }))
    favoriteItems.value = allProducts.value.filter(p => p.liked)
    
    trendingProducts.value = allProducts.value.slice(0, 4)
    exploreItems.value = [...allProducts.value].sort(() => 0.5 - Math.random()).slice(0, 6)

    const sellers = await db.execute("SELECT * FROM sellers ORDER BY rating DESC, likes_count DESC, clients_count DESC")
    trendingSellers.value = sellers.rows.map(s => ({ 
      ...s, 
      isVerified: !!s.is_verified,
      likesCount: s.likes_count,
      clientsCount: s.clients_count
    }))
  } catch (e) {
    console.error("Database fetch error:", e)
  }
}

onMounted(() => {
  fetchInitialData()

  // Auto-redirect if already logged in
  if (userData.value.id !== 'guest') {
    if (['splash', 'login', 'signup'].includes(route.name)) {
      router.push({ name: 'home' })
    }
  }
})

// Auto-save watchers
watch(currentLanguage, (val) => setStored('language', val))
watch(theme, async (val) => {
  setStored('theme', val)
  document.body.classList.remove('light-theme', 'dark-theme')
  document.body.classList.add(val + '-theme')
  
  if (userData.value.id !== 'guest') {
    try {
      await db.execute({
        sql: "UPDATE users SET theme = ? WHERE id = ?",
        args: [val, userData.value.id]
      })
    } catch (e) {
      console.error("Theme sync error:", e)
    }
  }
}, { immediate: true })
watch(favoriteItems, (val) => setStored('favorites', val), { deep: true })
watch(userData, (val) => setStored('user_data', val), { deep: true })
watch(selectedSeller, (val) => setStored('selected_seller', val), { deep: true })
watch(selectedProduct, (val) => setStored('selected_product', val), { deep: true })
watch(selectedCategory, (val) => setStored('selected_category', val))

const navigateTo = async (screenName, extraState = {}) => {
  if (extraState.selectedProduct) {
    selectedProduct.value = extraState.selectedProduct
    try {
      const res = await db.execute({
        sql: `
          SELECT r.*, u.first_name, u.last_name, u.avatar 
          FROM reviews r 
          JOIN users u ON r.user_id = u.id 
          WHERE r.product_id = ?
          ORDER BY r.created_at DESC
        `,
        args: [extraState.selectedProduct.id]
      })
      productReviews.value = res.rows.map(r => ({
        id: r.id,
        author: `${r.first_name} ${r.last_name}`,
        rating: r.rating,
        text: r.text,
        time: 'Recently',
        avatar: r.avatar
      }))
    } catch (e) {
      console.error("Fetch reviews error:", e)
      productReviews.value = []
    }
  }
  if (extraState.selectedSeller) selectedSeller.value = extraState.selectedSeller
  if (extraState.selectedCategory) selectedCategory.value = extraState.selectedCategory

  router.push({ name: screenName })
}

const toggleLike = async (product) => {
  product.liked = !product.liked
  const updateProduct = (list) => {
    const p = list.find(item => item.id === product.id)
    if (p) p.liked = product.liked
  }
  updateProduct(allProducts.value)
  updateProduct(trendingProducts.value)

  try {
    if (product.liked) {
      if (!favoriteItems.value.find(item => item.id === product.id)) {
        favoriteItems.value.push({ ...product })
        await db.execute({
          sql: "INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)",
          args: [userData.value.id, product.id]
        })
      }
    } else {
      favoriteItems.value = favoriteItems.value.filter(item => item.id !== product.id)
      await db.execute({
        sql: "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
        args: [userData.value.id, product.id]
      })
    }
  } catch (e) {
    console.error("Toggle like error:", e)
  }
}

const currentScreen = computed(() => route.name || 'splash')

const showNavBar = computed(() => {
  return ['home', 'favorites', 'profile', 'category-list'].includes(currentScreen.value)
})

// ==========================================
// 3. ACTION HANDLERS
// ==========================================
const handleLogin = async (data) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Authenticating with the Tribe...';
  try {
    const res = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [data.email]
    });
    if (res.rows.length > 0) {
      const u = res.rows[0];
      userData.value = {
        id: u.id,
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        whatsapp: u.whatsapp,
        avatar: u.avatar,
        userType: u.user_type,
        needs: u.needs || '',
        gives: u.gives || '',
        theme: u.theme || 'light'
      };
      theme.value = u.theme || 'light';
      await fetchInitialData();
      navigateTo('home');
    } else {
      window.alert('User not found. Please sign up.');
    }
  } catch (e) {
    console.error('Login error:', e);
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleSignUp = async (data) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Joining the heritage...';
  const newId = 'u' + Date.now();
  const signupData = { ...data, id: newId };
  try {
    await db.execute({
      sql: 'INSERT INTO users (id, username, first_name, last_name, email, whatsapp, avatar, user_type, needs, gives, theme) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [signupData.id, signupData.username, signupData.firstName, signupData.lastName, signupData.email, signupData.whatsapp, signupData.avatar, signupData.userType, signupData.needs, signupData.gives, 'light']
    });
    userData.value = signupData;
    await fetchInitialData();
    navigateTo('home');
  } catch (e) {
    console.error('Signup DB error:', e);
    window.alert('Error signing up. Email or username might be taken.');
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleUploadWork = async (data) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Weaving your work into the heritage...';
  try {
    await db.execute({
      sql: 'INSERT INTO products (name, price, description, image, category_id, owner_id, status, variants_json, gallery_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [data.name, data.price, data.description, data.image, data.category_id, userData.value.id, data.status, data.variants_json, data.gallery_json]
    });
    window.alert('Work published successfully!');
    await fetchInitialData();
    navigateTo('profile');
  } catch (e) {
    console.error('Upload error:', e);
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleFeedback = async (msg) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Sending your voice to the Tribe...';
  try {
    await db.execute({
      sql: 'INSERT INTO feedback (user_id, message) VALUES (?, ?)',
      args: [userData.value.id, msg]
    });
    window.alert('Heritage feedback received! Thank you.');
    navigateTo('settings');
  } catch (e) {
    console.error('Feedback error:', e);
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleProductDelete = async (productId) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Removing heritage item...';
  try {
    await db.execute({
      sql: "DELETE FROM favorites WHERE product_id = ?",
      args: [productId]
    })
    await db.execute({
      sql: "DELETE FROM products WHERE id = ? AND owner_id = ?",
      args: [productId, userData.value.id]
    })
    window.alert('Item removed successfully.')
    await fetchInitialData()
    navigateTo('home')
  } catch (e) {
    console.error('Delete product error:', e)
    window.alert('Error deleting item. Please try again.')
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleUpdateRole = async (newRole) => {
  if (userData.value.id === 'guest') return
  isGlobalLoading.value = true
  loadingMessage.value = 'Switching roles...'
  try {
    await db.execute({
      sql: 'UPDATE users SET user_type = ? WHERE id = ?',
      args: [newRole, userData.value.id]
    })
    userData.value.userType = newRole
    window.alert(`Role successfully switched to ${newRole === 'supplier' ? 'Tailor' : 'Buyer'}!`)
  } catch (e) {
    console.error('Role update error:', e)
    window.alert('Error switching roles. Please try again.')
  } finally {
    isGlobalLoading.value = false
  }
}

const handleLogout = () => {
  userData.value = { 
    id: 'guest', username: 'johnabram', firstName: 'John', lastName: 'Abram', email: 'johnabram@gmail.com', whatsapp: '+255700000000', avatar: 'https://i.pravatar.cc/150?u=johnabram', userType: 'buyer', needs: '', gives: '', theme: 'light' 
  };
  setStored('user_data', userData.value);
  setStored('favorites', []);
  navigateTo('login');
}

const handleSearch = async (query) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Searching the heritage...';
  try {
    const q = `%${query.toLowerCase()}%`;
    const res = await db.execute({
      sql: `
        SELECT p.*, u.username as owner_username, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR u.username LIKE ?
        ORDER BY p.likes_count DESC
      `,
      args: [q, q, q, q]
    });
    let favoriteIds = [];
    if (userData.value.id !== 'guest') {
      const favRes = await db.execute({
        sql: "SELECT product_id FROM favorites WHERE user_id = ?",
        args: [userData.value.id]
      });
      favoriteIds = favRes.rows.map(f => f.product_id);
    }
    searchResults.value = res.rows.map(p => ({
      ...p,
      liked: favoriteIds.includes(p.id)
    }));
    navigateTo('search-results');
  } catch (e) {
    console.error('Search error:', e);
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleUpdateProfile = async (val) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Updating your heritage profile...';
  try {
    await db.execute({
      sql: `
        UPDATE users 
        SET username = ?, first_name = ?, last_name = ?, whatsapp = ?, avatar = ?, user_type = ?, needs = ?, gives = ?
        WHERE id = ?
      `,
      args: [val.username, val.firstName, val.lastName, val.whatsapp, val.avatar, val.userType, val.needs, val.gives, val.id]
    });
    userData.value = { ...val };
    window.alert('Profile updated successfully!');
    await fetchInitialData();
    navigateTo('profile');
  } catch (e) {
    console.error('Update profile error:', e);
    window.alert('Failed to update profile. Username might be taken.');
  } finally {
    isGlobalLoading.value = false;
  }
}

// Router Event Handlers Mapping
const handleGoBack = () => router.back()
</script>

<template>
  <Analytics />
  <div class="app-wrapper">
    <WebHeader 
      v-if="showNavBar" 
      :active-tab="currentScreen"
      :theme="theme"
      :t="t"
      @navigate="navigateTo"
      @go-notifications="navigateTo('notifications')"
      @toggle-theme="() => theme = (theme === 'light' ? 'dark' : 'light')"
    />

    <router-view v-slot="{ Component }">
      <keep-alive include="Home">
        <component :is="Component" 
          :language="currentLanguage"
          :t="t"
          :theme="theme"
          :user-data="userData"
          :categories="categories"
          :trending-products="trendingProducts"
          :trending-sellers="trendingSellers"
          :explore-items="filteredExploreItems"
          :favorite-items="favoriteItems"
          :product-count="userProductCount"
          :product-id="selectedProduct?.id"
          :current-user-id="userData.id"
          :category="selectedCategory"
          :seller="selectedSeller"
          :results="searchResults"
          :notifications="userNotifications"
          
          @select-language="(lang) => currentLanguage = lang"
          @loaded="userData.id !== 'guest' ? navigateTo('home') : navigateTo('login')"
          @go-signup="navigateTo('signup')"
          @go-login="navigateTo('login')"
          @go-forgot="navigateTo('forgot-password')"
          @go-back="handleGoBack"
          @login="handleLogin"
          @signup="handleSignUp"
          @submit="(msg) => {
             if(currentScreen === 'forgot-password') navigateTo('verify-code');
             else if(currentScreen === 'verify-code') navigateTo('reset-password');
             else if(currentScreen === 'reset-password') navigateTo('login');
             else if(currentScreen === 'feedback') handleFeedback(msg);
          }"
          @go-details="(p) => navigateTo('product-details', { selectedProduct: p })"
          @go-notifications="navigateTo('notifications')"
          @go-search="navigateTo('search')"
          @search="handleSearch"
          @go-explore="(name) => navigateTo('explore', { selectedCategory: name || 'Explore more' })"
          @go-categories="navigateTo('category-list')"
          @go-trending="() => navigateTo('explore', { selectedCategory: 'Trending Trends' })"
          @go-tailor="(seller) => navigateTo('tailor-details', { selectedSeller: seller })"
          @toggle-like="toggleLike"
          @go-edit-profile="navigateTo('edit-profile')"
          @go-settings="navigateTo('settings')"
          @go-console="navigateTo('tailor-console')"
          @go-orders="navigateTo('orders')"
          @go-upload="navigateTo('upload-work')"
          @logout="handleLogout"
          @go-reviews="navigateTo('reviews')"
          @go-feedback="navigateTo('feedback')"
          @toggle-favorite="(p) => toggleLike(p)"
          @delete="handleProductDelete"
          @select-category="(name) => navigateTo('explore', { selectedCategory: name })"
          @go-write-review="navigateTo('write-review')"
          @update:user-data="handleUpdateProfile"
          @update:theme="(val) => theme = val"
          @update:language="(val) => currentLanguage = val"
          @update:role="handleUpdateRole"
          @go-help="navigateTo('help')"
          @go-privacy="navigateTo('privacy')"
          @go-terms="navigateTo('terms')"
          @go-about="navigateTo('about')"
          @upload="handleUploadWork"
        />
      </keep-alive>
    </router-view>

    <NavigationBar 
      v-if="showNavBar" 
      :active-tab="currentScreen"
      :t="t"
      @navigate="navigateTo"
    />

    <LoadingSpinner v-if="isGlobalLoading" :message="loadingMessage" />
  </div>
</template>

<style>
.app-wrapper {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  min-height: 100vh;
  background-color: transparent;
  box-shadow: var(--shadow-md);
  overflow-x: hidden;
}
</style>
