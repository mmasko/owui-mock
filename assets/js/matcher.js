/**
 * Message Matcher Module
 * Handles matching user input to predefined responses from replies.json
 */

class MessageMatcher {
    constructor() {
        this.rules = [];
        this.isLoaded = false;
    }

    /**
     * Get fallback rules (exact match prompts for copy/paste)
     */
    getFallbackRules() {
        return [
            {
                "match": "What kind of questions can you help with?",
                "type": "text",
                "value": "I can assist California state employees with:\n• Information about state employee benefits and resources\n• Guidance on accessing government services\n• General workplace policies and procedures\n• Technical support for common issues\n• Directions to relevant departments and contacts\n\nI'm designed specifically to support state employees in their daily work.",
                "caseSensitive": false,
                "contains": false,
                "priority": 1,
                "followup": [
                    "Can you help with technical issues?",
                    "How do I access employee benefits information?",
                    "What workplace policies can you explain?",
                    "Can you provide department contact information?"
                ]
            },
            {
                "match": "Can you provide information on state employee resources?",
                "type": "text",
                "value": "California state employees have access to comprehensive benefits including:\n• Health insurance through CalPERS\n• Retirement planning and pension information\n• Professional development opportunities\n• Employee assistance programs\n• Flexible work arrangements\n\nFor detailed information, I recommend visiting the CalHR website or contacting your HR department.",
                "caseSensitive": false,
                "contains": false,
                "priority": 2,
                "followup": [
                    "How do I contact my HR department?",
                    "What is CalPERS and how do I access it?",
                    "Can you explain flexible work arrangements?",
                    "What professional development is available?"
                ]
            },
            {
                "match": "How do I access California state government services?",
                "type": "text",
                "value": "California offers numerous online services for both employees and citizens:\n• CA.gov portal for general services\n• Employee self-service systems\n• Benefits enrollment and management\n• Training and certification programs\n• Internal communication platforms\n\nMost services are accessible through your employee portal or the main CA.gov website.",
                "caseSensitive": false,
                "contains": false,
                "priority": 3,
                "followup": [
                    "How do I access the employee portal?",
                    "What training programs are available?",
                    "Can you help with benefits enrollment?",
                    "Where do I find internal communications?"
                ]
            },
            {
                "match": "What are your limitations as a state employee assistant?",
                "type": "text",
                "value": "As a state employee assistant, I have several important limitations:\n• I cannot access personal employee records or confidential information\n• I cannot make official policy decisions or interpretations\n• I cannot process transactions or make changes to your accounts\n• I cannot provide legal advice or medical guidance\n• I can only provide general information and guidance\n\nFor specific issues, please contact the appropriate department directly.",
                "caseSensitive": false,
                "contains": false,
                "priority": 4,
                "followup": [
                    "Who should I contact for HR issues?",
                    "How do I get official policy interpretations?",
                    "Where can I access my employee records?",
                    "What departments handle specific issues?"
                ]
            },
            {
                "match": "Can you help with technical issues?",
                "type": "text",
                "value": "For technical issues, I can provide basic troubleshooting guidance:\n• Check your network connection\n• Clear your browser cache and cookies\n• Restart your computer if applications are slow\n• Ensure you're using supported browsers (Chrome, Firefox, Edge)\n• Contact your local IT support for hardware issues\n\nFor complex technical problems, please submit a ticket to your IT help desk.",
                "caseSensitive": false,
                "contains": false,
                "priority": 5,
                "followup": [
                    "How do I contact IT support?",
                    "What browsers are officially supported?",
                    "How do I submit an IT help desk ticket?",
                    "Can you help with specific software issues?"
                ]
            },
            {
                "match": "*",
                "type": "text",
                "value": "I'm sorry, I don't understand that request. I'm designed to help California state employees with specific topics. Please copy and paste one of the exact prompts from the suggestions below, or contact your administrator to add new approved prompts.",
                "caseSensitive": false,
                "contains": false,
                "priority": 999,
                "followup": [
                    "What kind of questions can you help with?",
                    "Can you provide information on state employee resources?",
                    "How do I access California state government services?",
                    "Can you help with technical issues?"
                ]
            }
        ];
    }

    /**
     * Load rules from localStorage first, then fallback to replies.json
     * @returns {Promise<void>}
     */
    async loadRules() {
        try {
            // First try to load from localStorage (admin changes)
            const localRules = localStorage.getItem('chatRules');
            if (localRules) {
                const data = JSON.parse(localRules);
                if (data.rules && Array.isArray(data.rules)) {
                    this.rules = data.rules.sort((a, b) => (a.priority || 999) - (b.priority || 999));
                    this.isLoaded = true;
                    console.log('Rules loaded successfully from localStorage:', this.rules.length, 'rules');
                    this.setupStorageListener();
                    return;
                }
            }

            // Fallback to JSON file if no localStorage data
            const response = await fetch('assets/data/replies.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.rules = data.rules.sort((a, b) => (a.priority || 999) - (b.priority || 999));
            this.isLoaded = true;
            console.log('Rules loaded successfully from JSON:', this.rules.length, 'rules');
            this.setupStorageListener();
        } catch (error) {
            console.error('Failed to load rules from JSON, using fallback:', error);
            // Use embedded fallback rules
            this.rules = this.getFallbackRules().sort((a, b) => (a.priority || 999) - (b.priority || 999));
            this.isLoaded = true;
            console.log('Fallback rules loaded:', this.rules.length, 'rules');
            this.setupStorageListener();
        }
    }

    /**
     * Set up listener for localStorage changes (cross-tab sync)
     */
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'chatRules' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.rules && Array.isArray(data.rules)) {
                        this.rules = data.rules.sort((a, b) => (a.priority || 999) - (b.priority || 999));
                        console.log('Rules updated from localStorage (cross-tab sync):', this.rules.length, 'rules');
                        
                        // Notify UI about rule changes if needed
                        if (window.chatManager) {
                            window.chatManager.showSystemMessage('Chat rules updated from admin panel.');
                        }
                    }
                } catch (error) {
                    console.error('Error parsing updated localStorage rules:', error);
                }
            }
        });
    }

    /**
     * Reload rules from localStorage (for manual refresh)
     */
    async reloadRules() {
        await this.loadRules();
        console.log('Rules reloaded manually');
    }

    /**
     * Find the best matching rule for user input
     * @param {string} userInput - The user's message
     * @returns {Object|null} - Matching rule or null if no match
     */
    findMatch(userInput) {
        if (!this.isLoaded) {
            console.warn('Rules not loaded yet');
            return null;
        }

        const input = userInput.trim();
        if (!input) return null;

        // Try to find a matching rule
        for (const rule of this.rules) {
            if (this.matchesRule(input, rule)) {
                console.log('Matched rule:', rule);
                return rule;
            }
        }

        // Should not reach here if there's a proper catch-all rule
        console.warn('No matching rule found for:', input);
        return null;
    }

    /**
     * Check if input matches a specific rule
     * @param {string} input - User input
     * @param {Object} rule - Rule to check against
     * @returns {boolean} - Whether the rule matches
     */
    matchesRule(input, rule) {
        const { match, caseSensitive = false } = rule;

        // Handle catch-all rule
        if (match === '*') {
            return true;
        }

        // Prepare input for comparison
        const processedInput = caseSensitive ? input : input.toLowerCase();

        // For exact matching system, we only support single string matches
        if (typeof match === 'string') {
            const processedMatch = caseSensitive ? match : match.toLowerCase();
            return processedInput === processedMatch;
        }

        // Legacy support for array matches (should not be used in exact match system)
        if (Array.isArray(match)) {
            console.warn('Array matches are deprecated in exact match system:', match);
            return match.some(term => {
                const processedTerm = caseSensitive ? term : term.toLowerCase();
                return processedInput === processedTerm;
            });
        }

        return false;
    }

    /**
     * Get response object from a matched rule
     * @param {Object} rule - The matched rule
     * @returns {Object} - Response object with type and value
     */
    getResponse(rule) {
        if (!rule) {
            return {
                type: 'text',
                value: 'I didn\'t understand that. Please try again.',
                followup: []
            };
        }

        return {
            type: rule.type,
            value: rule.value,
            followup: rule.followup || []
        };
    }

    /**
     * Process user input and return appropriate response
     * @param {string} userInput - The user's message
     * @returns {Object} - Response object with type and value
     */
    processInput(userInput) {
        const matchedRule = this.findMatch(userInput);
        return this.getResponse(matchedRule);
    }

    /**
     * Check if matcher is ready to process inputs
     * @returns {boolean} - Whether the matcher is loaded and ready
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * Get all available rules (for debugging)
     * @returns {Array} - Array of all rules
     */
    getAllRules() {
        return this.rules;
    }

    /**
     * Get rules source information (for debugging)
     * @returns {Object} - Information about where rules were loaded from
     */
    getRulesSource() {
        const localRules = localStorage.getItem('chatRules');
        return {
            hasLocalStorage: !!localRules,
            rulesCount: this.rules.length,
            source: localRules ? 'localStorage' : 'JSON file or fallback'
        };
    }
}

// Create global instance
window.MessageMatcher = MessageMatcher;