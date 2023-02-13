//Hi, you should run me in Node.js

const fs=require("fs");
const path=require("path");

function copyFolderSync(from, to) {
  if(fs.existsSync(to)) fs.rmdirSync(to, {recursive: true});
  fs.mkdirSync(to);
  fs.readdirSync(from).forEach(element => {
      if (fs.lstatSync(path.join(from, element)).isFile()) {
          fs.copyFileSync(path.join(from, element), path.join(to, element));
      } else {
          copyFolderSync(path.join(from, element), path.join(to, element));
      }
  });
}

//build for Chrome: 
copyFolderSync("browser-extension", "built_for_chrome");
fs.unlinkSync("built_for_chrome/manifest_firefox.json");
fs.unlinkSync("built_for_chrome/manifest.json");
fs.renameSync("built_for_chrome/manifest_chrome.json", "built_for_chrome/manifest.json")

//build for Firefox: 
copyFolderSync("browser-extension", "built_for_firefox");
fs.unlinkSync("built_for_firefox/manifest_chrome.json");
fs.unlinkSync("built_for_firefox/manifest.json");
fs.renameSync("built_for_firefox/manifest_firefox.json", "built_for_firefox/manifest.json")
let txt=fs.readFileSync("built_for_firefox/biasshield.css", "utf8");
  txt=txt.replace(/chrome-extension:\/\/__MSG_@@extension_id__\//g, "");
  fs.writeFileSync("built_for_firefox/biasshield.css", txt, "utf8");
