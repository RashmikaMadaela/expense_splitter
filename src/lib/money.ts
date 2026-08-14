/** All amounts in application state are integer minor units (rupees x 100) to avoid float drift. */

export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

export function minorToRupees(minor: number): number {
  return minor / 100;
}

export function formatMinor(minor: number): string {
  const rupees = minorToRupees(minor);
  const sign = rupees < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(rupees).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
