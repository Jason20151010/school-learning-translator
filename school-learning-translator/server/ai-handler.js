const { getKey } = require('../../server/keygen');
const { askAI } = require('./ai-client');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Please send valid request data.')); }
    });
    req.on('error', reject);
  });
}

function parseQuiz(answer) {
  const clean = answer.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw Object.assign(new Error('The quiz could not be generated.'), { fix: 'Try again with fewer words or a shorter quiz.' });
  let quiz;
  try { quiz = JSON.parse(clean.slice(start, end + 1)); }
  catch { throw Object.assign(new Error('The quiz could not be generated.'), { fix: 'Try again with fewer words or a shorter quiz.' }); }
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) throw new Error('Quiz format is missing questions.');
  quiz.questions = quiz.questions.map(question => ({
    type: String(question.type || 'multiple_choice'),
    question: String(question.question || ''),
    choices: Array.isArray(question.choices) ? question.choices.map(String) : [],
    correctIndex: Number.isInteger(question.correctIndex) ? question.correctIndex : 0,
    correctIndexes: Array.isArray(question.correctIndexes) ? question.correctIndexes.map(Number) : [],
    correctBoolean: Boolean(question.correctBoolean),
    acceptedAnswers: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.map(String) : [],
    sampleAnswer: String(question.sampleAnswer || ''),
    explanation: String(question.explanation || '')
  }));
  return quiz;
}

async function handleAI(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: { message: 'That action is not available.', fix: 'Use the learning buttons on the page.' } });
    const input = await readBody(req);
    if (!input.text || !['explain', 'translate', 'quiz', 'photo'].includes(input.action)) {
      return json(res, 400, { error: { message: 'Please choose a learning activity and enter some text.', fix: 'Choose Explain, Translate, or Quiz and try again.' } });
    }
    if (input.action === 'photo' && (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(input.image || '') || input.image.length > 8_000_000)) {
      return json(res, 400, { error: { message: 'Please choose a clear image smaller than 6 MB.', fix: 'Take a smaller photo and try again.' } });
    }
    const prompt = input.action === 'explain'
      ? `Explain this school word for a young learner. Give a short meaning and one example sentence. Word: ${input.text}`
      : input.action === 'translate'
        ? `Translate this school text into ${input.language || 'the student’s home language'}. Show the translation and one short explanation of an important word. Text: ${input.text}`
        : input.action === 'photo'
          ? `Look at the attached school-work photo and help answer the student's question: ${input.text}. Explain the steps simply for a student. If the photo is blurry or does not show enough information, say what is missing. Do not identify people or reveal private information.`
          : `Make a ${input.length || 'short'} quiz for a ${input.grade || 'elementary'} student from these school words. Use a mix of multiple_choice, multi_select, true_false, short_answer, and essay question types. Use about ${input.length === 'long' ? 8 : input.length === 'medium' ? 5 : 3} questions. Return compact JSON only, with no markdown, in this shape: {"questions":[{"type":"multiple_choice|multi_select|true_false|short_answer|essay","question":"...","choices":["..."],"correctIndex":0,"correctIndexes":[0,2],"correctBoolean":true,"acceptedAnswers":["..."],"sampleAnswer":"...","explanation":"..."}]}. Include only needed fields, keep explanations under 12 words, and keep it safe, clear, age appropriate, and based on these words: ${input.text}`;
    const key = await getKey();
    const options = input.action === 'quiz' ? { maxOutputTokens: 2400 } : input.action === 'photo' ? { imageData: input.image } : undefined;
    const answer = await askAI(key, prompt, options);
    return input.action === 'quiz' ? json(res, 200, { quiz: parseQuiz(answer) }) : json(res, 200, { answer });
  } catch (error) {
    console.error(error.fix || 'The AI request failed.');
    return json(res, 500, { error: { message: error.message || 'Please check the internet and try again.', fix: error.fix || 'Check the server connection and try again.' } });
  }
}

module.exports = { handleAI };
