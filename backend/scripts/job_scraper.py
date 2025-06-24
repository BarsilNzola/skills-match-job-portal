import requests
import sys
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

def scrape_jobwebkenya(pages=1):
    jobs = []
    base_url = "https://jobwebkenya.com/jobs/page/{}/"
    for p in range(1, pages+1):
        resp = requests.get(base_url.format(p), headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(resp.text, 'html.parser')
        for article in soup.select('h3.job-list-title'):
            title_elem = article.select_one('a')
            link = title_elem['href'] if title_elem else None
            company_elem = article.find_previous('p', class_='job-list-company')
            jobs.append({
                "title": title_elem.get_text(strip=True) if title_elem else "",
                "company": company_elem.get_text(strip=True) if company_elem else "",
                "description": "",
                "url": link,
                "source": "JobWebKenya"
            })
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

def scrape_kenyamoja(pages=1):
    jobs = []
    base_url = "https://www.kenyamoja.com/jobs/page/{}/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    for p in range(1, pages + 1):
        resp = requests.get(base_url.format(p), headers=headers, timeout=10)
        if resp.status_code != 200:
            print(f"[WARN] KenyaMoja page {p} returned {resp.status_code}", file=sys.stderr)
            continue

        soup = BeautifulSoup(resp.text, 'html.parser')
        for card in soup.select('.job-item'):
            title_elem = card.select_one('.job-title a')
            company_elem = card.select_one('.job-company')
            link = title_elem['href'] if title_elem else None

            jobs.append({
                "title": title_elem.get_text(strip=True) if title_elem else "",
                "company": company_elem.get_text(strip=True) if company_elem else "",
                "description": "", 
                "url": link,
                "source": "KenyaMoja"
            })
    return jobs


# =========== MASTER FUNCTION ===========

def get_all_jobs(pages=1):
    all_jobs = []
    all_jobs.extend(scrape_brightermonday(pages))
    all_jobs.extend(scrape_jobwebkenya(pages))
    all_jobs.extend(scrape_myjobmag(pages))
    all_jobs.extend(scrape_careerpointkenya(pages))
    all_jobs.extend(scrape_kenyamoja(pages))
    return all_jobs


if __name__ == "__main__":
    jobs = get_all_jobs(pages=1)
    import json
    print(json.dumps(jobs))
