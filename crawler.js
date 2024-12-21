import fs from "fs";
import path from "path";
import axios from "axios";

/**
 * Removes hash fragments from URLs
 * @param {string} url - The URL to clean
 * @returns {string} - URL without hash fragment
 */
const cleanUrl = (url) => {
	return url.split("#")[0];
};

/**
 * Simple slugify function to turn URLs into valid filenames.
 * @param {string} url - The URL to convert.
 * @returns {string} - A string safe to use as a filename.
 */
const slugify = (url) => {
	return cleanUrl(url)
		.replace(/https?:\/\//, "")
		.replace(/[^\w.\/-]/g, "_")
		.replace(/\//g, "_");
};

/**
 * Extracts all URLs from plaintext using a simple regex.
 * Modify or improve logic as needed for your docs site.
 * @param {string} text - The raw text from which to extract URLs.
 * @returns {string[]} - Array of extracted URLs.
 */
const extractLinksFromPlainText = (text) => {
	// Basic pattern to match links; refine as necessary.
	const linkRegex = /(https?:\/\/[^\s]+)/g;
	const links = [];
	let match;
	while ((match = linkRegex.exec(text)) !== null) {
		links.push(match[0]);
	}
	return links;
};

/**
 * Process a single URL and save its content
 * @param {string} baseURL - Base URL of the docs
 * @param {string} currentURL - Current URL to process
 * @param {object} headers - Request headers
 * @param {string} outputDir - Output directory
 * @returns {Promise<string[]>} - Array of found links
 */
const processUrl = async (baseURL, currentURL, headers, outputDir) => {
	const jinaURL = `https://r.jina.ai/${currentURL}`;
	const filename = slugify(currentURL) + ".txt";
	const filePath = path.join(outputDir, filename);

	// Skip if file already exists
	if (fs.existsSync(filePath)) {
		console.log(`Skipping ${currentURL} - already processed`);
		const content = fs.readFileSync(filePath, "utf-8");
		return extractLinksFromPlainText(content);
	}

	try {
		console.log(`Fetching: ${jinaURL}`);
		const response = await axios.get(jinaURL, {
			timeout: 20000,
			headers,
		});
		const textData = response.data;

		fs.writeFileSync(filePath, textData, "utf-8");
		console.log(`Saved: ${outputDir}/${filename}`);

		return extractLinksFromPlainText(textData);
	} catch (err) {
		console.error(`Error fetching ${currentURL}:`, err.message);
		return [];
	}
};

/**
 * Process URLs in batches
 * @param {string[]} urls - Array of URLs to process
 * @param {string} baseURL - Base URL of the docs
 * @param {object} headers - Request headers
 * @param {string} outputDir - Output directory
 * @param {number} batchSize - Size of each batch
 * @returns {Promise<Set<string>>} - Set of all found links
 */
const processBatch = async (urls, baseURL, headers, outputDir, batchSize) => {
	const allFoundLinks = new Set();

	for (let i = 0; i < urls.length; i += batchSize) {
		const batch = urls.slice(i, i + batchSize);
		const promises = batch.map((url) =>
			processUrl(baseURL, url, headers, outputDir)
		);

		const results = await Promise.all(promises);
		results.flat().forEach((link) => {
			if (link.includes(baseURL)) {
				allFoundLinks.add(link);
			}
		});
	}

	return allFoundLinks;
};

/**
 * Concatenate all text files in the output directory into a single file
 * @param {string} outputDir - Directory containing the text files
 */
const concatenateFiles = (outputDir) => {
	const files = fs
		.readdirSync(outputDir)
		.filter((file) => file.endsWith(".txt") && file !== "_totalcrawl.txt");

	const totalContent = files
		.map((file) => {
			const content = fs.readFileSync(path.join(outputDir, file), "utf-8");
			return `=== ${file} ===\n\n${content}\n\n`;
		})
		.join("\n");

	fs.writeFileSync(
		path.join(outputDir, "_totalcrawl.txt"),
		totalContent,
		"utf-8"
	);
};

/**
 * Recursively crawls the docs site, using Jina converter endpoint to fetch plain text,
 * then extracts links and crawls them if they're within the same domain.
 * @param {string} baseURL - The original docs domain or subdomain (e.g., https://docs.example.com).
 * @param {Set<string>} toVisit - Set of URLs to visit.
 * @param {Set<string>} visited - Set of visited URLs.
 * @param {string} [jinaApiKey] - Optional Jina API key for authentication.
 */
const crawlDocs = async (baseURL, toVisit, visited, jinaApiKey) => {
	const outputDir = slugify(baseURL);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
	}

	const headers = jinaApiKey ? { Authorization: `Bearer ${jinaApiKey}` } : {};
	const batchSize = jinaApiKey ? 5 : 1;

	while (toVisit.size > 0) {
		const currentBatch = Array.from(toVisit).slice(0, 50); // Process max 50 URLs at a time
		currentBatch.forEach((url) => toVisit.delete(url));
		currentBatch.forEach((url) => visited.add(url));

		const newLinks = await processBatch(
			currentBatch,
			baseURL,
			headers,
			outputDir,
			batchSize
		);

		// Add new unvisited links to toVisit
		for (const link of newLinks) {
			const cleanedLink = cleanUrl(link);
			if (!visited.has(cleanedLink)) {
				toVisit.add(cleanedLink);
			}
		}
	}

	// Concatenate all files into one
	concatenateFiles(outputDir);

	// Print success message in green
	console.log(
		"\x1b[32m%s\x1b[0m",
		`
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║           Crawling Complete!          ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    
    All documents have been successfully crawled and saved.
    Check ${outputDir}/_totalcrawl.txt for the combined output.
    `
	);
};

/**
 * Entry point of the script.
 * Usage: node crawler.js <docsDomainOrURL> [jinaApiKey]
 */
const main = async () => {
	const args = process.argv.slice(2);
	if (args.length < 1) {
		console.log("Usage: node crawler.js <docsDomainOrURL> [jinaApiKey]");
		process.exit(1);
	}

	const docsURL = cleanUrl(args[0]);
	const jinaApiKey = args[1]; // Optional API key
	const toVisit = new Set([docsURL]);
	const visited = new Set();

	await crawlDocs(docsURL, toVisit, visited, jinaApiKey);
};

main();
