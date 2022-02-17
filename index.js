const dotenv = require('dotenv').config()
const axios = require('axios');
const express = require('express');
const fileUpload = require('express-fileupload');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { uploadFileToBucket, saveInvoiceXmlFile, saveInvoicePdfFile, saveInvoiceMetatada, clearXml } = require('./helpers/helpers')


//Create express server & middleware for upload files
const app = express();
app.use(fileUpload());

//Obtain urls by environtment
let urlSign = process.env.SIGN_FUNCTION;
let urlConvert = process.env.CONVERT_FUNCTION;

/** Function check files @function 
 * @param {array} array_files - Array of files form fileUpload
 * @return Object of files of throw error if any file is missing
 */
function checkFiles(array_files) {
    let errors = [];
    if (!array_files.json)
        errors.push('JSON invoice file is required');
    if (!array_files.certificate)
        errors.push('Certificate file is required');
    if (!array_files.privatekey)
        errors.push('Private Key file is required');

    if (errors.length === 0) {
        let { json, certificate, privatekey } = array_files;
        return { json, certificate, privatekey }
    } else {
        throw new Error(JSON.stringify(errors));
    }
}

/** Server POST in path / for recived and executes setences, calling two functions , sing function to sing in SAT the XML and convert funtion to convert a XML to PDF base 64;
 * The b64 string is converted to binary PDF File
 * @param {any} req - req contains objects with params sended by the client: files and strings.
 * @param {any} res - res cotaints functions to response the client.
 */

app.post('/', (req, res) => {

    try {
        //Save correct token
        let token = req.headers.authorization;

        //Check if files exist
        let { json, certificate, privatekey } = checkFiles(req.files);
        //Check if passphrase exist
        let passphrase = req?.body?.passphrase;
        let finkok_username = req?.body['finkok-username'];
        let finkok_password = req?.body['finkok-password'];
        let finkok_production = req?.body['finkok-production'];
        if (!Boolean(passphrase)) {
            throw new Error('passphrase required');
        };
        if (!Boolean(finkok_username)) {
            throw new Error('finkok-username required');
        };
        if (!Boolean(finkok_password)) {
            throw new Error('finkok-password required');
        };
        if (!Boolean(finkok_production)) {
            throw new Error('finkok-production required');
        };
        //Generate and append files in new Form
        let data = new FormData();
        data.append('json', json.data);
        data.append('certificate', certificate.data);
        data.append('privatekey', privatekey.data);
        data.append('passphrase', passphrase);
        data.append('finkok-username', finkok_username);
        data.append('finkok-password', finkok_password);
        data.append('finkok-production', finkok_production);

        //Object for call sign function
        const configRequest = {
            method: 'post',
            url: `${urlSign}`,
            headers: {
                'timeout': 1000,
                ...data.getHeaders()
            },
            data: data
        }

        //Call to sign function
        axios(configRequest)
            .then(async response => {
                //call to sign functions success
                let resp = response.data;
                let xmlGenerated = resp.xml;
                const invoiceName = resp.uuid;

                //clear xml
                const xmlCleaned = clearXml(xmlGenerated);

                // write xml file
                const xmlFile = await saveInvoiceXmlFile(invoiceName, xmlCleaned);
                console.log(`XML generated ${invoiceName}.xml`);

                //save xml file on bucket and get link file
                const linkFileXml = await uploadFileToBucket(invoiceName, xmlFile, 'xml');

                //Generate object and request for seccond service
                let dataToConvertPDF = JSON.stringify({ "external": xmlGenerated });

                let configConverter = {
                    method: 'post',
                    url: `${urlConvert}`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: dataToConvertPDF
                };

                //Call to convert function
                axios(configConverter)
                    .then(async resp2 => {
                        //Call to convert function success
                        const pdfb64 = resp2.data.fileContent;

                        //Generate PDF File
                        const pdfFile = await saveInvoicePdfFile(invoiceName, pdfb64)
                        console.log(`PDF generated ${invoiceName}.pdf`);

                        //Save file on Bucket and get link
                        const linkFilePdf = await uploadFileToBucket(invoiceName, pdfFile, 'pdf');

                        //Save metadata of invoice on DB
                        const objMetadataInvoice = {
                            invoice: invoiceName,
                            xml: linkFileXml,
                            pdf: linkFilePdf
                        }
                        await saveInvoiceMetatada(objMetadataInvoice);



                        // let invoicePdf = fs.createReadStream(path.join(pdfFile));
                        // let statInvoicePdf = fs.statSync(path.join(pdfFile));
                        // res.setHeader('Content-Length', statInvoicePdf.size);
                        // res.setHeader('Content-Type', 'application/pdf');
                        // res.setHeader('Content-Disposition', `attachment; filename=${invoiceName}.pdf`);
                        // invoicePdf.pipe(res);

                        //Object whit response
                        const thisResponse = {
                            pdf: pdfb64,
                            xml: xmlCleaned
                        }

                        //Send response JSON with XML and PDF
                        res.status(200).send(thisResponse);

                    })
                    .catch(function (error) {
                        //Call to convert funcion fails
                        const errorR = {
                            error: 'Error call to convert funcion: ',
                            message_of_call: error?.response?.data ? error?.response?.data : error
                        }
                        console.log(JSON.stringify(errorR));
                        res.status(400).send(errorR);
                    });
            })
            .catch(error => {
                //Call to sign function fails.
                const errorR = {
                    error: 'Error call to sign funcion: ',
                    message_of_call: error?.response?.data ? error?.response?.data : error
                }
                console.log(JSON.stringify(errorR));
                res.status(400).send(errorR);
            })

    } catch (error) {
        //Sends error if any fails
        res.status(400).send(String(error));
    }


});

app.listen(80, () => {
    console.log(`Server running in por 80`);
})

//Response of server if is calling by browser
app.get('/', (req, res) => {
    res.status(200).send('Server wiorking');
});