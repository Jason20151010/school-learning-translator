const form = document.querySelector('#learning-form');
const textInput = document.querySelector('#text-input');
const languageInput = document.querySelector('#language-input');
const answer = document.querySelector('#answer');
const status = document.querySelector('#status');
const checkButton = document.querySelector('#check-button');
const recentList = document.querySelector('#recent-list');
let action = 'explain';

function showRecent() {
  recentList.innerHTML = schoolStorage.loadItems().map(item => `<button class="recent-item" data-word="${item.word}">${item.word}</button>`).join('');
  recentList.querySelectorAll('.recent-item').forEach(button => button.addEventListener('click', () => {
    textInput.value = button.dataset.word;
    action = 'explain';
    document.querySelector('#explain-tab').classList.add('active');
    document.querySelector('#translate-tab').classList.remove('active');
  }));
}

document.querySelectorAll('[data-action]').forEach(tab => tab.addEventListener('click', () => {
  action = tab.dataset.action;
  document.querySelectorAll('[data-action]').forEach(item => item.classList.toggle('active', item === tab));
  textInput.placeholder = action === 'translate' ? 'Type a word or sentence to translate…' : action === 'quiz' ? 'Type words you looked up, separated by commas…' : 'Type one school word…';
}));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!textInput.value.trim()) return;
  checkButton.disabled = true;
  status.textContent = 'Thinking…';
  answer.textContent = '';
  try {
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, text: textInput.value.trim(), language: languageInput.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Please check the internet and try again.');
    answer.textContent = data.answer;
    if (action === 'explain') schoolStorage.saveItem({ word: textInput.value.trim(), meaning: data.answer, example: '' });
    showRecent();
  } catch (error) {
    answer.textContent = error.message || 'Please check the internet and try again.';
  } finally {
    status.textContent = '';
    checkButton.disabled = false;
  }
});

showRecent();
