(() => {
  const parser = globalThis.markdownit({ html: false, linkify: true });
  const tags = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
    'ul', 'ol', 'li', 'em', 'strong', 's', 'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ]);

  function renderTokens(tokens) {
    const fragment = document.createDocumentFragment();
    const stack = [fragment];
    for (const token of tokens) {
      if (token.hidden) continue;
      const parent = stack[stack.length - 1];
      if (token.type === 'inline') {
        parent.append(renderTokens(token.children || []));
      } else if (token.type === 'text') {
        parent.append(document.createTextNode(token.content));
      } else if (token.type === 'softbreak') {
        parent.append(document.createTextNode('\n'));
      } else if (token.type === 'hardbreak' || token.type === 'hr') {
        parent.append(document.createElement(token.type === 'hr' ? 'hr' : 'br'));
      } else if (['code_inline', 'code_block', 'fence'].includes(token.type)) {
        const code = document.createElement('code');
        code.textContent = token.content;
        if (token.type === 'code_inline') {
          parent.append(code);
        } else {
          const pre = document.createElement('pre');
          pre.append(code);
          parent.append(pre);
        }
      } else if (token.type === 'image') {
        const image = document.createElement('span');
        image.className = 'markdown-image';
        image.append('[Image: ', renderTokens(token.children || []), ']');
        image.title = 'Images are not loaded in Markdown preview.';
        parent.append(image);
      } else if (token.nesting === 1 && tags.has(token.tag)) {
        let node = document.createElement(token.tag);
        if (token.tag === 'a') {
          const href = token.attrGet('href') || '';
          // Notes have no website-relative base URL. Only explicit safe links open.
          if (/^(https?:\/\/|mailto:)/i.test(href) && parser.validateLink(href)) {
            node.setAttribute('href', href);
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
            const title = token.attrGet('title');
            if (title) node.setAttribute('title', title);
          } else {
            node = document.createElement('span');
            node.title = 'Only HTTP, HTTPS, and email links can be opened.';
          }
        } else if (token.tag === 'ol') {
          const start = token.attrGet('start');
          if (start && /^\d+$/.test(start)) node.setAttribute('start', start);
        } else if (token.tag === 'th' || token.tag === 'td') {
          const alignment = /^text-align:(left|center|right)$/.exec(token.attrGet('style') || '');
          if (alignment) node.style.textAlign = alignment[1];
        }
        parent.append(node);
        stack.push(node);
      } else if (token.nesting === -1 && tags.has(token.tag)) {
        stack.pop();
      } else {
        throw new Error(`Unsupported Markdown token: ${token.type}`);
      }
    }
    return fragment;
  }

  globalThis.webpadRenderMarkdown = source => renderTokens(parser.parse(source, {}));
})();
