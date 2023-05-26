let browserOrChrome=null;
if(!browserOrChrome) try { browserOrChrome=browser; } catch(err) {}
if(!browserOrChrome) try { browserOrChrome=chrome; } catch(err) {}

const DeBiasByUs={
  //IDs of source and target languages supported by debiasbyus: 
  langs: {
    "ar": "ar",
    "zh": "zh",
    "zh-CN": "zh",
    "cs": "cs",
    "da": "da",
    "nl": "nl",
    "en": "en",
    "fr": "fr",
    "de": "de",
    "el": "el",
    "it": "it",
    "ja": "ja",
    "kk": "kk",
    "fa": "fa",
    "pl": "pl",
    "pt": "pt",
    "ro": "ro",
    "ru": "ru",
    "sl": "sl",
    "es": "es",
    "tr": "tr",
    "uk": "uk",
  },

  //IDs of sites as understood by debiasbyus:
  sites: {
    "google": "gt",
    "deepl": "dl",
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

  //URL at which to check for debiased translations:
  composeCheckUrl: function(){
    let url=`https://debiasbyus.ugent.be/check/`;
    url+=`?srcLang=${DeBiasByUs.langs[BiasShield.lastScrapeResult.srcLang]}`;
    url+=`&srcText=${encodeURIComponent(BiasShield.lastScrapeResult.srcText)}`;
    url+=`&trgLang=${DeBiasByUs.langs[BiasShield.lastScrapeResult.trgLang]}`;
    url+=`&trgText=${encodeURIComponent(BiasShield.lastScrapeResult.trgText)}`;
    return url;    
  },

  //check whether the current translation has already been reported as biased:
  unbiasedVersions: [],
  unbiasedVersionIndex: 0,
  check: function(){
    const url=DeBiasByUs.composeCheckUrl();
    //console.log(url);
    browserOrChrome.runtime.sendMessage({contentScriptQuery: 'fetchJson', url: url}, json => {
      //json={reported: true, suggestions: ["Suggestion one.", "Suggestion two."]};
      //console.log(json);
      let isBiased=json.reported;
      DeBiasByUs.unbiasedVersionIndex=0;
      DeBiasByUs.unbiasedVersions=json.suggestions;
      if(isBiased) {
        BiasShield.setState("debiasbyus", "alreadyReported", true);
        if(DeBiasByUs.unbiasedVersions.length>0){
          BiasShield.el.querySelector("span.unbias").style.display="inline";
          BiasShield.el.querySelector("a.submitReport span.submitFirst").style.display="none";
          BiasShield.el.querySelector("a.submitReport span.submitAnother").style.display="inline";
        } else {
          BiasShield.el.querySelector("span.unbias").style.display="none";
          BiasShield.el.querySelector("a.submitReport span.submitFirst").style.display="inline";
          BiasShield.el.querySelector("a.submitReport span.submitAnother").style.display="none";
        }
        BiasShield.el.querySelector("span.ununbias").style.display="none";
        BiasShield.el.querySelector("span.unbias").addEventListener("click", function(){
          BiasShield.injectTranslation(DeBiasByUs.unbiasedVersions[DeBiasByUs.unbiasedVersionIndex]);
          if(DeBiasByUs.unbiasedVersions.length>1){
            BiasShield.el.querySelector("span.unbiasedVersion").innerHTML=`${DeBiasByUs.unbiasedVersionIndex+1}/${DeBiasByUs.unbiasedVersions.length}&nbsp;`;
          }
          DeBiasByUs.unbiasedVersionIndex++;
          if(DeBiasByUs.unbiasedVersionIndex>=DeBiasByUs.unbiasedVersions.length) {
            DeBiasByUs.unbiasedVersionIndex=0;
            BiasShield.el.querySelector("span.unbias").style.display="none";
            BiasShield.el.querySelector("span.ununbias").style.display="inline";
          }
        });
        BiasShield.el.querySelector("span.ununbias").addEventListener("click", function(){
          BiasShield.injectTranslation(BiasShield.lastScrapeResult.trgText);
          BiasShield.el.querySelector("span.unbias").style.display="inline";
          BiasShield.el.querySelector("span.ununbias").style.display="none";
          BiasShield.el.querySelector("span.unbiasedVersion").innerText="";
        });
      } else {
        BiasShield.setState("debiasbyus", "notYetReported", false);
      }
      BiasShield.el.querySelectorAll("a.submitReport").forEach(el=>{el.href=DeBiasByUs.composeSubmitUrl()});
    });
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

  //detect ambiguities in a translation:
  analyze: function(){
    let url="https://xrayapi20220103180040.azurewebsites.net/analyze.json";
    url+=`?srcLang=${BiasShield.lastScrapeResult.srcLang}`;
    url+=`&srcText=${encodeURIComponent(BiasShield.lastScrapeResult.srcText)}`;
    url+=`&trgLang=${BiasShield.lastScrapeResult.trgLang}`;
    url+=`&trgText=${encodeURIComponent(BiasShield.lastScrapeResult.trgText)}`;
    //console.log(url);
    browserOrChrome.runtime.sendMessage({contentScriptQuery: 'fetchJson', url: url}, json => {
      //console.log(json);
      const axes=json.axes;
      //console.log(axes);
      if(Object.keys(axes).length==0){
        BiasShield.setState("fairslator", "noAmbiguitiesDetected", false);
      } else {
        BiasShield.setState("fairslator", "ambiguitiesDetected", true);
        Fairslator.axes=axes;
        Fairslator.drawAmbiguities();
      }
    });
  },
  axes: {},

  //draw the disambiguators that users are going to select from:
  drawAmbiguities: function(){
    let fairslatorUrl="https://www.fairslator.com/";
      fairslatorUrl+=`?machine=${BiasShield.siteName}`;
      fairslatorUrl+=`&srcLang=${BiasShield.lastScrapeResult.srcLang}`;
      fairslatorUrl+=`&trgLang=${BiasShield.lastScrapeResult.trgLang}`;
      fairslatorUrl+=`&text=${encodeURIComponent(BiasShield.lastScrapeResult.srcText)}`;
      BiasShield.el.querySelector("a.takeItToFairslator").href=fairslatorUrl;
    const container=BiasShield.el.querySelector(".disambiguators");
    container.innerHTML=`<span class="waiter"></span>`;
    for(const axisKey in Fairslator.axes){
      const axis=Fairslator.axes[axisKey];
      let title="";
        if(axisKey==1) title="Who is saying it?";
        if(axisKey==2) title="Who are you saying it to?";
        if(axisKey>=3){
          if(axis.current.indexOf("s")>-1 && axis.descriptor) title=`Who is the ${axis.descriptor}?`;
          if(axis.current.indexOf("s")>-1 && !axis.descriptor) title=`Who is it?`;
          if(axis.current.indexOf("p")>-1 && axis.descriptor) title=`Who are the ${axis.descriptor}?`;
          if(axis.current.indexOf("p")>-1 && !axis.descriptor) title=`Who are they?`;
        }
      
      let html=`
        <div class="disambiguator">
          <div class="title">${title}</div>
      `;
      const ambiguities=axis.ambiguity.split("|");
      for(let i=0; i<ambiguities.length; i++){
        const val=ambiguities[i];
        html+=`<div class="option"><label><input type="radio" ${val==axis.current ? "checked" : ""} name="${axisKey}" value="${val}"/> ${Fairslator.getDisambigLabel(val)}</label></div>`;
      }
      html+=`
        </div>
      `;
      container.innerHTML+=html;
    }
    container.querySelectorAll("input").forEach(el => {
      el.addEventListener("change", function(){
        Fairslator.reinflect();
      });
    });
  },

  //harvest the user's manual disambiguations and reinflect the translation:
  reinflect: function(){
    const axes={};
    BiasShield.el.querySelectorAll(".disambiguators input").forEach(el => {
      if(el.checked){
        const name=el.getAttribute("name");
        const value=el.getAttribute("value");
        if(Fairslator.axes[name].current!=value) axes[name]=value;
      }
    });
    if(Object.keys(axes)==0){
      BiasShield.injectTranslation(BiasShield.lastScrapeResult.trgText);
    } else {
      let url="https://xrayapi20220103180040.azurewebsites.net/reinflect.json";
      url+=`?srcLang=${BiasShield.lastScrapeResult.srcLang}`;
      url+=`&srcText=${encodeURIComponent(BiasShield.lastScrapeResult.srcText)}`;
      url+=`&trgLang=${BiasShield.lastScrapeResult.trgLang}`;
      url+=`&trgText=${encodeURIComponent(BiasShield.lastScrapeResult.trgText)}`;
      for(const axisKey in axes){
        url+=`&axes[${axisKey}]=${axes[axisKey]}`
      }
      //console.log(url);
      BiasShield.el.querySelector("div.disambiguators span.waiter").style.visibility="visible";
      chrome.runtime.sendMessage({contentScriptQuery: 'fetchJson', url: url}, json => {
        BiasShield.el.querySelector("div.disambiguators span.waiter").style.visibility="hidden";
        if(json.text) BiasShield.injectTranslation(json.text);
      });
    }
  },

  getDisambigLabel: function(code){
    const labels={
      "sm": "a man",
      "sf": "a woman",
      "sb": "a person of unspecified gender",
      "pm": "a group of men",
      "pf": "a group of women",
      "pb": "a mixed-gender group",
      "s": "one person",
      "ts": "one person, addressed casually",
      "tsm": "a man, addressed casually",
      "tsf": "a woman, addressed casually",
      "tsb": "a person of unspecified gender, addressed casually",
      "vs": "one person, addressed politely",
      "vsm": "a man, addressed politely",
      "vsf": "a woman, addressed politely",
      "vsb": "a person of unspecified gender, addressed politely",
      "p": "more than one person",
      "tp": "more than one person, addressed casually",
      "tpm": "a group of men, addressed casually",
      "tpf": "a group of women, addressed casually",
      "tpf": "a mixed-gender group, addressed casually",
      "vp": "more than one person, addressed politely",
      "vpm": "a group of men, addressed politely",
      "vpf": "a group of women, addressed politely",
      "vpb": "a mixed-gender group, addressed politely",
    };
    return labels[code] || code;
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
      document.querySelectorAll("span.ryNqvb").forEach(el => {
        if(ret.trgText) ret.trgText+=" ";
        ret.trgText+=el.innerText.trim()
      });
      if(ret.srcLang=="auto"){
        //if(document.querySelector("body").innerHTML.indexOf("English - detected")>-1) ret.srcLang="en";
        const text=document.querySelector("div.ooArgc").textContent; //eg. "English - detected"
        if(text.indexOf(" - ")>-1){
          const langName=text.split(" - ")[0].toLowerCase(); //eg. "english"
          document.querySelectorAll("span.VfPpkd-AznF2e-LUERP-bN97Pc button").forEach(el => {
            if(el.hasAttribute("data-language-code") && el.innerText.toLowerCase().trim()==langName){
              ret.srcLang=el.getAttribute("data-language-code");
            }
          });
        }
      } 
    } else if(this.siteName=="deepl"){
      const fields=window.location.hash.replace(/^\#/, "").split("/");
      if(fields[0]) ret.srcLang=fields[0];
      if(fields[1]) ret.trgLang=fields[1];
      if(fields[2]) ret.srcText=decodeURIComponent(fields[2]).trim();
      // document.querySelectorAll("#target-dummydiv").forEach(el => {ret.trgText=el.textContent.trim()});
      document.querySelectorAll("section.lmt__side_container--target p").forEach(el => {ret.trgText=el.textContent.trim()});
    }
    return ret;
  },

  //called every two seconds to see if the screen state has changed:
  lastScrapeResult: {},
  check: function(){
    //console.log("checking...");
    try{
      const scrapeResult=BiasShield.scrapeScreen();
      if(scrapeResult.srcLang==BiasShield.lastScrapeResult.srcLang
      && scrapeResult.srcText==BiasShield.lastScrapeResult.srcText
      && scrapeResult.trgLang==BiasShield.lastScrapeResult.trgLang
      && (scrapeResult.trgText==BiasShield.lastScrapeResult.trgText || scrapeResult.trgText==BiasShield.injectedTranslation)
      ){
        //console.log("no change");
      } else {
        //console.log("yes change", scrapeResult);
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
          Fairslator.analyze();
        }
      }
    } catch(err){
      //console.log(err);
      BiasShield.lastScrapeResult={};
    }
    window.setTimeout(BiasShield.check, 2000);
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
    <span tabindex="0" class="minimize" title="Minimize Bias Shield"></span>
  </div>
  <span tabindex="0" class="maximize" title="Show Bias Shield"></span>
  <div class="tabBodies">
    <div class="identity">
      <a class="identity" href="https://www.biasshield.org/" target="_blank">Bias Shield</a>
    </div>
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
          <span class="action ununbias">Back to original</span>
          <span class="unbiasedVersion"></span>
          <a class="submitReport" target="_blank" href="#">
            <span class="submitFirst">Suggest an unbiased version...</span>
            <span class="submitAnother">Submit your own suggestion...</span>
          </a>
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

      <!--fairslator: we have detected no ambiguities-->
      <div class="state noAmbiguitiesDetected" style="display: none">
        <div class="status">
          <span class="icon check grey"></span> No ambiguity detected.
        </div>
      </div>

      <!--fairslator: we have detected some ambiguities-->
      <div class="state ambiguitiesDetected" style="display: none">
        <div class="status">
          <span class="icon warning red"></span> Ambiguity detected.
          <a class="takeItToFairslator" target="_blank" href="#">Open in Fairslator...</a>
        </div>
        <div class="disambiguators"></div>
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

//attach click evens to the minimize/maximize buttons:
BiasShield.el.querySelectorAll(".minimize").forEach(el => {
  el.addEventListener("click", function(e){
    BiasShield.el.classList.add("minimized");
  });
});
BiasShield.el.querySelectorAll(".maximize").forEach(el => {
  el.addEventListener("click", function(e){
    BiasShield.el.classList.remove("minimized");
  });
});

//attach our element to the DOM:
document.body.style.paddingBottom="400px";
document.body.appendChild(BiasShield.el);

//start checking for screen changes every two seconds: 
//console.log("I'm here.");
BiasShield.check();