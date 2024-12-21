# Docs for LLMs

- Ever wanted to convert one of those docs sites into text you can just shove into your llm so its up to date on the API?
- This is the tool you have been looking for
- Contributions welcome

## How to use

1. Clone repo
2. Run:

```bash
npm i
node crawler.js <docs-url> [jina-api-key]  # API key is optional
```

### Examples

```bash
# Crawl entire docs site without API key
node crawler.js https://docs.mem0.ai/

# Crawl with Jina API key
node crawler.js https://docs.mem0.ai/ jina_your_api_key_here

# Crawl specific section only
node crawler.js https://docs.mem0.ai/api-reference/overview  # Only crawls the API reference section
```

### Features

- **Targeted Crawling**: You can crawl specific sections of documentation by providing the exact URL of that section. For example, if you only want to crawl the API reference section, use the URL that points to that specific section. The crawler will only process pages under that URL path.

- **API Key**: The Jina API key is optional. If provided:

  - Requests are processed in batches of 5 for faster crawling
  - Authentication header is included with requests
    If not provided, requests are processed one at a time without authentication.

- **Resume Capability**: If a crawl is interrupted, you can run the script again with the same parameters. It will skip already processed pages and continue from where it left off.

- **Combined Output**: After crawling completes, all individual text files are combined into a single `_totalcrawl.txt` file in the output directory for easier use.

### Important Notes

- **Rate Limiting**: Don't do multiple sites in one go, otherwise Jina will start throwing 429s (too many requests).
- **Resilient**: Individual request failures won't stop the entire crawl process.

**Thanks to Jina.ai for their free API!**
