const Canvas = require('canvas');
const JsBarcode = require('jsbarcode');
const { getSignedUrl } = require('./helper');
const jsQR = require('jsqr');
const moment = require('moment');
const QRCode = require('qrcode');
// const console = require('../../console');

const generateBarCode = async ({ value }) => {
	try {
		let result = '';
		if (value) {
			// const canvas = new Canvas.createCanvas();
			const canvas = new Canvas.createCanvas(300, 100); // Adjust canvas size
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.patternQuality = 'high';
			JsBarcode(canvas, value, {
				format: 'CODE128',
				width: 2.0,
				height: 80,
			});
			result = canvas.toDataURL('image/png', 1);
		}
		return result;
	} catch (error) {
		console.error('generateBarCode Method Error', { uid: value, error });
	}
};

const generateQrCode = async ({ qr_url, qr_data }) => {
	let upiQRCode = '';
	if (qr_url) {
		upiQRCode = qr_url;
	} else if (qr_data) {
		upiQRCode = await QRCode.toDataURL(qr_data);
	}
	return upiQRCode;
};

const generateSignedQrCode = async ({ value }) => {
	if (value) {
		return await QRCode.toDataURL(value);
	}
	return '';
};

/**
 * @returns a random generated upload ID
 */

const generateUploadId = () => {
	const processId = process.pid % 1000;
	const randintLimit = Math.pow(10, 6) - 1;
	const counter = `${Math.floor(Math.random() * randintLimit)}`;
	return `${processId}${counter}`;
};

/**
 * @param {string} mediaType is the type of pdf
 * @returns a folder path based on current timestamp
 */

const timestampFolderPath = (mediaType) => {
	const uploadDate = moment();
	const month = uploadDate.format('MM');
	const year = uploadDate.year();
	const day = uploadDate.format('DD');
	const uploadId = generateUploadId();

	return `${mediaType}/PDFs/${year}/${month}/${day}/${uploadId}`.replace(
		/^\/{0,}/,
		''
	);
};

const getDigitalSignature = async ({ value: filePath }) => {
	try {
		const signedUrl = await getSignedUrl({
			filePath,
			operation: 'getObject',
			expiry: 10000,
		});
		return signedUrl;
	} catch (error) {
		console.info('Error getting digital signature', { filePath });
	}
};

module.exports = {
	generateBarCode,
	generateQrCode,
	generateSignedQrCode,
	timestampFolderPath,
	getDigitalSignature,
};
