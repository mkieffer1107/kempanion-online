/** Native label activation keeps WebKit's trusted-event chain without putting a switch in the touch path. */
const CONTROLS = 'button, a[href], [role="button"], [role="switch"], [role="radio"], [data-haptic-area]';
const NATIVE = 'data-native-haptic';

export function installNativeHaptics(doc: Document, enabled: () => boolean) {
  const win = doc.defaultView!;
  const input = doc.createElement('input');
  input.type = 'checkbox';
  input.id = `kempanion-touch-${Math.random().toString(36).slice(2)}`;
  input.setAttribute('switch', '');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  input.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none;appearance:auto';
  doc.body.append(input);
  const surfaces = new Map<HTMLElement, HTMLLabelElement>();
  const anchors = new Map<HTMLElement, { value: string; priority: string }>();
  let frame = 0;
  let fullRefresh = true;
  const dirtyAreas = new Set<HTMLElement>();
  const pressed = new Set<HTMLLabelElement>();
  let destroyed = false;
  let pending: { target: HTMLElement; event: MouseEvent; focused: HTMLElement | null; area: boolean } | undefined;
  const focusTasks = new Set<ReturnType<typeof setTimeout>>();
  function activate() {
    const request = pending;
    pending = undefined;
    if (!request) return;
    const { target, event, focused, area } = request;
    let desiredFocus = focused;
    function restoreFocus() {
      if (doc.activeElement !== input) return;
      input.blur();
      if (desiredFocus?.isConnected && desiredFocus !== doc.body) desiredFocus.focus({ preventScroll: true });
    }
    restoreFocus();
    if (!area && !blocked(target)) target.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, composed: true, detail: event.detail || 1,
      clientX: event.clientX, clientY: event.clientY, screenX: event.screenX, screenY: event.screenY,
      button: event.button, buttons: event.buttons,
      ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey,
    }));
    if (doc.activeElement instanceof HTMLElement && doc.activeElement !== input && doc.activeElement !== doc.body) desiredFocus = doc.activeElement;
    const task = setTimeout(() => { focusTasks.delete(task); restoreFocus(); }, 0);
    focusTasks.add(task);
    schedule();
  }
  // change runs after native switch activation, unlike a microtask in a label's click handler.
  input.addEventListener('change', activate);

  function blocked(target: HTMLElement) {
    return !target.isConnected || target.closest('[disabled], [aria-disabled="true"], [inert], [data-haptics="off"]') !== null;
  }
  function pointer(target: HTMLElement, original: PointerEvent, label: HTMLLabelElement) {
    // Existing press/hold controls capture their original currentTarget. Keep capture
    // on the real touched label so subsequent events follow the same single adapter.
    const methods = ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'] as const;
    const saved = methods.map((name) => Object.getOwnPropertyDescriptor(target, name));
    for (const name of methods) Object.defineProperty(target, name, { configurable: true, value: label[name].bind(label) });
    try { target.dispatchEvent(new PointerEvent(original.type, {
      bubbles: true, cancelable: true, composed: true,
      pointerId: original.pointerId, pointerType: original.pointerType, isPrimary: original.isPrimary,
      clientX: original.clientX, clientY: original.clientY, screenX: original.screenX, screenY: original.screenY,
      button: original.button, buttons: original.buttons, pressure: original.pressure,
      width: original.width, height: original.height,
      ctrlKey: original.ctrlKey, shiftKey: original.shiftKey, altKey: original.altKey, metaKey: original.metaKey,
    })); } finally {
      methods.forEach((name, index) => { const descriptor = saved[index]; if (descriptor) Object.defineProperty(target, name, descriptor); else delete (target as unknown as Record<string, unknown>)[name]; });
    }
  }
  function anchorFor(target: HTMLElement) {
    // The CSS containing block must stay INSIDE the scroll ancestor as well as
    // the DOM ancestor chain. Fixed-position labels cannot participate in native pan.
    let scrollRoot: HTMLElement | null = null;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(win.getComputedStyle(parent).overflowX + win.getComputedStyle(parent).overflowY)) { scrollRoot = parent; break; }
    }
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (win.getComputedStyle(parent).position !== 'static') return parent;
      const wouldMove = [...parent.querySelectorAll<HTMLElement>('*')].some((child) => {
        if (child.hasAttribute(NATIVE) || win.getComputedStyle(child).position !== 'absolute') return false;
        const containing = child.offsetParent;
        return !containing || !parent!.contains(containing);
      });
      // Preserve absolute pseudo-elements too, whose offsetParent cannot be queried.
      const pseudo = [parent, ...parent.querySelectorAll<HTMLElement>('*')].some((node) => {
        if (node !== parent && win.getComputedStyle(node).position !== 'static') return false;
        return ['::before', '::after'].some((part) => {
          const css = win.getComputedStyle(node, part);
          return css.content !== 'none' && css.content !== 'normal' && css.position === 'absolute';
        });
      });
      if (!wouldMove && !pseudo) {
        if (!anchors.has(parent)) anchors.set(parent, { value: parent.style.getPropertyValue('position'), priority: parent.style.getPropertyPriority('position') });
        parent.style.position = 'relative';
        return parent;
      }
      if (parent === scrollRoot) break;
    }
    return null; // Keep the original control usable rather than intercept an unsupported scroll surface.
  }
  function surface(target: HTMLElement) {
    const area = target.hasAttribute('data-haptic-area');
    const anchor = area ? target : anchorFor(target);
    if (!anchor) return undefined;
    const label = doc.createElement('label');
    label.htmlFor = input.id;
    label.setAttribute(NATIVE, '');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = `position:absolute;margin:0;padding:0;border:0;opacity:0;pointer-events:auto;cursor:pointer;z-index:${area ? 0 : 2147483646};touch-action:${area ? 'none' : 'auto'};-webkit-tap-highlight-color:transparent`;
    let start: { x: number; y: number } | undefined;
    let moved = false;
    let focused: HTMLElement | null = null;
    label.addEventListener('pointerdown', (event) => {
      if (blocked(target)) { event.preventDefault(); event.stopPropagation(); return; }
      pending = undefined;
      pressed.add(label);
      start = { x: event.clientX, y: event.clientY };
      moved = false;
      if (area) label.setPointerCapture(event.pointerId);
      else { event.stopPropagation(); pointer(target, event, label); }
      focused = doc.activeElement as HTMLElement | null;
    });
    label.addEventListener('pointermove', (event) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > Number(target.dataset.hapticDragThreshold ?? 8)) moved = true;
      if (!area) { event.stopPropagation(); pointer(target, event, label); }
    });
    label.addEventListener('pointerup', (event) => {
      pressed.delete(label);
      if (!area) { event.stopPropagation(); pointer(target, event, label); }
    });
    label.addEventListener('pointercancel', (event) => {
      moved = true;
      pressed.delete(label);
      schedule();
      if (!area) { event.stopPropagation(); pointer(target, event, label); }
    });
    label.addEventListener('lostpointercapture', (event) => {
      if (!area) { event.stopPropagation(); pointer(target, event, label); }
    });
    label.addEventListener('click', (event) => {
      pressed.delete(label);
      start = undefined;
      event.stopPropagation();
      if (moved || event.defaultPrevented || blocked(target)) {
        event.preventDefault(); return;
      }
      pending = { target, event, focused, area };
      if (!enabled()) { event.preventDefault(); activate(); }
      // The associated native input's change listener forwards the action only
      // AFTER its trusted label activation. No programmatic switch.click().
    });
    // Same parent as the original button: native scrolling retains the SAME scroll ancestors.
    // No app nodes are wrapped/moved, and the transparent label has no accessibility role.
    anchor.append(label);
    resize.observe(target);
    surfaces.set(target, label);
    return label;
  }

  function refresh() {
    frame = 0;
    if (destroyed) return;
    const on = enabled() && doc.visibilityState === 'visible';
    const all = fullRefresh;
    fullRefresh = false;
    const targets = all ? [...doc.querySelectorAll<HTMLElement>(CONTROLS)] : [...dirtyAreas];
    dirtyAreas.clear();
    for (const [target, label] of surfaces) {
      if (!target.isConnected || !label.isConnected) {
        label.remove(); resize.unobserve(target); surfaces.delete(target);
      } else if ((all || targets.includes(target)) && !pressed.has(label)) label.style.pointerEvents = 'none';
    }
    if (!on) {
      for (const label of surfaces.values()) label.style.display = 'none';
      return;
    }
    for (const target of targets) {
      if (pressed.has(surfaces.get(target)!)) continue; // Never move/hide a surface during its captured gesture.
      if (blocked(target)) continue;
      const box = target.getBoundingClientRect();
      let left = Math.max(0, box.left), top = Math.max(0, box.top);
      let right = Math.min(win.innerWidth, box.right), bottom = Math.min(win.innerHeight, box.bottom);
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        const css = win.getComputedStyle(parent);
        if (/(auto|scroll|hidden|clip)/.test(css.overflowX + css.overflowY)) {
          const clip = parent.getBoundingClientRect();
          if (css.overflowX !== 'visible') { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
          if (css.overflowY !== 'visible') { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
        }
      }
      if (right - left < 1 || bottom - top < 1) continue;
      const hit = doc.elementFromPoint((left + right) / 2, (top + bottom) / 2);
      if (!hit || !(target.contains(hit) || (target.hasAttribute('data-haptic-area') && hit.closest('.stage-view')))) continue;
      const label = surfaces.get(target) ?? surface(target);
      if (!label) continue;
      label.style.display = 'block';
      label.style.touchAction = target.hasAttribute('data-haptic-area') ? 'none' : win.getComputedStyle(target).touchAction;
      // Measure the local absolute containing block, including scroll offset and scale.
      label.style.left = '0px'; label.style.top = '0px'; label.style.width = '100px'; label.style.height = '100px';
      const origin = label.getBoundingClientRect();
      const sx = origin.width / 100 || 1, sy = origin.height / 100 || 1;
      label.style.left = `${(left - origin.left) / sx}px`;
      label.style.top = `${(top - origin.top) / sy}px`;
      label.style.width = `${(right - left) / sx}px`;
      label.style.height = `${(bottom - top) / sy}px`;
      label.dataset.hapticFor = target.getAttribute('aria-label') ?? target.textContent?.trim().slice(0, 60) ?? '';
      label.style.pointerEvents = 'auto';
    }
    // Disabled, occluded and clipped controls must never leave a stale touch surface.
    for (const [target, label] of surfaces) if (!pressed.has(label) && (blocked(target) || label.style.pointerEvents !== 'auto')) label.style.display = 'none';
    observer.takeRecords(); // Ignore only our own synchronous label geometry writes.
  }
  function request() { if (!frame && !destroyed) frame = win.requestAnimationFrame(refresh); }
  function schedule() { fullRefresh = true; request(); }
  const resize = new ResizeObserver(schedule);
  const observer = new MutationObserver((records) => {
    let general = false;
    for (const record of records) {
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!element || element.hasAttribute(NATIVE) || element.closest('.stage-bubble, .vn .text')) continue;
      if (element.hasAttribute('data-haptic-area') && record.type === 'attributes') {
        dirtyAreas.add(element as HTMLElement); continue;
      }
      if (record.type === 'characterData') continue; // ResizeObserver handles control text dimensions.
      if (record.type === 'attributes' && record.attributeName === 'style' && !element.closest(CONTROLS)) continue;
      if (record.type === 'childList') {
        // Text/bubble/typewriter updates cannot add a new interactive control.
        const nodes = [...record.addedNodes, ...record.removedNodes];
        if (!nodes.some((node) => node instanceof Element && (node.matches(CONTROLS) || node.querySelector(CONTROLS)))) continue;
      }
      general = true;
    }
    if (general) schedule();
    else if (dirtyAreas.size) request();
  });
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, characterData: true });
  function motionEnd(event: Event) {
    const target = event.target;
    if (target instanceof Element && !target.hasAttribute(NATIVE) && (target.matches(CONTROLS) || target.querySelector(CONTROLS))) schedule();
  }
  doc.addEventListener('animationend', motionEnd, true);
  doc.addEventListener('transitionend', motionEnd, true);
  doc.addEventListener('scroll', schedule, true);
  doc.addEventListener('visibilitychange', schedule);
  win.addEventListener('resize', schedule);
  win.visualViewport?.addEventListener('resize', schedule);
  win.visualViewport?.addEventListener('scroll', schedule);
  schedule();
  return () => {
    destroyed = true;
    win.cancelAnimationFrame(frame);
    observer.disconnect(); resize.disconnect();
    doc.removeEventListener('animationend', motionEnd, true);
    doc.removeEventListener('transitionend', motionEnd, true);
    doc.removeEventListener('scroll', schedule, true);
    doc.removeEventListener('visibilitychange', schedule);
    win.removeEventListener('resize', schedule);
    win.visualViewport?.removeEventListener('resize', schedule);
    win.visualViewport?.removeEventListener('scroll', schedule);
    for (const task of focusTasks) clearTimeout(task);
    for (const label of surfaces.values()) label.remove();
    surfaces.clear();
    for (const [anchor, original] of anchors) {
      if (anchor.style.position === 'relative') {
        if (original.value) anchor.style.setProperty('position', original.value, original.priority);
        else anchor.style.removeProperty('position');
      }
    }
    anchors.clear(); input.remove();
  };
}
