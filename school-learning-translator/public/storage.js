const STORAGE_KEY = 'school-learning-translator-items';
const sampleItems = [
  { word: 'evidence', meaning: 'facts that help show something is true', example: 'The class used evidence from the book.' },
  { word: 'habitat', meaning: 'the place where a plant or animal lives', example: 'A pond is a habitat for frogs.' },
  { word: 'compare', meaning: 'to look at how things are alike or different', example: 'We compare two stories.' },
];

function loadItems() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || sampleItems; } catch { return sampleItems; }
}

function saveItem(item) {
  const items = loadItems().filter(existing => existing.word.toLowerCase() !== item.word.toLowerCase());
  items.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
}

window.schoolStorage = { loadItems, saveItem };
