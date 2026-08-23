// Imposter ("جاسوس") game: setup, secret-word/role reveal, timer, results.
(function(){
  var Juju = window.Juju;

  Juju.registerScreen('setup', document.getElementById('screen-setup'));
  Juju.registerScreen('reveal', document.getElementById('screen-reveal'));
  Juju.registerScreen('play', document.getElementById('screen-play'));
  Juju.registerScreen('results', document.getElementById('screen-results'));

  Juju.registerGame('imposter', {
    tileId: 'tile-imposter',
    title: '🎭 جاسوس <span class="en-sub">(Imposter)</span>',
    setupScreen: 'setup',
    infoHtml: 'هر بازیکن به نوبت یک <b>کلمه یا جمله کوتاه</b> درباره‌ی کلمه‌ی مخفی می‌گوید، ' +
      'بدون اینکه مستقیم آن را لو بدهد.<br><br>' +
      'جاسوس‌ها باید خودشان را جا بزنند و کلمه را حدس بزنند.<br><br>' +
      'بقیه باید با رأی‌گیری، جاسوس را پیدا کنند.'
  });

  document.getElementById('btn-back-games').addEventListener('click', Juju.goToGames);

  // ---------- DATA ----------
  var CATEGORY_KEY = "پایه";

  // Word list is base64-obfuscated so it doesn't show up as plain text in
  // "View Page Source" for curious players. Only decoded at runtime.
  function b64DecodeUnicode(str){
    return decodeURIComponent(Array.prototype.map.call(atob(str), function(c){
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  var WORDS_B64 = "W3sidyI6Itm+24zYqtiy2KciLCJwIjoiUGVldHrEgSDCtyBQaXp6YSIsImUiOiLwn42VIiwiaCI6ImZvb2QifSx7InciOiLYs9mI2LTbjCIsInAiOiJTdXNoaSIsImUiOiLwn42jIiwiaCI6ImZvb2QifSx7InciOiLaqdio2KfYqCIsInAiOiJLYWLEgWIgwrcgS2ViYWIiLCJlIjoi8J+NoiIsImgiOiJmb29kIn0seyJ3Ijoi2KLYqNqv2YjYtNiqIiwicCI6IsSAYmd1c2h0IMK3IExhbWIgU3RldyIsImUiOiLwn42yIiwiaCI6ImZvb2QifSx7InciOiLZh9mF2KjYsdqv2LEiLCJwIjoiSGFtYnVyZ2VyIiwiZSI6IvCfjZQiLCJoIjoiZm9vZCJ9LHsidyI6ItmE2KfYstin2YbbjNinIiwicCI6IkzEgXrEgW55xIEgwrcgTGFzYWduYSIsImUiOiLwn42dIiwiaCI6ImZvb2QifSx7InciOiLZgdmE2KfZgdmEIiwicCI6IkZlbMSBZmVsIMK3IEZhbGFmZWwiLCJlIjoi8J+nhiIsImgiOiJmb29kIn0seyJ3Ijoi2YLZiNix2YXZh+KAjNiz2KjYstuMIiwicCI6Ikdob3JtZSBTYWJ6aSDCtyBIZXJiIFN0ZXciLCJlIjoi8J+NmyIsImgiOiJmb29kIn0seyJ3Ijoi2LPYp9mG2K/ZiNuM2oYiLCJwIjoiU8SBbmRldmljaCDCtyBTYW5kd2ljaCIsImUiOiLwn6WqIiwiaCI6ImZvb2QifSx7InciOiLYs9in2YTYp9ivIiwicCI6IlPEgWzEgWQgwrcgU2FsYWQiLCJlIjoi8J+llyIsImgiOiJmb29kIn0seyJ3Ijoi2LPZiNm+IiwicCI6IlN1cCDCtyBTb3VwIiwiZSI6IvCfjZwiLCJoIjoiZm9vZCJ9LHsidyI6Itm+2KfYs9iq2KciLCJwIjoiUMSBc3TEgSDCtyBQYXN0YSIsImUiOiLwn42dIiwiaCI6ImZvb2QifSx7InciOiLYr9mI2YbYp9iqIiwicCI6IkRvbsSBdCDCtyBEb251dCIsImUiOiLwn42pIiwiaCI6ImZvb2QifSx7InciOiLYqNiz2KrZhtuMIiwicCI6IkJhc3RhbmkgwrcgSWNlIENyZWFtIiwiZSI6IvCfjaYiLCJoIjoiZm9vZCJ9LHsidyI6Itqp24zaqSIsInAiOiJLZXlrIMK3IENha2UiLCJlIjoi8J+OgiIsImgiOiJmb29kIn0seyJ3Ijoi2LLZiNmE2KjbjNinIiwicCI6Ilp1bGJpxIEgwrcgUGVyc2lhbiBTd2VldCIsImUiOiLwn42lIiwiaCI6ImZvb2QifSx7InciOiLYtNuM2LEiLCJwIjoiU2hpciDCtyBMaW9uIiwiZSI6IvCfpoEiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2KjYqNixIiwicCI6IkJhYnIgwrcgVGlnZXIiLCJlIjoi8J+QryIsImgiOiJhbmltYWwifSx7InciOiLZgduM2YQiLCJwIjoiRmlsIMK3IEVsZXBoYW50IiwiZSI6IvCfkJgiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2LLYsdin2YHZhyIsInAiOiJaYXLEgWZlIMK3IEdpcmFmZmUiLCJlIjoi8J+mkiIsImgiOiJhbmltYWwifSx7InciOiLZvtmG2q/ZiNim2YYiLCJwIjoiUGVuZ3VcdTAwMjdlbiDCtyBQZW5ndWluIiwiZSI6IvCfkKciLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2qnYp9mG2q/ZiNix2YgiLCJwIjoiS8SBbmdvcm8gwrcgS2FuZ2Fyb28iLCJlIjoi8J+mmCIsImgiOiJhbmltYWwifSx7InciOiLYp9iz2KgiLCJwIjoiQXNiIMK3IEhvcnNlIiwiZSI6IvCfkLQiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2q/Ysdio2YciLCJwIjoiR29yYmUgwrcgQ2F0IiwiZSI6IvCfkLEiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2LParyIsInAiOiJTYWcgwrcgRG9nIiwiZSI6IvCfkLYiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2LHZiNio2KfZhyIsInAiOiJSdWLEgWggwrcgRm94IiwiZSI6IvCfpooiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2q/YsdqvIiwicCI6IkdvcmcgwrcgV29sZiIsImUiOiLwn5C6IiwiaCI6ImFuaW1hbCJ9LHsidyI6Itiu2LHYsyIsInAiOiJLaGVycyDCtyBCZWFyIiwiZSI6IvCfkLsiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2YXbjNmF2YjZhiIsInAiOiJNZXltdW4gwrcgTW9ua2V5IiwiZSI6IvCfkJIiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2LnZgtin2KgiLCJwIjoiT2doxIFiIMK3IEVhZ2xlIiwiZSI6IvCfpoUiLCJoIjoiYW5pbWFsIn0seyJ3Ijoi2K/ZhNmB24zZhiIsInAiOiJEZWxmaW4gwrcgRG9scGhpbiIsImUiOiLwn5CsIiwiaCI6ImFuaW1hbCJ9LHsidyI6Itqp2YjYs9mHIiwicCI6Ikt1c2UgwrcgU2hhcmsiLCJlIjoi8J+miCIsImgiOiJhbmltYWwifSx7InciOiLZgdmI2KrYqNin2YQiLCJwIjoiRnV0YsSBbCDCtyBGb290YmFsbCIsImUiOiLimr0iLCJoIjoic3BvcnQifSx7InciOiLYqNiz2qnYqtio2KfZhCIsInAiOiJCYXNrZXRixIFsIMK3IEJhc2tldGJhbGwiLCJlIjoi8J+PgCIsImgiOiJzcG9ydCJ9LHsidyI6ItmI2KfZhNuM2KjYp9mEIiwicCI6IlbEgWxpYsSBbCDCtyBWb2xsZXliYWxsIiwiZSI6IvCfj5AiLCJoIjoic3BvcnQifSx7InciOiLYqtmG24zYsyIsInAiOiJUZW5pcyDCtyBUZW5uaXMiLCJlIjoi8J+OviIsImgiOiJzcG9ydCJ9LHsidyI6Iti02YbYpyIsInAiOiJTaGVuxIEgwrcgU3dpbW1pbmciLCJlIjoi8J+PiiIsImgiOiJzcG9ydCJ9LHsidyI6Itiv2Ygg2Ygg2YXbjNiv2KfZhtuMIiwicCI6IkRvLW8gTWV5ZMSBbmkgwrcgQXRobGV0aWNzIiwiZSI6IvCfj4MiLCJoIjoic3BvcnQifSx7InciOiLaqdi02KrbjCIsInAiOiJLb3NodGkgwrcgV3Jlc3RsaW5nIiwiZSI6IvCfpLwiLCJoIjoic3BvcnQifSx7InciOiLYqNmI2qnYsyIsInAiOiJCb2tzIMK3IEJveGluZyIsImUiOiLwn6WKIiwiaCI6InNwb3J0In0seyJ3Ijoi2q/ZhNmBIiwicCI6IkdvbGYiLCJlIjoi4puzIiwiaCI6InNwb3J0In0seyJ3Ijoi2KfYs9qp24wiLCJwIjoiRXNraSDCtyBTa2lpbmciLCJlIjoi4pu377iPIiwiaCI6InNwb3J0In0seyJ3Ijoi2K/ZiNqG2LHYrtmH4oCM2LPZiNin2LHbjCIsInAiOiJEb2NoYXJraGUtc2F2xIFyaSDCtyBDeWNsaW5nIiwiZSI6IvCfmrQiLCJoIjoic3BvcnQifSx7InciOiLaqdin2LHYp9iq2YciLCJwIjoiS8SBcsSBdGUgwrcgS2FyYXRlIiwiZSI6IvCfpYsiLCJoIjoic3BvcnQifSx7InciOiLYqNiv2YXbjNmG2KrZiNmGIiwicCI6IkJlZG1pbnRvbiDCtyBCYWRtaW50b24iLCJlIjoi8J+PuCIsImgiOiJzcG9ydCJ9LHsidyI6ItmH2YbYr9io2KfZhCIsInAiOiJIYW5kYsSBbCDCtyBIYW5kYmFsbCIsImUiOiLwn6S+IiwiaCI6InNwb3J0In0seyJ3Ijoi2KjbjNmE24zYp9ix2K8iLCJwIjoiQmlsaXnEgXJkIMK3IEJpbGxpYXJkcyIsImUiOiLwn46xIiwiaCI6InNwb3J0In0seyJ3Ijoi2KfYs9qp24zYqiIsInAiOiJFc2tleXQgwrcgU2thdGluZyIsImUiOiLim7jvuI8iLCJoIjoic3BvcnQifSx7InciOiLZvtiy2LTaqSIsInAiOiJQZXplc2hrIMK3IERvY3RvciIsImUiOiLwn5Go4oCN4pqV77iPIiwiaCI6ImpvYiJ9LHsidyI6ItmF2LnZhNmFIiwicCI6Ik1vXHUwMDI3YWxsZW0gwrcgVGVhY2hlciIsImUiOiLwn5Gp4oCN8J+PqyIsImgiOiJqb2IifSx7InciOiLZhdmH2YbYr9izIiwicCI6Ik1vaGFuZGVzIMK3IEVuZ2luZWVyIiwiZSI6IvCfkbciLCJoIjoiam9iIn0seyJ3Ijoi2K7ZhNio2KfZhiIsInAiOiJLaGFsYWLEgW4gwrcgUGlsb3QiLCJlIjoi8J+RqOKAjeKciO+4jyIsImgiOiJqb2IifSx7InciOiLYoti02b7YsiIsInAiOiLEgHNocGF6IMK3IENoZWYiLCJlIjoi8J+RqOKAjfCfjbMiLCJoIjoiam9iIn0seyJ3Ijoi2YjaqduM2YQiLCJwIjoiVmFraWwgwrcgTGF3eWVyIiwiZSI6IuKalu+4jyIsImgiOiJqb2IifSx7InciOiLZvtmE24zYsyIsInAiOiJQb2xpcyDCtyBQb2xpY2UiLCJlIjoi8J+RriIsImgiOiJqb2IifSx7InciOiLYotiq2LTigIzZhti02KfZhiIsInAiOiLEgHRhc2gtbmVzaMSBbiDCtyBGaXJlZmlnaHRlciIsImUiOiLwn5Go4oCN8J+akiIsImgiOiJqb2IifSx7InciOiLYrtio2LHZhtqv2KfYsSIsInAiOiJLaGFiYXItbmVnxIFyIMK3IEpvdXJuYWxpc3QiLCJlIjoi8J+TsCIsImgiOiJqb2IifSx7InciOiLYqNix2YbYp9mF2YfigIzZhtmI24zYsyIsInAiOiJCYXJuxIFtZS1uZXZpcyDCtyBQcm9ncmFtbWVyIiwiZSI6IvCfkajigI3wn5K7IiwiaCI6ImpvYiJ9LHsidyI6ItmG2KzYp9ixIiwicCI6Ik5hamrEgXIgwrcgQ2FycGVudGVyIiwiZSI6IvCflKgiLCJoIjoiam9iIn0seyJ3Ijoi2YbZgtin2LQiLCJwIjoiTmFnaGdoxIFzaCDCtyBQYWludGVyIiwiZSI6IvCfjqgiLCJoIjoiam9iIn0seyJ3Ijoi2KLYsdin24zYtNqv2LEiLCJwIjoixIByxIF5ZXNoZ2FyIMK3IEhhaXJkcmVzc2VyIiwiZSI6IvCfkociLCJoIjoiam9iIn0seyJ3Ijoi2LHYp9mG2YbYr9mHINiq2Kfaqdiz24wiLCJwIjoiUsSBbmFuZGUteWUgVMSBeGkgwrcgVGF4aSBEcml2ZXIiLCJlIjoi8J+alSIsImgiOiJqb2IifSx7InciOiLaqdi02KfZiNix2LIiLCJwIjoiS2VzaMSBdmFyeiDCtyBGYXJtZXIiLCJlIjoi8J+MviIsImgiOiJqb2IifSx7InciOiLYrtuM2KfYtyIsInAiOiJLaGF5ecSBdCDCtyBUYWlsb3IiLCJlIjoi8J+ntSIsImgiOiJqb2IifSx7InciOiLZhdiv2LHYs9mHIiwicCI6Ik1hZHJlc2UgwrcgU2Nob29sIiwiZSI6IvCfj6siLCJoIjoicGxhY2UifSx7InciOiLYqNuM2YXYp9ix2LPYqtin2YYiLCJwIjoiQmltxIFyZXN0xIFuIMK3IEhvc3BpdGFsIiwiZSI6IvCfj6UiLCJoIjoicGxhY2UifSx7InciOiLZgdix2YjYr9qv2KfZhyIsInAiOiJGb3J1ZGfEgWggwrcgQWlycG9ydCIsImUiOiLinIjvuI8iLCJoIjoicGxhY2UifSx7InciOiLYsdiz2KrZiNix2KfZhiIsInAiOiJSZXN0dXLEgW4gwrcgUmVzdGF1cmFudCIsImUiOiLwn42977iPIiwiaCI6InBsYWNlIn0seyJ3Ijoi2LPbjNmG2YXYpyIsInAiOiJTaW5lbcSBIMK3IENpbmVtYSIsImUiOiLwn46sIiwiaCI6InBsYWNlIn0seyJ3Ijoi2b7Yp9ix2qkiLCJwIjoiUMSBcmsgwrcgUGFyayIsImUiOiLwn4yzIiwiaCI6InBsYWNlIn0seyJ3Ijoi2qnYqtin2KjYrtin2YbZhyIsInAiOiJLZXTEgWJraMSBbmUgwrcgTGlicmFyeSIsImUiOiLwn5OaIiwiaCI6InBsYWNlIn0seyJ3Ijoi2KfYs9iq2K7YsSIsInAiOiJFc3Rha2hyIMK3IFBvb2wiLCJlIjoi8J+PiiIsImgiOiJwbGFjZSJ9LHsidyI6Itiv2LHbjNinIiwicCI6IkRhcnnEgSDCtyBTZWEiLCJlIjoi8J+MiiIsImgiOiJwbGFjZSJ9LHsidyI6Itqp2YjZhyIsInAiOiJLdWggwrcgTW91bnRhaW4iLCJlIjoi4puw77iPIiwiaCI6InBsYWNlIn0seyJ3Ijoi2KjYp9iy2KfYsSIsInAiOiJCxIF6xIFyIMK3IEJhemFhciIsImUiOiLwn5uN77iPIiwiaCI6InBsYWNlIn0seyJ3Ijoi2YXYs9is2K8iLCJwIjoiTWFzamVkIMK3IE1vc3F1ZSIsImUiOiLwn5WMIiwiaCI6InBsYWNlIn0seyJ3Ijoi2YXZiNiy2YciLCJwIjoiTXV6ZSDCtyBNdXNldW0iLCJlIjoi8J+Pm++4jyIsImgiOiJwbGFjZSJ9LHsidyI6ItmH2KrZhCIsInAiOiJIb3RlbCIsImUiOiLwn4+oIiwiaCI6InBsYWNlIn0seyJ3Ijoi2YjYsdiy2LTar9in2YciLCJwIjoiVmFyemVzaGfEgWggwrcgU3RhZGl1bSIsImUiOiLwn4+f77iPIiwiaCI6InBsYWNlIn0seyJ3Ijoi2LLZhtiv2KfZhiIsInAiOiJaZW5kxIFuIMK3IFByaXNvbiIsImUiOiLwn5SSIiwiaCI6InBsYWNlIn0seyJ3Ijoi2YXYp9i024zZhiIsInAiOiJNxIFzaGluIMK3IENhciIsImUiOiLwn5qXIiwiaCI6InZlaGljbGUifSx7InciOiLYp9iq2YjYqNmI2LMiLCJwIjoiT3RvYnVzIMK3IEJ1cyIsImUiOiLwn5qMIiwiaCI6InZlaGljbGUifSx7InciOiLZgti32KfYsSIsInAiOiJHaGF0xIFyIMK3IFRyYWluIiwiZSI6IvCfmoYiLCJoIjoidmVoaWNsZSJ9LHsidyI6ItmH2YjYp9m+24zZhdinIiwicCI6IkhhdsSBcGV5bcSBIMK3IEFpcnBsYW5lIiwiZSI6IuKciO+4jyIsImgiOiJ2ZWhpY2xlIn0seyJ3Ijoi2qnYtNiq24wiLCJwIjoiS2FzaHRpIMK3IFNoaXAiLCJlIjoi8J+aoiIsImgiOiJ2ZWhpY2xlIn0seyJ3Ijoi2K/ZiNqG2LHYrtmHIiwicCI6IkRvY2hhcmtoZSDCtyBCaWN5Y2xlIiwiZSI6IvCfmrIiLCJoIjoidmVoaWNsZSJ9LHsidyI6ItmF2YjYqtmI2LHYs9uM2qnZhNiqIiwicCI6Ik1vdG9yc2lrbGV0IMK3IE1vdG9yY3ljbGUiLCJlIjoi8J+Pje+4jyIsImgiOiJ2ZWhpY2xlIn0seyJ3Ijoi2YXYqtix2YgiLCJwIjoiTWV0cm8iLCJlIjoi8J+ahyIsImgiOiJ2ZWhpY2xlIn0seyJ3Ijoi2KrYp9qp2LPbjCIsInAiOiJUxIF4aSDCtyBUYXhpIiwiZSI6IvCfmpUiLCJoIjoidmVoaWNsZSJ9LHsidyI6Itqp2KfZhduM2YjZhiIsInAiOiJLxIFteW9uIMK3IFRydWNrIiwiZSI6IvCfmpoiLCJoIjoidmVoaWNsZSJ9LHsidyI6Itio2KfZhNqv2LHYryIsInAiOiJCxIFsZ2FyZCDCtyBIZWxpY29wdGVyIiwiZSI6IvCfmoEiLCJoIjoidmVoaWNsZSJ9LHsidyI6Itin2LPaqdmI2KrYsSIsInAiOiJFc2t1dGFyIMK3IFNjb290ZXIiLCJlIjoi8J+btCIsImgiOiJ2ZWhpY2xlIn0seyJ3Ijoi2YLYp9uM2YIiLCJwIjoiR2jEgXllZ2ggwrcgQm9hdCIsImUiOiLwn5u2IiwiaCI6InZlaGljbGUifSx7InciOiLYqtix2Kfaqdiq2YjYsSIsInAiOiJUZXLEgWt0b3IgwrcgVHJhY3RvciIsImUiOiLwn5qcIiwiaCI6InZlaGljbGUifSx7InciOiLZiNmGIiwicCI6IlZhbiIsImUiOiLwn5qQIiwiaCI6InZlaGljbGUifSx7InciOiLYqtix2KfZhdmI2KciLCJwIjoiVGVyxIFtdsSBIMK3IFRyYW0iLCJlIjoi8J+aiyIsImgiOiJ2ZWhpY2xlIn0seyJ3Ijoi24zYrtqG2KfZhCIsInAiOiJZYWtoY2jEgWwgwrcgRnJpZGdlIiwiZSI6IvCfp4oiLCJoIjoiaG91c2Vob2xkIn0seyJ3Ijoi2YXYqNmEIiwicCI6Ik1vYmwgwrcgU29mYSIsImUiOiLwn5uL77iPIiwiaCI6ImhvdXNlaG9sZCJ9LHsidyI6Itiq2YTZiNuM2LLbjNmI2YYiLCJwIjoiVGVsZXZpenl1biDCtyBUViIsImUiOiLwn5O6IiwiaCI6ImhvdXNlaG9sZCJ9LHsidyI6ItmF24zYsiIsInAiOiJNaXogwrcgVGFibGUiLCJlIjoi8J+Nve+4jyIsImgiOiJob3VzZWhvbGQifSx7InciOiLYtdmG2K/ZhNuMIiwicCI6IlNhbmRhbGkgwrcgQ2hhaXIiLCJlIjoi8J+qkSIsImgiOiJob3VzZWhvbGQifSx7InciOiLZhNin2YXZviIsInAiOiJMxIFtcCDCtyBMYW1wIiwiZSI6IvCfkqEiLCJoIjoiaG91c2Vob2xkIn0seyJ3Ijoi2KLbjNmG2YciLCJwIjoixIB5ZW5lIMK3IE1pcnJvciIsImUiOiLwn6qeIiwiaCI6ImhvdXNlaG9sZCJ9LHsidyI6ItmB2LHYtCIsInAiOiJGYXJzaCDCtyBDYXJwZXQiLCJlIjoi8J+ntiIsImgiOiJob3VzZWhvbGQifSx7InciOiLYp9is2KfZguKAjNqv2KfYsiIsInAiOiJBasSBZ2gtZ8SBeiDCtyBTdG92ZSIsImUiOiLwn42zIiwiaCI6ImhvdXNlaG9sZCJ9LHsidyI6ItmF2KfYtNuM2YbigIzZhNio2KfYs9i02YjbjNuMIiwicCI6Ik3EgXNoaW4tZSBMZWLEgXMtc2h1eWkgwrcgV2FzaGluZyBNYWNoaW5lIiwiZSI6IvCfp7oiLCJoIjoiaG91c2Vob2xkIn0seyJ3Ijoi2YXYp9uM2qnYsdmI2YjbjNmIIiwicCI6Ik3EgXlrcm92xIF5diDCtyBNaWNyb3dhdmUiLCJlIjoi8J+TpiIsImgiOiJob3VzZWhvbGQifSx7InciOiLaqdmF2K8iLCJwIjoiS29tb2QgwrcgQ2xvc2V0IiwiZSI6IvCfmqoiLCJoIjoiaG91c2Vob2xkIn0seyJ3Ijoi2LPYp9i52Kog2K/bjNmI2KfYsduMIiwicCI6IlPEgVx1MDAyN2F0LWUgRGl2xIFyaSDCtyBXYWxsIENsb2NrIiwiZSI6IvCflZAiLCJoIjoiaG91c2Vob2xkIn0seyJ3Ijoi2b7Ysdiv2YciLCJwIjoiUGFyZGUgwrcgQ3VydGFpbiIsImUiOiLwn6qfIiwiaCI6ImhvdXNlaG9sZCJ9LHsidyI6Itiq2K7YqiIsInAiOiJUYWtodCDCtyBCZWQiLCJlIjoi8J+bj++4jyIsImgiOiJob3VzZWhvbGQifSx7InciOiLYrNin2LHZiNio2LHZgtuMIiwicCI6IkrEgXJ1YmFyZ2hpIMK3IFZhY3V1bSBDbGVhbmVyIiwiZSI6IvCfp7kiLCJoIjoiaG91c2Vob2xkIn0seyJ3Ijoi2KjYp9ix2KfZhiIsInAiOiJCxIFyxIFuIMK3IFJhaW4iLCJlIjoi8J+Mp++4jyIsImgiOiJuYXR1cmUifSx7InciOiLYqNix2YEiLCJwIjoiQmFyZiDCtyBTbm93IiwiZSI6IuKdhO+4jyIsImgiOiJuYXR1cmUifSx7InciOiLYsdi52K8g2Ygg2KjYsdmCIiwicCI6IlJhXHUwMDI3ZC1vLUJhcmdoIMK3IFRodW5kZXIiLCJlIjoi4pqhIiwiaCI6Im5hdHVyZSJ9LHsidyI6Itix2Ybar9uM2YbigIzaqdmF2KfZhiIsInAiOiJSYW5naW4ta2FtxIFuIMK3IFJhaW5ib3ciLCJlIjoi8J+MiCIsImgiOiJuYXR1cmUifSx7InciOiLYstmE2LLZhNmHIiwicCI6IlplbHplbGUgwrcgRWFydGhxdWFrZSIsImUiOiLwn4+a77iPIiwiaCI6Im5hdHVyZSJ9LHsidyI6Itiz24zZhCIsInAiOiJTZXlsIMK3IEZsb29kIiwiZSI6IvCfjIoiLCJoIjoibmF0dXJlIn0seyJ3Ijoi2LfZiNmB2KfZhiIsInAiOiJUdWbEgW4gwrcgU3Rvcm0iLCJlIjoi8J+Mqe+4jyIsImgiOiJuYXR1cmUifSx7InciOiLYotmB2KrYp9ioIiwicCI6IsSAZnTEgWIgwrcgU3VuIiwiZSI6IuKYgO+4jyIsImgiOiJuYXR1cmUifSx7InciOiLZhdmHIiwicCI6Ik1laCDCtyBGb2ciLCJlIjoi8J+Mq++4jyIsImgiOiJuYXR1cmUifSx7InciOiLYtNio2YbZhSIsInAiOiJTaGFibmFtIMK3IERldyIsImUiOiLwn5KnIiwiaCI6Im5hdHVyZSJ9LHsidyI6ItuM2K7YqNmG2K/Yp9mGIiwicCI6Illha2hiYW5kxIFuIMK3IEZyb3N0IiwiZSI6IvCfpbYiLCJoIjoibmF0dXJlIn0seyJ3Ijoi2q/Ysdiv2KjYp9ivIiwicCI6IkdlcmRixIFkIMK3IFRvcm5hZG8iLCJlIjoi8J+Mqu+4jyIsImgiOiJuYXR1cmUifSx7InciOiLaqdmI2YfYs9iq2KfZhiIsInAiOiJLdWhlc3TEgW4gwrcgTW91bnRhaW5zIiwiZSI6IvCfj5TvuI8iLCJoIjoibmF0dXJlIn0seyJ3Ijoi2KjbjNin2KjYp9mGIiwicCI6IkJpxIFixIFuIMK3IERlc2VydCIsImUiOiLwn4+c77iPIiwiaCI6Im5hdHVyZSJ9LHsidyI6Itis2Ybar9mEIiwicCI6IkphbmdhbCDCtyBGb3Jlc3QiLCJlIjoi8J+MsiIsImgiOiJuYXR1cmUifSx7InciOiLYotiq2LTZgdi02KfZhiIsInAiOiLEgHRhc2gtZmVzaMSBbiDCtyBWb2xjYW5vIiwiZSI6IvCfjIsiLCJoIjoibmF0dXJlIn1d";

  var CATEGORIES = {};
  CATEGORIES[CATEGORY_KEY] = { pron:"Pāye · Basic", words: JSON.parse(b64DecodeUnicode(WORDS_B64)) };

  // hint themes shown to the imposter instead of the real word
  var HINTS = {
    food:      { w:"خوراکی",        p:"Khorāki · Food",             e:"🍽️" },
    animal:    { w:"حیوان",         p:"Heyvān · Animal",            e:"🐾" },
    sport:     { w:"ورزش",          p:"Varzesh · Sport",            e:"🏅" },
    job:       { w:"شغل",           p:"Shoghl · Job",               e:"💼" },
    place:     { w:"مکان",          p:"Makān · Place",              e:"📍" },
    vehicle:   { w:"وسیله‌ی نقلیه", p:"Vasile-ye Naghliye · Vehicle", e:"🚗" },
    household: { w:"وسیله‌ی خانه",  p:"Vasile-ye Khāne · Household", e:"🏠" },
    nature:    { w:"پدیده‌ی طبیعی", p:"Pdide-ye Tabi'i · Nature",    e:"🌦️" }
  };

  var TIMER_OPTIONS = [1,2,3,5,8,10,15,20];

  // ---------- STATE ----------
  var state = {
    players: 5,
    imposters: 1,
    names: [],
    category: CATEGORY_KEY,
    showHintToImposter: true,
    timerMinutes: 3,
    roles: [],
    revealOrder: [],
    secretWord: null,
    currentReveal: 0,
    timerRemaining: 180,
    timerRunning: false,
    timerHandle: null
  };

  function maxImposters(players){
    return Math.max(1, Math.floor(players/3));
  }

  // ---------- ELEMENTS ----------
  var el = {
    valPlayers: document.getElementById('val-players'),
    valImp: document.getElementById('val-imp'),
    namesList: document.getElementById('names-list'),
    timerChips: document.getElementById('timer-chips'),
    toggleHint: document.getElementById('toggle-hint'),
    btnStart: document.getElementById('btn-start'),

    revealPlayerName: document.getElementById('reveal-player-name'),
    progressDots: document.getElementById('progress-dots'),
    revealCard: document.getElementById('reveal-card'),
    cardBack: document.getElementById('card-back'),
    cardFront: document.getElementById('card-front'),
    cardFrontImg: document.querySelector('.card-front-img'),
    roleText: document.getElementById('role-text'),
    roleWord: document.getElementById('role-word'),
    rolePron: document.getElementById('role-pron'),
    roleHint: document.getElementById('role-hint'),
    btnNextPlayer: document.getElementById('btn-next-player'),

    starterName: document.getElementById('starter-name'),
    timerClock: document.getElementById('timer-clock'),
    timerDoneMsg: document.getElementById('timer-done-msg'),
    btnStop: document.getElementById('btn-stop'),
    btnRevealImposter: document.getElementById('btn-reveal-imposter'),
    btnResume: document.getElementById('btn-resume'),

    imposterHeading: document.getElementById('imposter-heading'),
    imposterList: document.getElementById('imposter-list')
  };

  // ---------- SETUP: players/imposters steppers ----------
  function renderPlayersVal(){
    el.valPlayers.textContent = state.players;
    var mx = maxImposters(state.players);
    if(state.imposters > mx) state.imposters = mx;
    el.valImp.textContent = state.imposters;
    renderNameInputs();
  }

  document.getElementById('btn-players-minus').addEventListener('click', function(){
    if(state.players > 3){ state.players--; renderPlayersVal(); }
  });
  document.getElementById('btn-players-plus').addEventListener('click', function(){
    if(state.players < 15){ state.players++; renderPlayersVal(); }
  });
  document.getElementById('btn-imp-minus').addEventListener('click', function(){
    if(state.imposters > 1){ state.imposters--; el.valImp.textContent = state.imposters; }
  });
  document.getElementById('btn-imp-plus').addEventListener('click', function(){
    var mx = maxImposters(state.players);
    if(state.imposters < mx){ state.imposters++; el.valImp.textContent = state.imposters; }
  });

  function renderNameInputs(){
    el.namesList.innerHTML = '';
    for(var i=0;i<state.players;i++){
      var input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'بازیکن ' + Juju.toFa(i+1);
      input.value = state.names[i] || '';
      input.maxLength = 16;
      input.dataset.idx = i;
      input.addEventListener('input', function(e){
        state.names[parseInt(e.target.dataset.idx,10)] = e.target.value.trim();
      });
      el.namesList.appendChild(input);
    }
  }

  function renderTimerChips(){
    el.timerChips.innerHTML = '';
    TIMER_OPTIONS.forEach(function(min){
      var chip = document.createElement('div');
      chip.className = 'chip' + (min === state.timerMinutes ? ' active' : '');
      chip.textContent = Juju.toFa(min) + ' دقیقه';
      chip.addEventListener('click', function(){
        state.timerMinutes = min;
        renderTimerChips();
      });
      el.timerChips.appendChild(chip);
    });
  }

  el.toggleHint.addEventListener('click', function(e){
    e.stopPropagation();
    state.showHintToImposter = !state.showHintToImposter;
    el.toggleHint.classList.toggle('on', state.showHintToImposter);
  });

  // clicking the panel (but not the toggle itself) shows/hides the explanation
  var hintPanel = document.getElementById('hint-panel');
  var hintPanelDesc = document.getElementById('hint-panel-desc');
  hintPanel.addEventListener('click', function(){
    hintPanelDesc.classList.toggle('open');
  });

  // ---------- player cover images (Spieler1.jpg .. Spieler8.jpg, no repeat until all used) ----------
  var PLAYER_IMAGES = ['Spieler1.png','Spieler2.png','Spieler3.png','Spieler4.png','Spieler5.png','Spieler6.png','Spieler7.png','Spieler8.png'];

  function assignPlayerImages(count){
    var pool = [];
    while(pool.length < count){
      var batch = PLAYER_IMAGES.slice();
      var order = Juju.shuffledIndices(batch.length);
      for(var i=0;i<order.length;i++) pool.push(batch[order[i]]);
    }
    return pool.slice(0, count);
  }

  // ---------- randomized role assignment ----------
  function assignRoles(playerCount, names, imposterCount){
    var shuffled = Juju.shuffledIndices(playerCount);
    var impSet = {};
    for(var m=0;m<imposterCount;m++) impSet[shuffled[m]] = true;
    var images = assignPlayerImages(playerCount);

    var roles = [];
    for(var p=0;p<playerCount;p++){
      var name = (names[p] && names[p].length) ? names[p] : ('بازیکن ' + Juju.toFa(p+1));
      roles.push({
        name: name,
        isImposter: !!impSet[p],
        img: images[p]
      });
    }
    return roles;
  }

  function pickSecretWord(){
    var words = CATEGORIES[state.category].words;
    return words[Math.floor(Math.random()*words.length)];
  }

  // ---------- START GAME ----------
  el.btnStart.addEventListener('click', function(){
    state.secretWord = pickSecretWord();
    state.roles = assignRoles(state.players, state.names, state.imposters);
    state.revealOrder = Juju.shuffledIndices(state.roles.length);
    state.currentReveal = 0;
    startRevealFlow();
  });

  // ---------- REVEAL FLOW ----------
  function startRevealFlow(){
    renderProgressDots();
    showCurrentReveal();
    Juju.showScreen('reveal');
  }

  function renderProgressDots(){
    el.progressDots.innerHTML = '';
    for(var i=0;i<state.roles.length;i++){
      var dot = document.createElement('span');
      if(i < state.currentReveal) dot.className = 'done';
      else if(i === state.currentReveal) dot.className = 'current';
      el.progressDots.appendChild(dot);
    }
  }

  function currentRole(){
    var idx = state.revealOrder[state.currentReveal];
    return state.roles[idx];
  }

  var revealedThisTurn = false;

  // The hint is occasionally swapped for a decoy from another theme so it's
  // not a 100%-reliable giveaway — weakens it slightly without removing it.
  var HINT_DECOY_CHANCE = 0.2;
  var currentHintKey = null;

  function pickImposterHintKey(){
    var trueKey = state.secretWord.h;
    if(Math.random() < HINT_DECOY_CHANCE){
      var others = Object.keys(HINTS).filter(function(k){ return k !== trueKey; });
      return others[Math.floor(Math.random()*others.length)];
    }
    return trueKey;
  }

  function resetCardPosition(){
    el.cardFront.classList.remove('snap-back');
    el.cardFront.style.transform = '';
  }

  function showCurrentReveal(){
    var role = currentRole();
    el.revealPlayerName.textContent = role.name;
    el.btnNextPlayer.disabled = true;
    el.btnNextPlayer.textContent = (state.currentReveal === state.roles.length-1) ? 'شروع بازی' : 'بازیکن بعدی';

    revealedThisTurn = false;
    resetCardPosition();
    el.cardFrontImg.src = role.img;

    el.cardBack.classList.remove('is-citizen','is-imposter');
    el.cardBack.classList.add(role.isImposter ? 'is-imposter' : 'is-citizen');

    if(role.isImposter){
      el.roleText.textContent = 'تو یک...';
      el.roleWord.textContent = 'جاسوس هستی 🕵️';
      el.rolePron.textContent = '';
      if(state.showHintToImposter){
        currentHintKey = pickImposterHintKey();
        var hint = HINTS[currentHintKey];
        el.roleHint.innerHTML = 'کلمه‌ی راهنما: ' + Juju.escapeHtml(hint.w) +
          '<span class="role-hint-pron">(' + Juju.escapeHtml(hint.p) + ')</span>';
      } else {
        currentHintKey = null;
        el.roleHint.textContent = 'کلمه را حدس بزن و خودت را لو نده!';
      }
    } else {
      currentHintKey = null;
      el.roleText.textContent = 'کلمه‌ی مخفی:';
      el.roleWord.textContent = state.secretWord.w;
      el.rolePron.textContent = '(' + state.secretWord.p + ')';
      el.roleHint.textContent = 'این کلمه را لو نده!';
    }
  }

  // ---------- swipe-to-reveal (Tinder-style) ----------
  var drag = { active:false, startX:0, pointerId:null };
  var CARD_REVEAL_THRESHOLD = 90; // px dragged right before "next" unlocks

  el.cardFront.addEventListener('pointerdown', function(e){
    drag.active = true;
    drag.startX = e.clientX;
    drag.pointerId = e.pointerId;
    el.cardFront.classList.remove('snap-back');
    try{ el.cardFront.setPointerCapture(e.pointerId); }catch(err){}
  });

  el.cardFront.addEventListener('pointermove', function(e){
    if(!drag.active) return;
    var dx = e.clientX - drag.startX;
    if(dx < 0) dx = 0;
    var maxDx = el.revealCard.offsetWidth;
    if(dx > maxDx) dx = maxDx;
    var rotate = Math.min(dx / 14, 16);
    el.cardFront.style.transform = 'translateX(' + dx + 'px) rotate(' + rotate + 'deg)';
    if(!revealedThisTurn && dx > CARD_REVEAL_THRESHOLD){
      revealedThisTurn = true;
      el.btnNextPlayer.disabled = false;
    }
  });

  function endDrag(e){
    if(!drag.active) return;
    drag.active = false;
    el.cardFront.classList.add('snap-back');
    el.cardFront.style.transform = 'translateX(0px) rotate(0deg)';
    if(drag.pointerId !== null){
      try{ el.cardFront.releasePointerCapture(drag.pointerId); }catch(err){}
    }
    drag.pointerId = null;
  }
  el.cardFront.addEventListener('pointerup', endDrag);
  el.cardFront.addEventListener('pointercancel', endDrag);

  el.btnNextPlayer.addEventListener('click', function(){
    if(el.btnNextPlayer.disabled) return;
    state.currentReveal++;
    if(state.currentReveal >= state.roles.length){
      startPlayScreen();
    } else {
      renderProgressDots();
      showCurrentReveal();
    }
  });

  // ---------- player names modal ----------
  var namesModal = document.getElementById('names-modal');
  document.getElementById('btn-open-names').addEventListener('click', function(){
    namesModal.classList.add('open');
  });
  document.getElementById('names-modal-close').addEventListener('click', function(){
    namesModal.classList.remove('open');
  });
  namesModal.addEventListener('click', function(e){
    if(e.target === namesModal) namesModal.classList.remove('open');
  });

  // ---------- PLAY / TIMER SCREEN ----------
  function showStoppedButtons(offerResume){
    el.btnStop.style.display = 'none';
    el.btnRevealImposter.style.display = 'flex';
    el.btnResume.style.display = offerResume ? 'flex' : 'none';
  }
  function showRunningButtons(){
    el.btnStop.style.display = '';
    el.btnRevealImposter.style.display = 'none';
    el.btnResume.style.display = 'none';
  }

  function startPlayScreen(){
    var starter = state.roles[Math.floor(Math.random() * state.roles.length)];
    el.starterName.textContent = starter.name;

    state.timerRemaining = state.timerMinutes * 60;
    renderClock();
    el.timerDoneMsg.classList.remove('show');
    showRunningButtons();
    Juju.showScreen('play');
    startTimer();
  }

  function renderClock(){
    var m = Math.floor(state.timerRemaining/60);
    var s = state.timerRemaining%60;
    el.timerClock.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function startTimer(){
    clearInterval(state.timerHandle);
    state.timerRunning = true;
    state.timerHandle = setInterval(function(){
      if(state.timerRemaining > 0){
        state.timerRemaining--;
        renderClock();
      } else {
        pauseTimer();
        el.timerDoneMsg.classList.add('show');
        showStoppedButtons(false);
      }
    }, 1000);
  }

  function pauseTimer(){
    clearInterval(state.timerHandle);
    state.timerRunning = false;
  }

  document.getElementById('btn-end-to-home').addEventListener('click', function(){
    clearInterval(state.timerHandle);
    Juju.showScreen('setup');
  });

  el.btnStop.addEventListener('click', function(){
    pauseTimer();
    showStoppedButtons(true);
  });

  el.btnResume.addEventListener('click', function(){
    showRunningButtons();
    startTimer();
  });

  el.btnRevealImposter.addEventListener('click', function(){
    showResults();
  });

  // ---------- RESULTS ----------
  function showResults(){
    var imposters = state.roles.filter(function(r){ return r.isImposter; });
    el.imposterHeading.textContent = imposters.length > 1 ? 'کیا جاسوس بودن؟' : 'کی جاسوس بود؟';
    el.imposterList.innerHTML = '';
    imposters.forEach(function(r){
      var row = document.createElement('div');
      row.className = 'imposter-row';
      row.innerHTML = '<span class="tag">جاسوس</span><span>' + Juju.escapeHtml(r.name) + '</span>';
      el.imposterList.appendChild(row);
    });
    Juju.showScreen('results');
  }

  document.getElementById('btn-play-again').addEventListener('click', function(){
    state.secretWord = pickSecretWord();

    var shuffled = Juju.shuffledIndices(state.roles.length);
    var impSet = {};
    for(var m=0;m<state.imposters;m++) impSet[shuffled[m]] = true;
    var images = assignPlayerImages(state.roles.length);
    state.roles.forEach(function(r, idx){
      r.isImposter = !!impSet[idx];
      r.img = images[idx];
    });
    state.revealOrder = Juju.shuffledIndices(state.roles.length);

    state.currentReveal = 0;
    startRevealFlow();
  });

  document.getElementById('btn-back-setup-2').addEventListener('click', function(){
    Juju.showScreen('setup');
  });

  // ---------- INIT ----------
  renderPlayersVal();
  renderTimerChips();
  el.toggleHint.classList.toggle('on', state.showHintToImposter);
})();
