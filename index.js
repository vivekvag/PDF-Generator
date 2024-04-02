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
	const groupedPayload = {};
	poItems.forEach((item) => {
		const groupKey = item.article_no.toString().substring(0, 9); // Get the first 4 characters of article_no
		const totalQuantity = parseFloat(item.quantity); // Convert quantity to a floating-point number
		if (!groupedPayload[groupKey]) {
			groupedPayload[groupKey] = {
				total_quantity: 0, // Initialize total quantity to 0
				items: [],
			};
		}
		groupedPayload[groupKey].items.push(item);
		groupedPayload[groupKey].total_quantity += totalQuantity; // Add quantity to total quantity
	});

	// Format total_quantity to have up to 3 decimal places and convert to string
	Object.keys(groupedPayload).forEach((key) => {
		groupedPayload[key].total_quantity = parseFloat(
			groupedPayload[key].total_quantity.toFixed(3)
		).toFixed(3);
	});

	// Sort items within each group based on the last number of the material description
	Object.keys(groupedPayload).forEach((key) => {
		groupedPayload[key].items.sort((a, b) => {
			const getLastNumber = (str) => parseInt(str.match(/\d+$/)[0]); // Extract last number from string
			return (
				getLastNumber(a.material_description) -
				getLastNumber(b.material_description)
			);
		});
	});

	const result = Object.keys(groupedPayload).map((key) => groupedPayload[key]);

	return { po_item: result };
}

// Function to generate PDF
const generatePDF = async () => {
	try {
		const browser = await puppeteer.launch({
			args: ['--no-sandbox'],
			devtools: true,
		});
		const page = await browser.newPage();

		const payloadJSON = data;
		const groupedPayload = groupBySubtotalQuantity(payloadJSON.po_item);
		payloadJSON.po_item = groupedPayload.po_item;

		// Compile template with user and seller information
		const content = await compile('index', payloadJSON);

		const barcodeMarkup = await generateBarCode({ value: '123456789' });

		// Add the formatted text and barcode to your content
		const modifiedContent = content;

		await page.setContent(modifiedContent);

		await page.addStyleTag({
			content: `
                body { margin-top: 1cm; }
                @page:first { margin-top: 0; }
            `,
		});

		let currentPage = 1; // Initialize the current page count

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
                    <div style='width:30%; font-size: 10pt; font-family:Helvetica, sans-serif; font-style: normal; font-weight: bold;'>PURCHASE ORDER</div>
                    <div style='width:30%; font-size: 10px; line-height:1.2;'>
                        <div style=' font-size: 10pt; font-family:Helvetica, sans-serif; font-style: normal; font-weight: bold;'>Number<span style="font-weight: normal;"> : ${payloadJSON.po_number}</span></div>
                        <div style=' font-size: 10pt; font-family:Helvetica, sans-serif; font-style: normal; font-weight: bold;'>Po Date<span style="font-weight: normal;"> : ${payloadJSON.po_date}</span></div>
                        <div style=' font-size: 10pt; font-family:Helvetica, sans-serif; font-style: normal; font-weight: bold;'>Page No <span style="font-weight: normal;">:</span> <span style="font-weight: normal;">${currentPage}</span></div>
                    </div>
                </div>
            `,
			footerTemplate: `
                ${styleContent}
                <div class='invoice-code'>
                <div style='width:40%; font-size: 12px;'></div>
                </div>
            `,
			// Event handler to update current page count
			pageRanges: '1', // First page only
			pageFunction: function () {
				currentPage++; // Increment the current page count for each new page
			},
		});

		console.log('PDF generated successfully');
		// await browser.close();
	} catch (e) {
		console.log(e);
	}
};

// Call the function to generate PDF
generatePDF();
