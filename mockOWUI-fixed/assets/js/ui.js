/**
 * UI Module
 * Handles DOM manipulation and rendering functions
 */

class UIManager {
    constructor() {
        this.chatMessages = null;
        this.messageInput = null;
        this.sendButton = null;
        this.modeToggle = null;
        this.chatForm = null;
        
        this.isImageMode = false;
        this.messageIdCounter = 0;
    }

    /**
     * Initialize UI elements and event listeners
     */
    init() {
        // Get DOM elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.querySelector('.composer__send');
        this.modeToggle = document.getElementById('modeToggle');
        this.chatForm = document.getElementById('chatForm');

        if (!this.chatMessages || !this.messageInput || !this.sendButton || !this.modeToggle || !this.chatForm) {
            console.error('Required DOM elements not found');
            return false;
        }

        this.setupEventListeners();
        this.updateModeToggle();
        
        console.log('UI initialized successfully');
        return true;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Mode toggle
        this.modeToggle.addEventListener('click', () => {
            this.toggleMode();
        });

        // Keyboard shortcuts
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            } else if (e.key === 'Escape') {
                this.clearInput();
            }
        });

        // Form submission
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });

        // Auto-resize input (if needed in future)
        this.messageInput.addEventListener('input', () => {
            this.adjustInputHeight();
        });
    }

    /**
     * Handle sending a message
     */
    handleSendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Disable send button temporarily
        this.setSendButtonState(false);

        // Add user message to chat
        this.addMessage(message, 'user');

        // Clear input
        this.clearInput();

        // Trigger message processing (will be handled by chat module)
        if (window.chatManager) {
            window.chatManager.processUserMessage(message);
        }
    }

    /**
     * Add a message to the chat
     * @param {string} content - Message content
     * @param {string} type - Message type: 'user', 'assistant', 'system'
     * @param {Object} options - Additional options
     */
    addMessage(content, type = 'assistant', options = {}) {
        const messageId = `message-${++this.messageIdCounter}`;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageElement = document.createElement('div');
        messageElement.className = `message message--${type}`;
        messageElement.id = messageId;
        messageElement.setAttribute('role', type === 'system' ? 'status' : 'article');

        let contentHtml = '';
        
        if (type === 'user') {
            // Handle user message
            const formattedContent = this.formatMessageContent(content);
            contentHtml = `
                <div class="message__content">
                    ${formattedContent}
                </div>
                <div class="message__timestamp">${timestamp}</div>
            `;
        } else if (type === 'assistant' || type === 'system') {
            // Handle assistant/system message with full structure
            if (options.isImage) {
                contentHtml = `
                    <div class="message__content">
                        <div class="message__header">
                            <span class="message__model-icon">🤖</span>
                            <span class="message__model-name">Meta Llama 4 Scout 17B Instruct</span>
                            <span class="message__metadata">${this.generateMetadata()}</span>
                        </div>
                        <div class="message__text">
                            <img src="${content}" alt="Response image" class="message__image"
                                 onerror="this.parentElement.innerHTML='<p>Image could not be loaded: ${content}</p>'">
                        </div>
                        ${this.generateActionButtons()}
                        ${options.followup ? this.generateFollowupSection(options.followup) : ''}
                    </div>
                `;
            } else {
                const formattedContent = this.formatMessageContent(content);
                contentHtml = `
                    <div class="message__content">
                        <div class="message__header">
                            <span class="message__model-icon">🤖</span>
                            <span class="message__model-name">Meta Llama 4 Scout 17B Instruct</span>
                            <span class="message__metadata">${this.generateMetadata()}</span>
                        </div>
                        <div class="message__text">
                            ${formattedContent}
                        </div>
                        ${this.generateActionButtons()}
                        ${options.followup ? this.generateFollowupSection(options.followup) : ''}
                    </div>
                `;
            }
        }

        messageElement.innerHTML = contentHtml;

        // Add event listeners for action buttons and follow-up suggestions
        this.setupMessageEventListeners(messageElement, options);

        // Add to chat
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.scrollToBottom();

        // Re-enable send button
        this.setSendButtonState(true);

        return messageElement;
    }

    /**
     * Format message content (handle line breaks, etc.)
     * @param {string} content - Raw content
     * @returns {string} - Formatted HTML content
     */
    formatMessageContent(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    /**
     * Clear the input field
     */
    clearInput() {
        this.messageInput.value = '';
        this.adjustInputHeight();
        this.messageInput.focus();
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * Toggle between text and image mode
     */
    toggleMode() {
        this.isImageMode = !this.isImageMode;
        this.updateModeToggle();
        
        // Announce mode change for screen readers
        const announcement = `Switched to ${this.isImageMode ? 'image' : 'text'} response mode`;
        this.announceToScreenReader(announcement);
    }

    /**
     * Update mode toggle button appearance
     */
    updateModeToggle() {
        const toggleText = this.modeToggle.querySelector('.mode-toggle__text');
        if (this.isImageMode) {
            toggleText.textContent = 'Image Mode';
            this.modeToggle.classList.add('mode-toggle--image');
            this.modeToggle.setAttribute('aria-pressed', 'true');
        } else {
            toggleText.textContent = 'Text Mode';
            this.modeToggle.classList.remove('mode-toggle--image');
            this.modeToggle.setAttribute('aria-pressed', 'false');
        }
    }

    /**
     * Set send button enabled/disabled state
     * @param {boolean} enabled - Whether button should be enabled
     */
    setSendButtonState(enabled) {
        this.sendButton.disabled = !enabled;
        this.sendButton.textContent = enabled ? 'Send' : 'Sending...';
    }

    /**
     * Adjust input height based on content
     */
    adjustInputHeight() {
        // Reset height to auto to get the correct scrollHeight
        this.messageInput.style.height = 'auto';
        
        // Set height based on scroll height, with min and max constraints
        const scrollHeight = this.messageInput.scrollHeight;
        const minHeight = 44; // Match CSS min-height
        const maxHeight = 120; // Match CSS max-height
        
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        this.messageInput.style.height = newHeight + 'px';
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loadingElement = this.addMessage('Thinking...', 'assistant', { isLoading: true });
        loadingElement.classList.add('message--loading');
        return loadingElement;
    }

    /**
     * Remove loading message
     * @param {HTMLElement} loadingElement - The loading element to remove
     */
    removeLoading(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Get current mode
     * @returns {boolean} - True if image mode, false if text mode
     */
    isInImageMode() {
        return this.isImageMode;
    }

    /**
     * Focus on input field
     */
    focusInput() {
        this.messageInput.focus();
    }

    /**
     * Get input value
     * @returns {string} - Current input value
     */
    getInputValue() {
        return this.messageInput.value.trim();
    }

    /**
     * Generate metadata for assistant messages
     * @returns {string} - Formatted metadata string
     */
    generateMetadata() {
        const responseTime = (Math.random() * 2 + 0.5).toFixed(2);
        const tokensPerSecond = (Math.random() * 20 + 25).toFixed(2);
        const tokens = Math.floor(Math.random() * 50 + 20);
        const cost = (tokens * 0.000001).toFixed(6);
        
        return `${responseTime} s | ${tokensPerSecond} T/s | ${tokens} Tokens | $${cost}`;
    }

    /**
     * Generate action buttons for assistant messages
     * @returns {string} - HTML for action buttons
     */
    generateActionButtons() {
        return `
            <div class="message__actions">
                <button class="message__action" data-action="edit" aria-label="Edit message">✏️</button>
                <button class="message__action" data-action="copy" aria-label="Copy message">📋</button>
                <button class="message__action" data-action="speak" aria-label="Speak message">🔊</button>
                <button class="message__action" data-action="info" aria-label="More options">ℹ️</button>
                <button class="message__action" data-action="like" aria-label="Like message">👍</button>
                <button class="message__action" data-action="dislike" aria-label="Dislike message">👎</button>
                <button class="message__action" data-action="bookmark" aria-label="Bookmark message">🔖</button>
                <button class="message__action" data-action="regenerate" aria-label="Regenerate response">🔄</button>
            </div>
        `;
    }

    /**
     * Generate follow-up suggestions section
     * @param {Array} suggestions - Array of follow-up suggestions
     * @returns {string} - HTML for follow-up section
     */
    generateFollowupSection(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            return '';
        }

        const suggestionsHtml = suggestions.map(suggestion =>
            `<button class="message__suggestion" data-suggestion="${this.escapeHtml(suggestion)}">${this.escapeHtml(suggestion)}</button>`
        ).join('');

        return `
            <div class="message__followup">
                <div class="message__followup-title">Follow up</div>
                <div class="message__followup-suggestions">
                    ${suggestionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for message elements
     * @param {HTMLElement} messageElement - The message element
     * @param {Object} options - Message options
     */
    setupMessageEventListeners(messageElement, options) {
        // Action buttons
        const actionButtons = messageElement.querySelectorAll('.message__action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleActionButton(e.target.dataset.action, messageElement);
            });
        });

        // Follow-up suggestions
        const suggestions = messageElement.querySelectorAll('.message__suggestion');
        suggestions.forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleFollowupSuggestion(e.target.dataset.suggestion);
            });
        });
    }

    /**
     * Handle action button clicks
     * @param {string} action - The action type
     * @param {HTMLElement} messageElement - The message element
     */
    handleActionButton(action, messageElement) {
        const messageText = messageElement.querySelector('.message__text')?.textContent || '';
        
        switch (action) {
            case 'copy':
                this.copyToClipboard(messageText);
                this.showToast('Message copied to clipboard');
                break;
            case 'like':
                this.toggleActionState(messageElement, 'like');
                break;
            case 'dislike':
                this.toggleActionState(messageElement, 'dislike');
                break;
            case 'bookmark':
                this.toggleActionState(messageElement, 'bookmark');
                break;
            case 'regenerate':
                if (window.chatManager) {
                    // Get the last user message and regenerate response
                    const userMessages = document.querySelectorAll('.message--user');
                    if (userMessages.length > 0) {
                        const lastUserMessage = userMessages[userMessages.length - 1];
                        const userText = lastUserMessage.querySelector('.message__content').textContent.trim();
                        window.chatManager.processUserMessage(userText);
                    }
                }
                break;
            case 'speak':
                this.speakText(messageText);
                break;
            case 'edit':
            case 'info':
                this.showToast(`${action} functionality coming soon`);
                break;
        }
    }

    /**
     * Handle follow-up suggestion clicks
     * @param {string} suggestion - The suggestion text
     */
    handleFollowupSuggestion(suggestion) {
        // Set the input value and trigger send
        this.messageInput.value = suggestion;
        this.handleSendMessage();
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    /**
     * Toggle action button state
     * @param {HTMLElement} messageElement - The message element
     * @param {string} action - The action type
     */
    toggleActionState(messageElement, action) {
        const button = messageElement.querySelector(`[data-action="${action}"]`);
        if (button) {
            button.classList.toggle('message__action--active');
        }
    }

    /**
     * Speak text using Web Speech API
     * @param {string} text - Text to speak
     */
    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        } else {
            this.showToast('Speech synthesis not supported');
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: #2a2a2a;
            color: #e5e5e5;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
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
}

// Create global instance
window.UIManager = UIManager;