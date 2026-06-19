import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { languages } from '@/constants/languages';
import { locales } from '@/utils/locales';

const getLocaleName = (code: string) => {
  const language = languages.find((lang) => lang.code === code);
  return language?.name_en ?? code.toUpperCase();
};

const MenuItem = ({
  locale,
  currentLocale,
  href,
}: {
  locale: string;
  currentLocale: string;
  href: string;
}) => {
  const isSelected = locale === currentLocale;
  const name = getLocaleName(locale);

  return (
    <Link
      href={href}
      className={`flex h-[38px] w-full items-center gap-2.5 rounded-full px-3 text-sm no-underline transition-colors ${
        isSelected
          ? 'bg-background-main text-primary-light'
          : 'text-white hover:bg-background-main'
      }`}
    >
      <span>{name}</span>
    </Link>
  );
};

export const LanguageSwitcher: React.FC = () => {
  const t = useTranslations('LanguageSwitcher');
  const currentLocale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const pathWithoutLocale = pathname.replace(/^\/[^/]+/, '') || '';
  const query = searchParams.toString();
  const queryString = query ? `?${query}` : '';

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
        className="relative flex h-10 w-[26px] select-none items-center justify-center rounded-lg bg-background-darker text-white outline-none transition-colors duration-200 hover:text-gray-400"
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
          className="relative flex h-10 w-[26px] select-none items-center justify-center rounded-lg bg-background-darker text-white outline-none transition-colors duration-200 hover:text-gray-400"
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
              <MenuItem
                key={locale}
                locale={locale}
                currentLocale={currentLocale}
                href={`/${locale}${pathWithoutLocale}${queryString}`}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
