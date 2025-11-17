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
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validatePin();
            }
        });
        pinInput.focus();
    }
    
    if (!document.getElementById('pinModalOverlay')) {
        loadWaitlist();
        loadMessages();
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
            const tbody = document.getElementById('waitlistTableBody');
            
            loading.classList.add('hidden');
            
            if (data.success && data.data && data.data.length > 0) {
                count.textContent = data.count;
                tbody.innerHTML = '';
                
                data.data.forEach(item => {
                    const row = document.createElement('tr');
                    const date = item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A';
                    row.innerHTML = `
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${escapeHtml(item.email)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${escapeHtml(date)}</td>
                    `;
                    tbody.appendChild(row);
                });
                
                container.classList.remove('hidden');
            } else {
                count.textContent = '0';
                empty.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error loading waitlist:', error);
            document.getElementById('waitlistLoading').classList.add('hidden');
            document.getElementById('waitlistEmpty').classList.remove('hidden');
        });
}

function loadMessages() {
    fetch('/api/admin/messages')
        .then(response => response.json())
        .then(data => {
            const loading = document.getElementById('messagesLoading');
            const container = document.getElementById('messagesContainer');
            const empty = document.getElementById('messagesEmpty');
            const count = document.getElementById('messagesCount');
            const tbody = document.getElementById('messagesTableBody');
            
            loading.classList.add('hidden');
            
            if (data.success && data.data && data.data.length > 0) {
                count.textContent = data.count;
                tbody.innerHTML = '';
                
                data.data.forEach(item => {
                    const row = document.createElement('tr');
                    const date = item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A';
                    const questionPreview = item.question.length > 50 
                        ? escapeHtml(item.question.substring(0, 50)) + '...' 
                        : escapeHtml(item.question);
                    
                    row.className = 'hover:bg-gray-50 cursor-pointer';
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm font-mono text-gray-600">${escapeHtml(item.chat_id.substring(0, 8))}...</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${questionPreview}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${escapeHtml(date)}</td>
                    `;
                    row.onclick = () => showMessageDetail(item);
                    tbody.appendChild(row);
                });
                
                container.classList.remove('hidden');
            } else {
                count.textContent = '0';
                empty.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            document.getElementById('messagesLoading').classList.add('hidden');
            document.getElementById('messagesEmpty').classList.remove('hidden');
        });
}

function showMessageDetail(message) {
    document.getElementById('detailChatId').textContent = message.chat_id;
    document.getElementById('detailQuestion').textContent = message.question;
    document.getElementById('detailAnswer').textContent = message.answer;
    document.getElementById('detailTimestamp').textContent = message.created_at 
        ? new Date(message.created_at).toLocaleString() 
        : 'N/A';
    document.getElementById('messageDetailModal').classList.remove('hidden');
}

function closeMessageDetail() {
    document.getElementById('messageDetailModal').classList.add('hidden');
}


document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('messageDetailModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeMessageDetail();
        }
    }
});

