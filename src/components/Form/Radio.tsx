import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import type { ReactNode } from 'react';
import { ChoiceLabel, choiceBox, choiceGroup, choiceRow } from './Checkbox';

export const RadioGroup = ({
  className = '',
  ...props
}: RadioGroupPrimitive.RadioGroupProps) => (
  <RadioGroupPrimitive.Root
    className={`${choiceGroup} ${className}`}
    {...props}
  />
);

export const Radio = ({
  label,
  description,
  className = '',
  ...props
}: Omit<RadioGroupPrimitive.RadioGroupItemProps, 'children'> & {
  label: ReactNode;
  description?: ReactNode;
}) => (
  <RadioGroupPrimitive.Item className={`${choiceRow} ${className}`} {...props}>
    <span
      className={`${choiceBox} rounded-full after:h-2.5 after:w-2.5 after:scale-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 group-data-[state=checked]:border-primary group-data-[state=checked]:after:scale-100 max-md:after:h-3 max-md:after:w-3`}
    />
    <ChoiceLabel label={label} description={description} />
  </RadioGroupPrimitive.Item>
);
