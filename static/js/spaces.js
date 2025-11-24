// ===================================
// Cleo Spaces - Main JavaScript
// ===================================

class CleoSpaces {
    constructor() {
        this.currentSpace = null;
        this.spaces = [];
        this.agents = [];
        this.messages = [];
        this.selectedAgents = new Set();

        this.init();
    }

    async init() {
        try {
            // Load agents and spaces
            await this.loadAgents();
            await this.loadSpaces();

            // Setup event listeners
            this.setupEventListeners();

            // Auto-resize textarea
            this.setupTextareaAutoResize();

            // Setup right sidebar (collapsed by default)
            this.setupRightSidebar();

            // Collapse right sidebar by default
            const rightSidebar = document.getElementById('right-sidebar');
            if (rightSidebar) {
                rightSidebar.classList.add('collapsed');
            }

            // Auto-create or load Cleo chat space
            await this.initializeCleoChat();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    // ===================================
    // Error Handling
    // ===================================

    showError(message, duration = 5000) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(errorDiv);

        // Auto-remove after duration
        setTimeout(() => {
            errorDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => errorDiv.remove(), 300);
        }, duration);
    }

    showSuccess(message, duration = 3000) {
        // Create success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(successDiv);

        // Auto-remove after duration
        setTimeout(() => {
            successDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => successDiv.remove(), 300);
        }, duration);
    }

    async handleFetch(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (!data.success) {
                throw new Error(data.message || 'Operation failed');
            }

            return data;
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    // ===================================
    // Data Loading
    // ===================================

    async loadAgents() {
        try {
            const response = await fetch('/api/agents');
            const data = await response.json();
            this.agents = data.agents || [];
            this.renderAgentsList();
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    }

    async loadSpaces() {
        try {
            const response = await fetch('/api/spaces');
            const data = await response.json();
            this.spaces = data.spaces || [];
            this.renderSpacesList();

            // If no spaces, show welcome
            if (this.spaces.length === 0) {
                this.showWelcome();
            }
        } catch (error) {
            console.error('Failed to load spaces:', error);
            this.spaces = [];
            this.showWelcome();
        }
    }

    async loadSpace(spaceId) {
        try {
            const response = await fetch(`/api/spaces/${spaceId}`);
            const data = await response.json();
            this.currentSpace = data.space;
            this.messages = data.messages || [];

            this.renderSpace();
            this.renderMessages();
            this.updateRightSidebar();

            // Show right sidebar when in a space
            const rightSidebar = document.getElementById('right-sidebar');
            if (rightSidebar) {
                rightSidebar.classList.remove('collapsed');
            }
        } catch (error) {
            console.error('Failed to load space:', error);
        }
    }

    async initializeCleoChat() {
        // Look for existing "Chat with Cleo" space
        const cleoSpace = this.spaces.find(s =>
            s.name === 'Chat with Cleo' || s.name === 'Cleo'
        );

        if (cleoSpace) {
            // Load existing Cleo chat space
            await this.loadSpace(cleoSpace.id);
        } else {
            // Create new "Chat with Cleo" space
            const cleoAgent = this.agents.find(a => a.name === 'Cleo');

            if (cleoAgent) {
                try {
                    const response = await fetch('/api/spaces', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: 'Chat with Cleo',
                            description: 'Direct conversation with Cleo, your master orchestration agent',
                            agent_ids: [cleoAgent.id]
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Reload spaces to include the new one
                        await this.loadSpaces();

                        // Load the new Cleo space
                        await this.loadSpace(data.space.id);
                    } else {
                        // If creation failed, just show welcome
                        this.showWelcome();
                    }
                } catch (error) {
                    console.error('Failed to create Cleo chat space:', error);
                    this.showWelcome();
                }
            } else {
                // No Cleo agent found, show welcome
                this.showWelcome();
            }
        }
    }

    // ===================================
    // Rendering
    // ===================================

    renderAgentsList() {
        const agentsList = document.getElementById('agents-list');
        if (!agentsList) return;

        agentsList.innerHTML = this.agents.map(agent => `
            <div class="agent-item" data-agent-id="${agent.id}" title="${agent.name}">
                <div class="agent-avatar agent-tier-${agent.tier}">
                    ${this.getAgentInitials(agent.name)}
                </div>
                <span class="agent-name">${agent.name}</span>
                <div class="agent-status"></div>
            </div>
        `).join('');
    }

    renderSpacesList() {
        const spacesList = document.getElementById('spaces-list');
        if (!spacesList) return;

        if (this.spaces.length === 0) {
            spacesList.innerHTML = `
                <div style="padding: var(--space-md); text-align: center; color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                    No spaces yet. Create one to get started!
                </div>
            `;
            return;
        }

        spacesList.innerHTML = this.spaces.map(space => `
            <div class="space-item ${this.currentSpace?.id === space.id ? 'active' : ''}"
                 data-space-id="${space.id}">
                <svg class="space-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span class="space-name">${space.name}</span>
                ${space.unread ? `<span class="space-badge">${space.unread}</span>` : ''}
            </div>
        `).join('');

        // Add click listeners
        spacesList.querySelectorAll('.space-item').forEach(item => {
            item.addEventListener('click', () => {
                const spaceId = item.dataset.spaceId;
                this.loadSpace(spaceId);
            });
        });
    }

    renderSpace() {
        if (!this.currentSpace) return;

        // Update header
        document.getElementById('space-title').textContent = this.currentSpace.name;
        document.getElementById('agents-count').textContent =
            `${this.currentSpace.agents?.length || 0} agent${this.currentSpace.agents?.length !== 1 ? 's' : ''}`;
        document.getElementById('space-created').textContent =
            this.formatDate(this.currentSpace.created_at);
        document.getElementById('space-meta').style.display = 'flex';

        // Hide agent library, integrations library, welcome; show input area
        document.getElementById('agent-library')?.style.setProperty('display', 'none');
        document.getElementById('integrations-library')?.style.setProperty('display', 'none');
        document.getElementById('welcome-state')?.style.setProperty('display', 'none');
        document.getElementById('input-area')?.style.setProperty('display', 'block');

        // Render active agents
        this.renderActiveAgents();
    }

    renderActiveAgents() {
        const activeAgentsDiv = document.getElementById('active-agents');
        if (!activeAgentsDiv || !this.currentSpace) return;

        const spaceAgents = this.currentSpace.agents || [];

        activeAgentsDiv.innerHTML = spaceAgents.map(agent => `
            <div class="agent-chip">
                <span>${agent.name}</span>
                <span class="agent-chip-remove" data-agent-id="${agent.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </span>
            </div>
        `).join('');

        // Add remove listeners
        activeAgentsDiv.querySelectorAll('.agent-chip-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const agentId = btn.dataset.agentId;
                this.removeAgentFromSpace(agentId);
            });
        });
    }

    renderMessages() {
        const messagesArea = document.getElementById('messages-area');
        if (!messagesArea) return;

        // Clear welcome state if showing
        const welcomeState = messagesArea.querySelector('.welcome-state');
        if (welcomeState) {
            welcomeState.remove();
        }

        // Render messages
        const messagesHTML = this.messages.map(msg => `
            <div class="message ${msg.role}">
                <div class="message-avatar ${msg.role === 'agent' ? 'agent-tier-' + msg.agent_tier : ''}">
                    ${msg.role === 'user' ? 'AS' : this.getAgentInitials(msg.agent_name)}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${msg.author}</span>
                        <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="message-body">${this.escapeHtml(msg.content)}</div>
                </div>
            </div>
        `).join('');

        messagesArea.innerHTML = messagesHTML;

        // Scroll to bottom
        this.scrollToBottom();
    }

    showWelcome() {
        document.getElementById('welcome-state')?.style.setProperty('display', 'flex');
        document.getElementById('input-area')?.style.setProperty('display', 'none');

        // Collapse right sidebar (not in a space)
        const rightSidebar = document.getElementById('right-sidebar');
        if (rightSidebar) {
            rightSidebar.classList.add('collapsed');
        }
    }

    // ===================================
    // Event Listeners
    // ===================================

    setupEventListeners() {
        // New Space button
        document.getElementById('new-space-btn')?.addEventListener('click', () => {
            this.showNewSpaceModal();
        });

        // Welcome create space
        document.getElementById('welcome-create-space')?.addEventListener('click', () => {
            this.showNewSpaceModal();
        });

        // View Agents button
        document.getElementById('view-agents-btn')?.addEventListener('click', () => {
            this.showAgentLibrary();
        });

        // View Integrations button
        document.getElementById('view-integrations-btn')?.addEventListener('click', () => {
            this.showIntegrationsLibrary();
        });

        // Add Agent button
        document.getElementById('add-agent-btn')?.addEventListener('click', () => {
            this.showAddAgentModal();
        });

        // Send message
        document.getElementById('send-btn')?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.updateCharCount();
                this.updateSendButton();
            });

            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });

        // Modal backdrop clicks
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                const modal = backdrop.closest('.modal');
                this.hideModal(modal);
            });
        });

        // Create space button
        document.getElementById('create-space-btn')?.addEventListener('click', () => {
            this.createSpace();
        });

        // Add agents button
        document.getElementById('add-agents-btn')?.addEventListener('click', () => {
            this.addAgentsToSpace();
        });
    }

    setupTextareaAutoResize() {
        const textarea = document.getElementById('message-input');
        if (!textarea) return;

        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });

        // Setup @mention autocomplete
        this.setupMentionAutocomplete(textarea);
    }

    setupMentionAutocomplete(textarea) {
        let autocompleteDiv = null;
        let currentMentionStart = -1;
        let selectedIndex = -1;

        textarea.addEventListener('input', (e) => {
            const cursorPos = textarea.selectionStart;
            const textBeforeCursor = textarea.value.substring(0, cursorPos);

            // Check if we're typing an @mention
            const atIndex = textBeforeCursor.lastIndexOf('@');

            if (atIndex !== -1 && (atIndex === 0 || /\s/.test(textBeforeCursor[atIndex - 1]))) {
                const searchText = textBeforeCursor.substring(atIndex + 1).toLowerCase();

                // Filter agents based on search text
                const matches = this.agents.filter(agent =>
                    agent.name.toLowerCase().includes(searchText)
                ).slice(0, 5);

                if (matches.length > 0 && searchText.length > 0) {
                    currentMentionStart = atIndex;
                    selectedIndex = 0;
                    this.showAutocomplete(textarea, matches);
                } else {
                    this.hideAutocomplete();
                }
            } else {
                this.hideAutocomplete();
            }
        });

        textarea.addEventListener('keydown', (e) => {
            if (!autocompleteDiv) return;

            const items = autocompleteDiv.querySelectorAll('.autocomplete-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.updateAutocompleteSelection(items, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.updateAutocompleteSelection(items, selectedIndex);
            } else if (e.key === 'Enter' && autocompleteDiv.style.display !== 'none') {
                e.preventDefault();
                const selectedAgent = this.agents.find(a =>
                    a.name === items[selectedIndex].dataset.agentName
                );
                if (selectedAgent) {
                    this.insertMention(textarea, currentMentionStart, selectedAgent);
                }
            } else if (e.key === 'Escape') {
                this.hideAutocomplete();
            }
        });

        // Store reference for other methods
        this.autocompleteDiv = null;
    }

    showAutocomplete(textarea, agents) {
        this.hideAutocomplete();

        const autocomplete = document.createElement('div');
        autocomplete.className = 'mention-autocomplete';
        autocomplete.innerHTML = agents.map((agent, index) => `
            <div class="autocomplete-item ${index === 0 ? 'selected' : ''}"
                 data-agent-name="${agent.name}"
                 data-index="${index}">
                <div class="agent-avatar agent-tier-${agent.tier}">${this.getAgentInitials(agent.name)}</div>
                <div class="autocomplete-info">
                    <div class="autocomplete-name">${agent.name}</div>
                    <div class="autocomplete-tier">${agent.tier}</div>
                </div>
            </div>
        `).join('');

        // Position autocomplete
        const inputArea = document.getElementById('input-area');
        inputArea.appendChild(autocomplete);

        // Add click handlers
        autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const agentName = item.dataset.agentName;
                const agent = this.agents.find(a => a.name === agentName);
                const atIndex = textarea.value.lastIndexOf('@', textarea.selectionStart);
                this.insertMention(textarea, atIndex, agent);
            });
        });

        this.autocompleteDiv = autocomplete;
    }

    hideAutocomplete() {
        if (this.autocompleteDiv) {
            this.autocompleteDiv.remove();
            this.autocompleteDiv = null;
        }
    }

    updateAutocompleteSelection(items, selectedIndex) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    insertMention(textarea, atIndex, agent) {
        const before = textarea.value.substring(0, atIndex);
        const after = textarea.value.substring(textarea.selectionStart);

        textarea.value = before + `@${agent.name} ` + after;
        textarea.focus();

        const newCursorPos = before.length + agent.name.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        this.hideAutocomplete();
        this.updateCharCount();
        this.updateSendButton();
    }

    // ===================================
    // Modals
    // ===================================

    showNewSpaceModal() {
        const modal = document.getElementById('new-space-modal');
        if (!modal) return;

        // Render agent grid
        this.renderAgentGrid('modal-agent-grid');

        modal.classList.add('active');
    }

    showAddAgentModal() {
        if (!this.currentSpace) return;

        const modal = document.getElementById('add-agent-modal');
        if (!modal) return;

        // Render agent grid (excluding already added agents)
        const currentAgentIds = (this.currentSpace.agents || []).map(a => a.id);
        this.renderAgentGrid('add-agent-grid', currentAgentIds);

        modal.classList.add('active');
    }

    hideModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            // Clear selections
            this.selectedAgents.clear();
        }
    }

    renderAgentGrid(containerId, excludeIds = []) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const availableAgents = this.agents.filter(a => !excludeIds.includes(a.id));

        container.innerHTML = availableAgents.map(agent => `
            <div class="agent-card" data-agent-id="${agent.id}">
                <div class="agent-card-avatar agent-tier-${agent.tier}">
                    ${this.getAgentInitials(agent.name)}
                </div>
                <div class="agent-card-name">${agent.name}</div>
                <div class="agent-card-tier">${agent.tier}</div>
            </div>
        `).join('');

        // Add click listeners
        container.querySelectorAll('.agent-card').forEach(card => {
            card.addEventListener('click', () => {
                const agentId = card.dataset.agentId;

                if (this.selectedAgents.has(agentId)) {
                    this.selectedAgents.delete(agentId);
                    card.classList.remove('selected');
                } else {
                    this.selectedAgents.add(agentId);
                    card.classList.add('selected');
                }
            });
        });
    }

    // ===================================
    // Actions
    // ===================================

    async createSpace() {
        const nameInput = document.getElementById('space-name');
        const descInput = document.getElementById('space-description');

        if (!nameInput || !nameInput.value.trim()) {
            alert('Please enter a space name');
            return;
        }

        const spaceData = {
            name: nameInput.value.trim(),
            description: descInput?.value.trim() || '',
            agent_ids: Array.from(this.selectedAgents)
        };

        try {
            const response = await fetch('/api/spaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(spaceData)
            });

            const data = await response.json();

            if (data.success) {
                // Reload spaces
                await this.loadSpaces();

                // Load the new space
                await this.loadSpace(data.space.id);

                // Hide modal
                this.hideModal(document.getElementById('new-space-modal'));

                // Clear inputs
                nameInput.value = '';
                if (descInput) descInput.value = '';
            } else {
                alert('Failed to create space: ' + data.message);
            }
        } catch (error) {
            console.error('Failed to create space:', error);
            alert('Failed to create space');
        }
    }

    async addAgentsToSpace() {
        if (!this.currentSpace || this.selectedAgents.size === 0) return;

        try {
            const response = await fetch(`/api/spaces/${this.currentSpace.id}/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_ids: Array.from(this.selectedAgents)
                })
            });

            const data = await response.json();

            if (data.success) {
                // Reload current space
                await this.loadSpace(this.currentSpace.id);

                // Hide modal
                this.hideModal(document.getElementById('add-agent-modal'));
            } else {
                alert('Failed to add agents: ' + data.message);
            }
        } catch (error) {
            console.error('Failed to add agents:', error);
            alert('Failed to add agents');
        }
    }

    async removeAgentFromSpace(agentId) {
        if (!this.currentSpace) return;

        if (!confirm('Remove this agent from the space?')) return;

        try {
            const response = await fetch(`/api/spaces/${this.currentSpace.id}/agents/${agentId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                // Reload current space
                await this.loadSpace(this.currentSpace.id);
            } else {
                alert('Failed to remove agent: ' + data.message);
            }
        } catch (error) {
            console.error('Failed to remove agent:', error);
            alert('Failed to remove agent');
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');

        if (!input || !this.currentSpace || !input.value.trim()) return;

        const message = input.value.trim();

        // Parse @mentions
        const mentions = this.parseMentions(message);

        // Disable input
        input.disabled = true;
        sendBtn.disabled = true;

        // Add user message to UI immediately
        this.addMessageToUI({
            role: 'user',
            author: 'Andrew Smart',
            content: message,
            timestamp: new Date().toISOString(),
            mentions: mentions
        });

        // Clear input
        input.value = '';
        input.style.height = 'auto';
        this.updateCharCount();

        try {
            const response = await fetch(`/api/spaces/${this.currentSpace.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    mentions: mentions.map(m => m.name)
                })
            });

            const data = await response.json();

            if (data.success && data.response) {
                // Add agent response to UI
                this.addMessageToUI({
                    role: 'agent',
                    author: data.response.agent_name,
                    content: data.response.content,
                    timestamp: data.response.timestamp,
                    agent_tier: data.response.agent_tier,
                    agent_name: data.response.agent_name
                });
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            this.addMessageToUI({
                role: 'agent',
                author: 'System',
                content: 'Sorry, there was an error processing your message.',
                timestamp: new Date().toISOString(),
                agent_tier: 'master'
            });
        } finally {
            // Re-enable input
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    parseMentions(message) {
        const mentionRegex = /@([\w-]+)/g;
        const mentions = [];
        let match;

        while ((match = mentionRegex.exec(message)) !== null) {
            const agentName = match[1];
            const agent = this.agents.find(a =>
                a.name.toLowerCase() === agentName.toLowerCase()
            );

            if (agent) {
                mentions.push({
                    name: agent.name,
                    id: agent.id,
                    tier: agent.tier
                });
            }
        }

        return mentions;
    }

    addMessageToUI(message) {
        this.messages.push(message);
        this.renderMessages();
    }

    // ===================================
    // Utilities
    // ===================================

    getAgentInitials(name) {
        if (!name) return '?';
        return name
            .split(/[-\s]/)
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    updateCharCount() {
        const input = document.getElementById('message-input');
        const charCount = document.getElementById('char-count');

        if (input && charCount) {
            charCount.textContent = input.value.length;
        }
    }

    updateSendButton() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');

        if (input && sendBtn) {
            sendBtn.disabled = !input.value.trim();
        }
    }

    scrollToBottom() {
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    // ===================================
    // Right Sidebar Management
    // ===================================

    setupRightSidebar() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Toggle sidebar - from both locations
        const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
        const toggleRightSidebarBtn = document.getElementById('toggle-right-sidebar');

        const toggleSidebar = () => {
            const sidebar = document.getElementById('right-sidebar');
            sidebar.classList.toggle('collapsed');
        };

        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', toggleSidebar);
        }

        if (toggleRightSidebarBtn) {
            toggleRightSidebarBtn.addEventListener('click', toggleSidebar);
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    updateRightSidebar() {
        if (!this.currentSpace) return;

        // Get current space agents
        const spaceAgentIds = this.currentSpace.agents.map(a => a.id);

        // Categorize agents
        const spaceAgents = this.currentSpace.agents;
        const availableAgents = this.agents.filter(a =>
            !spaceAgentIds.includes(a.id) &&
            a.tier !== 'master' &&
            a.tier !== 'worker'
        );
        const appAgents = this.agents.filter(a =>
            a.tier === 'master' || a.tier === 'worker'
        );

        // Update counts
        document.getElementById('space-agents-count').textContent = spaceAgents.length;
        document.getElementById('available-agents-count').textContent = availableAgents.length;
        document.getElementById('app-agents-count').textContent = appAgents.length;

        // Populate lists
        this.populateAgentList('space-agents-list', spaceAgents, 'remove');
        this.populateAgentList('available-agents-list', availableAgents, 'add');
        this.populateAgentList('app-agents-list', appAgents, 'info');
    }

    populateAgentList(containerId, agents, actionType) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (agents.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No agents</p>';
            return;
        }

        agents.forEach(agent => {
            const item = document.createElement('div');
            item.className = 'sidebar-agent-item';

            const avatar = document.createElement('div');
            avatar.className = `sidebar-agent-avatar agent-tier-${agent.tier}`;
            avatar.textContent = agent.name.substring(0, 2).toUpperCase();

            const info = document.createElement('div');
            info.className = 'sidebar-agent-info';

            const name = document.createElement('div');
            name.className = 'sidebar-agent-name';
            name.textContent = agent.name;

            const tier = document.createElement('div');
            tier.className = 'sidebar-agent-tier';
            tier.textContent = agent.tier;

            info.appendChild(name);
            info.appendChild(tier);

            item.appendChild(avatar);
            item.appendChild(info);

            // Add action button
            if (actionType === 'remove') {
                const action = document.createElement('div');
                action.className = 'sidebar-agent-action';

                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn-icon';
                removeBtn.title = 'Remove from space';
                removeBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                `;
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeAgentFromSpace(agent.id);
                });

                action.appendChild(removeBtn);
                item.appendChild(action);
            } else if (actionType === 'add') {
                const action = document.createElement('div');
                action.className = 'sidebar-agent-action';

                const addBtn = document.createElement('button');
                addBtn.className = 'btn-icon';
                addBtn.title = 'Add to space';
                addBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                `;
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.addAgentToSpace(agent.id);
                });

                action.appendChild(addBtn);
                item.appendChild(action);
            }

            container.appendChild(item);
        });
    }

    async addAgentToSpace(agentId) {
        if (!this.currentSpace) return;

        try {
            const response = await fetch(`/api/spaces/${this.currentSpace.id}/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_ids: [agentId] })
            });

            const data = await response.json();

            if (data.success) {
                this.currentSpace = data.space;
                this.updateActiveAgents();
                this.updateRightSidebar();
                await this.loadSpaces(); // Refresh spaces list
            } else {
                console.error('Failed to add agent:', data.message);
            }
        } catch (error) {
            console.error('Error adding agent:', error);
        }
    }

    async removeAgentFromSpace(agentId) {
        if (!this.currentSpace) return;

        try {
            const response = await fetch(`/api/spaces/${this.currentSpace.id}/agents/${agentId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.currentSpace = data.space;
                this.updateActiveAgents();
                this.updateRightSidebar();
                await this.loadSpaces(); // Refresh spaces list
            } else {
                console.error('Failed to remove agent:', data.message);
            }
        } catch (error) {
            console.error('Error removing agent:', error);
        }
    }

    // ===================================
    // Agent Library
    // ===================================

    showAgentLibrary() {
        // Hide all other content
        document.getElementById('welcome-state').style.display = 'none';
        document.getElementById('input-area').style.display = 'none';

        // Hide message list
        const messageList = document.querySelector('.message-list');
        if (messageList) messageList.style.display = 'none';

        // Show agent library
        const agentLibrary = document.getElementById('agent-library');
        agentLibrary.style.display = 'block';

        // Update header
        document.getElementById('space-title').textContent = 'Agent Library';
        document.getElementById('space-meta').style.display = 'none';

        // Clear current space
        this.currentSpace = null;

        // Collapse right sidebar (not in a space)
        const rightSidebar = document.getElementById('right-sidebar');
        if (rightSidebar) {
            rightSidebar.classList.add('collapsed');
        }

        // Render agents
        this.renderAgentLibrary();
    }

    renderAgentLibrary() {
        // Group agents by tier
        const agentsByTier = {
            master: [],
            personal: [],
            team: [],
            worker: [],
            expert: []
        };

        this.agents.forEach(agent => {
            if (agentsByTier[agent.tier]) {
                agentsByTier[agent.tier].push(agent);
            }
        });

        // Render each tier
        Object.keys(agentsByTier).forEach(tier => {
            const agents = agentsByTier[tier];
            const container = document.getElementById(`cards-${tier}`);
            const countEl = document.getElementById(`count-${tier}`);

            if (container && countEl) {
                countEl.textContent = agents.length;
                container.innerHTML = agents.map(agent => this.createAgentCard(agent)).join('');

                // Add click listeners
                container.querySelectorAll('.agent-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const agentId = card.dataset.agentId;
                        this.showAgentDetail(agentId);
                    });
                });
            }
        });
    }

    createAgentCard(agent) {
        const initials = agent.name.substring(0, 2).toUpperCase();
        return `
            <div class="agent-card" data-agent-id="${agent.id}">
                <div class="agent-card-header">
                    <div class="agent-card-avatar agent-tier-${agent.tier}">
                        ${initials}
                    </div>
                    <div class="agent-card-info">
                        <h3 class="agent-card-name">${agent.name}</h3>
                        <div class="agent-card-tier">${agent.tier}</div>
                    </div>
                </div>
                <p class="agent-card-description">
                    ${agent.description || 'AI agent specialized in their domain'}
                </p>
                <div class="agent-card-status">
                    Online
                </div>
            </div>
        `;
    }

    showAgentDetail(agentId) {
        // TODO: Implement agent detail view
        console.log('Show agent detail:', agentId);
        // For now, we could create a new space with this agent
        // Or show a modal with agent information
    }

    // ===================================
    // Integrations Library
    // ===================================

    showIntegrationsLibrary() {
        // Hide all other content
        document.getElementById('welcome-state').style.display = 'none';
        document.getElementById('agent-library').style.display = 'none';
        document.getElementById('input-area').style.display = 'none';

        // Hide message list
        const messageList = document.querySelector('.message-list');
        if (messageList) messageList.style.display = 'none';

        // Show integrations library
        const integrationsLibrary = document.getElementById('integrations-library');
        integrationsLibrary.style.display = 'block';

        // Update header
        document.getElementById('space-title').textContent = 'Integrations';
        document.getElementById('space-meta').style.display = 'none';

        // Clear current space
        this.currentSpace = null;

        // Collapse right sidebar (not in a space)
        const rightSidebar = document.getElementById('right-sidebar');
        if (rightSidebar) {
            rightSidebar.classList.add('collapsed');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cleoSpaces = new CleoSpaces();
});
