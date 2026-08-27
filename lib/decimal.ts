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

function formatDecimal(digits: bigint, scale: number) {
  const value = digits.toString();
  if (scale === 0) {
    return value;
  }

  const padded = value.padStart(scale + 1, "0");
  const integer = padded.slice(0, -scale).replace(/^0+(?=\d)/, "");
  const fraction = padded.slice(-scale).replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer;
}

export function addExactDecimals(left: string, right: string) {
  const leftParts = decimalParts(left);
  const rightParts = decimalParts(right);
  const scale = Math.max(leftParts.scale, rightParts.scale);
  const leftDigits =
    leftParts.digits * BigInt(10) ** BigInt(scale - leftParts.scale);
  const rightDigits =
    rightParts.digits * BigInt(10) ** BigInt(scale - rightParts.scale);

  return formatDecimal(leftDigits + rightDigits, scale);
}

export function multiplyExactDecimals(left: string, right: string) {
  const leftParts = decimalParts(left);
  const rightParts = decimalParts(right);
  const scale = leftParts.scale + rightParts.scale;
  const product = (leftParts.digits * rightParts.digits).toString();

  return formatDecimal(BigInt(product), scale);
}
