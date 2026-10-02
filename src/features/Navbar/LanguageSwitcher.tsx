import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdOutlineKeyboardArrowDown, MdOutlineLanguage } from 'react-icons/md';
import { menuContentClass, menuItemClass } from '@/components/Menu';
import { languages } from '@/constants/languages';
import { locales } from '@/utils/locales';
import { LocaleLink } from './LocaleLink';

const getLocaleName = (code: string) => {
  const language = languages.find((lang) => lang.code === code);
  return language?.name_en ?? code.toUpperCase();
};

const triggerClassName =
  'flex h-9 select-none items-center gap-1.5 rounded-lg px-1 font-figtree font-semibold text-foreground text-sm uppercase tracking-[0.04em] outline-none transition-colors duration-200 hover:text-muted focus-visible:bg-primary-dark';

export const LanguageSwitcher: React.FC = () => {
  const t = useTranslations('LanguageSwitcher');
  const currentLocale = useLocale();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const triggerContent = (
    <>
      <MdOutlineLanguage size={22} />
      <span>{currentLocale}</span>
      <MdOutlineKeyboardArrowDown size={18} className="text-subtle" />
    </>
  );

  if (!isMounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        className={triggerClassName}
        tabIndex={-1}
      >
        {triggerContent}
      </button>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={t('changeLanguage')}
          className={triggerClassName}
        >
          {triggerContent}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={`${menuContentClass} w-[120px]`}
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <div className="flex flex-col">
            {locales.map((locale) => (
              <LocaleLink
                key={locale}
                locale={locale}
                className={`${menuItemClass} ${
                  locale === currentLocale
                    ? 'bg-background-main text-primary-light'
                    : 'text-foreground hover:bg-background-main'
                }`}
              >
                {getLocaleName(locale)}
              </LocaleLink>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
