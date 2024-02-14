const puppeteer = require('puppeteer');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');
const data = require('./data.json');
const ThermalPrinterHelper = require('./ThermalPrinterHelper');
const { generateQrCode, generateBarCode } = require('./generator');

// Function to compile Handlebars template
const compile = async function (template, data) {
	const filePath = path.join(__dirname, 'templates', `${template}.hbs`);
	const templateSource = await fs.promises.readFile(filePath, 'utf-8');
	return hbs.compile(templateSource)(data);
};

// Function to generate PDF
const generatePDF = async () => {
	try {
		const browser = await puppeteer.launch({
			args: ['--no-sandbox'],
			devtools: true,
		});
		const page = await browser.newPage();

		// Compile template with user and seller information
		const content = await compile('index', data);

		const formattedText = ThermalPrinterHelper.getBoldText(
			'Hello, World!',
			true
		);

		// Generate QR code
		const qrCodeMarkup = await generateQrCode({
			qr_data: 'https://example.com',
		});

		const barcodeMarkup = await generateBarCode({ value: '123456789' });

		// Add the formatted text and barcode to your content
		const modifiedContent = content + formattedText + barcodeMarkup;

		await page.setContent(modifiedContent);

		// await page.setContent(content);
		await page.pdf({
			path: 'output.pdf',
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: true,
		});

		console.log('PDF generated successfully');
		// await browser.close();
	} catch (e) {
		console.log(e);
	}
};

// Call the function to generate PDF
generatePDF();
