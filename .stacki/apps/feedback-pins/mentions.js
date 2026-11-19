// The @mention picker: typing `@` in a comment or reply field lists people, and
// Enter, Tab or a click puts their handle in. The kit has no person picker, so
// this is our own markup in the kit's menu style (a popover fill, rows that take
// the accent when highlighted).
//
// Who is listed comes from the caller: role members and committers (people.list),
// then everyone who has commented.
(() => {
  const FP = window.FP;
  /** Rows the menu shows at once. */
  const ROWS_MAX = 6;

  /**
   * Attaches the picker to a `<stacki-textarea>`. `people()` answers the current list, each
   * `{ handle, name, github }`. Returns a function that detaches it.
   */
  FP.attachMentions = (host, people) => {
    const menu = document.createElement('div');
    menu.className = 'mention-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    let matches = [];
    let highlight = 0;
    let query;

    const field = () => host.querySelector('textarea');

    /** The `@word` the caret is in, or undefined. */
    const tokenAtCaret = () => {
      const textarea = field();
      if (!textarea) return undefined;
      const before = textarea.value.slice(0, textarea.selectionStart);
      const match = /(^|\s)@([A-Za-z0-9._-]{0,39})$/.exec(before);
      return match ? { word: match[2], start: before.length - match[2].length - 1, end: textarea.selectionStart } : undefined;
    };

    const close = () => {
      menu.hidden = true;
      matches = [];
      query = undefined;
    };

    const draw = () => {
      // A field built for a re-render is attached before it joins the page: the menu joins with it.
      if (!menu.isConnected && host.isConnected) host.after(menu);
      // Absolute in a flex column starts at its top: put the menu under the field instead.
      menu.style.top = `${host.offsetTop + host.offsetHeight}px`;
      menu.textContent = '';
      matches.forEach((person, index) => {
        const row = document.createElement('div');
        row.className = `mention-option${index === highlight ? ' is-highlighted' : ''}`;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(index === highlight));
        const avatar = FP.avatarElement({ author: person.name, github: person.github, avatar: person.avatar });
        const name = document.createElement('span');
        name.className = 'mention-name';
        name.textContent = person.name || person.handle;
        const handle = document.createElement('span');
        handle.className = 'mention-handle';
        handle.textContent = `@${person.handle}`;
        row.append(avatar, name, handle);
        // Mousedown, not click: the field must keep focus while a person is picked.
        row.addEventListener('mousedown', (event) => {
          event.preventDefault();
          pick(person);
        });
        menu.append(row);
      });
      menu.hidden = matches.length === 0;
    };

    const update = () => {
      const token = tokenAtCaret();
      if (!token) {
        close();
        return;
      }
      const word = token.word.toLowerCase();
      if (word === query) return;
      query = word;
      matches = people()
        .filter((person) => person.handle.toLowerCase().includes(word) || (person.name || '').toLowerCase().includes(word))
        .slice(0, ROWS_MAX);
      highlight = 0;
      draw();
    };

    const pick = (person) => {
      const textarea = field();
      const token = tokenAtCaret();
      if (!textarea || !token) {
        close();
        return;
      }
      const inserted = `@${person.handle} `;
      textarea.value = `${textarea.value.slice(0, token.start)}${inserted}${textarea.value.slice(token.end)}`;
      const caret = token.start + inserted.length;
      textarea.setSelectionRange(caret, caret);
      close();
      // The app keeps drafts from `input`: tell it about the new text.
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const onKey = (event) => {
      if (menu.hidden || matches.length === 0) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        highlight = (highlight + (event.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length;
        draw();
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        if (event.metaKey || event.ctrlKey) return; // ⌘↵ still sends.
        pick(matches[highlight]);
      } else if (event.key === 'Escape') {
        close();
      } else {
        return;
      }
      // Capture phase on the host: the field's own handlers (send, cancel) never see a picker key.
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const onBlur = () => setTimeout(close, 120);

    host.addEventListener('input', update);
    host.addEventListener('click', update);
    host.addEventListener('keydown', onKey, true);
    host.addEventListener('focusout', onBlur);
    return () => {
      host.removeEventListener('input', update);
      host.removeEventListener('click', update);
      host.removeEventListener('keydown', onKey, true);
      host.removeEventListener('focusout', onBlur);
      menu.remove();
    };
  };
})();
