const PNG = require('pngjs').PNG;

module.exports = class ThermalPrinterHelper {
	static getFontSize(value = '', size = '') {
		const str = `<font size='${size}'>${value}</font>`;
		return size ? str : value;
	}

	static getBoldText(value = '', bold = false) {
		return bold ? `<b>${value}</b>` : value;
	}

	static getUnderlinedText(value = '', underline = false) {
		return underline ? `<u>${value}</u>` : value;
	}

	static getBarcodeCode(value = '', barcodeType) {
		const allBarcodeTypes = {
			ean8: 'ean8', // height: 10mm, width: ~70% printer width
			upca: 'upca', // height: 20mm, width: ~70% printer width
			upce: 'upce', // height: 25mm, width: ~50mm
			128: '128', // height: 10mm, width: ~40mm, text
		};
		const type = allBarcodeTypes[barcodeType] || allBarcodeTypes[128];
		return `<barcode type='${type}' height='6' width='30' text='none'>${value}</barcode>`;
	}

	static getQrCode(value = '', size) {
		return `<qrcode size='${size}'>${value}</qrcode>`;
	}

	static async getImageHexValue(image = '') {
		const buffer = await ThermalPrinterHelper.getImageBuffer(image);
		const imageHex = buffer.toString('hex');
		return `<img>${imageHex}</img>`;
	}

	static async getImageBuffer(image) {
		try {
			const data = image;
			const png = PNG.sync.read(data);
			const buffer = ThermalPrinterHelper.getBuffer(
				png.width,
				png.height,
				png.data
			);
			return buffer;
		} catch (error) {
			throw error;
		}
	}

	static getBuffer(width, height, data) {
		const pixels = ThermalPrinterHelper.getPixelArray(width, height, data);
		const bufferArray = ThermalPrinterHelper.getImageBufferArray(
			pixels,
			width,
			height
		);
		const buffer = Buffer.from(bufferArray);

		// Print raster bit image
		// GS v 0
		// 1D 76 30	m	xL xH	yL yH d1...dk
		// https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=94

		// Check if width/8 is decimal
		if (width % 8 != 0) {
			width += 8;
		}
		const xL = (width >> 3) & 0xff;
		const xH = 0x00;
		const yL = height & 0xff;
		const yH = (height >> 8) & 0xff;

		const headerBuffer = Buffer.from([0x1d, 0x76, 0x30, 48, xL, xH, yL, yH]);
		// append data
		const finalBuffer = Buffer.concat([headerBuffer, buffer]);

		return finalBuffer;
	}

	static getPixelArray(width, height, data) {
		const pixels = [];
		// Get pixel rgba in 2D array
		for (let i = 0; i < height; i++) {
			const line = [];
			for (let j = 0; j < width; j++) {
				const idx = (width * i + j) << 2;
				line.push({
					r: data[idx],
					g: data[idx + 1],
					b: data[idx + 2],
					a: data[idx + 3],
				});
			}
			pixels.push(line);
		}

		return pixels;
	}

	static getImageBufferArray(pixels, width, height) {
		const bufferArray = [];

		for (let i = 0; i < height; i++) {
			for (let j = 0; j < Math.ceil(width / 8); j++) {
				let byte = 0x0;
				for (let k = 0; k < 8; k++) {
					let pixel = pixels[i][j * 8 + k];

					// Image overflow
					if (!pixel) {
						pixel = { a: 0, r: 0, g: 0, b: 0 };
					}

					if (pixel.a > 126) {
						// checking transparency
						const grayscale = parseInt(
							0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b
						);

						if (grayscale < 128) {
							// checking color
							const mask = 1 << (7 - k); // setting bitwise mask
							byte |= mask; // setting the correct bit to 1
						}
					}
				}

				bufferArray.push(byte);
				// imageBuffer = Buffer.concat([imageBuffer, Buffer.from([byte])]);
			}
		}

		return bufferArray;
	}
};
