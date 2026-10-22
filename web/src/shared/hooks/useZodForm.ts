import { zodResolver } from '@hookform/resolvers/zod'
import { type FieldValues, useForm, type UseFormProps } from 'react-hook-form'
import type { z } from 'zod'

// React Hook Form já ligado a um schema Zod. Os erros aparecem ao sair do campo
// (não enquanto a pessoa ainda digita) e, depois do primeiro envio, a cada mudança.
export function useZodForm<S extends z.ZodType<unknown, FieldValues>>(
  schema: S,
  props?: Omit<UseFormProps<z.input<S>, unknown, z.output<S>>, 'resolver'>,
) {
  return useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as any),
    mode: 'onTouched',
    ...props,
  })
}
