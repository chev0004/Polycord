'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import type { IconType } from 'react-icons';
import { MdCheck, MdChevronRight, MdClose, MdSearch } from 'react-icons/md';

const DISMISS_DISTANCE = 80;

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  full?: boolean;
  flush?: boolean;
  onCloseAutoFocus?: () => void;
  children: ReactNode;
};

export const Sheet = ({
  open,
  onOpenChange,
  title,
  leading,
  trailing,
  footer,
  full = false,
  flush = false,
  onCloseAutoFocus,
  children,
}: SheetProps) => {
  const t = useTranslations('Sheet');
  const [drag, setDrag] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const returnFocus = useRef<Element | null>(null);

  const release = () => {
    if (start === null) return;
    setStart(null);
    if (drag > DISMISS_DISTANCE) onOpenChange(false);
    else setDrag(0);
  };

  const dragHandlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      setStart(event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (start !== null) setDrag(Math.max(0, event.clientY - start));
    },
    onPointerUp: release,
    onPointerCancel: release,
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="SheetOverlay fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement;
            setDrag(0);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current instanceof HTMLElement)
              returnFocus.current.focus();
            onCloseAutoFocus?.();
          }}
          style={{ '--sheet-drag': `${drag}px` } as CSSProperties}
          className={`SheetContent fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-60px)] translate-y-[var(--sheet-drag)] flex-col overflow-hidden rounded-t-3xl bg-background-dark font-figtree text-foreground shadow-[0_-1px_0_var(--color-line),0_-12px_32px_rgba(0,0,0,0.5)] ${
            full ? 'h-[calc(100dvh-60px)]' : ''
          } ${start === null ? 'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]' : ''}`}
        >
          <div
            {...dragHandlers}
            className="flex h-[22px] flex-shrink-0 cursor-grab touch-none items-center justify-center"
          >
            <span className="h-1 w-9 rounded-full bg-line-strong" />
          </div>
          <div
            className={`flex min-h-12 flex-shrink-0 items-center gap-1 pr-2 pb-1.5 ${leading ? 'pl-1' : 'pl-5'}`}
          >
            {leading}
            <Dialog.Title
              {...dragHandlers}
              className="min-w-0 flex-1 touch-none truncate font-bold text-lg"
            >
              {title}
            </Dialog.Title>
            {trailing}
            <Dialog.Close asChild>
              <SheetIconButton label={t('close')}>
                <MdClose size={24} />
              </SheetIconButton>
            </Dialog.Close>
          </div>
          <div
            className={`relative min-h-0 flex-1 ${
              flush
                ? 'overflow-hidden'
                : 'overflow-y-auto overscroll-contain px-5 pt-1 pb-5 [scrollbar-width:none]'
            }`}
          >
            {children}
          </div>
          {footer ? (
            <div className="flex flex-shrink-0 gap-2.5 border-line border-t bg-background-dark px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              {footer}
            </div>
          ) : (
            <div className="h-[calc(env(safe-area-inset-bottom)+20px)] flex-shrink-0" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const SheetIconButton = ({
  label,
  children,
  ...props
}: React.ComponentProps<'button'> & { label: string }) => (
  <button
    type="button"
    aria-label={label}
    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-overlay focus-visible:bg-overlay active:bg-overlay"
    {...props}
  >
    {children}
  </button>
);

export const SheetTextButton = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="h-11 flex-shrink-0 px-2 font-semibold text-primary text-sm hover:text-primary-light focus-visible:text-primary-light"
  >
    {children}
  </button>
);

export const SheetLabel = ({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) => (
  <div className="flex items-center justify-between px-1 pt-5 pb-2 font-semibold text-subtle text-xs uppercase tracking-[0.06em] first:pt-2">
    {children}
    {aside ? (
      <span className="text-primary normal-case tracking-normal">{aside}</span>
    ) : null}
  </div>
);

export const SheetGroup = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-3xl bg-background-darker">
    {children}
  </div>
);

export const SheetCheck = ({
  checked,
  radio = false,
}: {
  checked: boolean;
  radio?: boolean;
}) => (
  <span
    aria-hidden
    className={`ml-auto flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center text-on-primary transition-all duration-150 ${
      radio ? 'rounded-full' : 'rounded-md'
    } ${
      checked
        ? radio
          ? 'border-[6px] border-primary'
          : 'border-[1.5px] border-primary bg-primary'
        : 'border-[1.5px] border-line-strong'
    }`}
  >
    {checked && !radio ? <MdCheck size={16} /> : null}
  </span>
);

type SheetRowProps = {
  icon?: IconType;
  label: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  valueActive?: boolean;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
  pressed?: boolean;
  children?: ReactNode;
  onClick: () => void;
};

export const SheetRow = ({
  icon: Icon,
  label,
  description,
  value,
  valueActive = false,
  chevron = false,
  danger = false,
  disabled = false,
  pressed,
  children,
  onClick,
}: SheetRowProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={pressed}
    className={`relative flex min-h-14 w-full items-center gap-3.5 px-4 py-2.5 text-left text-[15px] transition-colors duration-150 before:absolute before:top-0 before:right-0 before:h-px before:bg-line first:before:hidden hover:bg-overlay focus-visible:bg-overlay active:bg-overlay disabled:opacity-50 ${
      Icon ? 'before:left-[52px]' : 'before:left-4'
    } ${danger ? 'text-danger' : 'text-foreground'}`}
  >
    {Icon ? (
      <Icon
        size={22}
        aria-hidden
        className={`flex-shrink-0 ${danger ? 'text-danger' : 'text-muted'}`}
      />
    ) : null}
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className={pressed === false ? 'font-medium' : 'font-semibold'}>
        {label}
      </span>
      {description ? (
        <span className="text-[13px] text-subtle leading-snug">
          {description}
        </span>
      ) : null}
    </span>
    {value ? (
      <span
        className={`max-w-[160px] truncate text-sm ${valueActive ? 'text-primary-light' : 'text-muted'}`}
      >
        {value}
      </span>
    ) : null}
    {children}
    {chevron ? (
      <MdChevronRight
        size={20}
        aria-hidden
        className="flex-shrink-0 text-subtle"
      />
    ) : null}
  </button>
);

export type ActionSheetItem = {
  key: string;
  icon?: IconType;
  label: ReactNode;
  description?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onSelect: () => void;
};

type ActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  items: ActionSheetItem[];
  radio?: boolean;
};

export const ActionSheet = ({
  open,
  onOpenChange,
  title,
  items,
  radio = false,
}: ActionSheetProps) => {
  const pending = useRef<(() => void) | null>(null);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onCloseAutoFocus={() => {
        pending.current?.();
        pending.current = null;
      }}
    >
      <SheetGroup>
        {items.map(({ key, selected, onSelect, ...item }) => (
          <SheetRow
            key={key}
            {...item}
            pressed={radio ? Boolean(selected) : undefined}
            onClick={() => {
              pending.current = onSelect;
              onOpenChange(false);
            }}
          >
            {radio ? <SheetCheck radio checked={Boolean(selected)} /> : null}
          </SheetRow>
        ))}
      </SheetGroup>
    </Sheet>
  );
};

export const SheetDrill = ({
  drilled,
  main,
  sub,
}: {
  drilled: boolean;
  main: ReactNode;
  sub: ReactNode;
}) => (
  <>
    <div
      inert={drilled}
      className={`absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-1 pb-5 transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] [scrollbar-width:none] ${
        drilled ? '-translate-x-[28%] opacity-0' : ''
      }`}
    >
      {main}
    </div>
    <div
      inert={!drilled}
      className={`absolute inset-0 overflow-y-auto overscroll-contain bg-background-dark px-5 pt-1 pb-5 transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] [scrollbar-width:none] ${
        drilled ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {sub}
    </div>
  </>
);

export const SheetPickList = ({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onSelect: (value: string) => void;
}) => {
  const t = useTranslations('Sheet');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = options.filter((option) =>
    option.label.toLowerCase().includes(query),
  );

  return (
    <>
      <div className="sticky top-0 z-[2] bg-background-dark pb-2.5">
        <label className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-background-darker pr-2 pl-4 text-subtle focus-within:border-primary">
          <MdSearch size={20} aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('search')}
            aria-label={label}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
          />
        </label>
      </div>
      <SheetGroup>
        {shown.length > 0 ? (
          shown.map((option) => (
            <SheetRow
              key={option.value}
              label={option.label}
              pressed={option.value === value}
              onClick={() => onSelect(option.value)}
            >
              <SheetCheck radio checked={option.value === value} />
            </SheetRow>
          ))
        ) : (
          <p className="px-4 py-4 text-sm text-subtle">{t('noResults')}</p>
        )}
      </SheetGroup>
    </>
  );
};
