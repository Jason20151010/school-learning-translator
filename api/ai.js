const { handleAI } = require('../school-learning-translator/server/ai-handler');

module.exports = async function ai(req, res) {
  return handleAI(req, res);
};
