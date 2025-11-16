let demoChatId = null;
let isProcessingDemo = false;
let chatCreationPromise = null;
let statAnimationStarted = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeNavbar();
    initializeDemo();
    initializeScrollAnimations();
    initializeStatAnimations();
    initializeFeatureCards();
    addEasterEggs();
    initializeWaitlistModal();
    
    const demoInput = document.getElementById('demoChatInput');
    if (demoInput) {
        demoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendDemoMessage();
            }
        });
        
        demoInput.addEventListener('focus', function() {
            this.placeholder = 'Go ahead, ask me anything...';
        });
        
        demoInput.addEventListener('blur', function() {
            this.placeholder = 'Ask a question about Apple\'s financials... (e.g., \'What was their revenue?\')';
        });
    }
});

function initializeNavbar() {
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

function initializeDemo() {
    const input = document.getElementById('demoChatInput');
    const sendButton = document.getElementById('demoSendButton');
    
    if (input) {
        input.disabled = true;
        input.placeholder = 'Readying demo...';
    }
    if (sendButton) {
        sendButton.disabled = true;
    }
    
    chatCreationPromise = createDemoChat();
}

async function createDemoChat() {
    try {
        const response = await fetch('/api/create-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker: 'AAPL' }),
        });

        const data = await response.json();
        if (response.ok) {
            demoChatId = data.chat_id;
            showDemoReady();
            return demoChatId;
        } else {
            showDemoError();
            return null;
        }
    } catch (error) {
        showDemoError();
        return null;
    }
}

function showDemoReady() {
    const welcomeMessage = document.getElementById('demoWelcomeMessage');
    const loadingBadge = document.querySelector('#demoChatMessages .rounded-full');
    const input = document.getElementById('demoChatInput');
    const sendButton = document.getElementById('demoSendButton');
    
    if (welcomeMessage && loadingBadge) {
        loadingBadge.style.display = 'none';
        welcomeMessage.style.display = 'block';
        welcomeMessage.style.animation = 'fadeIn 0.3s ease-in';
    }
    
    if (input) {
        input.disabled = false;
        input.placeholder = 'Ask a question about Apple\'s financials... (e.g., \'What was their revenue?\')';
    }
    if (sendButton) {
        sendButton.disabled = false;
    }
}

function showDemoError() {
    const welcomeMessage = document.getElementById('demoWelcomeMessage');
    const loadingBadge = document.querySelector('#demoChatMessages .rounded-full');
    const container = document.querySelector('#demoChatMessages > div');
    const input = document.getElementById('demoChatInput');
    const sendButton = document.getElementById('demoSendButton');
    
    if (container && loadingBadge) {
        loadingBadge.style.display = 'none';
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        container.innerHTML = `
            <p class="text-sm text-red-600 leading-relaxed">
                Unable to initialize demo. Please refresh the page.
            </p>
        `;
    }
    
    if (input) {
        input.disabled = true;
        input.placeholder = 'Demo unavailable - please refresh';
    }
    if (sendButton) {
        sendButton.disabled = true;
    }
}

async function sendDemoMessage() {
    if (isProcessingDemo) {
        return;
    }

    const input = document.getElementById('demoChatInput');
    const question = input.value.trim();
    
    if (!question) {
        return;
    }

    const isFirstQuery = !localStorage.getItem('demo_query_sent');
    if (isFirstQuery) {
        localStorage.setItem('demo_query_sent', 'true');
    }

    if (!demoChatId && chatCreationPromise) {
        await chatCreationPromise;
    }

    if (!demoChatId) {
        demoChatId = await createDemoChat();
        if (!demoChatId) {
            const messagesDiv = document.getElementById('demoChatMessages');
            if (messagesDiv) {
                messagesDiv.innerHTML += `
                    <div class="bg-white border border-red-200 rounded-xl p-4">
                        <p class="text-sm text-red-600">Unable to initialize demo. Please refresh the page.</p>
                    </div>
                `;
            }
            return;
        }
    }

    input.value = '';
    isProcessingDemo = true;
    updateDemoSendButton(true);

    const messagesDiv = document.getElementById('demoChatMessages');
    const container = document.getElementById('demoChatContainer');
    
    messagesDiv.innerHTML += `
        <div class="bg-white rounded-xl p-4 border border-gray-200">
            <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${question}</div>
            <div class="text-gray-700 leading-relaxed markdown-content">
                <span class="loading-dots">Thinking</span>
            </div>
        </div>
    `;
    
    container.scrollTop = container.scrollHeight;

    try {
        const response = await fetch(`/api/chats/${demoChatId}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question }),
        });

        const data = await response.json();
        const lastMsg = messagesDiv.lastElementChild;

        if (response.ok && data.answer) {
            lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${data.question}</div>
                <div class="text-gray-700 leading-relaxed markdown-content">${renderMarkdown(data.answer)}</div>
            `;
            const markdownContent = lastMsg.querySelector('.markdown-content');
            if (markdownContent) {
                renderMath(markdownContent);
            }
        } else {
            lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${question}</div>
                <div class="text-red-600">Error: ${data.error || 'Unable to get answer'}</div>
            `;
        }
        
        container.scrollTop = container.scrollHeight;
        
        if (isFirstQuery) {
            setTimeout(() => {
                showWaitlistModal();
            }, 500);
        }
    } catch (error) {
        const lastMsg = messagesDiv.lastElementChild;
        if (lastMsg) {
            lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${question}</div>
                <div class="text-red-600">Network error. Please try again.</div>
            `;
        }
    } finally {
        isProcessingDemo = false;
        updateDemoSendButton(false);
    }
}

function updateDemoSendButton(isProcessing) {
    const sendButton = document.getElementById('demoSendButton');
    if (!sendButton) return;

    if (isProcessing) {
        sendButton.innerHTML = `
            <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
        `;
        sendButton.disabled = true;
    } else {
        sendButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
            </svg>
        `;
        sendButton.disabled = false;
    }
}

function scrollToDemo() {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
        const offset = 80;
        const elementPosition = demoSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offset = 80;
        const elementPosition = section.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-up').forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        if (index > 0) {
            el.style.transitionDelay = `${Math.min(index * 0.1, 0.5)}s`;
        }
        observer.observe(el);
    });
}

function initializeStatAnimations() {
    const statsSection = document.querySelector('.stat-item')?.closest('section');
    if (!statsSection) return;

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statAnimationStarted) {
                statAnimationStarted = true;
                animateStats();
            }
        });
    }, { threshold: 0.5 });

    observer.observe(statsSection);
}

function animateStats() {
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.animation = 'fadeInUp 0.6s ease-out forwards';
            item.style.opacity = '1';
            
            const numberEl = item.querySelector('div:first-child');
            if (numberEl && numberEl.textContent === '∞') {
                numberEl.style.animation = 'pulse 2s ease-in-out infinite';
            }
        }, index * 150);
    });
}

function initializeFeatureCards() {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.5s ease-out';
            
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }, index * 100);
                    }
                });
            }, { threshold: 0.2 });
            
            observer.observe(card);
        }, 100);
    });
}

function switchFeatureTab(tabName) {
    const tabs = document.querySelectorAll('.feature-tab');
    const panels = document.querySelectorAll('.feature-panel');
    
    tabs.forEach(tab => {
        tab.classList.remove('active', 'text-gray-900', 'border-black');
        tab.classList.add('text-gray-600', 'border-transparent');
    });
    
    panels.forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(tabName + 'Content');
    
    if (activeTab) {
        activeTab.classList.add('active', 'text-gray-900', 'border-black');
        activeTab.classList.remove('text-gray-600', 'border-transparent');
    }
    
    if (activePanel) {
        activePanel.classList.remove('hidden');
        activePanel.classList.add('active');
    }
}

function initializeWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    const closeBtn = document.getElementById('closeWaitlistModal');
    const form = document.getElementById('waitlistForm');
    const emailInput = document.getElementById('waitlistEmail');
    const submitBtn = document.getElementById('waitlistSubmit');
    const messageDiv = document.getElementById('waitlistMessage');
    
    if (!modal || !closeBtn || !form) return;
    
    function hideModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    function showMessage(text, isError = false) {
        messageDiv.textContent = text;
        messageDiv.className = `mt-4 text-sm text-center ${isError ? 'text-red-600' : 'text-green-600'}`;
        messageDiv.classList.remove('hidden');
    }
    
    closeBtn.addEventListener('click', hideModal);
    
    const backdrop = modal.querySelector('.backdrop-blur-sm');
    if (backdrop) {
        backdrop.addEventListener('click', hideModal);
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        if (!email) {
            showMessage('Please enter your email', true);
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Joining...';
        
        try {
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Thanks! We\'ll be in touch soon.', false);
                emailInput.value = '';
                setTimeout(() => {
                    hideModal();
                    setTimeout(() => {
                        messageDiv.classList.add('hidden');
                    }, 300);
                }, 2000);
            } else {
                showMessage(data.error || 'Something went wrong. Please try again.', true);
            }
        } catch (error) {
            showMessage('Network error. Please try again.', true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Join Waitlist';
        }
    });
}

function showWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        const emailInput = document.getElementById('waitlistEmail');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
    }
}

function addEasterEggs() {
    let clickCount = 0;
    const logo = document.querySelector('.logo-img');
    
    if (logo) {
        logo.addEventListener('click', function() {
            clickCount++;
            if (clickCount === 5) {
                this.style.animation = 'spin 1s linear';
                setTimeout(() => {
                    this.style.animation = '';
                    alert('🎉 You found the secret! We\'re actually backed by coffee. Lots of coffee.');
                }, 1000);
                clickCount = 0;
            }
        });
    }
    
    const badges = document.querySelectorAll('span');
    badges.forEach(badge => {
        if (badge.textContent && badge.textContent.includes('Backed by nobody')) {
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', function() {
                const messages = [
                    'We\'re honest, not broke.',
                    'Actually, we\'re both.',
                    'But at least we\'re transparent!',
                    'Unlike some companies...',
                    'We\'re looking at you, Theranos.'
                ];
                const randomMsg = messages[Math.floor(Math.random() * messages.length)];
                const originalText = this.textContent;
                this.textContent = randomMsg;
                setTimeout(() => {
                    this.textContent = originalText;
                }, 3000);
            });
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === '?' && e.shiftKey) {
            const helpText = document.createElement('div');
            helpText.className = 'fixed bottom-4 right-4 bg-black text-white p-4 rounded-xl shadow-xl z-50 max-w-sm';
            helpText.innerHTML = '<p class="text-sm font-semibold mb-2">💡 Pro Tips:</p><ul class="text-xs space-y-1 list-disc list-inside"><li>Click the logo 5 times</li><li>Try the demo - it\'s actually functional</li><li>We don\'t track you (seriously)</li></ul>';
            document.body.appendChild(helpText);
            setTimeout(() => {
                helpText.style.opacity = '0';
                helpText.style.transition = 'opacity 0.3s';
                setTimeout(() => helpText.remove(), 300);
            }, 5000);
        }
    });
}

