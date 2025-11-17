let waitlistData = [];
let messagesData = [];

function validatePin() {
    const pinInput = document.getElementById('pinInput');
    const pin = pinInput.value.trim();
    const errorMsg = document.getElementById('pinError');
    const submitBtn = document.getElementById('pinSubmitBtn');
    
    if (!pin) {
        errorMsg.textContent = 'Please enter a PIN';
        errorMsg.classList.remove('hidden');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Validating...';
    
    fetch('/api/validate-dashboard-pin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pin })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            errorMsg.textContent = data.error || 'Invalid PIN';
            errorMsg.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Access Admin Dashboard';
            pinInput.value = '';
            pinInput.focus();
        }
    })
    .catch(error => {
        errorMsg.textContent = 'Error validating PIN. Please try again.';
        errorMsg.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Access Admin Dashboard';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const pinInput = document.getElementById('pinInput');
    const pinModalOverlay = document.getElementById('pinModalOverlay');
    const pinModal = document.getElementById('pinModal');
    
    if (pinModalOverlay && pinModal) {
        setTimeout(() => {
            pinModalOverlay.classList.add('show');
            pinModal.classList.add('show');
        }, 10);
    }
    
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validatePin();
            }
        });
        pinInput.focus();
    }
    
    if (!pinModalOverlay) {
        loadWaitlist();
        loadMessages();
        
        const waitlistSearch = document.getElementById('waitlistSearch');
        const messagesSearch = document.getElementById('messagesSearch');
        
        if (waitlistSearch) {
            waitlistSearch.addEventListener('input', filterWaitlist);
        }
        if (messagesSearch) {
            messagesSearch.addEventListener('input', filterMessages);
        }
    }
});

function loadWaitlist() {
    fetch('/api/admin/waitlist')
        .then(response => response.json())
        .then(data => {
            const loading = document.getElementById('waitlistLoading');
            const container = document.getElementById('waitlistContainer');
            const empty = document.getElementById('waitlistEmpty');
            const count = document.getElementById('waitlistCount');
            const stat = document.getElementById('waitlistStat');
            const tbody = document.getElementById('waitlistTableBody');
            
            loading.classList.add('hidden');
            
            if (data.success && data.data && data.data.length > 0) {
                waitlistData = data.data;
                count.textContent = data.count;
                if (stat) stat.textContent = data.count;
                renderWaitlist(waitlistData);
                container.classList.remove('hidden');
            } else {
                waitlistData = [];
                count.textContent = '0';
                if (stat) stat.textContent = '0';
                empty.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error loading waitlist:', error);
            document.getElementById('waitlistLoading').classList.add('hidden');
            document.getElementById('waitlistEmpty').classList.remove('hidden');
        });
}

function renderWaitlist(data) {
    const tbody = document.getElementById('waitlistTableBody');
    const empty = document.getElementById('waitlistEmpty');
    const container = document.getElementById('waitlistContainer');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '';
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }
    
    empty.classList.add('hidden');
    container.classList.remove('hidden');
    tbody.innerHTML = '';
    
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        const date = formatDate(item.created_at);
        row.className = 'hover:bg-gray-50 transition-colors';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">${index + 1}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${escapeHtml(item.email)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(date)}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterWaitlist() {
    const searchTerm = document.getElementById('waitlistSearch').value.toLowerCase().trim();
    if (!searchTerm) {
        renderWaitlist(waitlistData);
        return;
    }
    
    const filtered = waitlistData.filter(item => 
        item.email.toLowerCase().includes(searchTerm)
    );
    renderWaitlist(filtered);
}

function loadMessages() {
    fetch('/api/admin/messages')
        .then(response => response.json())
        .then(data => {
            const loading = document.getElementById('messagesLoading');
            const container = document.getElementById('messagesContainer');
            const empty = document.getElementById('messagesEmpty');
            const count = document.getElementById('messagesCount');
            const stat = document.getElementById('messagesStat');
            
            loading.classList.add('hidden');
            
            if (data.success && data.data && data.data.length > 0) {
                messagesData = data.data;
                count.textContent = data.count;
                if (stat) stat.textContent = data.count;
                renderMessages(messagesData);
                container.classList.remove('hidden');
            } else {
                messagesData = [];
                count.textContent = '0';
                if (stat) stat.textContent = '0';
                empty.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            document.getElementById('messagesLoading').classList.add('hidden');
            document.getElementById('messagesEmpty').classList.remove('hidden');
        });
}

function renderMessages(data) {
    const tbody = document.getElementById('messagesTableBody');
    const empty = document.getElementById('messagesEmpty');
    const container = document.getElementById('messagesContainer');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '';
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }
    
    empty.classList.add('hidden');
    container.classList.remove('hidden');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const row = document.createElement('tr');
        const date = formatDate(item.created_at);
        const questionPreview = item.question.length > 60 
            ? escapeHtml(item.question.substring(0, 60)) + '...' 
            : escapeHtml(item.question);
        
        row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
        row.innerHTML = `
            <td class="px-6 py-4 text-sm font-mono text-gray-600">${escapeHtml(item.chat_id.substring(0, 8))}...</td>
            <td class="px-6 py-4 text-sm text-gray-900">${questionPreview}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(date)}</td>
        `;
        row.onclick = () => showMessageDetail(item);
        tbody.appendChild(row);
    });
}

function filterMessages() {
    const searchTerm = document.getElementById('messagesSearch').value.toLowerCase().trim();
    if (!searchTerm) {
        renderMessages(messagesData);
        return;
    }
    
    const filtered = messagesData.filter(item => 
        item.question.toLowerCase().includes(searchTerm) ||
        item.answer.toLowerCase().includes(searchTerm) ||
        item.chat_id.toLowerCase().includes(searchTerm)
    );
    renderMessages(filtered);
}

function showMessageDetail(message) {
    document.getElementById('detailChatId').textContent = message.chat_id;
    document.getElementById('detailQuestion').textContent = message.question;
    document.getElementById('detailAnswer').textContent = message.answer;
    document.getElementById('detailTimestamp').textContent = formatDate(message.created_at);
    
    const modal = document.getElementById('messageDetailModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('show');
        modalContent.classList.add('show');
    }, 10);
}

function closeMessageDetail() {
    const modal = document.getElementById('messageDetailModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modal.classList.remove('show');
    modalContent.classList.remove('show');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function copyChatId() {
    const element = document.getElementById('detailChatId');
    const text = element.textContent.trim();
    const button = document.getElementById('copyChatIdBtn');
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied';
        button.classList.add('text-green-600');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('text-green-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
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
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('messageDetailModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeMessageDetail();
        }
    }
});

document.addEventListener('click', function(e) {
    const modal = document.getElementById('messageDetailModal');
    if (modal && e.target === modal) {
        closeMessageDetail();
    }
});

