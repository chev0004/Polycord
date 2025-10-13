import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { MdLanguage, MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { languages } from '@/constants/languages';
import { locales } from '@/utils/locales';

const getLocaleName = (code: string) => {
  const language = languages.find((lang) => lang.code === code);
  return language?.name_en ?? code.toUpperCase();
};

const MenuItem = ({
  locale,
  currentLocale,
}: {
  locale: string;
  currentLocale: string;
}) => {
  const isSelected = locale === currentLocale;
  const name = getLocaleName(locale);

  return (
    <Link
      href="/"
      locale={locale}
      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        isSelected
          ? 'bg-background-main text-primary-light'
          : 'text-white hover:bg-background-main/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <MdLanguage
          size={20}
          className={isSelected ? 'text-primary' : 'text-gray-400'}
        />
        <span>{name}</span>
      </div>
      <span className="font-semibold text-gray-400 text-xs uppercase">
        {locale}
      </span>
    </Link>
  );
};

export const LanguageSwitcher: React.FC = () => {
  const currentLocale = useLocale();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full px-3 py-1 text-white transition-all duration-200 hover:bg-background-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-darker"
        >
          <span className="font-semibold text-sm uppercase">
            {currentLocale}
          </span>
          <MdOutlineKeyboardArrowDown size={20} className="text-gray-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 w-[200px] rounded-lg border-[1px] border-gray-500/50 bg-background-dark p-1 shadow-lg"
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
              />
            ))}
          </div>
          <Popover.Arrow className="fill-gray-500/50" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
