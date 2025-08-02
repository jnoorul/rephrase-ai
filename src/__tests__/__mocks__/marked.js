// Mock for marked library used in tests
const marked = {
  parse: jest.fn((text) => {
    // Simple mock that converts **bold** to <strong>bold</strong>
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gm, (match) => {
        if (match.startsWith('<h') || match.startsWith('<li') || match.startsWith('</p>') || match.startsWith('<p>')) {
          return match;
        }
        return `<p>${match}</p>`;
      });
  }),
  setOptions: jest.fn(() => {}),
};

module.exports = { marked };