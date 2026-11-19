// The formats Export writes: Markdown for reading and pasting into an issue, CSV
// for a spreadsheet, JSON for Import. Pure functions of the threads.
(() => {
  const FP = window.FP;

  FP.EXPORT_FORMATS = {
    markdown: { label: 'Markdown', extension: 'md', type: 'text/markdown' },
    csv: { label: 'CSV', extension: 'csv', type: 'text/csv' },
    json: { label: 'JSON (for Import)', extension: 'json', type: 'application/json' },
  };

  const iso = (ms) => (ms ? new Date(ms).toISOString() : '');
  const who = (comment) => (comment.github ? `@${comment.github}` : comment.author);
  const byFile = (threads) => {
    const files = new Map();
    for (const thread of [...threads].sort((a, b) => a.createdAt - b.createdAt)) {
      if (!files.has(thread.page)) files.set(thread.page, []);
      files.get(thread.page).push(thread);
    }
    return [...files.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const markdown = (threads) => {
    const lines = ['# Feedback', '', `${threads.length} thread${threads.length === 1 ? '' : 's'}, exported ${new Date().toISOString().slice(0, 10)}.`, ''];
    for (const [file, list] of byFile(threads)) {
      lines.push(`## ${file || 'Unknown file'}`, '');
      list.forEach((thread, index) => {
        const box = thread.status === 'resolved' ? '[x]' : '[ ]';
        const where = FP.describeTarget(thread.target);
        const viewport = thread.viewport ? ` · ${[thread.viewport.device, thread.viewport.widthPx ? `${thread.viewport.widthPx}px` : ''].filter(Boolean).join(' ')}` : '';
        lines.push(`- ${box} **#${index + 1}** \`${where}\`${viewport}`);
        for (const comment of thread.comments) {
          const body = comment.body.replace(/\n+/g, ' ');
          lines.push(`  - ${who(comment)} (${iso(comment.createdAt).slice(0, 16).replace('T', ' ')}): ${body}`);
        }
      });
      lines.push('');
    }
    return `${lines.join('\n')}\n`;
  };

  const cell = (value) => {
    const text = String(value === undefined ? '' : value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const csv = (threads) => {
    const rows = [['file', 'thread', 'number', 'status', 'element', 'device', 'width_px', 'comment', 'author', 'github', 'created_at', 'body']];
    for (const [file, list] of byFile(threads)) {
      list.forEach((thread, index) => {
        for (const comment of thread.comments) {
          rows.push([
            file,
            thread.id,
            index + 1,
            thread.status,
            FP.describeTarget(thread.target),
            thread.viewport ? thread.viewport.device || '' : '',
            thread.viewport ? thread.viewport.widthPx || '' : '',
            comment.id,
            comment.author,
            comment.github || '',
            iso(comment.createdAt),
            comment.body,
          ]);
        }
      });
    }
    return `${rows.map((row) => row.map(cell).join(',')).join('\n')}\n`;
  };

  /** The file's text in one format. */
  FP.exportText = (format, threads) => {
    if (format === 'markdown') return markdown(threads);
    if (format === 'csv') return csv(threads);
    return `${JSON.stringify(FP.toFile(threads), null, 2)}\n`;
  };
})();
