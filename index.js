const axios = require('axios');
const express = require('express');
// const multer = require('multer');
// const upload = multer({dest: 'sat_files/'})
const fileUpload = require('express-fileupload');
const FormData = require('form-data');
const {Base64} = require('js-base64');
const fs = require('fs');
let data = new FormData();


const app = express();
app.use(fileUpload());



app.get('/', (req, res)=> {
    res.status(200).send('Server wiorking');
});

app.post('/', (req, res)=> {
    if(req.headers.authorization){
        let token = req.headers.authorization;
        //After token is recibed
        let json_inv = req.files.json;
        let certificate = req.files.certificate;
        let privatekey = req.files.privatekey;
        let passphrase = req.body.passphrase;

        data.append('json', json_inv.data);
        data.append('certificate', certificate.data);
        data.append('privatekey', privatekey.data);
        data.append('passphrase', passphrase);
        
        const configRequest = {
            method: 'post',
            url: 'http://54.176.12.50/build-cfdi-from-json',
            headers: { 
              'Authorization': token, 
              ...data.getHeaders()
            },
            data : data
        }

        axios(configRequest)
            .then(response => {
                let resp = response.data;
                let uuid = resp.uuid;
                let xmlGenerated = resp.xml;
                
                // console.log("#### resp:", xmlGenerated)
                let dataToConvertPDF = JSON.stringify({"external": xmlGenerated});

                let configConverter = {
                    method: 'post',
                    url: 'https://8f0v07bd48.execute-api.us-west-1.amazonaws.com',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    data : dataToConvertPDF
                };
                // console.log('#### configConverted', configConverter);

                axios(configConverter)
                    .then((resp2) => {
                        let pdfb64 = resp2.data.fileContent;
                        // console.log(pdfb64);
                        // console.log(pdfb64)
                        let bin =  Base64.atob(pdfb64);
                        fs.writeFile('invoce_binary.pdf', bin, 'binary', error => {
                            if(error)
                                console.log(error);
                            else{
                                let invoicePdf = fs.createReadStream('invoce_binary.pdf');
                                let statInvoicePdf = fs.statSync('invoce_binary.pdf');
                                res.setHeader('Content-Length', statInvoicePdf.size);
                                res.setHeader('Content-Type', 'application/pdf');
                                res.setHeader('Content-Disposition', 'attachment; filename=invoce_binary.pdf');
                                invoicePdf.pipe(res);
                                // res.contentType("applicatoion/pdf");
                                // res.send(invoicePdf)
                            }
                        })
                        // res.status(200).send(JSON.stringify({result: pdfb64}))
                    })
                    .catch(function (error) {
                        console.log('error 2', error);
                    });

                // res.status(200).send('funciono')
            })
            .catch(error => {
                console.log('#### error', error);
            })
        //Show contents of req
        // console.log('#### req post:', req.files);

        // console.log('#### bearer token',req.headers.authorization);
        // res.status(200).send('Server working');
    } else {
        res.status(401).json({error: 'No authorized'})
    }
    
});

app.listen(3000, () => {
    console.log(`Server running in por 3000`);
})