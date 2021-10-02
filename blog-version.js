const fs= require('fs')
const http = require('http')
const pathlib = require('path')
const showdown  = require('showdown')

showdown.setFlavor('github')


function resolvePath(req, rsp, path) {
  path = pathlib.normalize(path)
  if (fs.existsSync(path)) {
    if (fs.lstatSync(path).isFile())  {
      return sendFile(req, rsp, path)
    } else if (fs.lstatSync(path).isDirectory()) {
      return resolvePath(req, rsp, `${path.replace(/\/$/, '')}/index.html`)
    }
  } else if (path.endsWith('.html')) {
    // Maybe there's a corresponding .md file we can send instead?
    return resolvePath(req, rsp, path.slice(0, -5) + ".md")
  } else {
    return sendError(req, rsp, 404)
  }
}


function resolveUrl(url) {
  return pathlib.resolve(`./${url}`)
}


function sendError(req, rsp, code) {
  messages = {
    404: "Not Found"
  }
  rsp.writeHead(code, {'Content-Type': 'text/html'})
  rsp.end(`<html><body><h1>${code} ${messages[code]}</h1></body</html>`)
}


function sendFile(req, rsp, path) {
  if (path.endsWith('.md')) {
    return sendMarkdown(req, rsp, path)
  }

  body = fs.readFileSync(path)
  rsp.writeHead(200,
    {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(body)
    }
  )
  rsp.end(body)
}


function sendMarkdown(req, rsp, path) {
  body = fs.readFileSync(path, 'utf-8')
  converter = new showdown.Converter()
  html = '<html><body>'
    + converter.makeHtml(body)
    + "</body></html>";
  rsp.writeHead(200,
    {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html)
    }
  )
  rsp.end(html)
}


// create a simple HTTP server
const server = http.createServer((req, rsp) => {
  // convert the requested URL to a local pathname
  let pathname = resolveUrl(req.url)

  // send the content from that pathname, or an error
  return resolvePath(req, rsp, pathname)
})

// listen for requests.
server.listen(3000, "localhost", () => {
   console.log(`EH-mdServer: running at http://localhost:3000/`)
})
