let selectedFiling = null;
let selectedTicker = null;

async function searchFilings() {
    const tickerInput = document.getElementById("newChatTickerInput");
    const ticker = sanitizeTicker(tickerInput.value);

    if (!ticker) {
        showModalError("Please enter a valid ticker symbol");
        return;
    }

    selectedTicker = ticker;
    showModalLoading("Loading filings...");
    hideModalError();

    try {
        const response = await fetch(`/api/filings/${ticker}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch filings");
        }

        if (!data.filings || data.filings.length === 0) {
            throw new Error("No filings found for this ticker");
        }

        displayFilings(data.filings);

    } catch (error) {
        hideModalLoading();
        showModalError(error.message);
    }
}

function displayFilings(filings) {
    hideModalLoading();

    document.getElementById("tickerStep").classList.add("hidden");
    document.getElementById("filingStep").classList.remove("hidden");

    const container = document.getElementById("filingsContainer");
    container.innerHTML = filings.map((filing, index) => `
        <div class="filing-option p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all ${index === 0 ? 'bg-gray-50' : ''}"
             onclick="selectFiling(this, '${filing.accession_number}')"
             data-accession="${filing.accession_number}">
            <div class="flex items-center justify-between">
                <div>
                    <div class="font-medium text-gray-900">${filing.fiscal_period}</div>
                    <div class="text-sm text-gray-500">Filed: ${formatDate(filing.filing_date)}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${filing.is_embedded ?
                        '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Ready</span>' :
                        '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">New</span>'
                    }
                    <svg class="w-5 h-5 text-gray-400 filing-check ${index === 0 ? 'text-green-600' : 'hidden'}" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
            </div>
        </div>
    `).join('');

    if (filings.length > 0) {
        selectedFiling = filings[0].accession_number;
        document.getElementById("createChatBtn").disabled = false;
    }
}

function selectFiling(element, accessionNumber) {
    document.querySelectorAll('.filing-option').forEach(el => {
        el.classList.remove('bg-gray-50');
        el.querySelector('.filing-check').classList.add('hidden');
    });

    element.classList.add('bg-gray-50');
    element.querySelector('.filing-check').classList.remove('hidden');
    element.querySelector('.filing-check').classList.add('text-green-600');

    selectedFiling = accessionNumber;
    document.getElementById("createChatBtn").disabled = false;
}

function resetFilingSearch() {
    selectedFiling = null;
    selectedTicker = null;

    document.getElementById("tickerStep").classList.remove("hidden");
    document.getElementById("filingStep").classList.add("hidden");
    document.getElementById("newChatTickerInput").value = "";
    document.getElementById("createChatBtn").disabled = true;
    hideModalError();
}

async function createNewChat() {
    if (!selectedTicker || !selectedFiling) {
        showModalError("Please select a filing");
        return;
    }

    showModalLoading("Creating analysis...");
    hideModalError();

    try {
        const response = await fetch("/api/create-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
                ticker: selectedTicker,
                accession_number: selectedFiling
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to create chat");
        }

        currentChatId = data.chat_id;

        closeNewChatModal();
        loadChat(data.chat_id);
        loadChatHistory();

        if (data.embedding_in_progress) {
            showEmbeddingStatus(data.filing.id);
        }

    } catch (error) {
        hideModalLoading();
        showModalError(error.message);
    }
}

function showEmbeddingStatus(filingId) {
    const container = document.getElementById("chatContentContainer");
    if (!container) return;

    const statusDiv = document.createElement("div");
    statusDiv.id = "embeddingStatus";
    statusDiv.className = "fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3";
    statusDiv.innerHTML = `
        <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Processing filing...</span>
    `;
    document.body.appendChild(statusDiv);

    pollEmbeddingStatus(filingId);
}

async function pollEmbeddingStatus(filingId) {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
        try {
            const response = await fetch(`/api/filings/${filingId}/status`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.is_embedded) {
                const statusDiv = document.getElementById("embeddingStatus");
                if (statusDiv) {
                    statusDiv.innerHTML = `
                        <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Ready to analyze!</span>
                    `;
                    setTimeout(() => statusDiv.remove(), 3000);
                }
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(poll, 3000);
            } else {
                const statusDiv = document.getElementById("embeddingStatus");
                if (statusDiv) statusDiv.remove();
            }
        } catch (error) {
            console.error("Error polling status:", error);
        }
    };

    poll();
}

function showModalLoading(text) {
    document.getElementById("tickerStep").classList.add("hidden");
    document.getElementById("filingStep").classList.add("hidden");
    document.getElementById("modalLoading").classList.remove("hidden");
    document.getElementById("loadingText").textContent = text;
}

function hideModalLoading() {
    document.getElementById("modalLoading").classList.add("hidden");
}

function showModalError(message) {
    const errorDiv = document.getElementById("modalError");
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
}

function hideModalError() {
    document.getElementById("modalError").classList.add("hidden");
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function logout() {
    try {
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/auth/login';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/auth/login';
    }
}

async function loadUserInfo() {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.user) {
            const emailEl = document.getElementById('userEmail');
            if (emailEl) {
                emailEl.textContent = data.user.email;
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadUserInfo);
