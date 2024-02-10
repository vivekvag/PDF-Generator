const puppeteer = require('puppeteer');
const fs = require('fs');

// XML content (replace this with your XML content or read from file)
const xmlContent = `
<root>
    <title>Hello World</title>
    <content>This is a sample PDF generated from XML using Puppeteer</content>
</root>
`;

async function generatePDFFromXML(xmlContent) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	// Load XML content into a data URL and set the content in the page
	const dataUrl = `data:text/xml,${encodeURIComponent(xmlContent)}`;
	await page.goto(dataUrl, { waitUntil: 'networkidle0' });

	// Generate PDF
	const pdfBuffer = await page.pdf();

	// Close browser
	await browser.close();

	return pdfBuffer;
}

// Generate PDF from XML content
generatePDFFromXML(xmlContent)
	.then((pdfBuffer) => {
		// Write PDF buffer to a file
		fs.writeFileSync('output.pdf', pdfBuffer);
		console.log('PDF generated successfully.');
	})
	.catch((error) => {
		console.error('Error generating PDF:', error);
	});
