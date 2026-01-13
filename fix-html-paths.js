const fs = require('fs');
const path = require('path');

const htmlFiles = [
  'index.html',
  'pro.html',
  'premium.html',
  'pricing.html',
  'payment.html',
  'thank-you.html',
  'contact.html',
  'contact-success.html',
  'privacy.html',
  'terms.html',
  'security.html',
  'refund-policy.html',
  'offline.html',
  'freemium-oet.html',
  'freemium-school.html',
  'freemium-spelling-bee.html',
  'premium-oet.html',
  'premium-school.html',
  'premium-spelling-bee.html'
];

// Common patterns to fix
const patterns = [
  // Remove leading slash from local paths
  { from: 'href="/css/', to: 'href="css/' },
  { from: 'src="/js/', to: 'src="js/' },
  { from: 'src="/assets/', to: 'src="assets/' },
  { from: 'href="/index.html"', to: 'href="index.html"' },
  { from: 'href="/premium.html"', to: 'href="premium.html"' },
  { from: 'href="/pricing.html"', to: 'href="pricing.html"' },
  { from: 'href="/contact.html"', to: 'href="contact.html"' },
  // Fix API URLs
  { from: 'http://localhost:3001/api/', to: '/api/' },
  { from: '"http://localhost:3000', to: '""' }, // Remove hardcoded localhost
];

htmlFiles.forEach(filename => {
  const filePath = path.join('public', filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${filename} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  patterns.forEach(({ from, to }) => {
    const regex = new RegExp(from, 'g');
    const matches = content.match(regex);
    if (matches) {
      changes += matches.length;
      content = content.replace(regex, to);
    }
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${filename}: ${changes} changes`);
  } else {
    console.log(`✓ ${filename}: No changes needed`);
  }
});

console.log('\n🎉 All HTML files updated!');
console.log('\n📋 Manual checks still needed:');
console.log('1. Check navigation between pages');
console.log('2. Test CSS/JS loading');
console.log('3. Test images load');
