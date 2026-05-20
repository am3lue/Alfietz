<!-------- (SearchPage.vue) ./src/components/SearchPage.vue ------------>
<script setup>
import { ref, watch, onMounted } from 'vue'
import { CATEGORY_EXAMPLES_SIMPLE as categoryExamples } from '../../constants'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  searchHistory: {
    type: Array,
    default: () => []
  },
  t: {
    type: Function,
    required: true
  }
})

const searchQuery = ref('')
const isFocused = ref(false)
const emit = defineEmits(['go-back', 'search', 'select-category'])

const handleSearch = (query) => {
  const q = query || searchQuery.value
  if (q.trim()) {
    emit('search', q)
  }
}

// Live search as user types
let searchTimeout = null
watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!newVal.trim()) return
  
  searchTimeout = setTimeout(() => {
    emit('search', newVal)
  }, 600) 
})
</script>

<template>
  <div class="search-page pattern-heritage animate-fade">
    <!-- Header -->
    <div class="search-header-glass">
      <button class="back-btn" @click="$emit('go-back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div class="search-input-box" :class="{ 'focused': isFocused }">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input 
          type="text" 
          v-model="searchQuery" 
          :placeholder="t('search') + ' heritage...'" 
          class="search-input" 
          @focus="isFocused = true"
          @blur="setTimeout(() => isFocused = false, 200)"
          @keyup.enter="handleSearch()"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <div class="search-content">
      <!-- Recent Searches -->
      <section v-if="searchHistory.length > 0 && !searchQuery" class="search-section animate-slide-up">
        <div class="section-top">
          <h3 class="section-title">Recent Searches</h3>
          <button class="text-link">Clear</button>
        </div>
        <div class="history-list">
          <div 
            v-for="item in searchHistory" 
            :key="item" 
            class="history-item tap-active"
            @click="handleSearch(item)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{{ item }}</span>
          </div>
        </div>
      </section>

      <!-- Popular Categories -->
      <section class="search-section animate-slide-up" :style="{ animationDelay: '0.1s' }">
        <h3 class="section-title">Explore Categories</h3>
        <div class="category-grid">
          <button 
            v-for="cat in categories" 
            :key="cat.id" 
            class="cat-card tap-active"
            @click="$emit('select-category', cat.name)"
          >
            <div class="cat-content">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-tag" v-if="categoryExamples[cat.name]">
                {{ categoryExamples[cat.name] }}
              </span>
            </div>
            <div class="cat-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
        </div>
      </section>

      <!-- Search Inspiration -->
      <div v-if="!searchQuery" class="search-inspiration animate-fade">
        <div class="inspire-card">
          <div class="inspire-icon">✨</div>
          <h4>Find your unique fit</h4>
          <p>Search for "Kente", "Custom Suits", or "Wedding Wear" to discover artisanal pieces.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  background-color: var(--wood-deep);
  min-height: 100vh;
}

.search-header-glass {
  position: sticky;
  top: 0;
  padding: 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(15px);
  z-index: 100;
  display: flex;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
}

.search-input-box {
  flex: 1;
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  transition: all 0.3s ease;
}

.search-input-box.focused {
  border-color: var(--accent-amber);
  background: var(--wood-polished);
  box-shadow: 0 0 15px var(--accent-glow);
}

.search-icon {
  color: var(--text-muted);
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
}

.clear-btn {
  color: var(--text-muted);
}

.search-content {
  padding: 24px 16px;
}

.search-section {
  margin-bottom: 32px;
}

.section-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.text-link {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-amber);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--wood-walnut);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.category-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.cat-card {
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}

.cat-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.cat-tag {
  font-size: 11px;
  color: var(--accent-amber);
  font-weight: 600;
}

.cat-arrow {
  color: var(--text-muted);
}

.search-inspiration {
  margin-top: 40px;
}

.inspire-card {
  background: linear-gradient(135deg, var(--wood-walnut) 0%, var(--wood-deep) 100%);
  border: 1px solid var(--glass-border);
  padding: 30px 20px;
  border-radius: 20px;
  text-align: center;
}

.inspire-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.inspire-card h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 800;
}

.inspire-card p {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}

.back-btn {
  background-color: var(--wood-walnut) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-primary) !important;
}
</style>