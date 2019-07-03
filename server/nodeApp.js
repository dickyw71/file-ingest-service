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
        
                    response.write(body)
                    response.end()
                })

            } else if (headers["content-type"] === 'image/jpeg') {
                body = Buffer.concat(body)

                fs.writeFile('./uploads/profile_pic.jpeg', body, (err) => {
                    if (err) throw err;

                    response.statusCode = 201
                    response.setHeader('Content-Type', 'image/jpeg');
        
                    response.write(body)
                    response.end()
                })
            } else if (headers["content-type"].includes('multipart/')) {

                // find the multipart boundary string
                const boundaryStr = parseBoundaryString(headers["content-type"])

                // parse out each body-part into an array of Buffers
                bodyBuffer = Buffer.concat(body)
                const bodyPartsArr = parseBodyParts(bodyBuffer, boundaryStr)

                console.log(bodyPartsArr)
                
                let bodyHeadersArr = []
                let contentsArr = []
                // for each body part
                for (const b of bodyPartsArr) {
                    // parse out the headers into an array of Buffers
                    bodyHeadersArr.push(parsePartHeaders(b))
                    // parse out content into an array of Buffers
                    contentsArr.push(parsePartContents(b))
                }
                
                console.log("Body header buffers: ", bodyHeadersArr[0], "\r\n",  bodyHeadersArr[1])

                // map each headers buffer to headers object with key/value pairs for each header
                 //  split string into an array of lines  
                
            
                let headersStrArr = bodyHeadersArr.map((buff) => new String(buff.toString()).split('\n'))                       
                        .map((hdr) => hdr.map((line) => line.trim().replace(/\'/g, "").split(': ')))   // trim white space and split header line into a key/value pair                                
                
                let jsonPartHdr = {}
                jsonPartHdr[headersStrArr[0][0][0]] = headersStrArr[0][0][1]
                jsonPartHdr[headersStrArr[0][1][0]] = headersStrArr[0][1][1]
                jsonPartHdr[headersStrArr[0][2][0]] = headersStrArr[0][2][1]

                console.log(jsonPartHdr['Content-Length'])



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
                                const escapedQuote = "\""
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

                                    response.write(JSON.stringify(fileMetadata, null, 2))
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

function parseBoundaryString(contentTypeStr) {

    let _retStr = null
    const boundaryField = "boundary=\""
    const boundaryFieldIndex = contentTypeStr.indexOf(boundaryField)
    if (boundaryFieldIndex !== -1) {
        const escapedQuote = "\""
        _retStr =  contentTypeStr.slice(boundaryFieldIndex + boundaryField.length, contentTypeStr.length - escapedQuote.length)
    }

    return _retStr
}

function parseBodyParts(buffer, seperatorStr) {

    let _bodyParts = []

    const hyphen = '-'
    const boundaryToken = hyphen + hyphen + seperatorStr

    // find start and end index of each body part
    const startIndex = buffer.indexOf(boundaryToken)
    if (startIndex !== -1) {
        let cursor = boundaryToken.length
        const nextIndex = buffer.indexOf(boundaryToken, cursor)
        if (nextIndex !== -1) {
            _bodyParts.push(buffer.slice(startIndex + boundaryToken.length, nextIndex))
            
            cursor = nextIndex + boundaryToken.length
            const endIndex = buffer.indexOf(boundaryToken, cursor)
            if(endIndex !== -1) {
                _bodyParts.push(buffer.slice(cursor, endIndex))
            }
        }
    }

    return _bodyParts
}

function parsePartHeaders(bodyPartBuffer) {

    let _retBuff = null
    const CRLF = "\r\n"
    // each body part headers section starts with a single CRLF and ends with a double CRLF
    const intialCRLF_Index = bodyPartBuffer.indexOf(CRLF)
    if (intialCRLF_Index !== -1) {
        const closingCRLFPair_Index = bodyPartBuffer.indexOf(CRLF+CRLF)
        if (closingCRLFPair_Index !== -1) {
            _retBuff = bodyPartBuffer.slice(intialCRLF_Index+CRLF.length, closingCRLFPair_Index)
        }
    }
    return _retBuff
}

function parsePartContents(bodyPartBuffer) {

    let _retBuff = null
    const CRLF = "\r\n"
    // each body part contents section starts with a double CRLF and ends with a single CRLF
    const intialCRLFPair_Index = bodyPartBuffer.indexOf(CRLF+CRLF)
    if (intialCRLFPair_Index !== -1) {
        const closingCRLF_Index = bodyPartBuffer.indexOf(CRLF)
        if (closingCRLF_Index !== -1) {
            _retBuff = bodyPartBuffer.slice(intialCRLFPair_Index + (CRLF+CRLF).length, closingCRLF_Index)
        }
    }
    return _retBuff   
}