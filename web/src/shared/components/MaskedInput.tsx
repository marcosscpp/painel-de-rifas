import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form'
import { Input, type InputProps } from './Input'

type Props<T extends FieldValues, TOut> = Omit<InputProps, 'name' | 'value' | 'onChange' | 'onBlur'> & {
  // TOut: valor depois do schema (o formulário pode transformar o que foi digitado)
  control: Control<T, unknown, TOut>
  name: Path<T>
  // Formata enquanto digita: (11) 98765-4321, 000.000.000-00, dd/mm/aaaa...
  mask: (value: string) => string
}

// Input com máscara ligado ao React Hook Form; o erro do schema aparece embaixo do campo.
export function MaskedInput<T extends FieldValues, TOut = T>({ control, name, mask, ...props }: Props<T, TOut>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...props}
          ref={field.ref}
          name={field.name}
          value={(field.value as string | undefined) ?? ''}
          onBlur={field.onBlur}
          onChange={(e) => field.onChange(mask(e.target.value))}
          error={fieldState.error?.message ?? props.error}
        />
      )}
    />
  )
}
