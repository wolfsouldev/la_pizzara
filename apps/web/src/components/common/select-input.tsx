import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import type { ComponentProps } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Radix reserves "" for its placeholder. Keep the application's empty filters and
// nullable assignees unchanged: this value exists only inside the visual control.
const emptyValue = '__pizzara_empty__';
const encode = (value: string) => value === '' ? emptyValue : value;

export function SelectOption({ value, ...props }: ComponentProps<typeof SelectItem>) {
  return <SelectItem value={encode(value)} {...props}/>;
}

type SelectInputProps = Omit<ComponentProps<typeof SelectTrigger>, 'onChange' | 'value' | 'defaultValue'> & {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
};

export function SelectInput({ value, onValueChange, name, disabled, required, children, placeholder = 'Selecciona una opción', ...triggerProps }: SelectInputProps) {
  return <Select name={name} value={encode(value)} onValueChange={next => onValueChange(next === emptyValue ? '' : next)} disabled={disabled} required={required}>
    <SelectTrigger disabled={disabled} {...triggerProps}><SelectValue placeholder={placeholder}/></SelectTrigger>
    <SelectContent>{children}</SelectContent>
  </Select>;
}

// Controlled RHF binding preserves reset/setValue, blur, validation and focus.
// No fabricated ChangeEvent or invisible native select is used as an adapter.
export function FormSelect<T extends FieldValues, N extends FieldPath<T>>({ control, name, emptyAsNull = false, onValueChange, ...props }: Omit<SelectInputProps, 'value' | 'name' | 'onValueChange'> & {
  control: Control<T>;
  name: N;
  emptyAsNull?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const { field, fieldState } = useController({ control, name });
  return <SelectInput {...props} ref={field.ref} name={field.name} value={typeof field.value === 'string' ? field.value : ''} aria-invalid={props['aria-invalid'] ?? fieldState.invalid} onBlur={field.onBlur} onValueChange={value => {
    field.onChange(emptyAsNull && value === '' ? null : value);
    onValueChange?.(value);
  }}/>;
}
