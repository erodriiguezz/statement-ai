from pdf2image import convert_from_path
import pytesseract
from openai import OpenAI
import json

client = OpenAI(api_key="***")

# STEP 1 — OCR
images = convert_from_path("./statements/boa.pdf")

full_text = ""

for image in images:
    page_text = pytesseract.image_to_string(image, config='--oem 3 --psm 6')
    full_text += page_text + "\n"

print("OCR DONE")

# STEP 2 — AI extraction
def extract_transactions(text):
    response = client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {
                "role": "system",
                "content": """
                You are a tax assistant.

                Extract transactions AND categorize them into IRS Schedule C categories.

                Categories:
                - Advertising
                - Car and Truck Expenses
                - Contract Labor
                - Legal and Professional Services
                - Office Expenses
                - Rent or Lease
                - Repairs and Maintenance
                - Supplies
                - Taxes and Licenses
                - Travel
                - Meals
                - Utilities
                - Other

                Rules:
                - Income should be labeled as "Income"
                - Only return valid JSON
                - Do NOT include explanations
                """
            },
            {
                "role": "user",
                "content": f"""
                Extract all transactions from this bank statement.

                Return JSON like:
                [
                  {{
                    "date": "YYYY-MM-DD",
                    "description": "...",
                    "amount": -45.23,
                    "category": "Supplies"
                  }}
                ]

                TEXT:
                {text[:15000]}
                """
            }
        ]
    )

    content = response.choices[0].message.content

    print("RAW AI RESPONSE:")
    print(content)

    content = content.strip()

    transactions = json.loads(content)

    return transactions


transactions = extract_transactions(full_text)

# STEP 3 — categorize
def categorize(desc):
    desc = desc.upper()

    if "FACEBOOK" in desc or "GOOGLE ADS" in desc:
        return "Advertising"
    elif "UBER" in desc or "DELTA" in desc:
        return "Travel"
    elif "RESTAURANT" in desc or "CAFE" in desc:
        return "Meals"
    elif "AMAZON" in desc:
        return "Supplies"
    else:
        return "Other"

for t in transactions:
    t["category"] = categorize(t["description"])

# STEP 4 — summarize
def summarize(transactions):
    summary = {
        "income": 0,
        "expenses": {}
    }

    for t in transactions:
        if t["amount"] > 0:
            summary["income"] += t["amount"]
        else:
            cat = t["category"]

            if cat not in summary["expenses"]:
                summary["expenses"][cat] = 0

            summary["expenses"][cat] += abs(t["amount"])

    return summary

summary = summarize(transactions)

print(summary)