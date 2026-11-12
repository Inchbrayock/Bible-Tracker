import React, { useEffect, useRef } from 'react';
import { closeTopLayer, isPointerOutsideDialog } from '../../lib/dialog';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  onClose,
  labelledBy,
  className = '',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      {...({ closedby: 'any' } as Record<string, string>)}
      onClick={handleNativeClick}
      className={`w-full max-sm:max-w-none sm:w-[94vw] overflow-hidden ${className}`}
    >
      {children}
    </dialog>
  );
};
