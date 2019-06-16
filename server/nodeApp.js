const http = require('http')
const fs = require('fs')

const server = http.createServer((request, response) => {
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

            }

 
        })
    }
}).listen(8080)