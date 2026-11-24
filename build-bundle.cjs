// Script to generate a single self-contained bundle for BillCraft
// so it runs flawlessly both on file:/// protocol and over HTTP/HTTPS.

const fs = require('fs');
const path = require('path');

const files = [
  'js/calculator.js',
  'js/storage.js',
  'js/supabase-client.js',
  'js/templates.js',
  'js/pdf-service.js',
  'js/ui.js',
  'js/editor-ui.js',
  'js/clients-ui.js',
  'js/business-ui.js',
  'js/templates-ui.js',
  'js/settings-ui.js',
  'js/modals.js',
  'js/app.js'
];

let bundleContent = `/**
 * BillCraft - Unified Application Bundle
 * Supports both direct file:// opening and http:// serving.
 * Strict Aeonik Typography • Fintech Invoicing
 */
(function() {
  'use strict';
`;

for (const file of files) {
  let content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  
  // Remove import statements
  content = content.replace(/^import\s+.*?;?\s*$/gm, '// [bundled import]');
  // Remove export keywords while preserving declarations
  content = content.replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ');
  content = content.replace(/^export\s+default\s+/gm, '');
  content = content.replace(/^export\s+\{.*?\};?\s*$/gm, '// [bundled export]');

  bundleContent += `\n/* --- START ${file} --- */\n` + content + `\n/* --- END ${file} --- */\n`;
}

bundleContent += `
})();
`;

fs.writeFileSync(path.join(__dirname, 'bundle.js'), bundleContent, 'utf8');
console.log('Successfully generated bundle.js (' + bundleContent.length + ' bytes)');
