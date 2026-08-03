/**
 * Enumeration input with translated option labels.
 *
 * Strapi 5.42 Content Manager passes `{ value }` without labels, so Select shows
 * raw API/DB values (image_only, certificate, …). Upstream fix (#26837) restores
 * formatMessage({ id: value }); we mirror that via app.addFields until upgrade.
 *
 * Technical enum values stay unchanged in schemas/API; only Admin UI labels change.
 */
import { forwardRef, memo } from 'react';
import { useIntl } from 'react-intl';
import { Field, SingleSelect, SingleSelectOption, useComposedRefs } from '@strapi/design-system';
import { useField, useFocusInputField } from '@strapi/admin/strapi-admin';

function resolveEnumLabel(formatMessage, messages, value) {
  const raw = String(value);
  // Prefer an explicit translation for the raw value (official Strapi 5 approach).
  if (messages && typeof messages[raw] === 'string' && messages[raw].trim()) {
    return formatMessage({ id: raw, defaultMessage: raw });
  }
  return formatMessage({ id: raw, defaultMessage: raw });
}

const EnumerationInput = forwardRef(
  ({ name, required, label, hint, labelAction, attribute, options: providedOptions, disabled, ...props }, ref) => {
    const { formatMessage, messages } = useIntl();
    const field = useField(name);
    const fieldRef = useFocusInputField(name);
    const composedRefs = useComposedRefs(ref, fieldRef);

    const enumValues = Array.isArray(attribute?.enum)
      ? attribute.enum
      : Array.isArray(providedOptions)
        ? providedOptions.map((opt) => (typeof opt === 'string' ? opt : opt?.value)).filter(Boolean)
        : [];

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <SingleSelect
          ref={composedRefs}
          disabled={disabled}
          onChange={(value) => {
            field.onChange(name, value === '' ? null : value);
          }}
          value={field.value ?? ''}
          {...props}
        >
          <SingleSelectOption value="" disabled={required} hidden={required}>
            {formatMessage({
              id: 'components.InputSelect.option.placeholder',
              defaultMessage: 'Choose here',
            })}
          </SingleSelectOption>
          {enumValues.map((value) => (
            <SingleSelectOption key={value} value={value}>
              {resolveEnumLabel(formatMessage, messages, value)}
            </SingleSelectOption>
          ))}
        </SingleSelect>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  },
);

EnumerationInput.displayName = 'EnumerationInput';

export default memo(EnumerationInput);
