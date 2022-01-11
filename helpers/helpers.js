const util = require('util')
const gc = require('../config')
const fs = require('fs');
const formatXml = require('xml-formatter');
const { Base64 } = require('js-base64');
const path = require('path');
const os = require('os');

const bucket = gc.bucket(`${process.env.BUCKET_STORAGE}`);

const { format } = util


/**
 *
 * @param { File } object file object that will be uploaded
 * @description - This function does the following
 * - It uploads a file to the image bucket on Google Cloud
 * - It accepts an object as an argument with the
 *   "originalname" and "buffer" as keys
 */

const uploadFileToBucket = async (invoiceName, filePath, extention) => {
    await bucket.upload(filePath, { destination: `${invoiceName}/${invoiceName}.${extention}`});
    console.log(`${invoiceName}.${extention} uploaded to ${process.env.BUCKET_STORAGE}`);
}

const generateTmpFolder = invoiceName => fs.mkdtempSync(path.join(os.tmpdir()))

const saveInvoiceXmlFile = (invoiceName, stringContent) => {
    return new Promise((resolve, reject) => {
        try {
            const xmlContentFile = formatXml(stringContent, {
                collapseContent: true,
                lineSeparator: '\n'
            });

            const folder = generateTmpFolder(invoiceName)
            fs.writeFileSync(`${folder}/${invoiceName}.xml`, xmlContentFile)
            resolve(`${folder}/${invoiceName}.xml`)
        } catch (e) {
            console.log(`Error generating xml file: ${invoiceName}.xml : ${e}`)
            reject(e);
        }
    })
}

const saveInvoicePdfFile = (invoiceName, stringContent) => {
    return new Promise((resolve, reject) => {
        try {
            const bin = Base64.atob(stringContent);
            const folder = generateTmpFolder(invoiceName)
            fs.writeFile(`${folder}/${invoiceName}.pdf`, bin, 'binary', err => {
                if (err)
                    console.log(err)
                else
                    resolve(`${folder}/${invoiceName}.pdf`)
            });
        } catch (e) {
            console.log(`Error generating pdf file: ${invoiceName}.pdf : ${e}`)
            reject(e);
        }
    })
}

module.exports = { uploadFileToBucket, saveInvoiceXmlFile, saveInvoicePdfFile }