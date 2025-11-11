let demoChatId = null;
let isProcessingDemo = false;
let chatCreationPromise = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeNavbar();
    initializeDemo();
    initializeScrollAnimations();
    
    const demoInput = document.getElementById('demoChatInput');
    if (demoInput) {
        demoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendDemoMessage();
            }
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
            console.log('Demo chat created:', demoChatId);
            return demoChatId;
        } else {
            console.error('Failed to create demo chat:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error creating demo chat:', error);
        return null;
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
            <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${question}</div>
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
                <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${data.question}</div>
                <div class="text-gray-700 leading-relaxed markdown-content">${renderMarkdown(data.answer)}</div>
            `;
            const markdownContent = lastMsg.querySelector('.markdown-content');
            if (markdownContent) {
                renderMath(markdownContent);
            }
        } else {
            lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${question}</div>
                <div class="text-red-600">Error: ${data.error || 'Unable to get answer'}</div>
            `;
        }
        
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Error asking question:', error);
        const lastMsg = messagesDiv.lastElementChild;
        if (lastMsg) {
            lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${question}</div>
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
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-up').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
}

