<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../../db/client'

const props = defineProps({
  userData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['go-back', 'go-chat'])

const STORAGE_KEY = 'alfie_chats_cache'

const conversations = ref([])
const loading = ref(true)

onMounted(async () => {
  // 1. Instant Cache Load
  const cached = localStorage.getItem(STORAGE_KEY)
  if (cached) {
    try {
      conversations.value = JSON.parse(cached)
      loading.value = false // Skip loading state if we have a cache
    } catch (e) {
      console.warn("Failed to parse chat cache")
    }
  }
  
  // 2. Background Refresh
  await fetchConversations()
})

const fetchConversations = async () => {
  try {
    const res = await db.runAction('get_chats', { userId: props.userData.id })
    
    const newConversations = res.rows.map(r => ({
      id: r.id,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username,
      avatar: r.avatar,
      lastMessage: r.last_message || 'No messages yet',
      time: r.last_message_time ? new Date(r.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      unread: r.unread_count > 0
    }))

    // 3. Smart Update (Only update and cache if data changed)
    if (JSON.stringify(newConversations) !== JSON.stringify(conversations.value)) {
      conversations.value = newConversations
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConversations))
    }
  } catch (e) {
    console.error("Error fetching conversations:", e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="chat-list-page animate-fade">
    <div class="header-row">
      <button class="back-btn tap-active" @click="$emit('go-back')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div class="header-text">
        <h1 class="title">Tribe Conversations</h1>
        <p class="subtitle">Whispers of the heritage</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="heritage-spinner"></div>
      <p class="loading-msg">Summoning your whispers...</p>
    </div>

    <div v-else-if="conversations.length === 0" class="empty-state">
      <div class="empty-icon">💬</div>
      <p>No conversations yet. Reach out to a tailor to start your heritage journey!</p>
    </div>

    <div v-else class="conversations-list">
      <div 
        v-for="convo in conversations" 
        :key="convo.id" 
        class="convo-card"
        @click="$emit('go-chat', convo.id)"
      >
        <div class="avatar-box">
          <img :src="convo.avatar || 'https://i.pravatar.cc/150'" alt="Avatar" />
          <div v-if="convo.unread" class="unread-dot"></div>
        </div>
        <div class="convo-info">
          <div class="convo-header">
            <h3 class="convo-name">{{ convo.name }}</h3>
            <span class="convo-time">{{ convo.time }}</span>
          </div>
          <p class="last-message" :class="{ unread: convo.unread }">{{ convo.lastMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-list-page {
  padding: 40px 24px;
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--wood-deep);
}

.header-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

.subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-amber);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 2px 0 0 0;
}

.heritage-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(217, 119, 6, 0.1);
  border-top-color: var(--accent-amber);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-msg {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-muted);
}

.empty-icon { font-size: 48px; margin-bottom: 20px; }

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.convo-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.convo-card:hover {
  border-color: var(--accent-amber);
  transform: translateX(4px);
}

.avatar-box {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--glass-border);
  flex-shrink: 0;
}

.avatar-box img { width: 100%; height: 100%; object-fit: cover; }

.unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: var(--accent-amber);
  border: 2px solid var(--wood-walnut);
  border-radius: 50%;
}

.convo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.convo-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.convo-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.convo-time {
  font-size: 12px;
  color: var(--text-muted);
}

.last-message {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.last-message.unread {
  color: var(--text-primary);
  font-weight: 600;
}

.back-btn {
  background-color: var(--wood-walnut) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-primary) !important;
  transition: all 0.2s ease !important;
}

.back-btn:hover {
  background-color: var(--wood-polished) !important;
  border-color: var(--accent-amber) !important;
}
</style>
