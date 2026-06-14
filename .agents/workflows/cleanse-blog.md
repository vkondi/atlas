---
description: 'Cleanse and format a blog Markdown file to comply with mandatory standards (metadata, badge, link) and update blogs/README.md.'
argument-hint: '[optional-file-path]'
---

This workflow automatically ensures a blog post is formatted properly and registered in the blog index.

## Steps to Execute

1. **Identify Target**: Identify the target blog file to process.
   - If a file path is passed in `$ARGUMENTS`, resolve it relative to the workspace root.
   - Otherwise, if there is an active Markdown file open in your editor, use that file path.
   - If no specific file is found, scan all markdown files in the `blogs/` directory.

2. **Execute Fix Script**: Run the blog validation script with the `--fix` flag to automatically apply metadata, badges, back links, and register the post in the README:

   ```bash
   node scripts/validate-blog.js --fix $ARGUMENTS
   ```

   _(Note: If no arguments are present, running `node scripts/validate-blog.js --fix` will scan and fix all blog files recursively.)_

3. **Report Changes**:
   - Inspect the output of the command.
   - Report to the user what elements were added or fixed (e.g., frontmatter metadata, navigation back link, visitor hits badge).
   - Report which category section in [blogs/README.md](file:///c:/MyDevWork/remote_repos/Documentation/atlas/blogs/README.md) the post was registered under.
   - If the YAML frontmatter was newly generated, show the generated title and tags, and advise the user to review them for any manual adjustments.
