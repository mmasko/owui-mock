/**
 * Chat Module
 * Handles chat functionality and coordinates between UI and message matching
 */

class ChatManager {
    constructor() {
        this.uiManager = null;
        this.messageMatcher = null;
        this.storageManager = null;
        this.isInitialized = false;
        this.currentChatId = null;
        this.messageHistory = [];
    }

    /**
     * Initialize the chat manager
     * @param {UIManager} uiManager - UI manager instance
     * @param {MessageMatcher} messageMatcher - Message matcher instance
     * @param {StorageManager} storageManager - Storage manager instance
     */
    async init(uiManager, messageMatcher, storageManager) {
        this.uiManager = uiManager;
        this.messageMatcher = messageMatcher;
        this.storageManager = storageManager;

        try {
            // Load message matching rules
            await this.messageMatcher.loadRules();
            
            this.isInitialized = true;
            console.log('Chat manager initialized successfully');
            
            // Focus on input field
            this.uiManager.focusInput();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize chat manager:', error);
            this.showErrorMessage('Failed to initialize chat system. Please refresh the page.');
            return false;
        }
    }

    /**
     * Process user message and generate response
     * @param {string} userMessage - The user's message
     */
    async processUserMessage(userMessage) {
        if (!this.isInitialized) {
            console.error('Chat manager not initialized');
            return;
        }

        // Ensure we have a current chat
        if (!this.currentChatId) {
            this.currentChatId = this.storageManager.createNewChat();
        }

        // Add user message to storage
        const userMessageObj = {
            type: 'user',
            content: userMessage
        };
        
        this.storageManager.addMessageToChat(this.currentChatId, userMessageObj);

        // Add to local message history
        this.messageHistory.push({
            type: 'user',
            content: userMessage,
            timestamp: new Date()
        });

        // Show loading state
        const loadingElement = this.uiManager.showLoading();

        try {
            // Small delay to show loading state
            await this.delay(300);

            // Get response from message matcher
            const response = this.messageMatcher.processInput(userMessage);
            
            // Remove loading state
            this.uiManager.removeLoading(loadingElement);

            // Handle response based on current mode and response type
            await this.handleResponse(response, userMessage);

        } catch (error) {
            console.error('Error processing message:', error);
            this.uiManager.removeLoading(loadingElement);
            this.showErrorMessage('Sorry, I encountered an error processing your message.');
        }
    }

    /**
     * Handle the response from message matcher
     * @param {Object} response - Response object with type and value
     * @param {string} originalMessage - Original user message for context
     */
    async handleResponse(response, originalMessage) {
        const isImageMode = this.uiManager.isInImageMode();
        
        // Determine if we should show image or text based on mode and response type
        let shouldShowImage = false;
        let finalResponse = response;

        if (isImageMode && response.type === 'text') {
            // In image mode but got text response - try to find an image alternative
            const imageResponse = this.findImageAlternative(originalMessage);
            if (imageResponse) {
                finalResponse = imageResponse;
                shouldShowImage = true;
            }
        } else if (response.type === 'image') {
            shouldShowImage = true;
        }

        // Prepare options for UI message
        const messageOptions = {
            isImage: shouldShowImage
        };

        // Add follow-up suggestions if available
        if (finalResponse.followup && finalResponse.followup.length > 0) {
            messageOptions.followup = finalResponse.followup;
        }

        // Add response to chat
        this.uiManager.addMessage(finalResponse.value, 'assistant', messageOptions);

        // Create assistant message object
        const assistantMessageObj = {
            type: 'assistant',
            content: finalResponse.value,
            responseType: shouldShowImage ? 'image' : 'text',
            followup: finalResponse.followup || []
        };

        // Add to storage
        if (this.currentChatId) {
            this.storageManager.addMessageToChat(this.currentChatId, assistantMessageObj);
            
            // Update sidebar if available
            if (window.sidebarManager) {
                window.sidebarManager.updateChatInSidebar(this.currentChatId);
            }
        }

        // Add to local message history
        this.messageHistory.push({
            type: 'assistant',
            content: finalResponse.value,
            responseType: shouldShowImage ? 'image' : 'text',
            followup: finalResponse.followup || [],
            timestamp: new Date()
        });

        // Announce response to screen readers
        const announcement = shouldShowImage ?
            'Assistant sent an image response' :
            `Assistant: ${finalResponse.value}`;
        this.uiManager.announceToScreenReader(announcement);
    }

    /**
     * Try to find an image alternative for text responses when in image mode
     * @param {string} userMessage - Original user message
     * @returns {Object|null} - Image response object or null
     */
    findImageAlternative(userMessage) {
        // Get all rules and look for image responses that might match
        const allRules = this.messageMatcher.getAllRules();
        
        for (const rule of allRules) {
            if (rule.type === 'image' && this.messageMatcher.matchesRule(userMessage, rule)) {
                return {
                    type: 'image',
                    value: rule.value
                };
            }
        }

        // If no image alternative found, check for generic image responses
        const genericImageRules = allRules.filter(rule => 
            rule.type === 'image' && 
            (rule.match.includes('demo') || rule.match.includes('screenshot'))
        );

        if (genericImageRules.length > 0) {
            return {
                type: 'image',
                value: genericImageRules[0].value
            };
        }

        return null;
    }

    /**
     * Show error message in chat
     * @param {string} errorMessage - Error message to display
     */
    showErrorMessage(errorMessage) {
        this.uiManager.addMessage(errorMessage, 'system');
    }

    /**
     * Show system message in chat
     * @param {string} message - System message to display
     */
    showSystemMessage(message) {
        this.uiManager.addMessage(message, 'system');
    }

    /**
     * Clear chat history
     */
    clearChat() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            // Keep only the welcome message
            const welcomeMessage = chatMessages.querySelector('.message--system');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
        }
        
        this.messageHistory = [];
        this.uiManager.focusInput();
    }

    /**
     * Get message history
     * @returns {Array} - Array of message history objects
     */
    getMessageHistory() {
        return [...this.messageHistory];
    }

    /**
     * Check if chat manager is ready
     * @returns {boolean} - Whether chat manager is initialized and ready
     */
    isReady() {
        return this.isInitialized && this.messageMatcher.isReady();
    }

    /**
     * Utility function to create delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle special commands (for debugging/testing)
     * @param {string} command - Command to handle
     */
    handleSpecialCommand(command) {
        const lowerCommand = command.toLowerCase().trim();
        
        switch (lowerCommand) {
            case '/clear':
                this.clearChat();
                this.showSystemMessage('Chat cleared.');
                return true;
                
            case '/help':
                this.showSystemMessage('Available commands: /clear (clear chat), /history (show history), /rules (show matching rules)');
                return true;
                
            case '/history':
                const historyText = this.messageHistory.length > 0 ? 
                    `Message history (${this.messageHistory.length} messages)` : 
                    'No message history yet.';
                this.showSystemMessage(historyText);
                return true;
                
            case '/rules':
                const rulesCount = this.messageMatcher.getAllRules().length;
                this.showSystemMessage(`Loaded ${rulesCount} matching rules.`);
                return true;
                
            default:
                return false;
        }
    }

    /**
     * Load a chat from storage
     * @param {string} chatId - Chat ID to load
     */
    loadChat(chatId) {
        const chat = this.storageManager.getChat(chatId);
        if (!chat) {
            console.error('Chat not found:', chatId);
            return false;
        }

        // Set current chat
        this.currentChatId = chatId;
        
        // Clear current UI
        this.clearChatUI();
        
        // Load messages into UI
        chat.messages.forEach(message => {
            if (message.type === 'user') {
                this.uiManager.addMessage(message.content, 'user');
            } else if (message.type === 'assistant') {
                const isImage = message.responseType === 'image';
                const options = {
                    isImage,
                    followup: message.followup || []
                };
                this.uiManager.addMessage(message.content, 'assistant', options);
            }
        });

        // Update local message history
        this.messageHistory = chat.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
        }));

        console.log('Loaded chat:', chatId, 'with', chat.messages.length, 'messages');
        return true;
    }

    /**
     * Clear chat UI (but keep welcome message)
     */
    clearChatUI() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            // Keep only the welcome message
            const welcomeMessage = chatMessages.querySelector('.message--system');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
        }
    }

    /**
     * Start a new chat
     * @param {string} chatId - Optional chat ID to use
     */
    startNewChat(chatId = null) {
        if (chatId) {
            this.currentChatId = chatId;
        } else {
            this.currentChatId = this.storageManager.createNewChat();
        }
        
        this.clearChatUI();
        this.messageHistory = [];
        this.uiManager.focusInput();
        
        console.log('Started new chat:', this.currentChatId);
        return this.currentChatId;
    }

    /**
     * Get current chat ID
     * @returns {string|null} - Current chat ID
     */
    getCurrentChatId() {
        return this.currentChatId;
    }

    /**
     * Process user input (including special commands)
     * @param {string} userInput - Raw user input
     */
    processUserInput(userInput) {
        const trimmedInput = userInput.trim();
        
        // Check for special commands
        if (trimmedInput.startsWith('/')) {
            if (this.handleSpecialCommand(trimmedInput)) {
                return; // Command handled, don't process as regular message
            }
        }
        
        // Process as regular message
        this.processUserMessage(trimmedInput);
    }
}

// Create global instance
window.ChatManager = ChatManager;