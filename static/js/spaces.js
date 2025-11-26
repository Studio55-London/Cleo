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

            // Keep right sidebar collapsed by default
            // User can manually toggle it using the button if needed
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

        // Hide library views
        const welcomeState = document.getElementById('welcome-state');
        const agentLibrary = document.getElementById('agent-library');
        const knowledgeLibrary = document.getElementById('knowledge-library');
        const integrationsLibrary = document.getElementById('integrations-library');

        if (welcomeState) welcomeState.style.display = 'none';
        if (agentLibrary) agentLibrary.style.display = 'none';
        if (knowledgeLibrary) knowledgeLibrary.style.display = 'none';
        if (integrationsLibrary) integrationsLibrary.style.display = 'none';

        // Show or create message list container
        let messageList = messagesArea.querySelector('.message-list');
        if (!messageList) {
            messageList = document.createElement('div');
            messageList.className = 'message-list';
            messagesArea.appendChild(messageList);
        }
        messageList.style.display = 'block';

        // Render messages
        const messagesHTML = this.messages.map(msg => {
            let citationsHTML = '';
            if (msg.citations && msg.citations.length > 0) {
                citationsHTML = `
                    <div class="message-citations">
                        <div class="citations-header">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span>Sources (${msg.citations.length})</span>
                        </div>
                        <div class="citations-list">
                            ${msg.citations.map((citation, idx) => `
                                <div class="citation-item">
                                    <span class="citation-number">${idx + 1}</span>
                                    <span class="citation-name">${citation.document_name}</span>
                                    <span class="citation-relevance">${Math.round(citation.relevance * 100)}% match</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            return `
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
                        ${citationsHTML}
                    </div>
                </div>
            `;
        }).join('');

        messageList.innerHTML = messagesHTML;

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
            console.log('Agents button clicked');
            this.showAgentLibrary();
        });

        // View Integrations button
        document.getElementById('view-integrations-btn')?.addEventListener('click', () => {
            console.log('Integrations button clicked');
            this.showIntegrationsLibrary();
        });

        // View Knowledge button
        document.getElementById('view-knowledge-btn')?.addEventListener('click', () => {
            console.log('Knowledge button clicked');
            this.showKnowledgeLibrary();
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

        // Populate master agent dropdown
        this.populateMasterAgentDropdown();

        // Setup create master agent toggle
        const createBtn = document.getElementById('create-master-agent-btn');
        const newAgentForm = document.getElementById('new-master-agent-form');
        const masterAgentSelect = document.getElementById('space-master-agent');

        if (createBtn && newAgentForm) {
            createBtn.onclick = () => {
                const isVisible = newAgentForm.style.display !== 'none';
                newAgentForm.style.display = isVisible ? 'none' : 'block';
                createBtn.textContent = isVisible ? '+ Create new master agent' : 'Cancel new agent';
                if (!isVisible) {
                    masterAgentSelect.value = '';  // Clear selection when creating new
                }
            };
        }

        // Reset form
        if (newAgentForm) newAgentForm.style.display = 'none';
        if (createBtn) createBtn.textContent = '+ Create new master agent';
        document.getElementById('new-master-agent-name')?.setAttribute('value', '');
        document.getElementById('new-master-agent-desc')?.setAttribute('value', '');

        modal.classList.add('active');
    }

    populateMasterAgentDropdown() {
        const select = document.getElementById('space-master-agent');
        if (!select) return;

        // Filter for Master and Team tier agents (suitable as space masters)
        const masterAgents = this.agents.filter(a =>
            a.tier?.toLowerCase() === 'master' || a.tier?.toLowerCase() === 'team'
        );

        // Build options HTML
        let optionsHtml = '<option value="">Select or create a master agent...</option>';

        // Group by tier
        const masterTier = masterAgents.filter(a => a.tier?.toLowerCase() === 'master');
        const teamTier = masterAgents.filter(a => a.tier?.toLowerCase() === 'team');

        if (masterTier.length > 0) {
            optionsHtml += '<optgroup label="Master Agents">';
            masterTier.forEach(agent => {
                optionsHtml += `<option value="${agent.id}">${agent.name}</option>`;
            });
            optionsHtml += '</optgroup>';
        }

        if (teamTier.length > 0) {
            optionsHtml += '<optgroup label="Team Agents">';
            teamTier.forEach(agent => {
                optionsHtml += `<option value="${agent.id}">${agent.name}</option>`;
            });
            optionsHtml += '</optgroup>';
        }

        select.innerHTML = optionsHtml;
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
        const masterAgentSelect = document.getElementById('space-master-agent');
        const newAgentForm = document.getElementById('new-master-agent-form');
        const newAgentNameInput = document.getElementById('new-master-agent-name');
        const newAgentDescInput = document.getElementById('new-master-agent-desc');

        if (!nameInput || !nameInput.value.trim()) {
            alert('Please enter a space name');
            return;
        }

        let masterAgentId = masterAgentSelect?.value || null;

        // Check if user wants to create a new master agent
        const isCreatingNewAgent = newAgentForm && newAgentForm.style.display !== 'none';
        if (isCreatingNewAgent) {
            const newAgentName = newAgentNameInput?.value?.trim();
            if (!newAgentName) {
                alert('Please enter a name for the new master agent');
                return;
            }

            // Create the new agent first
            try {
                const agentResponse = await fetch('/api/agents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newAgentName,
                        type: 'Team',  // New space master agents are Team tier
                        description: newAgentDescInput?.value?.trim() || `Master agent for ${nameInput.value.trim()} space`,
                        status: 'active'
                    })
                });

                const agentData = await agentResponse.json();

                if (agentData.success && agentData.agent) {
                    masterAgentId = agentData.agent.id;
                    // Reload agents to include the new one
                    await this.loadAgents();
                } else {
                    alert('Failed to create master agent: ' + (agentData.message || 'Unknown error'));
                    return;
                }
            } catch (error) {
                console.error('Failed to create master agent:', error);
                alert('Failed to create master agent');
                return;
            }
        }

        const spaceData = {
            name: nameInput.value.trim(),
            description: descInput?.value.trim() || '',
            agent_ids: Array.from(this.selectedAgents),
            master_agent_id: masterAgentId ? parseInt(masterAgentId) : null
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
                if (masterAgentSelect) masterAgentSelect.value = '';
                if (newAgentNameInput) newAgentNameInput.value = '';
                if (newAgentDescInput) newAgentDescInput.value = '';
                if (newAgentForm) newAgentForm.style.display = 'none';
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
        console.log('showAgentLibrary() called');

        // Hide all other content
        const welcomeState = document.getElementById('welcome-state');
        const inputArea = document.getElementById('input-area');
        const knowledgeLibrary = document.getElementById('knowledge-library');
        const integrationsLibrary = document.getElementById('integrations-library');

        if (welcomeState) welcomeState.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';
        if (knowledgeLibrary) knowledgeLibrary.style.display = 'none';
        if (integrationsLibrary) integrationsLibrary.style.display = 'none';

        // Hide message list
        const messageList = document.querySelector('.message-list');
        if (messageList) messageList.style.display = 'none';

        // Show agent library
        const agentLibrary = document.getElementById('agent-library');
        console.log('Agent library element:', agentLibrary);
        if (agentLibrary) agentLibrary.style.display = 'block';

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
            const tierKey = agent.tier?.toLowerCase();
            if (tierKey && agentsByTier[tierKey]) {
                agentsByTier[tierKey].push(agent);
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

    async showIntegrationsLibrary() {
        // Hide all other content
        const welcomeState = document.getElementById('welcome-state');
        const agentLibrary = document.getElementById('agent-library');
        const knowledgeLibrary = document.getElementById('knowledge-library');
        const inputArea = document.getElementById('input-area');

        if (welcomeState) welcomeState.style.display = 'none';
        if (agentLibrary) agentLibrary.style.display = 'none';
        if (knowledgeLibrary) knowledgeLibrary.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';

        // Hide message list
        const messageList = document.querySelector('.message-list');
        if (messageList) messageList.style.display = 'none';

        // Show integrations library
        const integrationsLibrary = document.getElementById('integrations-library');
        if (integrationsLibrary) integrationsLibrary.style.display = 'block';

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

        // Load integrations from API
        await this.loadIntegrations();
    }

    async loadIntegrations() {
        try {
            const response = await fetch('/api/integrations');
            const data = await response.json();

            if (data.success) {
                this.integrations = data.integrations;
                this.renderIntegrations();
            }
        } catch (error) {
            console.error('Failed to load integrations:', error);
            this.showError('Failed to load integrations');
        }
    }

    renderIntegrations() {
        // Group integrations by category
        const categories = {};
        this.integrations.forEach(integration => {
            const cat = integration.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(integration);
        });

        // Category display names
        const categoryNames = {
            'productivity': 'Productivity & Task Management',
            'communication': 'Communication',
            'calendar': 'Calendar & Scheduling',
            'other': 'Other Integrations'
        };

        // Build HTML
        const container = document.getElementById('integrations-library');
        if (!container) return;

        let html = `
            <div class="library-header">
                <h1>Integrations</h1>
                <p class="library-subtitle">Connect Cleo with your favorite tools and services</p>
            </div>
        `;

        for (const [category, integrations] of Object.entries(categories)) {
            html += `
                <div class="integration-group">
                    <div class="group-header">
                        <h2>${categoryNames[category] || category}</h2>
                        <span class="integration-count">${integrations.length}</span>
                    </div>
                    <div class="integration-cards">
                        ${integrations.map(i => this.createIntegrationCard(i)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Setup handlers for all integration cards
        this.setupIntegrationsHandlers();
    }

    createIntegrationCard(integration) {
        const statusClass = integration.enabled ? 'integration-connected' : 'integration-disconnected';
        const statusText = integration.enabled ? 'Connected' : 'Not Connected';

        return `
            <div class="integration-card" data-integration="${integration.name}">
                <div class="integration-card-header">
                    <div class="integration-card-icon integration-${integration.icon || integration.name}">
                        ${this.getIntegrationIcon(integration.name)}
                    </div>
                    <div class="integration-card-info">
                        <h3 class="integration-card-name">${integration.display_name}</h3>
                        <div class="integration-card-status ${statusClass}">${statusText}</div>
                    </div>
                </div>
                <p class="integration-card-description">
                    ${integration.description || 'Connect this integration to extend Cleo\'s capabilities.'}
                </p>
                <div class="integration-card-footer">
                    <button class="btn-secondary btn-sm" onclick="window.spacesApp.showIntegrationConfig('${integration.name}')">Configure</button>
                    ${integration.enabled ?
                        `<button class="btn-text btn-sm" onclick="window.spacesApp.disconnectIntegration('${integration.name}')">Disconnect</button>` :
                        `<button class="btn-primary btn-sm" onclick="window.spacesApp.connectIntegration('${integration.name}')">Connect</button>`
                    }
                </div>
            </div>
        `;
    }

    getIntegrationIcon(name) {
        const icons = {
            todoist: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 5.6L12 .6 3 5.6v12.8L12 23.4l9-5V5.6zm-9 15l-7.6-4.1V7.9l7.6 4.1v8.6zm0-10.3L4.4 6.2 12 2.1l7.6 4.1-7.6 4.1zm8.4 6.2l-7.6 4.1v-8.6l7.6-4.1v8.6z"/></svg>',
            telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
            microsoft: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 2H2v9.4h9.4V2zm0 10.6H2V22h9.4v-9.4zM22 2h-9.4v9.4H22V2zm0 10.6h-9.4V22H22v-9.4z"/></svg>',
            google: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>',
            slack: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>',
            notion: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.023c-.42-.326-.98-.7-2.055-.607L3.01 2.395c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.355c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.746c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.28v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933zM2.59 1.042l13.634-.933c1.681-.14 2.101.093 2.802.607l3.876 2.707c.56.42.747.56.747 1.026v15.857c0 1.027-.373 1.635-1.681 1.728L6.015 23.24c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.348c0-.841.374-1.4 1.075-1.493z"/></svg>',
            default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
        };
        return icons[name] || icons.default;
    }

    setupIntegrationsHandlers() {
        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target === el) {
                    this.closeAllModals();
                }
            });
        });
    }

    showIntegrationConfig(integrationName) {
        const integration = this.integrations?.find(i => i.name === integrationName);
        if (!integration) return;

        // Create modal HTML based on integration type
        const modalHtml = this.createConfigModal(integration);

        // Add modal to page if not exists
        let modal = document.getElementById(`${integrationName}-config-modal`);
        if (!modal) {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer.firstElementChild);
            modal = document.getElementById(`${integrationName}-config-modal`);
        }

        // Show modal
        if (modal) modal.classList.add('active');
    }

    createConfigModal(integration) {
        const fields = this.getConfigFields(integration.name);

        return `
            <div class="modal-overlay" id="${integration.name}-config-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Configure ${integration.display_name}</h2>
                        <button class="modal-close" onclick="window.spacesApp.closeAllModals()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="modal-description">${integration.description}</p>
                        <form id="${integration.name}-config-form" onsubmit="event.preventDefault(); window.spacesApp.saveIntegrationConfig('${integration.name}')">
                            ${fields.map(f => `
                                <div class="form-group">
                                    <label for="${integration.name}-${f.name}">${f.label}</label>
                                    <input type="${f.type || 'text'}"
                                           id="${integration.name}-${f.name}"
                                           name="${f.name}"
                                           placeholder="${f.placeholder || ''}"
                                           value="${integration.config?.[f.name] === '***' ? '' : (integration.config?.[f.name] || '')}"
                                           ${f.required ? 'required' : ''}>
                                    ${f.help ? `<small class="form-help">${f.help}</small>` : ''}
                                </div>
                            `).join('')}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="window.spacesApp.closeAllModals()">Cancel</button>
                        <button class="btn-secondary" onclick="window.spacesApp.testIntegration('${integration.name}')">Test Connection</button>
                        <button class="btn-primary" onclick="window.spacesApp.saveIntegrationConfig('${integration.name}')">Save & Connect</button>
                    </div>
                </div>
            </div>
        `;
    }

    getConfigFields(integrationName) {
        const fieldConfigs = {
            todoist: [
                { name: 'api_token', label: 'API Token', type: 'password', required: true, placeholder: 'Enter your Todoist API token', help: 'Get your API token from Todoist Settings > Integrations' }
            ],
            telegram: [
                { name: 'bot_token', label: 'Bot Token', type: 'password', required: true, placeholder: 'Enter your Telegram bot token', help: 'Create a bot via @BotFather on Telegram' }
            ],
            microsoft_graph: [
                { name: 'tenant_id', label: 'Tenant ID', required: true, placeholder: 'Azure AD Tenant ID' },
                { name: 'client_id', label: 'Client ID', required: true, placeholder: 'Application Client ID' },
                { name: 'client_secret', label: 'Client Secret', type: 'password', required: true, placeholder: 'Application Client Secret' }
            ],
            google_calendar: [
                { name: 'credentials', label: 'Credentials JSON', type: 'textarea', required: true, placeholder: 'Paste your Google credentials JSON' }
            ],
            slack: [
                { name: 'bot_token', label: 'Bot Token', type: 'password', required: true, placeholder: 'xoxb-...', help: 'Get from Slack App settings > OAuth & Permissions' }
            ],
            notion: [
                { name: 'api_key', label: 'Integration Token', type: 'password', required: true, placeholder: 'secret_...', help: 'Create an integration at notion.so/my-integrations' }
            ]
        };

        return fieldConfigs[integrationName] || [
            { name: 'api_key', label: 'API Key', type: 'password', required: true }
        ];
    }

    async saveIntegrationConfig(integrationName) {
        const form = document.getElementById(`${integrationName}-config-form`);
        if (!form) return;

        const formData = new FormData(form);
        const config = {};
        for (const [key, value] of formData.entries()) {
            if (value) config[key] = value;
        }

        try {
            const response = await fetch(`/api/integrations/${integrationName}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message || 'Integration connected successfully');
                this.closeAllModals();
                await this.loadIntegrations();
            } else {
                this.showError(data.message || 'Failed to connect integration');
            }
        } catch (error) {
            console.error('Failed to save integration config:', error);
            this.showError('Failed to save configuration');
        }
    }

    async connectIntegration(integrationName) {
        this.showIntegrationConfig(integrationName);
    }

    async disconnectIntegration(integrationName) {
        const integration = this.integrations?.find(i => i.name === integrationName);
        const displayName = integration?.display_name || integrationName;

        if (!confirm(`Are you sure you want to disconnect ${displayName}?`)) return;

        try {
            const response = await fetch(`/api/integrations/${integrationName}/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message || `${displayName} disconnected`);
                await this.loadIntegrations();
            } else {
                this.showError(data.message || 'Failed to disconnect');
            }
        } catch (error) {
            console.error('Failed to disconnect integration:', error);
            this.showError('Failed to disconnect integration');
        }
    }

    async testIntegration(integrationName) {
        // First save the config
        const form = document.getElementById(`${integrationName}-config-form`);
        if (!form) return;

        const formData = new FormData(form);
        const config = {};
        for (const [key, value] of formData.entries()) {
            if (value) config[key] = value;
        }

        try {
            // Save config first
            await fetch(`/api/integrations/${integrationName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });

            // Test connection
            const response = await fetch(`/api/integrations/${integrationName}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message || 'Connection test successful');
            } else {
                this.showError(data.message || 'Connection test failed');
            }
        } catch (error) {
            console.error('Failed to test integration:', error);
            this.showError('Failed to test connection');
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // ===================================
    // Knowledge Library
    // ===================================

    showKnowledgeLibrary() {
        // Hide all other content
        const welcomeState = document.getElementById('welcome-state');
        const agentLibrary = document.getElementById('agent-library');
        const integrationsLibrary = document.getElementById('integrations-library');
        const inputArea = document.getElementById('input-area');

        if (welcomeState) welcomeState.style.display = 'none';
        if (agentLibrary) agentLibrary.style.display = 'none';
        if (integrationsLibrary) integrationsLibrary.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';

        // Hide message list
        const messageList = document.querySelector('.message-list');
        if (messageList) messageList.style.display = 'none';

        // Show knowledge library
        const knowledgeLibrary = document.getElementById('knowledge-library');
        if (knowledgeLibrary) knowledgeLibrary.style.display = 'block';

        // Update header
        document.getElementById('space-title').textContent = 'Knowledge Base';
        document.getElementById('space-meta').style.display = 'none';

        // Clear current space
        this.currentSpace = null;

        // Collapse right sidebar (not in a space)
        const rightSidebar = document.getElementById('right-sidebar');
        if (rightSidebar) {
            rightSidebar.classList.add('collapsed');
        }

        // Setup upload handlers
        this.setupFileUpload();

        // Setup search handlers
        this.setupSearch();

        // Load documents
        this.loadDocuments();
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.getElementById('browse-files-btn');
        const scanFolderBtn = document.getElementById('scan-folder-btn');

        // Browse files button
        if (browseBtn && fileInput) {
            browseBtn.onclick = () => fileInput.click();
        }

        // File input change
        if (fileInput) {
            fileInput.onchange = (e) => {
                const files = Array.from(e.target.files);
                this.uploadFiles(files);
            };
        }

        // Drag and drop
        if (uploadArea) {
            uploadArea.ondragover = (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            };

            uploadArea.ondragleave = () => {
                uploadArea.classList.remove('drag-over');
            };

            uploadArea.ondrop = (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                const files = Array.from(e.dataTransfer.files);
                this.uploadFiles(files);
            };
        }

        // Scan folder button
        if (scanFolderBtn) {
            scanFolderBtn.onclick = () => this.showScanFolderModal();
        }
    }

    async uploadFiles(files) {
        if (!files || files.length === 0) return;

        this.showSuccess(`Uploading ${files.length} file(s)...`, 2000);

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/knowledge/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    this.showSuccess(`Uploaded: ${file.name}`);
                } else {
                    this.showError(`Failed to upload ${file.name}: ${data.message}`);
                }
            } catch (error) {
                console.error('Upload error:', error);
                this.showError(`Error uploading ${file.name}`);
            }
        }

        // Reload documents list
        await this.loadDocuments();
    }

    async loadDocuments() {
        try {
            const response = await fetch('/api/knowledge/documents');
            const data = await response.json();

            if (data.success) {
                this.renderDocuments(data.documents || []);
                this.updateKnowledgeStats(data.stats || {});
            }
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    }

    renderDocuments(documents) {
        const documentsList = document.getElementById('documents-list');
        const documentCount = document.getElementById('document-count');

        if (!documentsList) return;

        if (documentCount) documentCount.textContent = documents.length;

        if (documents.length === 0) {
            documentsList.innerHTML = '<p class="placeholder-text">No documents uploaded yet</p>';
            return;
        }

        documentsList.innerHTML = documents.map(doc => `
            <div class="document-card" data-doc-id="${doc.id}">
                <div class="document-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                </div>
                <div class="document-info">
                    <div class="document-name">${doc.name}</div>
                    <div class="document-meta">
                        ${doc.size} • ${doc.chunks || 0} chunks • ${this.formatDate(doc.uploaded_at)}
                    </div>
                </div>
                <button class="btn-icon document-delete" data-doc-id="${doc.id}" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Add delete handlers
        documentsList.querySelectorAll('.document-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.dataset.docId;
                if (confirm('Delete this document?')) {
                    await this.deleteDocument(docId);
                }
            });
        });
    }

    async deleteDocument(docId) {
        try {
            const response = await fetch(`/api/knowledge/documents/${docId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Document deleted');
                await this.loadDocuments();
            } else {
                this.showError('Failed to delete document');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Error deleting document');
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('knowledge-search-input');
        const searchBtn = document.getElementById('knowledge-search-btn');
        const clearBtn = document.getElementById('clear-search-btn');
        const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
        const exportBtn = document.getElementById('export-results-btn');
        const viewGraphBtn = document.getElementById('view-graph-btn');

        // Toggle filters
        if (toggleFiltersBtn) {
            toggleFiltersBtn.addEventListener('click', () => {
                const filters = document.getElementById('search-filters');
                if (filters) {
                    filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Search button click
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput?.value?.trim();
                if (query) {
                    this.performSearch(query);
                }
            });
        }

        // Enter key in search input
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        this.performSearch(query);
                    }
                }
            });
        }

        // Clear search button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Export results button
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSearchResults();
            });
        }

        // View graph button
        if (viewGraphBtn) {
            viewGraphBtn.addEventListener('click', () => {
                this.toggleKnowledgeGraph();
            });
        }
    }

    async performSearch(query) {
        const searchResults = document.getElementById('search-results');
        const searchResultsList = document.getElementById('search-results-list');
        const searchResultsTitle = document.getElementById('search-results-title');

        if (!searchResults || !searchResultsList) return;

        // Show loading state
        searchResults.style.display = 'block';
        searchResultsList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--color-text-secondary);">Searching...</p>';

        try {
            // Get filter values
            const fileTypeCheckboxes = document.querySelectorAll('.filter-checkboxes input[type="checkbox"]:checked');
            const fileTypes = Array.from(fileTypeCheckboxes).map(cb => cb.value);
            const dateFrom = document.getElementById('date-from')?.value || null;
            const dateTo = document.getElementById('date-to')?.value || null;

            // Use advanced search if filters are applied
            const useAdvanced = fileTypes.length < 4 || dateFrom || dateTo;
            const endpoint = useAdvanced ? '/api/knowledge/search/advanced' : '/api/knowledge/search';

            const requestBody = {
                query: query,
                n_results: 10
            };

            if (useAdvanced) {
                if (fileTypes.length > 0) requestBody.file_types = fileTypes;
                if (dateFrom) requestBody.date_from = new Date(dateFrom).toISOString();
                if (dateTo) requestBody.date_to = new Date(dateTo).toISOString();
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success && data.results && data.results.length > 0) {
                searchResultsTitle.textContent = `${data.total_results} Result${data.total_results !== 1 ? 's' : ''}`;
                this.currentSearchResults = data.results; // Store for export
                this.renderSearchResults(data.results);
            } else {
                searchResultsTitle.textContent = 'No Results';
                this.currentSearchResults = [];
                searchResultsList.innerHTML = `
                    <div class="no-results">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <p>No relevant documents found for "${query}"</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResultsList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--color-error);">Error performing search</p>';
        }
    }

    renderSearchResults(results) {
        const searchResultsList = document.getElementById('search-results-list');
        if (!searchResultsList) return;

        searchResultsList.innerHTML = results.map(result => {
            const relevanceScore = (result.relevance * 100).toFixed(0);
            let relevanceClass = 'relevance-low';
            if (result.relevance >= 0.7) relevanceClass = 'relevance-high';
            else if (result.relevance >= 0.4) relevanceClass = 'relevance-medium';

            return `
                <div class="search-result-item">
                    <div class="result-header">
                        <div class="result-source">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            ${result.document.name}
                        </div>
                        <div class="result-relevance ${relevanceClass}">
                            ${relevanceScore}% match
                        </div>
                    </div>
                    <div class="result-content">
                        ${this.escapeHtml(result.content)}
                    </div>
                    <div class="result-meta">
                        <span>Chunk ${result.chunk_index + 1}</span>
                        <span>•</span>
                        <span>${result.document.file_type.toUpperCase()}</span>
                        <span>•</span>
                        <span>${this.formatDate(result.document.uploaded_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    clearSearch() {
        const searchInput = document.getElementById('knowledge-search-input');
        const searchResults = document.getElementById('search-results');

        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateKnowledgeStats(stats) {
        const statChunks = document.getElementById('stat-chunks');
        const statEntities = document.getElementById('stat-entities');
        const statRelations = document.getElementById('stat-relations');

        if (statChunks) statChunks.textContent = stats.chunks || 0;
        if (statEntities) statEntities.textContent = stats.entities || 0;
        if (statRelations) statRelations.textContent = stats.relations || 0;
    }

    showScanFolderModal() {
        const modal = document.getElementById('scan-folder-modal');
        const folderPathInput = document.getElementById('folder-path-input');
        const startScanBtn = document.getElementById('start-scan-btn');
        const cancelScanBtn = document.getElementById('cancel-scan-btn');
        const closeScanModal = document.getElementById('close-scan-modal');
        const scanProgress = document.getElementById('scan-progress');
        const scanResults = document.getElementById('scan-results');

        if (!modal) return;

        // Reset modal state
        if (folderPathInput) folderPathInput.value = '';
        if (scanProgress) scanProgress.style.display = 'none';
        if (scanResults) scanResults.style.display = 'none';

        // Show modal
        modal.style.display = 'flex';

        // Close modal handler
        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (closeScanModal) closeScanModal.onclick = closeModal;
        if (cancelScanBtn) cancelScanBtn.onclick = closeModal;

        // Start scan handler
        if (startScanBtn) {
            startScanBtn.onclick = async () => {
                const folderPath = folderPathInput?.value?.trim();

                if (!folderPath) {
                    this.showError('Please enter a folder path');
                    return;
                }

                await this.scanFolder(folderPath);
            };
        }

        // Enter key handler
        if (folderPathInput) {
            folderPathInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    startScanBtn?.click();
                }
            };
        }
    }

    async scanFolder(folderPath) {
        const scanProgress = document.getElementById('scan-progress');
        const scanStatus = document.getElementById('scan-status');
        const scanCount = document.getElementById('scan-count');
        const scanProgressFill = document.getElementById('scan-progress-fill');
        const scanResults = document.getElementById('scan-results');
        const startScanBtn = document.getElementById('start-scan-btn');

        // Show progress
        if (scanProgress) scanProgress.style.display = 'block';
        if (scanResults) scanResults.style.display = 'none';
        if (startScanBtn) startScanBtn.disabled = true;

        try {
            // Update status
            if (scanStatus) scanStatus.textContent = 'Scanning folder...';
            if (scanProgressFill) scanProgressFill.style.width = '50%';

            const response = await fetch('/api/knowledge/scan-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    folder_path: folderPath
                })
            });

            const data = await response.json();

            // Update progress to complete
            if (scanProgressFill) scanProgressFill.style.width = '100%';

            if (data.success) {
                // Hide progress, show results
                if (scanProgress) scanProgress.style.display = 'none';
                if (scanResults) {
                    scanResults.style.display = 'block';
                    scanResults.innerHTML = `
                        <div class="scan-result-summary">
                            <h3 style="margin: 0 0 12px 0; color: var(--color-text-primary);">Scan Complete</h3>
                            <p style="margin: 0; color: var(--color-text-secondary);">${data.message}</p>
                            <div class="scan-result-stats">
                                <div class="scan-stat">
                                    <div class="scan-stat-value">${data.discovered || 0}</div>
                                    <div class="scan-stat-label">Discovered</div>
                                </div>
                                <div class="scan-stat">
                                    <div class="scan-stat-value">${data.uploaded || 0}</div>
                                    <div class="scan-stat-label">Uploaded</div>
                                </div>
                                <div class="scan-stat">
                                    <div class="scan-stat-value">${data.failed || 0}</div>
                                    <div class="scan-stat-label">Failed</div>
                                </div>
                            </div>
                            ${data.errors && data.errors.length > 0 ? `
                                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
                                    <h4 style="margin: 0 0 8px 0; color: var(--color-error);">Errors:</h4>
                                    <ul style="margin: 0; padding-left: 20px; color: var(--color-text-secondary);">
                                        ${data.errors.map(err => `<li>${err.name}: ${err.error}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }

                // Refresh documents list
                await this.loadDocuments();

                this.showSuccess(`Uploaded ${data.uploaded || 0} document(s)`);
            } else {
                this.showError(data.message || 'Failed to scan folder');
                if (scanProgress) scanProgress.style.display = 'none';
            }

        } catch (error) {
            console.error('Scan error:', error);
            this.showError('Error scanning folder');
            if (scanProgress) scanProgress.style.display = 'none';
        } finally {
            if (startScanBtn) startScanBtn.disabled = false;
        }
    }

    async exportSearchResults() {
        if (!this.currentSearchResults || this.currentSearchResults.length === 0) {
            this.showError('No search results to export');
            return;
        }

        try {
            const response = await fetch('/api/knowledge/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    results: this.currentSearchResults
                })
            });

            if (response.ok) {
                // Trigger download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `knowledge_search_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showSuccess('Results exported successfully');
            } else {
                this.showError('Failed to export results');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Error exporting results');
        }
    }

    async toggleKnowledgeGraph() {
        const graphContainer = document.getElementById('graph-container');
        const viewGraphBtn = document.getElementById('view-graph-btn');

        if (!graphContainer) return;

        if (graphContainer.style.display === 'none') {
            // Load and show graph
            graphContainer.style.display = 'block';
            viewGraphBtn.textContent = 'Hide Graph';
            await this.renderKnowledgeGraph();
        } else {
            // Hide graph
            graphContainer.style.display = 'none';
            viewGraphBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="6"/>
                    <circle cx="12" cy="12" r="2"/>
                </svg>
                View Graph
            `;
        }
    }

    async renderKnowledgeGraph() {
        const canvas = document.getElementById('graph-canvas');
        const graphInfo = document.getElementById('graph-info');

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
            const response = await fetch('/api/knowledge/graph');
            const data = await response.json();

            if (!data.success || !data.graph) {
                graphInfo.textContent = 'Failed to load graph data';
                return;
            }

            const { nodes, edges } = data.graph;

            if (nodes.length === 0) {
                graphInfo.textContent = 'No documents to visualize';
                return;
            }

            // Simple force-directed layout (circular for simplicity)
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) - 60;

            // Position nodes in a circle
            nodes.forEach((node, i) => {
                const angle = (i / nodes.length) * 2 * Math.PI;
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            });

            // Draw edges
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            edges.forEach(edge => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (source && target) {
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.globalAlpha = edge.weight || 0.3;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            });

            // Draw nodes
            nodes.forEach(node => {
                // Node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
                ctx.fillStyle = '#6366f1';
                ctx.fill();
                ctx.strokeStyle = '#4f46e5';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Node label
                ctx.fillStyle = '#000';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                const label = node.label.length > 15 ? node.label.slice(0, 12) + '...' : node.label;
                ctx.fillText(label, node.x, node.y + 35);
            });

            graphInfo.innerHTML = `
                <strong>${nodes.length}</strong> documents,
                <strong>${edges.length}</strong> relationships
            `;

            // Add click handler for nodes
            canvas.onclick = (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const clicked = nodes.find(node => {
                    const dx = x - node.x;
                    const dy = y - node.y;
                    return Math.sqrt(dx * dx + dy * dy) < 20;
                });

                if (clicked) {
                    graphInfo.innerHTML = `
                        <strong>${clicked.label}</strong><br>
                        Type: ${clicked.file_type}<br>
                        Chunks: ${clicked.chunks}<br>
                        Size: ${(clicked.size / 1024).toFixed(1)} KB
                    `;
                }
            };

        } catch (error) {
            console.error('Graph render error:', error);
            graphInfo.textContent = 'Error rendering graph';
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
