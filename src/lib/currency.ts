const localeOverrides: Record<string, string> = {
  IDR: "id-ID",
  JPY: "ja-JP",
  CNY: "zh-CN",
  KRW: "ko-KR",
  THB: "th-TH",
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getCacheKey(currencyCode: string, locale: string | undefined) {
  return `${locale ?? "default"}|${currencyCode}`;
}

function resolveLocale(currencyCode: string) {
  return localeOverrides[currencyCode] ?? undefined;
}

function getCurrencyFormatterInternal(currencyCode: string) {
  const uppercaseCode = currencyCode.toUpperCase();
  const locale = resolveLocale(uppercaseCode);
  const cacheKey = getCacheKey(uppercaseCode, locale);

  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: uppercaseCode,
      })
    );
  }

  return formatterCache.get(cacheKey)!;
}

export function formatCurrency(value: number, currencyCode = "USD") {
  if (!Number.isFinite(value)) {
    return value.toString();
  }

  return getCurrencyFormatterInternal(currencyCode).format(value);
}

export function getCurrencyFormatter(currencyCode = "USD") {
  return getCurrencyFormatterInternal(currencyCode);
}
