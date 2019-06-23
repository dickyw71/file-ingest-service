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
                    const doubleQuote = "\""
                    const boundaryStr = headers["content-type"].slice(boundaryFieldIndex + boundaryField.length, headers["content-type"].length - doubleQuote.length)
                    console.log("Boundary: ", boundaryStr)

                    bodyBuffer = Buffer.concat(body)

                    const boundaryHyphens = '--'
                    const boundaryToken = boundaryHyphens + boundaryStr
                    
                    let cursor = 0
                    const boundarySlice = bodyBuffer.slice(cursor, boundaryToken.length)

                    /** Assertion */
                    assert.strictEqual(boundarySlice.toString(), boundaryToken, "Boundary token found was not as expected")

                    const CRLF = '\r\n'

                    // Re-defined Buffer iterator
                    bodyBuffer[Symbol.iterator] = function() {
                        return {               
                            next: function() {               
                                if (this._first) {
                                    this._first = false
                                    this._index = bodyBuffer.indexOf(boundaryToken+CRLF)
                                    if (this._index === -1) 
                                        return { done: true }
                                    return { 
                                        value: bodyBuffer.indexOf(boundaryToken+CRLF), 
                                        done: false 
                                    }
                                } else {    
                                    this._index = bodyBuffer.indexOf(boundaryToken+CRLF, this._index+boundaryToken.length+CRLF.length)                           
                                    if ( this._index === -1) {
                                        this._lastIndex = bodyBuffer.lastIndexOf(boundaryToken + boundaryHyphens + CRLF)
                                        if ( this._lastIndex === -1)  
                                            return { done: true }
                                        return { 
                                            value: this._lastIndex, 
                                            done: true 
                                        }
                                    } else {
                                        return { 
                                            value: this._index, 
                                            done: false 
                                        }
                                    }
                                }                              
                            },
                            _first: true,
                            _index: 0,
                            _lastIndex: 0
                        }
                    }

                    boundaryIndices = [...bodyBuffer]   // Spread the values of the boundary indices
                    console.log(boundaryIndices)

                    cursor += boundaryToken.length + CRLF.length
                    const jsonPartHeaderCRLF_Index = bodyBuffer.indexOf(CRLF, cursor)
                    if (jsonPartHeaderCRLF_Index !== -1) {

                        const jsonPartHeader = bodyBuffer.slice(cursor, jsonPartHeaderCRLF_Index)
                        console.log("JSON part header: ", jsonPartHeader.toString())

                        cursor += jsonPartHeader.length + CRLF.length*2

                        const jsonPartCRLF_Index = bodyBuffer.indexOf(CRLF, cursor)
                        if (jsonPartCRLF_Index !== -1) {

                            const jsonBody = bodyBuffer.slice(cursor, jsonPartCRLF_Index) 
                            console.log("JSON body part: ", jsonBody.toString()) 

                            let fileMetadata = JSON.parse(jsonBody)
                            fileMetadata.uuid = uuidv1()

                            fs.writeFile('./uploads/input.json', JSON.stringify(fileMetadata, null, 2), 'utf8', (err) => {
                                if (err) throw err;
                            })

                            cursor += jsonBody.length + CRLF.length
                            const imagePartHeaderCRLF_Index = bodyBuffer.indexOf(CRLF, cursor)
                            if (imagePartHeaderCRLF_Index !== -1) {
                                
                                const imagePartHeader = bodyBuffer.slice(cursor, imagePartHeaderCRLF_Index)
                                console.log(imagePartHeader.toString())
                            }
                            
                            response.setHeader('Content-Type', 'application/json');
                            response.setHeader('X-Powered-By', 'bacon');

                            response.write(JSON.stringify(fileMetadata, null, 2))

                        }
                    }
                }            
            }
            response.end()
        })
    }
}).listen(8080)
