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
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    for page_num in range(1, pages + 1):
        try:
            # Get the listings page
            list_url = f"https://jobwebkenya.com/jobs/page/{page_num}/"
            resp = requests.get(list_url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            # Find all job listings
            for job in soup.select('li.job'):
                try:
                    title_elem = job.select_one('div#titlo a')
                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    relative_url = title_elem['href']
                    job_url = relative_url if relative_url.startswith('http') else f"https://jobwebkenya.com{relative_url}"
                    
                    # Extract company name
                    company_elem = job.select_one('div.grids')
                    company = ""
                    if company_elem:
                        company_text = company_elem.get_text(strip=True)
                        if "Company:" in company_text:
                            company = company_text.split("Company:")[1].split("\n")[0].strip()

                    # Now visit the job detail page for full description
                    try:
                        job_resp = requests.get(job_url, headers=headers, timeout=15)
                        job_resp.raise_for_status()
                        job_soup = BeautifulSoup(job_resp.text, 'html.parser')

                        # Extract the main job content
                        description = ""
                        job_content = job_soup.select_one('div.job-details')
                        
                        if job_content:
                            # Remove unwanted elements (ads, share buttons, etc.)
                            for unwanted in job_content.select('div.google-auto-placed, div.sharedaddy, script, style, iframe'):
                                unwanted.decompose()
                            
                            # Get clean text while preserving structure
                            description_lines = []
                            for element in job_content.find_all(['p', 'ul', 'ol', 'h2', 'h3', 'h4']):
                                if element.name == 'p':
                                    text = element.get_text(' ', strip=True)
                                    if text and len(text) > 10:  # Skip short/empty paragraphs
                                        description_lines.append(text)
                                elif element.name in ['ul', 'ol']:
                                    for li in element.find_all('li', recursive=False):
                                        description_lines.append(f"• {li.get_text(' ', strip=True)}")
                                elif element.name in ['h2', 'h3', 'h4']:
                                    text = element.get_text(strip=True)
                                    if text:
                                        description_lines.append(f"\n{text.upper()}\n")

                            description = "\n".join(description_lines).strip()
                    
                    except Exception as e:
                        print(f"[JobWebKenya] Error scraping job details {job_url}: {str(e)}", file=sys.stderr)
                        description = ""

                    jobs.append({
                        "title": title,
                        "company": company,
                        "description": description,
                        "url": job_url,
                        "source": "JobWebKenya"
                    })

                    # Be polite - delay between requests
                    time.sleep(1.5)

                except Exception as e:
                    print(f"[JobWebKenya] Error processing job listing: {str(e)}", file=sys.stderr)
                    continue

            # Delay between pages
            time.sleep(2)

        except requests.RequestException as e:
            print(f"[JobWebKenya] Request failed on page {page_num}: {str(e)}", file=sys.stderr)
            continue
        except Exception as e:
            print(f"[JobWebKenya] Unexpected error on page {page_num}: {str(e)}", file=sys.stderr)
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
            print(f"[MyJobMag] Scraping page {page_num}", file=sys.stderr)
            
            resp = requests.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            job_listings = soup.select('li.job-list-li')
            
            if not job_listings:
                print(f"[MyJobMag] No listings found on page {page_num}", file=sys.stderr)
                continue

            for job in job_listings:
                try:
                    title_elem = job.select_one('h2 a')
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    relative_url = title_elem['href']
                    url = "https://www.myjobmag.co.ke" + relative_url
                    company_elem = job.select_one('li.job-logo a img')
                    company = company_elem['title'].replace(' logo', '') if company_elem else ""
                    
                    # Now visit the job detail page to get full description
                    try:
                        job_resp = requests.get(url, headers=headers, timeout=10)
                        job_resp.raise_for_status()
                        job_soup = BeautifulSoup(job_resp.text, 'html.parser')
                        
                        # Extract full description from job details page
                        full_desc_elem = job_soup.select_one('div.job-details')
                        description = full_desc_elem.get_text(strip=True) if full_desc_elem else ""
                        
                        # Extract additional details if available
                        details_elems = job_soup.select('div.job-details-content ul li')
                        details = "\n".join([elem.get_text(strip=True) for elem in details_elems if elem])
                        
                        full_description = f"{description}\n\n{details}".strip()
                    except Exception as e:
                        print(f"[MyJobMag] Error scraping job details {url}: {e}", file=sys.stderr)
                        full_description = ""

                    jobs.append({
                        "title": title,
                        "company": company,
                        "description": full_description,
                        "url": url,
                        "source": "MyJobMag"
                    })
                    
                    # Be polite - add delay between job detail requests
                    time.sleep(1)

                except Exception as e:
                    print(f"[MyJobMag] Error processing a job: {e}", file=sys.stderr)
                    continue

            # Add delay between pages
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
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    for page_num in range(1, pages + 1):
        try:
            # Get job listings page
            list_url = f"https://www.careerpointkenya.co.ke/page/{page_num}/?s="
            resp = requests.get(list_url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            for article in soup.select('article'):
                title_elem = article.select_one('h2 a')
                if not title_elem:
                    continue

                job_url = title_elem['href']
                title = title_elem.get_text(strip=True)

                # Now visit the job detail page
                try:
                    job_resp = requests.get(job_url, headers=headers, timeout=15)
                    job_resp.raise_for_status()
                    job_soup = BeautifulSoup(job_resp.text, 'html.parser')

                    # Extract main content from the job detail page
                    content_div = job_soup.select_one('div.kt-inside-inner-col')
                    description = ""

                    if content_div:
                        # Remove unwanted elements (ads, related links)
                        for unwanted in content_div.select('a, script, style, iframe, noscript'):
                            unwanted.decompose()

                        # Get clean text while preserving some structure
                        description_lines = []
                        for element in content_div.find_all(['p', 'ul', 'ol', 'h2', 'h3', 'h4']):
                            if element.name == 'p':
                                text = element.get_text(' ', strip=True)
                                if text and len(text) > 10:  # Skip short/empty paragraphs
                                    description_lines.append(text)
                            elif element.name in ['ul', 'ol']:
                                for li in element.find_all('li', recursive=False):
                                    description_lines.append(f"• {li.get_text(' ', strip=True)}")
                            elif element.name in ['h2', 'h3', 'h4']:
                                text = element.get_text(strip=True)
                                if text:
                                    description_lines.append(f"\n{text.upper()}\n")

                        description = "\n".join(description_lines).strip()

                except Exception as e:
                    print(f"[CareerPoint] Error scraping {job_url}: {str(e)}", file=sys.stderr)
                    description = ""

                jobs.append({
                    "title": title,
                    "company": "",  # Still not available in the structure
                    "description": description,
                    "url": job_url,
                    "source": "CareerPointKenya"
                })

                # Be polite - delay between requests
                time.sleep(1.5)

        except requests.RequestException as e:
            print(f"[CareerPoint] Request failed on page {page_num}: {str(e)}", file=sys.stderr)
            continue
        except Exception as e:
            print(f"[CareerPoint] Unexpected error on page {page_num}: {str(e)}", file=sys.stderr)
            continue

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
