const form = document.querySelector('#learning-form');
const textInput = document.querySelector('#text-input');
const languageInput = document.querySelector('#language-input');
const quizSettings = document.querySelector('#quiz-settings');
const quizLength = document.querySelector('#quiz-length');
const gradeLevel = document.querySelector('#grade-level');
const answer = document.querySelector('#answer');
const quiz = document.querySelector('#quiz');
const status = document.querySelector('#status');
const checkButton = document.querySelector('#check-button');
const recentList = document.querySelector('#recent-list');
let action = 'explain';

function renderReply(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^[-•] (.+)$/gm, '<span class="reply-bullet">• $1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function renderQuiz(data) {
  answer.hidden = true;
  quiz.hidden = false;
  quiz.innerHTML = '';
  const quizForm = document.createElement('div');
  quizForm.className = 'quiz-form';
  data.questions.forEach((item, questionIndex) => {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    const labels = { multiple_choice: 'Multiple choice', multi_select: 'Select all correct answers', true_false: 'True or false', short_answer: 'Short answer', essay: 'Short essay' };
    legend.textContent = `${questionIndex + 1}. ${item.question} (${labels[item.type] || 'Question'})`;
    fieldset.append(legend);
    if (item.type === 'short_answer') {
      const input = document.createElement('input');
      input.type = 'text'; input.name = `question-${questionIndex}`; input.placeholder = 'Type your answer…';
      fieldset.append(input);
    } else if (item.type === 'essay') {
      const input = document.createElement('textarea');
      input.name = `question-${questionIndex}`; input.rows = 4; input.placeholder = 'Write a few sentences…';
      fieldset.append(input);
    } else {
      const choices = item.type === 'true_false' ? ['True', 'False'] : item.choices;
      choices.forEach((choice, choiceIndex) => {
        const label = document.createElement('label');
        label.className = 'choice';
        const input = document.createElement('input');
        input.type = item.type === 'multi_select' ? 'checkbox' : 'radio';
        input.name = `question-${questionIndex}`;
        input.value = choiceIndex;
        label.append(input, document.createTextNode(choice));
        fieldset.append(label);
      });
    }
    quizForm.append(fieldset);
  });
  const check = document.createElement('button');
  check.className = 'primary quiz-check';
  check.textContent = 'Check answers';
  const result = document.createElement('p');
  result.className = 'quiz-result';
  check.addEventListener('click', () => {
    let score = 0;
    data.questions.forEach((item, questionIndex) => {
      const fieldset = quizForm.querySelectorAll('fieldset')[questionIndex];
      const selected = [...fieldset.querySelectorAll(`input[name="question-${questionIndex}"]:checked`)].map(input => Number(input.value));
      const textAnswer = fieldset.querySelector(`input[name="question-${questionIndex}"], textarea[name="question-${questionIndex}"]`)?.value.trim() || '';
      let correct = false;
      let checkable = true;
      if (item.type === 'multiple_choice') correct = selected[0] === item.correctIndex;
      if (item.type === 'multi_select') correct = JSON.stringify(selected.sort()) === JSON.stringify([...item.correctIndexes].sort());
      if (item.type === 'true_false') correct = selected[0] === (item.correctBoolean ? 0 : 1);
      if (item.type === 'short_answer') correct = item.acceptedAnswers.some(expected => textAnswer.toLowerCase() === expected.toLowerCase());
      if (item.type === 'essay') checkable = false;
      if (correct) score += 1;
      const feedback = document.createElement('p');
      feedback.className = checkable ? (correct ? 'feedback correct' : 'feedback try-again') : 'feedback';
      feedback.textContent = checkable ? (correct ? 'Correct! ' + item.explanation : `Try again. ${item.explanation}`) : `Nice work. Compare your idea with: ${item.sampleAnswer}`;
      fieldset.append(feedback);
    });
    const checkableCount = data.questions.filter(item => item.type !== 'essay').length;
    result.textContent = `You got ${score} out of ${checkableCount} checkable questions. Essays are for thoughtful practice.`;
    check.disabled = true;
  });
  quiz.append(quizForm, check, result);
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
  quizSettings.hidden = action !== 'quiz';
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
    const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, text: textInput.value.trim(), language: languageInput.value, length: quizLength.value, grade: gradeLevel.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Please check the internet and try again.');
    if (action === 'quiz') renderQuiz(data.quiz);
    else answer.innerHTML = renderReply(data.answer);
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
