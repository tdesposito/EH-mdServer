#!/usr/bin/env node

// This file is part of EH-mdServer, Copyright (C) Todd D. Esposito 2021.
// Distributed under the MIT License (see https://opensource.org/licenses/MIT).

const fs = require('fs')
const http = require('http')
const pathlib = require('path')
const process = require('process')
const showdown  = require('showdown')
const yargs = require('yargs')

showdown.setFlavor('github')

const argv = yargs
  .option('port',
    {
      alias: 'p',
      description: 'port number to listen on',
      type: 'number',
      default: 8000,
    }
  ).option('alias',
    {
      alias: 'a',
      description: 'add a url alias (i.e. /static -> ../assets)',
      type: 'string',
      nargs: 2
    }
  ).option('root',
    {
      alias: 'r',
      description: 'set the document root (defaults to cwd())',
      type: 'string',
      default: process.cwd(),
    }
  ).option('style',
    {
      alias: 's',
      description: 'set the stylesheet URL for Markdown files',
      type: 'string',
      default: '/_ehmdserver/md.css',
    }
  ).help().alias('help', 'h').argv

// build a map for document locations
// start with aliases from the command line, if any
var docLocations = []
if (argv.alias) {
  for (i = 0; i < argv.alias.length; i += 2) {
    docLocations.push({
      'regex': new RegExp('^' + argv.alias[i]),
      'path': pathlib.resolve('./' + argv.alias[i + 1]),
    })
  }
}
// add the location of our internal resources
docLocations.push({
  'regex': new RegExp('^/_ehmdserver'),
  'path': __dirname,
})
// add the "docroot"
docLocations.push({
  'regex': new RegExp('^'),
  'path': argv.root,
})


function logRequest(req, rsp) {
  console.log(`${req.socket.remoteAddress} - - "${req.method} ${req.url}" ${rsp.statusCode} -`)
}


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
    return sendError(req, rsp, 404, "Not Found", `I couldn't resolve ${req.url}`)
  }
}


function resolveUrl(url) {
  for (i = 0; i < docLocations.length; i += 1) {
    if (docLocations[i].regex.test(url)) {
      return url.replace(docLocations[i].regex, docLocations[i].path)
    }
  }
}


function sendError(req, rsp, code, title, message) {
  rsp.writeHead(code, {'Content-Type': 'text/html'})
  rsp.end(`<html><body><h1>${code} ${title}</h1><p>${message}</p></body></html>`)
  logRequest(req, rsp)
  return true
}


function sendFile(req, rsp, path) {
  let ctype
  ext = path.split('/').slice(-1)[0].split('.').slice(-1)[0]
  switch (ext) {
    case 'css':
    case 'html':
      ctype = `text/${ext}`; break
    case 'gif':
    case 'jpeg':
    case 'png':
      ctype = `image/${ext}`; break
    case 'jpg':
      ctype = 'image/jpeg'; break
    case 'js':
      ctype = 'text/javascript'; break
    case 'md':
      return sendMarkdown(req, rsp, path)
    default:
      ctype = 'text/plain'
  }
  body = fs.readFileSync(path)
  rsp.writeHead(200,
    {
      'Content-Type': ctype,
      'Content-Length': Buffer.byteLength(body)
    }
  )
  rsp.end(body)
  logRequest(req, rsp)

  return true
}


function sendMarkdown(req, rsp, path) {
  body = fs.readFileSync(path, 'utf-8')
  converter = new showdown.Converter()
  html = '<html><head>'
    // + `<title>ehMDServer Presents...</title>`
    + `<link rel="stylesheet" href="${argv.style}"></style>`
    + '</head><body>'
    + converter.makeHtml(body)
    + "</body></html>";
  rsp.writeHead(200,
    {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html)
    }
  )
  rsp.end(html)
  logRequest(req, rsp)

  return true
}


const server = http.createServer((req, rsp) => {
  if (req.method !== "GET") {
    return sendError(
      req, rsp, 405, "Method Not Allowed",
      "Microserver only responds to GET requests."
    )
  }
  return resolvePath(req, rsp, resolveUrl(req.url))
})

server.listen(argv.port, "0.0.0.0", () => {
   console.log(`ehMDserver: running at http://localhost:${argv.port}/`)
})
