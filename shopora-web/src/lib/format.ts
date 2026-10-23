/** Sri Lankan rupees, always two decimals: Rs. 14,900.00 */
export function formatPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Dates from the API are UTC but may arrive without a "Z"; treat them as UTC. */
export function formatDate(iso: string): string {
  const value = /Z|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`;
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function percent(value: number): string {
  return `${Number(value)}%`;
}
