let currentPage = 1;
let totalPages = 1;
let currentMessage = null;

async function validatePin() {
    const pinInput = document.getElementById('pinInput');
    const pinError = document.getElementById('pinError');
    const pin = pinInput.value.trim();

    if (!pin) {
        pinError.textContent = 'Please enter a PIN';
        pinError.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/admin/validate-pin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ pin })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.reload();
        } else {
            pinError.textContent = data.error || 'Invalid PIN';
            pinError.classList.remove('hidden');
            pinInput.value = '';
        }
    } catch (error) {
        pinError.textContent = 'Error validating PIN';
        pinError.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const pinInput = document.getElementById('pinInput');
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validatePin();
            }
        });
    }

    const messageModal = document.getElementById('messageModal');
    if (messageModal) {
        messageModal.addEventListener('click', function(e) {
            if (e.target === messageModal) {
                closeMessageModal();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('messageModal');
            if (modal && !modal.classList.contains('hidden')) {
                closeMessageModal();
            }
        }
    });

    loadStats();
    loadWaitlist();
    loadMessages();
});

async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            credentials: 'include'
        });
        const data = await response.json();

        document.getElementById('statWaitlistTotal').textContent = data.waitlist.total;
        document.getElementById('statWaitlistToday').textContent = data.waitlist.today;
        document.getElementById('statChatsTotal').textContent = data.chats.total;
        document.getElementById('statChatsToday').textContent = data.chats.today;
        document.getElementById('statMessagesTotal').textContent = data.messages.total;
        document.getElementById('statMessagesToday').textContent = data.messages.today;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadWaitlist() {
    const container = document.getElementById('waitlistContainer');
    container.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-8">Loading...</td></tr>';

    try {
        const response = await fetch('/api/admin/waitlist', {
            credentials: 'include'
        });
        const emails = await response.json();

        if (emails.length === 0) {
            container.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-8">No waitlist emails yet</td></tr>';
            return;
        }

        container.innerHTML = emails.map(email => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4">
                    <span class="text-sm text-gray-900">${escapeHtml(email.email)}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-xs text-gray-500">${formatDate(email.created_at)}</span>
                </td>
                <td class="py-3 px-4 text-right">
                    <button 
                        onclick="copyToClipboard('${escapeHtml(email.email)}', this)"
                        class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-all"
                        title="Copy email"
                    >
                        Copy
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading waitlist:', error);
        container.innerHTML = '<tr><td colspan="3" class="text-center text-red-500 py-8">Error loading waitlist</td></tr>';
    }
}

async function loadMessages(page = 1) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-8">Loading...</td></tr>';

    try {
        const response = await fetch(`/api/admin/messages?page=${page}&per_page=30`, {
            credentials: 'include'
        });
        const data = await response.json();

        currentPage = data.pagination.page;
        totalPages = data.pagination.pages;

        if (data.messages.length === 0) {
            container.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-8">No messages yet</td></tr>';
            document.getElementById('messagesPagination').classList.add('hidden');
            return;
        }

        container.innerHTML = data.messages.map((msg, index) => {
            const questionPreview = msg.question.length > 80 
                ? msg.question.substring(0, 80) + '...' 
                : msg.question;

            return `
                <tr 
                    onclick="openMessageModal(${index})"
                    class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    data-message-index="${index}"
                >
                    <td class="py-3 px-4">
                        <span class="text-sm text-gray-900">${escapeHtml(questionPreview)}</span>
                    </td>
                    <td class="py-3 px-4">
                        <span class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">${escapeHtml(msg.ticker)}</span>
                    </td>
                    <td class="py-3 px-4">
                        <span class="text-xs text-gray-500">${formatDate(msg.created_at)}</span>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <button 
                            onclick="event.stopPropagation(); copyMessageFromTable(${index}, this)"
                            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-all"
                            title="Copy message"
                        >
                            Copy
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        window.messagesData = data.messages;

        updatePagination(data.pagination);
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<tr><td colspan="4" class="text-center text-red-500 py-8">Error loading messages</td></tr>';
    }
}

function openMessageModal(index) {
    if (!window.messagesData || !window.messagesData[index]) return;
    
    const msg = window.messagesData[index];
    currentMessage = msg;
    const modal = document.getElementById('messageModal');
    const content = document.getElementById('messageModalContent');
    
    content.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-mono text-gray-500 bg-gray-100 px-3 py-1.5 rounded">ID: ${escapeHtml(msg.id)}</span>
                <span class="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded">Ticker: ${escapeHtml(msg.ticker)}</span>
                <span class="text-xs text-gray-500">${formatDate(msg.created_at)}</span>
            </div>
            <div>
                <p class="text-sm font-semibold text-gray-700 mb-2">Question:</p>
                <div class="prose prose-sm max-w-none text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    ${escapeHtml(msg.question)}
                </div>
            </div>
            <div>
                <p class="text-sm font-semibold text-gray-700 mb-2">Answer:</p>
                <div class="prose prose-sm max-w-none text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200 markdown-content" data-markdown="${escapeHtml(msg.answer)}">
                    ${renderMarkdownText(msg.answer)}
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        renderMarkdownElements();
    }, 100);
}

function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    currentMessage = null;
}

function copyMessageFromTable(index, button) {
    if (!window.messagesData || !window.messagesData[index]) return;
    const msg = window.messagesData[index];
    const text = `ID: ${msg.id}\nQuestion: ${msg.question}\n\nAnswer: ${msg.answer}`;
    copyToClipboard(text, button);
}

function copyMessageFromModal() {
    if (!currentMessage) return;
    const text = `ID: ${currentMessage.id}\nTicker: ${currentMessage.ticker}\nTime: ${formatDate(currentMessage.created_at)}\n\nQuestion:\n${currentMessage.question}\n\nAnswer:\n${currentMessage.answer}`;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('bg-green-600');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('bg-green-600');
        }, 2000);
    }).catch(err => {
        console.error('Error copying:', err);
        alert('Failed to copy');
    });
}

function updatePagination(pagination) {
    const paginationEl = document.getElementById('messagesPagination');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (pagination.pages <= 1) {
        paginationEl.classList.add('hidden');
        return;
    }

    paginationEl.classList.remove('hidden');
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.pages} (${pagination.total} total)`;
    prevBtn.disabled = !pagination.has_prev;
    nextBtn.disabled = !pagination.has_next;
}

function loadMessagesPrev() {
    if (currentPage > 1) {
        loadMessages(currentPage - 1);
    }
}

function loadMessagesNext() {
    if (currentPage < totalPages) {
        loadMessages(currentPage + 1);
    }
}

async function downloadWaitlistCSV() {
    try {
        const response = await fetch('/api/admin/waitlist/csv', {
            credentials: 'include'
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waitlist_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading waitlist CSV:', error);
        alert('Error downloading CSV');
    }
}

async function downloadMessagesCSV() {
    try {
        const response = await fetch('/api/admin/messages/csv', {
            credentials: 'include'
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messages_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading messages CSV:', error);
        alert('Error downloading CSV');
    }
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('bg-green-100', 'text-green-700');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-100', 'text-green-700');
        }, 2000);
    }).catch(err => {
        console.error('Error copying:', err);
        alert('Failed to copy');
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderMarkdownText(text) {
    if (typeof window.renderMarkdown === 'function') {
        return window.renderMarkdown(text);
    }
    if (typeof marked !== 'undefined') {
        try {
            return marked.parse(text || '');
        } catch (e) {
            return text.replace(/\n/g, '<br>');
        }
    }
    return text.replace(/\n/g, '<br>');
}

function renderMarkdownElements() {
    document.querySelectorAll('.markdown-content').forEach(el => {
        const markdownText = el.getAttribute('data-markdown') || el.textContent;
        if (markdownText) {
            el.innerHTML = renderMarkdownText(markdownText);
            if (typeof window.renderMath === 'function') {
                window.renderMath(el);
            }
        }
    });
}
