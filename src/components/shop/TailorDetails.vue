<!-------- (TailorDetails.vue) ./src/components/shop/TailorDetails.vue ------------>
<script setup>
import { ref, onMounted } from 'vue'
import SectionHeader from '../layout/SectionHeader.vue'
import { db } from '../../db/client'

const props = defineProps({
  seller: {
    type: Object,
    required: true
  },
  userData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['go-back', 'go-reviews', 'go-feedback', 'go-details'])

const hasConnected = ref(false)
const products = ref([])
const reviews = ref([])

onMounted(async () => {
  // Fetch actual products for this tailor
  try {
    const res = await db.execute({
      sql: "SELECT * FROM products WHERE owner_id = ? ORDER BY id DESC",
      args: [props.seller.owner_id || props.seller.id]
    })
    products.value = res.rows
    
    const revRes = await db.execute({
      sql: `
        SELECT r.*, u.username as author_name, u.avatar as author_avatar 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.product_id IN (SELECT id FROM products WHERE owner_id = ?)
        LIMIT 3
      `,
      args: [props.seller.owner_id || props.seller.id]
    })
    reviews.value = revRes.rows
  } catch (e) {
    console.error("Error fetching tailor products:", e)
  }
})

const connectToWhatsApp = () => {
  let phoneNumber = props.seller.whatsapp || "255700000000";
  let normalized = phoneNumber.startsWith('0') ? '255' + phoneNumber.slice(1) : phoneNumber.replace('+', '')
  
  const buyerName = props.userData.firstName || props.userData.username
  const tailorName = props.seller.name || props.seller.username

  const message = `Hello ${tailorName}! ✂️\n\nMy name is ${buyerName}, and I've been admiring your incredible work on Alfietz! 🌟\n\nI'm very interested in commissioning a custom piece from you and would love to discuss how we can bring a new heritage vision to life. 🧵✨\n\nLooking forward to hearing from you!\n\nBest regards,\n${buyerName} ✍️`;
  
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  hasConnected.value = true
}
</script>

<template>
  <div v-if="seller" class="tailor-page pattern-heritage animate-fade">
    
    <div class="top-nav-glass">
      <button class="back-btn" @click="$emit('go-back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <span class="header-username">{{ seller.name || seller.username }}</span>
      <button class="icon-btn-round">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
      </button>
    </div>

    <!-- IG Hero Section -->
    <header class="ig-hero">
      <div class="hero-main">
        <div class="avatar-ring" :class="{ 'verified': seller.isVerified }">
          <img :src="seller.avatar" :alt="seller.name" class="profile-img" />
          <div v-if="seller.isVerified" class="verify-badge-small">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>
        
        <div class="hero-stats">
          <div class="stat-box">
            <span class="stat-num">{{ products.length }}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ seller.likesCount || 0 }}</span>
            <span class="stat-label">Likes</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ seller.clientsCount || 0 }}</span>
            <span class="stat-label">Clients</span>
          </div>
        </div>
      </div>

      <div class="hero-bio">
        <h1 class="bio-name">{{ seller.name }}</h1>
        <span class="bio-tag">Digital Tailor • Heritage Artisan</span>
        <p class="bio-text">{{ seller.bio || 'Preserving African heritage through every stitch and pattern. Custom commissions available.' }}</p>
        <div class="bio-links">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <a href="#" class="bio-link">heritage-craft.art/{{ seller.username }}</a>
        </div>
      </div>

      <div class="hero-actions">
        <button class="action-btn-primary" @click="connectToWhatsApp">
          {{ hasConnected ? 'Message Sent' : 'Message' }}
        </button>
        <button class="action-btn-secondary">Share</button>
        <button class="action-btn-secondary" @click="$emit('go-reviews')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        </button>
      </div>
    </header>

    <!-- Highlights Bar -->
    <div class="highlights-container">
      <div class="highlight-item">
        <div class="highlight-circle">✂️</div>
        <span>Process</span>
      </div>
      <div class="highlight-item">
        <div class="highlight-circle">🧵</div>
        <span>Fabrics</span>
      </div>
      <div class="highlight-item" @click="$emit('go-reviews')">
        <div class="highlight-circle">⭐</div>
        <span>Reviews ({{ reviews.length }})</span>
      </div>
    </div>

    <!-- Recent Reviews (Dynamic) -->
    <section class="reviews-preview">
      <div class="section-header-row">
        <h3 class="bio-name">Recent Reviews</h3>
        <button v-if="reviews.length > 0" class="view-all-link" @click="$emit('go-reviews')">View All</button>
      </div>
      
      <div v-if="reviews.length > 0" class="reviews-mini-list">
        <div v-for="review in reviews.slice(0, 2)" :key="review.id" class="review-mini-card">
          <div class="review-mini-header">
            <img :src="review.author_avatar" class="mini-avatar" />
            <div class="mini-info">
              <span class="mini-name">{{ review.author_name }}</span>
              <div class="star-rating mini">
                <span v-for="n in 5" :key="n" class="star" :class="n <= review.rating ? 'filled' : 'empty'">★</span>
              </div>
            </div>
          </div>
          <p class="mini-text">"{{ review.text }}"</p>
        </div>
      </div>
      <div v-else class="empty-reviews-cta">
        <p>No heritage reviews yet. Be the first to commission a piece!</p>
      </div>
    </section>

    <!-- Tabbed Grid View -->
    <div class="grid-nav">
      <div class="grid-tab active">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </div>
      <div class="grid-tab">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </div>
    </div>

    <div class="ig-grid">
      <div 
        v-for="product in products" 
        :key="product.id" 
        class="grid-post tap-active"
        @click="$emit('go-details', product)"
      >
        <img :src="product.image" alt="Post" class="post-img" />
        <div v-if="product.status === 'Out of Stock'" class="oos-dot"></div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tailor-page {
  background-color: var(--wood-deep);
  min-height: 100vh;
  padding-bottom: 20px;
}

.top-nav-glass {
  position: sticky;
  top: 0;
  height: 60px;
  background: var(--glass-bg);
  backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
  border-bottom: 1px solid var(--glass-border);
}

.header-username {
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.5px;
}

.ig-hero {
  padding: 20px 16px;
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-bottom: 16px;
}

.avatar-ring {
  position: relative;
  width: 86px;
  height: 86px;
  padding: 4px;
  border-radius: 50%;
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
}

.avatar-ring.verified {
  background: var(--accent-amber);
}

.profile-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--wood-deep);
}

.verify-badge-small {
  position: absolute;
  bottom: 0;
  right: 0;
  background: #3897f0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--wood-deep);
}

.hero-stats {
  display: flex;
  gap: 24px;
  flex: 1;
  justify-content: center;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 18px;
  font-weight: 800;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.hero-bio {
  margin-bottom: 16px;
}

.bio-name {
  font-size: 15px;
  font-weight: 800;
  margin: 0;
}

.bio-tag {
  font-size: 13px;
  color: var(--text-muted);
}

.bio-text {
  font-size: 14px;
  line-height: 1.4;
  margin: 4px 0;
  color: var(--text-primary);
}

.bio-links {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #3897f0;
  font-size: 13px;
  font-weight: 600;
}

.hero-actions {
  display: flex;
  gap: 8px;
}

.action-btn-primary {
  flex: 1;
  background: var(--accent-amber);
  color: white;
  border-radius: 8px;
  height: 36px;
  font-size: 13px;
  font-weight: 700;
}

.action-btn-secondary {
  flex: 1;
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  border-radius: 8px;
  height: 36px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.highlights-container {
  display: flex;
  gap: 16px;
  padding: 0 16px 20px;
  overflow-x: auto;
}
.highlight-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  cursor: pointer;
}

.reviews-preview {
  padding: 0 16px 24px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.view-all-link {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-amber);
  background: none;
  border: none;
  cursor: pointer;
}

.reviews-mini-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-mini-card {
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 12px;
}

.review-mini-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.mini-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.mini-info {
  display: flex;
  flex-direction: column;
}

.mini-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.star-rating.mini .star {
  font-size: 10px;
}

.star.filled { color: #FFC107; }
.star.empty { color: #E0E0E0; }

.mini-text {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.empty-reviews-cta {
  background: var(--wood-walnut);
  border: 1px dashed var(--glass-border);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.empty-reviews-cta p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.highlight-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.highlight-item span {
  font-size: 11px;
  font-weight: 600;
}

.grid-nav {
  display: flex;
  border-top: 1px solid var(--glass-border);
}

.grid-tab {
  flex: 1;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.grid-tab.active {
  color: var(--accent-amber);
  border-top: 1.5px solid var(--accent-amber);
}

.ig-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.grid-post {
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
  background: var(--wood-walnut);
}

.post-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.oos-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #EF4444;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.back-btn {
  background-color: var(--wood-walnut) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-primary) !important;
  transition: all 0.2s ease !important;
}

.icon-btn-round {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}
</style>