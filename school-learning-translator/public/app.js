const form = document.querySelector('#learning-form');
const textInput = document.querySelector('#text-input');
const languageInput = document.querySelector('#language-input');
const answer = document.querySelector('#answer');
const quiz = document.querySelector('#quiz');
const status = document.querySelector('#status');
const checkButton = document.querySelector('#check-button');
const recentList = document.querySelector('#recent-list');
let action = 'explain';

function renderQuiz(data) {
  answer.hidden = true;
  quiz.hidden = false;
  quiz.innerHTML = '';
  const form = document.createElement('div');
  form.className = 'quiz-form';
  data.questions.forEach((item, questionIndex) => {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `${questionIndex + 1}. ${item.question}`;
    fieldset.append(legend);
    item.choices.forEach((choice, choiceIndex) => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `question-${questionIndex}`;
      input.value = choiceIndex;
      label.append(input, document.createTextNode(choice));
      fieldset.append(label);
    });
    form.append(fieldset);
  });
  const check = document.createElement('button');
  check.className = 'primary quiz-check';
  check.textContent = 'Check answers';
  const result = document.createElement('p');
  result.className = 'quiz-result';
  check.addEventListener('click', () => {
    let score = 0;
    data.questions.forEach((item, questionIndex) => {
      const selected = form.querySelector(`input[name="question-${questionIndex}"]:checked`);
      const correct = selected && Number(selected.value) === item.answerIndex;
      if (correct) score += 1;
      const feedback = document.createElement('p');
      feedback.className = correct ? 'feedback correct' : 'feedback try-again';
      feedback.textContent = correct ? 'Correct! ' + item.explanation : `Try again. ${item.explanation}`;
      form.querySelectorAll('fieldset')[questionIndex].append(feedback);
    });
    result.textContent = `You got ${score} out of ${data.questions.length}.`;
    check.disabled = true;
  });
  quiz.append(form, check, result);
}

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
  answer.hidden = false;
  quiz.hidden = true;
  quiz.innerHTML = '';
  try {
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, text: textInput.value.trim(), language: languageInput.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Please check the internet and try again.');
    if (action === 'quiz') renderQuiz(data.quiz);
    else answer.textContent = data.answer;
    if (action === 'explain') schoolStorage.saveItem({ word: textInput.value.trim(), meaning: data.answer, example: '' });
    showRecent();
  } catch (error) {
    answer.hidden = false;
    quiz.hidden = true;
    answer.textContent = error.message || 'Please check the internet and try again.';
  } finally {
    status.textContent = '';
    checkButton.disabled = false;
  }
});

showRecent();
