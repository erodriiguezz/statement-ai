export type ExpenseCategory =
  | "Advertising"
  | "Office Supplies"
  | "Software"
  | "Meals"
  | "Travel"
  | "Utilities"
  | "Fuel"
  | "Equipment"
  | "Contractors"
  | "Other";

const CATEGORY_RULES: Record<string, ExpenseCategory> = {
  "Amazon Web Services": "Software",
  Amazon: "Office Supplies",

  Uber: "Travel",
  Lyft: "Travel",

  Shell: "Fuel",
  Chevron: "Fuel",
  Exxon: "Fuel",

  "Home Depot": "Equipment",
  Lowes: "Equipment",

  Google: "Advertising",
  Facebook: "Advertising",

  Microsoft: "Software",
};

export function classifyMerchant(merchant: string): ExpenseCategory {
  if (CATEGORY_RULES[merchant]) {
    return CATEGORY_RULES[merchant];
  }

  return "Other";
}

export function classificationConfidence(
  merchant: string,
  category: string,
): number {
  if (category === "Other") return 0.3;

  return 0.85;
}
