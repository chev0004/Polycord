import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import type { ReactNode } from 'react';
import { MdCheck } from 'react-icons/md';

export const choiceRow =
  'group flex min-h-11 w-full items-center gap-3 rounded-full px-3 text-left text-sm leading-5 text-foreground transition-colors duration-150 hover:bg-background-main focus-visible:bg-background-main disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent max-md:min-h-14 max-md:rounded-none max-md:px-4 max-md:py-2.5 max-md:hover:bg-transparent';

export const choiceBox =
  'grid h-5 w-5 shrink-0 place-items-center border-[1.5px] border-line-strong text-transparent transition-colors duration-150 group-hover:border-muted max-md:h-6 max-md:w-6';

export const choiceGroup =
  'flex flex-col gap-0.5 max-md:gap-0 max-md:overflow-hidden max-md:rounded-panel max-md:bg-background-darker max-md:[&>*+*]:shadow-[inset_0_1px_0_rgba(107,114,128,0.22)]';

export const ChoiceLabel = ({
  label,
  description,
}: {
  label: ReactNode;
  description?: ReactNode;
}) => (
  <span className="min-w-0 flex-1">
    {label}
    {description ? (
      <small className="mt-px block text-subtle text-xs">{description}</small>
    ) : null}
  </span>
);

export const CheckGroup = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`${choiceGroup} ${className}`}>{children}</div>;

export const Checkbox = ({
  label,
  description,
  className = '',
  ...props
}: Omit<CheckboxPrimitive.CheckboxProps, 'children'> & {
  label: ReactNode;
  description?: ReactNode;
}) => (
  <CheckboxPrimitive.Root className={`${choiceRow} ${className}`} {...props}>
    <span
      className={`${choiceBox} rounded-row group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=checked]:text-on-primary`}
    >
      <MdCheck size={16} aria-hidden />
    </span>
    <ChoiceLabel label={label} description={description} />
  </CheckboxPrimitive.Root>
);
