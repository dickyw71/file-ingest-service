const http = require('http')
const fs = require('fs')
const assert = require('assert').strict

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
                const doubleQuote = "\""
                const boundaryFieldIndex = headers["content-type"].indexOf(boundaryField)
                if (boundaryFieldIndex !== -1) {
                    const boundaryStr = headers["content-type"].slice(boundaryFieldIndex + boundaryField.length, headers["content-type"].length - doubleQuote.length)
                    console.log("Boundary: ", boundaryStr)

                    bodyBuffer = Buffer.concat(body)

                    const boundaryPrefix = '--'
                    const CRLF = '\r\n'
                    const boundaryToken = boundaryPrefix + boundaryStr
                    
                    let cursor = 0

                    const boundarySlice = bodyBuffer.slice(cursor, boundaryToken.length)

                    /** Assertion */
                    assert.strictEqual(boundarySlice.toString(), boundaryToken, "Boundary token found was not as expected")

                    cursor += boundaryToken.length + CRLF.length

                    const jsonPartHeaderCRLF_Index = bodyBuffer.indexOf('\r\n', cursor)
                    if (jsonPartHeaderCRLF_Index !== -1) {

                        const jsonPartHeader = bodyBuffer.slice(cursor, jsonPartHeaderCRLF_Index)
                        console.log("JSON part header: ", jsonPartHeader.toString())

                        cursor += jsonPartHeader.length + CRLF.length*2

                        const jsonPartCRLF_Index = bodyBuffer.indexOf('\r\n', cursor)
                        if (jsonPartCRLF_Index !== -1) {

                            const jsonBody = bodyBuffer.slice(cursor, jsonPartCRLF_Index) 
                            console.log("JSON body part: ", jsonBody.toString()) 

                            fs.writeFile('./uploads/input.json', jsonBody, (err) => {
                                if (err) throw err;
                            })

                            cursor += jsonBody.length + CRLF.length

                            const imagePartHeaderCRLF_Index = bodyBuffer.indexOf('\r\n', cursor)
                            
                            response.setHeader('Content-Type', 'text/utf8');
                            response.setHeader('X-Powered-By', 'bacon');

                            response.write(jsonBody.toString())
                        }
                    }
                }            
            }
            response.end()
        })
    }
}).listen(8080)