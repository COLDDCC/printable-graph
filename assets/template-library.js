(function () {
 'use strict';
 var library=document.querySelector('.template-library');
 if(!library) return;
 var filters=library.querySelector('.template-filters'), count=library.querySelector('.template-count');
 filters.hidden=false; count.hidden=false;
 function showCount(){var cards=library.querySelectorAll('.template-card:not([hidden])');count.textContent=cards.length+' templates';}
 showCount();
 filters.addEventListener('click',function(event){
  var button=event.target.closest('[data-template-filter]'); if(!button) return;
  filters.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b===button));});
  library.querySelectorAll('.template-card').forEach(function(card){card.hidden=button.dataset.templateFilter!=='All templates'&&card.dataset.category!==button.dataset.templateFilter;});
  showCount();
 });
 library.addEventListener('click',function(event){
  var link=event.target.closest('[data-template-pdf]'); if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  try { GridEngine.download(JSON.parse(link.dataset.templatePdf)); event.preventDefault(); }
  catch (_) { /* Keep the server PDF link usable if browser generation fails. */ }
 });
})();
