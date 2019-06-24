const http = require('http')
const fs = require('fs')
const assert = require('assert').strict
const uuidv1 = require('uuid/v1')

http.createServer((request, response) => {
    const { method, url, headers } = request

    if (method === 'POST' && url === '/files') {
        let body = []
        request.on('error', (err) => {
            console.log(err.stack)
        }).on('data', (chunk) => {
            body.push(chunk)
        }).on('end', () => {
            if (headers["content-type"] === 'application/json') {

                body = Buffer.concat(body).toString('utf8')

                fs.writeFile('./uploads/input.json', body, 'utf8', (err) => {
                    if (err) throw err;

                    response.statusCode = 201
                    response.setHeader('Content-Type', 'application/json');
                    response.setHeader('X-Powered-By', 'bacon');
        
                    response.write(body)
                    response.end()
                })

            } else if (headers["content-type"] === 'image/jpeg') {
                body = Buffer.concat(body)

                fs.writeFile('./uploads/profile_pic.jpeg', body, (err) => {
                    if (err) throw err;

                    response.statusCode = 201
                    response.setHeader('Content-Type', 'image/jpeg');
                    response.setHeader('X-Powered-By', 'bacon');
        
                    response.write(body)
                    response.end()
                })
            } else if (headers["content-type"].includes('multipart/')) {

                // parse out each body-part
    
                // by splitting the Buffer the boundary separator

                const boundaryField = "boundary=\""
                const boundaryFieldIndex = headers["content-type"].indexOf(boundaryField)
                if (boundaryFieldIndex !== -1) {
                    const escapedQuote = "\""
                    const boundaryStr = headers["content-type"].slice(boundaryFieldIndex + boundaryField.length, headers["content-type"].length - escapedQuote.length)
                    console.log("Boundary: ", boundaryStr)

                    bodyBuffer = Buffer.concat(body)

                    const boundaryHyphens = '--'
                    const boundaryToken = boundaryHyphens + boundaryStr
                    
                    let cursor = 0
                    const boundarySlice = bodyBuffer.slice(cursor, boundaryToken.length)

                    /** Assertion - if it failed program exits immediately */
                    assert.strictEqual(boundarySlice.toString(), boundaryToken, "Boundary token found was not as expected")

                    const CRLF = '\r\n'

                    cursor += boundaryToken.length + CRLF.length
                    const jsonPartHeaderCRLF_Index = bodyBuffer.indexOf(CRLF, cursor)
                    if (jsonPartHeaderCRLF_Index !== -1) {

                        const jsonPartHeader = bodyBuffer.slice(cursor, jsonPartHeaderCRLF_Index)
                        console.log("JSON part header: ", jsonPartHeader.toString())

                        cursor += jsonPartHeader.length + CRLF.length*2

                        const jsonPartCRLF_Index = bodyBuffer.indexOf(CRLF, cursor)
                        if (jsonPartCRLF_Index !== -1) {

                            const jsonPart = bodyBuffer.slice(cursor, jsonPartCRLF_Index) 
                            console.log("JSON part length: ", jsonPart.length)
                            console.log("JSON body part: ", jsonPart.toString()) 

                            cursor += jsonPart.length + CRLF.length + boundaryToken.length + CRLF.length
                            const imagePartHeaderCRLF_Index = bodyBuffer.indexOf(CRLF, cursor)
                            if (imagePartHeaderCRLF_Index !== -1) {
                                
                                const imagePartHeader = bodyBuffer.slice(cursor, imagePartHeaderCRLF_Index)
                                console.log("Image part header: ", imagePartHeader.toString())

                                const filenameParam = "filename=\""
                                const fileName_Index = imagePartHeader.indexOf(filenameParam)
                                if (fileName_Index !== -1) {
                                    const originalFileName = imagePartHeader.slice(fileName_Index+filenameParam.length, imagePartHeader.length - escapedQuote.length).toString()
                                    console.log("Image part filename: ", originalFileName)

                                    cursor += imagePartHeader.length + CRLF.length*2
                                    const imagePartCRLF_Index = bodyBuffer.indexOf(CRLF, cursor)
                                    if (imagePartCRLF_Index !== -1) {
                                        const imagePartData = bodyBuffer.slice(cursor, imagePartCRLF_Index)
                                        console.log(imagePartData.length)

                                        let fileMetadata = JSON.parse(jsonPart)
                                        fileMetadata.uuid = uuidv1()
                                        fileMetadata.jsonFilename = "input.json"
                                        fileMetadata.contentFile = {
                                            uuid: uuidv1(),
                                            originalFilename: originalFileName
                                        }
             
                                        fs.writeFile('./uploads/input.json', JSON.stringify(fileMetadata, null, 2), 'utf8', (err) => {
                                            if (err) throw err
                                        })
            
                                        fs.writeFile(`./uploads/${fileMetadata.contentFile.uuid}.jpeg`, imagePartData, (err) => {
                                            if (err) throw err
                                        })

                                        response.setHeader('Content-Type', 'application/json');
                                        response.setHeader('X-Powered-By', 'bacon');

                                        response.write(JSON.stringify(fileMetadata, null, 2))
                                    }
                                }
                            }

                        }
                    }
                }            
            }
            response.end()
        })
    }
}).listen(8080)
