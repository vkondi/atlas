const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const blogsDir = path.join(rootDir, 'blogs');
const readmePath = path.join(blogsDir, 'README.md');

// Helper to check if file is within blogs directory and is not a README.md
function isBlogFile(filePath) {
  const relative = path.relative(blogsDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  const basename = path.basename(filePath).toLowerCase();
  return filePath.endsWith('.md') && basename !== 'readme.md';
}

function getMdFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === '.husky') {
      continue;
    }
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getMdFiles(filePath, files);
    } else if (isBlogFile(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

// Category matching criteria based on tags
const CATEGORY_MAP = {
  '### 🤖 AI & Intelligent Agents': [
    'ai',
    'rag',
    'agents',
    'llm',
    'copilot',
    'artificial-intelligence',
  ],
  '### 🌐 Frontend Development & Frameworks': [
    'react',
    'frontend',
    'js',
    'ts',
    'css',
    'html',
    'webpack',
    'vite',
    'next',
    'eslint',
    'prettier',
    'linter',
    'formatter',
    'useeffect',
  ],
  '### 🔒 Security & DevOps': [
    'security',
    'devops',
    'git',
    'docker',
    'github',
    'actions',
    'jwt',
    'auth',
    'attack',
    'hacked',
    'axios',
  ],
  '### 🖥️ Browser Internals': ['browser', 'performance', 'dom', 'rendering'],
  '### 🚀 Career & Personal Projects': [
    'career',
    'job',
    'jobs',
    'resume',
    'cli',
    'npm',
    'project',
  ],
};

function determineCategory(tags, content, filename) {
  const tagsLower = tags.map((t) => t.toLowerCase());

  // 1. First Pass: Match by explicit Tags across all categories
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (tagsLower.some((tag) => keywords.includes(tag))) {
      return category;
    }
  }

  // 2. Second Pass: Match by whole-word keywords in content/filename
  const contentLower = (content + ' ' + filename).toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (
      keywords.some((keyword) => {
        const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp('\\b' + escaped + '\\b', 'i');
        return regex.test(contentLower);
      })
    ) {
      return category;
    }
  }

  // Fallback category
  return '### 📁 Other Articles';
}

// Simple YAML frontmatter parser
function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { exists: false, data: {}, contentStartIdx: 0 };
  }

  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) {
    return { exists: false, data: {}, contentStartIdx: 0 };
  }

  const fmText = content.substring(3, endIdx).trim();
  const contentStartIdx = endIdx + 3;

  const data = {};
  const lines = fmText.split(/\r?\n/);
  let currentKey = null;

  for (const line of lines) {
    if (line.startsWith('  -') || line.startsWith('    -')) {
      if (currentKey && Array.isArray(data[currentKey])) {
        const item = line.replace(/^\s*-\s*/, '').trim();
        // remove optional quotes
        data[currentKey].push(item.replace(/^['"]|['"]$/g, ''));
      }
    } else if (line.includes(':')) {
      const colonIdx = line.indexOf(':');
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();

      if (val === '') {
        data[key] = [];
        currentKey = key;
      } else {
        // remove optional quotes
        data[key] = val.replace(/^['"]|['"]$/g, '');
        currentKey = key;
      }
    }
  }

  return { exists: true, data, contentStartIdx };
}

// Generate frontmatter text
function stringifyFrontmatter(data) {
  let lines = ['---'];
  if (data.title) lines.push(`title: '${data.title}'`);
  if (data.tags) {
    lines.push('tags:');
    data.tags.forEach((t) => lines.push(`  - ${t}`));
  }
  if (data.created) lines.push(`created: ${data.created}`);
  if (data.status) lines.push(`status: ${data.status}`);
  if (data.publications && data.publications.length > 0) {
    lines.push('publications:');
    // For simplicity, serialize publications objects if present
    data.publications.forEach((pub) => {
      lines.push(`  - platform: ${pub.platform || ''}`);
      if (pub.url) lines.push(`    url: ${pub.url}`);
      if (pub.published_at) lines.push(`    published_at: ${pub.published_at}`);
    });
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

// Main execution arguments
const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const fileArgs = args.filter((arg) => arg !== '--fix');

let mdFiles;
if (fileArgs.length > 0) {
  mdFiles = fileArgs
    .map((file) => path.resolve(process.cwd(), file))
    .filter(isBlogFile);
} else {
  mdFiles = getMdFiles(blogsDir);
}

if (mdFiles.length === 0) {
  console.log('No blog markdown files to validate.');
  process.exit(0);
}

console.log(
  `Validating ${mdFiles.length} blog markdown files...${fixMode ? ' [FIX MODE ACTIVE]' : ''}\n`,
);

let overallFailed = false;

mdFiles.forEach((filePath) => {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const filename = path.basename(filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  let hasError = false;

  console.log(`Checking [${relativePath}]...`);

  // 1. Validate Frontmatter
  let { exists, data, contentStartIdx } = parseFrontmatter(content);
  let mainBody = content;

  if (!exists) {
    console.warn(`  ❌ Missing frontmatter metadata.`);
    hasError = true;

    if (fixMode) {
      // Generate default frontmatter
      const cleanTitle = filename
        .replace(/\.md$/, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ');
      // Simple capitalization
      const title = cleanTitle
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      // Auto detect tags based on content
      const tags = [];
      const contentLower = content.toLowerCase();
      if (
        contentLower.includes('axios') ||
        contentLower.includes('hack') ||
        contentLower.includes('compromise') ||
        contentLower.includes('attack')
      ) {
        tags.push('security', 'axios', 'vulnerability');
      }
      if (
        contentLower.includes('useeffect') ||
        contentLower.includes('fetching')
      ) {
        tags.push('react', 'frontend', 'data-fetching');
      }
      if (
        contentLower.includes('job') ||
        contentLower.includes('anxiety') ||
        contentLower.includes('layoff')
      ) {
        tags.push('career', 'development', 'industry-trends');
      }
      if (
        contentLower.includes('everyday ai') ||
        contentLower.includes('deepseek') ||
        contentLower.includes('gemini') ||
        contentLower.includes('ai tools') ||
        contentLower.includes('ai thing')
      ) {
        tags.push('ai', 'personal-project', 'nextjs');
      }
      if (tags.length === 0) {
        tags.push('blog');
      }

      data = {
        title,
        tags,
        created: new Date().toISOString().split('T')[0],
        status: 'published',
      };

      // Strip leading empty lines in main body before prepending frontmatter
      mainBody = content.trimStart();
      content = stringifyFrontmatter(data) + '\n' + mainBody;
      changed = true;
      console.log(`  ✓ [FIXED] Generated default frontmatter metadata.`);
      // Re-parse to get correct contentStartIdx
      const parsed = parseFrontmatter(content);
      data = parsed.data;
      contentStartIdx = parsed.contentStartIdx;
    }
  } else {
    // Frontmatter exists, check required keys
    const requiredKeys = ['title', 'tags', 'created', 'status'];
    const missingKeys = requiredKeys.filter((k) => !data[k]);

    if (missingKeys.length > 0) {
      console.warn(
        `  ❌ Frontmatter missing required keys: ${missingKeys.join(', ')}.`,
      );
      hasError = true;

      if (fixMode) {
        if (!data.title) {
          const headerMatch = content.match(/^(?:#|##|###)\s+(.+)$/m);
          data.title = headerMatch
            ? headerMatch[1].trim()
            : filename.replace(/\.md$/, '').replace(/_/g, ' ');
        }
        if (!data.tags || !Array.isArray(data.tags) || data.tags.length === 0) {
          data.tags = ['blog'];
        }
        if (!data.created) {
          data.created = new Date().toISOString().split('T')[0];
        }
        if (!data.status) {
          data.status = 'published';
        }

        const rawBody = content.substring(contentStartIdx);
        content = stringifyFrontmatter(data) + '\n' + rawBody.trimStart();
        changed = true;
        console.log(`  ✓ [FIXED] Filled missing frontmatter fields.`);
        // Re-parse
        const parsed = parseFrontmatter(content);
        data = parsed.data;
        contentStartIdx = parsed.contentStartIdx;
      }
    }
  }

  // 2. Validate Back Link
  const depth = path
    .relative(blogsDir, path.dirname(filePath))
    .split(path.sep)
    .filter(Boolean).length;
  const relativeReadme =
    depth === 0 ? 'README.md' : '../'.repeat(depth) + 'README.md';
  const backLinkText = `[⬅️ Back to Blogs](${relativeReadme})`;

  // We check if the content contains a link pointing to the correct README
  const hasBackLink =
    content.includes(backLinkText) ||
    content.includes(`Back to Blogs](${relativeReadme})`) ||
    content.includes(`Back](${relativeReadme})`);

  if (!hasBackLink) {
    console.warn(`  ❌ Missing back link to blogs README: '${backLinkText}'.`);
    hasError = true;

    if (fixMode) {
      // Place it right after frontmatter
      const rawBody = content.substring(contentStartIdx).trimStart();
      content =
        content.substring(0, contentStartIdx) +
        '\n' +
        backLinkText +
        '\n\n' +
        rawBody;
      changed = true;
      console.log(`  ✓ [FIXED] Inserted back link.`);
      // Re-parse to adjust indexes
      const parsed = parseFrontmatter(content);
      contentStartIdx = parsed.contentStartIdx;
    }
  }

  // 3. Validate Visitor Badge
  const relativeFromRoot = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const badgeUrl = `https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.${relativeFromRoot}`;
  const badgeMarkdown = `![Hits](${badgeUrl})`;

  const hasBadge =
    content.includes('api.visitorbadge.io/api/visitors') &&
    content.includes(relativeFromRoot);

  if (!hasBadge) {
    console.warn(`  ❌ Missing or incorrect visitor count badge.`);
    hasError = true;

    if (fixMode) {
      // Append horizontal separator and badge at the bottom
      content = content.trimEnd();
      if (
        !content.includes('---') ||
        content.lastIndexOf('---') < content.length - 200
      ) {
        // If there isn't a horizontal rule near the end, append one
        content += '\n\n---\n\n' + badgeMarkdown + '\n';
      } else {
        content += '\n\n' + badgeMarkdown + '\n';
      }
      changed = true;
      console.log(`  ✓ [FIXED] Appended visitor count badge.`);
    }
  }

  // 4. Validate README registration & categorization
  if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    const relativeToBlogs = path
      .relative(blogsDir, filePath)
      .replace(/\\/g, '/');
    const expectedLink = `./${relativeToBlogs}`;

    // Check if the README content contains this file link
    const isRegistered = readmeContent.includes(expectedLink);

    if (!isRegistered) {
      console.warn(
        `  ❌ Blog not registered in main blogs README (blogs/README.md).`,
      );
      hasError = true;

      if (fixMode) {
        // Registration & Categorization auto-fix
        const category = determineCategory(data.tags || [], content, filename);
        console.log(`  Categorizing as [${category}]...`);

        const readmeLines = readmeContent.split(/\r?\n/);
        let categoryLineIdx = -1;

        // Find the index of the category heading
        for (let i = 0; i < readmeLines.length; i++) {
          if (readmeLines[i].startsWith(category)) {
            categoryLineIdx = i;
            break;
          }
        }

        const blogTitle =
          data.title || filename.replace(/\.md$/, '').replace(/_/g, ' ');
        const newListItem = `- [${blogTitle}](${expectedLink})`;

        if (categoryLineIdx === -1) {
          // Category does not exist in README, create it before the Hits badge at the bottom
          console.log(
            `  Category heading [${category}] not found in README. Creating a new section.`,
          );

          let insertIdx = -1;
          for (let i = readmeLines.length - 1; i >= 0; i--) {
            if (
              readmeLines[i].includes('api.visitorbadge.io/api/visitors') ||
              readmeLines[i].startsWith('---')
            ) {
              insertIdx = i;
            }
          }

          if (insertIdx === -1) {
            insertIdx = readmeLines.length;
          }

          // Back track to insert category properly
          const categoryBlock = [
            '',
            '---',
            '',
            category,
            '',
            'Automatically categorized articles.',
            '',
            newListItem,
            '',
          ];

          readmeLines.splice(insertIdx, 0, ...categoryBlock);
          fs.writeFileSync(readmePath, readmeLines.join('\n'), 'utf-8');
          console.log(
            `  ✓ [FIXED] Created category section and registered blog in blogs/README.md.`,
          );
        } else {
          // Category exists, insert the link in alphabetical order under this category
          let scanIdx = categoryLineIdx + 1;
          const listItems = [];
          let listStartIdx = -1;

          // Find existing list items in this category
          while (scanIdx < readmeLines.length) {
            const line = readmeLines[scanIdx];
            if (line.trim().startsWith('- [')) {
              if (listStartIdx === -1) listStartIdx = scanIdx;
              listItems.push({ index: scanIdx, text: line });
            } else if (line.startsWith('###') || line.startsWith('---')) {
              // Hit next category or separator, stop scanning
              break;
            }
            scanIdx++;
          }

          if (listItems.length === 0) {
            // No items under this category yet, append right after category heading / description
            let insertIdx = categoryLineIdx + 1;
            // Skip description or blank lines immediately following the heading
            while (
              insertIdx < readmeLines.length &&
              (readmeLines[insertIdx].trim() === '' ||
                (!readmeLines[insertIdx].startsWith('#') &&
                  !readmeLines[insertIdx].startsWith('-')))
            ) {
              insertIdx++;
            }
            readmeLines.splice(insertIdx, 0, newListItem);
            console.log(
              `  ✓ [FIXED] Registered blog in blogs/README.md under existing category.`,
            );
          } else {
            // Sort list items with the new item included
            listItems.push({ index: -1, text: newListItem });
            // Extract display title for alphabetical sorting: - [Title](./link) -> we extract Title
            const getSortTitle = (itemText) => {
              const m = itemText.match(/-\s*\[([^\]]+)\]/);
              return m ? m[1].toLowerCase() : itemText.toLowerCase();
            };

            listItems.sort((a, b) =>
              getSortTitle(a.text).localeCompare(getSortTitle(b.text)),
            );

            // Rebuild the list in readmeLines
            const insertStart = listStartIdx;
            const deleteCount = listItems.length - 1; // number of original items
            const newLines = listItems.map((item) => item.text);

            readmeLines.splice(insertStart, deleteCount, ...newLines);
            console.log(
              `  ✓ [FIXED] Registered blog in blogs/README.md in alphabetical order.`,
            );
          }

          fs.writeFileSync(readmePath, readmeLines.join('\n'), 'utf-8');
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ File successfully updated with fixes.`);
  }

  if (hasError && !fixMode) {
    overallFailed = true;
  }
});

console.log('\n--- Validation Result ---');
if (overallFailed) {
  console.error(
    '❌ Validation failed! Some blog files do not comply with requirements.',
  );
  console.error(
    '👉 Run: node scripts/validate-blog.js --fix   to automatically fix them.',
  );
  process.exit(1);
} else {
  console.log('✅ All checked blogs comply with requirements!');
  process.exit(0);
}
