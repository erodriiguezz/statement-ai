export async function generateScheduleC(transactions: any[]) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content:
            "You are a CPA. Categorize transactions into IRS Schedule C categories. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify(transactions),
        },
      ],
    }),
  });

  const data = await res.json();

  return data;
}
