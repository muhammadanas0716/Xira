let currentPage = 1;
let totalPages = 1;

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
    container.innerHTML = '<div class="text-center text-gray-500 py-8">Loading...</div>';

    try {
        const response = await fetch('/api/admin/waitlist', {
            credentials: 'include'
        });
        const emails = await response.json();

        if (emails.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">No waitlist emails yet</div>';
            return;
        }

        container.innerHTML = emails.map(email => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(email.email)}</p>
                    <p class="text-xs text-gray-500 mt-1">${formatDate(email.created_at)}</p>
                </div>
                <button 
                    onclick="copyToClipboard('${escapeHtml(email.email)}', this)"
                    class="ml-4 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-all opacity-0 group-hover:opacity-100"
                    title="Copy email"
                >
                    Copy
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading waitlist:', error);
        container.innerHTML = '<div class="text-center text-red-500 py-8">Error loading waitlist</div>';
    }
}

async function loadMessages(page = 1) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '<div class="text-center text-gray-500 py-8">Loading...</div>';

    try {
        const response = await fetch(`/api/admin/messages?page=${page}&per_page=20`, {
            credentials: 'include'
        });
        const data = await response.json();

        currentPage = data.pagination.page;
        totalPages = data.pagination.pages;

        if (data.messages.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">No messages yet</div>';
            document.getElementById('messagesPagination').classList.add('hidden');
            return;
        }

        container.innerHTML = data.messages.map(msg => `
            <div class="p-5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">ID: ${msg.id.substring(0, 8)}...</span>
                            <span class="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">${msg.ticker}</span>
                            <span class="text-xs text-gray-500">${formatDate(msg.created_at)}</span>
                        </div>
                    </div>
                    <button 
                        onclick="copyMessage('${escapeHtml(msg.id)}', '${escapeHtml(msg.question)}', '${escapeHtml(msg.answer)}', this)"
                        class="ml-4 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-all"
                        title="Copy message"
                    >
                        Copy
                    </button>
                </div>
                <div class="space-y-3">
                    <div>
                        <p class="text-xs font-semibold text-gray-700 mb-1">Question:</p>
                        <div class="prose prose-sm max-w-none text-gray-900 bg-white p-3 rounded border border-gray-200">
                            ${escapeHtml(msg.question)}
                        </div>
                    </div>
                    <div>
                        <p class="text-xs font-semibold text-gray-700 mb-1">Answer:</p>
                        <div class="prose prose-sm max-w-none text-gray-900 bg-white p-3 rounded border border-gray-200 markdown-content" data-markdown="${escapeHtml(msg.answer)}">
                            ${renderMarkdownText(msg.answer)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        updatePagination(data.pagination);
        setTimeout(renderMarkdownElements, 100);
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<div class="text-center text-red-500 py-8">Error loading messages</div>';
    }
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
        button.classList.add('bg-green-50', 'text-green-700', 'border-green-300');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-50', 'text-green-700', 'border-green-300');
        }, 2000);
    }).catch(err => {
        console.error('Error copying:', err);
        alert('Failed to copy');
    });
}

function copyMessage(id, question, answer, button) {
    const text = `ID: ${id}\nTime: ${new Date().toISOString()}\n\nQuestion:\n${question}\n\nAnswer:\n${answer}`;
    copyToClipboard(text, button);
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

