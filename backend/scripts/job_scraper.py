import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# =========== BRIGHTERMONDAY ===========

def scrape_brightermonday(pages=1):
    base_url = "https://www.brightermonday.co.ke/jobs?page={}"
    jobs = []
    for p in range(1, pages+1):
        resp = requests.get(base_url.format(p), headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(resp.text, 'html.parser')
        for article in soup.select('article.search-listing'):
            title_elem = article.select_one('h2 a')
            company_elem = article.select_one('.company')
            link = title_elem['href'] if title_elem else None
            jobs.append({
                "title": title_elem.get_text(strip=True) if title_elem else "",
                "company": company_elem.get_text(strip=True) if company_elem else "",
                "description": "",  # BrighterMonday often has a separate page; leave blank or follow link
                "url": link,
                "source": "BrighterMonday"
            })
    return jobs

# =========== FUZU (JavaScript rendered) ===========

def scrape_fuzu(pages=1):
    jobs = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for p_num in range(1, pages+1):
            page.goto(f"https://www.fuzu.com/kenya/jobs?page={p_num}")
            page.wait_for_selector(".list-item__title", timeout=60000)  # adjust if selector differs
            listings = page.query_selector_all(".list-item")
            for listing in listings:
                title = listing.query_selector(".list-item__title").inner_text() if listing.query_selector(".list-item__title") else ""
                company = listing.query_selector(".list-item__company").inner_text() if listing.query_selector(".list-item__company") else ""
                link = listing.query_selector("a").get_attribute("href") if listing.query_selector("a") else ""
                jobs.append({"title": title, "company": company, "description": "", "url": link, "source": "Fuzu"})
        browser.close()
    return jobs

# =========== MYJOBMAG ===========

def scrape_myjobmag(pages=1):
    jobs = []
    for p in range(1, pages+1):
        resp = requests.get(f"https://www.myjobmag.co.ke/jobs?page={p}", headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(resp.text, 'html.parser')
        for div in soup.select('.job-listing'):
            title_elem = div.select_one('h2 a')
            company_elem = div.select_one('.company')
            link = title_elem['href'] if title_elem else None
            jobs.append({
                "title": title_elem.get_text(strip=True) if title_elem else "",
                "company": company_elem.get_text(strip=True) if company_elem else "",
                "description": "",
                "url": link,
                "source": "MyJobMag"
            })
    return jobs

# =========== CAREER POINT KENYA ===========

def scrape_careerpointkenya(pages=1):
    jobs = []
    for p in range(1, pages+1):
        resp = requests.get(f"https://www.careerpointkenya.co.ke/page/{p}/?s=", headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(resp.text, 'html.parser')
        for article in soup.select('article'):
            title_elem = article.select_one('h2 a')
            link = title_elem['href'] if title_elem else None
            jobs.append({
                "title": title_elem.get_text(strip=True) if title_elem else "",
                "company": "",
                "description": "",
                "url": link,
                "source": "CareerPointKenya"
            })
    return jobs

# =========== CAREERJET ===========

def scrape_careerjet(pages=1):
    jobs = []
    for p in range(1, pages+1):
        resp = requests.get(f"https://www.careerjet.co.ke/jobs?page={p}", headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(resp.text, 'html.parser')
        for article in soup.select('article'):
            title_elem = article.select_one('a')
            link = title_elem['href'] if title_elem else None
            company_elem = article.select_one('.company')
            jobs.append({
                "title": title_elem.get_text(strip=True) if title_elem else "",
                "company": company_elem.get_text(strip=True) if company_elem else "",
                "description": "",
                "url": link,
                "source": "CareerJet"
            })
    return jobs

# =========== MASTER FUNCTION ===========

def get_all_jobs(pages=1):
    all_jobs = []
    all_jobs.extend(scrape_brightermonday(pages))
    all_jobs.extend(scrape_fuzu(pages))
    all_jobs.extend(scrape_myjobmag(pages))
    all_jobs.extend(scrape_careerpointkenya(pages))
    all_jobs.extend(scrape_careerjet(pages))
    return all_jobs


if __name__ == "__main__":
    jobs = get_all_jobs(pages=1)
    import json
    print(json.dumps(jobs))
