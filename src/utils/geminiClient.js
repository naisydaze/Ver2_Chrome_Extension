const GEMINI_API_KEY = "AIzaSyAZSpvJgaCyNc5DPMYh7WD0WCrx7VPZxXI";

export async function fetchQuote(category) {
  const prompt = `Give me a short and impactful quote about ${category.toLowerCase()}.  Ensure it's different from any previous quotes you've provided for this category. Return as "quote" - author format.`;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await res.json();

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const [quote, author] = content.split("—").map((s) => s.trim());

  return {
    quote: quote || content,
    author: author || "Unknown",
    category
  };
}
