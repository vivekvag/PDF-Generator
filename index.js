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

const imagePath = path.join(__dirname, 'templates', 'images', 'reliance-icon.jpg');
const pdfLogo = `data:image/jpeg;base64,${fs.readFileSync(imagePath).toString('base64')}`;

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

// Function to generate PDF
const generatePDF = async () => {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      devtools: true
    });
    const page = await browser.newPage();

    const payloadJSON = data;

    console.log({ payloadJSON: JSON.stringify(payloadJSON) });

    const barcodeMarkup = await generateBarCode({
      value: payloadJSON.barcode_number
    });

    const qrCodeMarkup = await generateQrCode({
      qr_data: payloadJSON.signed_qr_code
    });
    console.log(payloadJSON.signed_qr_code);
    payloadJSON.barcodeMarkup = barcodeMarkup;
    payloadJSON.qrCodeMarkup = qrCodeMarkup;
    payloadJSON.pdfLogo = pdfLogo;

    // console.log({ pdfLogo });

    const content = await compile('index', payloadJSON);

    // Add the formatted text and barcode to your content
    const modifiedContent = content;

    await page.setContent(modifiedContent);

    // await page.addStyleTag({
    //   content: `
    // 		body { margin-top: 1cm; }
    // 		@page:first { margin-top: 0; }
    // 	`
    // });

    // Generate PDF for each page
    await page.pdf({
      path: 'output.pdf',
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true
    });

    console.log('PDF generated successfully');
    // await browser.close();
  } catch (e) {
    console.log(e);
  }
};

// Call the function to generate PDF
generatePDF();
