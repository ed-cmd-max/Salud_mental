const DISPLAY_DATE_REGEX =
  /^\d{2}\/\d{2}\/\d{4}$/;

export function formatDateInput(
  value: string
): string {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(
    2,
    4
  )}/${digits.slice(4)}`;
}

export function displayDateToIso(
  value: string
): string | null {
  let normalizedValue =
    value.trim();

  // Permite DD/MM/AA y lo convierte
  // automáticamente a DD/MM/AAAA.
  const shortYearMatch =
    normalizedValue.match(
      /^(\d{2})\/(\d{2})\/(\d{2})$/
    );

  if (shortYearMatch) {
    const [, day, month, shortYear] =
      shortYearMatch;

    normalizedValue =
      `${day}/${month}/20${shortYear}`;
  }

  const match =
    normalizedValue.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day
  );

  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValid) {
    return null;
  }

  return `${year}-${String(
    month
  ).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

export function isoDateToDisplay(
  value: string
): string {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;

  return `${day}/${month}/${year}`;
}

export function getTodayIsoDate(): string {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayDisplayDate(): string {
  return isoDateToDisplay(
    getTodayIsoDate()
  );
}