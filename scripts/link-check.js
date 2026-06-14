const fs = require('fs');
const path = require('path');
const linkCheck = require('markdown-link-check');

const rootDir = path.join(__dirname, '..');

function getMdFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    // Ignore node_modules, .git, and .husky
    if (file === 'node_modules' || file === '.git' || file === '.husky') {
      continue;
    }
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getMdFiles(filePath, files);
    } else if (file.endsWith('.md')) {
      files.push(filePath);
    }
  }
  return files;
}

// Support arguments (for lint-staged)
const args = process.argv.slice(2);
let mdFiles;

if (args.length > 0) {
  mdFiles = args
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.resolve(process.cwd(), file));
} else {
  mdFiles = getMdFiles(rootDir);
}

let hasError = false;
let pendingCount = mdFiles.length;

if (mdFiles.length === 0) {
  console.log('No markdown files to check.');
  process.exit(0);
}

console.log(`Scanning links in ${mdFiles.length} markdown files...\n`);

// markdown-link-check options
const linkCheckConfig = {
  ignorePatterns: [
    // Ignore hits.secureri.style view counts
    { pattern: '^https://hits\\.secureri\\.style/' },
    // Ignore dev.to and vercel placeholder publication links
    { pattern: '^https://dev\\.to/vishwajeet/' },
    { pattern: '^https://vishwajeetkondi\\.vercel\\.app/' },
    // Ignore local upload image folders which do not exist in local workspace
    { pattern: '^uploads/' },
    // Ignore npm placeholder packages if any
    { pattern: '^https://www\\.npmjs\\.com/package/' },
  ],
};

mdFiles.forEach((filePath) => {
  const relativePath = path.relative(rootDir, filePath);
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${relativePath}`);
    pendingCount--;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Merging options
  const opts = Object.assign(
    {
      baseUrl: 'file://' + path.dirname(filePath).replace(/\\/g, '/'),
    },
    linkCheckConfig,
  );

  linkCheck(content, opts, (err, results) => {
    if (err) {
      console.error(`Error checking links in ${relativePath}:`, err);
      hasError = true;
    } else {
      let fileLogged = false;
      results.forEach((result) => {
        if (result.status === 'dead') {
          if (!fileLogged) {
            console.error(`\n❌ Broken links in ${relativePath}:`);
            fileLogged = true;
          }
          console.error(`  - ${result.link} (${result.err || '404/500'})`);
          hasError = true;
        }
      });
    }

    pendingCount--;
    if (pendingCount === 0) {
      console.log('\n--- Link Check Summary ---');
      if (hasError) {
        console.error('❌ Link check failed. Some links are broken.');
        process.exit(1);
      } else {
        console.log('✅ All checked links are valid!');
        process.exit(0);
      }
    }
  });
});
