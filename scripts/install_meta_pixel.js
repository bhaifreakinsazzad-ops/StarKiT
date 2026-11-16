import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const allHtmlFiles = [
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => path.join(ROOT, f)),
  ...fs.readdirSync(path.join(ROOT, 'products')).filter(f => f.endsWith('.html')).map(f => path.join(ROOT, 'products', f))
];

console.log(`Installing Meta Pixel into ${allHtmlFiles.length} HTML files...`);

const PIXEL_CODE = `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1390081606323661');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1390081606323661&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
</head>`;

let updated = 0;

for (const filePath of allHtmlFiles) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if pixel is already installed
  if (content.includes('1390081606323661')) {
    console.log(`Already contains Meta Pixel: ${path.relative(ROOT, filePath)}`);
    continue;
  }

  if (content.includes('</head>')) {
    content = content.replace('</head>', PIXEL_CODE);
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log(`Meta Pixel installed in: ${path.relative(ROOT, filePath)}`);
  } else {
    console.warn(`No </head> tag found in: ${filePath}`);
  }
}

console.log(`Successfully installed Meta Pixel in ${updated} HTML files!`);
