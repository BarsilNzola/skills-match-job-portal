import time
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
            print(f"[brightermonday] Scraping {url}", file=sys.stderr)
            
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
                    print(f"[brightermonday] No job listings found on page {page_num}", file=sys.stderr)
                    continue

                # Check if there are no results
                no_results = page.query_selector('div[data-cy="no-results-text"]')
                if no_results:
                    print(f"[brightermonday] No more jobs found on page {page_num}", file=sys.stderr)
                    break

                # Get all job listings
                listings = page.query_selector_all('div[data-cy="listing-card"]')
                print(f"[brightermonday] Found {len(listings)} listings on page {page_num}", file=sys.stderr)

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
                        print(f"[brightermonday] Error processing listing: {str(e)}", file=sys.stderr)
                        continue

                # Add a small delay between pages
                page.wait_for_timeout(2000)

            except PlaywrightTimeoutError:
                print(f"[brightermonday] Timeout on page {page_num}", file=sys.stderr)
                continue
            except Exception as e:
                print(f"[brightermonday] Error on page {page_num}: {str(e)}", file=sys.stderr)
                continue

        # Close the context and browser
        context.close()
        browser.close()
    
    return jobs

# =========== FUZU (JavaScript rendered) ===========

def scrape_jobwebkenya(pages=1):
    jobs = []
    base_url = "https://jobwebkenya.com/jobs/page/{}/"
    headers = {'User-Agent': 'Mozilla/5.0'}

    for p in range(1, pages + 1):
        try:
            resp = requests.get(base_url.format(p), headers=headers, timeout=10)
            resp.raise_for_status()  # Check for HTTP errors
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Updated selector: Each job is inside <li class="job">
            job_listings = soup.select('li.job')
            
            if not job_listings:
                print(f"[JobWebKenya] No listings found on page {p}", file=sys.stderr)
                continue

            for job in job_listings:
                try:
                    # Extract title and URL
                    title_elem = job.select_one('div#titlo a')
                    if not title_elem:
                        continue  # Skip if no title found
                    
                    title = title_elem.get_text(strip=True)
                    url = title_elem['href']
                    
                    # Extract company name (found in div.grids)
                    company_elem = job.select_one('div.grids')
                    company = ""
                    if company_elem:
                        company_text = company_elem.get_text(strip=True)
                        if "Company:" in company_text:
                            company = company_text.split("Company:")[1].split("\n")[0].strip()
                    
                    jobs.append({
                        "title": title,
                        "company": company,
                        "description": "",
                        "url": url,
                        "source": "JobWebKenya"
                    })
                except Exception as e:
                    print(f"[JobWebKenya] Error processing a job: {e}", file=sys.stderr)
                    continue

        except requests.RequestException as e:
            print(f"[JobWebKenya] Request failed on page {p}: {e}", file=sys.stderr)
            continue
        except Exception as e:
            print(f"[JobWebKenya] Unexpected error on page {p}: {e}", file=sys.stderr)
            continue

    return jobs

# =========== MYJOBMAG ===========

def scrape_myjobmag(pages=1):
    jobs = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    for page_num in range(1, pages + 1):
        try:
            url = f"https://www.myjobmag.co.ke/jobs?page={page_num}"
            print(f"[MyJobMag] Scraping page {page_num}")
            
            resp = requests.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            # Each job listing is in <li class="job-list-li">
            job_listings = soup.select('li.job-list-li')
            
            if not job_listings:
                print(f"[MyJobMag] No listings found on page {page_num}", file=sys.stderr)
                continue

            for job in job_listings:
                try:
                    # Extract title and URL
                    title_elem = job.select_one('h2 a')
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    url = "https://www.myjobmag.co.ke" + title_elem['href']  # Relative URLs need base

                    # Extract company name (from logo alt text or link)
                    company_elem = job.select_one('li.job-logo a img')
                    company = company_elem['title'].replace(' logo', '') if company_elem else ""
                    
                    # Extract description
                    desc_elem = job.select_one('li.job-desc')
                    description = desc_elem.get_text(strip=True) if desc_elem else ""

                    jobs.append({
                        "title": title,
                        "company": company,
                        "description": description,
                        "url": url,
                        "source": "MyJobMag"
                    })
                except Exception as e:
                    print(f"[MyJobMag] Error processing a job: {e}", file=sys.stderr)
                    continue

            # Be polite - add delay between pages
            time.sleep(2)

        except requests.RequestException as e:
            print(f"[MyJobMag] Request failed on page {page_num}: {e}", file=sys.stderr)
            continue
        except Exception as e:
            print(f"[MyJobMag] Unexpected error on page {page_num}: {e}", file=sys.stderr)
            continue

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


# =========== MASTER FUNCTION ===========

def get_all_jobs(pages=1):
    all_jobs = []
    all_jobs.extend(scrape_brightermonday(pages))
    all_jobs.extend(scrape_jobwebkenya(pages))
    all_jobs.extend(scrape_myjobmag(pages))
    all_jobs.extend(scrape_careerpointkenya(pages))
    return all_jobs


if __name__ == "__main__":
    jobs = get_all_jobs(pages=1)
    import json
    print(json.dumps(jobs))
