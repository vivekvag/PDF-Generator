const puppeteer = require('puppeteer');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');
// const { XMLParser } = require('fast-xml-parser');
const data = require('./data.json');
// const XMLdata = fs.readFileSync('./invoice.xml', 'utf8');

// Read the XML file
// const parser = new XMLParser();
// let jsonData = parser.parse(XMLdata);

const compile = async function (template, data) {
	const filePath = path.join(process.cwd(), 'templates', `${template}.hbs`);
	const templateSource = await fs.readFileSync(filePath, 'utf-8');
	return hbs.compile(templateSource)(data);
};

(async function () {
	try {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		const content = await compile('index', data);
		await page.setContent(content);
		await page.pdf({
			path: 'output.pdf',
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: true,
		});
		console.log('PDF generated successfully');
		await browser.close();
	} catch (e) {
		console.log(e);
	}
})();
