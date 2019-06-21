const http = require('http')
const fs = require('fs')

http.createServer((request, response) => {
    const { method, url, headers } = request

    boundaryStrIndex = headers["content-type"].indexOf("boundary=")
    if (boundaryStrIndex !== -1) {
        const boundaryStr = headers["content-type"].slice(boundaryStrIndex+10, headers["content-type"].length-1)
        console.log(boundaryStr)
    }

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
                // by splitting the Buffer on with the boundary separator
                boundaryStrIndex = headers["content-type"].indexOf("boundary=")
                if (boundaryStrIndex !== -1) {
                    const boundaryStr = headers["content-type"].slice(boundaryStrIndex+10, headers["content-type"].length-1)

                    const buffBody = Buffer.concat(body)
                    const boundarySlice = buffBody.slice(0, 4+(boundaryStr.length))
                    const jsonHeaderSlice = buffBody.slice(boundarySlice.length, buffBody.indexOf('\r\n', boundarySlice.length))
                    const jsonBodySlice = buffBody.slice(jsonHeaderSlice.length+boundarySlice.length+4, buffBody.indexOf(`--${boundaryStr}`, jsonHeaderSlice.length+boundarySlice.length+4))
                    
                    console.log(jsonBodySlice.toString())

                    response.setHeader('Content-Type', 'text/utf8');
                    response.setHeader('X-Powered-By', 'bacon');
                    response.write(boundarySlice.toString())
                    response.write(jsonHeaderSlice.toString())
                    response.write(jsonBodySlice.toString())
                }            
            }
            response.end()
        })
    }
}).listen(8080)