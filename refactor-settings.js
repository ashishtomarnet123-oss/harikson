const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'user-portal/pages/settings');
const componentsDir = path.join(__dirname, 'user-portal/components/settings');

if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  
  // Remove SettingsLayout import
  let newContent = content.replace(/import SettingsLayout from '\.\.\/\.\.\/components\/SettingsLayout';\n?/g, '');
  newContent = newContent.replace(/import SettingsLayout from '\.\.\/components\/SettingsLayout';\n?/g, ''); // Just in case
  
  // Replace <SettingsLayout> with <>
  newContent = newContent.replace(/<SettingsLayout>/g, '<>');
  
  // Replace </SettingsLayout> with </>
  newContent = newContent.replace(/<\/SettingsLayout>/g, '</>');
  
  fs.writeFileSync(path.join(componentsDir, file), newContent);
  console.log(`Refactored ${file}`);
});
