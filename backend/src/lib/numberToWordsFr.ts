/**
 * Convert numeric amount to French text representation with currency.
 */

const UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const TEENS = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];

function convertUnderThousand(num: number): string {
  if (num === 0) return "";

  let result = "";

  const hundred = Math.floor(num / 100);
  const remainder100 = num % 100;

  if (hundred > 0) {
    if (hundred === 1) {
      result += "cent";
    } else {
      result += UNITS[hundred] + " cent";
      if (remainder100 === 0) result += "s";
    }
  }

  if (remainder100 === 0) return result;
  if (result.length > 0) result += " ";

  if (remainder100 < 10) {
    result += UNITS[remainder100];
  } else if (remainder100 < 20) {
    result += TEENS[remainder100 - 10];
  } else {
    const ten = Math.floor(remainder100 / 10);
    const unit = remainder100 % 10;

    if (ten === 7) {
      result += "soixante";
      if (unit === 1) result += " et onze";
      else result += "-" + TEENS[unit];
    } else if (ten === 9) {
      result += "quatre-vingt";
      result += "-" + TEENS[unit];
    } else if (ten === 8) {
      result += "quatre-vingt";
      if (unit === 0) result += "s";
      else result += "-" + UNITS[unit];
    } else {
      result += TENS[ten];
      if (unit === 1) result += " et un";
      else if (unit > 1) result += "-" + UNITS[unit];
    }
  }

  return result;
}

export function convertAmountToWordsFr(amount: number, currencyName = "Dirhams", centsName = "Centimes"): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "";

  const intPart = Math.floor(Math.abs(amount));
  const centsPart = Math.round((Math.abs(amount) - intPart) * 100);

  if (intPart === 0 && centsPart === 0) {
    return `Zéro ${currencyName}`;
  }

  let text = "";

  const millions = Math.floor(intPart / 1_000_000);
  const remainderMillions = intPart % 1_000_000;

  if (millions > 0) {
    if (millions === 1) {
      text += "un million";
    } else {
      text += convertUnderThousand(millions) + " millions";
    }
  }

  const thousands = Math.floor(remainderMillions / 1_000);
  const units = remainderMillions % 1_000;

  if (thousands > 0) {
    if (text.length > 0) text += " ";
    if (thousands === 1) {
      text += "mille";
    } else {
      text += convertUnderThousand(thousands) + " mille";
    }
  }

  if (units > 0) {
    if (text.length > 0) text += " ";
    text += convertUnderThousand(units);
  }

  text = text.charAt(0).toUpperCase() + text.slice(1);
  text += ` ${currencyName}`;

  if (centsPart > 0) {
    const centsText = convertUnderThousand(centsPart);
    text += ` et ${centsText} ${centsName}`;
  }

  return text.trim();
}
