/**
 * Sidebar Module
 * Handles chat history sidebar functionality
 */

class SidebarManager {
    constructor() {
        this.sidebar = null;
        this.chatHistory = null;
        this.emptyState = null;
        this.newChatBtn = null;
        this.clearAllBtn = null;
        this.sidebarToggle = null;
        this.currentChatTitle = null;
        
        this.storageManager = null;
        this.chatManager = null;
        
        this.isCollapsed = false;
        this.selectedChatId = null;
    }

    /**
     * Initialize sidebar
     * @param {StorageManager} storageManager - Storage manager instance
     * @param {ChatManager} chatManager - Chat manager instance
     */
    init(storageManager, chatManager) {
        this.storageManager = storageManager;
        this.chatManager = chatManager;

        // Get DOM elements
        this.sidebar = document.getElementById('sidebar');
        this.chatHistory = document.getElementById('chatHistory');
        this.emptyState = document.getElementById('emptyState');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.currentChatTitle = document.getElementById('currentChatTitle');

        if (!this.sidebar || !this.chatHistory || !this.newChatBtn) {
            console.error('Required sidebar DOM elements not found');
            return false;
        }

        this.setupEventListeners();
        this.loadChatHistory();
        this.updateEmptyState();

        // Check for mobile and collapse sidebar initially
        if (window.innerWidth <= 768) {
            this.collapseSidebar();
        }

        console.log('Sidebar initialized successfully');
        return true;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // New chat button
        this.newChatBtn.addEventListener('click', () => {
            this.createNewChat();
        });

        // Clear all button
        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', () => {
                this.showClearAllConfirmation();
            });
        }

        // Sidebar toggle for mobile
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle clicks outside sidebar on mobile
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });
    }

    /**
     * Load and display chat history
     */
    loadChatHistory() {
        const chats = this.storageManager.getAllChats();
        this.chatHistory.innerHTML = '';

        chats.forEach(chat => {
            this.addChatToHistory(chat);
        });

        this.updateEmptyState();
    }

    /**
     * Add a chat to the history display
     * @param {Object} chat - Chat object
     */
    addChatToHistory(chat) {
        const chatElement = document.createElement('div');
        chatElement.className = 'sidebar__chat-item';
        chatElement.setAttribute('data-chat-id', chat.id);
        chatElement.setAttribute('role', 'listitem');
        chatElement.setAttribute('tabindex', '0');

        const isSelected = chat.id === this.selectedChatId;
        if (isSelected) {
            chatElement.classList.add('sidebar__chat-item--selected');
        }

        chatElement.innerHTML = `
            <div class="sidebar__chat-content">
                <div class="sidebar__chat-title">${this.escapeHtml(chat.title)}</div>
                <div class="sidebar__chat-meta">
                    <span class="sidebar__chat-date">${this.formatDate(chat.updated)}</span>
                    <span class="sidebar__chat-count">${chat.messageCount} messages</span>
                </div>
            </div>
            <button class="sidebar__chat-delete" aria-label="Delete chat" data-chat-id="${chat.id}">
                <span class="sidebar__chat-delete-icon">×</span>
            </button>
        `;

        // Add event listeners
        chatElement.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar__chat-delete')) {
                this.selectChat(chat.id);
            }
        });

        chatElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectChat(chat.id);
            }
        });

        // Delete button
        const deleteBtn = chatElement.querySelector('.sidebar__chat-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDeleteConfirmation(chat.id, chat.title);
        });

        this.chatHistory.appendChild(chatElement);
    }

    /**
     * Create a new chat
     */
    createNewChat() {
        const chatId = this.storageManager.createNewChat();
        if (chatId) {
            this.selectChat(chatId);
            this.loadChatHistory(); // Refresh the sidebar
            
            // Collapse sidebar on mobile after creating new chat
            if (window.innerWidth <= 768) {
                this.collapseSidebar();
            }
        }
    }

    /**
     * Select a chat and load it
     * @param {string} chatId - Chat ID to select
     */
    selectChat(chatId) {
        const chat = this.storageManager.getChat(chatId);
        if (!chat) return;

        // Update selected state in UI
        this.selectedChatId = chatId;
        this.updateSelectedChatUI();

        // Update current chat title
        this.updateCurrentChatTitle(chat.title);

        // Load chat in main area
        if (this.chatManager) {
            this.chatManager.loadChat(chatId);
        }

        // Set as current chat in storage
        this.storageManager.setCurrentChat(chatId);

        // Collapse sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            this.collapseSidebar();
        }
    }

    /**
     * Update selected chat UI
     */
    updateSelectedChatUI() {
        // Remove previous selection
        const previousSelected = this.chatHistory.querySelector('.sidebar__chat-item--selected');
        if (previousSelected) {
            previousSelected.classList.remove('sidebar__chat-item--selected');
        }

        // Add selection to current chat
        if (this.selectedChatId) {
            const currentSelected = this.chatHistory.querySelector(`[data-chat-id="${this.selectedChatId}"]`);
            if (currentSelected) {
                currentSelected.classList.add('sidebar__chat-item--selected');
            }
        }
    }

    /**
     * Update current chat title in header
     * @param {string} title - Chat title
     */
    updateCurrentChatTitle(title) {
        if (this.currentChatTitle) {
            this.currentChatTitle.textContent = title;
        }
    }

    /**
     * Show delete confirmation dialog
     * @param {string} chatId - Chat ID to delete
     * @param {string} chatTitle - Chat title for confirmation
     */
    showDeleteConfirmation(chatId, chatTitle) {
        const confirmed = confirm(`Delete chat "${chatTitle}"?\n\nThis action cannot be undone.`);
        if (confirmed) {
            this.deleteChat(chatId);
        }
    }

    /**
     * Delete a chat
     * @param {string} chatId - Chat ID to delete
     */
    deleteChat(chatId) {
        const success = this.storageManager.deleteChat(chatId);
        if (success) {
            // If this was the selected chat, create a new one
            if (chatId === this.selectedChatId) {
                this.createNewChat();
            }
            
            this.loadChatHistory();
            console.log('Chat deleted:', chatId);
        }
    }

    /**
     * Show clear all confirmation dialog
     */
    showClearAllConfirmation() {
        const chatCount = this.storageManager.getAllChats().length;
        if (chatCount === 0) return;

        const confirmed = confirm(`Delete all ${chatCount} chats?\n\nThis action cannot be undone.`);
        if (confirmed) {
            this.clearAllChats();
        }
    }

    /**
     * Clear all chats
     */
    clearAllChats() {
        const success = this.storageManager.clearAllChats();
        if (success) {
            this.selectedChatId = null;
            this.loadChatHistory();
            this.createNewChat(); // Start with a fresh chat
            console.log('All chats cleared');
        }
    }

    /**
     * Update empty state visibility
     */
    updateEmptyState() {
        const chats = this.storageManager.getAllChats();
        const isEmpty = chats.length === 0;

        if (this.emptyState) {
            this.emptyState.style.display = isEmpty ? 'block' : 'none';
        }
        
        this.chatHistory.style.display = isEmpty ? 'none' : 'block';
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        if (this.isCollapsed) {
            this.expandSidebar();
        } else {
            this.collapseSidebar();
        }
    }

    /**
     * Collapse sidebar
     */
    collapseSidebar() {
        this.sidebar.classList.add('sidebar--collapsed');
        this.isCollapsed = true;
        
        if (this.sidebarToggle) {
            this.sidebarToggle.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Expand sidebar
     */
    expandSidebar() {
        this.sidebar.classList.remove('sidebar--collapsed');
        this.isCollapsed = false;
        
        if (this.sidebarToggle) {
            this.sidebarToggle.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (window.innerWidth > 768 && this.isCollapsed) {
            this.expandSidebar();
        } else if (window.innerWidth <= 768 && !this.isCollapsed) {
            this.collapseSidebar();
        }
    }

    /**
     * Handle clicks outside sidebar on mobile
     * @param {Event} e - Click event
     */
    handleOutsideClick(e) {
        if (window.innerWidth <= 768 && !this.isCollapsed) {
            if (!this.sidebar.contains(e.target) && !this.sidebarToggle.contains(e.target)) {
                this.collapseSidebar();
            }
        }
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get selected chat ID
     * @returns {string|null} - Selected chat ID
     */
    getSelectedChatId() {
        return this.selectedChatId;
    }

    /**
     * Refresh chat history display
     */
    refresh() {
        this.loadChatHistory();
    }

    /**
     * Update chat in sidebar when it changes
     * @param {string} chatId - Chat ID that was updated
     */
    updateChatInSidebar(chatId) {
        const chat = this.storageManager.getChat(chatId);
        if (!chat) return;

        const chatElement = this.chatHistory.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            // Update title and meta info
            const titleElement = chatElement.querySelector('.sidebar__chat-title');
            const dateElement = chatElement.querySelector('.sidebar__chat-date');
            const countElement = chatElement.querySelector('.sidebar__chat-count');

            if (titleElement) titleElement.textContent = chat.title;
            if (dateElement) dateElement.textContent = this.formatDate(chat.updated);
            if (countElement) countElement.textContent = `${chat.messageCount} messages`;

            // Move to top of list if it's not already there
            if (chatElement !== this.chatHistory.firstChild) {
                this.chatHistory.insertBefore(chatElement, this.chatHistory.firstChild);
            }
        } else {
            // Chat doesn't exist in sidebar, refresh the whole list
            this.loadChatHistory();
        }

        // Update current chat title if this is the selected chat
        if (chatId === this.selectedChatId) {
            this.updateCurrentChatTitle(chat.title);
        }
    }
}

// Create global instance
window.SidebarManager = SidebarManager;