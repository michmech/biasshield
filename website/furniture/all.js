$(document).ready(function(){
  $(".screenshots").flickity({
    wrapAround: true,
    autoPlay: true,
  });
  window.setTimeout(function(){
    $(".screenshots").flickity("resize");
  }, 1000);
});
