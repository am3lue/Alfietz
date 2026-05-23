<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { db } from '../../db/client'
import { useRoute } from 'vue-router'

const props = defineProps({
  userData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['go-back'])
const route = useRoute()

const otherUser = ref(null)
const messages = ref([])
const newMessage = ref('')
const loading = ref(true)
const messagesContainer = ref(null)
let pollInterval = null

const otherUserId = ref(route.params.userId)

const initChat = async () => {
  loading.value = true
  await fetchUserDetails()
  await fetchMessages(true)
  
  // Mark as read
  await markAsRead()
}

onMounted(async () => {
  await initChat()
  
  // Simulation of Real-time: Poll every 5 seconds
  pollInterval = setInterval(() => {
    fetchMessages(false)
  }, 5000)
})

watch(() => route.params.userId, async (newId) => {
  if (newId && newId !== otherUserId.value) {
    otherUserId.value = newId
    messages.value = []
    await initChat()
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

const fetchUserDetails = async () => {
  try {
    const res = await db.runAction('get_user_by_id', { userId: otherUserId.value });
    if (res.rows.length > 0) {
      otherUser.value = res.rows[0]
    }
  } catch (e) {
    console.error("Error fetching user details:", e)
  }
}

const fetchMessages = async (showLoading = false) => {
  try {
    if (showLoading) loading.value = true
    const res = await db.runAction('get_messages', { 
      userId: props.userData.id, 
      otherId: otherUserId.value 
    });
    
    // Only update if count changed to avoid unnecessary re-renders
    if (res.rows.length !== messages.value.length) {
      messages.value = res.rows
      if (!showLoading) {
        await markAsRead() // Clear notifications if new messages arrived while in chat
      }
    }
  } catch (e) {
    console.error("Error fetching messages:", e)
  } finally {
    if (showLoading) loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  const content = newMessage.value.trim()
  newMessage.value = ''
  
  try {
    await db.runAction('send_message', { 
      senderId: props.userData.id, 
      receiverId: otherUserId.value, 
      content 
    });
    
    // Add to local list for immediate feedback
    messages.value.push({
      id: Date.now(),
      sender_id: props.userData.id,
      receiver_id: otherUserId.value,
      content: content,
      created_at: new Date().toISOString()
    })
    
    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error("Error sending message:", e)
  }
}

const markAsRead = async () => {
  try {
    await db.runAction('mark_messages_read', { 
      senderId: otherUserId.value, 
      receiverId: props.userData.id 
    });
  } catch (e) {
    console.error("Error marking as read:", e)
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const addEmoji = (emoji) => {
  newMessage.value += emoji
}

watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })
</script>

<template>
  <div class="chat-detail-page">
    <div class="chat-header">
      <button class="back-btn" @click="$emit('go-back')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div v-if="otherUser" class="user-info">
        <img :src="otherUser.avatar || 'https://i.pravatar.cc/150'" alt="Avatar" class="header-avatar" />
        <div class="header-text">
          <h2 class="header-name">{{ otherUser.first_name }} {{ otherUser.last_name }}</h2>
          <span class="online-status">Online</span>
        </div>
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>
      <div v-else-if="messages.length === 0" class="empty-chat">
        <div class="heritage-icon">🏺</div>
        <p>Start a new conversation with this artisan.</p>
      </div>
      <div v-else class="messages-list">
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          class="message-wrapper"
          :class="{ 'sent': msg.sender_id === props.userData.id, 'received': msg.sender_id !== props.userData.id }"
        >
          <div class="message-bubble">
            <p class="message-content">{{ msg.content }}</p>
            <span class="message-time">
              {{ new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <div class="quick-emojis">
        <button 
          v-for="emoji in ['🏺', '✨', '🎨', '🧵', '💰', '📦', '🤝', '🦁', '🌍', '🔥']" 
          :key="emoji"
          class="emoji-btn"
          @click="addEmoji(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
      <div class="input-wrapper">
        <textarea 
          v-model="newMessage" 
          placeholder="Type your message..." 
          @keydown.enter.prevent="sendMessage"
          rows="1"
        ></textarea>
        <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-detail-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--wood-deep);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--wood-walnut);
  border-bottom: 1px solid var(--glass-border);
  z-index: 10;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.online-status {
  font-size: 11px;
  color: #10B981;
  font-weight: 600;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.heritage-icon { font-size: 40px; margin-bottom: 16px; }

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  display: flex;
  width: 100%;
}

.message-wrapper.sent { justify-content: flex-end; }
.message-wrapper.received { justify-content: flex-start; }

.message-bubble {
  max-width: 80%;
  padding: 12px 18px;
  border-radius: 18px;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  font-size: 15px;
  line-height: 1.5;
}

.sent .message-bubble {
  background: linear-gradient(135deg, var(--accent-amber), #B45309);
  color: white;
  border-bottom-right-radius: 4px;
}

.received .message-bubble {
  background: var(--wood-walnut);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--glass-border);
}

.message-time {
  font-size: 10px;
  opacity: 0.6;
  display: block;
  text-align: right;
  margin-top: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.chat-input-area {
  padding: 12px 20px 32px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
}

.quick-emojis {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.quick-emojis::-webkit-scrollbar { display: none; }

.emoji-btn {
  background: var(--wood-walnut);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.emoji-btn:hover {
  transform: scale(1.15);
  border-color: var(--accent-amber);
  background: var(--wood-polished);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--wood-walnut);
  border: 1.5px solid var(--glass-border);
  border-radius: 30px;
  padding: 8px 16px;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  border-color: var(--accent-amber);
  box-shadow: 0 0 15px var(--accent-glow);
}

.input-wrapper textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--input-text);
  padding: 8px 0;
  font-size: 15px;
  outline: none;
  resize: none;
  max-height: 120px;
}

.send-btn {
  background: none;
  border: none;
  color: var(--accent-amber);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-btn:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.send-btn:not(:disabled):hover {
  transform: scale(1.1);
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
