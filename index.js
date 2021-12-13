const dotenv = require('dotenv').config()
const axios = require('axios');
const express = require('express');
const fileUpload = require('express-fileupload');
const FormData = require('form-data');
const { Base64 } = require('js-base64');
const fs = require('fs');
let data = new FormData();
//Create express server & middleware for upload files
const app = express();
app.use(fileUpload());

//Obtain urls by environtment
let urlSign = process.env.ENVIRONTMENT === 'pro' ? process.env.SIGN_FUNCTION_PRO : process.env.SIGN_FUNCTION_DEV;
let urlConvert = process.env.ENVIRONTMENT === 'pro' ? process.env.CONVERT_FUNCTION_PRO : process.env.CONVERT_FUNCTION_DEV;

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
    if (req.headers.authorization) {
        try {
            //Save correct token
            let token = req.headers.authorization;

            //Check if files exist
            let { json, certificate, privatekey } = checkFiles(req.files);
            //Check if passphrase exist
            let passphrase = req?.body?.passphrase;
            if (!Boolean(passphrase)) {
                throw new Error('passphrase required');
            };
            //Generate and append files in new Form
            data.append('json', json.data);
            data.append('certificate', certificate.data);
            data.append('privatekey', privatekey.data);
            data.append('passphrase', passphrase);

            //Object for call sign function
            const configRequest = {
                method: 'post',
                url: `${urlSign}`,
                headers: {
                    'Authorization': token,
                    ...data.getHeaders()
                },
                data: data
            }
            
            //Call to sign function
            axios(configRequest)
                .then(response => {
                    //call to sigmn functions success
                    let resp = response.data;
                    let xmlGenerated = resp.xml;

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
                        .then((resp2) => {
                            //Call to convert function success
                            let pdfb64 = resp2.data.fileContent;
                            let bin = Base64.atob(pdfb64);
                            fs.writeFile('invoice_binary.pdf', bin, 'binary', error => {
                                if (error)
                                    console.log(error);
                                else {
                                    let invoicePdf = fs.createReadStream('invoice_binary.pdf');
                                    let statInvoicePdf = fs.statSync('invoice_binary.pdf');
                                    res.setHeader('Content-Length', statInvoicePdf.size);
                                    res.setHeader('Content-Type', 'application/pdf');
                                    res.setHeader('Content-Disposition', 'attachment; filename=invoice_binary.pdf');
                                    invoicePdf.pipe(res);
                                }
                            })
                        })
                        .catch(function (error) {
                            //Call to convert funcion fails
                            const errorR = `Error call to convert funcion: ${error}`
                            console.log(errorR);
                            res.status(400).send(errorR);
                        });
                })
                .catch(error => {
                    //Call to sign function fails.
                    const errorR = `Error call to sign funcion: ${error}`
                    console.log(errorR);
                    res.status(400).send(String(errorR));
                })

        } catch (error) {
            //Sends error if any fails
            res.status(400).send(String(error));
        }
    } else {
        //Sends error if token is bad
        res.status(401).json({ error: 'No authorized' })
    }

});

app.listen(80, () => {
    console.log(`Server running in por 80`);
})

//Response of server if is calling by browser
app.get('/', (req, res) => {
    res.status(200).send('Server wiorking');
});