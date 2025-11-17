(function () {
  const state = {
    ready: false,
    autoRefreshTimer: null,
    stats: null,
    activity: [],
    waitlist: [],
    filteredWaitlist: [],
    waitlistSearch: '',
    waitlistRange: 'all',
    domains: [],
    chats: [],
    filteredChats: [],
    chatSearch: '',
    selectedChatId: null,
    selectedChatDetail: null,
    lastSyncedAt: null,
  };

  const dom = {
    container: document.getElementById('adminApp'),
    overlay: document.getElementById('adminPinOverlay'),
    pinInput: document.getElementById('adminPinInput'),
    pinButton: document.getElementById('adminPinBtn'),
    pinError: document.getElementById('adminPinError'),
    refreshBtn: document.getElementById('adminRefreshBtn'),
    lastSynced: document.getElementById('adminLastSynced'),
    trendingBadges: document.getElementById('adminTrendingBadges'),
    statTotalChats: document.getElementById('stat-totalChats'),
    statTotalMessages: document.getElementById('stat-totalMessages'),
    statWaitlist: document.getElementById('stat-waitlist'),
    statLatestLead: document.getElementById('stat-latestLead'),
    statUniqueTickers: document.getElementById('stat-uniqueTickers'),
    statAvgMessages: document.getElementById('stat-avgMessages'),
    waitlistSearch: document.getElementById('waitlistSearch'),
    waitlistRange: document.getElementById('waitlistRange'),
    waitlistRows: document.getElementById('waitlistRows'),
    waitlistDomains: document.getElementById('waitlistDomains'),
    waitlistCount: document.getElementById('waitlistCount'),
    activity: document.getElementById('adminActivity'),
    chatSearch: document.getElementById('chatSearch'),
    chatList: document.getElementById('chatList'),
    chatCount: document.getElementById('chatCount'),
    chatDetailEmpty: document.getElementById('chatDetailEmpty'),
    chatDetailContent: document.getElementById('chatDetailContent'),
    chatDetailTicker: document.getElementById('chatDetailTicker'),
    chatDetailTitle: document.getElementById('chatDetailTitle'),
    chatDetailSubtitle: document.getElementById('chatDetailSubtitle'),
    chatDetailMeta: document.getElementById('chatDetailMeta'),
    chatDetailTimestamp: document.getElementById('chatDetailTimestamp'),
    chatDetailBadges: document.getElementById('chatDetailBadges'),
    chatMessages: document.getElementById('chatMessages'),
  };

  const numberFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
  const compactFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  const dateTimeFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
  const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const AdminDashboard = {
    init() {
      bindPinInteractions();
      bindFilters();
      if (dom.container && dom.container.dataset.authenticated === 'true') {
        boot();
      }
    },
  };

  function bindPinInteractions() {
    if (!dom.pinButton || !dom.pinInput) {
      return;
    }
    dom.pinButton.addEventListener('click', () => validatePin());
    dom.pinInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        validatePin();
      }
    });
    dom.pinInput.addEventListener('input', () => {
      if (dom.pinError) {
        dom.pinError.classList.add('hidden');
      }
    });
    dom.pinInput.focus();
  }

  function validatePin() {
    if (!dom.pinInput || !dom.pinButton) {
      return;
    }
    const pin = dom.pinInput.value.trim();
    if (!pin) {
      return showPinError('Enter your admin pin');
    }

    dom.pinButton.disabled = true;
    dom.pinButton.textContent = 'Verifying…';

    fetch('/api/validate-dashboard-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pin }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Invalid response');
        }
        return response.json();
      })
      .then((payload) => {
        if (payload.success) {
          unlockDashboard();
          boot();
        } else {
          showPinError(payload.error || 'Invalid pin');
        }
      })
      .catch(() => {
        showPinError('Unable to verify pin');
      })
      .finally(() => {
        if (dom.pinButton) {
          dom.pinButton.disabled = false;
          dom.pinButton.textContent = 'Unlock dashboard';
        }
        if (dom.pinInput) {
          dom.pinInput.value = '';
          dom.pinInput.focus();
        }
      });
  }

  function showPinError(message) {
    if (!dom.pinError) return;
    dom.pinError.textContent = message;
    dom.pinError.classList.remove('hidden');
  }

  function unlockDashboard() {
    if (dom.overlay) {
      dom.overlay.classList.add('opacity-0');
      setTimeout(() => {
        dom.overlay && dom.overlay.remove();
      }, 250);
    }
    if (dom.container) {
      dom.container.dataset.authenticated = 'true';
      dom.container.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
      dom.container.classList.add('opacity-100');
    }
  }

  function bindFilters() {
    if (dom.refreshBtn) {
      dom.refreshBtn.addEventListener('click', () => {
        if (state.ready) {
          refreshAll();
        }
      });
    }

    if (dom.waitlistSearch) {
      dom.waitlistSearch.addEventListener('input', (event) => {
        state.waitlistSearch = event.target.value.toLowerCase();
        filterWaitlist();
      });
    }

    if (dom.waitlistRange) {
      dom.waitlistRange.addEventListener('change', (event) => {
        state.waitlistRange = event.target.value;
        filterWaitlist();
      });
    }

    if (dom.chatSearch) {
      dom.chatSearch.addEventListener('input', (event) => {
        state.chatSearch = event.target.value.toLowerCase();
        filterChats();
      });
    }
  }

  function boot() {
    if (state.ready) return;
    state.ready = true;
    refreshAll();
    startAutoRefresh();
  }

  function startAutoRefresh() {
    if (state.autoRefreshTimer) {
      clearInterval(state.autoRefreshTimer);
    }
    state.autoRefreshTimer = setInterval(() => refreshAll(), 60000);
  }

  async function refreshAll() {
    try {
      await Promise.all([
        fetchOverview(),
        fetchWaitlist(),
        fetchChats(),
      ]);
      state.lastSyncedAt = new Date();
      updateLastSynced();
    } catch (error) {
      console.error('[admin] refresh failed', error);
    }
  }

  function updateLastSynced() {
    if (!dom.lastSynced) return;
    if (!state.lastSyncedAt) {
      dom.lastSynced.textContent = 'Waiting…';
      return;
    }
    dom.lastSynced.textContent = dateTimeFormatter.format(state.lastSyncedAt);
  }

  async function fetchOverview() {
    const response = await fetch('/api/admin/overview', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to load overview');
    }
    const data = await response.json();
    state.stats = data;
    state.activity = data.activity || [];
    renderStats();
    renderTrending(data.trending_tickers || []);
    renderDomains(data.domain_breakdown || []);
    renderActivity();
  }

  async function fetchWaitlist() {
    const response = await fetch('/api/admin/waitlist', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to load waitlist');
    }
    const data = await response.json();
    state.waitlist = Array.isArray(data.rows) ? data.rows : [];
    if (dom.waitlistCount) {
      dom.waitlistCount.textContent = numberFormatter.format(state.waitlist.length);
    }
    filterWaitlist();
  }

  function filterWaitlist() {
    const search = state.waitlistSearch;
    const range = state.waitlistRange;
    const now = Date.now();
    let list = [...state.waitlist];

    if (range !== 'all') {
      const hours = parseInt(range, 10) || 0;
      const threshold = now - hours * 60 * 60 * 1000;
      list = list.filter((row) => {
        if (!row.created_at) return false;
        return new Date(row.created_at).getTime() >= threshold;
      });
    }

    if (search) {
      list = list.filter((row) => {
        const text = `${row.email || ''} ${row.domain || ''}`.toLowerCase();
        return text.includes(search);
      });
    }

    state.filteredWaitlist = list;
    renderWaitlist();
  }

  function renderWaitlist() {
    if (!dom.waitlistRows) return;
    dom.waitlistRows.innerHTML = '';
    if (!state.filteredWaitlist.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = 'No waitlist entries found with current filters.';
      dom.waitlistRows.appendChild(empty);
      return;
    }

    state.filteredWaitlist.slice(0, 12).forEach((row) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'waitlist-row';

      const left = document.createElement('div');
      const email = document.createElement('p');
      email.className = 'font-semibold text-gray-900';
      email.textContent = row.email;
      const domain = document.createElement('p');
      domain.className = 'text-sm text-gray-500';
      domain.textContent = row.domain || 'Unknown domain';
      left.appendChild(email);
      left.appendChild(domain);

      const right = document.createElement('div');
      right.className = 'text-right';
      const relative = document.createElement('p');
      relative.className = 'text-sm font-medium text-gray-900';
      relative.textContent = formatRelative(row.created_at);
      const absolute = document.createElement('p');
      absolute.className = 'text-xs text-gray-400';
      absolute.textContent = formatDate(row.created_at);
      right.appendChild(relative);
      right.appendChild(absolute);

      wrapper.appendChild(left);
      wrapper.appendChild(right);
      dom.waitlistRows.appendChild(wrapper);
    });
  }

  function renderDomains(domains) {
    if (!dom.waitlistDomains) return;
    dom.waitlistDomains.innerHTML = '';
    if (!domains.length) return;
    domains.forEach((entry) => {
      const badge = document.createElement('span');
      badge.className = 'badge text-gray-600';
      badge.textContent = `${entry.domain} · ${entry.percentage}%`;
      dom.waitlistDomains.appendChild(badge);
    });
  }

  function renderTrending(list) {
    if (!dom.trendingBadges) return;
    dom.trendingBadges.innerHTML = '';
    if (!list.length) {
      const muted = document.createElement('span');
      muted.className = 'text-sm text-gray-500';
      muted.textContent = 'Trending tickers will appear here once chats start.';
      dom.trendingBadges.appendChild(muted);
      return;
    }
    list.forEach((item) => {
      const badge = document.createElement('span');
      badge.className = 'badge border-gray-300 text-gray-900';
      badge.textContent = `${item.ticker} · ${item.count}`;
      dom.trendingBadges.appendChild(badge);
    });
  }

  async function fetchChats() {
    const response = await fetch('/api/admin/chats', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to load chats');
    }
    const data = await response.json();
    state.chats = Array.isArray(data.rows) ? data.rows : [];
    if (dom.chatCount) {
      dom.chatCount.textContent = numberFormatter.format(state.chats.length);
    }
    filterChats();
    if (state.selectedChatId) {
      fetchChatDetail(state.selectedChatId);
    }
  }

  function filterChats() {
    const search = state.chatSearch;
    let list = [...state.chats];
    if (search) {
      list = list.filter((chat) => {
        const company = chat.stock_info?.companyName || '';
        const ticker = chat.ticker || '';
        return (
          ticker.toLowerCase().includes(search) ||
          company.toLowerCase().includes(search)
        );
      });
    }
    state.filteredChats = list;
    renderChatList();
  }

  function renderChatList() {
    if (!dom.chatList) return;
    dom.chatList.innerHTML = '';
    if (!state.filteredChats.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = 'No chats match the filter.';
      dom.chatList.appendChild(empty);
      return;
    }

    state.filteredChats.slice(0, 30).forEach((chat) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.chatId = chat.id;
      button.className = `chat-row ${state.selectedChatId === chat.id ? 'active' : ''}`;

      const headline = document.createElement('div');
      const title = document.createElement('p');
      title.className = 'text-base font-semibold';
      title.textContent = `${chat.ticker} · ${chat.stock_info?.companyName || 'Unknown company'}`;
      const meta = document.createElement('p');
      meta.className = 'text-sm text-gray-500';
      meta.textContent = `${chat.message_count} messages · ${formatRelative(chat.last_message_at || chat.created_at)}`;
      headline.appendChild(title);
      headline.appendChild(meta);

      const side = document.createElement('div');
      side.className = 'text-right';
      const status = document.createElement('span');
      status.className = 'badge text-gray-600 border-gray-300';
      status.textContent = chat.has_report ? 'Report ready' : 'Ongoing';
      const stamp = document.createElement('p');
      stamp.className = 'text-xs text-gray-400 mt-1';
      stamp.textContent = formatDate(chat.created_at);
      side.appendChild(status);
      side.appendChild(stamp);

      button.appendChild(headline);
      button.appendChild(side);
      button.addEventListener('click', () => selectChat(chat.id));

      dom.chatList.appendChild(button);
    });
  }

  function selectChat(chatId) {
    if (!chatId) return;
    state.selectedChatId = chatId;
    renderChatList();
    fetchChatDetail(chatId);
  }

  async function fetchChatDetail(chatId) {
    const response = await fetch(`/api/admin/chats/${chatId}`, { credentials: 'include' });
    if (!response.ok) {
      console.error('Failed to load chat detail');
      return;
    }
    const data = await response.json();
    state.selectedChatDetail = data;
    renderChatDetail();
  }

  function renderChatDetail() {
    if (!dom.chatDetailContent || !dom.chatDetailEmpty) return;
    if (!state.selectedChatDetail) {
      dom.chatDetailContent.classList.add('hidden');
      dom.chatDetailEmpty.classList.remove('hidden');
      return;
    }

    const detail = state.selectedChatDetail;
    dom.chatDetailEmpty.classList.add('hidden');
    dom.chatDetailContent.classList.remove('hidden');

    dom.chatDetailTicker.textContent = detail.ticker || '';
    dom.chatDetailTitle.textContent = detail.stock_info?.companyName || detail.ticker;
    dom.chatDetailSubtitle.textContent = detail.stock_info?.sector || '—';
    dom.chatDetailMeta.textContent = `${detail.total_messages || 0} messages captured`;
    dom.chatDetailTimestamp.textContent = formatDate(detail.created_at);

    renderChatBadges(detail);
    renderChatMessages(detail.messages || []);
  }

  function renderChatBadges(detail) {
    if (!dom.chatDetailBadges) return;
    dom.chatDetailBadges.innerHTML = '';
    const badges = [];

    if (detail.filing_date) {
      badges.push({ label: 'Filing date', value: formatDate(detail.filing_date) });
    }

    badges.push({ label: 'Report', value: detail.has_report ? 'Ready' : 'Not ready' });

    if (detail.pdf_filename) {
      badges.push({ label: 'PDF', value: 'Open document', href: `/pdfs/${detail.pdf_filename}` });
    }

    badges.forEach((item) => {
      const badge = document.createElement('div');
      badge.className = 'border border-gray-200 rounded-2xl px-4 py-3';
      const label = document.createElement('p');
      label.className = 'text-xs uppercase tracking-[0.3em] text-gray-500';
      label.textContent = item.label;
      badge.appendChild(label);

      if (item.href) {
        const link = document.createElement('a');
        link.href = item.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'text-sm font-semibold text-gray-900 underline';
        link.textContent = item.value;
        badge.appendChild(link);
      } else {
        const value = document.createElement('p');
        value.className = 'text-base font-semibold text-gray-900';
        value.textContent = item.value;
        badge.appendChild(value);
      }

      dom.chatDetailBadges.appendChild(badge);
    });
  }

  function renderChatMessages(messages) {
    if (!dom.chatMessages) return;
    dom.chatMessages.innerHTML = '';
    if (!messages.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = 'No messages yet.';
      dom.chatMessages.appendChild(empty);
      return;
    }

    messages.slice(-12).forEach((message) => {
      const card = document.createElement('div');
      card.className = 'message-card';

      const meta = document.createElement('p');
      meta.className = 'text-xs uppercase tracking-[0.3em] text-gray-500 mb-2';
      meta.textContent = formatDate(message.timestamp);
      const question = document.createElement('p');
      question.className = 'font-semibold text-gray-900';
      question.textContent = `Q: ${message.question}`;
      const answer = document.createElement('p');
      answer.className = 'text-gray-600 mt-2';
      answer.textContent = shorten(message.answer);
      card.appendChild(meta);
      card.appendChild(question);
      card.appendChild(answer);

      dom.chatMessages.appendChild(card);
    });
  }

  function renderStats() {
    if (!state.stats) return;
    const stats = state.stats.stats || {};
    const latest = state.stats.latest_waitlist_email;
    if (dom.statTotalChats) {
      dom.statTotalChats.textContent = numberFormatter.format(stats.total_chats || 0);
    }
    if (dom.statTotalMessages) {
      dom.statTotalMessages.textContent = `${numberFormatter.format(stats.total_messages || 0)} messages tracked`;
    }
    if (dom.statWaitlist) {
      dom.statWaitlist.textContent = numberFormatter.format(stats.waitlist_total || 0);
    }
    if (dom.statLatestLead) {
      dom.statLatestLead.textContent = latest?.email ? `Latest lead · ${latest.email}` : 'No leads yet';
    }
    if (dom.statUniqueTickers) {
      dom.statUniqueTickers.textContent = numberFormatter.format(stats.unique_tickers || 0);
    }
    if (dom.statAvgMessages) {
      dom.statAvgMessages.textContent = `${(stats.avg_messages_per_chat || 0).toFixed(1)} avg. messages / chat`;
    }
  }

  function renderActivity() {
    if (!dom.activity) return;
    dom.activity.innerHTML = '';
    if (!state.activity.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = 'No activity yet.';
      dom.activity.appendChild(empty);
      return;
    }

    state.activity.slice(0, 6).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'flex gap-4';

      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      dot.dataset.type = item.type;
      row.appendChild(dot);

      const body = document.createElement('div');
      const title = document.createElement('p');
      title.className = 'font-semibold text-gray-900';
      title.textContent = `${item.title}`;
      const subtitle = document.createElement('p');
      subtitle.className = 'text-sm text-gray-600';
      subtitle.textContent = item.subtitle;
      const meta = document.createElement('p');
      meta.className = 'text-xs text-gray-400';
      meta.textContent = `${item.meta} · ${formatRelative(item.timestamp)}`;
      body.appendChild(title);
      body.appendChild(subtitle);
      body.appendChild(meta);

      row.appendChild(body);
      dom.activity.appendChild(row);
    });
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return dateTimeFormatter.format(date);
  }

  function formatRelative(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = date.getTime() - Date.now();
    const intervals = [
      { unit: 'day', ms: 86400000 },
      { unit: 'hour', ms: 3600000 },
      { unit: 'minute', ms: 60000 },
    ];
    for (const interval of intervals) {
      if (Math.abs(diffMs) >= interval.ms || interval.unit === 'minute') {
        const value = Math.round(diffMs / interval.ms);
        return relativeFormatter.format(value, interval.unit);
      }
    }
    return 'just now';
  }

  function shorten(text, maxLength = 320) {
    if (!text) return 'No response available yet.';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
  }

  document.addEventListener('DOMContentLoaded', () => AdminDashboard.init());
  window.AdminDashboard = AdminDashboard;
})();
