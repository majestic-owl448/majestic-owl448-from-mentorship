function decimalParts(value: string) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) {
    throw new Error(`Invalid non-negative decimal: ${value}`);
  }
  const fraction = match[2] ?? "";
  return {
    digits: BigInt(`${match[1]}${fraction}`),
    scale: fraction.length,
  };
}

export function multiplyExactDecimals(left: string, right: string) {
  const leftParts = decimalParts(left);
  const rightParts = decimalParts(right);
  const scale = leftParts.scale + rightParts.scale;
  const product = (leftParts.digits * rightParts.digits).toString();

  if (scale === 0) {
    return product;
  }

  const padded = product.padStart(scale + 1, "0");
  const integer = padded.slice(0, -scale).replace(/^0+(?=\d)/, "");
  const fraction = padded.slice(-scale).replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer;
}
