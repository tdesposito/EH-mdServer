# EH-mdServer - a minimalist web server

This is a very simple web server which somewhat emulates GitPages for local
development.

## Installation

```console
$ git clone https://github.com/tdesposito/EH-mdServer.git
$ cd EH-mdServer
$ npm install
$ npm link
```

## Usage
```console
$ cd /my/project/dir
$ ehmdserver --port 3030 --root ./docs --alias /src ./src
EH-mdServer: running at http://localhost:3030
```

## Command Line Options

| Option | Operation |
| -- | -- |
| --port, -p  | port number to listen on (default: 8000) |
| --alias, -a | add a url alias (see below) |
| --root, -r  | set the document root (defaults to cwd()) |
| --style, -s | set the stylesheet url for Markdown files (see more below) |
| --help, -h | display help |
| --version | displays the server version |

## Document Root and URL Aliases
By default, we look for all files in the current directory (where you started
the server, not where the server is installed).

If you want to specify the document root, use `--root /some/absolute/dir` or
`--root ./some/relative/dir`.

If hrefs (or Markdown links) in your source files reference things not under the
document root (such as your project's source files), you can add one or more URL
aliases to map URL prefixes to alternate file locations.

A common project might look like:

```
/projectdir
  +- /src
     |- index.js
     |- utility.js
     |- README.md
  +- /docs
     +- index.md
     +- demo.html
```

If you start the server as `ehmdserver --root ./docs` from the project
directory, references to `/demo.html` inside of `index.md` will resolve
correctly, since they share a document root. A reference to `../src/README.md`
would fail; the `../` collapses and the browser will look for the README.md file
as `/src/README.md`.

To solve this, use:

`ehmdserver --root ./docs --alias /src ./src`

## Styling Rendered Markdown

We add a [simple CSS stylesheet](/md.css) to our rendered Markdown files. You
can override this by providing a (relative or absolute) URL for your preferred
stylesheet on the command line, such as `ehmdserver --style /static/my.css`.
