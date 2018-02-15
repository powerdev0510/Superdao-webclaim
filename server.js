var http = require('http');
var url = require('url');
var fs = require('fs');
http.createServer(function (req, res) {
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  path = url_parts.path;
  path = path == "/" ? 'index.html' : path.substring(1, path.length);

  fs.readFile(path, "binary", function (err, file) {
    if (err) {
      res.writeHead(500, {"Content-Type": "text/plain"});
      res.write(err + "\n");
      res.end();
      return;
    }

    res.writeHead(200, {"Content-Type": "text/html"});
    res.write(file, "binary");
    res.end();
  });
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');
