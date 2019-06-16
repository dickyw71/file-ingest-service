const express = require('express')

const app = express()
const port = 9595

app.post("/files", (req, res) => {
    res.send("Got a POST request on /files")
})

app.listen(port, "localhost", () => { console.log(`File Ingest Server listening on port ${port}.`)})