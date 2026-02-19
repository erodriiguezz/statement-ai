const MERCHANT_MAP: Record<string, string> = {
  amazon: "Amazon",
  amzn: "Amazon",
  aws: "Amazon Web Services",

  uber: "Uber",
  lyft: "Lyft",

  paypal: "PayPal",
  stripe: "Stripe",
  square: "Square",

  doordash: "DoorDash",
  grubhub: "Grubhub",

  google: "Google",
  microsoft: "Microsoft",

  shell: "Shell",
  chevron: "Chevron",
  exxon: "Exxon",

  home: "Home Depot",
  depot: "Home Depot",
  lowes: "Lowes",

  walmart: "Walmart",
  target: "Target",

  costco: "Costco",

  att: "AT&T",
  verizon: "Verizon",
  tmobile: "T-Mobile",
};

const NOISE_PATTERNS = [
  /\d{4,}/g,
  /card\s*\d+/gi,
  /acct\s*\d+/gi,
  /pos\s*/gi,
  /debit\s*/gi,
  /credit\s*/gi,
  /purchase\s*/gi,
  /#/g,
];

export function normalizeMerchant(raw: string): string {
  let text = raw.toLowerCase();

  for (const pattern of NOISE_PATTERNS) {
    text = text.replace(pattern, "");
  }

  text = text.replace(/[^a-z\s]/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  for (const key in MERCHANT_MAP) {
    if (text.includes(key)) {
      return MERCHANT_MAP[key];
    }
  }

  return text.split(" ").slice(0, 2).join(" ");
}
