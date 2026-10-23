import { get, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { TextField } from './Fields';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>;
  /** Use "newAddress." when the fields are nested inside a bigger form (checkout). */
  prefix?: string;
}

/** The delivery address inputs, shared by the Addresses page and Checkout. */
export default function AddressFields({ register, errors, prefix = '' }: Props) {
  const err = (name: string) => (get(errors, `${prefix}${name}`) as { message?: string } | undefined)?.message;
  return (
    <>
      <div className="form-row form-row--2">
        <TextField label="Address label" hint="For example Home or Work" autoComplete="off" error={err('label')} {...register(`${prefix}label`)} />
        <TextField label="Full name" autoComplete="name" error={err('fullName')} {...register(`${prefix}fullName`)} />
      </div>
      <TextField label="Address line 1" autoComplete="address-line1" error={err('line1')} {...register(`${prefix}line1`)} />
      <TextField label="Address line 2 (optional)" autoComplete="address-line2" error={err('line2')} {...register(`${prefix}line2`)} />
      <div className="form-row form-row--2">
        <TextField label="City" autoComplete="address-level2" error={err('city')} {...register(`${prefix}city`)} />
        <TextField label="Postal code" autoComplete="postal-code" error={err('postalCode')} {...register(`${prefix}postalCode`)} />
      </div>
      <TextField label="Phone number" type="tel" autoComplete="tel" error={err('phone')} {...register(`${prefix}phone`)} />
    </>
  );
}
