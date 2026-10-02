import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md';
import { useMobileToast } from '@/hooks/useMobileToast';
import type { ToastData } from '@/hooks/useToast';
import { Avatar } from '../Avatar';

export const MobileToastViewport = ({ children }: { children: ReactNode }) => (
  <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
    {children}
  </div>
);

export const MobileToast = ({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) => {
  const t = useTranslations();
  const { closing, offset, open, gestures } = useMobileToast({
    toast,
    onDismiss,
  });
  const shared = {
    ...gestures,
    'data-state': closing ? 'closed' : 'open',
    style: { transform: `translateY(${offset}px)` },
  };

  if (toast.activity) {
    return (
      <div
        {...shared}
        role="alert"
        className="MobileToast pointer-events-auto w-full touch-none select-none rounded-2xl bg-background-darker p-3 font-figtree shadow-[0_0_0_1px_var(--color-line-strong),0_14px_30px_-6px_rgba(0,0,0,0.7)] data-[state=closed]:opacity-0"
      >
        <button
          type="button"
          onClick={open}
          className="flex w-full items-start gap-3 text-left"
        >
          <Avatar avatarUrl={toast.iconUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-muted text-xs">
              <span className="font-semibold text-foreground">
                {t('disspeak')}
              </span>
              <span aria-hidden="true">·</span>
              <span>{t('Toast.now')}</span>
            </span>
            <span className="block text-foreground text-sm">{toast.title}</span>
            {toast.activity.actionLabel ? (
              <span className="mt-0.5 block text-primary-light text-xs">
                {toast.activity.actionLabel}
              </span>
            ) : null}
          </span>
        </button>
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong"
        />
      </div>
    );
  }

  const Icon = toast.variant === 'error' ? MdErrorOutline : MdCheckCircle;

  return (
    <output
      {...shared}
      className="MobileToast pointer-events-auto flex max-w-full touch-none select-none items-center gap-2 rounded-full bg-background-darker px-4 py-2.5 font-figtree text-foreground text-sm shadow-[0_0_0_1px_var(--color-line-strong),0_14px_30px_-6px_rgba(0,0,0,0.7)] data-[state=closed]:opacity-0"
    >
      <Icon
        size={18}
        className={`flex-shrink-0 ${toast.variant === 'error' ? 'text-danger' : 'text-primary-light'}`}
      />
      <span>{toast.title}</span>
      {toast.mobileDescription ? (
        <span className="text-muted">{toast.mobileDescription}</span>
      ) : null}
      {typeof toast.description === 'string' ? null : toast.description}
    </output>
  );
};
