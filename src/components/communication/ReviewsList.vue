<!-------- (ReviewsList.vue) ./src/components/ReviewsList.vue ------------>
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { db } from '../../db/client'

const props = defineProps({
  productId: {
    type: [String, Number],
    required: false,
    default: null
  },
  tailorId: {
    type: [String, Number],
    required: false,
    default: null
  },
  isApp: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['go-back', 'write-review', 'go-product'])

const reviews = ref([])
const loading = ref(true)
const sortBy = ref('newest') // newest, highest, lowest
const filterRating = ref(0) // 0 means all
const tailorInfo = ref(null)

const stats = computed(() => {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.value.forEach(r => {
    if (counts[r.rating] !== undefined) counts[r.rating]++
  })
  return counts
})

const averageRating = computed(() => {
  if (reviews.value.length === 0) return 0
  const sum = reviews.value.reduce((acc, r) => acc + r.rating, 0)
  return sum / reviews.value.length
})

const totalReviews = computed(() => reviews.value.length)

const filteredAndSortedReviews = computed(() => {
  let result = [...reviews.value]
  
  if (filterRating.value !== 0) {
    result = result.filter(r => r.rating === filterRating.value)
  }
  
  if (sortBy.value === 'highest') {
    result.sort((a, b) => b.rating - a.rating)
  } else if (sortBy.value === 'lowest') {
    result.sort((a, b) => a.rating - b.rating)
  } else {
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  
  return result
})

const fetchReviews = async () => {
  try {
    loading.value = true
    
    // Prioritize the context: if it's app reviews, ignore IDs. 
    // If it's tailor reviews, ignore product IDs (prevents App.vue fallback collision).
    const res = await db.runAction('get_reviews', {
      isApp: props.isApp,
      tailorId: props.isApp ? null : props.tailorId,
      productId: (props.isApp || props.tailorId) ? null : props.productId
    });

    reviews.value = res.rows.map(r => ({
      id: r.id,
      author: (r.first_name || r.last_name) ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : r.username,
      rating: r.rating,
      text: r.text,
      time: formatDate(r.created_at),
      avatar: r.avatar,
      image: r.image || null,
      created_at: r.created_at,
      productName: r.product_name || null,
      productId: r.product_id || null,
      productImage: r.product_image || null
    }))

    if (props.tailorId && res.rows.length > 0) {
      const r = res.rows[0];
      tailorInfo.value = {
        name: (r.tailor_first || r.tailor_last) ? `${r.tailor_first || ''} ${r.tailor_last || ''}`.trim() : (r.tailor_username || 'Artisan')
      }
    }
  } catch (e) {
    console.error('Error fetching reviews:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchReviews)
watch(() => [props.productId, props.tailorId], fetchReviews)

function formatDate(dateStr) {
  if (!dateStr) return 'Recently'
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 1) return 'Today'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="reviews-page">
    <div class="header-row">
      <button class="back-btn" @click="$emit('go-back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1 class="title">
        {{ isApp ? 'Tribe Experiences' : (tailorId ? (tailorInfo ? tailorInfo.name + "'s Reviews" : 'Artisan Reviews') : 'Heritage Reviews') }}
      </h1>
    </div>

    <div v-if="loading" class="loading-reviews">
      <div class="spinner"></div>
      <p>Consulting the ancestors for reviews...</p>
    </div>

    <template v-else>
      <!-- Overall Rating Section -->
      <div class="rating-overview-card">
        <div class="rating-summary">
          <h2 class="rating-score">{{ averageRating.toFixed(1) }}</h2>
          <div class="star-rating large-stars">
            <span v-for="n in 5" :key="n" class="star" :class="n <= Math.round(averageRating) ? 'filled' : 'empty'">★</span>
          </div>
          <p class="rating-count">{{ totalReviews }} reviews</p>
        </div>
        
        <div class="rating-bars">
          <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="rating-bar-row" @click="filterRating = filterRating === star ? 0 : star" :class="{ active: filterRating === star }">
            <span class="star-label">{{ star }} ★</span>
            <div class="bar-container">
              <div class="bar-fill" :style="{ width: totalReviews ? (stats[star] / totalReviews * 100) + '%' : '0%' }"></div>
            </div>
            <span class="count-label">{{ stats[star] }}</span>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="reviews-controls">
        <div class="sort-select-wrapper">
          <select v-model="sortBy" class="sort-select">
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
        <button v-if="filterRating !== 0" class="clear-filter" @click="filterRating = 0">
          Clear Filter ({{ filterRating }}★) ✕
        </button>
      </div>

      <!-- Reviews List -->
      <div v-if="filteredAndSortedReviews.length > 0" class="reviews-list">
        <div v-for="review in filteredAndSortedReviews" :key="review.id" class="review-card animate-fade-in">
          <div class="review-header">
            <div class="avatar-wrapper">
              <img :src="review.avatar || 'https://i.pravatar.cc/150?u=' + review.author" alt="Reviewer" class="avatar" />
              <div v-if="review.rating === 5" class="top-reviewer-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
            </div>
            <div class="reviewer-info">
              <div class="name-row">
                <h4 class="reviewer-name">{{ review.author }}</h4>
                <span class="verified-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  Verified
                </span>
              </div>
              <div class="meta-row">
                <div class="star-rating small-stars">
                  <span v-for="n in 5" :key="n" class="star" :class="n <= review.rating ? 'filled' : 'empty'">★</span>
                </div>
                <span class="review-time">{{ review.time }}</span>
              </div>
            </div>
          </div>

          <!-- Product Context (for Tailor View) -->
          <div v-if="review.productName" class="product-context" @click="$emit('go-product', { id: review.productId, name: review.productName, image: review.productImage })">
            <div class="product-mini-img-box">
              <img :src="review.productImage" alt="Product" />
            </div>
            <div class="product-context-info">
              <span class="context-label">Review for</span>
              <span class="context-name">{{ review.productName }}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          <div class="review-content">
            <p class="review-text">{{ review.text }}</p>
            <div v-if="review.image" class="review-media-box">
              <img :src="review.image" alt="Review media" class="review-img" />
            </div>
          </div>
          <div class="review-footer">
            <button class="helpful-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              Helpful
            </button>
            <button class="report-btn">Report</button>
          </div>
        </div>
      </div>
      <div v-else class="no-reviews">
        <div class="empty-icon">📜</div>
        <p v-if="filterRating !== 0">No {{ filterRating }}-star reviews found.</p>
        <p v-else>No reviews yet for this {{ isApp ? 'app experience' : (tailorId ? 'artisan' : 'heritage piece') }}.</p>
      </div>
    </template>

    <div v-if="productId || isApp" class="bottom-action">
      <button class="primary-btn" @click="isApp ? $emit('navigate', 'app-review') : $emit('write-review')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        {{ isApp ? 'Share Your Journey' : 'Write a Review' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ... (existing styles) ... */

.review-media-box {
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  max-width: 300px;
}

.review-img {
  width: 100%;
  height: auto;
  display: block;
}

.product-context {
  margin: 0 -4px 4px;
  background: rgba(0,0,0,0.15);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.product-context:hover {
  background: rgba(0,0,0,0.25);
  border-color: rgba(217, 164, 4, 0.2);
}

.product-mini-img-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--wood-deep);
  flex-shrink: 0;
}

.product-mini-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-context-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.context-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.context-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-amber);
}

/* ... rest of existing styles ... */

<style scoped>
.reviews-page {
  background: var(--wood-deep);
  min-height: 100vh;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 24px 20px 140px;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.back-btn {
  background-color: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background-color: var(--wood-polished);
  border-color: var(--accent-amber);
  transform: scale(1.05);
}

.title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-amber);
  margin: 0;
  letter-spacing: -0.5px;
}

.loading-reviews {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 80px 20px;
  color: var(--text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(217, 164, 4, 0.1);
  border-top-color: var(--accent-amber);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Rating Overview Card */
.rating-overview-card {
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

@media (max-width: 500px) {
  .rating-overview-card {
    flex-direction: column;
    gap: 24px;
    align-items: center;
    text-align: center;
  }
}

.rating-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.rating-score {
  font-size: 48px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  line-height: 1;
}

.star-rating {
  display: flex;
  gap: 2px;
}

.large-stars .star { font-size: 20px; }
.small-stars .star { font-size: 12px; }

.star.filled { color: var(--accent-amber); }
.star.empty { color: rgba(255,255,255,0.1); }

.rating-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  margin: 8px 0 0 0;
}

.rating-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.rating-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
  border-radius: 8px;
}

.rating-bar-row:hover {
  background: rgba(255,255,255,0.05);
}

.rating-bar-row.active {
  background: rgba(217, 164, 4, 0.1);
}

.star-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  width: 30px;
}

.bar-container {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--accent-amber);
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67);
}

.count-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  width: 20px;
  text-align: right;
}

/* Controls */
.reviews-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 12px;
  flex-wrap: wrap;
}

.sort-select-wrapper {
  position: relative;
}

.sort-select {
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  appearance: none;
  min-width: 160px;
}

.sort-select-wrapper::after {
  content: '▼';
  font-size: 10px;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.clear-filter {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #EF4444;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* Reviews List */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-card {
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: transform 0.2s;
}

.review-card:hover {
  border-color: rgba(217, 164, 4, 0.3);
}

.review-header {
  display: flex;
  gap: 16px;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  object-fit: cover;
  border: 2px solid var(--glass-border);
}

.top-reviewer-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--accent-amber);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--wood-walnut);
}

.reviewer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reviewer-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.verified-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  color: #10B981;
  text-transform: uppercase;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 6px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-time {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.review-content {
  border-left: 2px solid rgba(255,255,255,0.05);
  padding-left: 16px;
}

.review-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
}

.review-footer {
  display: flex;
  gap: 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 16px;
}

.helpful-btn, .report-btn {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s;
}

.helpful-btn { color: var(--text-muted); }
.helpful-btn:hover { color: var(--accent-amber); }

.report-btn { color: rgba(255,255,255,0.2); margin-left: auto; }
.report-btn:hover { color: #EF4444; }

.no-reviews {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  background: var(--wood-walnut);
  border-radius: 24px;
  border: 1px dashed var(--glass-border);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Bottom Action */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 24px 20px 40px;
  background: linear-gradient(to top, var(--wood-deep) 80%, transparent);
  z-index: 10;
  display: flex;
  justify-content: center;
}

.primary-btn {
  width: 100%;
  max-width: 400px;
  background: var(--accent-amber);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 18px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 10px 25px var(--accent-glow);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.primary-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 30px var(--accent-glow);
}

.primary-btn:active {
  transform: scale(0.95);
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>