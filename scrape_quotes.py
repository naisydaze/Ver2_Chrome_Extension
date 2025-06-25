import requests
from bs4 import BeautifulSoup
import json

categories = {
    "wisdom": "https://quotes.toscrape.com/tag/wisdom/",
    "failure": "https://quotes.toscrape.com/tag/failure/",
    "success": "https://quotes.toscrape.com/tag/success/"
}

all_quotes = []

for category, url in categories.items():
    print(f"Scraping {category}...")
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")

    quote_divs = soup.select('div.quote')
    for div in quote_divs:
        quote = div.select_one('span.text').text.strip('“”')
        author = div.select_one('small.author').text.strip()
        all_quotes.append({
            "quote": quote,
            "author": author,
            "category": category
        })

with open("quotes.json", "w", encoding="utf-8") as f:
    json.dump(all_quotes, f, indent=2, ensure_ascii=False)

print(f"✅ Done. Saved {len(all_quotes)} quotes.")
