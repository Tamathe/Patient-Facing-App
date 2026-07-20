export function isValidMultiChoiceMask(
  value: number,
  optionValues: readonly number[],
  allowEmpty: boolean
): boolean {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    (value === 0 && !allowEmpty) ||
    optionValues.some((optionValue) => !Number.isSafeInteger(optionValue) || optionValue <= 0)
  ) {
    return false;
  }

  const declaredMask = optionValues.reduce(
    (mask, optionValue) => mask | BigInt(optionValue),
    BigInt(0)
  );
  const responseMask = BigInt(value);
  return (responseMask & ~declaredMask) === BigInt(0);
}
