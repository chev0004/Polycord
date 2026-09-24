import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { languages } from '@/constants/languages';
import { locales } from '@/utils/locales';
import { LocaleLink } from './LocaleLink';

const getLocaleName = (code: string) => {
  const language = languages.find((lang) => lang.code === code);
  return language?.name_en ?? code.toUpperCase();
};

export const LanguageSwitcher: React.FC = () => {
  const t = useTranslations('LanguageSwitcher');
  const currentLocale = useLocale();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const triggerContent = (
    <div className="relative h-10 w-[26px]">
      <span className="absolute top-0.5 left-0 font-bold font-zen text-[15px] leading-none">
        文
      </span>
      <span className="absolute right-0 bottom-0.5 font-figtree font-semibold text-[11px] uppercase leading-none">
        {currentLocale}
      </span>
    </div>
  );

  if (!isMounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        className="relative flex h-10 w-[26px] select-none items-center justify-center rounded-lg bg-background-darker text-foreground outline-none transition-colors duration-200 hover:text-muted focus-visible:bg-primary-dark"
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
          className="after:-inset-x-2 relative flex h-10 w-[26px] select-none items-center justify-center rounded-lg bg-background-darker text-foreground outline-none transition-colors duration-200 after:absolute after:inset-y-0 after:content-[''] hover:text-muted focus-visible:bg-primary-dark"
        >
          {triggerContent}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 w-[120px] rounded-[18px] border border-gray-500/50 bg-background-dark p-1.5 shadow-lg"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <div className="flex flex-col">
            {locales.map((locale) => (
              <LocaleLink
                key={locale}
                locale={locale}
                className={`flex h-[38px] w-full items-center gap-2.5 rounded-full px-3 text-sm no-underline transition-colors focus-visible:bg-background-main ${
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
