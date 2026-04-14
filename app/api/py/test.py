from pdf2image import convert_from_path
import pytesseract

from openai import OpenAI

images = convert_from_path("./statements/boa.pdf")

text = ""

for i, image in enumerate(images):
    text = pytesseract.image_to_string(image)
    text += text + "\n"

print(text)

client = OpenAI()

def extract_transactions(text):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Extract transactions from bank statements."
            },
            {
                "role": "user",
                "content": f"""
                    Extract all transactions from this bank statement.

                    Return JSON like:
                    [
                        {{ "date": "YYYY-MM-DD", "description": "...", "amount": -45.23 }}
                    ]

                    TEXT:
                    {text}
                """
            }
        ]
    )

    return response.choices[0].message.content


def categorize(desc):
    desc = desc.upper()

    if "FACEBOOK" in desc or "GOOGLE ADS" in desc:
        return "Advertising"
    elif "UBBER" in desc or "DELTA" in desc:
        return "Travel"
    elif "RESTAURANT" in desc or "CAFE" in desc:
        return "Meals"
    elif "AMAZON" in desc:
        return "Supplies"
    else:
        return "Other"
    
def summarize(transactions):
    summary = {}

    for t in transactions:
        if t["ammount"] < 0: 
            category = t["category"]

            if category not in summary:
                summary[category] = 0
            
            summary[category] += abs(t["ammount"])
    
    return summary

