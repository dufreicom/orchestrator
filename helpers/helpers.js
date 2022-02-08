const util = require('util')
const gc = require('../config/gcpstorage')
const appFirebase = require('../config/firebase');
const fs = require('fs');
const formatXml = require('xml-formatter');
const { Base64 } = require('js-base64');
const path = require('path');
const os = require('os');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const { getDatabase, set, ref } = require("firebase/database");

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
    const file = await bucket.upload(filePath, { destination: `${invoiceName}/${invoiceName}.${extention}` });
    const linkFile = file[0]?.metadata?.selfLink ? file[0].metadata?.selfLink : 'no_link';
    console.log(`${invoiceName}.${extention} uploaded to ${process.env.BUCKET_STORAGE}, link ${linkFile}`);
    return String(linkFile);
}

const generateTmpFolder = () => fs.mkdtempSync(path.join(os.tmpdir()))

const clearXml = (stringContent) => formatXml(stringContent, {
    collapseContent: true,
    lineSeparator: '\n'
});

const saveInvoiceXmlFile = (invoiceName, stringContent) => {
    return new Promise((resolve, reject) => {
        try {
            const folder = generateTmpFolder()
            fs.writeFileSync(`${folder}/${invoiceName}.xml`, stringContent)
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
            const folder = generateTmpFolder()
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

const saveInvoiceMetatada = async ({ invoice, xml, pdf }) => {
   try{
    const date = moment().tz('America/Mexico_City');
    const database = getDatabase();

    const objMetadataInvoice = {
        id: uuidv4(),
        invoice: invoice,
        xml: xml,
        pdf: pdf,
        created: date.format(),
        updated: date.format()
    }

    appFirebase
    set(ref(database, 'invoices/'+process.env.ENTERPRISE), objMetadataInvoice)
   } catch (e) {
       console.log("#### firebase error: ", e)
   }
}

module.exports = { uploadFileToBucket, saveInvoiceXmlFile, saveInvoicePdfFile, saveInvoiceMetatada, clearXml }