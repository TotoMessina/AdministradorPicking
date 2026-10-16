import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

// Animate existing nodes rather than remounting forms or the current sale.
export function useMobileScreenMotion(main: RefObject<HTMLElement | null>, screen: string) {
  const previous = useRef(screen);
  useLayoutEffect(() => {
    const changed = previous.current !== screen;
    previous.current = screen;
    const element = main.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!changed || !element?.animate || reduced.matches ||
      !window.matchMedia('(max-width: 760px)').matches) return;
    const animations = [element.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' })];
    const heading = element.querySelector<HTMLElement>('.page-heading');
    if (heading?.animate) animations.push(heading.animate(
      [{ transform: 'translateY(8px)' }, { transform: 'translateY(0)' }],
      { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' },
    ));
    // A new interaction must never wait for a transition (or inherit its stacking context).
    const cancel = () => animations.forEach(animation => animation.cancel());
    element.addEventListener('pointerdown', cancel, { once: true });
    reduced.addEventListener('change', cancel);
    return () => {
      cancel();
      element.removeEventListener('pointerdown', cancel);
      reduced.removeEventListener('change', cancel);
    };
  }, [main, screen]);
}

export function useMobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const mobile = window.matchMedia('(max-width: 760px)');
    let fullHeight = Math.max(window.innerHeight, viewport.height);
    let frame = 0;
    const update = () => {
      const focused = document.activeElement;
      const editing = focused instanceof HTMLElement && Boolean(
        focused.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea') || focused.isContentEditable);
      if (!editing) fullHeight = Math.max(window.innerHeight, viewport.height);
      const keyboard = mobile.matches && editing && viewport.scale === 1 && fullHeight - viewport.height > 150;
      root.toggleAttribute('data-mobile-keyboard', keyboard);
      root.style.setProperty('--visual-height', `${viewport.height}px`);
      root.style.setProperty('--visual-top', `${viewport.offsetTop}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const rotate = () => { fullHeight = window.innerHeight; schedule(); };
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    window.addEventListener('orientationchange', rotate);
    mobile.addEventListener('change', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      window.removeEventListener('orientationchange', rotate);
      mobile.removeEventListener('change', schedule);
      root.removeAttribute('data-mobile-keyboard');
      root.style.removeProperty('--visual-height');
      root.style.removeProperty('--visual-top');
    };
  }, []);
}
