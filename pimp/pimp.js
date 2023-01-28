const DeBiasByUs={
  srcLangs: ["en"],
  trgLangs: ["de", "nl"],
};

const Fairslator={
  srcLangs: ["en"],
  trgLangs: ["de", "fr", "cs", "ga"],
};

const Pimp={
  el: null,
  siteName: "",

  switchTab: function(nick){
    Pimp.el.querySelectorAll(".tabs > .tab").forEach(el => {el.classList.remove("current")});
    Pimp.el.querySelector(`.tabs > .tab.${nick}`).classList.add("current");
    Pimp.el.querySelectorAll(".tabBodies > .tabBody").forEach(el => {el.style.display="none"});
    Pimp.el.querySelector(`.tabBodies > .tabBody.${nick}`).style.display="block";
  },
  setState: function(whoNick, stateNick, isTabLitUp){
    Pimp.el.querySelectorAll(`.tabBody.${whoNick} .state`).forEach(el => { el.style.display="none"; });
    Pimp.el.querySelectorAll(`.tabBody.${whoNick} .state.${stateNick}`).forEach(el => { el.style.display="block"; });
    if(isTabLitUp) Pimp.el.querySelector(`.tab.${whoNick}`).classList.remove("off");
    else Pimp.el.querySelector(`.tab.${whoNick}`).classList.add("off");
  },

  scrapeScreen: function(){
    const ret={};
    if(this.siteName=="google"){
      const params=new URLSearchParams(window.location.search);
      if(params && params.get) ret.srcLang=params.get("sl");
      if(params && params.get) ret.trgLang=params.get("tl");
      if(params && params.get) ret.srcText=(params.get("text") || "").trim();
      document.querySelectorAll("span.ryNqvb").forEach(el => {ret.trgText=el.innerText.trim()});
    } else if(this.siteName=="deepl"){
      const fields=window.location.hash.replace(/^\#/, "").split("/");
      if(fields[0]) ret.srcLang=fields[0];
      if(fields[1]) ret.trgLang=fields[1];
      if(fields[2]) ret.srcText=decodeURIComponent(fields[2]).trim();
      document.querySelectorAll("#target-dummydiv").forEach(el => {ret.trgText=el.textContent.trim()});
    }
    return ret;
  },

  lastScrapeResult: {},
  check: function(){
    console.log("checking...");
    try{
      const scrapeResult=Pimp.scrapeScreen();
      if(JSON.stringify(scrapeResult)==JSON.stringify(Pimp.lastScrapeResult)){
        console.log("no change");
      } else {
        console.log("yes change", scrapeResult);
        Pimp.lastScrapeResult=scrapeResult;
        //determine the state of DeBiasByUs:
        if(!scrapeResult.trgText){
          Pimp.setState("debiasbyus", "noTranslation", false);
        } else if(DeBiasByUs.srcLangs.indexOf(scrapeResult.srcLang)==-1 || DeBiasByUs.trgLangs.indexOf(scrapeResult.trgLang)==-1) {
          Pimp.setState("debiasbyus", "unsupportedLanguagPair", false);
        } else {
          Pimp.setState("debiasbyus", "offerToReport", true);
        }
        //determine the state of Fairslator:
        if(!scrapeResult.trgText){
          Pimp.setState("fairslator", "noTranslation", false);
        } else if(Fairslator.srcLangs.indexOf(scrapeResult.srcLang)==-1 || Fairslator.trgLangs.indexOf(scrapeResult.trgLang)==-1) {
          Pimp.setState("fairslator", "unsupportedLanguagPair", false);
        } else {
          Pimp.setState("fairslator", "detectingAmbiguities", false);
        }
      }
      window.setTimeout(Pimp.check, 2000);
    } catch(err){
      console.log(err);
    }
  },

  injectTranslation: function(text){
    if(this.siteName=="google"){
      trgText=document.querySelector("span.ryNqvb").innerText=text;
    }
    else if(this.siteName=="deepl"){
      document.querySelector("textarea.lmt__target_textarea").value=text;
    }
  }
};

if(/translate\.google\.com$/.test(window.location.hostname)) Pimp.siteName="google";
else if(/www\.deepl\.com$/.test(window.location.hostname)) Pimp.siteName="deepl";

document.querySelectorAll("div.pimp").forEach(el => el.remove());
Pimp.el=document.createElement("div");
Pimp.el.classList.add("pimp");
Pimp.el.innerHTML=`
  <div class="tabs">
    <div tabindex="0" class="tab debiasbyus off current" title="DeBiasByUs"></div>
    <div tabindex="0" class="tab fairslator off" title="Fairslator"></div>
    <div class="status"></div>
  </div>
  <div class="tabBodies">
    <div class="identity"><a class="identity" href="https://www.biasshield.org/" target="_blank">Bias Shield</a></div>
    
    <div class="tabBody debiasbyus">
      <div class="state noTranslation">
        <div class="status">
          No translation detected.
          <span class="substatus">Translate something to see options here for reporting a gender-biased translation.</span>
        </div>
      </div>
      <div class="state unsupportedLanguagPair" style="display: none">
        <div class="status">
          This translation is in an unsupported language pair.
          <span class="substatus">Visit <a href="https://debiasbyus.ugent.be/">DeBiasByUs</a> for a list of languages we support.</span><
        </div>
      </div>
      <div class="state offerToReport" style="display: none">
        <div class="status">
          <span class="action" tabindex="0">Report a gender-biased translation</span>
          <a href="https://debiasbyus.ugent.be/learn/">What is a gender-biased translation?</a>
        </div>
      </div>
    </div>
    
    <div class="tabBody fairslator" style="display: none">
      <div class="state noTranslation">
        <div class="status">
          No translation detected.
          <span class="substatus">Translate something to see options here for correcting a biased translation.</span>
        </div>
      </div>
      <div class="state unsupportedLanguagPair" style="display: none">
        <div class="status">
          This translation is in an unsupported language pair.
          <span class="substatus">Visit <a href="https://www.fairslator.com/">Fairslator</a> for a list of languages we support.</span><
        </div>
      </div>
      <div class="state detectingAmbiguities" style="display: none">
        <div class="status">
          <span class="waiter"></span>
          Detecting ambiguities...
        </div>
      </div>
    </div>
    
  </div>
`;
Pimp.el.querySelectorAll(".tabs > .tab").forEach(el => {
  el.addEventListener("click", function(e){
    if(e.target.classList.contains("debiasbyus")) Pimp.switchTab("debiasbyus");
    if(e.target.classList.contains("fairslator")) Pimp.switchTab("fairslator");
  });
});
document.body.style.paddingBottom="400px";
document.body.appendChild(Pimp.el);

console.log("I'm here.");
Pimp.check();