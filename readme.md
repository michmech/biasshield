# Bias Shield

## Docs

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions

## Installing

In Firefox: Open the `about:debugging` page, click the *This Firefox* option, click the *Load Temporary Add-on* button, then select any file in your extension's directory. The extension now installs, and remains installed until you restart Firefox.

## Credits

Shield icon: https://thenounproject.com/icon/shield-5472411/

## States

debiasbyus
- noTranslation => tab off
- unsupportedLanguagPair => tab off
- offerToReport
- ...

fairslator
- noTranslation => tab off
- unsupportedLanguagePair => tab off
- detectingAmbiguities => tab off
- ...

## Cross-browser shit

Background images in CSS:
- Firefox: `background-image: url('images/main.png');`
- Chrome: `background-image: url('chrome-extension://__MSG_@@extension_id__/images/main.png');`
