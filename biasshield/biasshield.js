const DeBiasByUs={
  //IDs of source and target languages supported by debiasbyus: 
  langs: {
    "ar": 1,
    "zh": 2,
    "zh-CN": 2,
    "cs": 3,
    "da": 4,
    "nl": 5,
    "en": 6,
    "fr": 7,
    "de": 8,
    "el": 9,
    "it": 10,
    "ja": 11,
    "kk": 12,
    "fa": 13,
    "pl": 14,
    "pt": 16,
    "ro": 15,
    "ru": 17,
    "sl": 21,
    "es": 18,
    "tr": 19,
    "uk": 20,
  },

  //IDs of sites as understood by debiasbyus:
  sites: {
    "google": 1,
    "deepl": 2,
  },

  //URL at which to report a biased translation, with some fields prefilled:
  composeSubmitUrl: function(){
    let url=`https://debiasbyus.ugent.be/share/`;
    url+=`?srcLang=${DeBiasByUs.langs[BiasShield.lastScrapeResult.srcLang]}`;
    url+=`&srcText=${encodeURIComponent(BiasShield.lastScrapeResult.srcText)}`;
    url+=`&trgLang=${DeBiasByUs.langs[BiasShield.lastScrapeResult.trgLang]}`;
    url+=`&trgText=${encodeURIComponent(BiasShield.lastScrapeResult.trgText)}`;
    url+=`&site=${DeBiasByUs.sites[BiasShield.siteName]}`;
    return url;    
  },

  //URL at which to lookup a previously reported biased translation:
  composeLookupUrl: function(){
    let url=`https://debiasbyus.ugent.be/lookup/`;
    url+=`?srcLang=${DeBiasByUs.langs[BiasShield.lastScrapeResult.srcLang]}`;
    url+=`&srcText=${encodeURIComponent(BiasShield.lastScrapeResult.srcText)}`;
    url+=`&trgLang=${DeBiasByUs.langs[BiasShield.lastScrapeResult.trgLang]}`;
    url+=`&trgText=${encodeURIComponent(BiasShield.lastScrapeResult.trgText)}`;
    return url;    
  },

  //check whether the current translation has already been reported as biased:
  check: function(){
    window.setTimeout(function(){
      const isBiased=(BiasShield.lastScrapeResult.srcLang=="en" && BiasShield.lastScrapeResult.srcText=="I need a doctor." && BiasShield.lastScrapeResult.trgLang=="de" && BiasShield.lastScrapeResult.trgText=="Ich brauche einen Arzt.");
      const unbiasedVersion="Ich brauche ärtzliche Hilfe."; 
      if(isBiased) {
        BiasShield.setState("debiasbyus", "alreadyReported", true);
        BiasShield.el.querySelector("a.lookupReport").href=DeBiasByUs.composeLookupUrl();
        BiasShield.el.querySelector("span.unbias").style.display="inline";
        BiasShield.el.querySelector("span.ununbias").style.display="none";
        BiasShield.el.querySelector("span.unbias").addEventListener("click", function(){
          BiasShield.injectTranslation(unbiasedVersion);
          BiasShield.el.querySelector("span.unbias").style.display="none";
          BiasShield.el.querySelector("span.ununbias").style.display="inline";
        });
        BiasShield.el.querySelector("span.ununbias").addEventListener("click", function(){
          BiasShield.injectTranslation(BiasShield.lastScrapeResult.trgText);
          BiasShield.el.querySelector("span.unbias").style.display="inline";
          BiasShield.el.querySelector("span.ununbias").style.display="none";
        });
      } else {
        BiasShield.setState("debiasbyus", "notYetReported", false);
        BiasShield.el.querySelector("a.submitReport").href=DeBiasByUs.composeSubmitUrl();
      }
    }, 1000);
  },
};

const Fairslator={
  //language pairs supported by fairslator:
  langPairs: {
    "en-de": true,
    "en-fr": true,
    "en-cs": true,
    "en-ga": true,
  },
};

const BiasShield={
  //our DOM element <div class="pimp"> at the bottom of the screen:
  el: null,

  //which site are we on?
  siteName: "", //"google" or "deepl"

  //switch to a tab ("debiasbyus" or "fairslator"): 
  switchTab: function(nick){
    BiasShield.el.querySelectorAll(".tabs > .tab").forEach(el => {el.classList.remove("current")});
    BiasShield.el.querySelector(`.tabs > .tab.${nick}`).classList.add("current");
    BiasShield.el.querySelectorAll(".tabBodies > .tabBody").forEach(el => {el.style.display="none"});
    BiasShield.el.querySelector(`.tabBodies > .tabBody.${nick}`).style.display="block";
  },

  //set the state of a tab (whoNick = "debiasbyus" or "fairslator"): 
  setState: function(whoNick, stateNick, isTabLitUp){
    BiasShield.el.querySelectorAll(`.tabBody.${whoNick} .state`).forEach(el => { el.style.display="none"; });
    BiasShield.el.querySelectorAll(`.tabBody.${whoNick} .state.${stateNick}`).forEach(el => { el.style.display="block"; });
    if(isTabLitUp) BiasShield.el.querySelector(`.tab.${whoNick}`).classList.remove("off");
    else BiasShield.el.querySelector(`.tab.${whoNick}`).classList.add("off");
  },

  //tell us what's on the screen:
  scrapeScreen: function(){
    const ret={
      srcLang: "",
      srcText: "",
      trgLang: "",
      trgText: "",
    };
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

  //called every two seconds to see if the screen state has changed:
  lastScrapeResult: {},
  check: function(){
    console.log("checking...");
    try{
      const scrapeResult=BiasShield.scrapeScreen();
      if(scrapeResult.srcLang==BiasShield.lastScrapeResult.srcLang
      && scrapeResult.srcText==BiasShield.lastScrapeResult.srcText
      && scrapeResult.trgLang==BiasShield.lastScrapeResult.trgLang
      && (scrapeResult.trgText==BiasShield.lastScrapeResult.trgText || scrapeResult.trgText==BiasShield.injectedTranslation)
      ){
        console.log("no change");
      } else {
        console.log("yes change", scrapeResult);
        BiasShield.lastScrapeResult=scrapeResult;
        
        //determine the state of debiasbyus:
        if(!scrapeResult.trgText){
          BiasShield.setState("debiasbyus", "noTranslation", false);
        } else if(!DeBiasByUs.langs[scrapeResult.srcLang] || !DeBiasByUs.langs[scrapeResult.trgLang]) {
          BiasShield.setState("debiasbyus", "unsupportedLanguagPair", false);
        } else {
          BiasShield.setState("debiasbyus", "checking", false);
          DeBiasByUs.check();
        }
        
        //determine the state of fairslator:
        if(!scrapeResult.trgText){
          BiasShield.setState("fairslator", "noTranslation", false);
        } else if(!Fairslator.langPairs[`${scrapeResult.srcLang}-${scrapeResult.trgLang}`]) {
          BiasShield.setState("fairslator", "unsupportedLanguagPair", false);
        } else {
          BiasShield.setState("fairslator", "detectingAmbiguities", false);
        }
      }
      window.setTimeout(BiasShield.check, 2000);
    } catch(err){
      console.log(err);
    }
  },

  //insert a translation into the screen:
  injectedTranslation: "",
  injectTranslation: function(text){
    if(this.siteName=="google"){
      trgText=document.querySelector("span.ryNqvb").innerText=text;
    }
    else if(this.siteName=="deepl"){
      document.querySelectorAll("#target-dummydiv").forEach(el => {el.textContent=text});
      document.querySelectorAll("section.lmt__side_container--target p").forEach(el => {el.textContent=text});
    }
    BiasShield.injectedTranslation=text;
  }
};
//everything beyond this point runs once when the extension is being loaded

//discover which site we are on, google or deepl:
if(/translate\.google\.com$/.test(window.location.hostname)) BiasShield.siteName="google";
else if(/www\.deepl\.com$/.test(window.location.hostname)) BiasShield.siteName="deepl";

//create our DOM element:
document.querySelectorAll("div.biasshield").forEach(el => el.remove());
BiasShield.el=document.createElement("div");
BiasShield.el.classList.add("biasshield");

//populate our DOM element:
BiasShield.el.innerHTML=`
  <div class="tabs">
    <div tabindex="0" class="tab debiasbyus off current" title="DeBiasByUs"></div>
    <div tabindex="0" class="tab fairslator off" title="Fairslator"></div>
    <div class="status"></div>
  </div>
  <div class="tabBodies">
    <div class="identity"><a class="identity" href="https://www.biasshield.org/" target="_blank">Bias Shield</a></div>
    <div class="tabBody debiasbyus">
  
      <!--debiasbysus: when we haven't detected any translation-->
      <div class="state noTranslation">
        <div class="status">
          No translation found.
          <span class="substatus">Translate something to see options here for reporting a gender-biased translation.</span>
        </div>
      </div>

      <!--debiasbysus: when the translation is an unsupported language pair-->
      <div class="state unsupportedLanguagPair" style="display: none">
        <div class="status">
          This translation is in an unsupported language pair.
          <span class="substatus">Visit <a href="https://debiasbyus.ugent.be/">DeBiasByUs</a> for a list of languages we support.</span>
        </div>
      </div>

      <!--debiasbysus: while we are detecting ambiguities-->
      <div class="state checking" style="display: none">
        <div class="status">
          <span class="waiter"></span>
          Checking the translation...
        </div>
      </div>

      <!--debiasbysus: when this translation has already been reported as biased-->
      <div class="state alreadyReported" style="display: none">
        <div class="status">
          <span class="icon warning red"></span> This translation has previously been reported as gender-biased.
          <span class="action unbias">Unbias</span>
          <span class="action ununbias">Original</span>
          <a class="lookupReport" target="_blank" href="#">Details...</a>
        </div>
      </div>

      <!--debiasbysus: when this translation has not yet been reported as biased-->
      <div class="state notYetReported" style="display: none">
        <div class="status">
          <span class="icon check grey"></span> This translation has not previously been reported as gender-biased.
          <a class="action submitReport" target="_blank" href="https://debiasbyus.ugent.be/share/">Report</a>
          <a target="_blank" href="https://debiasbyus.ugent.be/learn/">About gender bias...</a>
        </div>
      </div>

    </div>
    <div class="tabBody fairslator" style="display: none">

    <!--fairslator: when we haven't detected any translation-->
      <div class="state noTranslation">
        <div class="status">
          No translation found.
          <span class="substatus">Translate something to see options here for correcting a biased translation.</span>
        </div>
      </div>

      <!--fairslator: when the translation is an unsupported language pair-->
      <div class="state unsupportedLanguagPair" style="display: none">
        <div class="status">
          This translation is in an unsupported language pair.
          <span class="substatus">Visit <a href="https://www.fairslator.com/">Fairslator</a> for a list of languages we support.</span>
        </div>
      </div>

      <!--fairslator: while we are detecting ambiguities-->
      <div class="state detectingAmbiguities" style="display: none">
        <div class="status">
          <span class="waiter"></span>
          Detecting ambiguities...
        </div>
      </div>

    </div>
  </div>
`;

//attach click events to tabs:
BiasShield.el.querySelectorAll(".tabs > .tab").forEach(el => {
  el.addEventListener("click", function(e){
    if(e.target.classList.contains("debiasbyus")) BiasShield.switchTab("debiasbyus");
    if(e.target.classList.contains("fairslator")) BiasShield.switchTab("fairslator");
  });
});

//attach our DOM element to the DOM:
document.body.style.paddingBottom="400px";
document.body.appendChild(BiasShield.el);

//start checking for screen changes every two seconds: 
console.log("I'm here.");
BiasShield.check();