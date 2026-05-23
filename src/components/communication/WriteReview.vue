<!-------- (WriteReview.vue) ./src/components/WriteReview.vue ------------>
<script setup>
import { ref, computed } from 'vue'

const reviewText = ref('')
const rating = ref(5)
const maxChars = 350
const selectedTags = ref([])

const tags = [
  'Excellent Quality', 'Perfect Fit', 'Vibrant Colors', 
  'Fast Delivery', 'Great Material', 'Unique Design',
  'Authentic', 'Highly Recommend'
]

const remainingChars = computed(() => maxChars - reviewText.value.length)

const toggleTag = (tag) => {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter(t => t !== tag)
    // Remove tag text from textarea if it was added automatically? 
    // Or just use tags as metadata. Let's use them as metadata/shortcuts.
    if (reviewText.value.includes(tag)) {
      reviewText.value = reviewText.value.replace(new RegExp(`\\s*#${tag.replace(/\s+/g, '')}`, 'g'), '').trim()
    }
  } else {
    selectedTags.value.push(tag)
    const tagText = ` #${tag.replace(/\s+/g, '')}`
    if (reviewText.value.length + tagText.length <= maxChars) {
      reviewText.value += (reviewText.value ? ' ' : '') + tagText
    }
  }
}

defineEmits(['go-back', 'submit'])
</script>

<template>
  <div class="write-review-page">
    <div class="header-row">
      <button class="back-btn tap-active" @click="$emit('go-back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1 class="title">Share Your Experience</h1>
    </div>

    <div class="form-container">
      <div class="rating-selection">
        <p class="rating-label">How would you rate this piece?</p>
        <div class="stars">
          <button 
            v-for="star in 5" 
            :key="star" 
            class="star-btn"
            :class="{ active: star <= rating, 'pulse': star === rating }"
            @click="rating = star"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" :fill="star <= rating ? 'var(--accent-amber)' : 'none'" :stroke="star <= rating ? 'var(--accent-amber)' : 'rgba(255,255,255,0.2)'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>
        <p class="rating-text-feedback">
          {{ ['Poor', 'Fair', 'Good', 'Very Good', 'Exceptional'][rating - 1] }}
        </p>
      </div>

      <div class="input-group">
        <label class="group-label">Quick Tags</label>
        <div class="tags-cloud">
          <button 
            v-for="tag in tags" 
            :key="tag"
            class="tag-pill"
            :class="{ active: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <div class="input-group">
        <label class="group-label">Your Review</label>
        <div class="textarea-wrapper">
          <textarea 
            v-model="reviewText" 
            :maxlength="maxChars"
            placeholder="What did you love about this heritage piece? Mention the fit, material, or craftsmanship..." 
            class="review-input"
          ></textarea>
          <div class="char-count" :class="{ 'warning': remainingChars < 50 }">
            {{ remainingChars }}
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-action">
      <button 
        class="primary-btn" 
        :disabled="!reviewText.trim() && rating === 0"
        @click="$emit('submit', { rating, text: reviewText })"
      >
        <span>Submit Review</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.write-review-page {
  background-color: var(--wood-deep);
  min-height: 100vh;
  padding: 24px 20px 120px;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 40px;
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
}

.title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-amber);
  margin: 0;
  letter-spacing: -0.5px;
}

.form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.rating-selection {
  text-align: center;
  background: var(--wood-walnut);
  padding: 32px;
  border-radius: 24px;
  border: 1px solid var(--glass-border);
}

.rating-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.star-btn:hover {
  transform: scale(1.2);
}

.star-btn.active svg {
  filter: drop-shadow(0 0 8px var(--accent-glow));
}

.star-btn.pulse {
  animation: starPulse 0.5s ease;
}

@keyframes starPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.rating-text-feedback {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-amber);
  margin: 0;
  min-height: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-pill {
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-pill:hover {
  border-color: var(--accent-amber);
  color: var(--text-primary);
}

.tag-pill.active {
  background: var(--accent-amber);
  color: white;
  border-color: var(--accent-amber);
  box-shadow: 0 4px 12px var(--accent-glow);
}

.textarea-wrapper {
  position: relative;
}

.review-input {
  width: 100%;
  height: 200px;
  border: 2px solid var(--glass-border);
  border-radius: 20px;
  padding: 20px;
  font-size: 16px;
  color: var(--text-primary);
  outline: none;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
  background-color: var(--wood-walnut);
  transition: all 0.3s;
}

.review-input:focus {
  border-color: var(--accent-amber);
  box-shadow: 0 0 20px rgba(217, 164, 4, 0.1);
}

.char-count {
  position: absolute;
  bottom: 16px;
  right: 20px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--wood-deep);
  padding: 4px 8px;
  border-radius: 8px;
}

.char-count.warning {
  color: #EF4444;
}

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

.primary-btn:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 15px 30px var(--accent-glow);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.primary-btn:active:not(:disabled) {
  transform: scale(0.95);
}
</style>
