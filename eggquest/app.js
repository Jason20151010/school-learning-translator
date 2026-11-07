(() => {
  const $ = (selector) => document.querySelector(selector);
  const stateKey = 'eggquest';
  const transactionKey = 'eggquestTransactions';
  const state = () => JSON.parse(localStorage.getItem(stateKey) || '{}');
  const transactions = () => JSON.parse(localStorage.getItem(transactionKey) || '[]');
  const saveState = (value) => localStorage.setItem(stateKey, JSON.stringify(value));
  const saveTransactions = (value) => localStorage.setItem(transactionKey, JSON.stringify(value));

  const updateProgress = () => {
    const current = state();
    const saved = Number(current.saved || 0);
    const target = Number(current.target || 60);
    const percent = Math.min(100, Math.round((saved / target) * 100));
    if ($('#heroGoal')) $('#heroGoal').textContent = current.goal || 'My next big goal';
    if ($('#heroBalance')) $('#heroBalance').textContent = `$${saved} saved of $${target}`;
    if ($('#heroProgressPercent')) $('#heroProgressPercent').textContent = `${percent}%`;
    if ($('#heroProgressBar')) $('#heroProgressBar').style.width = `${percent}%`;
    if ($('#heroSavedAmount')) $('#heroSavedAmount').textContent = `$${saved} saved`;
    if ($('#heroTargetAmount')) $('#heroTargetAmount').textContent = `$${target} goal`;
    if ($('#journalBalance')) $('#journalBalance').textContent = `$${saved}`;
    if ($('#savedText')) $('#savedText').textContent = `$${saved} saved`;
    if ($('#coinTotal')) $('#coinTotal').textContent = saved;
    if ($('#progressBar')) $('#progressBar').style.width = `${percent}%`;
    if ($('#levelNumber')) $('#levelNumber').textContent = Math.max(1, Math.floor(percent / 25) + 1);
    const mood = $('.mood');
    if (mood) mood.textContent = percent < 20 ? '● NEEDS CARE' : percent < 50 ? '● GETTING STRONG' : '● HAPPY';
    $('.buddy-card')?.classList.toggle('low-energy', percent < 20);
    $('.hero-orbit')?.classList.toggle('hero-dragon-ready', percent >= 100);
  };

  const transactionRow = (item) => `<div class="transaction ${item.type}" data-transaction-id="${item.id}">
    <span class="transaction-symbol">${item.type === 'save' ? '↑' : '↓'}</span>
    <div><b>${escapeHtml(item.label)}</b><small>${item.type === 'save' ? 'Saved' : 'Spent'} · ${new Date(item.date).toLocaleDateString()}</small></div>
    <strong>${item.type === 'save' ? '+' : '−'}$${item.amount}</strong>
    <button class="transaction-edit" data-edit="${item.id}" aria-label="Edit ${escapeHtml(item.label)}">✎</button>
    <button class="transaction-delete" data-delete="${item.id}" aria-label="Delete ${escapeHtml(item.label)}">×</button>
  </div>`;

  const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const renderTransactions = () => {
    const list = $('#transactionList');
    if (!list) return;
    const items = transactions();
    $('#transactionCount').textContent = `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`;
    list.innerHTML = items.length ? items.map(transactionRow).join('') : '<div class="empty-history">No transactions yet. Add your first saving or spending above!</div>';
  };

  const showMessage = (message) => {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  };

  const addTransaction = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const label = form.elements.label.value.trim();
    const amount = Number(form.elements.amount.value);
    if (!label || !amount || amount < 1) return;
    const type = form.id === 'saveMoneyForm' ? 'save' : 'spend';
    const current = state();
    current.saved = Math.max(0, Number(current.saved || 0) + (type === 'save' ? amount : -amount));
    saveState(current);
    const items = transactions();
    items.unshift({ id: Date.now(), type, label, amount, date: new Date().toISOString() });
    saveTransactions(items);
    form.reset();
    renderTransactions();
    updateProgress();
    showMessage(type === 'save' ? '🌱 Pip feels healthier!' : '💛 Spending recorded!');
  };

  const openGoalEditor = () => {
    const current = state();
    const heading = $('.hero-goal-heading');
    const title = $('#heroGoal');
    const balance = $('#heroBalance');
    if (!heading || !title || !balance || $('#heroGoalInput')) return;
    heading.classList.add('editing-goal');
    title.outerHTML = `<input class="hero-goal-input" id="heroGoalInput" maxlength="32" value="${escapeHtml(current.goal || '')}" aria-label="Saving goal title">`;
    balance.innerHTML = `<span>$</span><input class="hero-target-input" id="heroTargetInput" type="number" min="1" max="999" value="${current.target || 60}" aria-label="Saving goal amount"><span>target</span>`;
    $('#heroEditGoal').textContent = 'SAVE';
    let cancel = $('#heroCancelGoal');
    if (!cancel) {
      cancel = document.createElement('button');
      cancel.id = 'heroCancelGoal';
      cancel.className = 'hero-cancel';
      cancel.type = 'button';
      cancel.textContent = 'CANCEL';
      $('#heroEditGoal').parentElement.appendChild(cancel);
    }
    cancel.hidden = false;
    cancel.onclick = () => closeGoalEditor(false);
  };

  const closeGoalEditor = (save) => {
    const input = $('#heroGoalInput');
    const amount = $('#heroTargetInput');
    if (!input || !amount) return;
    if (save) {
      const current = state();
      if (!input.value.trim() || Number(amount.value) < 1) return;
      current.goal = input.value.trim();
      current.target = Number(amount.value);
      saveState(current);
    }
    const current = state();
    const title = document.createElement('h1');
    title.id = 'heroGoal';
    title.textContent = current.goal || 'My next big goal';
    input.replaceWith(title);
    $('#heroBalance').textContent = `$${current.saved || 0} saved of $${current.target || 60}`;
    $('.hero-goal-heading').classList.remove('editing-goal');
    $('#heroCancelGoal').hidden = true;
    $('#heroEditGoal').textContent = '✎ EDIT';
    updateProgress();
    if (save) showMessage('✨ Saving goal updated!');
  };

  const buildJournal = () => {
    const dashboard = $('.dashboard');
    if (!dashboard || $('.money-center')) return;
    dashboard.insertAdjacentHTML('afterend', `<section class="money-center hero-journal"><div class="money-heading"><div><p class="kicker">YOUR MONEY JOURNAL</p><h2>Save it. Spend it. Learn it.</h2><p class="muted">Every coin tells your egg how you are doing today.</p></div><div class="balance-pill">BALANCE <b id="journalBalance">$0</b></div></div><div class="money-grid"><form class="money-card save-money" id="saveMoneyForm"><div class="money-card-head"><span class="money-icon">🪙</span><div><b>ADD SAVING</b><small>Help Pip grow stronger</small></div></div><label>What did you save for?<input name="label" maxlength="32" required placeholder="Allowance, chores..."></label><label>How much?<div class="amount-input"><span>$</span><input name="amount" type="number" min="1" required placeholder="5"></div></label><button class="secondary full" type="submit">ADD TO SAVINGS +</button></form><form class="money-card spend-money" id="spendMoneyForm"><div class="money-card-head"><span class="money-icon">🛍️</span><div><b>ADD SPENDING</b><small>Be honest with your budget</small></div></div><label>What did you spend on?<input name="label" maxlength="32" required placeholder="Snack, toy..."></label><label>How much?<div class="amount-input"><span>$</span><input name="amount" type="number" min="1" required placeholder="3"></div></label><button class="coral-button full" type="submit">RECORD SPENDING −</button></form></div><div class="history-card"><div class="history-head"><div><p class="kicker">TRANSACTION HISTORY</p><h3>Where your coins went</h3></div><span id="transactionCount">0 entries</span></div><div id="transactionList" class="transaction-list"></div></div></section>`);
    dashboard.remove();
  };

  const buildHero = () => {
    const copy = $('.hero-copy');
    if (!copy) return;
    copy.innerHTML = '<p class="kicker">MY SAVING GOAL</p><div class="hero-goal-heading"><h1 id="heroGoal"></h1><button class="hero-edit" id="heroEditGoal">✎ EDIT</button></div><div class="hero-balance" id="heroBalance"></div><div class="hero-progress"><div class="hero-progress-label"><span>SAVING PROGRESS</span><b id="heroProgressPercent">0%</b></div><div class="hero-progress-track"><i id="heroProgressBar"></i></div><div class="hero-progress-total"><span id="heroSavedAmount">$0 saved</span><span id="heroTargetAmount">$0 goal</span></div></div><div class="hero-goal-tip">Every saving makes your egg healthier ✦</div>';
  };

  document.addEventListener('DOMContentLoaded', () => {
    buildHero();
    buildJournal();
    $('#saveMoneyForm')?.addEventListener('submit', addTransaction);
    $('#spendMoneyForm')?.addEventListener('submit', addTransaction);
    $('#heroEditGoal')?.addEventListener('click', (event) => {
      event.preventDefault();
      if ($('#heroEditGoal').textContent.trim() === 'SAVE') closeGoalEditor(true);
      else openGoalEditor();
    }, true);
    $('#heroCancelGoal')?.addEventListener('click', () => closeGoalEditor(false));
    $('#transactionList')?.addEventListener('click', (event) => {
      const edit = event.target.closest('[data-edit]');
      const remove = event.target.closest('[data-delete]');
      const items = transactions();
      const id = String((edit || remove)?.dataset.edit || (edit || remove)?.dataset.delete || '');
      const item = items.find((entry) => String(entry.id) === id);
      if (!item) return;
      if (remove) {
        const current = state();
        current.saved = Math.max(0, Number(current.saved || 0) - (item.type === 'save' ? item.amount : -item.amount));
        saveState(current);
        saveTransactions(items.filter((entry) => String(entry.id) !== id));
        renderTransactions(); updateProgress(); return;
      }
      const row = event.target.closest('.transaction');
      row.classList.add('editing');
      row.innerHTML = `<span class="transaction-symbol">${item.type === 'save' ? '↑' : '↓'}</span><div class="transaction-edit-fields"><input data-edit-label maxlength="32" value="${escapeHtml(item.label)}"><input data-edit-amount type="number" min="1" value="${item.amount}"></div><button class="transaction-save" data-save="${item.id}" aria-label="Save transaction">✓</button><button class="transaction-delete" data-delete="${item.id}" aria-label="Delete transaction">×</button>`;
    });
    $('#transactionList')?.addEventListener('click', (event) => {
      const save = event.target.closest('[data-save]');
      if (!save) return;
      const items = transactions();
      const item = items.find((entry) => String(entry.id) === save.dataset.save);
      const row = save.closest('.transaction');
      const label = row.querySelector('[data-edit-label]').value.trim();
      const amount = Number(row.querySelector('[data-edit-amount]').value);
      if (!item || !label || amount < 1) return;
      const current = state();
      current.saved = Math.max(0, Number(current.saved || 0) - (item.type === 'save' ? item.amount : -item.amount) + (item.type === 'save' ? amount : -amount));
      item.label = label; item.amount = amount;
      saveState(current); saveTransactions(items); renderTransactions(); updateProgress();
    });
    renderTransactions(); updateProgress();
  });
})();
