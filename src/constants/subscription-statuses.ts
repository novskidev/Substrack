export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
  { value: "trial", label: "Trial" },
  { value: "expired", label: "Expired" },
] as const;

export type SubscriptionStatusValue =
  (typeof SUBSCRIPTION_STATUS_OPTIONS)[number]["value"];

export const SUBSCRIPTION_STATUS_VALUES: SubscriptionStatusValue[] =
  SUBSCRIPTION_STATUS_OPTIONS.map((option) => option.value);

export const CHARGEABLE_SUBSCRIPTION_STATUSES: SubscriptionStatusValue[] = [
  "active",
  "trial",
];

export const SUBSCRIPTION_STATUS_LABELS = Object.fromEntries(
  SUBSCRIPTION_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<SubscriptionStatusValue, string>;

export const SUBSCRIPTION_STATUS_TRANSITIONS: Record<
  SubscriptionStatusValue,
  SubscriptionStatusValue[]
> = {
  trial: ["active", "cancelled"],
  active: ["paused", "cancelled", "expired"],
  paused: ["cancelled", "expired"],
  cancelled: ["expired"],
  expired: ["cancelled"],
};

export const canTransitionSubscriptionStatus = (
  current: SubscriptionStatusValue,
  next: SubscriptionStatusValue
) =>
  current === next ||
  SUBSCRIPTION_STATUS_TRANSITIONS[current]?.includes(next) === true;

export const getPermittedStatusOptions = (
  current?: SubscriptionStatusValue
): SubscriptionStatusValue[] => {
  if (!current) {
    return SUBSCRIPTION_STATUS_VALUES;
  }

  const nextStatuses = SUBSCRIPTION_STATUS_TRANSITIONS[current] ?? [];
  return [current, ...nextStatuses];
};

export const isValidSubscriptionStatus = (
  value: string
): value is SubscriptionStatusValue =>
  SUBSCRIPTION_STATUS_VALUES.includes(value as SubscriptionStatusValue);
