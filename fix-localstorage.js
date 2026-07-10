const fs = require('fs');
let chatJs = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const badCode = `    const savedInstructions = localStorage.getItem('harikson_custom_instructions');\n    if (savedInstructions) setCustomInstructions(savedInstructions);`;

const targetEffect = `  useEffect(() => {
    const savedToken = localStorage.getItem('hk_token');`;

chatJs = chatJs.replace(badCode, '');
chatJs = chatJs.replace(
  targetEffect,
  targetEffect + "\n    const savedInstructions = localStorage.getItem('harikson_custom_instructions');\n    if (savedInstructions) setCustomInstructions(savedInstructions);"
);

fs.writeFileSync('user-portal/pages/chat.js', chatJs, 'utf8');
