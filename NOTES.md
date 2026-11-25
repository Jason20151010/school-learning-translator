After each save point, push it to GitHub.
The AI key comes from getKey() in server/keygen.js.
OpenAI model with "luna": gpt-5.6-luna
Saves on this computer only for now.

## Maybe Later
- Short, simple sentences for young kids.
- Hear a word spoken aloud.
- Save new words to a personal word list.
- Pick which language to learn.
- Match words to meanings in a quick game.
- Explain a math word problem simply.
- Get a hint during the quiz.
- See how many words were learned this week.

## How to run
From the project folder, run: `node school-learning-translator/server.js`

## Version 1 status
Done: explain a word, translate text, quiz prompt, browser-only local saving, server-side AI key handling, and child-safety copy.
Next: test with student feedback, improve quiz answer flow, and add a real school privacy review before launch.

## Vercel
Vercel uses the root `api/ai.js` serverless function for the AI request and `vercel.json` routes browser files from `school-learning-translator/public/`. The local command still works: `node school-learning-translator/server.js`.

Set these Vercel Project Environment Variables for Production, Preview, and Development:
- `KEYGEN_URL`
- `KEYGEN_TOKEN`

No other Vercel setting is required. Keep the Vercel project root at the repository root.
