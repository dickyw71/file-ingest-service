const http = require('http')
const fs = require('fs')

const jsonFile = fs.readFileSync("../ingest/input.json", "utf8")
const imageFile = fs.readFileSync("../ingest/profile_pic.jpeg")

const boundaryStr = '----------MyEntityBoundary-1'

const jsonFileHeaders = 
    `'Content-Type': 'application/json'
    'Content-Length': ${Buffer.byteLength(jsonFile)}
    'Content-Disposition': form-data; name="jsonFile"; filename="input.json"`

const imageFileHeaders = 
      `'Content-Type': 'image/jpeg'
      'Content-Length': ${imageFile.length}
      'Content-Disposition': form-data; name="imageFile"; filename="profile_pic.jpeg"`

const postDataArray = [
    Buffer.from('--' + boundaryStr + '\r\n'), 
    Buffer.from(jsonFileHeaders), 
    Buffer.from('\r\n\r\n'),
    Buffer.from(jsonFile),
    Buffer.from('\r\n'),
    Buffer.from('--' + boundaryStr + '\r\n'),
    Buffer.from(imageFileHeaders),
    Buffer.from('\r\n\r\n'),
    imageFile,
    Buffer.from('\r\n'),
    Buffer.from('--' + boundaryStr + '--\r\n')
]

const postData = Buffer.concat(postDataArray)

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/files',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/mixed; boundary=\"${boundaryStr}\"`,
        'Content-Length': postData.length
    }
}

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
      console.log('No more data in response.');
    });
  });
  
  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });
  
  // write data to request body
  req.write(postData);
  req.end();