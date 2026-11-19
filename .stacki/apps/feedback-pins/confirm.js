// A small in-app confirm, anchored to the control that asked. The app never uses
// the browser's own dialogs (alert, confirm, prompt): they draw the operating
// system's sheet, which cannot be styled and blocks the whole window.
//
// One function, FP.confirmAction, so the app can move to the UI kit's own confirm
// in one place: when the kit's global `stackiConfirm` (__stacki/ui.js) exists at runtime it is
// used instead.
//
// As in Desktop, a danger confirm starts on Cancel and Enter answers no: a stray Return must never
// delete. Only Enter on the confirm button itself (or a click on it) says yes.
window.FP = window.FP || {};

(() => {
  const FP = window.FP;
  /** Frames to wait for a kit button to render its inner <button> before focusing it. */
  const FOCUS_FRAMES_MAX = 10;
  /** The gap between the anchor and the popover, and the popover and the window edge, in px. */
  const GAP_PX = 4;
  const EDGE_PX = 8;

  /** The one confirm open now: `{ anchor, close(result) }`, or undefined. */
  let current;

  /** A kit button's inner <button>, once it has rendered. */
  const innerButton = (host) => (host && host.querySelector ? host.querySelector('button') : null);

  /** Focuses a kit button (or a plain element) as soon as it can take focus. */
  const focusSoon = (host, attempt = 0) => {
    if (!host || !host.isConnected) return;
    const target = innerButton(host) || (host.tagName === 'BUTTON' ? host : null);
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }
    if (attempt < FOCUS_FRAMES_MAX) requestAnimationFrame(() => focusSoon(host, attempt + 1));
  };

  /** Places the popover under the anchor, right edges lined up; above it when there is no room below. */
  const place = (popover, anchor) => {
    const box = anchor.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const left = Math.min(Math.max(EDGE_PX, box.right - width), window.innerWidth - width - EDGE_PX);
    const below = box.bottom + GAP_PX;
    const top = below + height + EDGE_PX <= window.innerHeight ? below : Math.max(EDGE_PX, box.top - GAP_PX - height);
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  };

  /** Reads the kit's answer strictly: only an explicit yes confirms. */
  const kitAnswer = (result) => {
    if (result === true) return true;
    if (result && typeof result === 'object' && result.confirmed === true) return true;
    return false;
  };

  const localConfirm = ({ anchor, title, message, confirmLabel, tone }) =>
    new Promise((resolve) => {
      const popover = document.createElement('div');
      popover.className = 'confirm-popover';
      popover.setAttribute('role', 'alertdialog');
      popover.setAttribute('aria-modal', 'false');

      const heading = document.createElement('div');
      heading.className = 'confirm-title';
      heading.id = `confirm-title-${Date.now().toString(36)}`;
      heading.textContent = title;
      popover.setAttribute('aria-labelledby', heading.id);
      popover.append(heading);

      if (message) {
        const text = document.createElement('div');
        text.className = 'confirm-message';
        text.id = `${heading.id}-message`;
        text.textContent = message;
        popover.setAttribute('aria-describedby', text.id);
        popover.append(text);
      }

      const actions = document.createElement('div');
      actions.className = 'confirm-actions';
      const cancel = document.createElement('stacki-button');
      cancel.setAttribute('label', 'Cancel');
      const accept = document.createElement('stacki-button');
      accept.setAttribute('label', confirmLabel || 'Confirm');
      accept.setAttribute('variant', tone === 'danger' ? 'danger' : 'primary');
      const danger = tone === 'danger';
      actions.append(cancel, accept);
      popover.append(actions);

      const close = (result) => {
        if (current && current.popover === popover) current = undefined;
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onPointer, true);
        window.removeEventListener('resize', onMove);
        document.removeEventListener('scroll', onMove, true);
        popover.remove();
        // Focus goes back to the control that opened the confirm, if it is still there.
        if (anchor.isConnected) focusSoon(anchor);
        resolve(result);
      };

      const onKey = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close(false);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          const onAccept = accept.contains(document.activeElement);
          const onCancel = cancel.contains(document.activeElement);
          // Danger: yes only from the confirm button. Otherwise yes unless focus is on Cancel.
          close(danger ? onAccept : !onCancel);
        } else if (event.key === 'Tab') {
          // Focus stays on the two buttons while the confirm is open.
          const first = innerButton(cancel);
          const last = innerButton(accept);
          if (first && last) {
            event.preventDefault();
            (document.activeElement === first ? last : first).focus();
          }
        }
      };
      // A press outside cancels; a press on the anchor is left to its click, which closes it (a toggle).
      const onPointer = (event) => {
        const target = event.target;
        if (popover.contains(target) || anchor.contains(target)) return;
        close(false);
      };
      const onMove = () => {
        if (anchor.isConnected) place(popover, anchor);
        else close(false);
      };

      cancel.addEventListener('click', () => close(false));
      accept.addEventListener('click', () => close(true));

      // Inside the app's `stacki-ui` root, so the kit's styles reach it; fixed, so no card clips it.
      (anchor.closest('.stacki-ui') || document.body).append(popover);
      place(popover, anchor);
      current = { anchor, popover, close };
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onPointer, true);
      window.addEventListener('resize', onMove);
      document.addEventListener('scroll', onMove, true);
      // The kit buttons render a frame later: place again once they have their size.
      requestAnimationFrame(() => {
        if (popover.isConnected) place(popover, anchor);
      });
      focusSoon(danger ? cancel : accept);
    });

  /**
   * Asks a yes or no question in a popover beside `anchor` (the control that asked).
   * `tone: 'danger'` draws the confirm button red, starts on Cancel and makes Enter answer no
   * (except on the confirm button). Escape or a click outside cancels, and focus returns to the
   * anchor. Answers true only for a yes.
   */
  FP.confirmAction = async ({ anchor, title, message, confirmLabel, tone }) => {
    if (!anchor || !anchor.isConnected) throw new Error('confirmAction: anchor must be an element in the page');
    if (typeof title !== 'string' || title.length === 0) throw new Error('confirmAction: title must be a non-empty string');

    // A second press on the same control closes the confirm it opened.
    if (current) {
      const same = current.anchor === anchor;
      current.close(false);
      if (same) return false;
    }

    // The UI kit's confirm (__stacki/ui.js), when this Stacki has it.
    if (typeof window.stackiConfirm === 'function') {
      return kitAnswer(await window.stackiConfirm({ title, message, confirmLabel, cancelLabel: 'Cancel', tone, anchor }));
    }
    return localConfirm({ anchor, title, message, confirmLabel, tone });
  };
})();
