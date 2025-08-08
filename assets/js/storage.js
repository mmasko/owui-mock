/**
 * Storage Module
 * Handles localStorage operations for chat persistence
 */

class StorageManager {
    constructor() {
        this.storageKey = 'mockChatAssistant_v2';
        this.maxChats = 50; // Limit stored chats to prevent localStorage bloat
        this.maxMessagesPerChat = 100; // Limit messages per chat
    }

    /**
     * Initialize storage and migrate old data if needed
     */
    init() {
        try {
            // Test localStorage availability
            const testKey = 'test_storage';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            // Initialize storage structure if it doesn't exist
            if (!this.getStorageData()) {
                this.initializeStorage();
            }
            
            console.log('Storage initialized successfully');
            return true;
        } catch (error) {
            console.warn('localStorage not available:', error);
            return false;
        }
    }

    /**
     * Initialize empty storage structure
     */
    initializeStorage() {
        const initialData = {
            chats: [],
            currentChatId: null,
            settings: {
                version: '2.0',
                created: new Date().toISOString()
            }
        };
        
        this.saveStorageData(initialData);
    }

    /**
     * Get all storage data
     * @returns {Object|null} - Storage data or null if not available
     */
    getStorageData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading storage:', error);
            return null;
        }
    }

    /**
     * Save storage data
     * @param {Object} data - Data to save
     */
    saveStorageData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving storage:', error);
            return false;
        }
    }

    /**
     * Create a new chat session
     * @param {string} title - Optional chat title
     * @returns {string} - New chat ID
     */
    createNewChat(title = null) {
        const chatId = this.generateChatId();
        const chat = {
            id: chatId,
            title: title || 'New Chat',
            messages: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            messageCount: 0
        };

        const data = this.getStorageData();
        if (!data) return null;

        // Add new chat to beginning of array
        data.chats.unshift(chat);
        
        // Limit number of stored chats
        if (data.chats.length > this.maxChats) {
            data.chats = data.chats.slice(0, this.maxChats);
        }

        data.currentChatId = chatId;
        this.saveStorageData(data);

        console.log('Created new chat:', chatId);
        return chatId;
    }

    /**
     * Get a specific chat by ID
     * @param {string} chatId - Chat ID
     * @returns {Object|null} - Chat object or null
     */
    getChat(chatId) {
        const data = this.getStorageData();
        if (!data) return null;

        return data.chats.find(chat => chat.id === chatId) || null;
    }

    /**
     * Get all chats
     * @returns {Array} - Array of chat objects
     */
    getAllChats() {
        const data = this.getStorageData();
        return data ? data.chats : [];
    }

    /**
     * Add message to a chat
     * @param {string} chatId - Chat ID
     * @param {Object} message - Message object
     */
    addMessageToChat(chatId, message) {
        const data = this.getStorageData();
        if (!data) return false;

        const chat = data.chats.find(c => c.id === chatId);
        if (!chat) return false;

        // Add message with timestamp and ID
        const messageWithMeta = {
            id: this.generateMessageId(),
            timestamp: new Date().toISOString(),
            ...message
        };

        chat.messages.push(messageWithMeta);
        chat.messageCount = chat.messages.length;
        chat.updated = new Date().toISOString();

        // Update chat title based on first user message if still "New Chat"
        if (chat.title === 'New Chat' && message.type === 'user' && message.content) {
            chat.title = this.generateChatTitle(message.content);
        }

        // Limit messages per chat
        if (chat.messages.length > this.maxMessagesPerChat) {
            chat.messages = chat.messages.slice(-this.maxMessagesPerChat);
            chat.messageCount = chat.messages.length;
        }

        this.saveStorageData(data);
        return true;
    }

    /**
     * Delete a chat
     * @param {string} chatId - Chat ID to delete
     */
    deleteChat(chatId) {
        const data = this.getStorageData();
        if (!data) return false;

        const chatIndex = data.chats.findIndex(c => c.id === chatId);
        if (chatIndex === -1) return false;

        data.chats.splice(chatIndex, 1);

        // If this was the current chat, clear current chat ID
        if (data.currentChatId === chatId) {
            data.currentChatId = null;
        }

        this.saveStorageData(data);
        return true;
    }

    /**
     * Clear all chats
     */
    clearAllChats() {
        const data = this.getStorageData();
        if (!data) return false;

        data.chats = [];
        data.currentChatId = null;
        this.saveStorageData(data);
        return true;
    }

    /**
     * Set current chat ID
     * @param {string} chatId - Chat ID to set as current
     */
    setCurrentChat(chatId) {
        const data = this.getStorageData();
        if (!data) return false;

        data.currentChatId = chatId;
        this.saveStorageData(data);
        return true;
    }

    /**
     * Get current chat ID
     * @returns {string|null} - Current chat ID or null
     */
    getCurrentChatId() {
        const data = this.getStorageData();
        return data ? data.currentChatId : null;
    }

    /**
     * Generate unique chat ID
     * @returns {string} - Unique chat ID
     */
    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate unique message ID
     * @returns {string} - Unique message ID
     */
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate chat title from first message
     * @param {string} content - Message content
     * @returns {string} - Generated title
     */
    generateChatTitle(content) {
        // Take first 30 characters and clean up
        let title = content.trim().substring(0, 30);
        
        // Remove line breaks and extra spaces
        title = title.replace(/\s+/g, ' ');
        
        // Add ellipsis if truncated
        if (content.length > 30) {
            title += '...';
        }
        
        // Capitalize first letter
        title = title.charAt(0).toUpperCase() + title.slice(1);
        
        return title || 'New Chat';
    }

    /**
     * Get storage statistics
     * @returns {Object} - Storage stats
     */
    getStorageStats() {
        const data = this.getStorageData();
        if (!data) return null;

        const totalMessages = data.chats.reduce((sum, chat) => sum + chat.messageCount, 0);
        const storageSize = new Blob([JSON.stringify(data)]).size;

        return {
            totalChats: data.chats.length,
            totalMessages: totalMessages,
            storageSize: storageSize,
            storageSizeFormatted: this.formatBytes(storageSize),
            oldestChat: data.chats.length > 0 ? data.chats[data.chats.length - 1].created : null,
            newestChat: data.chats.length > 0 ? data.chats[0].created : null
        };
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Bytes to format
     * @returns {string} - Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Export all data (for backup)
     * @returns {string} - JSON string of all data
     */
    exportData() {
        const data = this.getStorageData();
        return data ? JSON.stringify(data, null, 2) : null;
    }

    /**
     * Check if storage is available
     * @returns {boolean} - Whether localStorage is available
     */
    isAvailable() {
        try {
            const testKey = 'test_storage_availability';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create global instance
window.StorageManager = StorageManager;