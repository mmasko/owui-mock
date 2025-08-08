/**
 * Main Application Entry Point
 * Initializes and coordinates all modules
 */

class App {
    constructor() {
        this.uiManager = null;
        this.messageMatcher = null;
        this.chatManager = null;
        this.storageManager = null;
        this.sidebarManager = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Mock Chat Assistant v2...');

            // Create instances of all modules
            this.storageManager = new StorageManager();
            this.uiManager = new UIManager();
            this.messageMatcher = new MessageMatcher();
            this.chatManager = new ChatManager();
            this.sidebarManager = new SidebarManager();

            // Initialize storage first
            const storageInitialized = this.storageManager.init();
            if (!storageInitialized) {
                console.warn('Storage not available, running without persistence');
            }

            // Initialize UI
            const uiInitialized = this.uiManager.init();
            if (!uiInitialized) {
                throw new Error('Failed to initialize UI');
            }

            // Initialize chat manager (this will load the message rules)
            const chatInitialized = await this.chatManager.init(this.uiManager, this.messageMatcher, this.storageManager);
            if (!chatInitialized) {
                throw new Error('Failed to initialize chat manager');
            }

            // Initialize sidebar
            const sidebarInitialized = this.sidebarManager.init(this.storageManager, this.chatManager);
            if (!sidebarInitialized) {
                throw new Error('Failed to initialize sidebar');
            }

            // Set up global references for cross-module communication
            window.chatManager = this.chatManager;
            window.uiManager = this.uiManager;
            window.messageMatcher = this.messageMatcher;
            window.storageManager = this.storageManager;
            window.sidebarManager = this.sidebarManager;

            // Override the UI manager's handleSendMessage to use chat manager
            this.setupMessageHandling();

            // Load existing chat or create new one
            this.initializeChat();

            this.isInitialized = true;
            console.log('Mock Chat Assistant v2 initialized successfully!');

            // Show welcome message if needed
            this.showWelcomeMessage();

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showInitializationError(error.message);
        }
    }

    /**
     * Set up message handling integration between UI and Chat managers
     */
    setupMessageHandling() {
        // Override the UI manager's message processing to use chat manager
        const originalHandleSendMessage = this.uiManager.handleSendMessage.bind(this.uiManager);
        
        this.uiManager.handleSendMessage = () => {
            const message = this.uiManager.getInputValue();
            if (!message) return;

            // Disable send button temporarily
            this.uiManager.setSendButtonState(false);

            // Add user message to chat
            this.uiManager.addMessage(message, 'user');

            // Clear input
            this.uiManager.clearInput();

            // Process through chat manager
            this.chatManager.processUserInput(message);
        };
    }

    /**
     * Show welcome message with instructions
     */
    showWelcomeMessage() {
        // The welcome message is already in the HTML, but we can add additional context
        setTimeout(() => {
            if (this.isInitialized) {
                console.log('Ready for user interaction');
                // Focus on input field
                this.uiManager.focusInput();
            }
        }, 500);
    }

    /**
     * Show initialization error
     * @param {string} errorMessage - Error message to display
     */
    showInitializationError(errorMessage) {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            const errorElement = document.createElement('div');
            errorElement.className = 'message message--system message--error';
            errorElement.innerHTML = `
                <div class="message__content">
                    <strong>Initialization Error:</strong><br>
                    ${errorMessage}<br><br>
                    Please refresh the page and try again.
                </div>
            `;
            chatMessages.appendChild(errorElement);
        }

        // Disable input
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.querySelector('.composer__send');
        if (messageInput) messageInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
    }

    /**
     * Handle application errors
     * @param {Error} error - Error object
     */
    handleError(error) {
        console.error('Application error:', error);
        
        if (this.chatManager) {
            this.chatManager.showErrorMessage('An unexpected error occurred. Please refresh the page.');
        }
    }

    /**
     * Initialize chat - load existing or create new
     */
    initializeChat() {
        if (!this.storageManager.isAvailable()) {
            // No storage available, just start a new chat
            this.chatManager.startNewChat();
            return;
        }

        // Check if there's a current chat to resume
        const currentChatId = this.storageManager.getCurrentChatId();
        const allChats = this.storageManager.getAllChats();

        if (currentChatId && this.storageManager.getChat(currentChatId)) {
            // Resume existing chat
            this.chatManager.loadChat(currentChatId);
            this.sidebarManager.selectChat(currentChatId);
        } else if (allChats.length > 0) {
            // Load the most recent chat
            const mostRecentChat = allChats[0];
            this.chatManager.loadChat(mostRecentChat.id);
            this.sidebarManager.selectChat(mostRecentChat.id);
        } else {
            // No existing chats, create a new one
            const newChatId = this.chatManager.startNewChat();
            this.sidebarManager.selectChat(newChatId);
        }
    }

    /**
     * Check if application is ready
     * @returns {boolean} - Whether app is initialized and ready
     */
    isReady() {
        return this.isInitialized &&
               this.chatManager &&
               this.chatManager.isReady();
    }

    /**
     * Get application status for debugging
     * @returns {Object} - Status object
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            uiReady: this.uiManager !== null,
            matcherReady: this.messageMatcher && this.messageMatcher.isReady(),
            chatReady: this.chatManager && this.chatManager.isReady(),
            sidebarReady: this.sidebarManager !== null,
            storageReady: this.storageManager && this.storageManager.isAvailable(),
            rulesLoaded: this.messageMatcher ? this.messageMatcher.getAllRules().length : 0,
            totalChats: this.storageManager ? this.storageManager.getAllChats().length : 0
        };
    }
}

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app) {
        window.app.handleError(event.error);
    }
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app) {
        window.app.handleError(new Error(event.reason));
    }
});

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing application...');
    
    // Create and initialize app
    window.app = new App();
    await window.app.init();
});

/**
 * Handle page visibility changes (optional enhancement)
 */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.app && window.uiManager) {
        // Refocus input when page becomes visible
        setTimeout(() => {
            window.uiManager.focusInput();
        }, 100);
    }
});

/**
 * Expose debug functions to global scope (for development/testing)
 */
window.debugChat = {
    getStatus: () => window.app ? window.app.getStatus() : null,
    getRules: () => window.messageMatcher ? window.messageMatcher.getAllRules() : null,
    getHistory: () => window.chatManager ? window.chatManager.getMessageHistory() : null,
    clearChat: () => window.chatManager ? window.chatManager.clearChat() : null,
    testMessage: (msg) => window.chatManager ? window.chatManager.processUserMessage(msg) : null
};

console.log('Mock Chat Assistant script loaded. Debug functions available at window.debugChat');