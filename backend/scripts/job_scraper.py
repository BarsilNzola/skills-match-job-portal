import requests
import sys
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# =========== BRIGHTERMONDAY ===========


def scrape_brightermonday(pages=1):
    jobs = []
    with sync_playwright() as p:
        # Configure browser to look more like a regular user
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        )
        
        # Create a new context with custom user agent
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            viewport={'width': 1366, 'height': 768}
        )
        
        page = context.new_page()

        for page_num in range(1, pages + 1):
            url = f"https://www.brightermonday.co.ke/jobs?page={page_num}"
            print(f"[brightermonday] Scraping {url}")
            
            try:
                # Use 'domcontentloaded' instead of 'networkidle' for faster loading
                page.goto(url, wait_until='domcontentloaded', timeout=60000)
                
                # Wait for either the job listings or the "no results" message
                try:
                    page.wait_for_selector(
                        'a[data-cy="listing-title-link"], div[data-cy="no-results-text"]',
                        timeout=20000
                    )
                except PlaywrightTimeoutError:
                    print(f"[brightermonday] No job listings found on page {page_num}")
                    continue

                # Check if there are no results
                no_results = page.query_selector('div[data-cy="no-results-text"]')
                if no_results:
                    print(f"[brightermonday] No more jobs found on page {page_num}")
                    break

                # Get all job listings
                listings = page.query_selector_all('div[data-cy="listing-card"]')
                print(f"[brightermonday] Found {len(listings)} listings on page {page_num}")

                for listing in listings:
                    try:
                        title_elem = listing.query_selector('a[data-cy="listing-title-link"]')
                        company_elem = listing.query_selector('span[data-cy="listing-company"]')
                        location_elem = listing.query_selector('span[data-cy="listing-location"]')
                        
                        title = title_elem.inner_text().strip() if title_elem else ""
                        company = company_elem.inner_text().strip() if company_elem else ""
                        href = title_elem.get_attribute('href') if title_elem else ""
                        
                        full_url = href if href.startswith('http') else f"https://www.brightermonday.co.ke{href}"

                        jobs.append({
                            "title": title,
                            "company": company,
                            "description": "",
                            "url": full_url,
                            "source": "BrighterMonday",
                        })
                    except Exception as e:
                        print(f"[brightermonday] Error processing listing: {str(e)}")
                        continue

                # Add a small delay between pages
                page.wait_for_timeout(2000)

            except PlaywrightTimeoutError:
                print(f"[brightermonday] Timeout on page {page_num}")
                continue
            except Exception as e:
                print(f"[brightermonday] Error on page {page_num}: {str(e)}")
                continue

        # Close the context and browser
        context.close()
        browser.close()
    
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
