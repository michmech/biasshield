const express=require("express");
const app=express();
const PORT=process.env.PORT||80;
const path=require("path");

//WWW redirect:
function wwwRedirect(req, res, next){
  if(/^[^\.]+\.[^\.]+$/.test(req.headers.host)){
    var newHost="www."+req.headers.host;
    return res.redirect(301, req.protocol+"://"+newHost+req.originalUrl);
  }
  next();
};
app.set("trust proxy", true);
app.use(wwwRedirect);

//Our static files:
app.use("/", express.static(path.join(__dirname, "furniture")));
app.use("/", express.static(path.join(__dirname, "icons")));

//Our views:
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs"); //http://ejs.co/

//Make sure requests don't have slashes at the end:
app.get(/^\/.*$/, function(req, res, next) {
  if(req.path.endsWith("/") && req.path!="/"){
    var url=req.path.replace(/\/$/, "");
    var qs=querystring.stringify(req.query).replace(/=$/, "");
    if(qs!="") url+="?"+qs;
    res.redirect(301, url);
  }
  else {
    next();
  }
});

//Home:
app.get("/", function(req, res){
  res.render("home.ejs", {
    isLocalhost: req.headers.host=="localhost",
  });
});


//404:
function do404(req, res){
  res.status(404).render("404.ejs", {});
}
app.use(do404);

//Start listening:
app.listen(PORT);
console.log("Process ID "+process.pid+" is now listening on port number "+PORT+".");
