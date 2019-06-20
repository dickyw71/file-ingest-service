const http = require('http')
const fs = require('fs')

const jsonFile = fs.readFileSync("../ingest/input.json", "utf8")
const imageFile = fs.readFileSync("../ingest/profile_pic.jpeg")

const boundaryStr = '----------MyEntityBoundary-1'
const jsonPartParams = {
    'content-type': 'application/json',
    name: 'input.json'
}
const imagePartParams = {
    'content-type': 'image/jpeg',
    name: 'profile_pic.jpeg'
}

const postDataArray = [
    Buffer.from('------------MyEntityBoundary-1\r\n'), 
    Buffer.from(JSON.stringify(jsonPartParams)), 
    Buffer.from('\r\n\r\n'),
    Buffer.from(jsonFile),
    Buffer.from('\r\n'),
    Buffer.from('------------MyEntityBoundary-1\r\n'),
    Buffer.from(JSON.stringify(imagePartParams)),
    Buffer.from('\r\n\r\n'),
    imageFile,
    Buffer.from('\r\n'),
    Buffer.from('------------MyEntityBoundary-1--\r\n')
]

const postData = Buffer.concat(postDataArray)

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/files',
    method: 'POST',
    headers: {
        'content-type': `multipart/mixed; boundary=\"${boundaryStr}\"`,
        'content-length': postData.length
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