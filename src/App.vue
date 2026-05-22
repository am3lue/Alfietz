<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { db } from './db/client'
import { useRouter, useRoute } from 'vue-router'
import bcrypt from 'bcryptjs'

// i18n
import { translations } from './translations'

// ==========================================
// CORE COMPONENTS
// ==========================================
import NavigationBar from './components/layout/NavigationBar.vue'
import WebHeader from './components/layout/WebHeader.vue'
import LoadingSpinner from './components/layout/LoadingSpinner.vue'
import Splash from './components/layout/Splash.vue'
import { SpeedInsights } from "@vercel/speed-insights/vue"

// ==========================================
// STATE MANAGEMENT
// ==========================================
const STORAGE_KEY_PREFIX = 'alfie_app_'

const getStored = (key, def) => {
  const val = localStorage.getItem(STORAGE_KEY_PREFIX + key)
  if (!val) return def
  try { return JSON.parse(val) } catch { return def }
}

const setStored = (key, val) => {
  localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val))
}

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
  theme: 'light',
  profileViews: 0
}))

const theme = ref(getStored('theme', 'light'))
const currentLanguage = ref(getStored('language', 'en'))
const isGlobalLoading = ref(false)
const loadingMessage = ref('Summoning Heritage...')
const toast = ref({ show: false, message: '', type: 'info' })
const isDeepLoading = ref(false)
const resetEmail = ref('')

const selectedSeller = ref(getStored('selected_seller', null))
const selectedCategory = ref(getStored('selected_category', 'Explore more'))
const selectedProduct = ref(getStored('selected_product', null))
const selectedReviewsTailorId = ref(null)
const isAppReview = ref(false)
const selectedEditProduct = ref(null)
const searchHistory = ref(getStored('search_history', []))

// ==========================================
// DATA STATE
// ==========================================
const allProducts = ref(getStored('all_products_cache', []))
const trendingProducts = ref(getStored('trending_products_cache', []))
const trendingSellers = ref(getStored('trending_sellers_cache', []))
const categories = ref(getStored('categories_cache', []))
const favoriteItems = ref(getStored('favorites', []))
const userNotifications = ref([])
const userProductCount = ref(0)
const searchResults = ref([])
const appReviews = ref([])

const t = (key) => {
  const lang = currentLanguage.value || 'en'
  return translations[lang][key] || key
}

const filteredExploreItems = computed(() => {
  const cat = route.params.category || selectedCategory.value
  if (!cat || cat === 'Explore more' || cat === 'Trending Trends') {
    return allProducts.value
  }
  return allProducts.value.filter(p => p.categoryName === cat)
})

// ==========================================
// ROUTING & NAVIGATION
// ==========================================
const router = useRouter()
const route = useRoute()

const navigateTo = (screenName, extraState = {}) => {
  if (!screenName && !extraState.selectedProduct && !extraState.selectedSeller && !extraState.selectedCategory) {
    console.warn('[NavigateTo] Warning: screenName is missing and no specific entity navigation was requested.');
    return;
  }
  console.log(`[NavigateTo] Target: ${screenName}`, extraState);

  if (screenName === 'reviews') {
    selectedReviewsTailorId.value = extraState.tailorId || null
    isAppReview.value = extraState.isApp || false
  }

  if (extraState.selectedProduct) {
    if (!extraState.selectedProduct.id) {
      console.error('NavigateTo ERROR: Product object is missing id property', extraState.selectedProduct);
      return;
    }
    selectedProduct.value = extraState.selectedProduct
    setStored('selected_product', extraState.selectedProduct)
    console.log(`[NavigateTo] Going to product: ${extraState.selectedProduct.id}`);
    router.push({ name: 'product-details', params: { id: extraState.selectedProduct.id } })
    return
  }
  if (extraState.selectedSeller) {
    // Increment profile views optimistically
    try {
      db.execute({
        sql: "UPDATE users SET profile_views = profile_views + 1 WHERE id = ?",
        args: [extraState.selectedSeller.id || extraState.selectedSeller.owner_id]
      });
    } catch (e) {
      console.error('Failed to increment profile views:', e);
    }

    selectedSeller.value = extraState.selectedSeller
    const username = extraState.selectedSeller.username;
    console.log(`[NavigateTo] Going to tailor: @${username}`);
    router.push({ name: 'tailor-details', params: { username } })
    return
  }
  if (extraState.selectedCategory) {
    selectedCategory.value = extraState.selectedCategory
    console.log(`[NavigateTo] Going to explore category: ${extraState.selectedCategory}`);
    router.push({ name: 'explore', params: { category: extraState.selectedCategory } })
    return
  }

  if (screenName) {
    router.push({ name: screenName })
  }
}

const handleGoBack = () => {
  router.back()
}

const handleResetPassword = async (newPassword) => {
  isGlobalLoading.value = true
  loadingMessage.value = 'Forging new password...'
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await db.execute({
      sql: "UPDATE users SET password = ? WHERE email = ?",
      args: [hashedPassword, resetEmail.value]
    })
    showToast('Password reset successfully!', 'success')
    navigateTo('login')
  } catch (e) {
    console.error('Reset password error:', e)
    showToast('Failed to reset password.', 'error')
  } finally {
    isGlobalLoading.value = false
  }
}

const handlePasswordReset = (email) => {
  resetEmail.value = email
  showToast('Verification code sent to ' + email, 'success')
  navigateTo('verify-code')
}

const handleVerifyCode = (code) => {
  if (code === '1234') { // Mock verification
    showToast('Code verified!', 'success')
    navigateTo('reset-password')
  } else {
    showToast('Invalid verification code.', 'error')
  }
}

// ==========================================
// DATA HANDLERS

// ==========================================
const handleLogin = async (data) => {
  console.log('[Auth] Login attempt for:', data.email);
  isGlobalLoading.value = true;
  loadingMessage.value = 'Authenticating with the Tribe...';
  try {
    const res = await db.runAction('login', { email: data.email });
    console.log('[Auth] DB Response rows:', res.rows?.length);

    if (res.rows.length > 0) {
      const u = res.rows[0];
      // Try bcrypt compare, fallback to plain text for legacy users (first migration)
      let passMatch = false;
      try {
        passMatch = await bcrypt.compare(data.password, u.password);
      } catch (e) {
        passMatch = data.password === u.password;
      }

      if (passMatch) {
        console.log('[Auth] Password match! Setting user data.');
        const loggedUser = {
          id: u.id,
          username: u.username,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          whatsapp: u.whatsapp,
          avatar: u.avatar,
          userType: u.user_type,
          needs: u.needs,
          gives: u.gives,
          profileViews: u.profile_views
        };
        userData.value = loggedUser;
        setStored('user_data', loggedUser);
        
        await fetchInitialData();
        showToast(`Welcome back, ${u.first_name}!`, 'success');
        navigateTo('home');
      } else {
        console.warn('[Auth] Password mismatch');
        showToast('Invalid password. Please try again.', 'error');
      }
    } else {
      console.warn('[Auth] No user found with email:', data.email);
      showToast('No account found with this email.', 'error');
    }
  } catch (e) {
    console.error('[Auth] Login error:', e);
    showToast('Login failed. Ancestors are silent.', 'error');
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleSignUp = async (data) => {
  console.log('[Auth] SignUp attempt:', data.email);
  isGlobalLoading.value = true;
  loadingMessage.value = 'Joining the heritage...';
  
  try {
    // 1. Check if user already exists
    const checkRes = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ? OR username = ?',
      args: [data.email, data.username]
    });

    if (checkRes.rows && checkRes.rows.length > 0) {
      showToast('Email or username already registered.', 'error');
      return;
    }

    // 2. Hash password
    console.log('[Auth] Hashing password...');
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // 3. Create user
    const newId = 'u' + Date.now();
    const signupData = { ...data, id: newId, password: hashedPassword };
    
    console.log('[Auth] Executing DB insert via Action...');
    await db.runAction('signup', signupData);
    
    console.log('[Auth] Signup successful');
    
    // 4. Update state (cleanly, without the password)
    const { password, ...userWithoutPassword } = signupData;
    userData.value = userWithoutPassword;
    setStored('user_data', userWithoutPassword);
    
    await fetchInitialData();
    showToast('Welcome to the heritage tribe!', 'success');
    navigateTo('home');
  } catch (e) {
    console.error('[Auth] Signup error:', e);
    showToast('Signup failed. Please try again.', 'error');
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleLogout = () => {
  userData.value = { id: 'guest', username: 'guest' }
  setStored('user_data', { id: 'guest', username: 'guest' })
  setStored('favorites', []);
  favoriteItems.value = [];
  showToast('Logged out from the tribe.', 'info')
  navigateTo('splash')
}

const handleUpdateRole = async (newRole) => {
  if (userData.value.id === 'guest') return
  isGlobalLoading.value = true
  loadingMessage.value = 'Switching roles...'
  try {
    await db.runAction('update_role', { id: userData.value.id, role: newRole });
    userData.value.userType = newRole
    showToast(`Role successfully switched to ${newRole === 'supplier' ? 'Tailor' : 'Buyer'}!`, 'success')
  } catch (e) {
    console.error('Role update error:', e)
    showToast('Error switching roles. Please try again.', 'error')
  } finally {
    isGlobalLoading.value = false
  }
}

const fetchInitialData = async () => {
  try {
    // Fetch user rating if logged in
    let userRating = 0;
    if (userData.value.id !== 'guest') {
      const ratingRes = await db.execute({
        sql: `
          SELECT AVG(r.rating) as avg_rating 
          FROM reviews r 
          WHERE r.product_id IN (SELECT id FROM products WHERE owner_id = ?)
        `,
        args: [userData.value.id]
      });
      userRating = ratingRes.rows[0]?.avg_rating || 0;
    }

    const [catsRes, trendingRes, productsRes, appRevRes, suppliersRes] = await Promise.all([
      db.execute("SELECT * FROM categories"),
      db.execute(`
        SELECT p.*, c.name as categoryName 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.likes_count DESC LIMIT 4
      `),
      db.execute(`
        SELECT p.*, c.name as categoryName 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.id DESC
      `),
      db.execute(`
        SELECT r.*, u.first_name, u.last_name, u.avatar 
        FROM app_reviews r 
        JOIN users u ON r.user_id = u.id 
        ORDER BY r.created_at DESC LIMIT 5
      `),
      db.execute(`
        SELECT u.*, 
               (SELECT AVG(rating) FROM reviews WHERE product_id IN (SELECT id FROM products WHERE owner_id = u.id)) as avg_rating,
               (SELECT SUM(likes_count) FROM products WHERE owner_id = u.id) as total_likes
        FROM users u 
        WHERE u.user_type = 'supplier' 
        ORDER BY profile_views DESC LIMIT 8
      `)
    ]);
    
    categories.value = catsRes.rows;
    trendingProducts.value = trendingRes.rows;
    allProducts.value = productsRes.rows;
    
    trendingSellers.value = suppliersRes.rows.map(s => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      username: s.username,
      avatar: s.avatar,
      rating: s.avg_rating ? s.avg_rating.toFixed(1) : '0.0',
      likesCount: s.total_likes || 0,
      isVerified: true
    }));

    if (userData.value.id !== 'guest') {
      const myRating = suppliersRes.rows.find(s => s.id === userData.value.id)?.avg_rating;
      userData.value.rating = myRating ? myRating.toFixed(1) : '0.0';
    }
    
    // Update product count for the current user
    if (userData.value.id !== 'guest') {
      userProductCount.value = allProducts.value.filter(p => p.owner_id === userData.value.id).length;
    }

    setStored('categories_cache', categories.value);
    setStored('trending_products_cache', trendingProducts.value);
    setStored('all_products_cache', allProducts.value);
    setStored('trending_sellers_cache', trendingSellers.value);

    appReviews.value = appRevRes.rows.map(r => ({
      id: r.id,
      author: r.first_name, // Just first name as requested
      text: r.text,
      rating: r.rating,
      avatar: r.avatar
    }));

    // Fetch favorites if logged in
    if (userData.value.id !== 'guest') {
      const favIdsRes = await db.execute({
        sql: "SELECT product_id FROM favorites WHERE user_id = ?",
        args: [userData.value.id]
      });
      const favIds = favIdsRes.rows.map(r => r.product_id);
      
      allProducts.value = allProducts.value.map(p => ({
        ...p,
        liked: favIds.includes(p.id)
      }));
      
      favoriteItems.value = allProducts.value.filter(p => p.liked);
      setStored('favorites', favoriteItems.value);

      // Fetch personal stats
      const [notifRes, countRes] = await Promise.all([
        db.execute({ sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", args: [userData.value.id] }),
        db.execute({ sql: "SELECT COUNT(*) as total FROM products WHERE owner_id = ?", args: [userData.value.id] })
      ]);
      userNotifications.value = notifRes.rows;
      userProductCount.value = countRes.rows[0]?.total || 0;
    }
  } catch (e) {
    console.error('[InitialData] Fetch failed:', e);
  }
}

const toggleLike = async (product) => {
  if (userData.value.id === 'guest') {
    navigateTo('login')
    return
  }
  
  product.liked = !product.liked
  
  // Sync all references
  const updateProduct = (list) => {
    const p = list.find(item => item.id === product.id)
    if (p) p.liked = product.liked
  }
  updateProduct(allProducts.value)
  
  if (product.liked) {
    // updatePreference(product.category_id, 2) // Recommendation engine (future)
  }

  try {
    if (product.liked) {
      if (!favoriteItems.value.find(item => item.id === product.id)) {
        favoriteItems.value.push({ ...product })
        await db.runAction('toggle_favorite', { userId: userData.value.id, productId: product.id, isAdding: true });
        await db.runAction('increment_likes', { productId: product.id });
      }
    } else {
      favoriteItems.value = favoriteItems.value.filter(item => item.id !== product.id)
      await db.runAction('toggle_favorite', { userId: userData.value.id, productId: product.id, isAdding: false });
      await db.runAction('decrement_likes', { productId: product.id });
    }
  } catch (e) {
    console.error("Toggle like error:", e)
  }
}

const handleUploadWork = async (data) => {
  isGlobalLoading.value = true;
  loadingMessage.value = data.id ? 'Updating your heritage piece...' : 'Weaving your work into the heritage...';
  try {
    if (data.id) {
      await db.runAction('update_product', { ...data, owner_id: userData.value.id });
      showToast('Work updated successfully!', 'success')
    } else {
      await db.runAction('create_product', { ...data, owner_id: userData.value.id });
      showToast('Work published successfully!', 'success')
    }
    await fetchInitialData();
    navigateTo('profile');
  } catch (e) {
    console.error('Upload error:', e);
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleNewOrder = async (data) => {
  console.log('[Data] Saving new order:', data);
  try {
    const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    await db.runAction('create_order', {
      ...data,
      id: orderId,
      customerId: userData.value.id
    });
    console.log('[Data] Order saved successfully');
    
    // Notify the user
    await createNotification(userData.value.id === data.tailorId ? data.customerId : data.tailorId, 
      `New order created for "${data.itemName}"! 📦✨`);
  } catch (e) {
    console.error('[Data] Failed to save order:', e);
  }
}

const handleNewNegotiation = async (data) => {
  try {
    await db.execute({
      sql: "INSERT INTO negotiations (item_name, customer_id, tailor_id, proposed_price, status, size, color, notes, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [data.itemName, userData.value.id, data.tailorId, data.price, 'Awaiting Reply', data.size, data.color, data.notes, data.image]
    })
    showToast('Negotiation initiated successfully!', 'success')
    await createNotification(data.tailorId, `New negotiation offer for "${data.itemName}"! 💰`)
  } catch (e) {
    console.error('Negotiation error:', e)
  }
}

const createNotification = async (userId, message) => {
  try {
    await db.runAction('create_notification', { userId, message });
    console.log(`[Notification] Created for ${userId}: ${message}`)
  } catch (e) {
    console.error('[Notification] Failed to create:', e)
  }
}

const handleUpdateOrderStatus = async (data) => {
  console.log('[Data] Updating order status:', data);
  try {
    await db.runAction('update_order_status', { orderId: data.orderId, status: data.status });
    
    showToast(`Order status updated to ${data.status}`, 'success')
    
    // Notify the customer
    let msg = `Your order for "${data.itemName}" has been updated to: ${data.status}!`
    await createNotification(data.customerId, msg)
    await fetchInitialData()
  } catch (e) {
    console.error('[Data] Failed to update status:', e);
  }
}

const handleWriteReview = async (data) => {
  if (selectedProduct.value?.id === undefined) return
  isGlobalLoading.value = true
  loadingMessage.value = 'Publishing your heritage review...'
  try {
    await db.runAction('write_review', {
      productId: selectedProduct.value.id,
      userId: userData.value.id,
      rating: data.rating,
      text: data.text
    });
    showToast('Review shared with the Tribe!', 'success')
    navigateTo('product-details', { selectedProduct: selectedProduct.value })
  } catch (e) {
    console.error('Review error:', e)
    showToast('Error sharing review. Please try again.', 'error')
  } finally {
    isGlobalLoading.value = false
  }
}

const handleAppExperienceSubmit = async (data) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Sharing your journey with the Tribe...';
  try {
    await db.runAction('submit_app_review', {
      userId: userData.value.id,
      rating: data.rating,
      text: data.text,
      image: data.image
    });
    showToast('Your journey has been recorded! ✨', 'success');
    navigateTo('profile');
  } catch (e) {
    console.error('App review error:', e);
    showToast('Error sharing experience.', 'error');
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleFeedbackSubmit = async (message) => {
  isGlobalLoading.value = true
  loadingMessage.value = 'Sending feedback...'
  try {
    await db.execute({
      sql: "INSERT INTO feedback (user_id, message) VALUES (?, ?)",
      args: [userData.value.id, message]
    })
    showToast('Feedback sent! Thank you.', 'success')
    navigateTo('home')
  } catch (e) {
    console.error('Feedback error:', e)
  } finally {
    isGlobalLoading.value = false
  }
}

const handleProductDelete = async (productId) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Removing heritage item...';
  try {
    await db.runAction('delete_product', { productId, userId: userData.value.id });
    showToast('Item removed successfully.', 'success')
    await fetchInitialData()
    navigateTo('home')
  } catch (e) {
    console.error('Delete product error:', e)
    showToast('Error removing item.', 'error')
  } finally {
    isGlobalLoading.value = false
  }
}

const handleUpdateProfile = async (val) => {
  isGlobalLoading.value = true;
  loadingMessage.value = 'Updating your heritage profile...';
  try {
    await db.runAction('update_profile', val);
    userData.value = { ...val };
    showToast('Profile updated successfully!', 'success')
    await fetchInitialData();
    navigateTo('profile');
  } catch (e) {
    console.error('Update profile error:', e);
    showToast('Failed to update profile. Username might be taken.', 'error')
  } finally {
    isGlobalLoading.value = false;
  }
}

const handleGoChat = (userId) => {
  navigateTo('chat-detail', { userId })
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
        WHERE p.name LIKE ?
           OR p.description LIKE ?
           OR c.name LIKE ?
           OR u.username LIKE ?
        ORDER BY p.likes_count DESC
      `,
      args: [q, q, q, q]
    });

    // Fetch favorites
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

// ==========================================
// UTILS
// ==========================================
const showToast = (message, type = 'info') => {
  toast.value = { show: true, message, type }
  setTimeout(() => toast.value.show = false, 3000)
}

watch([allProducts, userData], () => {
  if (userData.value.id !== 'guest') {
    userProductCount.value = allProducts.value.filter(p => p.owner_id === userData.value.id).length;
  } else {
    userProductCount.value = 0;
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  fetchInitialData()
})

const showNavBar = computed(() => {
  return ['home', 'favorites', 'profile', 'category-list', 'chats', 'notifications', 'search', 'explore'].includes(route.name)
})
</script>

<template>
  <div :class="['app-container', theme]">
    <!-- DESKTOP HEADER (WEB MODE) -->
    <WebHeader 
      v-if="showNavBar" 
      :active-tab="route.name"
      :theme="theme"
      :t="t"
      @navigate="navigateTo"
      @go-notifications="navigateTo('notifications')"
      @toggle-theme="() => theme = (theme === 'light' ? 'dark' : 'light')"
    />

    <main :class="{ 'with-nav': showNavBar }">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component 
          :is="Component" 
          :t="t"
          :user-data="userData"
          :theme="theme"
          :language="currentLanguage"
          :categories="categories"
          :trending-products="trendingProducts"
          :trending-sellers="trendingSellers"
          :explore-items="filteredExploreItems"
          :favorite-items="favoriteItems"
          :my-products="allProducts.filter(p => p.owner_id === userData.id)"
          :product-count="userProductCount"
          :product-id="route.params.id || selectedProduct?.id"
          :tailor-id="selectedReviewsTailorId"
          :is-app="isAppReview"
          :current-user-id="userData.id"
          :category="route.params.category || selectedCategory"
          :seller="selectedSeller"
          :results="searchResults"
          :search-history="searchHistory"
          :notifications="userNotifications"
          :app-reviews="appReviews"
          :is-loading="isGlobalLoading"
          :editing-product="selectedEditProduct"
          @navigate="navigateTo"
          @go-back="handleGoBack"
          @login="handleLogin"
          @signup="handleSignUp"
          @submit="(val) => {
            if (route.name === 'forgot-password') handlePasswordReset(val)
            else if (route.name === 'verify-code') handleVerifyCode(val)
            else if (route.name === 'reset-password') handleResetPassword(val)
            else if (route.name === 'feedback') handleFeedbackSubmit(val)
            else if (route.name === 'write-review') handleWriteReview(val)
          }"
          @go-signup="navigateTo('signup')"
          @go-login="navigateTo('login')"
          @go-forgot="navigateTo('forgot-password')"
          @go-settings="navigateTo('settings')"
          @go-console="navigateTo('tailor-console')"
          @go-orders="navigateTo('orders')"
          @go-negotiations="navigateTo('orders')"
          @go-edit="(p) => { selectedEditProduct = p; navigateTo('upload-work') }"
          @go-upload="navigateTo('upload-work')"
          @go-app-review="navigateTo('app-review')"
          @logout="handleLogout"
          @go-reviews="(tailorId) => navigateTo('reviews', { tailorId })"
          @go-feedback="navigateTo('feedback')"
          @go-chats="navigateTo('chats')"
          @go-chat="handleGoChat"
          @go-product="(p) => navigateTo('product-details', { selectedProduct: p })"
          @go-details="(p) => navigateTo('product-details', { selectedProduct: p })"
          @go-search-details="(p) => navigateTo('product-details', { selectedProduct: p })"
          @toggle-favorite="(p) => toggleLike(p)"
          @toggle-like="(p) => toggleLike(p)"
          @toggle-search-favorite="(p) => toggleLike(p)"
          @delete="handleProductDelete"
          @select-category="(name) => navigateTo('explore', { selectedCategory: name })"
          @go-explore="(name) => navigateTo('explore', { selectedCategory: name })"
          @go-notifications="navigateTo('notifications')"
          @go-search="navigateTo('search')"
          @go-search-tailor="(s) => navigateTo('tailor-details', { selectedSeller: s })"
          @go-categories="navigateTo('category-list')"
          @go-trending="navigateTo('explore', { selectedCategory: 'Trending Trends' })"
          @go-tailor="(s) => navigateTo('tailor-details', { selectedSeller: s })"
          @search="handleSearch"
          @update:user-data="handleUpdateProfile"
          @update:theme="(val) => theme = val"
          @update:language="(val) => currentLanguage = val"
          @update:role="handleUpdateRole"
          @go-help="navigateTo('help')"
          @go-privacy="navigateTo('privacy')"
          @go-terms="navigateTo('terms')"
          @go-about="navigateTo('about')"
          @go-returns="navigateTo('returns')"
          @go-guidelines="navigateTo('guidelines')"
          @go-safety="navigateTo('safety')"
          @go-measurements="navigateTo('measurements')"
          @go-ip-policy="navigateTo('ip-policy')"
          @go-stories="navigateTo('stories')"
          @upload="handleUploadWork"
          @order="handleNewOrder"
          @negotiate="handleNewNegotiation"
          @update-status="handleUpdateOrderStatus"
          @submit-app-experience="handleAppExperienceSubmit"
          @loaded="userData.id !== 'guest' ? navigateTo('home') : navigateTo('login')"
        />
      </keep-alive>
    </router-view>
    </main>

    <NavigationBar 
      v-if="showNavBar" 
      :active-tab="route.name"
      :is-guest="userData.id === 'guest'"
      :t="t"
      @navigate="navigateTo"
    />

    <LoadingSpinner v-if="isGlobalLoading" :message="loadingMessage" />

    <!-- Modern Toast Notification -->
    <div v-if="toast.show" class="toast-notification animate-fade-up" :class="toast.type">
      <div class="toast-icon">
        <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <span class="toast-message">{{ toast.message }}</span>
    </div>

    <SpeedInsights />
  </div>
</template>


<style>
/* Toast Notification */
.toast-notification {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 100px;
  background: var(--wood-deep);
  border: 1px solid var(--glass-border);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  z-index: 9999;
  min-width: 280px;
  max-width: 90vw;
}
.toast-notification.success { border-color: #10B981; }
.toast-notification.error { border-color: #EF4444; }
.toast-notification.success .toast-icon { color: #10B981; }
.toast-notification.error .toast-icon { color: #EF4444; }
.toast-message { font-size: 14px; font-weight: 600; color: var(--text-primary); }

@keyframes fadeUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.animate-fade-up { animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

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

.with-nav {
  padding-top: 60px;
  padding-bottom: 100px;
}

@media (min-width: 768px) {
  .with-nav {
    padding-top: 80px;
    padding-bottom: 0;
  }
}
</style>
