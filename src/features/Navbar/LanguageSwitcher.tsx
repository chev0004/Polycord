import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
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
      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        isSelected
          ? 'bg-background-main text-primary-light'
          : 'text-white hover:bg-background-main/50'
      }`}
    >
      <span>{name}</span>
    </Link>
  );
};
export const LanguageSwitcher: React.FC = () => {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const pathWithoutLocale = pathname.replace(/^\/[^/]+/, '') || '';

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-6 select-none items-center justify-center overflow-hidden rounded-lg bg-background-darker text-white outline-none transition-all duration-200 hover:text-gray-30"
        >
          <div className="relative flex h-8 w-6 items-center justify-center">
            <span className="absolute top-0 left-0 font-bold font-zen text-s">
              文
            </span>
            <span className="absolute right-0 bottom-0 font-figtree font-semibold text-xs uppercase">
              {currentLocale}
            </span>
          </div>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 w-[120px] rounded-lg bg-background-dark p-1 shadow-lg"
          side="bottom"
          align="end"
          sideOffset={5}
        >
          <div className="flex flex-col gap-1">
            {locales.map((locale) => (
              <MenuItem
                key={locale}
                locale={locale}
                currentLocale={currentLocale}
                href={`/${locale}${pathWithoutLocale}`}
              />
            ))}
          </div>
          <Popover.Arrow className="fill-gray-500/50" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
