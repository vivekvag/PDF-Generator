const puppeteer = require('puppeteer');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');
const data = require('./data.json');
const ThermalPrinterHelper = require('./ThermalPrinterHelper');
const { generateQrCode, generateBarCode } = require('./generator');

hbs.registerHelper('inc', function (value, options) {
	return parseInt(value) + 1;
});

// Function to compile Handlebars template
const compile = async function (template, data) {
	const filePath = path.join(__dirname, 'templates', `${template}.hbs`);
	const templateSource = await fs.promises.readFile(filePath, 'utf-8');
	return hbs.compile(templateSource)(data);
};

const styleContent = `
			<style>
				.invoice-code {
					display: flex;
					justify-content: space-between;
					align-items: center;
					width: 100%;
					min-height: 100px;
					font-size: 10px;
				}
			</style>
		`;

function groupBySubtotalQuantity(poItems) {
	const groupedPayload = [];
	let currentGroup = null;
	let grandTotalQuantity = 0;

	poItems.forEach((item) => {
		const articleNoPrefix = String(item.article_no).slice(0, 9);
		if (!currentGroup || currentGroup.prefix !== articleNoPrefix) {
			// Start a new group
			currentGroup = {
				prefix: articleNoPrefix,
				total_quantity: 0,
				items: [],
			};
			groupedPayload.push(currentGroup);
		}
		currentGroup.items.push(item);
		currentGroup.total_quantity += item.quantity;
		grandTotalQuantity += item.quantity; // Add quantity to grand total
	});

	return { po_item: groupedPayload, grand_total_quantity: grandTotalQuantity };
}

// Function to generate PDF
const generatePDF = async () => {
	try {
		const browser = await puppeteer.launch({
			args: ['--no-sandbox'],
			devtools: true,
		});
		const page = await browser.newPage();

		const payloadJSON = data?.payload;
		const groupedPayload = groupBySubtotalQuantity(payloadJSON.po_item);
		payloadJSON.po_item = groupedPayload.po_item;
		payloadJSON.grand_total_quantity = groupedPayload.grand_total_quantity;

		// Compile template with user and seller information
		const content = await compile('index', payloadJSON);

		const barcodeMarkup = await generateBarCode({ value: '123456789' });

		// Add the formatted text and barcode to your content
		const modifiedContent = content + barcodeMarkup;

		await page.setContent(modifiedContent);

		// Generate PDF for each page
		await page.pdf({
			path: 'output.pdf',
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: true,
			margin: {
				top: '100px',
			},
			headerTemplate: `
				${styleContent}
				<div class='invoice-code'>
					<div style='width:40%; font-size: 10px;'></div>
					<div style='width:30%; font-size: 10px;'>PURCHASE ORDER</div>
					<div style='width:30%; font-size: 10px;'>
						<div style='font-size: 10px;'>Number : ${payloadJSON.po_number}</div>
						<div style='font-size: 10px;'>Po Date : ${payloadJSON.po_date}</div>
						<div style='font-size: 10px;'>Page : <span class="pageNumber"></span></div>
					</div>
				</div>
			`,
		});

		console.log('PDF generated successfully');
		// await browser.close();
	} catch (e) {
		console.log(e);
	}
};

// Call the function to generate PDF
generatePDF();
