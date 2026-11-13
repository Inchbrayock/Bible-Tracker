import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/celebration';
import { closeTopLayer, isPointerOutsideDialog } from '../../lib/dialog';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}

function hasScrolledAncestor(target: EventTarget | null, boundary: HTMLElement): boolean {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== boundary) {
    if (node.scrollHeight > node.clientHeight + 2 && node.scrollTop > 0) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  onClose,
  labelledBy,
  className = '',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const swipeStateRef = useRef({
    eligible: false,
    dragging: false,
    startX: 0,
    startY: 0,
    lastY: 0,
    startTime: 0,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.style.transform = '';
      dialog.style.opacity = '';
      dialog.style.transition = '';
      dialog.removeAttribute('data-closing');
      dialog.showModal();
    } else if (!open && dialog.open) {
      void closeTopLayer(dialog);
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog).then(() => {
        onClose();
      });
    };

    const handleClose = () => {
      dialog.style.transform = '';
      dialog.style.opacity = '';
      dialog.style.transition = '';
      dialog.returnValue = '';
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);

    // Progressive enhancement fallback for light dismiss when closedBy is unavailable
    let cleanupFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isPointerOutsideDialog(e, dialog);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isPointerOutsideDialog(e, dialog)) {
          void closeTopLayer(dialog).then(() => onClose());
        }
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [onClose]);

  const handleNativeClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // In browsers supporting closedby="any", native click outside closes immediately without exit animation
    // unless intercepted; only intercept if target is the dialog backdrop edge outside inner wrapper.
    if (e.target === dialog && isPointerOutsideDialog(e.nativeEvent as unknown as PointerEvent, dialog)) {
      e.preventDefault();
      void closeTopLayer(dialog).then(() => onClose());
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || !open || e.touches.length !== 1 || prefersReducedMotion()) return;
    if (typeof window === 'undefined' || !window.matchMedia?.('(max-width: 639px)').matches) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest('select, input[type="range"], [data-no-sheet-drag]')) {
      swipeStateRef.current.eligible = false;
      return;
    }

    if (hasScrolledAncestor(e.target, dialog)) {
      swipeStateRef.current.eligible = false;
      return;
    }

    const touch = e.touches[0];
    swipeStateRef.current = {
      eligible: true,
      dragging: false,
      startX: touch.clientX,
      startY: touch.clientY,
      lastY: touch.clientY,
      startTime: performance.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    const state = swipeStateRef.current;
    if (!dialog || !state.eligible || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    state.lastY = touch.clientY;

    if (!state.dragging) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (dy <= 8 || Math.abs(dx) > dy * 0.85 || hasScrolledAncestor(e.target, dialog)) {
        state.eligible = false;
        return;
      }
      state.dragging = true;
      dialog.style.transition = 'none';
    }

    if (e.cancelable) {
      e.preventDefault();
    }
    const clampedDy = Math.max(0, dy);
    dialog.style.transform = `translateY(${clampedDy}px)`;
    dialog.style.opacity = String(Math.max(0.75, 1 - clampedDy / 900));
  };

  const handleTouchEnd = () => {
    const dialog = dialogRef.current;
    const state = swipeStateRef.current;
    if (!dialog || !state.dragging) {
      state.eligible = false;
      state.dragging = false;
      return;
    }

    const dy = Math.max(0, state.lastY - state.startY);
    const elapsed = Math.max(1, performance.now() - state.startTime);
    const velocity = dy / elapsed;

    state.eligible = false;
    state.dragging = false;

    if (dy > 105 || velocity > 0.52) {
      dialog.style.transition =
        'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease';
      dialog.style.transform = 'translateY(100%)';
      dialog.style.opacity = '0.8';
      window.setTimeout(() => {
        if (dialog.open) {
          dialog.close();
        } else {
          dialog.style.transform = '';
          dialog.style.opacity = '';
          dialog.style.transition = '';
        }
      }, 200);
    } else {
      dialog.style.transition =
        'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease';
      dialog.style.transform = '';
      dialog.style.opacity = '';
      window.setTimeout(() => {
        if (!swipeStateRef.current.dragging) {
          dialog.style.transition = '';
        }
      }, 290);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      {...({ closedby: 'any' } as Record<string, string>)}
      onClick={handleNativeClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`w-full max-sm:max-w-none sm:w-[94vw] overflow-hidden ${className}`}
    >
      <div className="relative flex max-h-[calc(var(--dialog-max-block)-2px)] flex-col overflow-hidden max-sm:max-h-[calc(var(--dialog-max-block)-1px)] max-sm:pb-[env(safe-area-inset-bottom)]">
        {/* Tactile mobile bottom-sheet grab handle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1.5 z-20 flex justify-center sm:hidden"
        >
          <span className="h-1 w-9 rounded-full bg-[var(--border-strong)]/70" />
        </div>
        {children}
      </div>
    </dialog>
  );
};
