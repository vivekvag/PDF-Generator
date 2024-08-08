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

    const barcodeMarkup = await generateBarCode({
      value: payloadJSON.barcode_number
    });

    const qrCodeMarkup = await generateQrCode({
      qr_data: payloadJSON.irn
    });

    payloadJSON.barcodeMarkup = barcodeMarkup;
    payloadJSON.qrCodeMarkup = qrCodeMarkup;
    payloadJSON.pdfLogo = pdfLogo;

    // console.log({ pdfLogo });

    const content = await compile('index', payloadJSON);

    // Add the formatted text and barcode to your content
    const modifiedContent = content;

    await page.setContent(modifiedContent);

    await page.addStyleTag({
      content: `
				body { margin-top: 1cm; }
				@page:first { margin-top: 0; }
			`
    });

    // Generate PDF for each page
    await page.pdf({
      path: 'output.pdf',
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      margin: {
        top: '100px'
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
			`
    });

    console.log('PDF generated successfully');
    // await browser.close();
  } catch (e) {
    console.log(e);
  }
};

// Call the function to generate PDF
generatePDF();
