const puppeteer = require('puppeteer');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');
const data = require('./data.json');
const ThermalPrinterHelper = require('./ThermalPrinterHelper');
const { generateQrCode, generateBarCode } = require('./generator');
const pdfMerge = require('easy-pdf-merge');
const { PDFDocument } = require('pdf-lib');

// hbs.registerHelper('inc', function (value, options) {
// 	return parseInt(value) + 1;
// });

hbs.registerHelper('eq', function (a, b) {
	return a === b;
});

hbs.registerHelper('getDeliveryDate', function (options) {
	return options.data.root.delivery_date; // Access delivery_date from root context
});

hbs.registerHelper('getSiteCode', function (options) {
	return options.data.root.site_details.code; // Access delivery_date from root context
});

hbs.registerHelper('getGSTFlag', function (options) {
	console.log(options.data.root.gst.is_igst);
	return options.data.root.gst.is_igst; // Access is_igst from root context
});

const src = `data:image/jpeg;base64,${fs
	.readFileSync('./templates/images/reliance-icon.jpg')
	.toString('base64')}`;

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

async function MergePDF(pdf1, pdf2) {
	const cover = await PDFDocument.load(pdf1);
	const invoice = await PDFDocument.load(pdf2);

	// Create a new document
	const doc = await PDFDocument.create();

	// Add the cover to the new doc
	const [coverPage] = await doc.copyPages(cover, [0]);
	doc.addPage(coverPage);

	// Add individual content pages
	const contentPages = await doc.copyPages(invoice, invoice.getPageIndices());
	for (const page of contentPages) {
		doc.addPage(page);
	}

	// Write the PDF to a buffer
	return await doc.save();
}

// Function to generate PDF
const generatePDF = async () => {
	try {
		const browser = await puppeteer.launch({
			args: ['--no-sandbox'],
			devtools: true,
		});
		const page = await browser.newPage();
		const page_2 = await browser.newPage();

		const payloadJSON = data;
		// const groupedPayload = groupBySubtotalQuantity(payloadJSON.po_item);
		// payloadJSON.po_item = groupedPayload.po_item;
		payloadJSON.src = src;

		// Compile template with user and seller information
		const content_1 = await compile('index', payloadJSON);
		const content_2 = await compile('second', payloadJSON);

		// Add the formatted text and barcode to your content
		// const modifiedContent = content;

		await page.setContent(content_1);
		await page_2.setContent(content_2);

		// Generate PDF for each page
		const pdf1 = await page.pdf({
			// path: 'output_1.pdf',
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: false,
		});
		// Generate PDF for each page
		const pdf2 = await page_2.pdf({
			// path: 'output_2.pdf',
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
                        <div style=' font-size: 10pt; font-family:Helvetica, sans-serif; font-style: normal; font-weight: bold;'>Page No <span style="font-weight: normal;">:</span> <span style="font-weight: normal;" class="pageNumber"> </span></div>
                    </div>
                </div>
            `,
			footerTemplate: `
				${styleContent}
				<div class='invoice-code'>
				<div style='width:40%; font-size: 12px;'></div>
				</div>
			`,
		});
		console.log('PDF 2 buffer is printing', pdf1);
		console.log('PDF 2 buffer is printing', pdf2);

		// pdfMerge(
		// 	['./output_1.pdf', './output_2.pdf'],
		// 	path.join(__dirname, `./mergedFile.pdf`),
		// 	async (err) => {
		// 		if (err) return console.log(err);
		// 		console.log('Successfully merged!');
		// 	}
		// );

		const mergedPDFBuffer = await MergePDF(pdf1, pdf2);
		if (mergedPDFBuffer) {
			fs.writeFileSync('merged_output.pdf', mergedPDFBuffer);
			console.log(mergedPDFBuffer, 'PDF merge complete!');
			// Do whatever you need with the merged PDF buffer here
		} else {
			console.log('Failed to merge PDFs');
		}
		// await browser.close();
	} catch (e) {
		console.log(e);
	}
};

// Call the function to generate PDF
generatePDF();
