const express = require('express');
const en = require('../../locales/en.json');
const fr = require('../../locales/fr.json');

const router = express.Router();
const locales = { en, fr };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

router.get('/feedback', (req, res) => {
  const language = Object.hasOwn(locales, req.query.lang) ? req.query.lang : 'en';
  const text = locales[language];
  const today = new Intl.DateTimeFormat(text.locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date());
  const questions = text.questions.map((question, index) => `
    <label for="q${index + 1}">${escapeHtml(question)}</label>
    <textarea id="q${index + 1}" name="q${index + 1}" rows="5" required>${escapeHtml(text.answers[index] || '')}</textarea>
  `).join('');

  res.type('html').send(`<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(text.title)}</title>
  <style>
    body{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:3rem auto;padding:0 1rem;color:#16324f}
    form{display:grid;gap:1rem}label{font-weight:600}textarea{width:100%;box-sizing:border-box;padding:.75rem;border:1px solid #9fb3c8;border-radius:.4rem;font:inherit}
    .date{color:#486581}button{justify-self:start;padding:.7rem 1rem;border:0;border-radius:.4rem;background:#175b58;color:white;font:inherit}
  </style>
</head>
<body>
  <h1>${escapeHtml(text.title)}</h1>
  <p>${escapeHtml(text.instructions)}</p>
  <p class="date">${escapeHtml(text.dateLabel)}: <time datetime="${new Date().toISOString().slice(0, 10)}">${escapeHtml(today)}</time></p>
  <form method="post" action="#">
    ${questions}
    <button type="submit">${language === 'fr' ? 'Envoyer' : 'Submit'}</button>
  </form>
</body>
</html>`);
});

module.exports = router;
